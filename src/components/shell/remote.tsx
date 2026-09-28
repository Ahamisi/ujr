'use client'

import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { api, ApiError } from '@/lib/api'
import { useSession } from '@/lib/session'

export function useRemote<T>(path: string) {
  const { journalSlug } = useSession()
  const [data, setData] = React.useState<T | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)

  const reload = React.useCallback(() => {
    setLoading(true)
    setError(null)
    api<T>(path)
      .then((next) => {
        setData(next)
        setLoading(false)
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : 'Could not load this page')
        setLoading(false)
      })
  }, [path])

  React.useEffect(() => {
    // The journal switch changes which tenant this request talks to.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload()
  }, [reload, journalSlug])

  return { data, error, loading, reload, setData }
}

export function Remote({
  loading,
  error,
  children,
}: {
  loading: boolean
  error: string | null
  children: React.ReactNode
}) {
  if (loading) {
    return (
      <div className="text-muted-foreground flex items-center gap-2 px-1 py-8 text-sm">
        <Loader2 className="size-4 animate-spin" />
        Loading
      </div>
    )
  }
  if (error) return <p className="text-destructive px-1 py-8 text-sm">{error}</p>
  return <>{children}</>
}
