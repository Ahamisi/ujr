'use client'

import * as React from 'react'
import { api, formatWhen } from './api'

/**
 * In-app notices from /notifications. The same events are what the email
 * job sends. An author's body is already free of reviewer names.
 */

export type NotificationKind =
  | 'submission_received'
  | 'desk_passed'
  | 'under_review'
  | 'review_received'
  | 'decision'
  | 'revision_due'
  | 'published'
  | 'invitation'
  | 'reminder'
  | 'payment'

export interface Notification {
  id: string
  kind: NotificationKind
  title: string
  body: string
  at: string
  href: string
  read: boolean
  tone?: 'default' | 'success' | 'warning'
}

interface Row {
  id: string
  kind: NotificationKind
  title: string
  body: string
  href: string
  createdAt: string
  readAt: string | null
}

const Ctx = React.createContext<{
  all: Notification[]
  unread: number
  markRead: (id: string) => void
  markAllRead: () => void
}>({ all: [], unread: 0, markRead: () => {}, markAllRead: () => {} })

function mapRow(row: Row): Notification {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    body: row.body,
    href: row.href,
    at: formatWhen(row.createdAt),
    read: Boolean(row.readAt),
    tone: row.kind === 'decision' || row.kind === 'reminder' ? 'warning' : 'default',
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = React.useState<Notification[]>([])

  React.useEffect(() => {
    let cancel = false
    api<Row[]>('/notifications')
      .then((rows) => {
        if (!cancel) setItems(rows.map(mapRow))
      })
      .catch(() => {
        if (!cancel) setItems([])
      })
    return () => {
      cancel = true
    }
  }, [])

  const unread = items.filter((item) => !item.read).length

  const markRead = React.useCallback((id: string) => {
    setItems((list) => list.map((item) => (item.id === id ? { ...item, read: true } : item)))
    void api(`/notifications/${id}/read`, { method: 'POST' }).catch(() => {})
  }, [])

  const markAllRead = React.useCallback(() => {
    setItems((list) => {
      for (const item of list) {
        if (!item.read) void api(`/notifications/${item.id}/read`, { method: 'POST' }).catch(() => {})
      }
      return list.map((item) => ({ ...item, read: true }))
    })
  }, [])

  const value = React.useMemo(() => ({ all: items, unread, markRead, markAllRead }), [items, unread, markRead, markAllRead])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useNotifications() {
  return React.useContext(Ctx)
}

export const KIND_LABEL: Record<NotificationKind, string> = {
  submission_received: 'Submission',
  desk_passed: 'Desk check',
  under_review: 'Review',
  review_received: 'Review',
  decision: 'Decision',
  revision_due: 'Revision',
  published: 'Published',
  invitation: 'Invitation',
  reminder: 'Reminder',
  payment: 'Payment',
}
