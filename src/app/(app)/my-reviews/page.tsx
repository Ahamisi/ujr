import type { Metadata } from 'next'
import { ReviewsLive } from './reviews-live'

export const metadata: Metadata = { title: 'Review requests' }

export default function MyReviewsPage() {
  return <ReviewsLive />
}
