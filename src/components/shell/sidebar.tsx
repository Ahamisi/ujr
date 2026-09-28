'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpenCheck,
  ClipboardList,
  CreditCard,
  Fingerprint,
  FilePlus2,
  FileStack,
  FileText,
  Bell,
  House,
  Inbox,
  LayoutList,
  Settings,
  UserCog,
  Users,
} from 'lucide-react'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

const NAV: { href: string; label: string; icon: typeof Inbox; when: 'editorial' | 'author' | 'reviewer' | 'finance' | 'production' | 'settings' | 'always' }[] = [
  { href: '/desk', label: 'Editor desk', icon: Inbox, when: 'editorial' },
  { href: '/manuscripts', label: 'All manuscripts', icon: FileStack, when: 'editorial' },
  { href: '/reviewers', label: 'Reviewers', icon: Users, when: 'editorial' },
  { href: '/issues', label: 'Issues', icon: LayoutList, when: 'editorial' },
  { href: '/reports', label: 'Reports', icon: ClipboardList, when: 'editorial' },
  { href: '/production', label: 'Production', icon: BookOpenCheck, when: 'production' },
  { href: '/doi', label: 'DOI registry', icon: Fingerprint, when: 'production' },
  { href: '/transactions', label: 'Transactions', icon: CreditCard, when: 'finance' },
  { href: '/settings', label: 'Settings', icon: Settings, when: 'settings' },
  { href: '/people', label: 'People', icon: UserCog, when: 'settings' },
  { href: '/my-submissions', label: 'My submissions', icon: FileText, when: 'author' },
  { href: '/submit', label: 'New submission', icon: FilePlus2, when: 'author' },
  { href: '/my-reviews', label: 'Review requests', icon: Inbox, when: 'reviewer' },
  { href: '/notifications', label: 'Notifications', icon: Bell, when: 'always' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { session } = useSession()
  const links = NAV.filter((item) => item.when === 'always' || session?.can[item.when])

  return (
    <nav
      aria-label="Main"
      className="bg-sidebar border-sidebar-border hidden w-56 shrink-0 flex-col border-r md:flex"
    >
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
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
      <div className="border-sidebar-border border-t p-3">
        <Link
          href="/"
          className="text-sidebar-foreground hover:bg-sidebar-accent/50 focus-visible:ring-ring flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <House className="size-4 shrink-0" />
          Journal home
        </Link>
      </div>
    </nav>
  )
}
