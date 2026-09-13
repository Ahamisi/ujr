'use client'

import * as React from 'react'
import { DECISION_MIX } from '@/lib/mock-operations'

/**
 * Ordered from most to least favourable, so the ramp carries meaning: the darker
 * the step, the worse the outcome for the author. One hue, monotone lightness —
 * not a categorical palette wearing five hues for no reason.
 */
const RAMP = ['var(--ord-1)', 'var(--ord-2)', 'var(--ord-3)', 'var(--ord-4)', 'var(--ord-5)']

export function DecisionMix() {
  const [hover, setHover] = React.useState<string | null>(null)
  const total = DECISION_MIX.reduce((s, d) => s + d.count, 0)
  const max = Math.max(...DECISION_MIX.map((d) => d.count))

  return (
    <figure className="viz-root bg-card m-0 rounded-lg border">
      <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <h3 className="text-sm font-medium">Decision mix</h3>
        <p className="text-muted-foreground text-xs">
          <span className="tnum">{total}</span> decisions, last 12 months
        </p>
      </figcaption>

      <div className="flex flex-col gap-2.5 px-5 py-4">
        {DECISION_MIX.map((d, i) => {
          const pct = Math.round((d.count / total) * 100)
          return (
            <div
              key={d.label}
              className="flex items-center gap-3"
              onMouseEnter={() => setHover(d.label)}
              onMouseLeave={() => setHover(null)}
            >
              <span className="text-muted-foreground w-40 shrink-0 text-xs">{d.label}</span>
              <div className="flex h-4 flex-1 items-center">
                <div
                  className="h-2 rounded-r-[4px] transition-opacity"
                  style={{
                    width: `${(d.count / max) * 100}%`,
                    background: RAMP[i],
                    opacity: hover === null || hover === d.label ? 1 : 0.45,
                  }}
                />
              </div>
              <span className="tnum w-16 shrink-0 text-right text-xs">
                <span className="font-medium">{d.count}</span>
                <span className="text-muted-foreground ml-1.5">{pct}%</span>
              </span>
            </div>
          )
        })}
      </div>

      <p className="text-muted-foreground border-t px-5 py-2.5 text-xs leading-relaxed">
        Desk rejection is the largest single outcome. That is healthy if it happens in days, and corrosive if it
        takes weeks — check it against median time to desk decision above.
      </p>
    </figure>
  )
}
