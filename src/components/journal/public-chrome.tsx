'use client'

import * as React from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { api } from '@/lib/api'
import { HOME_FOR, useSession } from '@/lib/session'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/archive', label: 'Archive' },
  { href: '/search', label: 'Search' },
  { href: '/for-authors', label: 'For authors' },
  { href: '/join', label: 'Review for us' },
]

interface Journal {
  slug: string
  name: string
  abbreviation: string | null
  issnPrint: string | null
  issnElectronic: string | null
  doiPrefix: string | null
}

const FALLBACK: Journal = {
  slug: 'ujer',
  name: 'UNILAG Journal of Engineering Research',
  abbreviation: 'UJER',
  issnPrint: '2971-043X',
  issnElectronic: '2971-0448',
  doiPrefix: '10.60821',
}

export function PublicChrome({ children }: { children: React.ReactNode }) {
  const { session } = useSession()
  const [journal, setJournal] = React.useState<Journal>(FALLBACK)

  React.useEffect(() => {
    api<Journal>('')
      .then(setJournal)
      .catch(() => {})
  }, [])

  const abbreviation = journal.abbreviation ?? 'UJER'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold">
              {abbreviation.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{abbreviation}</span>
              <span className="text-muted-foreground block truncate text-xs">University of Lagos</span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm" aria-label="Journal">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-primary transition-colors">
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Link
                href={HOME_FOR[session.role]}
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                href="/sign-in"
                className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
              >
                Submit a manuscript
              </Link>
            )}
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-border mt-16 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-[1100px] flex-wrap gap-x-10 gap-y-4 px-4 py-8 text-xs md:px-6">
          <div>
            <p className="text-foreground font-medium">{journal.name}</p>
            <p className="mt-1">University of Lagos</p>
          </div>
          <div className="tnum">
            <p>ISSN {journal.issnElectronic ?? '—'} (online)</p>
            <p>ISSN {journal.issnPrint ?? '—'} (print)</p>
            <p>DOI prefix {journal.doiPrefix ?? '—'}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
