'use client'

import * as React from 'react'
import { MONTHLY } from '@/lib/mock-operations'

const W = 720
const H = 250
const M = { top: 16, right: 64, bottom: 28, left: 34 }
const PLOT_W = W - M.left - M.right
const PLOT_H = H - M.top - M.bottom

const SERIES = [
  { key: 'submissions' as const, label: 'Submissions', color: 'var(--series-1)' },
  { key: 'decisions' as const, label: 'Decisions', color: 'var(--series-2)' },
]

const MAX = 30
const TICKS = [0, 10, 20, 30]

const x = (i: number) => M.left + (i / (MONTHLY.length - 1)) * PLOT_W
const y = (v: number) => M.top + PLOT_H - (v / MAX) * PLOT_H

export function SubmissionsChart() {
  const [hover, setHover] = React.useState<number | null>(null)
  const [showTable, setShowTable] = React.useState(false)

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - M.left) / PLOT_W) * (MONTHLY.length - 1))
    setHover(i >= 0 && i < MONTHLY.length ? i : null)
  }

  const point = hover === null ? null : MONTHLY[hover]

  return (
    <figure className="viz-root bg-card m-0 rounded-lg border">
      <figcaption className="flex flex-wrap items-baseline gap-x-4 gap-y-1 border-b px-5 py-3.5">
        <h3 className="text-sm font-medium">Submissions and decisions</h3>
        <p className="text-muted-foreground text-xs">Last 12 months</p>
        <div className="ml-auto flex items-center gap-3">
          {SERIES.map((s) => (
            <span key={s.key} className="text-muted-foreground flex items-center gap-1.5 text-xs">
              <span className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </figcaption>

      <div className="relative px-2 py-3">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label="Monthly submissions and decisions over the last twelve months"
          onMouseMove={handleMove}
          onMouseLeave={() => setHover(null)}
        >
          {TICKS.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={M.left + PLOT_W}
                y1={y(t)}
                y2={y(t)}
                stroke="var(--grid)"
                strokeWidth={1}
              />
              <text
                x={M.left - 8}
                y={y(t) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill="var(--axis-ink)"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t}
              </text>
            </g>
          ))}

          {MONTHLY.map((d, i) => (
            <text key={d.month} x={x(i)} y={H - 8} textAnchor="middle" fontSize={10} fill="var(--axis-ink)">
              {d.month}
            </text>
          ))}

          {hover !== null && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1={M.top}
              y2={M.top + PLOT_H}
              stroke="var(--axis-ink)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}

          {SERIES.map((s) => {
            const d = MONTHLY.map((m, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(m[s.key])}`).join(' ')
            const last = MONTHLY.length - 1
            return (
              <g key={s.key}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {/* Direct label at the line end — identity is never colour alone. */}
                <text
                  x={x(last) + 10}
                  y={y(MONTHLY[last][s.key]) + 3.5}
                  fontSize={11}
                  fill={s.color}
                  fontWeight={500}
                >
                  {MONTHLY[last][s.key]}
                </text>
                {hover !== null && (
                  <circle
                    cx={x(hover)}
                    cy={y(MONTHLY[hover][s.key])}
                    r={4.5}
                    fill={s.color}
                    stroke="var(--card)"
                    strokeWidth={2}
                  />
                )}
              </g>
            )
          })}
        </svg>

        {point && (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute top-3 rounded-md border px-2.5 py-1.5 text-xs shadow-md"
            style={{ left: `${(x(hover!) / W) * 100}%`, transform: 'translateX(-50%)' }}
          >
            <p className="mb-0.5 font-medium">{point.month}</p>
            {SERIES.map((s) => (
              <p key={s.key} className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ background: s.color }} />
                <span className="text-muted-foreground">{s.label}</span>
                <span className="tnum ml-auto pl-2 font-medium">{point[s.key]}</span>
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="border-t px-5 py-2">
        <button
          type="button"
          onClick={() => setShowTable((v) => !v)}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded text-xs focus-visible:ring-2 focus-visible:outline-none"
        >
          {showTable ? 'Hide data' : 'Show data'}
        </button>
        {showTable && (
          <div className="mt-2 overflow-x-auto pb-2">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-muted-foreground text-left">
                  <th className="py-1 pr-3 font-medium">Month</th>
                  <th className="py-1 pr-3 font-medium">Submissions</th>
                  <th className="py-1 font-medium">Decisions</th>
                </tr>
              </thead>
              <tbody className="tnum">
                {MONTHLY.map((m) => (
                  <tr key={m.month}>
                    <td className="py-0.5 pr-3">{m.month}</td>
                    <td className="py-0.5 pr-3">{m.submissions}</td>
                    <td className="py-0.5">{m.decisions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </figure>
  )
}
