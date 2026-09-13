'use client'

import * as React from 'react'
import { Globe, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ReviewerRecord } from '@/lib/mock-operations'
import { cn } from '@/lib/utils'

/** Reliability, not volume. An editor picking a reviewer wants to know: will they file? */
function completionRate(r: ReviewerRecord) {
  return r.invited === 0 ? null : r.completed / r.invited
}

function Turnaround({ days }: { days: number | null }) {
  if (days === null) return <span className="text-muted-foreground text-xs">No reviews filed</span>
  // Against a 28-day default deadline.
  const tone = days <= 21 ? 'text-success' : days <= 32 ? 'text-muted-foreground' : 'text-warning'
  return <span className={cn('tnum text-sm', tone)}>{days}d</span>
}

export function ReviewersTable({ reviewers }: { reviewers: ReviewerRecord[] }) {
  const [query, setQuery] = React.useState('')

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return reviewers
      .filter(
        (r) =>
          q === '' ||
          r.name.toLowerCase().includes(q) ||
          r.affiliation.toLowerCase().includes(q) ||
          r.expertise.some((e) => e.toLowerCase().includes(q)),
      )
      .sort((a, b) => (completionRate(b) ?? -1) - (completionRate(a) ?? -1))
  }, [reviewers, query])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="reviewers-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, institution or expertise"
            className="h-8 pl-8"
            aria-label="Filter reviewers"
          />
        </div>
        <span className="text-muted-foreground tnum ml-auto text-xs">
          {rows.length} of {reviewers.length}
        </span>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Reviewer</TableHead>
              <TableHead className="w-[260px]">Expertise</TableHead>
              <TableHead className="w-[150px]">Completed</TableHead>
              <TableHead className="w-[120px]">Median time</TableHead>
              <TableHead className="w-[110px]">Last invited</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const rate = completionRate(r)
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">{r.name}</p>
                    <p className="text-muted-foreground text-xs">
                      {r.affiliation} · {r.country}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {r.expertise.map((e) => (
                        <Badge key={e} variant="secondary" className="font-normal">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="tnum text-sm">
                      {r.completed}/{r.invited}
                    </span>
                    {rate !== null && (
                      <span
                        className={cn(
                          'tnum ml-2 text-xs',
                          rate >= 0.75 ? 'text-success' : rate >= 0.5 ? 'text-muted-foreground' : 'text-warning',
                        )}
                      >
                        {Math.round(rate * 100)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Turnaround days={r.medianTurnaroundDays} />
                  </TableCell>
                  <TableCell className="text-muted-foreground tnum text-[13px]">{r.lastInvited}</TableCell>
                  <TableCell className="py-2">
                    {r.sharedPool && (
                      <span title="Available to other journals on the platform">
                        <Globe className="text-muted-foreground size-3.5" />
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {rows.length === 0 && (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <p className="text-sm font-medium">No reviewer matches that</p>
            <p className="text-muted-foreground mt-1 mb-3 text-sm">
              Try a broader term, or invite someone new by email.
            </p>
            <Button size="sm" variant="outline">
              Invite a reviewer by email
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
