import type { Metadata } from 'next'
import { PeopleLive } from './people-live'

export const metadata: Metadata = { title: 'People' }

export default function PeoplePage() {
  return <PeopleLive />
}
