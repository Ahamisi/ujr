'use client'

import { NEEDS_ACTION } from '@/lib/manuscript-status'
import { toManuscriptRow, type QueueRow } from '@/lib/queue'
import { useSession } from '@/lib/session'
import { Remote, useRemote } from '@/components/shell/remote'
import { DeskTable } from './desk-table'

export function DeskLive() {
  const { session } = useSession()
  const { data, error, loading } = useRemote<QueueRow[]>('/manuscripts')
  const rows = (data ?? []).map(toManuscriptRow)
  const waiting = rows.filter((row) => NEEDS_ACTION.includes(row.status)).length
  const overdue = rows.filter((row) => row.hasOverdueReview).length

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Editor desk</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {session?.name}
          {!loading && !error && (
            <>
              {' '}
              · {waiting} manuscript{waiting === 1 ? '' : 's'} waiting on you
              {overdue > 0 && `, ${overdue} with an overdue review`}
            </>
          )}
        </p>
      </div>
      <Remote loading={loading} error={error}>
        <DeskTable manuscripts={rows} />
      </Remote>
    </div>
  )
}
