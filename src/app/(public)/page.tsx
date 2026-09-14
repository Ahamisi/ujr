import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, Download, Quote, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ArticleCard } from '@/components/journal/article-card'
import { ARTICLES, JOURNAL, PUBLISHED_ISSUES, articlesInIssue } from '@/lib/mock-published'

export const metadata: Metadata = {
  title: JOURNAL.name,
  description: JOURNAL.scope,
}

export default function JournalHome() {
  const featured = ARTICLES.find((a) => a.featured) ?? ARTICLES[0]
  const latest = PUBLISHED_ISSUES[0]
  const inLatest = articlesInIssue(latest.volume, latest.issue)
  const mostRead = [...ARTICLES].sort((a, b) => b.downloads - a.downloads).slice(0, 4)

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 md:px-6">
      <section className="max-w-3xl">
        <h1 className="font-serif text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
          {JOURNAL.name}
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">{JOURNAL.scope}</p>
        <p className="text-muted-foreground tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>ISSN {JOURNAL.issnElectronic} (online)</span>
          <span>ISSN {JOURNAL.issnPrint} (print)</span>
          <span>Open access · {JOURNAL.licence}</span>
        </p>
      </section>

      {/* Search is the front door for anyone arriving with a citation in hand. */}
      <form action="/search" className="mt-8 flex max-w-2xl flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            id="home-search"
            placeholder="Search by DOI, ISSN, title, author or keyword"
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
      <p className="text-muted-foreground mt-2 text-xs">
        Paste a DOI such as <span className="tnum">{featured.doi}</span> to go straight to the article.
      </p>

      {/* Article of the day */}
      <section className="mt-12">
        <h2 className="rule-label">
          Featured article
        </h2>
        <div className="bg-card mt-3 border p-6">
          <Badge variant="secondary">{featured.section}</Badge>
          <h3 className="mt-3">
            <Link
              href={`/articles/${featured.id}`}
              className="font-serif text-2xl leading-snug font-medium text-balance hover:underline"
            >
              {featured.title}
            </Link>
          </h3>
          <p className="text-muted-foreground mt-2 text-sm">
            {featured.authors.map((a) => a.name).join(', ')}
          </p>
          <p className="mt-3 max-w-prose text-sm leading-relaxed">{featured.abstract}</p>
          <div className="text-muted-foreground mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="tnum flex items-center gap-1">
              <Download className="size-3" />
              {featured.downloads.toLocaleString()} downloads
            </span>
            <span className="tnum flex items-center gap-1">
              <Quote className="size-3" />
              {featured.citations} citations
            </span>
            <a
              href={`https://doi.org/${featured.doi}`}
              target="_blank"
              rel="noreferrer"
              className="text-primary tnum hover:underline"
            >
              https://doi.org/{featured.doi}
            </a>
          </div>
        </div>
      </section>

      {/* Three doors: publish with us, review for us, or just keep up. */}
      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        {[
          {
            href: '/for-authors',
            title: 'Submit your work',
            body: 'Double-blind review, no submission fee, a decision in about 63 days.',
            cta: 'Read the author guide',
          },
          {
            href: '/join',
            title: 'Review for us',
            body: 'Tell us your areas and how often you can help. Decline anything, without explanation.',
            cta: 'Join the reviewer pool',
          },
          {
            href: '/alerts',
            title: 'Keep up',
            body: 'The table of contents when an issue publishes, or only the sections you care about.',
            cta: 'Get email alerts',
          },
        ].map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="hover:border-primary/40 focus-visible:ring-ring group flex flex-col border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <h3 className="font-medium">{c.title}</h3>
            <p className="text-muted-foreground mt-1.5 flex-1 text-sm leading-relaxed">{c.body}</p>
            <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
              {c.cta}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="rule-label">
              Current issue
            </h2>
            <p className="text-muted-foreground tnum text-xs">
              {latest.label} · {latest.publishedAt}
            </p>
          </div>

          <div className="mt-2">
            {inLatest.map((a) => (
              <ArticleCard key={a.id} article={a} />
            ))}
          </div>

          <Link href="/archive" className="text-primary mt-4 inline-flex items-center gap-1 text-sm hover:underline">
            Browse the full archive
            <ArrowRight className="size-3.5" />
          </Link>
        </section>

        <aside className="flex flex-col gap-8">
          <section>
            <h2 className="rule-label">Most read</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {mostRead.map((a, i) => (
                <li key={a.id} className="flex gap-3">
                  <span className="text-muted-foreground tnum text-xs">{i + 1}</span>
                  <div className="min-w-0">
                    <Link href={`/articles/${a.id}`} className="text-[13px] font-medium hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-muted-foreground tnum mt-0.5 text-xs">
                      {a.downloads.toLocaleString()} downloads
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="border p-4">
            <h2 className="text-sm font-medium">For authors</h2>
            <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">
              Double-blind peer review. No charge to submit or to publish. Median time to first decision is 63
              days.
            </p>
            <Link
              href="/for-authors"
              className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium hover:underline"
            >
              Author guidelines
              <ArrowRight className="size-3.5" />
            </Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
