'use client'

import * as React from 'react'
import { Search, UserPlus } from 'lucide-react'
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
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import type { ReviewerRecord } from '@/lib/mock-operations'
import { cn } from '@/lib/utils'

function rate(r: ReviewerRecord) {
  return r.invited === 0 ? null : Math.round((r.completed / r.invited) * 100)
}

export function InviteReviewerDialog({
  onInvite,
  open: controlledOpen,
  onOpenChange,
  subject,
}: {
  onInvite: (reviewer: ReviewerRecord) => void | Promise<void>
  /** Controlled mode: no trigger is rendered, the caller owns the open state. */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Manuscript reference, when invited from a list rather than its own page. */
  subject?: string
}) {
  const controlled = controlledOpen !== undefined
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false)
  const open = controlled ? controlledOpen : uncontrolledOpen
  const setOpen = React.useCallback(
    (v: boolean) => (controlled ? onOpenChange?.(v) : setUncontrolledOpen(v)),
    [controlled, onOpenChange],
  )
  const [query, setQuery] = React.useState('')
  const [picked, setPicked] = React.useState<string | null>(null)
  const [people, setPeople] = React.useState<ReviewerRecord[]>([])
  const toast = useToast()

  React.useEffect(() => {
    if (!open) return
    let cancel = false
    api<
      {
        id: string
        name: string
        affiliation: string | null
        country: string | null
        expertise: string[]
        sharedReviewerPool: boolean
        invited: number
        completed: number
        declined: number
      }[]
    >('/reviewers')
      .then((rows) => {
        if (cancel) return
        setPeople(
          rows.map((row) => ({
            id: row.id,
            name: row.name,
            affiliation: row.affiliation ?? '',
            country: row.country ?? '',
            expertise: row.expertise ?? [],
            invited: row.invited,
            completed: row.completed,
            declined: row.declined,
            medianTurnaroundDays: null,
            lastInvited: '—',
            sharedPool: row.sharedReviewerPool,
          })),
        )
      })
      .catch(() => {
        if (!cancel) setPeople([])
      })
    return () => {
      cancel = true
    }
  }, [open])

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return people.filter(
      (r) =>
        q === '' ||
        r.name.toLowerCase().includes(q) ||
        r.expertise.some((e) => e.toLowerCase().includes(q)) ||
        r.affiliation.toLowerCase().includes(q),
    ).sort((a, b) => (rate(b) ?? -1) - (rate(a) ?? -1))
  }, [people, query])

  const chosen = people.find((r) => r.id === picked)

  async function send() {
    if (!chosen) return
    try {
      await onInvite(chosen)
      toast(`Invitation sent to ${chosen.name}`)
      setPicked(null)
      setQuery('')
      setOpen(false)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not send the invitation')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!controlled && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <UserPlus />
            Invite a reviewer
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Invite a reviewer</DialogTitle>
          <DialogDescription>
            {subject ? `${subject}. ` : ''}They receive a link that opens the anonymised manuscript without an
            account. The invitation expires in 7 days and a replacement is then suggested.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
            <Input
              id="invite-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by expertise, name or institution"
              className="pl-8"
              autoFocus
            />
          </div>

          <ul className="flex flex-col gap-1">
            {results.map((r) => {
              const pct = rate(r)
              const active = picked === r.id
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => setPicked(r.id)}
                    aria-pressed={active}
                    className={cn(
                      'focus-visible:ring-ring w-full border px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none',
                      active ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted',
                    )}
                  >
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      {r.name}
                      {pct !== null && (
                        <span
                          className={cn(
                            'tnum text-xs font-normal',
                            pct >= 75 ? 'text-success' : pct >= 50 ? 'text-muted-foreground' : 'text-warning',
                          )}
                        >
                          {pct}% completion
                        </span>
                      )}
                      {r.medianTurnaroundDays !== null && (
                        <span className="text-muted-foreground tnum text-xs font-normal">
                          {r.medianTurnaroundDays}d median
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{r.affiliation}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {r.expertise.map((e) => (
                        <Badge key={e} variant="secondary" className="font-normal">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>

          {results.length === 0 && (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nobody in the pool matches that. Add them on the Reviewers page first.
            </p>
          )}
        </DialogBody>

        <DialogFooter>
          <span className="text-muted-foreground mr-auto text-xs">
            {chosen ? `Inviting ${chosen.name}` : 'Select a reviewer'}
          </span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" disabled={!chosen} onClick={send}>
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
