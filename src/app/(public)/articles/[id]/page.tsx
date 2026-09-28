import type { Metadata } from 'next'
import { ArticleLive } from './article-live'

export const metadata: Metadata = { title: 'Article' }

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ArticleLive id={id} />
}
