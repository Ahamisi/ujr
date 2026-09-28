import type { Metadata } from 'next'
import { SearchLive } from './search-live'

export const metadata: Metadata = { title: 'Search' }

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams
  return <SearchLive query={q} />
}
