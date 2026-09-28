'use client'

import Link from 'next/link'
import { ArrowRight, Search } from 'lucide-react'
import { formatWhen } from '@/lib/api'
import { ArticleList, usePublished } from '@/lib/published'

const DOORS = [
  {
    href: '/for-authors',
    title: 'Submit your work',
    body: 'Double-blind review. No charge to submit.',
    cta: 'Read the author guide',
  },
  {
    href: '/join',
    title: 'Review for us',
    body: 'Tell us your areas and how often you can help.',
    cta: 'Join the reviewer pool',
  },
  {
    href: '/alerts',
    title: 'Keep up',
    body: 'The table of contents when an issue publishes.',
    cta: 'Get email alerts',
  },
]

export function HomeLive() {
  const { articles, error } = usePublished()

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 py-10 md:px-6">
      <section className="max-w-3xl">
        <h1 className="font-serif text-3xl leading-tight font-medium tracking-tight text-balance md:text-4xl">
          UNILAG Journal of Engineering Research
        </h1>
        <p className="text-muted-foreground mt-3 text-base leading-relaxed">
          Original research in civil, mechanical, electrical, chemical, metallurgical and systems engineering, with a
          standing interest in work grounded in West African conditions.
        </p>
        <p className="text-muted-foreground tnum mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span>ISSN 2971-0448 (online)</span>
          <span>ISSN 2971-043X (print)</span>
          <span>Open access · CC BY 4.0</span>
        </p>
      </section>

      <form action="/search" className="mt-8 flex max-w-2xl flex-wrap gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <input
            type="search"
            name="q"
            id="home-search"
            placeholder="Search by DOI, title, author or keyword"
            aria-label="Search the journal"
            className="border-input bg-transparent focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full rounded-[2px] border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground focus-visible:ring-ring h-10 rounded-[2px] px-4 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
        >
          Search
        </button>
      </form>

      <section className="mt-12 grid gap-3 sm:grid-cols-3">
        {DOORS.map((door) => (
          <Link
            key={door.href}
            href={door.href}
            className="hover:border-primary/40 focus-visible:ring-ring group flex flex-col border p-5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <h3 className="font-medium">{door.title}</h3>
            <p className="text-muted-foreground mt-1.5 flex-1 text-sm leading-relaxed">{door.body}</p>
            <span className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-medium">
              {door.cta}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>

      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="rule-label">Published</h2>
          {articles && articles[0]?.publishedAt && (
            <p className="text-muted-foreground tnum text-xs">Latest {formatWhen(articles[0].publishedAt)}</p>
          )}
        </div>
        {error && <p className="text-destructive mt-4 text-sm">{error}</p>}
        {articles && <ArticleList articles={articles} />}
        <Link href="/archive" className="text-primary mt-4 inline-flex items-center gap-1 text-sm hover:underline">
          Browse the full archive
          <ArrowRight className="size-3.5" />
        </Link>
      </section>
    </div>
  )
}
