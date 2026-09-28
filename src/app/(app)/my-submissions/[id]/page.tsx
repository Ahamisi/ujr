import type { Metadata } from 'next'
import { SubmissionView } from './submission-view'

export const metadata: Metadata = { title: 'Submission' }

export default async function AuthorSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <SubmissionView id={id} />
}
