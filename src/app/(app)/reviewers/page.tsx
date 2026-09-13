import type { Metadata } from 'next'
import { REVIEWERS } from '@/lib/mock-operations'
import { ReviewersTable } from './reviewers-table'

export const metadata: Metadata = { title: 'Reviewers' }

export default function ReviewersPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col px-4 py-6 md:px-6">
      <ReviewersTable reviewers={REVIEWERS} />
    </div>
  )
}
