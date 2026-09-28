'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { catalogueKey } from '@/lib/catalogue'

export function KeywordField({
  id,
  value,
  onChange,
  limit = 6,
}: {
  id: string
  value: string[]
  onChange: (next: string[]) => void
  limit?: number
}) {
  const [draft, setDraft] = React.useState('')

  function add(raw: string) {
    const next = raw
      .split(/[,;]/)
      .map((word) => word.trim().replace(/\s+/g, ' '))
      .filter(Boolean)
    if (next.length === 0) return
    const seen = new Set(value.map(catalogueKey))
    const merged = [...value]
    for (const word of next) {
      const key = catalogueKey(word)
      if (!key || seen.has(key) || merged.length >= limit) continue
      seen.add(key)
      merged.push(word)
    }
    onChange(merged)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="border-input bg-card focus-within:border-ring focus-within:ring-ring/40 flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border px-2 py-1.5 focus-within:ring-[3px]">
        {value.map((word) => (
          <span
            key={catalogueKey(word)}
            className="bg-secondary text-secondary-foreground inline-flex items-center gap-1 rounded-full py-0.5 pr-1 pl-2.5 text-[13px]"
          >
            {word}
            <button
              type="button"
              className="hover:bg-background focus-visible:ring-ring rounded-full p-0.5 focus-visible:ring-2 focus-visible:outline-none"
              aria-label={`Remove ${word}`}
              onClick={() => onChange(value.filter((item) => catalogueKey(item) !== catalogueKey(word)))}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {value.length < limit && (
          <input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                add(draft)
              } else if (e.key === 'Backspace' && draft === '' && value.length > 0) {
                onChange(value.slice(0, -1))
              }
            }}
            onBlur={() => add(draft)}
            placeholder={value.length === 0 ? 'Type a keyword and press Enter' : ''}
            className="min-w-[12rem] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
          />
        )}
      </div>
      <p className="text-muted-foreground tnum text-xs">
        {value.length} of {limit}
      </p>
    </div>
  )
}
