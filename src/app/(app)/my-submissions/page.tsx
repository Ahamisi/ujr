import type { Metadata } from 'next'
import { SubmissionsLive } from './submissions-live'

export const metadata: Metadata = { title: 'My submissions' }

export default function MySubmissionsPage() {
  return <SubmissionsLive />
}
