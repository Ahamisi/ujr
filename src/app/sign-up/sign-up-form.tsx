'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { CURRENT_JOURNAL } from '@/lib/mock-data'
import { HOME_FOR, useSession } from '@/lib/session'

export function SignUpForm() {
  const { signIn } = useSession()
  const router = useRouter()
  const [name, setName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [affiliation, setAffiliation] = React.useState('')
  const [orcid, setOrcid] = React.useState('')

  const valid = name.trim().length > 2 && email.includes('@') && affiliation.trim().length > 2

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    // Everyone who signs up starts as an author. Editorial roles are granted by
    // a journal manager, never self-assigned.
    signIn({ name: name.trim(), email: email.trim(), role: 'author' })
    router.push(HOME_FOR.author)
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <span className="bg-primary text-primary-foreground mb-4 flex size-8 items-center justify-center rounded text-xs font-semibold">
          {CURRENT_JOURNAL.abbreviation.slice(0, 2)}
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          To submit to {CURRENT_JOURNAL.abbreviation}, or to be listed as a reviewer.
        </p>
      </div>

      <Button variant="outline" onClick={() => setOrcid('0000-0002-1825-0097')} type="button">
        Continue with ORCID
      </Button>
      <p className="text-muted-foreground -mt-3 text-xs leading-relaxed">
        Recommended. It fills in your affiliation and publication history, and makes your authorship unambiguous
        when your work is deposited with Crossref.
      </p>

      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-muted-foreground text-xs">or</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-name">Full name</Label>
          <Input id="su-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-email">Email</Label>
          <Input
            id="su-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <p className="text-muted-foreground text-xs">
            Use an institutional address if you have one — it speeds up desk checks.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-affiliation">Affiliation</Label>
          <Input
            id="su-affiliation"
            value={affiliation}
            onChange={(e) => setAffiliation(e.target.value)}
            placeholder="University of Lagos"
            autoComplete="organization"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-orcid">ORCID iD</Label>
          <Input
            id="su-orcid"
            value={orcid}
            onChange={(e) => setOrcid(e.target.value)}
            placeholder="0000-0000-0000-0000"
            className="tnum"
          />
          <p className="text-muted-foreground text-xs">Optional, but you will be asked for it at submission.</p>
        </div>

        <Button type="submit" disabled={!valid}>
          Create account
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        Already have an account?{' '}
        <Link href="/sign-in" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
