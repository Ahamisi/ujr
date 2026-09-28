'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { HOME_FOR, useSession } from '@/lib/session'

export function SignInForm() {
  const { signIn } = useSession()
  const router = useRouter()
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const session = await signIn(email.trim(), password)
      router.push(HOME_FOR[session.role])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed')
      setPending(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-4 py-10">
      <div>
        <span className="bg-primary text-primary-foreground mb-4 flex size-8 items-center justify-center rounded text-xs font-semibold">
          UJ
        </span>
        <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-muted-foreground mt-1 text-sm">UNILAG Journal of Engineering Research</p>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@unilag.edu.ng"
            autoComplete="email"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="signin-password">Password</Label>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
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
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
        <Button type="submit" disabled={pending || !email.includes('@') || password.length < 8}>
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-muted-foreground text-sm">
        No account yet?{' '}
        <Link href="/sign-up" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  )
}
