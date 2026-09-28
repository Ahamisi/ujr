import { sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, databaseConfigured, type Tx } from './client'
import { Errors } from '@/server/errors'

/**
 * Run `fn` inside a transaction that has `app.journal_id` set for the
 * duration of that transaction only. Row-level security reads the setting.
 * The WHERE clauses in the services are still required: RLS is the backstop
 * for the day a query forgets the journal, not a replacement for it.
 */
export async function withJournal<T>(journalId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  assertDatabase()
  if (!z.uuid().safeParse(journalId).success) throw Errors.badRequest('Invalid journal id')
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.journal_id', ${journalId}, true)`)
    return fn(tx)
  })
}

/**
 * Reviewer links are opened before we know the journal. The hash is set
 * first so the token policy (see the foot of schema.ts) can see the row,
 * then the journal is set and `fn` runs under normal tenant rules.
 * The raw token is never stored. Callers pass it once; we keep the sha256.
 */
export async function withReviewToken<T>(
  tokenHash: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  assertDatabase()
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.review_token_hash', ${tokenHash}, true)`)
    return fn(tx)
  })
}

/** Paystack tells us a reference, not a journal. Signature checks happen before this. */
export async function withPaystackReference<T>(reference: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  assertDatabase()
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.paystack_reference', ${reference}, true)`)
    return fn(tx)
  })
}

export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  assertDatabase()
  if (!z.uuid().safeParse(userId).success) throw Errors.badRequest('Invalid user id')
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.user_id', ${userId}, true)`)
    return fn(tx)
  })
}

export function assertDatabase() {
  if (!databaseConfigured()) {
    throw Errors.unconfigured('DATABASE_URL is not set. The editorial API needs Postgres.')
  }
}
