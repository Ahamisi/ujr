'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const SECTIONS = [
  'Civil & Structural',
  'Electrical & Electronics',
  'Mechanical',
  'Chemical & Petroleum',
  'Metallurgical & Materials',
  'Systems & Computing',
]

const CAPACITY = [
  { value: '1', label: 'One review a year' },
  { value: '2', label: 'Two or three a year' },
  { value: '4', label: 'Four or more a year' },
]

export function JoinForm() {
  const [done, setDone] = React.useState(false)
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [affiliation, setAffiliation] = React.useState('')
  const [orcid, setOrcid] = React.useState('')
  const [expertise, setExpertise] = React.useState('')
  const [sections, setSections] = React.useState<string[]>([])
  const [capacity, setCapacity] = React.useState('2')

  const valid =
    name.trim().length > 2 && email.includes('@') && affiliation.trim().length > 2 && sections.length > 0

  if (done) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="text-success mx-auto size-10" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Thank you</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm leading-relaxed">
          The editorial office will be in touch. You will not be invited to review anything outside the areas you
          named, and you can say no to any invitation without explanation.
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) setDone(true)
      }}
      className="mt-8 flex flex-col gap-4"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-name">Full name</Label>
        <Input id="join-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-email">Email</Label>
        <Input
          id="join-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-affiliation">Affiliation</Label>
        <Input
          id="join-affiliation"
          value={affiliation}
          onChange={(e) => setAffiliation(e.target.value)}
          autoComplete="organization"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-orcid">ORCID iD</Label>
        <Input
          id="join-orcid"
          value={orcid}
          onChange={(e) => setOrcid(e.target.value)}
          placeholder="0000-0000-0000-0000"
          className="tnum"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Sections you can review for</legend>
        <div className="flex flex-wrap gap-2">
          {SECTIONS.map((s) => {
            const on = sections.includes(s)
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => setSections((c) => (on ? c.filter((x) => x !== s) : [...c, s]))}
                className={cn(
                  'focus-visible:ring-ring rounded-md border px-3 py-1.5 text-[13px] transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  on ? 'border-primary bg-accent font-medium' : 'border-input hover:bg-muted',
                )}
              >
                {s}
              </button>
            )
          })}
        </div>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-expertise">Specific expertise</Label>
        <Textarea
          id="join-expertise"
          value={expertise}
          onChange={(e) => setExpertise(e.target.value)}
          placeholder="Geotechnics, pile foundations, soil stabilisation…"
          className="min-h-20"
        />
        <p className="text-muted-foreground text-xs">
          Be specific. Vague entries get you invited to review things you do not want to read.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="join-capacity">How often are you willing to review?</Label>
        <Select value={capacity} onValueChange={setCapacity}>
          <SelectTrigger id="join-capacity" className="w-full max-w-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CAPACITY.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-muted-foreground text-xs">We hold you to this. You will not be asked more often.</p>
      </div>

      <Button type="submit" disabled={!valid} className="mt-2 self-start">
        Join the reviewer pool
      </Button>
    </form>
  )
}
