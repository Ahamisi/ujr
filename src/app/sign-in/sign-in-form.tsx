'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CURRENT_JOURNAL } from '@/lib/mock-data'
import { DEMO_ACCOUNTS, HOME_FOR, useSession, type Session } from '@/lib/session'

export function SignInForm() {
  const { signIn } = useSession()
  const router = useRouter()
  const [email, setEmail] = React.useState('')

  function enter(account: Session) {
    signIn(account)
    router.push(HOME_FOR[account.role])
  }

  function byEmail(e: React.FormEvent) {
    e.preventDefault()
    const match = DEMO_ACCOUNTS.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
    enter(match ?? { ...DEMO_ACCOUNTS[0], email: email.trim() || DEMO_ACCOUNTS[0].email })
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <span className="bg-primary text-primary-foreground mb-4 flex size-8 items-center justify-center rounded text-xs font-semibold">
          {CURRENT_JOURNAL.abbreviation.slice(0, 2)}
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">{CURRENT_JOURNAL.name}</p>
      </div>

      <div className="flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((a) => (
          <button
            key={a.email}
            type="button"
            onClick={() => enter(a)}
            className="bg-card hover:border-primary/50 focus-visible:ring-ring group flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="bg-secondary text-secondary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium">
              {a.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium">{a.name}</span>
              <span className="text-muted-foreground block text-xs">{a.context}</span>
            </span>
            <ArrowRight className="text-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or by email</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={byEmail} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@unilag.edu.ng"
            autoComplete="email"
          />
          <p className="text-muted-foreground text-xs">
            A sign-in link is emailed to you. There are no passwords on this platform.
          </p>
        </div>
        <Button type="submit">Email me a sign-in link</Button>
      </form>

      <p className="text-muted-foreground text-sm">
        No account yet?{' '}
        <Link href="/sign-up" className="text-primary hover:underline">
          Create one
        </Link>
        . Reviewers invited by email do not need one — the invitation carries its own link.
      </p>
    </div>
  )
}
