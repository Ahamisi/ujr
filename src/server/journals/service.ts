import { and, eq } from 'drizzle-orm'
import type { Tx } from '@/db/client'
import { journals, memberships, sections } from '@/db/schema'
import { catalogueKey } from '@/lib/catalogue'
import { withUser } from '@/db/tenant'
import { Errors } from '@/server/errors'
import { findJournalBySlug } from '@/server/context'

/** Journals this person belongs to. Sets app.user_id so the membership policy can see their rows. */
export async function myJournals(userId: string) {
  return withUser(userId, async (tx) => {
    return tx
      .select({
        journalId: memberships.journalId,
        role: memberships.role,
        scopeType: memberships.scopeType,
        scopeId: memberships.scopeId,
        slug: journals.slug,
        name: journals.name,
      })
      .from(memberships)
      .leftJoin(journals, eq(journals.id, memberships.journalId))
      .where(eq(memberships.userId, userId))
  })
}

/** A new account starts as an author of the journal they signed up for. */
export async function joinAsAuthor(userId: string, slug: string) {
  const journal = await findJournalBySlug(slug)
  if (!journal || !journal.isActive) throw Errors.notFound('Journal')
  return withUser(userId, async (tx) => {
    const [existing] = await tx
      .select()
      .from(memberships)
      .where(and(eq(memberships.userId, userId), eq(memberships.journalId, journal.id), eq(memberships.role, 'author')))
      .limit(1)
    if (existing) return { journal, membership: existing, created: false }
    const [membership] = await tx
      .insert(memberships)
      .values({ journalId: journal.id, userId, role: 'author', scopeType: 'journal' })
      .returning()
    return { journal, membership, created: true }
  })
}

export async function listSections(tx: Tx, journalId: string) {
  return tx
    .select({
      id: sections.id,
      name: sections.name,
      abbreviation: sections.abbreviation,
      acceptsSubmissions: sections.acceptsSubmissions,
    })
    .from(sections)
    .where(eq(sections.journalId, journalId))
}

/** Reuse a section whose name normalises the same, otherwise open a new one on the journal's review form. */
export async function ensureSection(tx: Tx, journalId: string, name: string) {
  const cleaned = name.trim().replace(/\s+/g, ' ')
  if (cleaned.length < 2) throw Errors.badRequest('Name the section')
  const rows = await tx.select().from(sections).where(eq(sections.journalId, journalId))
  const key = catalogueKey(cleaned)
  const found = rows.find((row) => catalogueKey(row.name) === key)
  if (found) return found
  const template = rows.find((row) => row.activeReviewFormId)
  if (!template?.activeReviewFormId) throw Errors.badRequest('This journal has no review form for a new section')
  const abbreviation =
    cleaned
      .split(/\s+/)
      .map((word) => word[0] ?? '')
      .join('')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 12) || 'SEC'
  const [created] = await tx
    .insert(sections)
    .values({
      journalId,
      name: cleaned,
      abbreviation,
      activeReviewFormId: template.activeReviewFormId,
      acceptsSubmissions: true,
      sortOrder: rows.length,
    })
    .returning()
  return created
}
