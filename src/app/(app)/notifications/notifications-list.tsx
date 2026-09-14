'use client'

import * as React from 'react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/shell/page-header'
import { KIND_LABEL, useNotifications } from '@/lib/notifications'
import { cn } from '@/lib/utils'

export function NotificationsList() {
  const { all, unread, markRead, markAllRead } = useNotifications()
  const [view, setView] = React.useState<'all' | 'unread'>('all')

  const rows = view === 'unread' ? all.filter((n) => !n.read) : all

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Notifications"
        description="Every change to your work, in order. The same events are what the email digest sends."
        actions={
          unread > 0 ? (
            <Button size="sm" variant="outline" onClick={markAllRead}>
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
        <TabsList>
          <TabsTrigger value="all">
            All
            <span className="bg-muted text-muted-foreground tnum rounded px-1.5 py-0.5 text-[11px]">
              {all.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            <span className="bg-muted text-muted-foreground tnum rounded px-1.5 py-0.5 text-[11px]">{unread}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {rows.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            onClick={() => markRead(n.id)}
            className={cn(
              'hover:border-primary/40 focus-visible:ring-ring block rounded-lg border px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none',
              n.read ? 'bg-card' : 'bg-accent/30 border-primary/25',
            )}
          >
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={n.tone === 'warning' ? 'warning' : n.read ? 'secondary' : 'default'}>
                {KIND_LABEL[n.kind]}
              </Badge>
              <span className={cn('text-sm', n.read ? 'font-normal' : 'font-medium')}>{n.title}</span>
              <span className="text-muted-foreground ml-auto text-xs">{n.at}</span>
            </div>
            <p className="text-muted-foreground mt-1.5 max-w-prose text-sm leading-relaxed">{n.body}</p>
          </Link>
        ))}

        {rows.length === 0 && (
          <div className="rounded-lg border border-dashed px-6 py-14 text-center">
            <p className="text-sm font-medium">Nothing unread</p>
            <p className="text-muted-foreground mt-1 text-sm">You are up to date.</p>
          </div>
        )}
      </div>
    </div>
  )
}
