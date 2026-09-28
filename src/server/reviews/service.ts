import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Tx } from '@/db/client'
import { db } from '@/db/client'
import {
  files,
  manuscriptAuthors,
  manuscripts,
  reviewAssignments,
  reviewFormQuestions,
  reviews,
  users,
} from '@/db/schema'
import { audit } from '@/server/audit'
import { assertNotAuthor, isManuscriptAuthor } from '@/server/authz'
import { newReviewerToken, hashToken } from '@/server/auth/tokens'
import { reviewerSeesAuthors } from '@/server/blinding'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'
import { notify } from '@/server/notifications/service'
import { withJournal, withReviewToken } from '@/db/tenant'
import { applyTransition, loadManuscript } from '@/server/manuscripts/service'

export const inviteInput = z.object({
  reviewerId: z.string().uuid(),
  round: z.number().int().positive().optional(),
})

export const respondInput = z.object({
  action: z.enum(['accept', 'decline']),
  reason: z.string().max(2000).optional(),
})

export const submitReviewInput = z.object({
  recommendation: z.enum(['accept', 'minor_revision', 'major_revision', 'reject']),
  answers: z.record(z.string(), z.unknown()),
})

function appUrl() {
  return (process.env.BETTER_AUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '')
}

export async function inviteReviewer(tx: Tx, ctx: JournalCtx, manuscriptId: string, input: z.infer<typeof inviteInput>) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  if (!manuscript.policySnapshot) throw Errors.conflict('Invite reviewers only after the manuscript is submitted')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  if (await isManuscriptAuthor(tx, manuscript, input.reviewerId)) {
    throw Errors.conflict('An author of this manuscript cannot review it')
  }
  const round = input.round ?? Math.max(manuscript.currentRound, 1)
  const [reviewer] = await tx.select().from(users).where(eq(users.id, input.reviewerId)).limit(1)
  if (!reviewer || reviewer.isSuspended) throw Errors.badRequest('That reviewer cannot be invited')
  const [existing] = await tx
    .select({ id: reviewAssignments.id })
    .from(reviewAssignments)
    .where(
      and(
        eq(reviewAssignments.manuscriptId, manuscript.id),
        eq(reviewAssignments.reviewerId, reviewer.id),
        eq(reviewAssignments.round, round),
      ),
    )
    .limit(1)
  if (existing) throw Errors.conflict('This reviewer is already invited for this round')

  const { token, hash } = newReviewerToken()
  const dueAt = new Date(Date.now() + manuscript.policySnapshot.policy.review.reviewerDeadlineDays * 86_400_000)
  const [assignment] = await tx
    .insert(reviewAssignments)
    .values({
      journalId: ctx.journal.id,
      manuscriptId: manuscript.id,
      reviewerId: reviewer.id,
      round,
      status: 'invited',
      accessTokenHash: hash,
      invitedById: ctx.actor.userId,
      dueAt,
    })
    .returning()

  const link = `${appUrl()}/review/${token}`
  await notify(tx, {
    journalId: ctx.journal.id,
    userId: reviewer.id,
    email: reviewer.email,
    kind: 'invitation',
    title: `Review invitation ${manuscript.reference}`,
    body: `You are invited to review a manuscript. The link in this email is the only copy of your access token. It expires if you do not reply.\n${link}`,
    href: '/my-reviews',
  })
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'review.invited',
    entityType: 'review_assignment',
    entityId: assignment.id,
    metadata: { manuscriptId: manuscript.id, reviewerId: reviewer.id, round },
    ipAddress: ctx.meta.ipAddress,
  })
  return { assignmentId: assignment.id, dueAt: dueAt.toISOString() }
}

export async function openInvitation(token: string) {
  const tokenHash = hashToken(token)
  return withReviewToken(tokenHash, async (tx) => {
    const assignment = await assignmentByHash(tx, tokenHash)
    await expireIfNeeded(tx, assignment)
    const [manuscript] = await tx.select().from(manuscripts).where(eq(manuscripts.id, assignment.manuscriptId)).limit(1)
    if (!manuscript?.policySnapshot) throw Errors.notFound('Manuscript')
    const mode = manuscript.policySnapshot.policy.review.blinding
    const authors = reviewerSeesAuthors(mode)
      ? await tx.select().from(manuscriptAuthors).where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
      : []
    const questions = await tx
      .select()
      .from(reviewFormQuestions)
      .where(eq(reviewFormQuestions.formId, manuscript.policySnapshot.reviewFormId))
    const stored = await tx
      .select({ id: files.id, originalName: files.originalName, kind: files.kind })
      .from(files)
      .where(and(eq(files.manuscriptId, manuscript.id), inArray(files.kind, ['manuscript_anonymised', 'manuscript'])))
      .orderBy(desc(files.createdAt))
    const preview = stored.find((file) => file.kind === 'manuscript_anonymised') ?? stored.find((file) => file.kind === 'manuscript') ?? null
    return {
      reference: manuscript.reference,
      title: manuscript.title,
      abstract: manuscript.abstract,
      file: preview ? { id: preview.id, originalName: preview.originalName } : null,
      dueAt: assignment.dueAt,
      status: assignment.status,
      blinding: mode,
      authors: authors.map((author) => ({
        givenName: author.givenName,
        familyName: author.familyName,
        affiliation: author.affiliation,
      })),
      form: questions.map((question) => ({
        id: question.id,
        type: question.type,
        label: question.label,
        helpText: question.helpText,
        required: question.isRequired,
        visibility: question.visibility,
        config: question.config,
      })),
    }
  })
}

export async function respondToInvitation(token: string, input: z.infer<typeof respondInput>) {
  const tokenHash = hashToken(token)
  return withReviewToken(tokenHash, async (tx) => {
    const assignment = await assignmentByHash(tx, tokenHash)
    await expireIfNeeded(tx, assignment)
    if (assignment.status !== 'invited') throw Errors.conflict('This invitation has already been answered')
    const now = new Date()
    if (input.action === 'decline') {
      await tx
        .update(reviewAssignments)
        .set({ status: 'declined', respondedAt: now, declineReason: input.reason })
        .where(eq(reviewAssignments.id, assignment.id))
      await maybeReturnToSearch(tx, assignment.manuscriptId, assignment.journalId)
      return { status: 'declined' as const }
    }
    await tx
      .update(reviewAssignments)
      .set({ status: 'accepted', respondedAt: now })
      .where(eq(reviewAssignments.id, assignment.id))
    const [manuscript] = await tx.select().from(manuscripts).where(eq(manuscripts.id, assignment.manuscriptId)).limit(1)
    if (manuscript && (manuscript.status === 'reviewer_search' || manuscript.status === 'resubmitted')) {
      await applyTransition(tx, {
        manuscript,
        to: 'under_review',
        actorId: assignment.reviewerId,
        reason: 'A reviewer accepted',
      })
    }
    return { status: 'accepted' as const }
  })
}

export async function submitReview(token: string, input: z.infer<typeof submitReviewInput>) {
  const tokenHash = hashToken(token)
  return withReviewToken(tokenHash, async (tx) => {
    const assignment = await assignmentByHash(tx, tokenHash)
    if (assignment.status !== 'accepted') throw Errors.conflict('Accept the invitation before submitting a review')
    const [manuscript] = await tx.select().from(manuscripts).where(eq(manuscripts.id, assignment.manuscriptId)).limit(1)
    if (!manuscript?.policySnapshot) throw Errors.notFound('Manuscript')
    const questions = await tx
      .select()
      .from(reviewFormQuestions)
      .where(eq(reviewFormQuestions.formId, manuscript.policySnapshot.reviewFormId))
    for (const question of questions) {
      if (question.isRequired && (input.answers[question.id] === undefined || input.answers[question.id] === '')) {
        throw Errors.badRequest(`Required: ${question.label}`)
      }
    }
    const now = new Date()
    await tx.insert(reviews).values({
      journalId: assignment.journalId,
      assignmentId: assignment.id,
      formId: manuscript.policySnapshot.reviewFormId,
      recommendation: input.recommendation,
      answers: input.answers,
      submittedAt: now,
    })
    await tx
      .update(reviewAssignments)
      .set({ status: 'submitted', submittedAt: now })
      .where(eq(reviewAssignments.id, assignment.id))

    const submitted = await tx
      .select({ id: reviewAssignments.id })
      .from(reviewAssignments)
      .where(
        and(
          eq(reviewAssignments.manuscriptId, manuscript.id),
          eq(reviewAssignments.round, assignment.round),
          eq(reviewAssignments.status, 'submitted'),
        ),
      )
    const required = manuscript.policySnapshot.policy.review.reviewsRequiredToDecide
    if (submitted.length >= required && manuscript.status === 'under_review') {
      await applyTransition(tx, {
        manuscript,
        to: 'decision_pending',
        actorId: null,
        reason: `${submitted.length} reviews are in`,
      })
    }
    if (manuscript.handlingEditorId) {
      await notify(tx, {
        journalId: manuscript.journalId,
        userId: manuscript.handlingEditorId,
        kind: 'review_received',
        title: `Review in for ${manuscript.reference}`,
        body: 'A review was submitted. The reviewer is not named in this notice.',
        href: `/manuscripts/${manuscript.id}`,
      })
    }
    return { status: 'submitted' as const }
  })
}

async function assignmentByHash(tx: Tx, tokenHash: string) {
  const [assignment] = await tx
    .select()
    .from(reviewAssignments)
    .where(eq(reviewAssignments.accessTokenHash, tokenHash))
    .limit(1)
  if (!assignment) throw Errors.notFound('Invitation')
  await tx.execute(sql`select set_config('app.journal_id', ${assignment.journalId}, true)`)
  return assignment
}

async function expireIfNeeded(tx: Tx, assignment: typeof reviewAssignments.$inferSelect) {
  if (assignment.status !== 'invited') return
  const [manuscript] = await tx.select().from(manuscripts).where(eq(manuscripts.id, assignment.manuscriptId)).limit(1)
  const days = manuscript?.policySnapshot?.policy.review.invitationExpiryDays ?? 7
  const invitedAt = assignment.invitedAt ?? assignment.dueAt
  const expiry = new Date(invitedAt.getTime() + days * 86_400_000)
  if (expiry < new Date()) {
    await tx.update(reviewAssignments).set({ status: 'expired' }).where(eq(reviewAssignments.id, assignment.id))
    throw Errors.gone('This invitation has expired')
  }
}

async function maybeReturnToSearch(tx: Tx, manuscriptId: string, journalId: string) {
  const open = await tx
    .select({ id: reviewAssignments.id })
    .from(reviewAssignments)
    .where(
      and(
        eq(reviewAssignments.manuscriptId, manuscriptId),
        inArray(reviewAssignments.status, ['invited', 'accepted', 'submitted']),
      ),
    )
  if (open.length > 0) return
  const [manuscript] = await tx
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.id, manuscriptId), eq(manuscripts.journalId, journalId)))
    .limit(1)
  if (manuscript?.status === 'under_review') {
    await applyTransition(tx, {
      manuscript,
      to: 'reviewer_search',
      actorId: null,
      reason: 'No reviewers remain on this round',
    })
  }
}

/** A reminder for the open reviews on one manuscript. The original invitation link still works. */
export async function remindReviewers(tx: Tx, ctx: JournalCtx, manuscriptId: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  const rows = await tx
    .select({
      id: reviewAssignments.id,
      status: reviewAssignments.status,
      remindersSent: reviewAssignments.remindersSent,
      reviewerId: reviewAssignments.reviewerId,
      email: users.email,
    })
    .from(reviewAssignments)
    .innerJoin(users, eq(users.id, reviewAssignments.reviewerId))
    .where(eq(reviewAssignments.manuscriptId, manuscript.id))
  const open = rows.filter((row) => row.status === 'invited' || row.status === 'accepted')
  for (const row of open) {
    await notify(tx, {
      journalId: ctx.journal.id,
      userId: row.reviewerId,
      email: row.email,
      kind: 'reminder',
      title: `Review reminder ${manuscript.reference}`,
      body: 'This review is still open. Use the link in the original invitation. If you no longer have it, write to the editor and they will issue another.',
      href: '/my-reviews',
    })
    await tx
      .update(reviewAssignments)
      .set({ remindersSent: row.remindersSent + 1 })
      .where(eq(reviewAssignments.id, row.id))
  }
  return { reminded: open.length }
}

/** Reminder emails do not include a new link. Rotating the token would kill the one the reviewer saved. */
export async function sendDueReminders() {
  const due = await db
    .select({
      id: reviewAssignments.id,
      journalId: reviewAssignments.journalId,
      dueAt: reviewAssignments.dueAt,
      remindersSent: reviewAssignments.remindersSent,
      reviewerId: reviewAssignments.reviewerId,
      email: users.email,
      reference: manuscripts.reference,
    })
    .from(reviewAssignments)
    .innerJoin(users, eq(users.id, reviewAssignments.reviewerId))
    .innerJoin(manuscripts, eq(manuscripts.id, reviewAssignments.manuscriptId))
    .where(and(inArray(reviewAssignments.status, ['invited', 'accepted']), sql`${reviewAssignments.dueAt} < now()`))
    .limit(50)

  for (const row of due) {
    await withJournal(row.journalId, async (tx) => {
      await notify(tx, {
        journalId: row.journalId,
        userId: row.reviewerId,
        email: row.email,
        kind: 'reminder',
        title: `Review reminder ${row.reference}`,
        body: 'This review is due. Use the link in the original invitation. If you no longer have it, write to the editor and they will issue another.',
        href: '/my-reviews',
      })
      await tx
        .update(reviewAssignments)
        .set({ remindersSent: row.remindersSent + 1 })
        .where(eq(reviewAssignments.id, row.id))
    })
  }
  return { reminded: due.length }
}

export async function listMyAssignments(tx: Tx, journalId: string, userId: string) {
  return tx
    .select({
      id: reviewAssignments.id,
      status: reviewAssignments.status,
      dueAt: reviewAssignments.dueAt,
      round: reviewAssignments.round,
      manuscriptId: reviewAssignments.manuscriptId,
      title: manuscripts.title,
      reference: manuscripts.reference,
    })
    .from(reviewAssignments)
    .innerJoin(manuscripts, eq(manuscripts.id, reviewAssignments.manuscriptId))
    .where(and(eq(reviewAssignments.journalId, journalId), eq(reviewAssignments.reviewerId, userId)))
    .orderBy(reviewAssignments.dueAt)
}
