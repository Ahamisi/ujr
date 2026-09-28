'use client'

import * as React from 'react'

const RAMP = ['var(--ord-1)', 'var(--ord-2)', 'var(--ord-3)', 'var(--ord-4)', 'var(--ord-5)']

const LABEL: Record<string, string> = {
  accept: 'Accept',
  minor_revision: 'Minor revision',
  major_revision: 'Major revision',
  reject: 'Reject',
  reject_with_resubmission: 'Reject, resubmission welcome',
  desk_reject: 'Desk reject',
}

export function DecisionMix({ mix }: { mix: Record<string, number> }) {
  const [hover, setHover] = React.useState<string | null>(null)
  const rows = Object.entries(mix)
  const total = rows.reduce((sum, [, count]) => sum + count, 0)
  if (total === 0) {
    return (
      <p className="text-muted-foreground bg-card rounded-lg border px-5 py-8 text-sm">No decisions recorded yet.</p>
    )
  }
  const max = Math.max(...rows.map(([, count]) => count))

  return (
    <figure className="viz-root m-0 border">
      <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <h3 className="text-sm font-medium">Decision mix</h3>
        <p className="text-muted-foreground text-xs">
          <span className="tnum">{total}</span> decisions
        </p>
      </figcaption>
      <div className="flex flex-col gap-2.5 px-5 py-4">
        {rows.map(([key, count], index) => (
          <button
            key={key}
            type="button"
            onMouseEnter={() => setHover(key)}
            onMouseLeave={() => setHover(null)}
            className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-left"
          >
            <span className="text-sm">{LABEL[key] ?? key.replaceAll('_', ' ')}</span>
            <span className="bg-muted h-2 overflow-hidden rounded-full">
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: RAMP[index % RAMP.length],
                  opacity: hover && hover !== key ? 0.45 : 1,
                }}
              />
            </span>
            <span className="tnum text-right text-sm">{count}</span>
          </button>
        ))}
      </div>
    </figure>
  )
}
