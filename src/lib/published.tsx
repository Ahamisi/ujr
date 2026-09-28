'use client'

import * as React from 'react'
import Link from 'next/link'
import { api, formatWhen } from './api'

export interface PublishedArticle {
  id: string
  doi: string | null
  title: string
  abstract: string | null
  keywords: string[]
  publishedAt: string | null
  authors: { name: string; affiliation: string | null; orcid: string | null }[]
}

export function usePublished(query?: string) {
  const [articles, setArticles] = React.useState<PublishedArticle[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const path = query ? `/articles?q=${encodeURIComponent(query)}` : '/articles'
    api<PublishedArticle[]>(path)
      .then(setArticles)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load articles'))
  }, [query])

  return { articles, error }
}

export function ArticleList({ articles }: { articles: PublishedArticle[] }) {
  if (articles.length === 0) {
    return <p className="text-muted-foreground mt-8 text-sm">Nothing has been published yet.</p>
  }
  return (
    <ul className="mt-8 flex flex-col gap-6">
      {articles.map((article) => (
        <li key={article.id}>
          <Link href={`/articles/${article.id}`} className="hover:text-primary font-medium">
            {article.title}
          </Link>
          <p className="text-muted-foreground mt-1 text-sm">
            {article.authors.map((author) => author.name).join(', ') || 'Authors not listed'}
            {article.publishedAt ? ` · ${formatWhen(article.publishedAt)}` : ''}
          </p>
          {article.doi && <p className="text-muted-foreground tnum mt-1 text-xs">{article.doi}</p>}
        </li>
      ))}
    </ul>
  )
}
