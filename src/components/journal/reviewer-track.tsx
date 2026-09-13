'use client'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ASSIGNMENT_META, RECOMMENDATION_LABEL } from '@/lib/manuscript-status'
import type { ReviewerChip } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * One dot per reviewer. An editor triaging forty manuscripts reads this column
 * before they read anything else, so it has to survive being scanned at speed:
 * how many were invited, how many replied, how many actually filed.
 */
export function ReviewerTrack({
  reviewers,
  required,
}: {
  reviewers: ReviewerChip[]
  required: number
}) {
  if (reviewers.length === 0) {
    return <span className="text-muted-foreground text-xs">None invited</span>
  }

  const submitted = reviewers.filter((r) => r.status === 'submitted').length

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {reviewers.map((r) => {
          const meta = ASSIGNMENT_META[r.status]
          return (
            <Tooltip key={r.id}>
              <TooltipTrigger asChild>
                <span
                  className={cn('size-2.5 rounded-full ring-1 ring-inset ring-black/5', meta.dotClass)}
                  aria-label={`${r.displayName}: ${meta.label}`}
                />
              </TooltipTrigger>
              <TooltipContent>
                <span className="font-medium">{r.displayName}</span> — {meta.label}
                {r.recommendation ? ` · ${RECOMMENDATION_LABEL[r.recommendation]}` : ''}
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
      <span className="text-muted-foreground tnum text-xs">
        {submitted}/{required}
      </span>
    </div>
  )
}
