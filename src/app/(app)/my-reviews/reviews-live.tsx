'use client'

import { Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { formatWhen } from '@/lib/api'
import { ASSIGNMENT_META } from '@/lib/manuscript-status'
import type { AssignmentStatus } from '@/lib/types'

interface Assignment {
  id: string
  status: AssignmentStatus
  dueAt: string
  round: number
  title: string
  reference: string
}

export function ReviewsLive() {
  const { data, error, loading } = useRemote<Assignment[]>('/assignments')
  const rows = data ?? []
  const open = rows.filter((row) => row.status !== 'submitted' && row.status !== 'declined')

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Review requests"
        description={
          open.length > 0
            ? `${open.length} open. The invitation email is the only link that opens the manuscript.`
            : 'Nothing outstanding.'
        }
      />
      <Remote loading={loading} error={error}>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">No review has been assigned to this account.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <article key={row.id} className="bg-card rounded-lg border px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground tnum text-xs">
                      {row.reference} · round {row.round}
                    </p>
                    <h2 className="mt-1 font-medium">{row.title}</h2>
                  </div>
                  <Badge variant="secondary">{ASSIGNMENT_META[row.status]?.label ?? row.status}</Badge>
                </div>
                <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-xs">
                  <Clock className="size-3.5" />
                  Due {formatWhen(row.dueAt)}
                </p>
              </article>
            ))}
          </div>
        )}
      </Remote>
    </div>
  )
}
