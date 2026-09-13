import type { Metadata } from 'next'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shell/page-header'
import { ISSUES, type IssueRecord } from '@/lib/mock-operations'

export const metadata: Metadata = { title: 'Issues' }

const STATUS: Record<IssueRecord['status'], { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  planning: { label: 'Planning', variant: 'secondary' },
  open: { label: 'Open for content', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
}

export default function IssuesPage() {
  const unpublished = ISSUES.filter((i) => i.status !== 'published')
  const published = ISSUES.filter((i) => i.status === 'published')

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Issues"
        description="Volumes and issues, and what is assigned to each."
        actions={
          <Button size="sm" variant="outline">
            <Plus />
            New issue
          </Button>
        }
      />

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">In progress</h2>
        {unpublished.map((i) => (
          <IssueRow key={i.id} issue={i} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Published</h2>
        {published.map((i) => (
          <IssueRow key={i.id} issue={i} />
        ))}
      </section>
    </div>
  )
}

function IssueRow({ issue }: { issue: IssueRecord }) {
  const meta = STATUS[issue.status]
  return (
    <article className="bg-card flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <span className="tnum font-medium">
            Volume {issue.volume}, Issue {issue.number}
          </span>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </p>
        <p className="text-muted-foreground mt-0.5 text-sm">
          {issue.title ?? 'Regular issue'}
        </p>
      </div>

      <div className="text-right">
        <p className="tnum text-sm font-medium">{issue.articleCount}</p>
        <p className="text-muted-foreground text-xs">articles</p>
      </div>

      <div className="w-28 text-right">
        <p className="tnum text-sm">{issue.publishedDate ?? issue.targetDate}</p>
        <p className="text-muted-foreground text-xs">{issue.publishedDate ? 'published' : 'target'}</p>
      </div>
    </article>
  )
}
