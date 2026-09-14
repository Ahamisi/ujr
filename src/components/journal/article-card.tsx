import Link from 'next/link'
import { Download, Quote } from 'lucide-react'
import type { Article } from '@/lib/mock-published'

export function ArticleCard({ article: a, showStats = true }: { article: Article; showStats?: boolean }) {
  return (
    <article className="border-rule border-b py-4 last:border-b-0">
      <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span>{a.section}</span>
        <span>·</span>
        <span className="tnum">
          {a.volume}({a.issue}), {a.pages}
        </span>
        <span>·</span>
        <span>{a.publishedAt}</span>
      </p>

      <h3 className="mt-1">
        <Link href={`/articles/${a.id}`} className="font-medium text-balance hover:underline">
          {a.title}
        </Link>
      </h3>

      <p className="text-muted-foreground mt-1 text-sm">{a.authors.map((x) => x.name).join(', ')}</p>

      {showStats && (
        <p className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
          <span className="tnum flex items-center gap-1">
            <Download className="size-3" />
            {a.downloads.toLocaleString()}
          </span>
          <span className="tnum flex items-center gap-1">
            <Quote className="size-3" />
            {a.citations} citations
          </span>
          <a
            href={`https://doi.org/${a.doi}`}
            className="text-primary tnum hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            {a.doi}
          </a>
        </p>
      )}
    </article>
  )
}
