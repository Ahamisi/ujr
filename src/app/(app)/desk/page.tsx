import type { Metadata } from 'next'
import { MANUSCRIPTS, CURRENT_USER } from '@/lib/mock-data'
import { NEEDS_ACTION } from '@/lib/manuscript-status'
import { DeskTable } from './desk-table'

export const metadata: Metadata = { title: 'Editor desk' }

export default function DeskPage() {
  const waiting = MANUSCRIPTS.filter((m) => NEEDS_ACTION.includes(m.status)).length
  const overdue = MANUSCRIPTS.filter((m) => m.hasOverdueReview).length

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Editor desk</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {CURRENT_USER.role} · {waiting} manuscript{waiting === 1 ? '' : 's'} waiting on you
            {overdue > 0 && `, ${overdue} with an overdue review`}
          </p>
        </div>
      </div>

      <DeskTable manuscripts={MANUSCRIPTS} />
    </div>
  )
}
