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
import { CURRENT_JOURNAL, CURRENT_USER, OTHER_JOURNALS } from '@/lib/mock-data'
import { ThemeToggle } from './theme-toggle'

export function Topbar() {
  return (
    <header className="bg-background border-border sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4">
      {/* Tenant switcher. Present from day one because the data model is. */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-9 gap-2 px-2">
            <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-[10px] font-semibold">
              {CURRENT_JOURNAL.abbreviation.slice(0, 2)}
            </span>
            <span className="hidden text-sm font-medium sm:inline">{CURRENT_JOURNAL.abbreviation}</span>
            <ChevronsUpDown className="text-muted-foreground size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel>Journals</DropdownMenuLabel>
          <DropdownMenuItem className="flex-col items-start gap-0.5">
            <span className="font-medium">{CURRENT_JOURNAL.abbreviation}</span>
            <span className="text-muted-foreground text-xs">{CURRENT_JOURNAL.name}</span>
          </DropdownMenuItem>
          {OTHER_JOURNALS.map((j) => (
            <DropdownMenuItem key={j.slug} className="flex-col items-start gap-0.5">
              <span className="font-medium">{j.abbreviation}</span>
              <span className="text-muted-foreground text-xs">{j.name}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem>Provision a new journal</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
        <Input
          id="global-search"
          placeholder="Search by reference, title or author"
          className="h-8 pl-8"
          aria-label="Search manuscripts"
        />
      </div>

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
            <DropdownMenuItem>Profile and expertise</DropdownMenuItem>
            <DropdownMenuItem>Switch role</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">Sign out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
