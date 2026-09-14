import type { Metadata } from 'next'
import { JOURNAL } from '@/lib/mock-published'
import { AlertsForm } from './alerts-form'

export const metadata: Metadata = {
  title: 'Email alerts',
  description: `Get the table of contents when the ${JOURNAL.name} publishes a new issue.`,
}

export default function AlertsPage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Email alerts</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        The journal publishes {JOURNAL.frequency.toLowerCase()}. Tell us what is worth interrupting you for, and
        nothing else will be.
      </p>
      <AlertsForm />
    </div>
  )
}
