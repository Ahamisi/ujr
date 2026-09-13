import type { Metadata } from 'next'
import { MANUSCRIPT_DETAIL } from '@/lib/mock-manuscript'
import { ManuscriptScreen } from './manuscript-screen'

export const metadata: Metadata = { title: MANUSCRIPT_DETAIL.reference }

export default function ManuscriptPage() {
  return <ManuscriptScreen />
}
