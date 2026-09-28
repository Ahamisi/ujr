import { and, eq } from 'drizzle-orm'
import { manuscriptAuthors, memberships, roleEnum } from '@/db/schema'
import type { Tx } from '@/db/client'
import { Errors } from './errors'

export type DbRole = (typeof roleEnum.enumValues)[number]
export type Membership = typeof memberships.$inferSelect

/**
 * The fifteen schema roles collapse into the jobs the API actually checks.
 * A person can hold more than one. Platform admin is not a member of the
 * journal; the null journal_id grant reaches every tenant and must be audited
 * by the caller on every write.
 */
export const ROLE_GROUPS = {
  /** Seeing the queue, inviting reviewers, recording a decision. */
  editorial: [
    'handling_editor',
    'section_editor',
    'editor_in_chief',
    'managing_editor',
    'guest_editor',
    'journal_manager',
  ],
  /** Creating a manuscript. Editors may also submit, under their own name. */
  author: [
    'author',
    'handling_editor',
    'section_editor',
    'editor_in_chief',
    'managing_editor',
    'journal_manager',
  ],
  finance: ['finance_officer', 'journal_manager'],
  production: ['copyeditor', 'typesetter', 'proofreader', 'managing_editor', 'journal_manager'],
  settings: ['journal_manager', 'editor_in_chief'],
  integrity: ['integrity_officer', 'managing_editor', 'editor_in_chief', 'journal_manager'],
  /** Any membership. Used for notifications, which every role receives. */
  member: [
    'reader',
    'author',
    'reviewer',
    'handling_editor',
    'section_editor',
    'editor_in_chief',
    'managing_editor',
    'guest_editor',
    'copyeditor',
    'typesetter',
    'proofreader',
    'integrity_officer',
    'journal_manager',
    'finance_officer',
  ],
  /** Any staff role that is not "author" alone. Used when deciding which view to render. */
  staff: [
    'handling_editor',
    'section_editor',
    'editor_in_chief',
    'managing_editor',
    'guest_editor',
    'copyeditor',
    'typesetter',
    'proofreader',
    'integrity_officer',
    'journal_manager',
    'finance_officer',
  ],
} as const satisfies Record<string, readonly DbRole[]>

export type RoleGroup = keyof typeof ROLE_GROUPS

export interface ResourceScope {
  sectionId?: string | null
  issueId?: string | null
}

function covers(grant: Membership, resource?: ResourceScope) {
  if (grant.role === 'platform_admin' || grant.scopeType === 'journal') return true
  if (!resource) return true
  if (grant.scopeType === 'section') return Boolean(resource.sectionId) && grant.scopeId === resource.sectionId
  if (grant.scopeType === 'issue') return Boolean(resource.issueId) && grant.scopeId === resource.issueId
  return false
}

function rank(grant: Membership) {
  if (grant.role === 'platform_admin' || grant.journalId === null) return 3
  if (grant.scopeType === 'journal') return 2
  if (grant.scopeType === 'section') return 1
  return 0
}

async function grantsFor(tx: Tx, userId: string, journalId: string) {
  const rows = await tx.select().from(memberships).where(eq(memberships.userId, userId))
  const now = new Date()
  return rows.filter((grant) => {
    if (grant.expiresAt && grant.expiresAt < now) return false
    if (grant.journalId === journalId) return true
    return grant.journalId === null && grant.role === 'platform_admin'
  })
}

/**
 * The widest grant that satisfies `allowed`, or null. List endpoints pass no
 * resource and then filter rows with `scopeFilter`. A single manuscript
 * passes its section and issue, so a guest editor cannot open another issue.
 */
export async function findGrant(
  tx: Tx,
  userId: string,
  journalId: string,
  allowed: readonly DbRole[],
  resource?: ResourceScope,
) {
  const matched = (await grantsFor(tx, userId, journalId)).filter((grant) => {
    const permitted = grant.role === 'platform_admin' || allowed.some((role) => role === grant.role)
    return permitted && covers(grant, resource)
  })
  matched.sort((a, b) => rank(b) - rank(a))
  return matched[0] ?? null
}

export async function assertRole(
  tx: Tx,
  userId: string,
  journalId: string,
  allowed: readonly DbRole[],
  resource?: ResourceScope,
) {
  const grant = await findGrant(tx, userId, journalId, allowed, resource)
  if (!grant) throw Errors.forbidden()
  return grant
}

/** Extra WHERE fragments for a section- or issue-scoped grant. Journal scope filters nothing. */
export function scopeFilter(grant: Membership) {
  if (grant.role === 'platform_admin' || grant.scopeType === 'journal') return null
  if (grant.scopeType === 'section' && grant.scopeId) return { sectionId: grant.scopeId }
  if (grant.scopeType === 'issue' && grant.scopeId) return { issueId: grant.scopeId }
  return { sectionId: '00000000-0000-0000-0000-000000000000' as const }
}

/** True when this user is on the author list or submitted the manuscript. */
export async function isManuscriptAuthor(
  tx: Tx,
  manuscript: { id: string; submittedById: string },
  userId: string,
) {
  if (manuscript.submittedById === userId) return true
  const [row] = await tx
    .select({ id: manuscriptAuthors.id })
    .from(manuscriptAuthors)
    .where(and(eq(manuscriptAuthors.manuscriptId, manuscript.id), eq(manuscriptAuthors.userId, userId)))
    .limit(1)
  return Boolean(row)
}

export async function assertNotAuthor(
  tx: Tx,
  manuscript: { id: string; submittedById: string },
  userId: string,
) {
  if (await isManuscriptAuthor(tx, manuscript, userId)) {
    throw Errors.conflict('An author cannot handle their own manuscript')
  }
}
