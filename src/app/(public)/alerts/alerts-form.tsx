'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const TOPICS = [
  { id: 'toc', label: 'New issues', help: 'The table of contents when each issue publishes. Four a year.' },
  { id: 'section', label: 'My sections only', help: 'Just the articles in the areas you pick below.' },
  { id: 'cfp', label: 'Calls for papers', help: 'Special issues looking for submissions. A few a year.' },
]

const SECTIONS = [
  'Civil & Structural',
  'Electrical & Electronics',
  'Mechanical',
  'Chemical & Petroleum',
  'Metallurgical & Materials',
  'Systems & Computing',
]

export function AlertsForm() {
  const [done, setDone] = React.useState(false)
  const [email, setEmail] = React.useState('')
  const [topics, setTopics] = React.useState<string[]>(['toc'])
  const [sections, setSections] = React.useState<string[]>([])

  const valid = email.includes('@') && topics.length > 0

  if (done) {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="text-success mx-auto size-10" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Almost there</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm leading-relaxed">
          Check <span className="font-medium">{email}</span> and click the link to confirm. We ask for confirmation
          so nobody can sign you up for email you did not want.
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
      className="mt-8 flex flex-col gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="alerts-email">Email</Label>
        <Input
          id="alerts-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          className="max-w-sm"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">What to send</legend>
        {TOPICS.map((t) => {
          const on = topics.includes(t.id)
          return (
            <label
              key={t.id}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 transition-colors',
                on ? 'border-primary bg-accent/40' : 'border-border hover:bg-muted',
              )}
            >
              <input
                type="checkbox"
                checked={on}
                onChange={() => setTopics((c) => (on ? c.filter((x) => x !== t.id) : [...c, t.id]))}
                className="accent-primary mt-0.5 size-4"
              />
              <span>
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="text-muted-foreground block text-xs">{t.help}</span>
              </span>
            </label>
          )
        })}
      </fieldset>

      {topics.includes('section') && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-sm font-medium">Which sections</legend>
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
      )}

      <Button type="submit" disabled={!valid} className="self-start">
        Subscribe
      </Button>

      <p className="text-muted-foreground text-xs leading-relaxed">
        Every email carries a one-click unsubscribe link. Your address is not shared with anyone, and it is never
        used to advertise anything.
      </p>
    </form>
  )
}
