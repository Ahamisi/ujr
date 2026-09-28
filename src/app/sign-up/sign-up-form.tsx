'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { SuggestInput, type Suggestion } from '@/components/journal/suggest-input'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import { catalogueKey } from '@/lib/catalogue'
import { HOME_FOR, useSession } from '@/lib/session'

export function SignUpForm() {
  const { signUp } = useSession()
  const router = useRouter()
  const [givenName, setGivenName] = React.useState('')
  const [familyName, setFamilyName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [affiliation, setAffiliation] = React.useState('')
  const [options, setOptions] = React.useState<Suggestion[]>([])
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  React.useEffect(() => {
    const handle = setTimeout(() => {
      api<{ id: string; name: string; useCount: number }[]>(`/institutions?q=${encodeURIComponent(affiliation)}`)
        .then((rows) =>
          setOptions(
            rows.map((row) => ({
              id: row.id,
              label: row.name,
              hint: row.useCount > 0 ? String(row.useCount) : undefined,
            })),
          ),
        )
        .catch(() => {})
    }, 150)
    return () => clearTimeout(handle)
  }, [affiliation])

  function canonicalAffiliation(name: string) {
    const match = options.find((option) => catalogueKey(option.label) === catalogueKey(name))
    return match?.label ?? name.trim()
  }

  const valid =
    givenName.trim().length > 1 &&
    familyName.trim().length > 1 &&
    email.includes('@') &&
    password.length >= 8 &&
    affiliation.trim().length > 2

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid) return
    setError(null)
    setPending(true)
    try {
      const rows = await api<{ id: string; name: string; useCount: number }[]>(
        `/institutions?q=${encodeURIComponent(affiliation)}`,
      ).catch(() => [])
      const match = rows.find((row) => catalogueKey(row.name) === catalogueKey(affiliation))
      const place = match?.name ?? affiliation.trim()
      const session = await signUp({
        email: email.trim(),
        password,
        givenName: givenName.trim(),
        familyName: familyName.trim(),
        affiliation: place,
      })
      await api('/institutions', { method: 'POST', body: JSON.stringify({ name: place, count: true }) }).catch(() => {})
      router.push(HOME_FOR[session.role])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account')
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <span className="bg-primary text-primary-foreground mb-4 flex size-8 items-center justify-center rounded text-xs font-semibold">
          UJ
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Create an account</h1>
        <p className="text-muted-foreground mt-1 text-sm">UNILAG Journal of Engineering Research</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-given">Given name</Label>
            <Input id="su-given" value={givenName} onChange={(e) => setGivenName(e.target.value)} autoComplete="given-name" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="su-family">Family name</Label>
            <Input id="su-family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} autoComplete="family-name" />
          </div>
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
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-password">Password</Label>
          <div className="relative">
            <Input
              id="su-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="pr-9"
            />
            <button
              type="button"
              onClick={() => setShowPassword((shown) => !shown)}
              className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute top-1/2 right-2 -translate-y-1/2 rounded-sm focus-visible:ring-2 focus-visible:outline-none"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-muted-foreground text-xs">At least 8 characters.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="su-affiliation">Affiliation</Label>
          <SuggestInput
            id="su-affiliation"
            value={affiliation}
            placeholder="University of Lagos"
            options={options}
            onChange={setAffiliation}
            onCommit={async (name) => canonicalAffiliation(name)}
          />
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}

        <Button type="submit" disabled={!valid || pending}>
          {pending ? 'Creating account…' : 'Create account'}
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
