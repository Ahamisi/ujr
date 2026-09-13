import type { Metadata } from 'next'
import { PageHeader } from '@/components/shell/page-header'
import { CURRENT_JOURNAL } from '@/lib/mock-data'
import { SettingsForm } from './settings-form'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Journal settings"
        description={`Editorial policy for ${CURRENT_JOURNAL.abbreviation}. Changes apply to new submissions; manuscripts already under review keep the policy they were submitted under.`}
      />
      <SettingsForm />
    </div>
  )
}
