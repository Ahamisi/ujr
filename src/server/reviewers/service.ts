import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Tx } from '@/db/client'
import { memberships, reviewAssignments, users } from '@/db/schema'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'

/**
 * Reviewers known to this journal: people with a reviewer membership here,
 * plus anyone who has already been assigned a manuscript here. The shared
 * pool is opt-in and is listed separately so an editor does not invite the
 * whole platform by accident.
 */
export async function listReviewers(tx: Tx, journalId: string) {
  const members = await tx
    .select({
      id: users.id,
      givenName: users.givenName,
      familyName: users.familyName,
      affiliation: users.affiliation,
      country: users.country,
      expertise: users.expertise,
      sharedReviewerPool: users.sharedReviewerPool,
    })
    .from(users)
    .innerJoin(memberships, eq(memberships.userId, users.id))
    .where(and(eq(memberships.journalId, journalId), eq(memberships.role, 'reviewer')))

  const stats = await tx
    .select({
      reviewerId: reviewAssignments.reviewerId,
      status: reviewAssignments.status,
      count: sql<number>`count(*)::int`,
    })
    .from(reviewAssignments)
    .where(eq(reviewAssignments.journalId, journalId))
    .groupBy(reviewAssignments.reviewerId, reviewAssignments.status)

  const byReviewer = new Map<string, { invited: number; completed: number; declined: number }>()
  for (const row of stats) {
    const current = byReviewer.get(row.reviewerId) ?? { invited: 0, completed: 0, declined: 0 }
    current.invited += row.count
    if (row.status === 'submitted') current.completed += row.count
    if (row.status === 'declined') current.declined += row.count
    byReviewer.set(row.reviewerId, current)
  }

  const knownIds = new Set(members.map((member) => member.id))
  const missing = [...byReviewer.keys()].filter((id) => !knownIds.has(id))
  const extras = missing.length
    ? await tx
        .select({
          id: users.id,
          givenName: users.givenName,
          familyName: users.familyName,
          affiliation: users.affiliation,
          country: users.country,
          expertise: users.expertise,
          sharedReviewerPool: users.sharedReviewerPool,
        })
        .from(users)
        .where(inArray(users.id, missing))
    : []

  return [...members, ...extras].map((person) => ({
    ...person,
    name: `${person.givenName} ${person.familyName}`,
    ...(byReviewer.get(person.id) ?? { invited: 0, completed: 0, declined: 0 }),
  }))
}

/** A reviewer row, with a membership on this journal. No password is set; invitations use a token. */
export async function addReviewer(
  tx: Tx,
  ctx: JournalCtx,
  input: { name: string; email: string; affiliation: string; expertise: string[] },
) {
  const email = input.email.trim().toLowerCase()
  const parts = input.name.trim().split(/\s+/).filter(Boolean)
  const givenName = parts[0]
  const familyName = parts.slice(1).join(' ') || parts[0]
  if (!givenName || !email.includes('@')) throw Errors.badRequest('Name and email are required')
  const [existing] = await tx.select().from(users).where(eq(users.email, email)).limit(1)
  const person =
    existing ??
    (
      await tx
        .insert(users)
        .values({
          name: input.name.trim(),
          email,
          givenName,
          familyName,
          affiliation: input.affiliation.trim(),
          expertise: input.expertise,
        })
        .returning()
    )[0]
  if (existing) {
    await tx
      .update(users)
      .set({
        affiliation: input.affiliation.trim() || existing.affiliation,
        expertise: input.expertise.length > 0 ? input.expertise : existing.expertise,
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id))
  }
  const [membership] = await tx
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.userId, person.id), eq(memberships.journalId, ctx.journal.id), eq(memberships.role, 'reviewer')))
    .limit(1)
  if (!membership) {
    await tx.insert(memberships).values({
      journalId: ctx.journal.id,
      userId: person.id,
      role: 'reviewer',
      scopeType: 'journal',
    })
  }
  return {
    id: person.id,
    name: `${givenName} ${familyName}`,
    affiliation: input.affiliation.trim(),
    country: person.country,
    expertise: input.expertise,
    sharedReviewerPool: person.sharedReviewerPool,
    invited: 0,
    completed: 0,
    declined: 0,
  }
}
