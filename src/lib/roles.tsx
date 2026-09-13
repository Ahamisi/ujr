'use client'

import * as React from 'react'

/**
 * Demo role switching. In production a person's role comes from their
 * memberships row, and switching means signing in as someone else — but being
 * able to see the author's and reviewer's view is how you catch a blinding leak
 * before an author does.
 */
export type Role = 'editor' | 'author' | 'reviewer'

export const ROLES: { id: Role; label: string; person: string; initials: string; context: string }[] = [
  {
    id: 'editor',
    label: 'Handling editor',
    person: 'Dr. Adaeze Okonkwo',
    initials: 'AO',
    context: 'Civil & Structural',
  },
  {
    id: 'author',
    label: 'Author',
    person: 'Dr. Ifeanyi Balogun',
    initials: 'IB',
    context: 'Department of Civil Engineering, UNILAG',
  },
  {
    id: 'reviewer',
    label: 'Reviewer',
    person: 'Prof. Yemi Ogunsanya',
    initials: 'YO',
    context: 'Geotechnics · Foundations',
  },
]

const RoleContext = React.createContext<{
  role: Role
  setRole: (r: Role) => void
}>({ role: 'editor', setRole: () => {} })

const KEY = 'ujer-role'

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = React.useState<Role>('editor')

  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY) as Role | null
      if (stored && ROLES.some((r) => r.id === stored)) setRoleState(stored)
    } catch {
      /* storage unavailable — the switcher still works for this session */
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const setRole = React.useCallback((r: Role) => {
    setRoleState(r)
    try {
      localStorage.setItem(KEY, r)
    } catch {
      /* ignore */
    }
  }, [])

  const value = React.useMemo(() => ({ role, setRole }), [role, setRole])
  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>
}

export function useRole() {
  return React.useContext(RoleContext)
}

export function usePerson() {
  const { role } = useRole()
  return ROLES.find((r) => r.id === role) ?? ROLES[0]
}
