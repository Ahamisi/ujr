'use client'

import * as React from 'react'
import { catalogueKey } from '@/lib/catalogue'
import { cn } from '@/lib/utils'

export interface Suggestion {
  id: string
  label: string
  hint?: string
}

/**
 * A text field over a list. Enter picks a match. A name that is not already
 * in the list is added once; the same spelling, ignoring case, is not added again.
 */
export function SuggestInput({
  id,
  value,
  placeholder,
  options,
  onChange,
  onCommit,
}: {
  id: string
  value: string
  placeholder?: string
  options: Suggestion[]
  onChange: (value: string) => void
  onCommit: (value: string) => Promise<string>
}) {
  const [open, setOpen] = React.useState(false)
  const [active, setActive] = React.useState(0)
  const box = React.useRef<HTMLDivElement>(null)

  const key = catalogueKey(value)
  const exact = options.find((option) => catalogueKey(option.label) === key)
  const canAdd = key.length > 1 && !exact
  const rows = canAdd ? [...options, { id: '__add__', label: value.trim(), hint: 'Add this' }] : options
  const cursor = Math.min(active, Math.max(rows.length - 1, 0))

  React.useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function choose(label: string) {
    setOpen(false)
    const saved = await onCommit(label)
    onChange(saved)
  }

  return (
    <div ref={box} className="relative max-w-xl">
      <input
        id={id}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/40 h-9 w-full rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]"
        onChange={(e) => {
          onChange(e.target.value)
          setOpen(true)
          setActive(0)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
            setActive((index) => Math.min(index + 1, Math.max(rows.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((index) => Math.max(index - 1, 0))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            const row = rows[cursor]
            if (row) void choose(row.label)
            else if (value.trim()) void choose(value)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && rows.length > 0 && (
        <ul
          id={`${id}-list`}
          role="listbox"
          className="bg-popover absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border py-1 shadow-md"
        >
          {rows.map((row, index) => (
            <li key={row.id === '__add__' ? `add-${catalogueKey(row.label)}` : row.id}>
              <button
                type="button"
                role="option"
                aria-selected={index === cursor}
                className={cn(
                  'flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left text-sm',
                  index === cursor ? 'bg-accent' : 'hover:bg-muted',
                )}
                onMouseEnter={() => setActive(index)}
                onMouseDown={(e) => {
                  e.preventDefault()
                  void choose(row.label)
                }}
              >
                <span>{row.id === '__add__' ? `Add “${row.label}”` : row.label}</span>
                {row.hint && row.id !== '__add__' && (
                  <span className="text-muted-foreground tnum shrink-0 text-xs">{row.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
