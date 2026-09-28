'use client'

import { Remote, useRemote } from '@/components/shell/remote'
import type { ReviewerRecord } from '@/lib/mock-operations'
import { ReviewersTable } from './reviewers-table'

interface Row {
  id: string
  name: string
  affiliation: string | null
  country: string | null
  expertise: string[]
  sharedReviewerPool: boolean
  invited: number
  completed: number
  declined: number
}

export function ReviewersLive() {
  const { data, error, loading } = useRemote<Row[]>('/reviewers')
  const reviewers: ReviewerRecord[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    affiliation: row.affiliation ?? '',
    country: row.country ?? '',
    expertise: row.expertise ?? [],
    invited: row.invited,
    completed: row.completed,
    declined: row.declined,
    medianTurnaroundDays: null,
    lastInvited: '—',
    sharedPool: row.sharedReviewerPool,
  }))

  return (
    <Remote loading={loading} error={error}>
      <ReviewersTable reviewers={reviewers} />
    </Remote>
  )
}
