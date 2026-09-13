import { cn } from '@/lib/utils'

/**
 * A scored criterion. Janeway and OJS offer only free text, which is why their
 * editors cannot compare two reviewers at a glance. The bar exists so they can.
 */
export function ScoreBar({ label, score, outOf }: { label: string; score: number; outOf: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground w-36 shrink-0 text-xs">{label}</span>
      <div className="flex flex-1 gap-0.5" role="img" aria-label={`${label}: ${score} out of ${outOf}`}>
        {Array.from({ length: outOf }, (_, i) => (
          <span
            key={i}
            className={cn('h-1.5 flex-1 rounded-full', i < score ? 'bg-primary' : 'bg-muted')}
          />
        ))}
      </div>
      <span className="tnum text-muted-foreground w-8 shrink-0 text-right text-xs">
        {score}/{outOf}
      </span>
    </div>
  )
}
