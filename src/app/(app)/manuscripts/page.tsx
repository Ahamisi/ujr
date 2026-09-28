import type { Metadata } from 'next'
import { ManuscriptsLive } from './manuscripts-live'

export const metadata: Metadata = { title: 'All manuscripts' }

export default async function ManuscriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  return <ManuscriptsLive initialQuery={q ?? ''} />
}
