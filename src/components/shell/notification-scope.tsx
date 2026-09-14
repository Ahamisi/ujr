'use client'

import { useRole } from '@/lib/roles'
import { NotificationProvider } from '@/lib/notifications'

/** Scopes notifications to whoever is signed in. Switching role switches the feed. */
export function NotificationScope({ children }: { children: React.ReactNode }) {
  const { role } = useRole()
  return <NotificationProvider role={role}>{children}</NotificationProvider>
}
