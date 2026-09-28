'use client'

import * as React from 'react'
import mammoth from 'mammoth'

function extension(name: string) {
  const part = name.split('.').pop()?.toLowerCase() ?? ''
  return part === name.toLowerCase() ? '' : part
}

function inlineHref(href: string) {
  return `${href}${href.includes('?') ? '&' : '?'}inline=1`
}

function plainParagraphs(html: string) {
  const broken = html.replace(/<\/(p|h\d|li|tr)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n')
  const text = broken
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
}

function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  const needles = quotes.filter((quote) => quote.trim().length > 1).sort((a, b) => b.length - a.length)
  const nodes: React.ReactNode[] = []
  let rest = text
  let key = 0
  while (rest.length > 0) {
    let at = -1
    let found = ''
    const lower = rest.toLowerCase()
    for (const quote of needles) {
      const index = lower.indexOf(quote.toLowerCase())
      if (index !== -1 && (at === -1 || index < at)) {
        at = index
        found = rest.slice(index, index + quote.length)
      }
    }
    if (at === -1) {
      nodes.push(rest)
      break
    }
    if (at > 0) nodes.push(rest.slice(0, at))
    nodes.push(
      <mark key={key} className="bg-yellow-200 text-inherit">
        {found}
      </mark>,
    )
    key += 1
    rest = rest.slice(at + found.length)
  }
  return <>{nodes}</>
}

function DocxPreview({
  href,
  name,
  quotes,
  onQuote,
}: {
  href: string
  name: string
  quotes: string[]
  onQuote?: (quote: string) => void
}) {
  const [html, setHtml] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    let cancel = false
    fetch(href, { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not open the file')
        return response.arrayBuffer()
      })
      .then((buffer) => mammoth.convertToHtml({ arrayBuffer: buffer }))
      .then((result) => {
        if (!cancel) setHtml(result.value || '<p>This document has no readable text.</p>')
      })
      .catch((err: unknown) => {
        if (!cancel) setError(err instanceof Error ? err.message : 'Could not open the file')
      })
    return () => {
      cancel = true
    }
  }, [href])

  if (error) return <p className="text-destructive text-sm">{error}</p>
  if (!html) return <p className="text-muted-foreground text-sm">Opening {name}…</p>
  if (!onQuote) {
    const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Georgia,serif;line-height:1.55;margin:0;padding:1.5rem;color:#1c1917}img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #d6d3d1;padding:0.25rem 0.5rem}</style></head><body>${html}</body></html>`
    return <iframe title={name} sandbox="" srcDoc={srcDoc} className="h-[70vh] w-full rounded-md border bg-white" />
  }
  const paragraphs = plainParagraphs(html)
  return (
    <article
      className="h-[70vh] overflow-auto rounded-md border bg-white px-6 py-5 text-[15px] leading-relaxed text-stone-900"
      onMouseUp={() => {
        const selected = window.getSelection()?.toString().replace(/\s+/g, ' ').trim() ?? ''
        if (selected.length > 1) onQuote(selected)
      }}
    >
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="mb-3">
          <Highlighted text={paragraph} quotes={quotes} />
        </p>
      ))}
    </article>
  )
}

/** PDF in the page. A Word file is rendered as text. Select that text to comment on it. */
export function FilePreview({
  href,
  name,
  quotes = [],
  onQuote,
}: {
  href: string
  name: string
  quotes?: string[]
  onQuote?: (quote: string) => void
}) {
  const kind = extension(name)
  if (kind === 'pdf') {
    return <iframe title={name} src={inlineHref(href)} className="bg-card h-[70vh] w-full rounded-md border" />
  }
  if (kind === 'docx') return <DocxPreview href={inlineHref(href)} name={name} quotes={quotes} onQuote={onQuote} />
  return (
    <a href={href} className="text-primary text-sm hover:underline">
      Download {name}
    </a>
  )
}
