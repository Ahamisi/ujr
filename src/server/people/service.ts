import { and, asc, eq, sql } from 'drizzle-orm'
import { APIError } from 'better-auth/api'
import { z } from 'zod'
import { db, type Tx } from '@/db/client'
import { withJournal } from '@/db/tenant'
import { memberships, users } from '@/db/schema'
import { audit } from '@/server/audit'
import { getAuth } from '@/server/auth/instance'
import { assertRole, ROLE_GROUPS } from '@/server/authz'
import type { JournalCtx } from '@/server/context'
import { Errors } from '@/server/errors'

export const ASSIGNABLE_ROLES = [
  'journal_manager',
  'handling_editor',
  'finance_officer',
  'copyeditor',
  'reviewer',
  'author',
] as const

export const grantInput = z.object({
  email: z.string().email(),
  givenName: z.string().trim().min(1).max(80),
  familyName: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(200).optional(),
  role: z.enum(ASSIGNABLE_ROLES),
})

export interface Person {
  id: string
  email: string
  name: string
  roles: string[]
}

export async function listPeople(tx: Tx, journalId: string): Promise<Person[]> {
  const rows = await tx
    .select({
      id: users.id,
      email: users.email,
      givenName: users.givenName,
      familyName: users.familyName,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(users, eq(users.id, memberships.userId))
    .where(eq(memberships.journalId, journalId))
    .orderBy(asc(users.familyName), asc(users.givenName))
  const byId = new Map<string, Person>()
  for (const row of rows) {
    const person = byId.get(row.id) ?? {
      id: row.id,
      email: row.email,
      name: `${row.givenName} ${row.familyName}`.trim(),
      roles: [],
    }
    if (!person.roles.includes(row.role)) person.roles.push(row.role)
    byId.set(row.id, person)
  }
  return [...byId.values()]
}

export async function grantRole(ctx: JournalCtx, input: z.infer<typeof grantInput>): Promise<Person> {
  const email = input.email.trim().toLowerCase()
  const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  let userId = existing?.id
  if (!userId) {
    if (!input.password) throw Errors.badRequest('Set a password for the new account')
    try {
      await getAuth().api.signUpEmail({
        body: {
          email,
          password: input.password,
          name: `${input.givenName} ${input.familyName}`.trim(),
          givenName: input.givenName,
          familyName: input.familyName,
        },
      })
    } catch (error) {
      if (error instanceof APIError) throw Errors.badRequest(error.message || 'Could not create the account')
      throw error
    }
    const [created] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    if (!created) throw Errors.badRequest('Could not create the account')
    userId = created.id
  }
  const personId = userId
  if (!personId) throw Errors.badRequest('Could not create the account')

  return withJournal(ctx.journal.id, async (tx) => {
    await assertRole(tx, ctx.actor.userId, ctx.journal.id, ROLE_GROUPS.settings)
    const [held] = await tx
      .select({ id: memberships.id })
      .from(memberships)
      .where(
        and(eq(memberships.userId, personId), eq(memberships.journalId, ctx.journal.id), eq(memberships.role, input.role)),
      )
      .limit(1)
    if (!held) {
      await tx.insert(memberships).values({
        journalId: ctx.journal.id,
        userId: personId,
        role: input.role,
        scopeType: 'journal',
        grantedBy: ctx.actor.userId,
      })
      await audit(tx, {
        journalId: ctx.journal.id,
        actorId: ctx.actor.userId,
        action: 'membership.granted',
        entityType: 'user',
        entityId: personId,
        metadata: { role: input.role },
        ipAddress: ctx.meta.ipAddress,
      })
    }
    const people = await listPeople(tx, ctx.journal.id)
    const person = people.find((row) => row.id === personId)
    if (!person) throw Errors.notFound('Person')
    return person
  })
}

export async function revokeRole(tx: Tx, ctx: JournalCtx, userId: string, role: string) {
  const parsed = z.enum(ASSIGNABLE_ROLES).safeParse(role)
  if (!parsed.success) throw Errors.badRequest('Unknown role')
  if (parsed.data === 'journal_manager') {
    const [count] = await tx
      .select({ total: sql<number>`count(distinct ${memberships.userId})::int` })
      .from(memberships)
      .where(and(eq(memberships.journalId, ctx.journal.id), eq(memberships.role, 'journal_manager')))
    if ((count?.total ?? 0) <= 1) throw Errors.conflict('The journal needs an admin')
  }
  const [removed] = await tx
    .delete(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.journalId, ctx.journal.id), eq(memberships.role, parsed.data)))
    .returning({ id: memberships.id })
  if (!removed) throw Errors.notFound('Role')
  await audit(tx, {
    journalId: ctx.journal.id,
    actorId: ctx.actor.userId,
    action: 'membership.revoked',
    entityType: 'user',
    entityId: userId,
    metadata: { role: parsed.data },
    ipAddress: ctx.meta.ipAddress,
  })
  return { id: userId, role: parsed.data }
}
