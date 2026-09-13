'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Built on a plain button rather than a Radix primitive to keep the dependency
 * surface small — role="switch" plus aria-checked is the whole contract.
 */
function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: Omit<React.ComponentProps<'button'>, 'onChange'> & {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      data-slot="switch"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        'focus-visible:ring-ring inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent transition-colors',
        'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'bg-primary' : 'bg-muted-foreground/30',
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          'bg-background pointer-events-none block size-4 rounded-full shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

export { Switch }
