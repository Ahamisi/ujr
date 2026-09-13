import { cn } from '@/lib/utils'

/**
 * Similarity is shown as a number *and* a severity, because 34% means nothing
 * to an editor who has not memorised the journal's threshold.
 */
export function SimilarityScore({ value, flagAt = 20 }: { value: number | null; flagAt?: number }) {
  if (value === null) {
    return <span className="text-muted-foreground text-xs">—</span>
  }
  const flagged = value >= flagAt
  return (
    <span
      className={cn(
        'tnum inline-flex items-center gap-1.5 text-sm',
        flagged ? 'text-warning font-medium' : 'text-muted-foreground',
      )}
      title={flagged ? `At or above the ${flagAt}% flag threshold` : `Below the ${flagAt}% flag threshold`}
    >
      {flagged && <span className="bg-warning size-1.5 rounded-full" />}
      {value}%
    </span>
  )
}
