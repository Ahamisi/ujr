import Link from 'next/link'
import { ThemeToggle } from '@/components/shell/theme-toggle'
import { JOURNAL } from '@/lib/mock-published'

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/archive', label: 'Archive' },
  { href: '/search', label: 'Search' },
  { href: '/for-authors', label: 'For authors' },
  { href: '/join', label: 'Review for us' },
]

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">

      <header className="border-border border-b">
        <div className="mx-auto flex w-full max-w-[1100px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold">
              {JOURNAL.abbreviation.slice(0, 2)}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{JOURNAL.abbreviation}</span>
              <span className="text-muted-foreground block truncate text-xs">{JOURNAL.publisher}</span>
            </span>
          </Link>

          <nav className="flex items-center gap-4 text-sm" aria-label="Journal">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-primary transition-colors">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <Link
              href="/sign-in"
              className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex h-8 items-center rounded-md px-3 text-[13px] font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
            >
              Submit a manuscript
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-border mt-16 border-t">
        <div className="text-muted-foreground mx-auto flex w-full max-w-[1100px] flex-wrap gap-x-10 gap-y-4 px-4 py-8 text-xs md:px-6">
          <div>
            <p className="text-foreground font-medium">{JOURNAL.name}</p>
            <p className="mt-1">{JOURNAL.publisher}</p>
          </div>
          <div className="tnum">
            <p>ISSN {JOURNAL.issnElectronic} (online)</p>
            <p>ISSN {JOURNAL.issnPrint} (print)</p>
            <p>DOI prefix {JOURNAL.doiPrefix}</p>
          </div>
          <div>
            <p>
              Articles are published under{' '}
              <a href={JOURNAL.licenceUrl} className="text-primary hover:underline">
                {JOURNAL.licence}
              </a>
            </p>
            <p className="mt-1">Published {JOURNAL.frequency.toLowerCase()} since {JOURNAL.founded}</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
