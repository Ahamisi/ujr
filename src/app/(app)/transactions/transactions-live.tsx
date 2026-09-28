'use client'

import { Remote, useRemote } from '@/components/shell/remote'
import { formatWhen } from '@/lib/api'
import type { ChargeStatus, Transaction } from '@/lib/mock-transactions'
import { TransactionsTable } from './transactions-table'

interface Row {
  id: string
  reference: string
  title: string
  amountMinor: number
  currency: 'NGN'
  status: ChargeStatus
  channel: Transaction['channel']
  paystackReference: string | null
  waiverReason: string | null
  paidAt: string | null
  createdAt: string
}

export function TransactionsLive() {
  const { data, error, loading, reload } = useRemote<Row[]>('/charges')
  const transactions: Transaction[] = (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    manuscriptTitle: row.title,
    payer: '—',
    payerEmail: '',
    amountMinor: row.amountMinor,
    currency: row.currency === 'NGN' ? 'NGN' : 'NGN',
    status: row.status,
    gatewayRef: row.paystackReference,
    channel: row.channel,
    raisedAt: formatWhen(row.createdAt),
    settledAt: row.paidAt ? formatWhen(row.paidAt) : null,
    waiverReason: row.waiverReason ?? undefined,
  }))

  return (
    <Remote loading={loading} error={error}>
      <TransactionsTable transactions={transactions} onChanged={reload} />
    </Remote>
  )
}
