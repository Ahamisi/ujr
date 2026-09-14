import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Download, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ARTICLES, JOURNAL } from '@/lib/mock-published'
import { CitationTools } from './citation-tools'

export function generateStaticParams() {
  return ARTICLES.map((a) => ({ id: a.id }))
}

/**
 * Highwire Press citation_* tags are what Google Scholar reads. Without them an
 * article is indexed as an ordinary web page, the citation is not captured, and
 * authors stop submitting — which makes these tags the single highest-leverage
 * thing on the public site.
 */
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const a = ARTICLES.find((x) => x.id === id)
  if (!a) return { title: 'Article not found' }

  const pdfUrl = `/articles/${a.id}/pdf`
  const [firstPage, lastPage] = a.pages.split('–')

  return {
    title: a.title,
    description: a.abstract.slice(0, 300),
    other: {
      citation_title: a.title,
      citation_author: a.authors.map((x) => x.name),
      citation_author_institution: a.authors.map((x) => x.affiliation),
      citation_journal_title: JOURNAL.name,
      citation_journal_abbrev: JOURNAL.abbreviation,
      citation_publisher: JOURNAL.publisher,
      citation_issn: JOURNAL.issnElectronic,
      citation_volume: String(a.volume),
      citation_issue: String(a.issue),
      citation_firstpage: firstPage,
      citation_lastpage: lastPage ?? firstPage,
      citation_publication_date: a.publishedIso.replace(/-/g, '/'),
      citation_doi: a.doi,
      citation_pdf_url: pdfUrl,
      citation_keywords: a.keywords.join('; '),
      citation_language: 'en',
    },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const a = ARTICLES.find((x) => x.id === id)
  if (!a) notFound()

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-10 md:px-6">
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <Link href="/archive" className="hover:text-foreground">
          Archive
        </Link>
        <span>·</span>
        <span className="tnum">
          Volume {a.volume}, Issue {a.issue}
        </span>
        <span>·</span>
        <span>{a.publishedAt}</span>
      </p>

      <h1 className="mt-3 font-serif text-3xl leading-tight font-medium tracking-tight text-balance">{a.title}</h1>

      <div className="mt-4 flex flex-col gap-1">
        {a.authors.map((x) => (
          <p key={x.name} className="text-sm">
            <span className="font-medium">{x.name}</span>
            <span className="text-muted-foreground"> · {x.affiliation}</span>
            {x.orcid && (
              <a
                href={`https://orcid.org/${x.orcid}`}
                target="_blank"
                rel="noreferrer"
                className="text-primary tnum ml-2 text-xs hover:underline"
              >
                ORCID {x.orcid}
              </a>
            )}
          </p>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button size="sm">
          <Download />
          Download PDF
        </Button>
        <a
          href={`https://doi.org/${a.doi}`}
          target="_blank"
          rel="noreferrer"
          className="border-input bg-card hover:bg-accent focus-visible:ring-ring inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
        >
          <span className="tnum">{a.doi}</span>
          <ExternalLink className="size-3.5" />
        </a>
        <Badge variant="secondary">{a.section}</Badge>
      </div>

      <section className="mt-8">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Abstract</h2>
        <p className="mt-2 leading-relaxed">{a.abstract}</p>
      </section>

      <section className="mt-6">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Keywords</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {a.keywords.map((k) => (
            <Link key={k} href={`/search?q=${encodeURIComponent(k)}`}>
              <Badge variant="outline" className="hover:border-primary transition-colors">
                {k}
              </Badge>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium">Cite this article</h2>
        <CitationTools article={a} />
      </section>

      <section className="text-muted-foreground mt-10 border-t pt-5 text-xs leading-relaxed">
        <p>
          Published by {JOURNAL.publisher} in the {JOURNAL.name}. ISSN {JOURNAL.issnElectronic} (online), ISSN{' '}
          {JOURNAL.issnPrint} (print).
        </p>
        <p className="mt-1">
          Open access under{' '}
          <a href={JOURNAL.licenceUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            {JOURNAL.licence}
          </a>
          . You may share and adapt this work with attribution.
        </p>
        <p className="tnum mt-1">
          {a.downloads.toLocaleString()} downloads · {a.citations} citations
        </p>
      </section>
    </div>
  )
}
