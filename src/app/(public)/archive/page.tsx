import type { Metadata } from 'next'
import { ArticleCard } from '@/components/journal/article-card'
import { JOURNAL, PUBLISHED_ISSUES, articlesInIssue } from '@/lib/mock-published'

export const metadata: Metadata = {
  title: 'Archive',
  description: `All published issues of the ${JOURNAL.name}.`,
}

export default function ArchivePage() {
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Archive</h1>
      <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
        Every issue since {JOURNAL.founded}. All articles are open access under {JOURNAL.licence} and carry a
        registered DOI, so a link to any of them will keep working.
      </p>

      <div className="mt-10 flex flex-col gap-12">
        {PUBLISHED_ISSUES.map((issue) => {
          const articles = articlesInIssue(issue.volume, issue.issue)
          return (
            <section key={issue.label}>
              <header className="border-b pb-2">
                <h2 className="tnum text-lg font-medium">{issue.label}</h2>
                <p className="text-muted-foreground mt-0.5 text-sm">
                  {issue.title ? `${issue.title} · ` : ''}
                  Published {issue.publishedAt} · {articles.length} articles
                </p>
              </header>
              <div className="mt-1">
                {articles.map((a) => (
                  <ArticleCard key={a.id} article={a} />
                ))}
                {articles.length === 0 && (
                  <p className="text-muted-foreground py-4 text-sm">
                    The full text of this issue is being migrated from the print archive.
                  </p>
                )}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
