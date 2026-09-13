'use client'

import * as React from 'react'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const [dark, setDark] = React.useState(false)

  React.useEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem('ujer-theme')
      } catch {
        return null
      }
    })()
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const next = stored ? stored === 'dark' : prefersDark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
  }, [])

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
    <Button variant="ghost" size="icon-sm" onClick={toggle} aria-label="Toggle dark mode">
      {dark ? <Moon className="size-4" /> : <Sun className="size-4" />}
    </Button>
  )
}
