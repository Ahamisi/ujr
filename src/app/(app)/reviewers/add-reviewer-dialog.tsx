'use client'

import * as React from 'react'
import { UserPlus } from 'lucide-react'
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
import type { ReviewerRecord } from '@/lib/mock-operations'

export function AddReviewerDialog({ onAdd }: { onAdd: (r: ReviewerRecord) => void }) {
  const [open, setOpen] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [affiliation, setAffiliation] = React.useState('')
  const [expertise, setExpertise] = React.useState('')
  const toast = useToast()

  const valid = name.trim().length > 1 && email.includes('@') && affiliation.trim().length > 1

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    onAdd({
      id: `new-${Date.now()}`,
      name: name.trim(),
      affiliation: affiliation.trim(),
      country: 'NG',
      expertise: expertise
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      invited: 0,
      completed: 0,
      declined: 0,
      medianTurnaroundDays: null,
      lastInvited: '—',
      sharedPool: false,
    })
    toast(`${name.trim()} added to the reviewer pool`)
    setName('')
    setEmail('')
    setAffiliation('')
    setExpertise('')
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <UserPlus />
          Add a reviewer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Add a reviewer</DialogTitle>
            <DialogDescription>
              They are added to the pool but not invited to anything yet. No account is created — an invitation
              carries its own sign-in link.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-name">Full name</Label>
              <Input id="rv-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Ngozi Eze" autoFocus />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-email">Email</Label>
              <Input id="rv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="n.eze@unilag.edu.ng" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-affiliation">Affiliation</Label>
              <Input id="rv-affiliation" value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="University of Lagos" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="rv-expertise">Expertise</Label>
              <Input id="rv-expertise" value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="Geotechnics, Foundations" />
              <p className="text-muted-foreground text-xs">Comma separated. Used to match them to submissions.</p>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!valid}>
              Add to pool
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
