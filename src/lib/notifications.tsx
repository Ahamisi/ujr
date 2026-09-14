'use client'

import * as React from 'react'
import type { Role } from './roles'

/**
 * Notifications exist because the commonest complaint about journal systems is
 * silence: an author hears nothing for four months and assumes their paper has
 * been lost. Every state change an author cares about produces one of these, and
 * the same events are what the email digest sends.
 *
 * Blinding applies here too. An author's notification never names a reviewer.
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
  role: Role
  kind: NotificationKind
  title: string
  body: string
  at: string
  href: string
  read: boolean
  tone?: 'default' | 'success' | 'warning'
}

const SEED: Notification[] = [
  /* ---- author: the full life of a manuscript, which is the point ---- */
  {
    id: 'n1',
    role: 'author',
    kind: 'decision',
    title: 'Decision on UJER-2026-0122',
    body: 'Revisions are requested. Both reviewers were positive about the method and want the statistical treatment strengthened. Your response is due 30 September.',
    at: '2 days ago',
    href: '/my-submissions/m5',
    read: false,
    tone: 'warning',
  },
  {
    id: 'n2',
    role: 'author',
    kind: 'review_received',
    title: 'Both reviews are in for UJER-2026-0147',
    body: 'Two of two reviews received. The handling editor is considering them and will write to you with a decision.',
    at: '5 days ago',
    href: '/my-submissions/m1',
    read: false,
  },
  {
    id: 'n3',
    role: 'author',
    kind: 'under_review',
    title: 'UJER-2026-0147 is under review',
    body: 'Reviewers have accepted and are reading your manuscript. This usually takes four to eight weeks.',
    at: '3 weeks ago',
    href: '/my-submissions/m1',
    read: true,
  },
  {
    id: 'n4',
    role: 'author',
    kind: 'desk_passed',
    title: 'UJER-2026-0147 passed the desk check',
    body: 'Scope, formatting and similarity are all fine. It has been assigned to a handling editor who is now finding reviewers.',
    at: '2 July',
    href: '/my-submissions/m1',
    read: true,
    tone: 'success',
  },
  {
    id: 'n5',
    role: 'author',
    kind: 'submission_received',
    title: 'We have your manuscript',
    body: 'UJER-2026-0147 was received and logged. You will hear from us within a week about the desk check.',
    at: '2 July',
    href: '/my-submissions/m1',
    read: true,
  },
  {
    id: 'n6',
    role: 'author',
    kind: 'published',
    title: 'UJER-2025-0311 is published',
    body: 'Your article is live in Volume 11, Issue 4, with DOI 10.60821/ujer.2026.0311 registered and resolving.',
    at: '28 March',
    href: '/my-submissions/m9',
    read: true,
    tone: 'success',
  },

  /* ---- reviewer ---- */
  {
    id: 'n7',
    role: 'reviewer',
    kind: 'invitation',
    title: 'Review invitation: biogas from market waste',
    body: 'About 45 minutes. Due 12 October. Accept or decline — declining is fine and helps the editor move on.',
    at: '6 days ago',
    href: '/my-reviews',
    read: false,
  },
  {
    id: 'n8',
    role: 'reviewer',
    kind: 'reminder',
    title: 'Your review is due in 7 days',
    body: 'UJER-2026-0151, due 20 September. If you need longer, say so — an extension is easier than a replacement.',
    at: '1 day ago',
    href: '/my-reviews',
    read: false,
    tone: 'warning',
  },
  {
    id: 'n9',
    role: 'reviewer',
    kind: 'decision',
    title: 'Outcome of a review you filed',
    body: 'UJER-2026-0118 was accepted after minor revisions. Thank you — your comments shaped the final version.',
    at: '2 weeks ago',
    href: '/my-reviews',
    read: true,
    tone: 'success',
  },

  /* ---- editor ---- */
  {
    id: 'n10',
    role: 'editor',
    kind: 'submission_received',
    title: 'New submission awaiting desk check',
    body: 'UJER-2026-0163, Chemical & Petroleum. Similarity 34%, which is above the 20% flag threshold.',
    at: '2 days ago',
    href: '/desk',
    read: false,
    tone: 'warning',
  },
  {
    id: 'n11',
    role: 'editor',
    kind: 'review_received',
    title: 'Second review received for UJER-2026-0147',
    body: 'Both reviews are now in and the recommendations differ. A decision is yours to make.',
    at: '5 days ago',
    href: '/manuscripts/m1',
    read: false,
  },
  {
    id: 'n12',
    role: 'editor',
    kind: 'reminder',
    title: 'A review is overdue',
    body: 'UJER-2026-0151 has been with reviewers for 31 days. One reviewer has not responded to two reminders.',
    at: '3 days ago',
    href: '/desk',
    read: false,
    tone: 'warning',
  },
  {
    id: 'n13',
    role: 'editor',
    kind: 'payment',
    title: 'A charge failed',
    body: 'UJER-2026-0089 — the card was declined. The author has been told and can retry.',
    at: '1 week ago',
    href: '/transactions',
    read: true,
  },
]

const Ctx = React.createContext<{
  all: Notification[]
  unread: number
  markRead: (id: string) => void
  markAllRead: () => void
}>({ all: [], unread: 0, markRead: () => {}, markAllRead: () => {} })

export function NotificationProvider({ role, children }: { role: Role; children: React.ReactNode }) {
  const [items, setItems] = React.useState(SEED)

  const all = React.useMemo(() => items.filter((n) => n.role === role), [items, role])
  const unread = all.filter((n) => !n.read).length

  const markRead = React.useCallback(
    (id: string) => setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true } : n))),
    [],
  )
  const markAllRead = React.useCallback(
    () => setItems((list) => list.map((n) => (n.role === role ? { ...n, read: true } : n))),
    [role],
  )

  const value = React.useMemo(() => ({ all, unread, markRead, markAllRead }), [all, unread, markRead, markAllRead])
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
