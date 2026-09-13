'use client'

import * as React from 'react'
import { ROLES, type Role } from './roles'

/**
 * DEMO SESSION ONLY. There is no server, no password checking and no token —
 * signing in writes a role to this browser and nothing more. Replace wholesale
 * with Better Auth before anything real touches this. It exists so the three
 * views can be tested the way a user reaches them: by signing in as someone.
 */

export interface Session {
  email: string
  name: string
  role: Role
}

export const DEMO_ACCOUNTS: (Session & { context: string; initials: string })[] = ROLES.map((r) => ({
  email: `${r.person.split(' ').pop()!.toLowerCase()}@unilag.edu.ng`,
  name: r.person,
  role: r.id,
  context: `${r.label} · ${r.context}`,
  initials: r.initials,
}))

const KEY = 'ujer-session'

const SessionContext = React.createContext<{
  session: Session | null
  ready: boolean
  signIn: (s: Session) => void
  signOut: () => void
}>({ session: null, ready: false, signIn: () => {}, signOut: () => {} })

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null)
  const [ready, setReady] = React.useState(false)

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setSession(JSON.parse(raw) as Session)
    } catch {
      /* storage unavailable — the app simply asks you to sign in again */
    }
    setReady(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const signIn = React.useCallback((s: Session) => {
    setSession(s)
    try {
      localStorage.setItem(KEY, JSON.stringify(s))
    } catch {
      /* ignore */
    }
  }, [])

  const signOut = React.useCallback(() => {
    setSession(null)
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const value = React.useMemo(() => ({ session, ready, signIn, signOut }), [session, ready, signIn, signOut])
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession() {
  return React.useContext(SessionContext)
}

export const HOME_FOR: Record<Role, string> = {
  editor: '/desk',
  author: '/my-submissions',
  reviewer: '/my-reviews',
}
