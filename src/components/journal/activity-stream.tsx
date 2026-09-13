import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { ActivityEntry } from '@/lib/mock-manuscript'
import { cn } from '@/lib/utils'

function initials(name: string) {
  return name
    .split(/[\s.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

const TONE: Record<NonNullable<ActivityEntry['tone']>, string> = {
  default: 'bg-muted-foreground/30',
  warning: 'bg-warning',
  success: 'bg-success',
  danger: 'bg-destructive',
}

/**
 * One stream, two weights. System events are single low-contrast lines; human
 * comments get a card. Mixing them is the point — the editor needs "Reviewer 2
 * declined" and "I think we go to major revision" in the same chronology.
 */
export function ActivityStream({ entries }: { entries: ActivityEntry[] }) {
  const ordered = [...entries].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))

  return (
    <ol className="flex flex-col">
      {ordered.map((e) =>
        e.kind === 'comment' ? (
          <li key={e.id} className="flex gap-3 py-3">
            <Avatar className="mt-0.5">
              <AvatarFallback>{initials(e.actor)}</AvatarFallback>
            </Avatar>
            <div className="bg-card min-w-0 flex-1 rounded-lg border px-3.5 py-2.5">
              <p className="mb-1 flex items-baseline gap-2">
                <span className="text-sm font-medium">{e.actor}</span>
                <span className="text-muted-foreground text-xs">{e.at}</span>
              </p>
              <p className="text-sm leading-relaxed">{e.text}</p>
            </div>
          </li>
        ) : (
          <li key={e.id} className="flex items-center gap-3 py-1.5 pl-2.5">
            <span className={cn('size-1.5 shrink-0 rounded-full', TONE[e.tone ?? 'default'])} />
            <p className="text-muted-foreground min-w-0 text-[13px]">
              <span className="text-foreground font-medium">{e.actor}</span> {e.text}
              <span className="ml-2 text-xs opacity-70">{e.at}</span>
            </p>
          </li>
        ),
      )}
    </ol>
  )
}
