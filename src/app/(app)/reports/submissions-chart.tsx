'use client'

import * as React from 'react'

const W = 720
const H = 250
const M = { top: 16, right: 24, bottom: 28, left: 34 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

export function SubmissionsChart({ points }: { points: { month: string; submissions: number }[] }) {
  const [hover, setHover] = React.useState<number | null>(null)
  if (points.length < 2) {
    return (
      <p className="text-muted-foreground bg-card rounded-lg border px-5 py-8 text-sm">
        Not enough submitted manuscripts to chart yet.
      </p>
    )
  }

  const max = Math.max(1, ...points.map((point) => point.submissions))
  const x = (index: number) => M.left + (index / (points.length - 1)) * PLOT_W
  const y = (value: number) => M.top + PLOT_H - (value / max) * PLOT_H
  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${x(index)} ${y(point.submissions)}`).join(' ')

  return (
    <figure className="viz-root m-0 border">
      <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <h3 className="text-sm font-medium">Submissions</h3>
        <p className="text-muted-foreground text-xs">By month, from the manuscript ledger</p>
      </figcaption>
      <div className="px-2 py-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Monthly submissions"
          onMouseLeave={() => setHover(null)}
        >
          <path d={line} fill="none" stroke="var(--series-1)" strokeWidth={2} />
          {points.map((point, index) => (
            <g key={`${point.month}-${index}`} onMouseEnter={() => setHover(index)}>
              <circle cx={x(index)} cy={y(point.submissions)} r={hover === index ? 4 : 3} fill="var(--series-1)" />
              <text x={x(index)} y={H - 8} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>
                {point.month}
              </text>
            </g>
          ))}
        </svg>
        {hover !== null && (
          <p className="text-muted-foreground tnum px-3 text-xs">
            {points[hover].month}: {points[hover].submissions} submission{points[hover].submissions === 1 ? '' : 's'}
          </p>
        )}
      </div>
    </figure>
  )
}
