'use client'

import * as React from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ReviewerTrack } from '@/components/journal/reviewer-track'
import { SimilarityScore } from '@/components/journal/similarity-score'
import { StatusBadge } from '@/components/journal/status-badge'
import { STATUS_META } from '@/lib/manuscript-status'
import type { ManuscriptRow, ManuscriptStatus } from '@/lib/types'

export function ManuscriptsTable({
  manuscripts,
  initialQuery = '',
}: {
  manuscripts: ManuscriptRow[]
  initialQuery?: string
}) {
  const [query, setQuery] = React.useState(initialQuery)
  const [status, setStatus] = React.useState<'all' | ManuscriptStatus>('all')
  const [section, setSection] = React.useState('all')

  const sections = React.useMemo(
    () => Array.from(new Set(manuscripts.map((m) => m.section))).sort(),
    [manuscripts],
  )

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return manuscripts.filter(
      (m) =>
        (status === 'all' || m.status === status) &&
        (section === 'all' || m.section === section) &&
        (q === '' ||
          m.title.toLowerCase().includes(q) ||
          m.reference.toLowerCase().includes(q) ||
          m.correspondingAuthor.toLowerCase().includes(q)),
    )
  }, [manuscripts, query, status, section])

  const statusesPresent = React.useMemo(
    () => Array.from(new Set(manuscripts.map((m) => m.status))),
    [manuscripts],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="manuscripts-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reference, title or author"
            className="h-8 pl-8"
            aria-label="Filter manuscripts"
          />
        </div>

        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="min-w-[150px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {statusesPresent.map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_META[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={section} onValueChange={setSection}>
          <SelectTrigger className="min-w-[150px]" aria-label="Filter by section">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any section</SelectItem>
            {sections.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <span className="text-muted-foreground tnum ml-auto text-xs">
          {rows.length} of {manuscripts.length}
        </span>
      </div>

      <div className="overflow-hidden border-y">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px]">Reference</TableHead>
              <TableHead>Manuscript</TableHead>
              <TableHead className="w-[150px]">Status</TableHead>
              <TableHead className="w-[130px]">Reviewers</TableHead>
              <TableHead className="w-[110px]">Submitted</TableHead>
              <TableHead className="w-[100px]">Similarity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <Link
                    href={`/manuscripts/${m.id}`}
                    className="ref text-primary text-[12.5px] font-medium hover:underline"
                  >
                    {m.reference}
                  </Link>
                </TableCell>
                <TableCell className="max-w-md">
                  <Link href={`/manuscripts/${m.id}`} className="block font-medium hover:underline">
                    {m.title}
                  </Link>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {m.correspondingAuthor}
                    {m.authorCount > 1 && ` +${m.authorCount - 1}`} · {m.section}
                  </p>
                </TableCell>
                <TableCell>
                  <StatusBadge status={m.status} />
                </TableCell>
                <TableCell>
                  <ReviewerTrack reviewers={m.reviewers} required={2} />
                </TableCell>
                <TableCell className="text-muted-foreground tnum text-[13px]">{m.submittedAt}</TableCell>
                <TableCell>
                  <SimilarityScore value={m.similarityPercent} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">No manuscripts match these filters</p>
            <p className="text-muted-foreground mt-1 text-sm">Widen the status or section filter, or clear the search.</p>
          </div>
        )}
      </div>
    </div>
  )
}
