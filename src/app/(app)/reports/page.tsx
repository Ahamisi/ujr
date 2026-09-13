import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/page-header'
import { TURNAROUND } from '@/lib/mock-operations'
import { DecisionMix } from './decision-mix'
import { SubmissionsChart } from './submissions-chart'

export const metadata: Metadata = { title: 'Reports' }

/** Headline figures. A number is not a chart — these earn tiles, not plots. */
const TILES = [
  {
    value: TURNAROUND.medianDaysToFirstDecision,
    unit: 'days',
    label: 'Median to first decision',
    note: 'From submission to the author hearing back',
  },
  {
    value: TURNAROUND.medianDaysToDeskDecision,
    unit: 'days',
    label: 'Median to desk decision',
    note: 'A fast desk reject earns more goodwill than a slow one',
  },
  {
    value: TURNAROUND.medianDaysToPublication,
    unit: 'days',
    label: 'Median to publication',
    note: 'From submission to version of record',
  },
  {
    value: Math.round(TURNAROUND.reviewerAcceptanceRate * 100),
    unit: '%',
    label: 'Reviewer acceptance rate',
    note: 'Share of invitations accepted',
  },
]

export default function ReportsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Reports"
        description="The figures DOAJ and your editorial board will both ask for."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.label} className="bg-card rounded-lg border px-4 py-3.5">
            <p className="flex items-baseline gap-1">
              <span className="text-2xl font-semibold tracking-tight">{t.value}</span>
              <span className="text-muted-foreground text-sm">{t.unit}</span>
            </p>
            <p className="mt-0.5 text-[13px] font-medium">{t.label}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t.note}</p>
          </div>
        ))}
      </div>

      <SubmissionsChart />
      <DecisionMix />
    </div>
  )
}
