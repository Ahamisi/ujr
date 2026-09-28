import type { Metadata } from 'next'
import { DeskLive } from './desk-live'

export const metadata: Metadata = { title: 'Editor desk' }

export default function DeskPage() {
  return <DeskLive />
}
