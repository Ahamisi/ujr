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
import { ISSUES, type IssueRecord } from '@/lib/mock-operations'

const STATUS: Record<IssueRecord['status'], { label: string; variant: 'secondary' | 'warning' | 'success' }> = {
  planning: { label: 'Planning', variant: 'secondary' },
  open: { label: 'Open for content', variant: 'warning' },
  published: { label: 'Published', variant: 'success' },
}

export function IssuesList() {
  const [issues, setIssues] = React.useState(ISSUES)

  const unpublished = issues.filter((i) => i.status !== 'published')
  const published = issues.filter((i) => i.status === 'published')

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Issues"
        description="Volumes and issues, and what is assigned to each."
        actions={<NewIssueDialog onCreate={(i) => setIssues((list) => [i, ...list])} existing={issues} />}
      />

      <section className="flex flex-col gap-3">
        <h2 className="rule-label">In progress</h2>
        {unpublished.map((i) => (
          <IssueRow key={i.id} issue={i} />
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="rule-label">Published</h2>
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
    <article className="bg-card flex flex-wrap items-center gap-x-4 gap-y-2 border px-4 py-3">
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
  onCreate: (i: IssueRecord) => void
  existing: IssueRecord[]
}) {
  const latest = existing[0]
  const [open, setOpen] = React.useState(false)
  const [volume, setVolume] = React.useState(String(latest.volume))
  const [number, setNumber] = React.useState(String(latest.number + 1))
  const [title, setTitle] = React.useState('')
  const [target, setTarget] = React.useState('')
  const toast = useToast()

  const clash = existing.some((i) => i.volume === Number(volume) && i.number === Number(number))
  const valid = Number(volume) > 0 && Number(number) > 0 && target !== '' && !clash

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onCreate({
      id: `new-${Date.now()}`,
      volume: Number(volume),
      number: Number(number),
      title: title.trim() || null,
      status: 'planning',
      articleCount: 0,
      targetDate: target,
      publishedDate: null,
    })
    toast(`Volume ${volume}, Issue ${number} created`)
    setTitle('')
    setOpen(false)
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
            <Button type="submit" size="sm" disabled={!valid}>
              Create issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
