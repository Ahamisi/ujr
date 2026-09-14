import type { Metadata } from 'next'
import { DoiRegistry } from './doi-registry'

export const metadata: Metadata = { title: 'DOI registry' }

export default function DoiPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col px-4 py-6 md:px-6">
      <DoiRegistry />
    </div>
  )
}
