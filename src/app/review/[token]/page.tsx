import type { Metadata } from 'next'
import { ReviewWorkspace } from './review-workspace'

export const metadata: Metadata = { title: 'Review invitation' }

export default async function ReviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // In production: verify the signed token, load the assignment, and record that
  // the invitation was opened. No account, no password.
  return <ReviewWorkspace token={token} />
}
