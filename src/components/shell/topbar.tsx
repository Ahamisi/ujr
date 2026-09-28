'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Search } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useSession } from '@/lib/session'
import { NotificationBell } from './notification-bell'
import { ThemeToggle } from './theme-toggle'

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '•'
}

export function Topbar() {
  const { session, signOut, journalSlug, setJournalSlug } = useSession()
  const [query, setQuery] = React.useState('')
  const router = useRouter()

  const journals = React.useMemo(() => {
    const seen = new Map<string, { slug: string; name: string; abbreviation: string }>()
    for (const membership of session?.memberships ?? []) {
      if (!membership.slug || seen.has(membership.slug)) continue
      seen.set(membership.slug, {
        slug: membership.slug,
        name: membership.name ?? membership.slug,
        abbreviation: (membership.slug || 'UJ').toUpperCase(),
      })
    }
    return [...seen.values()]
  }, [session])

  const journal = journals.find((item) => item.slug === journalSlug) ?? journals[0]

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/manuscripts?q=${encodeURIComponent(q)}` : '/manuscripts')
  }

  return (
    <header className="bg-background border-border sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-[10px] font-semibold">
              {(journal?.abbreviation ?? 'UJ').slice(0, 2)}
            </span>
            <span className="hidden text-sm font-medium sm:inline">{journal?.abbreviation ?? 'UJER'}</span>
            <ChevronsUpDown className="text-muted-foreground size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Journals</DropdownMenuLabel>
          {journals.map((item) => (
            <DropdownMenuItem
              key={item.slug}
              className="flex-col items-start gap-0.5"
              onSelect={() => setJournalSlug(item.slug)}
            >
              <span className="font-medium">
                {item.abbreviation}
                {item.slug === journalSlug && <span className="text-muted-foreground ml-2 text-xs">current</span>}
              </span>
              <span className="text-muted-foreground text-xs">{item.name}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <form onSubmit={search} className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          id="global-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by reference, title or author"
          className="h-8 pl-8"
          aria-label="Search manuscripts"
        />
      </form>

      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar>
                <AvatarFallback>{initials(session?.name ?? '')}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm lg:inline">{session?.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>{session?.email}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/')}>Journal home</DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                void signOut().then(() => router.push('/sign-in'))
              }}
            >
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
