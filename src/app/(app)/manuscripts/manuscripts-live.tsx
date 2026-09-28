'use client'

import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { toManuscriptRow, type QueueRow } from '@/lib/queue'
import { ManuscriptsTable } from './manuscripts-table'

export function ManuscriptsLive({ initialQuery }: { initialQuery: string }) {
  const { data, error, loading } = useRemote<QueueRow[]>('/manuscripts')
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader title="All manuscripts" />
      <Remote loading={loading} error={error}>
        <ManuscriptsTable manuscripts={(data ?? []).map(toManuscriptRow)} initialQuery={initialQuery} />
      </Remote>
    </div>
  )
}