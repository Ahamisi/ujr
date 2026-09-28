import { and, desc, eq, inArray, ne, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Tx } from '@/db/client'
import { freezePolicy, resolvePolicy } from '@/db/policy'
import { DECLARATION_LABELS, type DeclarationKey } from '@/lib/declarations'
import {
  annotations,
  charges,
  decisions,
  doiDeposits,
  files,
  manuscriptAuthors,
  manuscriptVersions,
  manuscripts,
  memberships,
  productionTasks,
  referenceCounters,
  reviewAssignments,
  reviewFormQuestions,
  reviewForms,
  reviews,
  sections,
  statusTransitions,
  users,
  type journals,
} from '@/db/schema'
import { NEEDS_ACTION } from '@/lib/manuscript-status'
import type { ManuscriptStatus } from '@/lib/types'
import { audit } from '@/server/audit'
import { assertNotAuthor, findGrant, isManuscriptAuthor, ROLE_GROUPS, scopeFilter, type Membership } from '@/server/authz'
import { authorSeesReviewerNames, reviewerLabel } from '@/server/blinding'
import { maybeRaiseCharge } from '@/server/charges/service'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'
import { enqueue } from '@/server/jobs/service'
import { notify } from '@/server/notifications/service'
import { canTransition } from './transitions'

const authorInput = z.object({
  givenName: z.string().min(1),
  familyName: z.string().min(1),
  email: z.string().email(),
  affiliation: z.string().optional(),
  orcid: z.string().max(19).optional(),
  isCorresponding: z.boolean().optional(),
  contributions: z.array(z.string()).optional(),
})

export const createDraftInput = z.object({
  sectionId: z.string().uuid(),
  title: z.string().min(1),
  abstract: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  authors: z.array(authorInput).min(1),
})

export const updateDraftInput = z.object({
  title: z.string().min(1).max(500),
  abstract: z.string().max(20000).optional(),
  keywords: z.array(z.string().min(1).max(80)).max(20).optional(),
  sectionId: z.string().uuid().optional(),
  affiliation: z.string().max(200).optional(),
})

export const submitInput = z.object({
  declarations: z.record(z.string(), z.object({ affirmed: z.boolean(), detail: z.string().optional() })).optional(),
})

export const transitionInput = z.object({
  to: z.string(),
  reason: z.string().max(2000).optional(),
})

export const assignEditorInput = z.object({ editorId: z.string().uuid() })

type Manuscript = typeof manuscripts.$inferSelect

async function allocateReference(tx: Tx, journal: typeof journals.$inferSelect) {
  const year = new Date().getFullYear()
  const [row] = await tx
    .insert(referenceCounters)
    .values({ journalId: journal.id, year, nextNumber: 1 })
    .onConflictDoUpdate({
      target: [referenceCounters.journalId, referenceCounters.year],
      set: { nextNumber: sql`${referenceCounters.nextNumber} + 1` },
    })
    .returning()
  const abbr = (journal.abbreviation || journal.slug).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12) || 'J'
  return `${abbr}-${year}-${String(row.nextNumber).padStart(4, '0')}`
}

export async function loadManuscript(tx: Tx, journalId: string, id: string) {
  const [row] = await tx
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.id, id), eq(manuscripts.journalId, journalId)))
    .limit(1)
  return row ?? null
}

export async function createDraft(tx: Tx, ctx: JournalCtx, input: z.infer<typeof createDraftInput>) {
  const [section] = await tx
    .select()
    .from(sections)
    .where(and(eq(sections.id, input.sectionId), eq(sections.journalId, ctx.journal.id)))
    .limit(1)
  if (!section || !section.acceptsSubmissions) throw Errors.badRequest('This section is not accepting submissions')

  const authors = input.authors.map((author, index) => ({ ...author, isCorresponding: author.isCorresponding ?? index === 0 }))
  if (!authors.some((author) => author.isCorresponding)) authors[0].isCorresponding = true

  const reference = await allocateReference(tx, ctx.journal)
  const [manuscript] = await tx
    .insert(manuscripts)
    .values({
      journalId: ctx.journal.id,
      sectionId: section.id,
      reference,
      title: input.title,
      abstract: input.abstract,
      keywords: input.keywords ?? [],
      status: 'draft',
      submittedById: ctx.actor.userId,
    })
    .returning()

  await tx.insert(manuscriptAuthors).values(
    authors.map((author, index) => ({
      journalId: ctx.journal.id,
      manuscriptId: manuscript.id,
      userId: author.email.toLowerCase() === ctx.actor.email.toLowerCase() ? ctx.actor.userId : null,
      sortOrder: index,
      givenName: author.givenName,
      familyName: author.familyName,
      email: author.email,
      affiliation: author.affiliation,
      orcid: author.orcid,
      isCorresponding: Boolean(author.isCorresponding),
      contributions: author.contributions ?? [],
    })),
  )
  await tx.insert(statusTransitions).values({
    journalId: ctx.journal.id,
    manuscriptId: manuscript.id,
    fromStatus: null,
    toStatus: 'draft',
    actorId: ctx.actor.userId,
  })
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'manuscript.draft_created',
    entityType: 'manuscript',
    entityId: manuscript.id,
    ipAddress: ctx.meta.ipAddress,
  })
  return { id: manuscript.id, reference: manuscript.reference, status: manuscript.status }
}

/** A draft has not been submitted, so it can leave the record. Anything later stays. */
export async function deleteDraft(tx: Tx, ctx: JournalCtx, id: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  if (!(await isManuscriptAuthor(tx, manuscript, ctx.actor.userId))) throw Errors.notFound('Manuscript')
  if (manuscript.status !== 'draft') throw Errors.conflict('Only a draft can be deleted')

  const stored = await tx
    .select({ storageKey: files.storageKey })
    .from(files)
    .where(and(eq(files.manuscriptId, manuscript.id), eq(files.journalId, ctx.journal.id)))
  const assignments = await tx
    .select({ id: reviewAssignments.id })
    .from(reviewAssignments)
    .where(eq(reviewAssignments.manuscriptId, manuscript.id))
  if (assignments.length > 0) {
    await tx.delete(reviews).where(inArray(reviews.assignmentId, assignments.map((row) => row.id)))
  }
  await tx.delete(annotations).where(eq(annotations.manuscriptId, manuscript.id))
  await tx.delete(reviewAssignments).where(eq(reviewAssignments.manuscriptId, manuscript.id))
  await tx.delete(files).where(eq(files.manuscriptId, manuscript.id))
  await tx.delete(manuscriptVersions).where(eq(manuscriptVersions.manuscriptId, manuscript.id))
  await tx.delete(decisions).where(eq(decisions.manuscriptId, manuscript.id))
  await tx.delete(charges).where(eq(charges.manuscriptId, manuscript.id))
  await tx.delete(productionTasks).where(eq(productionTasks.manuscriptId, manuscript.id))
  await tx.delete(doiDeposits).where(eq(doiDeposits.manuscriptId, manuscript.id))
  await tx.delete(statusTransitions).where(eq(statusTransitions.manuscriptId, manuscript.id))
  await tx.delete(manuscriptAuthors).where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
  await tx.delete(manuscripts).where(and(eq(manuscripts.id, manuscript.id), eq(manuscripts.journalId, ctx.journal.id)))
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'manuscript.draft_deleted',
    entityType: 'manuscript',
    entityId: manuscript.id,
    metadata: { reference: manuscript.reference },
    ipAddress: ctx.meta.ipAddress,
  })
  return { id: manuscript.id, storageKeys: stored.map((row) => row.storageKey) }
}

/** Change a draft in place. A submitted manuscript is no longer the author's to rewrite. */
export async function updateDraft(tx: Tx, ctx: JournalCtx, id: string, input: z.infer<typeof updateDraftInput>) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  if (!(await isManuscriptAuthor(tx, manuscript, ctx.actor.userId))) throw Errors.notFound('Manuscript')
  if (manuscript.status !== 'draft') throw Errors.conflict('Only a draft can be edited')
  if (input.sectionId) {
    const [section] = await tx
      .select()
      .from(sections)
      .where(and(eq(sections.id, input.sectionId), eq(sections.journalId, ctx.journal.id)))
      .limit(1)
    if (!section || !section.acceptsSubmissions) throw Errors.badRequest('This section is not accepting submissions')
  }
  await tx
    .update(manuscripts)
    .set({
      title: input.title.trim(),
      abstract: input.abstract?.trim() ?? '',
      keywords: input.keywords ?? manuscript.keywords,
      sectionId: input.sectionId ?? manuscript.sectionId,
      updatedAt: new Date(),
    })
    .where(eq(manuscripts.id, manuscript.id))
  if (input.affiliation !== undefined) {
    await tx
      .update(manuscriptAuthors)
      .set({ affiliation: input.affiliation.trim() || null })
      .where(and(eq(manuscriptAuthors.manuscriptId, manuscript.id), eq(manuscriptAuthors.isCorresponding, true)))
  }
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'manuscript.draft_updated',
    entityType: 'manuscript',
    entityId: manuscript.id,
    ipAddress: ctx.meta.ipAddress,
  })
  const fresh = await loadManuscript(tx, ctx.journal.id, manuscript.id)
  if (!fresh) throw Errors.notFound('Manuscript')
  return authorManuscript(tx, fresh)
}

export async function submitManuscript(tx: Tx, ctx: JournalCtx, id: string, input: z.infer<typeof submitInput>) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  if (!(await isManuscriptAuthor(tx, manuscript, ctx.actor.userId))) throw Errors.notFound('Manuscript')
  if (manuscript.status !== 'draft') throw Errors.conflict('Only a draft can be submitted')
  if (!manuscript.sectionId) throw Errors.badRequest('Choose a section before submitting')

  const [section] = await tx.select().from(sections).where(eq(sections.id, manuscript.sectionId)).limit(1)
  if (!section?.activeReviewFormId) throw Errors.badRequest('This section has no published review form')
  const [form] = await tx.select().from(reviewForms).where(eq(reviewForms.id, section.activeReviewFormId)).limit(1)
  if (!form || form.status !== 'published') throw Errors.badRequest('This section has no published review form')

  const policy = resolvePolicy(ctx.journal.policy, section.policyOverrides)
  const words = (manuscript.abstract ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length > policy.submission.abstractWordLimit) {
    throw Errors.badRequest(`Abstract is over the ${policy.submission.abstractWordLimit} word limit`)
  }
  if ((manuscript.keywords ?? []).length > policy.submission.maxKeywords) {
    throw Errors.badRequest(`Use at most ${policy.submission.maxKeywords} keywords`)
  }
  const declarations = input.declarations ?? {}
  for (const required of policy.submission.requiredDeclarations) {
    if (!declarations[required]?.affirmed) {
      const label = DECLARATION_LABELS[required as DeclarationKey] ?? required
      throw Errors.badRequest(`Please confirm: ${label}`)
    }
  }
  const [uploaded] = await tx
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.manuscriptId, manuscript.id), eq(files.kind, 'manuscript')))
    .limit(1)
  if (!uploaded) throw Errors.badRequest('Upload the manuscript before submitting')

  const snapshot = freezePolicy({
    journalPatch: ctx.journal.policy,
    journalPolicyVersion: ctx.journal.policyVersion,
    sectionPatch: section.policyOverrides,
    sectionId: section.id,
    reviewFormId: form.id,
  })
  const now = new Date()
  await applyTransition(tx, {
    manuscript,
    to: 'submitted',
    actorId: ctx.actor.userId,
    reason: 'Submitted by the author',
    extra: {
      policySnapshot: snapshot,
      declarations,
      currentRound: 1,
      currentVersion: 1,
      submittedAt: now,
    },
  })

  const editors = await tx
    .select({ userId: memberships.userId, email: users.email })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(
      and(
        eq(memberships.journalId, ctx.journal.id),
        inArray(memberships.role, ['managing_editor', 'editor_in_chief', 'journal_manager']),
      ),
    )
  await notify(tx, {
    journalId: ctx.journal.id,
    userId: ctx.actor.userId,
    email: ctx.actor.email,
    kind: 'submission_received',
    title: `${manuscript.reference} received`,
    body: 'The journal has your manuscript. The policy that applies to it is now fixed.',
    href: `/my-submissions/${manuscript.id}`,
  })
  for (const editor of editors) {
    await notify(tx, {
      journalId: ctx.journal.id,
      userId: editor.userId,
      email: editor.email,
      kind: 'submission_received',
      title: `${manuscript.reference} submitted`,
      body: manuscript.title,
      href: `/manuscripts/${manuscript.id}`,
    })
  }
  const fresh = await loadManuscript(tx, ctx.journal.id, manuscript.id)
  if (fresh) await maybeRaiseCharge(tx, { manuscript: fresh, trigger: 'on_submission', actorId: ctx.actor.userId })
  if (policy.similarity.enabled && policy.similarity.provider !== 'none') {
    await enqueue(tx, {
      journalId: ctx.journal.id,
      type: 'similarity_check',
      payload: { manuscriptId: manuscript.id },
    })
  }
  return { id: manuscript.id, reference: manuscript.reference, status: 'submitted' as const }
}

export async function applyTransition(
  tx: Tx,
  input: {
    manuscript: Manuscript
    to: ManuscriptStatus
    actorId: string | null
    reason?: string
    extra?: Partial<typeof manuscripts.$inferInsert>
  },
) {
  if (!canTransition(input.manuscript.status, input.to)) {
    throw Errors.conflict(`Cannot move a manuscript from ${input.manuscript.status} to ${input.to}`)
  }
  if (input.to === 'published') {
    if (!input.manuscript.doi) throw Errors.conflict('Mint a DOI before publishing')
    if (!input.manuscript.issueId) throw Errors.conflict('Place the manuscript in an issue before publishing')
  }
  const now = new Date()
  const [updated] = await tx
    .update(manuscripts)
    .set({
      status: input.to,
      updatedAt: now,
      acceptedAt: input.to === 'accepted' ? now : input.manuscript.acceptedAt,
      publishedAt: input.to === 'published' ? now : input.manuscript.publishedAt,
      ...input.extra,
    })
    .where(eq(manuscripts.id, input.manuscript.id))
    .returning()
  await tx.insert(statusTransitions).values({
    journalId: input.manuscript.journalId,
    manuscriptId: input.manuscript.id,
    fromStatus: input.manuscript.status,
    toStatus: input.to,
    actorId: input.actorId,
    reason: input.reason,
  })
  if (input.to === 'in_production') {
    await tx
      .insert(productionTasks)
      .values({ journalId: input.manuscript.journalId, manuscriptId: input.manuscript.id, stage: 'copyediting' })
      .onConflictDoNothing()
  }
  if (input.to === 'accepted' || input.to === 'published') {
    await maybeRaiseCharge(tx, {
      manuscript: updated,
      trigger: input.to === 'accepted' ? 'on_acceptance' : 'on_publication',
      actorId: input.actorId ?? input.manuscript.submittedById,
    })
  }
  return updated
}

export async function editorTransition(tx: Tx, ctx: JournalCtx, grant: Membership, id: string, to: ManuscriptStatus, reason?: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  const scope = scopeFilter(grant)
  if (scope?.sectionId && manuscript.sectionId !== scope.sectionId) throw Errors.notFound('Manuscript')
  if (scope?.issueId && manuscript.issueId !== scope.issueId) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  if (to === 'submitted' || to === 'resubmitted') throw Errors.badRequest('That transition belongs to the author')
  const updated = await applyTransition(tx, { manuscript, to, actorId: ctx.actor.userId, reason })
  if (to === 'desk_rejected') {
    const people = await tx
      .select({ userId: manuscriptAuthors.userId, email: manuscriptAuthors.email })
      .from(manuscriptAuthors)
      .where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
    for (const person of people) {
      if (!person.userId) continue
      await notify(tx, {
        journalId: ctx.journal.id,
        userId: person.userId,
        email: person.email,
        kind: 'decision',
        title: `${manuscript.reference} was not sent for review`,
        body: reason?.trim() || 'The desk did not send this manuscript for review.',
        href: `/my-submissions/${manuscript.id}`,
      })
    }
  }
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'manuscript.transition',
    entityType: 'manuscript',
    entityId: manuscript.id,
    metadata: { from: manuscript.status, to },
    ipAddress: ctx.meta.ipAddress,
  })
  return { id: updated.id, status: updated.status }
}

export async function resubmit(tx: Tx, ctx: JournalCtx, id: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  if (!(await isManuscriptAuthor(tx, manuscript, ctx.actor.userId))) throw Errors.notFound('Manuscript')
  const updated = await applyTransition(tx, {
    manuscript,
    to: 'resubmitted',
    actorId: ctx.actor.userId,
    reason: 'Author resubmitted',
    extra: { currentVersion: manuscript.currentVersion + 1, currentRound: manuscript.currentRound + 1 },
  })
  return { id: updated.id, status: updated.status, round: updated.currentRound }
}

export async function assignEditor(tx: Tx, ctx: JournalCtx, id: string, editorId: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  await assertNotAuthor(tx, manuscript, editorId)
  const [editor] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(
      and(
        eq(memberships.userId, editorId),
        eq(memberships.journalId, ctx.journal.id),
        inArray(memberships.role, ['handling_editor', 'section_editor', 'editor_in_chief', 'managing_editor', 'guest_editor']),
      ),
    )
    .limit(1)
  if (!editor) throw Errors.badRequest('That person is not an editor of this journal')
  await tx.update(manuscripts).set({ handlingEditorId: editorId, updatedAt: new Date() }).where(eq(manuscripts.id, manuscript.id))
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'manuscript.editor_assigned',
    entityType: 'manuscript',
    entityId: manuscript.id,
    metadata: { editorId },
    ipAddress: ctx.meta.ipAddress,
  })
  return { id: manuscript.id, handlingEditorId: editorId }
}

async function reviewerChips(tx: Tx, manuscriptIds: string[], revealNames: boolean) {
  if (manuscriptIds.length === 0) return new Map<string, { id: string; displayName: string; realName: string; status: string; dueAt: string; recommendation?: string }[]>()
  const rows = await tx
    .select({
      id: reviewAssignments.id,
      manuscriptId: reviewAssignments.manuscriptId,
      status: reviewAssignments.status,
      dueAt: reviewAssignments.dueAt,
      invitedAt: reviewAssignments.invitedAt,
      givenName: users.givenName,
      familyName: users.familyName,
    })
    .from(reviewAssignments)
    .innerJoin(users, eq(users.id, reviewAssignments.reviewerId))
    .where(inArray(reviewAssignments.manuscriptId, manuscriptIds))
    .orderBy(reviewAssignments.invitedAt)
  const grouped = new Map<string, typeof rows>()
  for (const row of rows) {
    const list = grouped.get(row.manuscriptId) ?? []
    list.push(row)
    grouped.set(row.manuscriptId, list)
  }
  const chips = new Map<string, { id: string; displayName: string; realName: string; status: string; dueAt: string }[]>()
  for (const [manuscriptId, list] of grouped) {
    chips.set(
      manuscriptId,
      list.map((row, index) => ({
        id: row.id,
        displayName: reviewerLabel(index),
        realName: revealNames ? `${row.givenName} ${row.familyName}` : reviewerLabel(index),
        status: row.status,
        dueAt: row.dueAt.toISOString(),
      })),
    )
  }
  return chips
}

export async function listDesk(tx: Tx, journalId: string, grant: Membership) {
  const scope = scopeFilter(grant)
  const filters = [eq(manuscripts.journalId, journalId), inArray(manuscripts.status, NEEDS_ACTION)]
  if (scope?.sectionId) filters.push(eq(manuscripts.sectionId, scope.sectionId))
  if (scope?.issueId) filters.push(eq(manuscripts.issueId, scope.issueId))
  const rows = await tx
    .select()
    .from(manuscripts)
    .where(and(...filters))
    .orderBy(desc(manuscripts.updatedAt))
  return presentQueue(tx, rows, true)
}

export async function listJournalManuscripts(tx: Tx, journalId: string, grant: Membership) {
  const scope = scopeFilter(grant)
  const filters = [eq(manuscripts.journalId, journalId), ne(manuscripts.status, 'draft')]
  if (scope?.sectionId) filters.push(eq(manuscripts.sectionId, scope.sectionId))
  if (scope?.issueId) filters.push(eq(manuscripts.issueId, scope.issueId))
  const rows = await tx.select().from(manuscripts).where(and(...filters)).orderBy(desc(manuscripts.updatedAt))
  return presentQueue(tx, rows, true)
}

export async function listMine(tx: Tx, journalId: string, userId: string) {
  const authored = await tx
    .select({ manuscriptId: manuscriptAuthors.manuscriptId })
    .from(manuscriptAuthors)
    .where(and(eq(manuscriptAuthors.journalId, journalId), eq(manuscriptAuthors.userId, userId)))
  const ids = authored.map((row) => row.manuscriptId)
  const submitted = await tx
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.journalId, journalId), eq(manuscripts.submittedById, userId)))
  const extra = ids.length
    ? await tx.select().from(manuscripts).where(and(eq(manuscripts.journalId, journalId), inArray(manuscripts.id, ids)))
    : []
  const byId = new Map([...submitted, ...extra].map((row) => [row.id, row]))
  return presentQueue(tx, [...byId.values()], false)
}

async function presentQueue(tx: Tx, rows: Manuscript[], revealNames: boolean) {
  const ids = rows.map((row) => row.id)
  const chips = await reviewerChips(tx, ids, revealNames)
  const authorRows = ids.length
    ? await tx.select().from(manuscriptAuthors).where(inArray(manuscriptAuthors.manuscriptId, ids))
    : []
  const transitions = ids.length
    ? await tx
        .select()
        .from(statusTransitions)
        .where(inArray(statusTransitions.manuscriptId, ids))
        .orderBy(desc(statusTransitions.createdAt))
    : []
  const latest = new Map<string, Date>()
  for (const transition of transitions) {
    if (!latest.has(transition.manuscriptId)) latest.set(transition.manuscriptId, transition.createdAt)
  }
  const sectionIds = [...new Set(rows.map((row) => row.sectionId).filter((id): id is string => Boolean(id)))]
  const sectionRows = sectionIds.length
    ? await tx.select({ id: sections.id, name: sections.name }).from(sections).where(inArray(sections.id, sectionIds))
    : []
  const sectionName = new Map(sectionRows.map((section) => [section.id, section.name]))
  const editorIds = revealNames
    ? [...new Set(rows.map((row) => row.handlingEditorId).filter((id): id is string => Boolean(id)))]
    : []
  const editorRows = editorIds.length
    ? await tx
        .select({ id: users.id, givenName: users.givenName, familyName: users.familyName })
        .from(users)
        .where(inArray(users.id, editorIds))
    : []
  const editorName = new Map(editorRows.map((editor) => [editor.id, `${editor.givenName} ${editor.familyName}`]))
  return rows.map((row) => {
    const authors = authorRows.filter((author) => author.manuscriptId === row.id)
    const corresponding = authors.find((author) => author.isCorresponding) ?? authors[0]
    const reviewers = chips.get(row.id) ?? []
    const since = latest.get(row.id) ?? row.submittedAt ?? row.createdAt
    return {
      id: row.id,
      reference: row.reference,
      title: row.title,
      status: row.status,
      sectionId: row.sectionId,
      section: row.sectionId ? (sectionName.get(row.sectionId) ?? '') : '',
      correspondingAuthor: corresponding ? `${corresponding.givenName} ${corresponding.familyName}` : '',
      authorCount: authors.length,
      handlingEditorId: revealNames ? row.handlingEditorId : null,
      handlingEditor: revealNames && row.handlingEditorId ? (editorName.get(row.handlingEditorId) ?? null) : null,
      round: row.currentRound,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      daysInStatus: Math.floor((Date.now() - since.getTime()) / 86_400_000),
      similarityPercent: revealNames ? row.similarityPercent : null,
      reviewers,
      blinding: row.policySnapshot?.policy.review.blinding ?? null,
      hasOverdueReview: reviewers.some((reviewer) => reviewer.status === 'accepted' && new Date(reviewer.dueAt) < new Date()),
    }
  })
}

export async function getManuscript(tx: Tx, ctx: JournalCtx, id: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, id)
  if (!manuscript) throw Errors.notFound('Manuscript')
  const author = await isManuscriptAuthor(tx, manuscript, ctx.actor.userId)
  // An editor who wrote the paper sees the author view. Otherwise they would
  // read the reviewer names on their own submission.
  if (author) return authorManuscript(tx, manuscript)
  if (manuscript.status === 'draft') throw Errors.notFound('Manuscript')
  const grant = await findGrant(tx, ctx.actor.userId, ctx.journal.id, ROLE_GROUPS.staff, {
    sectionId: manuscript.sectionId,
    issueId: manuscript.issueId,
  })
  if (!grant) throw Errors.notFound('Manuscript')
  return editorManuscript(tx, manuscript)
}

async function authorManuscript(tx: Tx, manuscript: Manuscript) {
  const mode = manuscript.policySnapshot?.policy.review.blinding
  const authors = await tx.select().from(manuscriptAuthors).where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
  const [section] = manuscript.sectionId
    ? await tx.select({ id: sections.id, name: sections.name }).from(sections).where(eq(sections.id, manuscript.sectionId)).limit(1)
    : []
  const fileRows = await tx
    .select({ id: files.id, kind: files.kind, originalName: files.originalName })
    .from(files)
    .where(eq(files.manuscriptId, manuscript.id))
  const authorFileKinds = new Set([
    'manuscript',
    'figure',
    'supplementary',
    'cover_letter',
    'response_to_reviewers',
    'galley_pdf',
    'galley_xml',
  ])
  const letters = await tx.select().from(decisions).where(eq(decisions.manuscriptId, manuscript.id)).orderBy(decisions.createdAt)
  const decidedRounds = new Set(letters.map((letter) => letter.round))
  const showNames = mode ? authorSeesReviewerNames(mode) : false
  const reviewRows = await tx
    .select({
      round: reviewAssignments.round,
      invitedAt: reviewAssignments.invitedAt,
      givenName: users.givenName,
      familyName: users.familyName,
      answers: reviews.answers,
      formId: reviews.formId,
    })
    .from(reviewAssignments)
    .innerJoin(reviews, eq(reviews.assignmentId, reviewAssignments.id))
    .innerJoin(users, eq(users.id, reviewAssignments.reviewerId))
    .where(eq(reviewAssignments.manuscriptId, manuscript.id))
    .orderBy(reviewAssignments.invitedAt)
  const questions = reviewRows.length
    ? await tx.select().from(reviewFormQuestions).where(inArray(reviewFormQuestions.formId, [...new Set(reviewRows.map((row) => row.formId))]))
    : []
  const authorQuestionIds = new Set(questions.filter((question) => question.visibility === 'author_and_editor').map((question) => question.id))
  return {
    id: manuscript.id,
    reference: manuscript.reference,
    title: manuscript.title,
    abstract: manuscript.abstract,
    keywords: manuscript.keywords,
    status: manuscript.status,
    sectionId: manuscript.sectionId,
    section: section?.name ?? '',
    files: fileRows
      .filter((file) => authorFileKinds.has(file.kind))
      .map((file) => ({ id: file.id, kind: file.kind, originalName: file.originalName })),
    doi: manuscript.doi,
    submittedAt: manuscript.submittedAt,
    authors: authors.map((author) => ({
      givenName: author.givenName,
      familyName: author.familyName,
      affiliation: author.affiliation,
      isCorresponding: author.isCorresponding,
    })),
    decisions: letters.map((letter) => ({
      round: letter.round,
      decision: letter.decision,
      letterBody: letter.letterBody,
      createdAt: letter.createdAt,
    })),
    reviews: reviewRows
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => decidedRounds.has(row.round))
      .map(({ row, index }) => ({
        displayName: showNames ? `${row.givenName} ${row.familyName}` : reviewerLabel(index),
        round: row.round,
        comments: Object.fromEntries(Object.entries(row.answers).filter(([key]) => authorQuestionIds.has(key))),
      })),
  }
}

async function editorManuscript(tx: Tx, manuscript: Manuscript) {
  const queue = await presentQueue(tx, [manuscript], true)
  const [fileRows, transitions, authors] = await Promise.all([
    tx.select().from(files).where(eq(files.manuscriptId, manuscript.id)),
    tx.select().from(statusTransitions).where(eq(statusTransitions.manuscriptId, manuscript.id)).orderBy(statusTransitions.createdAt),
    tx.select().from(manuscriptAuthors).where(eq(manuscriptAuthors.manuscriptId, manuscript.id)),
  ])
  return {
    ...queue[0],
    abstract: manuscript.abstract,
    authors: authors.map((author) => ({
      name: `${author.givenName} ${author.familyName}`,
      affiliation: author.affiliation,
      corresponding: author.isCorresponding,
    })),
    doi: manuscript.doi,
    policy: manuscript.policySnapshot,
    files: fileRows.map((file) => ({
      id: file.id,
      kind: file.kind,
      originalName: file.originalName,
      isMetadataScrubbed: file.isMetadataScrubbed,
      sizeBytes: file.sizeBytes,
    })),
    activity: transitions,
  }
}
