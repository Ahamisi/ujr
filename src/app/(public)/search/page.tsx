import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookMarked, Search as SearchIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ArticleCard } from '@/components/journal/article-card'
import { ARTICLES, JOURNAL, findByDoi, matchesIssn } from '@/lib/mock-published'

export const metadata: Metadata = { title: 'Search' }

function textMatches(q: string) {
  const needle = q.toLowerCase()
  return ARTICLES.filter(
    (a) =>
      a.title.toLowerCase().includes(needle) ||
      a.abstract.toLowerCase().includes(needle) ||
      a.keywords.some((k) => k.toLowerCase().includes(needle)) ||
      a.authors.some((x) => x.name.toLowerCase().includes(needle)) ||
      a.section.toLowerCase().includes(needle),
  )
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  const query = q.trim()

  /* An identifier is an exact address, not a search term. Resolve it. */
  const byDoi = query ? findByDoi(query) : undefined
  if (byDoi) redirect(`/articles/${byDoi.id}`)

  const isIssn = query ? matchesIssn(query) : false
  const results = query && !isIssn ? textMatches(query) : []

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Search</h1>

      <form action="/search" className="mt-5 flex flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            id="search-q"
            defaultValue={query}
            placeholder="DOI, ISSN, title, author or keyword"
            aria-label="Search the journal"
            className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:ring-ring h-10 rounded-md px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
        >
          Search
        </button>
      </form>

      <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
        A DOI or ISSN is treated as an address, not a phrase — paste one and you go straight there. Everything else
        searches titles, abstracts, authors and keywords.
      </p>

      {isIssn && (
        <section className="bg-card mt-8 border p-5">
          <div className="flex items-start gap-3">
            <BookMarked className="text-primary mt-0.5 size-5 shrink-0" />
            <div className="min-w-0">
              <Badge variant="success">ISSN match</Badge>
              <h2 className="mt-2 font-serif text-xl font-medium">{JOURNAL.name}</h2>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{JOURNAL.scope}</p>
              <p className="text-muted-foreground tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span>ISSN {JOURNAL.issnElectronic} (online)</span>
                <span>ISSN {JOURNAL.issnPrint} (print)</span>
                <span>DOI prefix {JOURNAL.doiPrefix}</span>
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm">
                <Link href="/archive" className="text-primary hover:underline">
                  Browse all issues
                </Link>
                <Link href="/" className="text-primary hover:underline">
                  Journal home
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {query && !isIssn && (
        <section className="mt-8">
          <p className="text-muted-foreground text-sm">
            <span className="tnum font-medium">{results.length}</span>{' '}
            {results.length === 1 ? 'result' : 'results'} for <span className="font-medium">{query}</span>
          </p>

          <div className="mt-2">
            {results.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>

          {results.length === 0 && (
            <div className="mt-4 border border-dashed px-6 py-12 text-center">
              <p className="text-sm font-medium">Nothing matched</p>
              <p className="text-muted-foreground mx-auto mt-1 max-w-prose text-sm leading-relaxed">
                Try a broader term, an author surname, or paste the DOI if you have it. The archive only holds
                articles published by this journal.
              </p>
            </div>
          )}
        </section>
      )}

      {!query && (
        <section className="mt-8">
          <h2 className="rule-label">
            Try one of these
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {[JOURNAL.issnElectronic, ARTICLES[0].doi, 'thermal comfort', 'Balogun', 'Civil & Structural'].map(
              (example) => (
                <Link key={example} href={`/search?q=${encodeURIComponent(example)}`}>
                  <Badge variant="outline" className="tnum hover:border-primary transition-colors">
                    {example}
                  </Badge>
                </Link>
              ),
            )}
          </div>
        </section>
      )}
    </div>
  )
}
