'use client'

import * as React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { StatusBadge } from '@/components/journal/status-badge'
import { useToast } from '@/components/ui/toast'
import { api, formatWhen } from '@/lib/api'
import { STATUS_META } from '@/lib/manuscript-status'
import type { QueueRow } from '@/lib/queue'
import type { ManuscriptStatus } from '@/lib/types'

const ACTION: ManuscriptStatus[] = ['revision_requested', 'draft']

export function SubmissionsLive() {
  const { data, error, loading, setData } = useRemote<QueueRow[]>('/mine')
  const [pendingDelete, setPendingDelete] = React.useState<QueueRow | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const toast = useToast()
  const rows = data ?? []
  const needsYou = rows.filter((row) => ACTION.includes(row.status))

  async function removeDraft() {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await api(`/manuscripts/${pendingDelete.id}`, { method: 'DELETE' })
      setData(rows.filter((row) => row.id !== pendingDelete.id))
      setPendingDelete(null)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete that draft')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="My submissions"
        description={
          needsYou.length > 0
            ? `${needsYou.length} submission${needsYou.length === 1 ? '' : 's'} need something from you.`
            : 'Nothing needs you right now.'
        }
      />
      <Remote loading={loading} error={error}>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            You have not submitted anything yet.{' '}
            <Link href="/submit" className="text-primary hover:underline">
              Start a submission
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {rows.map((row) => (
              <article key={row.id} className="bg-card rounded-lg border px-4 py-3.5">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <Link href={`/my-submissions/${row.id}`} className="min-w-0 flex-1 rounded-sm focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none">
                    <p className="text-muted-foreground tnum flex flex-wrap items-center gap-2 text-xs">
                      {row.reference}
                      {row.round > 0 && <span>Round {row.round}</span>}
                      <span>{row.submittedAt ? `Submitted ${formatWhen(row.submittedAt)}` : 'Not submitted'}</span>
                    </p>
                    <h2 className="mt-1 font-medium text-balance hover:underline">{row.title}</h2>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={row.status} />
                    {row.status === 'draft' ? (
                      <Button variant="outline" size="sm" onClick={() => setPendingDelete(row)}>
                        Delete
                      </Button>
                    ) : (
                      ACTION.includes(row.status) && (
                        <Badge variant="warning" className="gap-1">
                          <AlertCircle className="size-3" />
                          Action needed
                        </Badge>
                      )
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">{STATUS_META[row.status].blocking}</p>
                {row.reviewers.some((reviewer) => reviewer.status === 'submitted') && (
                  <Link href={`/my-submissions/${row.id}`} className="text-primary mt-2 flex items-center gap-1 text-xs font-medium">
                    Read the reviews
                    <ArrowRight className="size-3" />
                  </Link>
                )}
              </article>
            ))}
          </div>
        )}
      </Remote>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {pendingDelete?.reference}?</DialogTitle>
            <DialogDescription>
              This draft has not been submitted. Deleting it removes the manuscript and the uploaded file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setPendingDelete(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void removeDraft()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
