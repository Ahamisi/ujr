'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  /*
   * The inline script in the root layout applies the class before first paint,
   * so the DOM is the source of truth here — no effect needed to sync it.
   * The server renders the light icon; suppressHydrationWarning covers the
   * one-frame difference for a viewer whose stored choice is dark.
   */
  const [dark, setDark] = React.useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  )

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('ujer-theme', next ? 'dark' : 'light')
    } catch {
      /* private window, blocked storage — the toggle still works for this session */
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label="Toggle dark mode"
      suppressHydrationWarning
    >
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
