'use client'

import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { PeopleTable } from './people-table'
import type { Person } from './roles'

export function PeopleLive() {
  const { data, error, loading, setData } = useRemote<Person[]>('/people')

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col px-4 py-6 md:px-6">
      {loading || error ? <PageHeader title="People" /> : null}
      <Remote loading={loading} error={error}>
        <PeopleTable people={data ?? []} onChange={(next) => setData(next)} />
      </Remote>
    </div>
  )
}
