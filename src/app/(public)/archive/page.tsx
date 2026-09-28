import type { Metadata } from 'next'
import { ArchiveLive } from './archive-live'

export const metadata: Metadata = { title: 'Archive' }

export default function ArchivePage() {
  return <ArchiveLive />
}
