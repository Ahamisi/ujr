import type { Metadata } from 'next'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shell/page-header'
import { REVIEWERS } from '@/lib/mock-operations'
import { ReviewersTable } from './reviewers-table'

export const metadata: Metadata = { title: 'Reviewers' }

export default function ReviewersPage() {
  const shared = REVIEWERS.filter((r) => r.sharedPool).length

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Reviewers"
        description={`${REVIEWERS.length} people, ${shared} of them available to other journals on the platform. Sorted by how reliably they file.`}
        actions={
          <Button size="sm" variant="outline">
            <UserPlus />
            Add a reviewer
          </Button>
        }
      />
      <ReviewersTable reviewers={REVIEWERS} />
    </div>
  )
}
