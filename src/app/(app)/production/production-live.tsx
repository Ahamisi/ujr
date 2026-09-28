'use client'

import { CircleCheck, FileCheck2, PenLine, Type } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import type { ProductionItem, ProductionStage } from '@/lib/mock-operations'
import { cn } from '@/lib/utils'

const STAGES: { id: ProductionStage; label: string; icon: typeof PenLine; blocking: string; staleAfter: number }[] = [
  { id: 'copyediting', label: 'Copyediting', icon: PenLine, blocking: 'With the copyeditor', staleAfter: 14 },
  { id: 'typesetting', label: 'Typesetting', icon: Type, blocking: 'With the typesetter', staleAfter: 14 },
  { id: 'proofing', label: 'Proofing', icon: FileCheck2, blocking: 'With the author', staleAfter: 10 },
  { id: 'ready', label: 'Ready to publish', icon: CircleCheck, blocking: 'Waiting on issue assembly', staleAfter: 30 },
]

function daysSince(iso: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000))
}

interface Row {
  id: string
  stage: ProductionStage
  reference: string
  title: string
  doi: string | null
  updatedAt: string
  assignee: string | null
}

export function ProductionLive() {
  const { data, error, loading } = useRemote<Row[]>('/production')
  const items: ProductionItem[] = (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    title: row.title,
    stage: row.stage,
    assignee: row.assignee ?? '—',
    daysInStage: daysSince(row.updatedAt),
    targetIssue: '—',
    doiAssigned: Boolean(row.doi),
  }))

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Production"
        description={
          loading ? 'Accepted manuscripts between acceptance and publication.' : `${items.length} in production.`
        }
      />
      <Remote loading={loading} error={error}>
        <div className="flex flex-col gap-6">
          {STAGES.map((stage, index) => {
            const rows = items.filter((item) => item.stage === stage.id)
            const Icon = stage.icon
            return (
              <section key={stage.id} className="flex flex-col gap-2">
                <header className="flex items-baseline gap-2.5">
                  <span className="text-muted-foreground tnum text-xs">{index + 1}</span>
                  <Icon className="text-muted-foreground size-4 self-center" />
                  <h2 className="text-sm font-medium">{stage.label}</h2>
                  <span className="text-muted-foreground text-xs">{stage.blocking}</span>
                  <span className="text-muted-foreground tnum ml-auto text-xs">{rows.length}</span>
                </header>
                {rows.length === 0 ? (
                  <p className="text-muted-foreground border-border rounded-lg border border-dashed px-4 py-3 text-sm">
                    Nothing at this stage.
                  </p>
                ) : (
                  rows.map((item) => <ProductionRow key={item.id} item={item} staleAfter={stage.staleAfter} />)
                )}
              </section>
            )
          })}
        </div>
      </Remote>
    </div>
  )
}

function ProductionRow({ item, staleAfter }: { item: ProductionItem; staleAfter: number }) {
  const stale = item.daysInStage >= staleAfter
  return (
    <article className="bg-card flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="tnum">{item.reference}</span>
          <span>·</span>
          <span>{item.assignee}</span>
          {!item.doiAssigned && <Badge variant="outline">No DOI yet</Badge>}
        </p>
      </div>
      <span className={cn('tnum shrink-0 text-sm', stale ? 'text-warning font-medium' : 'text-muted-foreground')}>
        {item.daysInStage}d
      </span>
    </article>
  )
}
