import { and, asc, eq } from 'drizzle-orm'
import { z } from 'zod'
import type { Tx } from '@/db/client'
import { annotations, files, journals, reviewAssignments, users } from '@/db/schema'
import { hashToken } from '@/server/auth/tokens'
import { assertNotAuthor } from '@/server/authz'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'
import { registerUpload } from '@/server/files/service'
import { loadManuscript } from '@/server/manuscripts/service'
import { withReviewToken } from '@/db/tenant'

export const noteInput = z.object({
  fileId: z.string().uuid(),
  quote: z.string().max(800).optional(),
  body: z.string().min(1).max(4000),
  pageNumber: z.number().int().min(1).max(2000).optional(),
})

export const noteEditInput = z.object({
  body: z.string().min(1).max(4000),
})

function quoteOf(anchor: Record<string, unknown>) {
  return typeof anchor.quote === 'string' ? anchor.quote : ''
}

function present(row: typeof annotations.$inferSelect, authorName: string) {
  return {
    id: row.id,
    fileId: row.fileId,
    quote: quoteOf(row.anchor),
    body: row.body,
    pageNumber: row.pageNumber,
    authorName,
    createdAt: row.createdAt,
  }
}

async function assignmentForToken(tx: Tx, token: string) {
  const tokenHash = hashToken(token)
  const [assignment] = await tx
    .select()
    .from(reviewAssignments)
    .where(eq(reviewAssignments.accessTokenHash, tokenHash))
    .limit(1)
  if (!assignment) throw Errors.notFound('Invitation')
  return assignment
}

export async function listReviewerNotes(token: string) {
  return withReviewToken(hashToken(token), async (tx) => {
    const assignment = await assignmentForToken(tx, token)
    const rows = await tx
      .select()
      .from(annotations)
      .where(and(eq(annotations.manuscriptId, assignment.manuscriptId), eq(annotations.authorId, assignment.reviewerId)))
      .orderBy(asc(annotations.createdAt))
    return rows.map((row) => present(row, 'You'))
  })
}

export async function addReviewerNote(token: string, input: z.infer<typeof noteInput>) {
  return withReviewToken(hashToken(token), async (tx) => {
    const assignment = await assignmentForToken(tx, token)
    if (assignment.status !== 'accepted') throw Errors.conflict('Accept the invitation before commenting on the manuscript')
    const [file] = await tx
      .select({ id: files.id })
      .from(files)
      .where(and(eq(files.id, input.fileId), eq(files.manuscriptId, assignment.manuscriptId)))
      .limit(1)
    if (!file) throw Errors.notFound('File')
    const [row] = await tx
      .insert(annotations)
      .values({
        journalId: assignment.journalId,
        manuscriptId: assignment.manuscriptId,
        fileId: file.id,
        authorId: assignment.reviewerId,
        round: assignment.round,
        pageNumber: input.pageNumber ?? 1,
        anchor: { quote: input.quote?.trim() ?? '' },
        body: input.body.trim(),
        visibility: 'editor_only',
      })
      .returning()
    return present(row, 'You')
  })
}

export async function editReviewerNote(token: string, id: string, body: string) {
  return withReviewToken(hashToken(token), async (tx) => {
    const assignment = await assignmentForToken(tx, token)
    const [row] = await tx
      .update(annotations)
      .set({ body: body.trim() })
      .where(and(eq(annotations.id, id), eq(annotations.authorId, assignment.reviewerId), eq(annotations.manuscriptId, assignment.manuscriptId)))
      .returning()
    if (!row) throw Errors.notFound('Comment')
    return present(row, 'You')
  })
}

export async function deleteReviewerNote(token: string, id: string) {
  return withReviewToken(hashToken(token), async (tx) => {
    const assignment = await assignmentForToken(tx, token)
    const [row] = await tx
      .delete(annotations)
      .where(and(eq(annotations.id, id), eq(annotations.authorId, assignment.reviewerId), eq(annotations.manuscriptId, assignment.manuscriptId)))
      .returning({ id: annotations.id })
    if (!row) throw Errors.notFound('Comment')
    return { id: row.id }
  })
}

/** A marked-up file from the reviewer, kept beside the manuscript. */
export async function uploadReviewerFile(token: string, file: File) {
  const tokenHash = hashToken(token)
  return withReviewToken(tokenHash, async (tx) => {
    const assignment = await assignmentForToken(tx, token)
    if (assignment.status !== 'accepted') throw Errors.conflict('Accept the invitation before uploading a file')
    const manuscript = await loadManuscript(tx, assignment.journalId, assignment.manuscriptId)
    if (!manuscript) throw Errors.notFound('Manuscript')
    const [journal] = await tx.select().from(journals).where(eq(journals.id, assignment.journalId)).limit(1)
    if (!journal) throw Errors.notFound('Journal')
    const bytes = Buffer.from(await file.arrayBuffer())
    return registerUpload(tx, {
      journal,
      manuscript,
      section: null,
      actorId: assignment.reviewerId,
      kind: 'reviewer_attachment',
      originalName: file.name,
      mimeType: file.type,
      bytes,
    })
  })
}

export async function addEditorNote(tx: Tx, ctx: JournalCtx, manuscriptId: string, input: z.infer<typeof noteInput>) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  const [file] = await tx
    .select({ id: files.id })
    .from(files)
    .where(and(eq(files.id, input.fileId), eq(files.manuscriptId, manuscript.id)))
    .limit(1)
  if (!file) throw Errors.notFound('File')
  const [row] = await tx
    .insert(annotations)
    .values({
      journalId: ctx.journal.id,
      manuscriptId: manuscript.id,
      fileId: file.id,
      authorId: ctx.actor.userId,
      round: manuscript.currentRound,
      pageNumber: input.pageNumber ?? 1,
      anchor: { quote: input.quote?.trim() ?? '' },
      body: input.body.trim(),
      visibility: 'editor_only',
    })
    .returning()
  return present(row, ctx.actor.name)
}

export async function listEditorNotes(tx: Tx, ctx: JournalCtx, manuscriptId: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  const rows = await tx
    .select({
      note: annotations,
      givenName: users.givenName,
      familyName: users.familyName,
    })
    .from(annotations)
    .innerJoin(users, eq(users.id, annotations.authorId))
    .where(eq(annotations.manuscriptId, manuscript.id))
    .orderBy(asc(annotations.createdAt))
  return rows.map((row) => present(row.note, `${row.givenName} ${row.familyName}`))
}

export async function editEditorNote(tx: Tx, ctx: JournalCtx, id: string, body: string) {
  const [existing] = await tx
    .select()
    .from(annotations)
    .where(and(eq(annotations.id, id), eq(annotations.journalId, ctx.journal.id)))
    .limit(1)
  if (!existing) throw Errors.notFound('Comment')
  const manuscript = await loadManuscript(tx, ctx.journal.id, existing.manuscriptId)
  if (!manuscript) throw Errors.notFound('Comment')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  const [row] = await tx.update(annotations).set({ body: body.trim() }).where(eq(annotations.id, id)).returning()
  const [person] = await tx.select({ givenName: users.givenName, familyName: users.familyName }).from(users).where(eq(users.id, row.authorId)).limit(1)
  return present(row, person ? `${person.givenName} ${person.familyName}` : 'Editor')
}

export async function deleteEditorNote(tx: Tx, ctx: JournalCtx, id: string) {
  const [existing] = await tx
    .select()
    .from(annotations)
    .where(and(eq(annotations.id, id), eq(annotations.journalId, ctx.journal.id)))
    .limit(1)
  if (!existing) throw Errors.notFound('Comment')
  const manuscript = await loadManuscript(tx, ctx.journal.id, existing.manuscriptId)
  if (!manuscript) throw Errors.notFound('Comment')
  await assertNotAuthor(tx, manuscript, ctx.actor.userId)
  await tx.delete(annotations).where(eq(annotations.id, id))
  return { id }
}
