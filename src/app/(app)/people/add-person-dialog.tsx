'use client'

import * as React from 'react'
import { Eye, EyeOff, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api'
import { ROLES, type Person } from './roles'

export function AddPersonDialog({ onAdd }: { onAdd: (person: Person) => void }) {
  const [open, setOpen] = React.useState(false)
  const [givenName, setGivenName] = React.useState('')
  const [familyName, setFamilyName] = React.useState('')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [showPassword, setShowPassword] = React.useState(false)
  const [role, setRole] = React.useState<string>(ROLES[0].id)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const valid = givenName.trim().length > 0 && familyName.trim().length > 0 && email.includes('@')

  function reset() {
    setGivenName('')
    setFamilyName('')
    setEmail('')
    setPassword('')
    setShowPassword(false)
    setRole(ROLES[0].id)
    setError(null)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!valid || pending) return
    setPending(true)
    setError(null)
    try {
      const person = await api<Person>('/people', {
        method: 'POST',
        body: JSON.stringify({
          email: email.trim(),
          givenName: givenName.trim(),
          familyName: familyName.trim(),
          password: password || undefined,
          role,
        }),
      })
      onAdd(person)
      reset()
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that person')
    } finally {
      setPending(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) reset()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UserPlus />
          Add a person
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <DialogHeader>
            <DialogTitle>Add a person</DialogTitle>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="person-given">Given name</Label>
                <Input id="person-given" value={givenName} onChange={(e) => setGivenName(e.target.value)} autoFocus />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="person-family">Family name</Label>
                <Input id="person-family" value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-email">Email</Label>
              <Input
                id="person-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="person-password">Password</Label>
              <div className="relative">
                <Input
                  id="person-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
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
            <div className="flex flex-col gap-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="w-full" aria-label="Role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-destructive text-sm">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!valid || pending}>
              {pending ? 'Adding…' : 'Add'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
