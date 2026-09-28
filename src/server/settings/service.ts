import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Tx } from '@/db/client'
import { diffPolicy, journalPolicySchema, resolvePolicy, type JournalPolicy } from '@/db/policy'
import { journals, manuscripts, settingsHistory } from '@/db/schema'
import { audit } from '@/server/audit'
import type { JournalCtx } from '@/server/context'

const IN_FLIGHT = ['under_review', 'reviewer_search', 'decision_pending', 'revision_requested', 'resubmitted'] as const

/**
 * The settings screen edits the fully resolved policy. We store that object
 * as the journal patch. Merging it over the platform defaults is idempotent.
 * Manuscripts already submitted keep manuscripts.policy_snapshot; this write
 * does not touch them. `inFlight` is the number the editor must be shown
 * before they confirm.
 */
export async function getSettings(tx: Tx, journal: typeof journals.$inferSelect) {
  const policy = resolvePolicy(journal.policy)
  const inFlight = await countInFlight(tx, journal.id)
  return { policy, policyVersion: journal.policyVersion, inFlight }
}

export async function saveSettings(tx: Tx, ctx: JournalCtx, next: JournalPolicy) {
  const after = journalPolicySchema.parse(next)
  const before = resolvePolicy(ctx.journal.policy)
  const changes = diffPolicy(before, after)
  const inFlight = await countInFlight(tx, ctx.journal.id)
  if (changes.length === 0) return { policy: before, policyVersion: ctx.journal.policyVersion, changes, inFlight }

  const version = ctx.journal.policyVersion + 1
  await tx
    .update(journals)
    .set({ policy: after, policyVersion: version, updatedAt: new Date() })
    .where(eq(journals.id, ctx.journal.id))
  await tx.insert(settingsHistory).values({
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    policyVersion: version,
    changes,
    before: ctx.journal.policy,
    after,
  })
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'settings.saved',
    entityType: 'journal',
    entityId: ctx.journal.id,
    metadata: { changes, inFlight },
    ipAddress: ctx.meta.ipAddress,
  })
  return { policy: after, policyVersion: version, changes, inFlight }
}

async function countInFlight(tx: Tx, journalId: string) {
  const [row] = await tx
    .select({ count: sql<number>`count(*)::int` })
    .from(manuscripts)
    .where(and(eq(manuscripts.journalId, journalId), inArray(manuscripts.status, [...IN_FLIGHT])))
  return row?.count ?? 0
}
