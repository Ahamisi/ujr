import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/page-header'
import { SubmitForm } from './submit-form'

export const metadata: Metadata = { title: 'New submission' }

export default function SubmitPage() {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="New submission"
        description="Three steps. Your progress is saved as you go, so you can finish this later or on another device."
      />
      <SubmitForm />
    </div>
  )
}
