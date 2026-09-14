import type { Metadata } from 'next'
import { NotificationsList } from './notifications-list'

export const metadata: Metadata = { title: 'Notifications' }

export default function NotificationsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col px-4 py-6 md:px-6">
      <NotificationsList />
    </div>
  )
}
