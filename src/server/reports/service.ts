import { eq, sql } from 'drizzle-orm'
import type { Tx } from '@/db/client'
import { decisions, manuscripts, reviewAssignments, statusTransitions } from '@/db/schema'

function median(values: number[]) {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid]
}

/**
 * Editorial reporting. Computed in the process from the append-only history
 * so a status change cannot be edited out of the median. Fine at the volume
 * of one journal; a percentile query belongs here when a journal outgrows it.
 */
export async function journalReport(tx: Tx, journalId: string) {
  const [manuscriptRows, decisionRows, assignmentRows, transitionRows] = await Promise.all([
    tx
      .select({ status: manuscripts.status, submittedAt: manuscripts.submittedAt, publishedAt: manuscripts.publishedAt })
      .from(manuscripts)
      .where(eq(manuscripts.journalId, journalId)),
    tx.select({ decision: decisions.decision, createdAt: decisions.createdAt, manuscriptId: decisions.manuscriptId }).from(decisions).where(eq(decisions.journalId, journalId)),
    tx
      .select({ status: reviewAssignments.status })
      .from(reviewAssignments)
      .where(eq(reviewAssignments.journalId, journalId)),
    tx
      .select({
        manuscriptId: statusTransitions.manuscriptId,
        toStatus: statusTransitions.toStatus,
        createdAt: statusTransitions.createdAt,
      })
      .from(statusTransitions)
      .where(eq(statusTransitions.journalId, journalId)),
  ])

  const byStatus: Record<string, number> = {}
  for (const row of manuscriptRows) {
    if (row.status === 'draft') continue
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1
  }

  const mix: Record<string, number> = {}
  for (const row of decisionRows) mix[row.decision] = (mix[row.decision] ?? 0) + 1

  const invited = assignmentRows.length
  const accepted = assignmentRows.filter((row) => row.status === 'accepted' || row.status === 'submitted').length
  const firstDecision = new Map<string, Date>()
  const submittedAt = new Map<string, Date>()
  for (const row of transitionRows) {
    if (row.toStatus === 'submitted' && !submittedAt.has(row.manuscriptId)) submittedAt.set(row.manuscriptId, row.createdAt)
    if (['accepted', 'rejected', 'revision_requested', 'desk_rejected'].includes(row.toStatus) && !firstDecision.has(row.manuscriptId)) {
      firstDecision.set(row.manuscriptId, row.createdAt)
    }
  }
  const toDecision: number[] = []
  for (const [id, decided] of firstDecision) {
    const start = submittedAt.get(id)
    if (start) toDecision.push(Math.round((decided.getTime() - start.getTime()) / 86_400_000))
  }

  const monthly = await tx.execute(sql`
    SELECT to_char(date_trunc('month', submitted_at), 'Mon') AS month,
           count(*)::int AS submissions
    FROM manuscripts
    WHERE journal_id = ${journalId} AND submitted_at IS NOT NULL
    GROUP BY date_trunc('month', submitted_at)
    ORDER BY date_trunc('month', submitted_at)
  `)

  return {
    byStatus,
    decisionMix: mix,
    reviewerAcceptanceRate: invited === 0 ? null : accepted / invited,
    medianDaysToFirstDecision: median(toDecision),
    monthly: monthly as unknown as { month: string; submissions: number }[],
  }
}
