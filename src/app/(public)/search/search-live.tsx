'use client'

import { ArticleList, usePublished } from '@/lib/published'

export function SearchLive({ query }: { query: string }) {
  const { articles, error } = usePublished(query.trim())
  return (
    <div className="mx-auto w-full max-w-[900px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Search</h1>
      <form action="/search" className="mt-6">
        <input
          type="search"
          name="q"
          defaultValue={query}
          placeholder="Title, abstract, or DOI"
          className="border-input bg-background h-10 w-full max-w-xl rounded-md border px-3 text-sm"
        />
      </form>
      {error && <p className="text-destructive mt-8 text-sm">{error}</p>}
      {query.trim() === '' && <p className="text-muted-foreground mt-8 text-sm">Enter a title, a phrase, or a DOI.</p>}
      {query.trim() !== '' && articles && <ArticleList articles={articles} />}
    </div>
  )
}
