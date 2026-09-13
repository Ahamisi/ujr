'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useRole } from '@/lib/roles'
import { useSession } from '@/lib/session'

/**
 * Client-side only, because the demo session lives in the browser. A real
 * deployment checks the session on the server and never renders the shell
 * for a signed-out request.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { session, ready } = useSession()
  const { role, setRole } = useRole()
  const router = useRouter()

  React.useEffect(() => {
    if (ready && !session) router.replace('/sign-in')
  }, [ready, session, router])

  React.useEffect(() => {
    if (session && session.role !== role) setRole(session.role)
  }, [session, role, setRole])

  if (!ready || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="text-muted-foreground size-5 animate-spin" />
        <span className="sr-only">Checking your session</span>
      </div>
    )
  }

  return <>{children}</>
}
