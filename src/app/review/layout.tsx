import { ThemeToggle } from '@/components/shell/theme-toggle'

/**
 * The reviewer is not a member of staff. No sidebar, no journal switcher,
 * nothing to navigate — one task, one page.
 */
export default function ReviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-border flex h-14 items-center gap-3 border-b px-4 md:px-6">
        <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded text-[10px] font-semibold">
          UJ
        </span>
        <span className="truncate text-sm font-medium">UNILAG Journal of Engineering Research</span>
        <div className="ml-auto">
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
