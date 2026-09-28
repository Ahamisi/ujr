import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Tx } from '@/db/client'
import { depositXml, mintDoi } from '@/lib/doi'
import {
  doiCounters,
  doiDeposits,
  issues,
  journals,
  manuscriptAuthors,
  manuscripts,
  productionTasks,
  users,
} from '@/db/schema'
import { audit } from '@/server/audit'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'
import { enqueue } from '@/server/jobs/service'
import { loadManuscript } from '@/server/manuscripts/service'

export const createIssueInput = z.object({
  volume: z.number().int().positive(),
  number: z.number().int().positive(),
  title: z.string().optional(),
  targetDate: z.string().date().optional(),
})

export const productionInput = z.object({
  manuscriptId: z.string().uuid(),
  stage: z.enum(['copyediting', 'typesetting', 'proofing', 'ready']),
  assigneeId: z.string().uuid().optional(),
})

export async function listIssues(tx: Tx, journalId: string) {
  const rows = await tx.select().from(issues).where(eq(issues.journalId, journalId)).orderBy(desc(issues.volume), desc(issues.number))
  const counts = await tx
    .select({ issueId: manuscripts.issueId, count: sql<number>`count(*)::int` })
    .from(manuscripts)
    .where(eq(manuscripts.journalId, journalId))
    .groupBy(manuscripts.issueId)
  const byIssue = new Map(counts.map((row) => [row.issueId, row.count]))
  return rows.map((issue) => ({ ...issue, articleCount: byIssue.get(issue.id) ?? 0 }))
}

export async function createIssue(tx: Tx, ctx: JournalCtx, input: z.infer<typeof createIssueInput>) {
  const [issue] = await tx
    .insert(issues)
    .values({
      journalId: ctx.journal.id,
      volume: input.volume,
      number: input.number,
      title: input.title,
      targetDate: input.targetDate,
      status: 'planning',
    })
    .returning()
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'issue.created',
    entityType: 'issue',
    entityId: issue.id,
    ipAddress: ctx.meta.ipAddress,
  })
  return issue
}

export async function listProduction(tx: Tx, journalId: string) {
  return tx
    .select({
      id: productionTasks.id,
      stage: productionTasks.stage,
      manuscriptId: productionTasks.manuscriptId,
      reference: manuscripts.reference,
      title: manuscripts.title,
      doi: manuscripts.doi,
      updatedAt: productionTasks.updatedAt,
      assignee: users.name,
    })
    .from(productionTasks)
    .innerJoin(manuscripts, eq(manuscripts.id, productionTasks.manuscriptId))
    .leftJoin(users, eq(users.id, productionTasks.assigneeId))
    .where(eq(productionTasks.journalId, journalId))
}

export async function advanceProduction(tx: Tx, ctx: JournalCtx, input: z.infer<typeof productionInput>) {
  const [task] = await tx
    .update(productionTasks)
    .set({ stage: input.stage, assigneeId: input.assigneeId, updatedAt: new Date() })
    .where(and(eq(productionTasks.manuscriptId, input.manuscriptId), eq(productionTasks.journalId, ctx.journal.id)))
    .returning()
  if (!task) throw Errors.notFound('Production task')
  return task
}

export async function listDoiRegistry(tx: Tx, journalId: string) {
  const rows = await tx
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.journalId, journalId), sql`${manuscripts.status} in ('accepted', 'in_production', 'published', 'corrected', 'retracted')`))
  const deposits = await tx.select().from(doiDeposits).where(eq(doiDeposits.journalId, journalId)).orderBy(desc(doiDeposits.createdAt))
  return rows.map((manuscript) => ({
    id: manuscript.id,
    reference: manuscript.reference,
    title: manuscript.title,
    doi: manuscript.doi,
    status: manuscript.status,
    deposit: deposits.find((deposit) => deposit.manuscriptId === manuscript.id) ?? null,
  }))
}

export async function mintManuscriptDoi(tx: Tx, ctx: JournalCtx, manuscriptId: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript) throw Errors.notFound('Manuscript')
  if (manuscript.doi) return { doi: manuscript.doi, alreadyMinted: true }
  const policy = manuscript.policySnapshot?.policy
  const pattern = policy?.publishing.doiPattern ?? '{prefix}/{journalSlug}.{year}.{articleNumber}'
  const prefix = ctx.journal.doiPrefix
  if (!prefix) throw Errors.badRequest('This journal has no DOI prefix')
  const [counter] = await tx
    .insert(doiCounters)
    .values({ journalId: ctx.journal.id, nextNumber: 1 })
    .onConflictDoUpdate({
      target: doiCounters.journalId,
      set: { nextNumber: sql`${doiCounters.nextNumber} + 1` },
    })
    .returning()
  const doi = mintDoi(pattern, {
    prefix,
    journalSlug: ctx.journal.slug,
    year: new Date().getFullYear(),
    articleNumber: counter.nextNumber,
  })
  await tx.update(manuscripts).set({ doi, updatedAt: new Date() }).where(eq(manuscripts.id, manuscript.id))
  await tx.insert(doiDeposits).values({ journalId: ctx.journal.id, manuscriptId: manuscript.id, doi, state: 'minted' })
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'doi.minted',
    entityType: 'manuscript',
    entityId: manuscript.id,
    metadata: { doi },
    ipAddress: ctx.meta.ipAddress,
  })
  return { doi, alreadyMinted: false }
}

export async function queueCrossrefDeposit(tx: Tx, ctx: JournalCtx, manuscriptId: string) {
  const manuscript = await loadManuscript(tx, ctx.journal.id, manuscriptId)
  if (!manuscript?.doi) throw Errors.badRequest('Mint a DOI first')
  await tx.insert(doiDeposits).values({
    journalId: ctx.journal.id,
    manuscriptId: manuscript.id,
    doi: manuscript.doi,
    state: 'queued',
  })
  await enqueue(tx, {
    journalId: ctx.journal.id,
    type: 'crossref_deposit',
    payload: { manuscriptId: manuscript.id, journalId: ctx.journal.id },
  })
  return { queued: true }
}

/** Called by the job runner. Does not mark a DOI registered until Crossref accepts it. */
export async function runCrossrefDeposit(manuscriptId: string, journalId: string) {
  const { withJournal } = await import('@/db/tenant')
  await withJournal(journalId, async (tx) => {
    const manuscript = await loadManuscript(tx, journalId, manuscriptId)
    const [journal] = await tx.select().from(journals).where(eq(journals.id, journalId)).limit(1)
    if (!manuscript?.doi || !journal) throw new Error('Manuscript or DOI is missing')
    const authors = await tx.select().from(manuscriptAuthors).where(eq(manuscriptAuthors.manuscriptId, manuscript.id))
    const [issue] = manuscript.issueId
      ? await tx.select().from(issues).where(eq(issues.id, manuscript.issueId)).limit(1)
      : [undefined]
    const published = manuscript.publishedAt ?? new Date()
    const iso = published.toISOString().slice(0, 10)
    const xml = depositXml(
      {
        id: manuscript.id,
        doi: manuscript.doi,
        title: manuscript.title,
        authors: authors.map((author) => ({
          name: `${author.givenName} ${author.familyName}`,
          affiliation: author.affiliation ?? journal.name,
          orcid: author.orcid ?? undefined,
        })),
        abstract: manuscript.abstract ?? '',
        keywords: manuscript.keywords,
        section: '',
        volume: issue?.volume ?? 0,
        issue: issue?.number ?? 0,
        pages: manuscript.firstPage ? `${manuscript.firstPage}–${manuscript.lastPage ?? manuscript.firstPage}` : '1–1',
        publishedAt: iso,
        publishedIso: iso,
        downloads: 0,
        citations: 0,
      },
      process.env.PUBLIC_SITE_URL ?? 'http://localhost:3000',
      {
        name: journal.name,
        abbreviation: journal.abbreviation ?? journal.slug,
        publisher: journal.name,
        issnElectronic: journal.issnElectronic ?? '',
        issnPrint: journal.issnPrint ?? '',
      },
    )
    if (!process.env.CROSSREF_USERNAME || !process.env.CROSSREF_PASSWORD) {
      await tx.insert(doiDeposits).values({
        journalId,
        manuscriptId,
        doi: manuscript.doi,
        state: 'failed',
        error: 'Crossref credentials are not configured',
      })
      throw new Error('Crossref credentials are not configured')
    }
    await tx.insert(doiDeposits).values({
      journalId,
      manuscriptId,
      doi: manuscript.doi,
      state: 'submitted',
      error: 'Deposit XML was built. Posting to Crossref is not wired yet.',
    })
    // The XML is ready. Posting it is a separate credentialed call; we keep
    // the payload out of logs. The job fails so it is not marked registered.
    void xml
    throw new Error('Crossref HTTP deposit is not wired yet. The DOI stays minted.')
  })
}

export async function listPublished(tx: Tx, journalId: string) {
  const rows = await tx
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.journalId, journalId), eq(manuscripts.status, 'published')))
    .orderBy(desc(manuscripts.publishedAt))
  return publicArticles(tx, rows)
}

export async function getPublished(tx: Tx, journalId: string, id: string) {
  const [row] = await tx
    .select()
    .from(manuscripts)
    .where(and(eq(manuscripts.id, id), eq(manuscripts.journalId, journalId), eq(manuscripts.status, 'published')))
    .limit(1)
  if (!row) throw Errors.notFound('Article')
  const [article] = await publicArticles(tx, [row])
  return article
}

export async function searchPublished(tx: Tx, journalId: string, q: string) {
  const safe = q.replace(/[%_\\]/g, '').trim()
  if (!safe) return []
  const rows = await tx
    .select()
    .from(manuscripts)
    .where(
      and(
        eq(manuscripts.journalId, journalId),
        eq(manuscripts.status, 'published'),
        or(eq(manuscripts.doi, q.trim()), ilike(manuscripts.title, `%${safe}%`), ilike(manuscripts.abstract, `%${safe}%`)),
      ),
    )
    .limit(50)
  return publicArticles(tx, rows)
}

async function publicArticles(tx: Tx, rows: (typeof manuscripts.$inferSelect)[]) {
  if (rows.length === 0) return []
  const authors = await tx
    .select()
    .from(manuscriptAuthors)
    .where(inArray(manuscriptAuthors.manuscriptId, rows.map((row) => row.id)))
  return rows.map((row) => ({
    id: row.id,
    doi: row.doi,
    title: row.title,
    abstract: row.abstract,
    keywords: row.keywords,
    publishedAt: row.publishedAt,
    authors: authors
      .filter((author) => author.manuscriptId === row.id)
      .map((author) => ({
        name: `${author.givenName} ${author.familyName}`,
        affiliation: author.affiliation,
        orcid: author.orcid,
      })),
  }))
}
