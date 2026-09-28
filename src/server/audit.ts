import { auditLog } from '@/db/schema'
import type { Tx } from '@/db/client'

/** Append-only. Call this in the same transaction as the change it describes. */
export async function audit(
  tx: Tx,
  event: {
    journalId?: string | null
    actorId?: string | null
    impersonatedById?: string | null
    action: string
    entityType: string
    entityId?: string | null
    metadata?: Record<string, unknown>
    ipAddress?: string | null
  },
) {
  await tx.insert(auditLog).values({
    journalId: event.journalId ?? null,
    actorId: event.actorId ?? null,
    impersonatedById: event.impersonatedById ?? null,
    action: event.action,
    entityType: event.entityType,
    entityId: event.entityId ?? null,
    metadata: event.metadata ?? {},
    ipAddress: event.ipAddress ?? null,
  })
}
