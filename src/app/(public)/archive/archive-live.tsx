'use client'

import { ArticleList, usePublished } from '@/lib/published'

export function ArchiveLive() {
  const { articles, error } = usePublished()
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Archive</h1>
      <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
        Every article with status published. Issues appear here once manuscripts are assigned to them and published.
      </p>
      {error && <p className="text-destructive mt-8 text-sm">{error}</p>}
      {articles && <ArticleList articles={articles} />}
    </div>
  )
}
