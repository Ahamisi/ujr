import { EyeOff, Lock, MessageSquare } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { RECOMMENDATION_LABEL } from '@/lib/manuscript-status'
import type { ReviewDetail } from '@/lib/mock-manuscript'
import type { Recommendation } from '@/lib/types'
import { ScoreBar } from './score-bar'

const RECOMMENDATION_VARIANT: Record<Recommendation, 'success' | 'info' | 'warning' | 'danger'> = {
  accept: 'success',
  minor_revision: 'info',
  major_revision: 'warning',
  reject: 'danger',
}

export function ReviewCard({ review }: { review: ReviewDetail }) {
  return (
    <article className="flex flex-col border">
      <header className="border-b px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{review.realName}</h3>
          <Badge variant={RECOMMENDATION_VARIANT[review.recommendation]}>
            {RECOMMENDATION_LABEL[review.recommendation]}
          </Badge>
          <span className="text-muted-foreground ml-auto text-xs">{review.submittedAt}</span>
        </div>
        <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {/* Under double-blind the editor sees the person; the author sees the label. */}
          <span className="flex items-center gap-1">
            <EyeOff className="size-3" />
            The author sees this as {review.displayName}
          </span>
          <span>Confidence {review.confidence}/5</span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {review.annotationCount} inline comments
          </span>
        </p>
      </header>

      <div className="flex flex-col gap-2 border-b px-4 py-3">
        {review.criteria.map((c) => (
          <ScoreBar key={c.label} {...c} />
        ))}
      </div>

      <div className="px-4 py-3">
        <h4 className="rule-label mb-1.5">
          To the author
        </h4>
        <p className="text-sm leading-relaxed">{review.toAuthor}</p>
      </div>

      {review.toEditor && (
        // Confidential block is visually fenced, not just labelled. An editor
        // assembling a decision letter must never paste this by accident.
        <div className="bg-warning-muted/60 border-warning/40 mx-4 mb-4 border border-dashed px-3 py-2.5">
          <h4 className="text-warning mb-1.5 flex items-center gap-1.5 text-[11px] font-medium tracking-wider uppercase">
            <Lock className="size-3" />
            Confidential to the editor
          </h4>
          <p className="text-sm leading-relaxed">{review.toEditor}</p>
        </div>
      )}
    </article>
  )
}
