import type { Metadata } from 'next'
import { TransactionsLive } from './transactions-live'

export const metadata: Metadata = { title: 'Transactions' }

export default function TransactionsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 py-6 md:px-6">
      <TransactionsLive />
    </div>
  )
}
