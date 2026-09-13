import type { Metadata } from 'next'
import { ManuscriptScreen } from './manuscript-screen'

export const metadata: Metadata = { title: 'Manuscript' }

export default async function ManuscriptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ManuscriptScreen id={id} />
}
