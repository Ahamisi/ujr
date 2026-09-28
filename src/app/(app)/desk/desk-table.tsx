'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AlertTriangle, MoreHorizontal, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { InviteReviewerDialog } from '@/components/journal/invite-reviewer-dialog'
import { ReviewerTrack } from '@/components/journal/reviewer-track'
import { SimilarityScore } from '@/components/journal/similarity-score'
import { StatusBadge } from '@/components/journal/status-badge'
import { api } from '@/lib/api'
import { useSession } from '@/lib/session'
import { NEEDS_ACTION, STATUS_META } from '@/lib/manuscript-status'
import type { ManuscriptRow } from '@/lib/types'
import { cn } from '@/lib/utils'

type View = 'needs_you' | 'with_reviewers' | 'with_authors' | 'all'

const VIEWS: { id: View; label: string; match: (m: ManuscriptRow) => boolean }[] = [
  { id: 'needs_you', label: 'Needs you', match: (m) => NEEDS_ACTION.includes(m.status) },
  { id: 'with_reviewers', label: 'With reviewers', match: (m) => m.status === 'under_review' },
  {
    id: 'with_authors',
    label: 'With authors',
    match: (m) => m.status === 'revision_requested' || m.status === 'draft',
  },
  { id: 'all', label: 'All open', match: () => true },
]

/** Past this many days in one state, the cell earns a colour. */
const STALE_DAYS = 21

export function DeskTable({ manuscripts: initial }: { manuscripts: ManuscriptRow[] }) {
  const [view, setView] = React.useState<View>('needs_you')
  const [manuscripts, setManuscripts] = React.useState(initial)
  const router = useRouter()
  const { session } = useSession()
  const toast = useToast()
  /* Radix needs the dialog outside the menu, so the row being acted on is state. */
  const [inviteFor, setInviteFor] = React.useState<ManuscriptRow | null>(null)
  const [rejectFor, setRejectFor] = React.useState<ManuscriptRow | null>(null)
  const [rejectReason, setRejectReason] = React.useState('')
  const [rejecting, setRejecting] = React.useState(false)

  const counts = React.useMemo(
    () => Object.fromEntries(VIEWS.map((v) => [v.id, manuscripts.filter(v.match).length])) as Record<View, number>,
    [manuscripts],
  )

  const rows = React.useMemo(
    () => manuscripts.filter(VIEWS.find((v) => v.id === view)!.match),
    [manuscripts, view],
  )

  return (
    <div className="flex flex-col gap-4">
      <Tabs value={view} onValueChange={(v) => setView(v as View)}>
        <TabsList className="w-full justify-start overflow-x-auto">
          {VIEWS.map((v) => (
            <TabsTrigger key={v.id} value={v.id}>
              {v.label}
              <span
                className={cn(
                  'tnum rounded px-1.5 py-0.5 text-[11px]',
                  view === v.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                )}
              >
                {counts[v.id]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="overflow-hidden border-y">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[150px]">Reference</TableHead>
              <TableHead>Manuscript</TableHead>
              <TableHead className="w-[160px]">Status</TableHead>
              <TableHead className="w-[130px]">Reviewers</TableHead>
              <TableHead className="w-[110px]">In status</TableHead>
              <TableHead className="w-[100px]">Similarity</TableHead>
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((m) => {
              const stale = m.daysInStatus >= STALE_DAYS
              return (
                <TableRow key={m.id}>
                  <TableCell>
                    <Link
                      href={`/manuscripts/${m.id}`}
                      className="ref text-primary text-[12.5px] font-medium hover:underline"
                    >
                      {m.reference}
                    </Link>
                    {m.round > 0 && (
                      <span className="text-muted-foreground ml-1.5 text-[11px]">R{m.round}</span>
                    )}
                  </TableCell>

                  <TableCell className="max-w-md">
                    <Link href={`/manuscripts/${m.id}`} className="block font-medium hover:underline">
                      {m.title}
                    </Link>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {m.correspondingAuthor}
                      {m.authorCount > 1 && ` +${m.authorCount - 1}`} · {m.section}
                      {!m.handlingEditor && (
                        <Badge variant="warning" className="ml-2 align-middle">
                          Unassigned
                        </Badge>
                      )}
                    </p>
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={m.status} />
                    <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
                      {STATUS_META[m.status].blocking}
                    </p>
                  </TableCell>

                  <TableCell>
                    <ReviewerTrack reviewers={m.reviewers} required={2} />
                    {m.hasOverdueReview && (
                      <span className="text-warning mt-1 flex items-center gap-1 text-[11px]">
                        <AlertTriangle className="size-3" />
                        Overdue
                      </span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className={cn('tnum text-sm', stale ? 'text-warning font-medium' : 'text-muted-foreground')}>
                      {m.daysInStatus} {m.daysInStatus === 1 ? 'day' : 'days'}
                    </span>
                  </TableCell>

                  <TableCell>
                    <SimilarityScore value={m.similarityPercent} />
                  </TableCell>

                  <TableCell className="py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${m.reference}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onSelect={() => setInviteFor(m)}>
                          <UserPlus className="size-4" />
                          Invite a reviewer
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() => {
                            if (!session) return
                            void api(`/manuscripts/${m.id}/assign`, {
                              method: 'POST',
                              body: JSON.stringify({ editorId: session.userId }),
                            })
                              .then(() => {
                                setManuscripts((list) =>
                                  list.map((row) => (row.id === m.id ? { ...row, handlingEditor: session.name } : row)),
                                )
                                toast(`${m.reference} assigned to you`)
                              })
                              .catch((err: unknown) => toast(err instanceof Error ? err.message : 'Could not assign this manuscript'))
                          }}
                        >
                          Assign handling editor
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={m.reviewers.length === 0}
                          onSelect={() => {
                            void api<{ reminded: number }>(`/manuscripts/${m.id}/remind`, { method: 'POST' })
                              .then((result) =>
                                toast(
                                  result.reminded === 0
                                    ? `No open review on ${m.reference}`
                                    : `Reminder sent to ${result.reminded} reviewer${result.reminded === 1 ? '' : 's'} on ${m.reference}`,
                                ),
                              )
                              .catch((err: unknown) => toast(err instanceof Error ? err.message : 'Could not send the reminder'))
                          }}
                        >
                          Send a reminder
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onSelect={() => router.push(`/manuscripts/${m.id}`)}
                          title="Opens the manuscript — a decision needs the reviews in front of you"
                        >
                          Record a decision
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          variant="destructive"
                          onSelect={() => {
                            setRejectReason('')
                            setRejectFor(m)
                          }}
                        >
                          Desk reject
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">Nothing waiting on you</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Every manuscript in this view is with a reviewer or an author.
            </p>
          </div>
        )}
      </div>

      <InviteReviewerDialog
        open={inviteFor !== null}
        onOpenChange={(open) => !open && setInviteFor(null)}
        subject={inviteFor?.reference}
        onInvite={async (reviewer) => {
          const target = inviteFor
          if (!target) return
          const created = await api<{ dueAt: string }>(`/manuscripts/${target.id}/invitations`, {
            method: 'POST',
            body: JSON.stringify({ reviewerId: reviewer.id }),
          })
          setManuscripts((list) =>
            list.map((x) =>
              x.id === target.id
                ? {
                    ...x,
                    reviewers: [
                      ...x.reviewers,
                      {
                        id: reviewer.id,
                        displayName: `Reviewer ${x.reviewers.length + 1}`,
                        realName: reviewer.name,
                        status: 'invited' as const,
                        dueAt: created.dueAt,
                      },
                    ],
                  }
                : x,
            ),
          )
          setInviteFor(null)
        }}
      />

      <Dialog
        open={rejectFor !== null}
        onOpenChange={(open) => {
          if (!open && !rejecting) setRejectFor(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desk reject {rejectFor?.reference}</DialogTitle>
            <DialogDescription>The author is told, and the reason is stored on the manuscript.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why this is not going out for review"
              className="min-h-28"
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)} disabled={rejecting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={rejectReason.trim().length < 8 || rejecting}
              onClick={() => {
                if (!rejectFor) return
                setRejecting(true)
                void api(`/manuscripts/${rejectFor.id}/transition`, {
                  method: 'POST',
                  body: JSON.stringify({ to: 'desk_rejected', reason: rejectReason.trim() }),
                })
                  .then(() => {
                    setManuscripts((list) =>
                      list.map((row) => (row.id === rejectFor.id ? { ...row, status: 'desk_rejected' as const } : row)),
                    )
                    toast(`${rejectFor.reference} desk rejected. The author has been told.`)
                    setRejectFor(null)
                  })
                  .catch((err: unknown) => toast(err instanceof Error ? err.message : 'Could not desk reject'))
                  .finally(() => setRejecting(false))
              }}
            >
              {rejecting ? 'Rejecting…' : 'Desk reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
