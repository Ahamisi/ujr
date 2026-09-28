import { eq, inArray } from 'drizzle-orm'
import { z } from 'zod'
import type { Tx } from '@/db/client'
import { decisions, manuscriptAuthors, reviewAssignments, reviewFormQuestions, reviews, users } from '@/db/schema'
import { audit } from '@/server/audit'
import { assertNotAuthor } from '@/server/authz'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'
import { applyTransition, loadManuscript } from '@/server/manuscripts/service'
import { DECISION_STATUS } from '@/server/manuscripts/transitions'
import { reviewerLabel } from '@/server/blinding'
import { notify } from '@/server/notifications/service'

export const decisionInput = z.object({
  decision: z.enum(['accept', 'minor_revision', 'major_revision', 'reject', 'reject_with_resubmission', 'desk_reject']),
  letterBody: z.string().min(1),
  isAppeal: z.boolean().optional(),
})

const OPENING = {
  accept: 'I am pleased to tell you that your manuscript has been accepted for publication.',
  minor_revision: 'We would be glad to consider a revised version addressing the points below.',
  major_revision: 'The reviewers raise substantive points that must be addressed before we can consider the manuscript further.',
  reject: 'After review we are unable to accept your manuscript for publication.',
  reject_with_resubmission: 'We cannot accept the manuscript in its present form. A substantially revised resubmission would be considered as a new submission.',
  desk_reject: 'We will not be sending the manuscript for review.',
} as const

/**
 * Builds the letter from author-visible answers only. Confidential comments
 * are a different column of visibility and are not read here. The editor may
 * edit the result before it is stored; what is stored is what the author is sent.
 */
export async function draftDecisionLetter(tx: Tx, ctx: JournalCtx, manuscriptId: string, decision: keyof typeof OPENING) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  const rows = await tx
    .select({
      answers: reviews.answers,
      formId: reviews.formId,
      invitedAt: reviewAssignments.invitedAt,
    })
    .from(reviews)
    .innerJoin(reviewAssignments, eq(reviewAssignments.id, reviews.assignmentId))
    .where(eq(reviewAssignments.manuscriptId, manuscript.id))
    .orderBy(reviewAssignments.invitedAt)
  const formIds = [...new Set(rows.map((row) => row.formId))]
  const questions = formIds.length
    ? await tx.select().from(reviewFormQuestions).where(inArray(reviewFormQuestions.formId, formIds))
    : []
  const visible = new Set(
    questions.filter((question) => question.visibility === 'author_and_editor' && formIds.includes(question.formId)).map((question) => question.id),
  )
  const comments = rows
    .map((row, index) => {
      const text = Object.entries(row.answers)
        .filter(([key]) => visible.has(key))
        .map(([, value]) => String(value))
        .filter(Boolean)
        .join('\n')
      return text ? `${reviewerLabel(index)}\n${text}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
  const [author] = await tx
    .select()
    .from(manuscriptAuthors)
    .where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
  const salutation = author ? `Dear ${author.givenName} ${author.familyName}` : 'Dear author'
  const letter = [salutation, '', OPENING[decision], '', comments, '', `Regarding ${manuscript.reference}.`].filter(Boolean).join('\n')
  return { letter }
}

export async function recordDecision(tx: Tx, ctx: JournalCtx, manuscriptId: string, input: z.infer<typeof decisionInput>) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  const policy = manuscript.policySnapshot?.policy
  if (policy && !policy.review.availableDecisions.includes(input.decision)) {
    throw Errors.conflict('That decision is not available under the policy frozen on this manuscript')
  }
  if (input.isAppeal && policy && !policy.review.allowAppeals) throw Errors.conflict('This journal does not allow appeals')
  if (
    policy &&
    (input.decision === 'minor_revision' || input.decision === 'major_revision') &&
    manuscript.currentRound >= policy.review.maxRevisionRounds
  ) {
    throw Errors.conflict('This manuscript has used the revision rounds allowed by its policy')
  }
  if (input.decision === 'desk_reject' && !['submitted', 'desk_review', 'reviewer_search'].includes(manuscript.status)) {
    throw Errors.conflict('A desk reject is only available before review is complete')
  }

  const [row] = await tx
    .insert(decisions)
    .values({
      journalId: ctx.journal.id,
      manuscriptId: manuscript.id,
      round: Math.max(manuscript.currentRound, 1),
      decision: input.decision,
      editorId: ctx.actor.userId,
      letterBody: input.letterBody,
      isAppeal: Boolean(input.isAppeal),
    })
    .returning()

  const updated = await applyTransition(tx, {
    manuscript,
    to: DECISION_STATUS[input.decision],
    actorId: ctx.actor.userId,
    reason: input.decision,
  })

  const [author] = await tx
    .select({ userId: manuscriptAuthors.userId, email: manuscriptAuthors.email })
    .from(manuscriptAuthors)
    .where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
  const userId = author?.userId ?? manuscript.submittedById
  const [account] = await tx.select({ email: users.email }).from(users).where(eq(users.id, userId)).limit(1)
  await notify(tx, {
    journalId: ctx.journal.id,
    userId,
    email: author?.email ?? account?.email,
    kind: 'decision',
    title: `Decision on ${manuscript.reference}`,
    body: 'A decision has been recorded. The letter is on your manuscript page.',
    href: `/my-submissions/${manuscript.id}`,
  })
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'decision.recorded',
    entityType: 'decision',
    entityId: row.id,
    metadata: { decision: input.decision, manuscriptId: manuscript.id },
    ipAddress: ctx.meta.ipAddress,
  })
  return { id: row.id, status: updated.status }
}
