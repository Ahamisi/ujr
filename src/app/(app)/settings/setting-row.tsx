import { cn } from '@/lib/utils'

export function SettingRow({
  label,
  help,
  htmlFor,
  children,
  className,
}: {
  label: string
  help?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 border-b px-4 py-3 last:border-b-0', className)}>
      <div className="min-w-[220px] flex-1">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {help && <p className="text-muted-foreground mt-0.5 max-w-prose text-xs leading-relaxed">{help}</p>}
      </div>
      <div className="flex shrink-0 items-center">{children}</div>
    </div>
  )
}

export function SettingGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">{title}</h2>
      <div className="bg-card rounded-lg border">{children}</div>
    </section>
  )
}
