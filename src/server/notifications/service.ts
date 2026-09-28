import { and, desc, eq } from 'drizzle-orm'
import type { Tx } from '@/db/client'
import { notifications } from '@/db/schema'
import { enqueue } from '@/server/jobs/service'

export type NotificationKind =
  | 'submission_received'
  | 'desk_passed'
  | 'under_review'
  | 'review_received'
  | 'decision'
  | 'revision_due'
  | 'published'
  | 'invitation'
  | 'reminder'
  | 'payment'

/**
 * Insert the in-app notice and queue the email in the same transaction.
 * `body` for an author must already be free of reviewer names. This function
 * cannot know who the audience is, so the caller is the blinding boundary.
 */
export async function notify(
  tx: Tx,
  input: {
    journalId: string
    userId: string
    email?: string | null
    kind: NotificationKind
    title: string
    body: string
    href: string
  },
) {
  await tx.insert(notifications).values({
    journalId: input.journalId,
    userId: input.userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    href: input.href,
  })
  if (input.email) {
    await enqueue(tx, {
      journalId: input.journalId,
      type: 'send_email',
      payload: { to: input.email, subject: input.title, text: `${input.body}\n${input.href}\n` },
    })
  }
}

export async function listNotifications(tx: Tx, journalId: string, userId: string) {
  return tx
    .select()
    .from(notifications)
    .where(and(eq(notifications.journalId, journalId), eq(notifications.userId, userId)))
    .orderBy(desc(notifications.createdAt))
}

export async function markNotificationRead(tx: Tx, journalId: string, userId: string, id: string) {
  const [row] = await tx
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.id, id), eq(notifications.journalId, journalId), eq(notifications.userId, userId)))
    .returning()
  return row ?? null
}
