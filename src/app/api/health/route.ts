import { sql } from 'drizzle-orm'
import { db, databaseConfigured } from '@/db/client'

export async function GET() {
  if (!databaseConfigured()) {
    return Response.json({ ok: true, database: 'not_configured' })
  }
  try {
    await db.execute(sql`select 1`)
    return Response.json({ ok: true, database: 'up' })
  } catch {
    return Response.json({ ok: false, database: 'down' }, { status: 503 })
  }
}
