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
import { useToast } from '@/components/ui/toast'
import { CURRENT_JOURNAL, CURRENT_USER, OTHER_JOURNALS } from '@/lib/mock-data'
import { ThemeToggle } from './theme-toggle'

const JOURNALS = [CURRENT_JOURNAL, ...OTHER_JOURNALS]

export function Topbar() {
  const [active, setActive] = React.useState(CURRENT_JOURNAL.abbreviation)
  const [query, setQuery] = React.useState('')
  const router = useRouter()
  const toast = useToast()

  const journal = JOURNALS.find((j) => j.abbreviation === active) ?? CURRENT_JOURNAL

  function search(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    router.push(q ? `/manuscripts?q=${encodeURIComponent(q)}` : '/manuscripts')
  }

  return (
    <header className="bg-background border-border sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4">
      {/* Tenant switcher. Present from day one because the data model is. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-[10px] font-semibold">
              {journal.abbreviation.slice(0, 2)}
            </span>
            <span className="hidden text-sm font-medium sm:inline">{journal.abbreviation}</span>
            <ChevronsUpDown className="text-muted-foreground size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Journals</DropdownMenuLabel>
          {JOURNALS.map((j) => (
            <DropdownMenuItem
              key={j.slug}
              className="flex-col items-start gap-0.5"
              onSelect={() => {
                setActive(j.abbreviation)
                toast(`Switched to ${j.abbreviation}`)
              }}
            >
              <span className="font-medium">
                {j.abbreviation}
                {j.abbreviation === active && <span className="text-muted-foreground ml-2 text-xs">current</span>}
              </span>
              <span className="text-muted-foreground text-xs">{j.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => toast('Journal provisioning is not built yet')}>
            Provision a new journal
          </DropdownMenuItem>
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
        <ThemeToggle />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 gap-2 px-2">
              <Avatar>
                <AvatarFallback>{CURRENT_USER.initials}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm lg:inline">{CURRENT_USER.name}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Signed in as</DropdownMenuLabel>
            <div className="px-2 pb-1.5">
              <p className="text-sm font-medium">{CURRENT_USER.name}</p>
              <p className="text-muted-foreground text-xs">{CURRENT_USER.role}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => router.push('/reviewers')}>Profile and expertise</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => router.push('/review/demo-token')}>
              Open the reviewer view
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onSelect={() => toast('Authentication is not wired up yet')}>
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
