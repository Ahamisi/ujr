import { FlaskConical } from 'lucide-react'

/**
 * Persistent and not dismissible, on purpose. A stakeholder clicking through a
 * convincing prototype will assume it is a working system unless told otherwise
 * on every screen — and that assumption is expensive to correct later.
 */
export function DemoBanner() {
  return (
    <div className="bg-warning-muted text-foreground border-warning/30 flex items-center justify-center gap-2 border-b px-4 py-1.5 text-center text-xs">
      <FlaskConical className="text-warning size-3.5 shrink-0" />
      <span>
        <span className="font-medium">Prototype.</span> Example data only — nothing is saved, no email is sent, and
        everything resets when you reload.
      </span>
    </div>
  )
}
