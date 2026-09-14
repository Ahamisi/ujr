import type { Metadata } from 'next'
import { CircleCheck, FileCheck2, PenLine, Type } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shell/page-header'
import { PRODUCTION, type ProductionItem, type ProductionStage } from '@/lib/mock-operations'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Production' }

/**
 * Production is a sequence, so the numbering is real: an article passes through
 * these in order. Copyediting cannot follow proofing.
 */
const STAGES: {
  id: ProductionStage
  label: string
  icon: typeof PenLine
  blocking: string
  /** Days at which an item in this stage is overdue. */
  staleAfter: number
}[] = [
  { id: 'copyediting', label: 'Copyediting', icon: PenLine, blocking: 'With the copyeditor', staleAfter: 14 },
  { id: 'typesetting', label: 'Typesetting', icon: Type, blocking: 'With the typesetter', staleAfter: 14 },
  { id: 'proofing', label: 'Proofing', icon: FileCheck2, blocking: 'With the author', staleAfter: 10 },
  { id: 'ready', label: 'Ready to publish', icon: CircleCheck, blocking: 'Waiting on issue assembly', staleAfter: 30 },
]

export default function ProductionPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Production"
        description={`${PRODUCTION.length} accepted manuscripts between acceptance and publication.`}
      />

      <div className="flex flex-col gap-6">
        {STAGES.map((stage, index) => {
          const items = PRODUCTION.filter((p) => p.stage === stage.id)
          const Icon = stage.icon
          return (
            <section key={stage.id} className="flex flex-col gap-2">
              <header className="flex items-baseline gap-2.5">
                <span className="text-muted-foreground tnum text-xs">{index + 1}</span>
                <Icon className="text-muted-foreground size-4 self-center" />
                <h2 className="text-sm font-medium">{stage.label}</h2>
                <span className="text-muted-foreground text-xs">{stage.blocking}</span>
                <span className="text-muted-foreground tnum ml-auto text-xs">{items.length}</span>
              </header>

              {items.length === 0 ? (
                <p className="text-muted-foreground border-border border border-dashed px-4 py-3 text-sm">
                  Nothing at this stage.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {items.map((p) => (
                    <ProductionRow key={p.id} item={p} staleAfter={stage.staleAfter} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function ProductionRow({ item, staleAfter }: { item: ProductionItem; staleAfter: number }) {
  const stale = item.daysInStage >= staleAfter
  return (
    <article className="bg-card flex flex-wrap items-center gap-x-4 gap-y-1.5 border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{item.title}</p>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-2 text-xs">
          <span className="tnum">{item.reference}</span>
          <span>·</span>
          <span>{item.assignee}</span>
          <span>·</span>
          <span>Issue {item.targetIssue}</span>
          {!item.doiAssigned && <Badge variant="outline">No DOI yet</Badge>}
        </p>
      </div>
      <span className={cn('tnum shrink-0 text-sm', stale ? 'text-warning font-medium' : 'text-muted-foreground')}>
        {item.daysInStage}d
      </span>
    </article>
  )
}
