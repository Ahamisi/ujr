'use client'

import * as React from 'react'
import Link from 'next/link'
import { api, ApiError, formatWhen } from '@/lib/api'
import type { PublishedArticle } from '@/lib/published'

export function ArticleLive({ id }: { id: string }) {
  const [article, setArticle] = React.useState<PublishedArticle | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    api<PublishedArticle>(`/articles/${id}`)
      .then(setArticle)
      .catch((err: unknown) => setError(err instanceof ApiError ? err.message : 'Could not load the article'))
  }, [id])

  if (error) {
    return (
      <div className="mx-auto w-full max-w-[760px] px-4 py-16 md:px-6">
        <h1 className="text-lg font-semibold">Article not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">{error}</p>
        <Link href="/archive" className="text-primary mt-4 inline-block text-sm hover:underline">
          Back to the archive
        </Link>
      </div>
    )
  }

  if (!article) return <p className="text-muted-foreground px-4 py-16 text-sm">Loading</p>

  return (
    <article className="mx-auto w-full max-w-[760px] px-4 py-10 md:px-6">
      <p className="text-muted-foreground tnum text-xs">{article.publishedAt ? formatWhen(article.publishedAt) : 'Published'}</p>
      <h1 className="mt-2 font-serif text-3xl font-medium tracking-tight text-balance">{article.title}</h1>
      <p className="text-muted-foreground mt-3 text-sm">
        {article.authors.map((author) => author.name).join(', ') || 'Authors not listed'}
      </p>
      {article.doi && <p className="text-muted-foreground tnum mt-2 text-xs">https://doi.org/{article.doi}</p>}
      {article.abstract && <p className="mt-6 max-w-prose text-sm leading-relaxed">{article.abstract}</p>}
      {article.keywords.length > 0 && (
        <p className="text-muted-foreground mt-4 text-xs">{article.keywords.join(' · ')}</p>
      )}
    </article>
  )
}
