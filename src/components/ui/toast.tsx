'use client'

import * as React from 'react'
import { CheckCircle2 } from 'lucide-react'

type Toast = { id: number; message: string }

const ToastContext = React.createContext<(message: string) => void>(() => {})

/** Deliberately tiny — a confirmation strip, not a notification system. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const push = React.useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setToasts((t) => [...t, { id, message }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000)
  }, [])

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 left-1/2 z-[60] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="bg-foreground text-background animate-in fade-in-0 slide-in-from-bottom-2 flex items-center gap-2 rounded-md px-3.5 py-2.5 text-sm shadow-lg"
          >
            <CheckCircle2 className="size-4 shrink-0" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return React.useContext(ToastContext)
}
