import { desc, eq, sql } from 'drizzle-orm'
import { db } from '@/db/client'
import { institutions } from '@/db/schema'
import { catalogueKey } from '@/lib/catalogue'
import { Errors } from '@/server/errors'

function present(row: typeof institutions.$inferSelect) {
  return { id: row.id, name: row.name, useCount: row.useCount }
}

/** Most-used names first. A short query still finds "University of Lagos" from "unilag". */
export async function listInstitutions(query: string) {
  const rows = await db.select().from(institutions).orderBy(desc(institutions.useCount), institutions.name)
  const q = query.trim().toLowerCase()
  const key = q ? catalogueKey(query) : ''
  const matched = q
    ? rows.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.nameKey.includes(key) ||
          key.includes(row.nameKey),
      )
    : rows
  return matched.slice(0, 12).map(present)
}

/**
 * One row per normalised name. `count` is true only when the person actually
 * saves the affiliation, so browsing the list does not inflate the ranking.
 */
export async function ensureInstitution(name: string, count: boolean) {
  const cleaned = name.trim().replace(/\s+/g, ' ')
  const key = catalogueKey(cleaned)
  if (key.length < 2) throw Errors.badRequest('Name the institution')
  const [existing] = await db.select().from(institutions).where(eq(institutions.nameKey, key)).limit(1)
  if (existing) {
    if (!count) return present(existing)
    const [updated] = await db
      .update(institutions)
      .set({ useCount: sql`${institutions.useCount} + 1` })
      .where(eq(institutions.id, existing.id))
      .returning()
    return present(updated)
  }
  try {
    const [created] = await db
      .insert(institutions)
      .values({ name: cleaned, nameKey: key, useCount: count ? 1 : 0 })
      .returning()
    return present(created)
  } catch {
    const [race] = await db.select().from(institutions).where(eq(institutions.nameKey, key)).limit(1)
    if (!race) throw Errors.conflict('Could not save that institution')
    return present(race)
  }
}
