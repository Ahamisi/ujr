'use client'

import * as React from 'react'
import { Download, MoreHorizontal, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shell/page-header'
import { naira, type ChargeStatus, type Transaction } from '@/lib/mock-transactions'
import { cn } from '@/lib/utils'

const STATUS: Record<ChargeStatus, { label: string; variant: 'success' | 'warning' | 'secondary' | 'danger' | 'info' }> =
  {
    paid: { label: 'Paid', variant: 'success' },
    pending: { label: 'Pending', variant: 'warning' },
    waived: { label: 'Waived', variant: 'secondary' },
    failed: { label: 'Failed', variant: 'danger' },
    refunded: { label: 'Refunded', variant: 'info' },
  }

const CHANNEL: Record<string, string> = {
  card: 'Card',
  bank_transfer: 'Bank transfer',
  ussd: 'USSD',
}

export function TransactionsTable({ transactions: initial }: { transactions: Transaction[] }) {
  const [rows, setRows] = React.useState(initial)
  const [query, setQuery] = React.useState('')
  const [status, setStatus] = React.useState<'all' | ChargeStatus>('all')
  const [waiveFor, setWaiveFor] = React.useState<Transaction | null>(null)
  const [reason, setReason] = React.useState('')
  const toast = useToast()

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter(
      (t) =>
        (status === 'all' || t.status === status) &&
        (q === '' ||
          t.reference.toLowerCase().includes(q) ||
          t.payer.toLowerCase().includes(q) ||
          t.manuscriptTitle.toLowerCase().includes(q) ||
          (t.gatewayRef ?? '').toLowerCase().includes(q)),
    )
  }, [rows, query, status])

  /* Reconciliation figures. Collected is money in the account; outstanding is
     money the journal is still owed; waived is the cost of the waiver policy. */
  const collected = rows.filter((t) => t.status === 'paid').reduce((s, t) => s + t.amountMinor, 0)
  const outstanding = rows
    .filter((t) => t.status === 'pending' || t.status === 'failed')
    .reduce((s, t) => s + t.amountMinor, 0)
  const waived = rows.filter((t) => t.status === 'waived').reduce((s, t) => s + t.amountMinor, 0)
  const refunded = rows.filter((t) => t.status === 'refunded').reduce((s, t) => s + t.amountMinor, 0)

  const TILES = [
    { value: naira(collected), label: 'Collected', note: `${rows.filter((t) => t.status === 'paid').length} settled` },
    {
      value: naira(outstanding),
      label: 'Outstanding',
      note: `${rows.filter((t) => t.status === 'pending' || t.status === 'failed').length} awaiting or failed`,
    },
    {
      value: naira(waived),
      label: 'Waived',
      note: `${rows.filter((t) => t.status === 'waived').length} charges, by policy`,
    },
    { value: naira(refunded), label: 'Refunded', note: 'Returned to authors' },
  ]

  function waive() {
    if (!waiveFor || reason.trim().length < 8) return
    setRows((list) =>
      list.map((t) =>
        t.id === waiveFor.id
          ? { ...t, status: 'waived' as const, waiverReason: reason.trim(), settledAt: '2026-09-14' }
          : t,
      ),
    )
    toast(`${waiveFor.reference} waived`)
    setWaiveFor(null)
    setReason('')
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transactions"
        description="Article charges raised on acceptance, and what happened to each one."
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast('Export runs against the ledger once the database is connected')}
          >
            <Download />
            Export for the bursary
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.label} className="bg-card rounded-lg border px-4 py-3.5">
            <p className="tnum text-xl font-semibold tracking-tight">{t.value}</p>
            <p className="mt-0.5 text-[13px] font-medium">{t.label}</p>
            <p className="text-muted-foreground mt-1 text-xs">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            id="tx-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Reference, author or Paystack ref"
            className="h-8 pl-8"
            aria-label="Filter transactions"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
          <SelectTrigger className="min-w-[150px]" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {(Object.keys(STATUS) as ChargeStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground tnum ml-auto text-xs">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-muted-foreground h-9 px-3 text-left text-[11px] font-medium tracking-wider uppercase">
                  Reference
                </th>
                <th className="text-muted-foreground h-9 px-3 text-left text-[11px] font-medium tracking-wider uppercase">
                  Payer
                </th>
                <th className="text-muted-foreground h-9 px-3 text-right text-[11px] font-medium tracking-wider uppercase">
                  Amount
                </th>
                <th className="text-muted-foreground h-9 px-3 text-left text-[11px] font-medium tracking-wider uppercase">
                  Status
                </th>
                <th className="text-muted-foreground h-9 px-3 text-left text-[11px] font-medium tracking-wider uppercase">
                  Gateway
                </th>
                <th className="text-muted-foreground h-9 px-3 text-left text-[11px] font-medium tracking-wider uppercase">
                  Raised
                </th>
                <th className="w-12" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-muted/60 border-b transition-colors last:border-b-0">
                  <td className="px-3 py-3 align-top">
                    <p className="tnum text-[13px] font-medium">{t.reference}</p>
                    <p className="text-muted-foreground mt-0.5 max-w-xs truncate text-xs">{t.manuscriptTitle}</p>
                  </td>
                  <td className="px-3 py-3 align-top">
                    <p className="text-[13px]">{t.payer}</p>
                    <p className="text-muted-foreground mt-0.5 text-xs">{t.payerEmail}</p>
                  </td>
                  <td
                    className={cn(
                      'tnum px-3 py-3 text-right align-top text-[13px]',
                      t.status === 'waived' && 'text-muted-foreground line-through',
                    )}
                  >
                    {naira(t.amountMinor)}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <Badge variant={STATUS[t.status].variant}>{STATUS[t.status].label}</Badge>
                    {t.waiverReason && (
                      <p className="text-muted-foreground mt-1 max-w-[200px] text-[11px] leading-tight">
                        {t.waiverReason}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {t.gatewayRef ? (
                      <>
                        <p className="tnum font-mono text-xs">{t.gatewayRef}</p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {t.channel ? CHANNEL[t.channel] : ''}
                        </p>
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xs">No charge raised</span>
                    )}
                  </td>
                  <td className="text-muted-foreground tnum px-3 py-3 align-top text-[13px]">{t.raisedAt}</td>
                  <td className="px-3 py-2 align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${t.reference}`}>
                          <MoreHorizontal className="size-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem
                          disabled={!t.gatewayRef}
                          onSelect={() => toast(`Opening ${t.gatewayRef} in Paystack`)}
                        >
                          View in Paystack
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          disabled={t.status !== 'pending' && t.status !== 'failed'}
                          onSelect={() => toast(`Payment reminder sent to ${t.payer}`)}
                        >
                          Send a payment reminder
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => toast(`Receipt for ${t.reference} generated`)}>
                          Generate a receipt
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          disabled={t.status === 'waived' || t.status === 'paid'}
                          onSelect={() => setWaiveFor(t)}
                        >
                          Waive this charge
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium">No transactions match these filters</p>
            <p className="text-muted-foreground mt-1 text-sm">Clear the search or widen the status filter.</p>
          </div>
        )}
      </div>

      <Dialog open={waiveFor !== null} onOpenChange={(open) => !open && setWaiveFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Waive this charge</DialogTitle>
            <DialogDescription>
              {waiveFor?.reference} · {waiveFor ? naira(waiveFor.amountMinor) : ''}. The author is told the charge
              has been waived, and the reason is kept on the record.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-1.5">
            <Label htmlFor="waiver-reason">Reason</Label>
            <Textarea
              id="waiver-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Postgraduate student without grant funding, institutional agreement, hardship…"
              className="min-h-24"
            />
            <p className="text-muted-foreground text-xs">
              Waivers are audited. A reason that would embarrass the journal if published is the wrong reason.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setWaiveFor(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={waive} disabled={reason.trim().length < 8}>
              Waive the charge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
