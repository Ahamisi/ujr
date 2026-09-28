'use client'

import { PageHeader } from '@/components/shell/page-header'
import { Remote, useRemote } from '@/components/shell/remote'
import { DecisionMix } from './decision-mix'
import { SubmissionsChart } from './submissions-chart'

interface Report {
  byStatus: Record<string, number>
  decisionMix: Record<string, number>
  reviewerAcceptanceRate: number | null
  medianDaysToFirstDecision: number | null
  monthly: { month: string; submissions: number }[] | { rows?: { month: string; submissions: number }[] }
}

function months(monthly: Report['monthly']) {
  if (Array.isArray(monthly)) return monthly
  return monthly?.rows ?? []
}

export function ReportsLive() {
  const { data, error, loading } = useRemote<Report>('/reports')
  const submitted = data ? Object.values(data.byStatus).reduce((sum, count) => sum + count, 0) : 0
  const rate = data?.reviewerAcceptanceRate

  const tiles = [
    {
      value: data?.medianDaysToFirstDecision ?? '—',
      unit: data?.medianDaysToFirstDecision == null ? '' : 'days',
      label: 'Median to first decision',
      note: 'From submission to the author hearing back',
    },
    {
      value: rate == null ? '—' : Math.round(rate * 100),
      unit: rate == null ? '' : '%',
      label: 'Reviewer acceptance rate',
      note: 'Share of invitations accepted or filed',
    },
    {
      value: submitted,
      unit: '',
      label: 'Manuscripts',
      note: 'Every status, in this journal',
    },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader title="Reports" description="Counted from the manuscript ledger and the decision history." />
      <Remote loading={loading} error={error}>
        <div className="grid gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-card rounded-lg border px-4 py-3.5">
              <p className="flex items-baseline gap-1">
                <span className="tnum text-2xl font-semibold tracking-tight">{tile.value}</span>
                <span className="text-muted-foreground text-sm">{tile.unit}</span>
              </p>
              <p className="mt-0.5 text-[13px] font-medium">{tile.label}</p>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{tile.note}</p>
            </div>
          ))}
        </div>
        <SubmissionsChart points={data ? months(data.monthly) : []} />
        <DecisionMix mix={data?.decisionMix ?? {}} />
      </Remote>
    </div>
  )
}
