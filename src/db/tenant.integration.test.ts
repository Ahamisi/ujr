import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, describe, it } from 'node:test'
import postgres from 'postgres'

const url = process.env.DATABASE_URL
const sql = url ? postgres(url, { max: 1 }) : null

describe('row-level security', { skip: url ? false : 'DATABASE_URL is not set' }, () => {
  const journalA = randomUUID()
  const journalB = randomUUID()
  const userId = randomUUID()
  const manuscriptA = randomUUID()

  after(async () => {
    if (!sql) return
    for (const journalId of [journalA, journalB]) {
      await sql.begin(async (tx) => {
        await tx`select set_config('app.journal_id', ${journalId}, true)`
        await tx`delete from manuscripts where journal_id = ${journalId}`
        await tx`delete from journals where id = ${journalId}`
      })
    }
    await sql`delete from users where id = ${userId}`
    await sql.end()
  })

  it('connects as ujer_app, which is not a superuser', async () => {
    const [role] = await sql!<{ rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]>`
      select rolname, rolsuper, rolbypassrls from pg_roles where rolname = current_user
    `
    assert.equal(role.rolname, 'ujer_app')
    assert.equal(role.rolsuper, false)
    assert.equal(role.rolbypassrls, false)
  })

  it('hides a manuscript from every transaction that is not its journal', async () => {
    await sql!`
      insert into users (id, name, email, given_name, family_name)
      values (${userId}, 'RLS Test', ${`rls-${userId}@example.com`}, 'RLS', 'Test')
    `
    await sql!`
      insert into journals (id, slug, name) values
        (${journalA}, ${`rls-a-${journalA.slice(0, 8)}`}, 'Journal A'),
        (${journalB}, ${`rls-b-${journalB.slice(0, 8)}`}, 'Journal B')
    `
    await sql!.begin(async (tx) => {
      await tx`select set_config('app.journal_id', ${journalA}, true)`
      await tx`
        insert into manuscripts (id, journal_id, reference, title, submitted_by_id)
        values (${manuscriptA}, ${journalA}, ${`RLS-${journalA.slice(0, 8)}`}, 'Hidden from the other journal', ${userId})
      `
    })

    const asOwner = await sql!.begin(async (tx) => {
      await tx`select set_config('app.journal_id', ${journalA}, true)`
      return tx<{ id: string }[]>`select id from manuscripts where id = ${manuscriptA}`
    })
    const asOther = await sql!.begin(async (tx) => {
      await tx`select set_config('app.journal_id', ${journalB}, true)`
      return tx<{ id: string }[]>`select id from manuscripts where id = ${manuscriptA}`
    })
    const asNobody = await sql!<{ id: string }[]>`select id from manuscripts where id = ${manuscriptA}`

    assert.equal(asOwner.length, 1)
    assert.equal(asOther.length, 0)
    assert.equal(asNobody.length, 0)
  })
})
