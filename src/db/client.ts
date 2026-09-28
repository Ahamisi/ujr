/**
 * Postgres connection. Queries are lazy: importing this module does not open
 * a socket, so `next build` still succeeds before DATABASE_URL exists.
 *
 * `prepare: false` is required once the app sits behind a transaction pooler
 * (PgBouncer, Neon). Prepared statements and SET LOCAL do not survive
 * transaction-mode pooling. The tenant helper uses set_config(..., true),
 * which is the parameterised form of SET LOCAL.
 */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export function databaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

const url = process.env.DATABASE_URL ?? 'postgres://127.0.0.1:5432/unilag_journal'

export const queryClient = postgres(url, {
  max: 10,
  prepare: false,
})

export const db = drizzle(queryClient, { schema })

export type Database = typeof db
export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0]
