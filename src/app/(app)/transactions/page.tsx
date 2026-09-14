import type { Metadata } from 'next'
import { TRANSACTIONS } from '@/lib/mock-transactions'
import { TransactionsTable } from './transactions-table'

export const metadata: Metadata = { title: 'Transactions' }

export default function TransactionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 py-6 md:px-6">
      <TransactionsTable transactions={TRANSACTIONS} />
    </div>
  )
}
