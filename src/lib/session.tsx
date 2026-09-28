'use client'

import * as React from 'react'
import { authClient } from './auth-client'
import { setActiveJournal } from './api'
import type { Role } from './roles'

/**
 * The signed-in person, from Better Auth, plus the memberships that decide
 * which screens they can open. The demo account list is gone.
 */

const EDITORIAL = new Set([
  'handling_editor',
  'section_editor',
  'editor_in_chief',
  'managing_editor',
  'guest_editor',
  'journal_manager',
  'platform_admin',
])
const FINANCE = new Set(['finance_officer', 'journal_manager', 'platform_admin'])
const PRODUCTION = new Set([
  'copyeditor',
  'typesetter',
  'proofreader',
  'managing_editor',
  'journal_manager',
  'platform_admin',
])
const SETTINGS = new Set(['journal_manager', 'editor_in_chief', 'platform_admin'])
const AUTHOR = new Set([
  'author',
  'handling_editor',
  'section_editor',
  'editor_in_chief',
  'managing_editor',
  'journal_manager',
  'platform_admin',
])

export interface MembershipView {
  journalId: string | null
  role: string
  slug: string | null
  name: string | null
}

export interface Session {
  email: string
  name: string
  userId: string
  role: Role
  memberships: MembershipView[]
  can: {
    editorial: boolean
    author: boolean
    reviewer: boolean
    finance: boolean
    production: boolean
    settings: boolean
  }
}

export const HOME_FOR: Record<Role, string> = {
  editor: '/desk',
  author: '/my-submissions',
  reviewer: '/my-reviews',
}

const SessionContext = React.createContext<{
  session: Session | null
  ready: boolean
  journalSlug: string
  setJournalSlug: (slug: string) => void
  signIn: (email: string, password: string) => Promise<Session>
  signUp: (input: SignUpInput) => Promise<Session>
  signOut: () => Promise<void>
  refresh: () => Promise<Session | null>
}>({
  session: null,
  ready: false,
  journalSlug: 'ujer',
  setJournalSlug: () => {},
  signIn: async () => {
    throw new Error('Session is not ready')
  },
  signUp: async () => {
    throw new Error('Session is not ready')
  },
  signOut: async () => {},
  refresh: async () => null,
})

export interface SignUpInput {
  email: string
  password: string
  givenName: string
  familyName: string
  affiliation?: string
}

function capabilities(memberships: MembershipView[]): Session['can'] {
  const roles = memberships.map((membership) => membership.role)
  return {
    editorial: roles.some((role) => EDITORIAL.has(role)),
    author: roles.some((role) => AUTHOR.has(role)),
    reviewer: roles.includes('reviewer'),
    finance: roles.some((role) => FINANCE.has(role)),
    production: roles.some((role) => PRODUCTION.has(role)),
    settings: roles.some((role) => SETTINGS.has(role)),
  }
}

function primaryRole(can: Session['can']): Role {
  if (can.editorial || can.finance || can.production || can.settings) return 'editor'
  if (can.reviewer && !can.author) return 'reviewer'
  return 'author'
}

function toSession(user: { id: string; email: string; name: string }, memberships: MembershipView[]): Session {
  const can = capabilities(memberships)
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    memberships,
    can,
    role: primaryRole(can),
  }
}

async function loadMe(): Promise<Session | null> {
  const { data } = await authClient.getSession()
  if (!data?.user) return null
  const response = await fetch('/api/v1/me', { credentials: 'include' })
  if (!response.ok) return null
  const body = (await response.json()) as { memberships: MembershipView[] }
  return toSession(data.user, body.memberships ?? [])
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [ready, setReady] = React.useState(false)
  const [journalSlug, setJournalSlugState] = React.useState('ujer')

  const apply = React.useCallback((next: Session | null) => {
    setSession(next)
    const slug = next?.memberships.find((membership) => membership.slug)?.slug
    if (slug) {
      setJournalSlugState(slug)
      setActiveJournal(slug)
    }
    return next
  }, [])

  React.useEffect(() => {
    let cancel = false
    loadMe()
      .then((next) => {
        if (!cancel) apply(next)
      })
      .finally(() => {
        if (!cancel) setReady(true)
      })
    return () => {
      cancel = true
    }
  }, [apply])

  const setJournalSlug = React.useCallback((next: string) => {
    setJournalSlugState(next)
    setActiveJournal(next)
  }, [])

  const refresh = React.useCallback(async () => apply(await loadMe()), [apply])

  const signIn = React.useCallback(
    async (email: string, password: string) => {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) throw new Error(result.error.message ?? 'Sign-in failed')
      const next = await loadMe()
      if (!next) throw new Error('Signed in, but the account could not be loaded')
      apply(next)
      return next
    },
    [apply],
  )

  const signUp = React.useCallback(
    async (input: SignUpInput) => {
      const name = `${input.givenName} ${input.familyName}`.trim()
      const result = await authClient.signUp.email({
        email: input.email,
        password: input.password,
        name,
        givenName: input.givenName,
        familyName: input.familyName,
        affiliation: input.affiliation,
      })
      if (result.error) throw new Error(result.error.message ?? 'Could not create the account')
      const joined = await fetch('/api/v1/me', {
        method: 'POST',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ slug: 'ujer' }),
      })
      if (!joined.ok) {
        const body = (await joined.json().catch(() => null)) as { error?: { message?: string } } | null
        throw new Error(body?.error?.message ?? 'Account created, but it could not be added to the journal')
      }
      const next = await loadMe()
      if (!next) throw new Error('Account created, but the session could not be loaded')
      apply(next)
      return next
    },
    [apply],
  )

  const signOut = React.useCallback(async () => {
    await authClient.signOut()
    apply(null)
  }, [apply])

  const value = React.useMemo(
    () => ({ session, ready, journalSlug, setJournalSlug, signIn, signUp, signOut, refresh }),
    [session, ready, journalSlug, setJournalSlug, signIn, signUp, signOut, refresh],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  return React.useContext(SessionContext)
}
