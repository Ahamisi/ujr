'use client'

import * as React from 'react'
import { MoreHorizontal, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PageHeader } from '@/components/shell/page-header'
import { api } from '@/lib/api'
import { AddPersonDialog } from './add-person-dialog'
import { ROLE_BADGE, ROLES, roleLabel, type Person } from './roles'

export function PeopleTable({
  people,
  onChange,
}: {
  people: Person[]
  onChange: (next: Person[]) => void
}) {
  const [query, setQuery] = React.useState('')
  const [role, setRole] = React.useState('all')
  const [removing, setRemoving] = React.useState<{ person: Person; role: string } | null>(null)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const rows = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return people
      .filter(
        (person) =>
          (role === 'all' || person.roles.includes(role)) &&
          (q === '' || person.name.toLowerCase().includes(q) || person.email.toLowerCase().includes(q)),
      )
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [people, query, role])

  function upsert(person: Person) {
    const without = people.filter((row) => row.id !== person.id)
    onChange([...without, person].sort((a, b) => a.name.localeCompare(b.name)))
  }

  async function confirmRemove() {
    if (!removing) return
    setPending(true)
    setError(null)
    try {
      await api(`/people/${removing.person.id}/${removing.role}`, { method: 'DELETE' })
      const nextRoles = removing.person.roles.filter((item) => item !== removing.role)
      onChange(
        nextRoles.length === 0
          ? people.filter((row) => row.id !== removing.person.id)
          : people.map((row) => (row.id === removing.person.id ? { ...row, roles: nextRoles } : row)),
      )
      setRemoving(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove that role')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="People" actions={<AddPersonDialog onAdd={upsert} />} />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            className="h-8 pl-8"
            aria-label="Filter people"
          />
        </div>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="min-w-[150px]" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any role</SelectItem>
            {ROLES.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground tnum ml-auto text-xs">
          {rows.length} of {people.length}
        </span>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Name</TableHead>
              <TableHead className="w-[280px]">Email</TableHead>
              <TableHead>Roles</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((person) => (
              <TableRow key={person.id}>
                <TableCell className="font-medium">{person.name}</TableCell>
                <TableCell className="text-muted-foreground">{person.email}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {person.roles.map((held) => (
                      <Badge key={held} variant={ROLE_BADGE[held] ?? 'outline'} className="font-normal">
                        {roleLabel(held)}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="py-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${person.name}`}>
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {person.roles.map((held) => (
                        <DropdownMenuItem
                          key={held}
                          variant="destructive"
                          onSelect={() => {
                            setError(null)
                            setRemoving({ person, role: held })
                          }}
                        >
                          Remove {roleLabel(held)}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <p className="text-sm font-medium">{people.length === 0 ? 'No one on this journal yet' : 'No one matches that'}</p>
            {(query || role !== 'all') && (
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => {
                  setQuery('')
                  setRole('all')
                }}
              >
                Clear the filter
              </Button>
            )}
          </div>
        )}
      </div>

      <Dialog open={removing !== null} onOpenChange={(open) => !open && !pending && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {removing ? roleLabel(removing.role) : 'role'}</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-sm">
              {removing ? `${removing.person.name} will no longer have this role.` : ''}
            </p>
            {error && <p className="text-destructive mt-3 text-sm">{error}</p>}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => setRemoving(null)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => void confirmRemove()} disabled={pending}>
              {pending ? 'Removing…' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
