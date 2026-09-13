import { Badge } from '@/components/ui/badge'
import { STATUS_META } from '@/lib/manuscript-status'
import type { ManuscriptStatus } from '@/lib/types'
import { cn } from '@/lib/utils'

export function StatusBadge({ status, className }: { status: ManuscriptStatus; className?: string }) {
  const meta = STATUS_META[status]
  return (
    <Badge variant={meta.variant} className={cn('px-2 py-0.5', className)} title={meta.blocking}>
      {meta.label}
    </Badge>
  )
}
