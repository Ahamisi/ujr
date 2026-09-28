'use client'

import { NotificationProvider } from '@/lib/notifications'

export function NotificationScope({ children }: { children: React.ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>
}