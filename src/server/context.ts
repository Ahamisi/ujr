import { eq } from 'drizzle-orm'
import type { Tx } from '@/db/client'
import { db } from '@/db/client'
import { journals } from '@/db/schema'
import { assertDatabase, withJournal } from '@/db/tenant'
import { getAuth } from './auth/instance'
import { assertRole, ROLE_GROUPS, type Membership, type RoleGroup } from './authz'
import { audit } from './audit'
import { Errors } from './errors'

export interface Actor {
  userId: string
  email: string
  name: string
}

export interface RequestMeta {
  ipAddress: string | null
}

export interface JournalCtx {
  actor: Actor
  journal: typeof journals.$inferSelect
  meta: RequestMeta
}

export function requestMeta(req: Request): RequestMeta {
  const forwarded = req.headers.get('x-forwarded-for')
  return { ipAddress: forwarded?.split(',')[0]?.trim() || null }
}

export async function requireActor(req: Request): Promise<Actor> {
  assertDatabase()
  const session = await getAuth().api.getSession({ headers: req.headers })
  if (!session?.user) throw Errors.unauthorized()
  if (session.user.isSuspended) throw Errors.forbidden('This account is suspended')
  return { userId: session.user.id, email: session.user.email, name: session.user.name }
}

export async function findJournalBySlug(slug: string) {
  assertDatabase()
  const [journal] = await db.select().from(journals).where(eq(journals.slug, slug)).limit(1)
  return journal ?? null
}

/** Resolve the signed-in person and the journal named in the URL. Does not check a role. */
export async function journalContext(req: Request, slug: string): Promise<JournalCtx> {
  const actor = await requireActor(req)
  const journal = await findJournalBySlug(slug)
  if (!journal || !journal.isActive) throw Errors.notFound('Journal')
  return { actor, journal, meta: requestMeta(req) }
}

/**
 * Open the tenant transaction and require a role group. Platform-admin writes
 * are audited here so a route cannot forget.
 */
export async function inJournal<T>(
  ctx: JournalCtx,
  group: RoleGroup,
  fn: (tx: Tx, grant: Membership) => Promise<T>,
  options?: { write?: boolean },
): Promise<T> {
  return withJournal(ctx.journal.id, async (tx) => {
    const grant = await assertRole(tx, ctx.actor.userId, ctx.journal.id, ROLE_GROUPS[group])
    if (options?.write && grant.role === 'platform_admin') {
      await audit(tx, {
        journalId: ctx.journal.id,
        actorId: ctx.actor.userId,
        action: 'platform_admin.write',
        entityType: 'journal',
        entityId: ctx.journal.id,
        ipAddress: ctx.meta.ipAddress,
      })
    }
    return fn(tx, grant)
  })
}
