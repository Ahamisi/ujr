import { sql } from 'drizzle-orm'
import { db, type Tx } from '@/db/client'
import { jobs } from '@/db/schema'
import { deliverEmail } from '@/server/auth/email'

export const JOB_TYPES = [
  'scrub_metadata',
  'send_email',
  'reviewer_reminder',
  'crossref_deposit',
  'similarity_check',
] as const

export type JobType = (typeof JOB_TYPES)[number]

export async function enqueue(
  tx: Tx,
  job: {
    journalId?: string | null
    type: JobType
    payload: Record<string, unknown>
    runAt?: Date
  },
) {
  const [row] = await tx
    .insert(jobs)
    .values({
      journalId: job.journalId ?? null,
      type: job.type,
      payload: job.payload,
      runAt: job.runAt ?? new Date(),
    })
    .returning({ id: jobs.id })
  return row.id
}

interface ClaimedJob {
  id: string
  type: string
  payload: Record<string, unknown>
  attempts: number
  journalId: string | null
}

/**
 * Claim a small batch with FOR UPDATE SKIP LOCKED so two cron ticks cannot
 * take the same row. Handlers run after the claim commits. A handler that
 * throws is retried up to five times; send_email payloads are wiped on
 * success because they can contain an invitation URL.
 */
export async function processDueJobs(limit = 10) {
  const claimed = await db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      UPDATE jobs
      SET status = 'running', attempts = attempts + 1
      WHERE id IN (
        SELECT id FROM jobs
        WHERE status = 'pending' AND run_at <= now()
        ORDER BY run_at
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      )
      RETURNING id, type, payload, attempts, journal_id AS "journalId"
    `)
    return result as unknown as ClaimedJob[]
  })

  const rows = Array.isArray(claimed) ? claimed : []
  let done = 0
  for (const job of rows) {
    try {
      await runJob(job)
      await db
        .update(jobs)
        .set({
          status: 'succeeded',
          lastError: null,
          payload: job.type === 'send_email' ? {} : job.payload,
        })
        .where(sql`${jobs.id} = ${job.id}`)
      done += 1
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Job failed'
      const exhausted = job.attempts >= 5
      await db
        .update(jobs)
        .set({
          status: exhausted ? 'failed' : 'pending',
          lastError: message,
          runAt: new Date(Date.now() + job.attempts * 5 * 60 * 1000),
        })
        .where(sql`${jobs.id} = ${job.id}`)
    }
  }
  return { claimed: rows.length, succeeded: done }
}

async function runJob(job: ClaimedJob) {
  switch (job.type) {
    case 'send_email': {
      const to = String(job.payload.to ?? '')
      const subject = String(job.payload.subject ?? '')
      const text = String(job.payload.text ?? '')
      if (!to || !subject) throw new Error('send_email job is missing to or subject')
      await deliverEmail({ to, subject, text })
      return
    }
    case 'scrub_metadata':
      throw new Error(
        'Metadata scrubbing is not implemented. The file stays unscrubbed, so a reviewer cannot be served it.',
      )
    case 'similarity_check':
      throw new Error('No similarity provider is connected.')
    case 'crossref_deposit': {
      const { runCrossrefDeposit } = await import('@/server/publishing/service')
      await runCrossrefDeposit(String(job.payload.manuscriptId), String(job.journalId ?? job.payload.journalId))
      return
    }
    case 'reviewer_reminder': {
      const { sendDueReminders } = await import('@/server/reviews/service')
      await sendDueReminders()
      return
    }
    default:
      throw new Error(`Unknown job type ${job.type}`)
  }
}

/** Make sure a reminder sweep is queued. The tick calls this before processing. */
export async function ensureReminderSweep() {
  const pending = await db.execute(sql`
    SELECT id FROM jobs WHERE type = 'reviewer_reminder' AND status = 'pending' LIMIT 1
  `)
  const rows = pending as unknown as { id: string }[]
  if (Array.isArray(rows) && rows.length > 0) return
  await db.insert(jobs).values({ type: 'reviewer_reminder', payload: {}, journalId: null })
}
