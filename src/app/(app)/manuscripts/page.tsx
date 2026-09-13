import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/page-header'
import { MANUSCRIPTS } from '@/lib/mock-data'
import { ManuscriptsTable } from './manuscripts-table'

export const metadata: Metadata = { title: 'All manuscripts' }

export default async function ManuscriptsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="All manuscripts"
        description="Every submission in this journal, whatever its state and whoever is handling it."
      />
      <ManuscriptsTable manuscripts={MANUSCRIPTS} initialQuery={q ?? ''} />
    </div>
  )
}
