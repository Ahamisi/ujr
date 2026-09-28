'use client'

import * as React from 'react'
import { Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { api, formatWhen } from '@/lib/api'
import type { IssueRecord } from '@/lib/mock-operations'

const STATUS: Record<IssueRecord['status'], { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  planning: { label: 'Planning', variant: 'secondary' },
  open: { label: 'Open for content', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
}

interface IssueRow {
  id: string
  volume: number
  number: number
  title: string | null
  status: IssueRecord['status']
  articleCount: number
  targetDate: string | null
  publishedAt: string | null
}

function toIssue(row: IssueRow): IssueRecord {
  return {
    id: row.id,
    volume: row.volume,
    number: row.number,
    title: row.title,
    status: row.status,
    articleCount: row.articleCount ?? 0,
    targetDate: row.targetDate ? formatWhen(row.targetDate) : '—',
    publishedDate: row.publishedAt ? formatWhen(row.publishedAt) : null,
  }
}

export function IssuesList() {
  const { data, error, loading, setData } = useRemote<IssueRow[]>('/issues')
  const issues = (data ?? []).map(toIssue)

  const unpublished = issues.filter((i) => i.status !== 'published')
  const published = issues.filter((i) => i.status === 'published')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Issues"
        description="Volumes and issues, and what is assigned to each."
        actions={
          <NewIssueDialog
            existing={issues}
            onCreate={async (input) => {
              const created = await api<IssueRow>('/issues', { method: 'POST', body: JSON.stringify(input) })
              setData((list) => [created, ...(list ?? [])])
            }}
          />
        }
      />
      <Remote loading={loading} error={error}>
      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">In progress</h2>
        {unpublished.length === 0 && <p className="text-muted-foreground text-sm">No issue in progress.</p>}
        {unpublished.map((i) => (
          <IssueCard key={i.id} issue={i} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Published</h2>
        {published.map((i) => (
          <IssueCard key={i.id} issue={i} />
        ))}
      </section>
      </Remote>
    </div>
  )
}

function IssueCard({ issue }: { issue: IssueRecord }) {
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
        <p className="text-muted-foreground mt-0.5 text-sm">{issue.title ?? 'Regular issue'}</p>
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

function NewIssueDialog({
  onCreate,
  existing,
}: {
  onCreate: (input: { volume: number; number: number; title?: string; targetDate?: string }) => Promise<void>
  existing: IssueRecord[]
}) {
  const latest = existing[0]
  const [open, setOpen] = React.useState(false)
  const [volume, setVolume] = React.useState(latest ? String(latest.volume) : '1')
  const [number, setNumber] = React.useState(latest ? String(latest.number + 1) : '1')
  const [title, setTitle] = React.useState('')
  const [target, setTarget] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const toast = useToast()

  const clash = existing.some((i) => i.volume === Number(volume) && i.number === Number(number))
  const valid = Number(volume) > 0 && Number(number) > 0 && !clash

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setPending(true)
    try {
      await onCreate({
        volume: Number(volume),
        number: Number(number),
        title: title.trim() || undefined,
        targetDate: target || undefined,
      })
      toast(`Volume ${volume}, Issue ${number} created`)
      setTitle('')
      setOpen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not create the issue')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus />
          New issue
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>New issue</DialogTitle>
            <DialogDescription>
              Starts in planning. Accepted manuscripts can be assigned to it once it is open for content.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <div className="flex gap-3">
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="iss-volume">Volume</Label>
                <Input id="iss-volume" type="number" min={1} className="tnum" value={volume} onChange={(e) => setVolume(e.target.value)} />
              </div>
              <div className="flex flex-1 flex-col gap-1.5">
                <Label htmlFor="iss-number">Issue</Label>
                <Input id="iss-number" type="number" min={1} className="tnum" value={number} onChange={(e) => setNumber(e.target.value)} />
              </div>
            </div>
            {clash && <p className="text-destructive text-xs">That volume and issue already exists.</p>}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="iss-title">Title</Label>
              <Input id="iss-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Leave blank for a regular issue" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="iss-target">Target publication date</Label>
              <Input id="iss-target" type="date" className="tnum" value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!valid || pending}>
              Create issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
