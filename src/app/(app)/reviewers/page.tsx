import type { Metadata } from 'next'
import { ReviewersLive } from './reviewers-live'

export const metadata: Metadata = { title: 'Reviewers' }

export default function ReviewersPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col px-4 py-6 md:px-6">
      <ReviewersLive />
    </div>
  )
}
