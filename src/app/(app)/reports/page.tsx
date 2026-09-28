import type { Metadata } from 'next'
import { ReportsLive } from './reports-live'

export const metadata: Metadata = { title: 'Reports' }

export default function ReportsPage() {
  return <ReportsLive />
}
