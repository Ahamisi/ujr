/**
 * Browser calls to the editorial API. The cookie from Better Auth is sent
 * with every request. The active journal is the one the top bar selected.
 */

let slug = 'ujer'

export function setActiveJournal(next: string) {
  slug = next
}

export function activeJournal() {
  return slug
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !(init.body instanceof FormData) && !headers.has('content-type')) {
    headers.set('content-type', 'application/json')
  }
  const response = await fetch(`/api/v1/j/${slug}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  const text = await response.text()
  const data = text ? (JSON.parse(text) as { error?: { message?: string } }) : null
  if (!response.ok) {
    throw new ApiError(data?.error?.message ?? response.statusText, response.status)
  }
  return data as T
}

export function formatWhen(value: string | Date | null | undefined) {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}
