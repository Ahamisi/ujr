'use client'

import * as React from 'react'
import { Gavel, Info } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { REVIEWS } from '@/lib/mock-manuscript'
import type { ManuscriptStatus } from '@/lib/types'

type Decision = 'accept' | 'minor_revision' | 'major_revision' | 'reject' | 'reject_with_resubmission'

const DECISIONS: { value: Decision; label: string; becomes: ManuscriptStatus }[] = [
  { value: 'accept', label: 'Accept', becomes: 'accepted' },
  { value: 'minor_revision', label: 'Minor revision', becomes: 'revision_requested' },
  { value: 'major_revision', label: 'Major revision', becomes: 'revision_requested' },
  { value: 'reject', label: 'Reject', becomes: 'desk_rejected' },
  { value: 'reject_with_resubmission', label: 'Reject, resubmission welcome', becomes: 'desk_rejected' },
]

const OPENING: Record<Decision, string> = {
  accept: 'I am pleased to tell you that your manuscript has been accepted for publication.',
  minor_revision:
    'Your manuscript has been reviewed and we would be glad to consider a revised version addressing the points below.',
  major_revision:
    'Your manuscript has been reviewed. Both reviewers raise substantive points that must be addressed before we can consider it further.',
  reject: 'After review we are unable to accept your manuscript for publication in this journal.',
  reject_with_resubmission:
    'We are unable to accept the manuscript in its present form, but we would welcome a substantially revised resubmission.',
}

/** Only the author-facing halves. The confidential comments must never appear here. */
function draftLetter(decision: Decision) {
  const body = REVIEWS.map((r, i) => `Reviewer ${i + 1}\n${r.toAuthor}`).join('\n\n')
  return `Dear Dr. Balogun,\n\n${OPENING[decision]}\n\nThe reviewers' comments follow.\n\n${body}\n\nYours sincerely,\nDr. Adaeze Okonkwo\nHandling Editor`
}

export function RecordDecisionDialog({
  onDecide,
}: {
  onDecide: (status: ManuscriptStatus, label: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [decision, setDecision] = React.useState<Decision>('major_revision')
  const [letter, setLetter] = React.useState(() => draftLetter('major_revision'))
  const [edited, setEdited] = React.useState(false)
  const toast = useToast()

  function changeDecision(v: Decision) {
    setDecision(v)
    // Regenerating would discard the editor's own words, so only redraft untouched letters.
    if (!edited) setLetter(draftLetter(v))
  }

  function send() {
    const chosen = DECISIONS.find((d) => d.value === decision)!
    onDecide(chosen.becomes, chosen.label)
    toast(`Decision recorded — ${chosen.label.toLowerCase()}, letter sent to the author`)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Gavel />
          Record a decision
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Record a decision</DialogTitle>
          <DialogDescription>
            UJER-2026-0147, round 1. Two reviews received of two required.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Label htmlFor="decision">Decision</Label>
            <Select value={decision} onValueChange={(v) => changeDecision(v as Decision)}>
              <SelectTrigger id="decision" className="min-w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECISIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="letter">Letter to the author</Label>
            <Textarea
              id="letter"
              value={letter}
              onChange={(e) => {
                setLetter(e.target.value)
                setEdited(true)
              }}
              className="min-h-64 font-normal"
            />
          </div>

          <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
            <Info className="mt-0.5 size-3.5 shrink-0" />
            Drafted from the author-facing half of each review. Comments marked confidential to the editor are
            excluded and cannot be inserted here.
          </p>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={send} disabled={letter.trim().length < 40}>
            Send decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
