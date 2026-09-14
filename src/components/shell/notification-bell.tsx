'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { KIND_LABEL, useNotifications } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { all, unread, markRead, markAllRead } = useNotifications()
  const router = useRouter()
  const recent = all.slice(0, 5)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="relative"
          aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="bg-primary text-primary-foreground tnum absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[9px] font-medium">
              {unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[22rem]">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="rule-label">
            Notifications
          </span>
          {unread > 0 && (
            <button
              type="button"
              onClick={markAllRead}
              className="text-primary text-xs hover:underline"
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />

        {recent.length === 0 && (
          <p className="text-muted-foreground px-2 py-6 text-center text-sm">Nothing yet.</p>
        )}

        {recent.map((n) => (
          <DropdownMenuItem
            key={n.id}
            className="flex-col items-start gap-1 py-2.5"
            onSelect={() => {
              markRead(n.id)
              router.push(n.href)
            }}
          >
            <span className="flex w-full items-start gap-2">
              <span
                className={cn(
                  'mt-1.5 size-1.5 shrink-0 rounded-full',
                  n.read ? 'bg-transparent' : n.tone === 'warning' ? 'bg-warning' : 'bg-primary',
                )}
              />
              <span className="min-w-0 flex-1">
                <span className={cn('block text-[13px]', n.read ? 'font-normal' : 'font-medium')}>{n.title}</span>
                <span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">{n.body}</span>
                <span className="text-muted-foreground mt-1 block text-[11px]">
                  {KIND_LABEL[n.kind]} · {n.at}
                </span>
              </span>
            </span>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-[13px]">
            See all notifications
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
