'use client'

import * as React from 'react'
import { Loader2, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { api } from '@/lib/api'
import { DEPOSIT_STATE, type DepositState } from '@/lib/doi'

interface Row {
  id: string
  reference: string
  title: string
  doi: string | null
  status: string
  deposit: { state: DepositState; error: string | null } | null
}

function stateOf(row: Row): DepositState {
  if (row.deposit?.state) return row.deposit.state
  return row.doi ? 'minted' : 'unminted'
}

export function DoiRegistry() {
  const { data, error, loading, reload } = useRemote<Row[]>('/doi')
  const [busy, setBusy] = React.useState<string | null>(null)
  const toast = useToast()
  const rows = data ?? []

  async function register(row: Row) {
    setBusy(row.id)
    try {
      if (!row.doi) await api(`/doi/mint/${row.id}`, { method: 'POST' })
      await api(`/doi/deposit/${row.id}`, { method: 'POST' })
      toast(`${row.reference} queued for Crossref`)
      reload()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Deposit failed')
      reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="DOI registry"
        description="Accepted and published manuscripts, and the state of each Crossref deposit."
      />
      <Remote loading={loading} error={error}>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nothing has been accepted yet, so there is nothing to mint.</p>
        ) : (
          <div className="bg-card overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Article</TableHead>
                  <TableHead className="w-[230px]">DOI</TableHead>
                  <TableHead className="w-[140px]">Deposit</TableHead>
                  <TableHead className="w-[160px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const state = stateOf(row)
                  const meta = DEPOSIT_STATE[state]
                  const working = busy === row.id
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="max-w-sm">
                        <p className="font-medium">{row.title}</p>
                        <p className="text-muted-foreground tnum mt-0.5 text-xs">{row.reference}</p>
                      </TableCell>
                      <TableCell>
                        {row.doi ? (
                          <a href={`https://doi.org/${row.doi}`} className="text-primary tnum text-[13px] hover:underline" target="_blank" rel="noreferrer">
                            {row.doi}
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-xs">Not yet minted</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={meta.variant}>{meta.label}</Badge>
                        <p className="text-muted-foreground mt-1 text-[11px]">{row.deposit?.error ?? meta.blocking}</p>
                      </TableCell>
                      <TableCell>
                        {state !== 'registered' && (
                          <Button variant="outline" size="sm" disabled={working} onClick={() => void register(row)}>
                            {working ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            {row.doi ? 'Deposit' : 'Mint & deposit'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Remote>
    </div>
  )
}
