'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  FilePlus2,
  FileStack,
  FileText,
  Inbox,
  LayoutList,
  Settings,
  Users,
} from 'lucide-react'
import { useRole, type Role } from '@/lib/roles'
import { cn } from '@/lib/utils'

const NAV: Record<Role, { href: string; label: string; icon: typeof Inbox }[]> = {
  editor: [
    { href: '/desk', label: 'Editor desk', icon: Inbox },
    { href: '/manuscripts', label: 'All manuscripts', icon: FileStack },
    { href: '/reviewers', label: 'Reviewers', icon: Users },
    { href: '/issues', label: 'Issues', icon: LayoutList },
    { href: '/production', label: 'Production', icon: BookOpenCheck },
    { href: '/transactions', label: 'Transactions', icon: CreditCard },
    { href: '/reports', label: 'Reports', icon: ClipboardList },
    { href: '/settings', label: 'Settings', icon: Settings },
  ],
  author: [
    { href: '/my-submissions', label: 'My submissions', icon: FileText },
    { href: '/submit', label: 'New submission', icon: FilePlus2 },
  ],
  reviewer: [{ href: '/my-reviews', label: 'Review requests', icon: Inbox }],
}

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useRole()

  return (
    <nav
      aria-label="Main"
      className="bg-sidebar border-sidebar-border hidden w-56 shrink-0 flex-col border-r md:flex"
    >
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        {NAV[role].map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                'focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </div>

      {role !== 'editor' && (
        <p className="text-muted-foreground border-sidebar-border border-t px-3 py-3 text-[11px] leading-relaxed">
          You are seeing what a {role} sees. Reviewer identities and confidential comments are not in this view.
        </p>
      )}
    </nav>
  )
}
