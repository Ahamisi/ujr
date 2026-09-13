import type { Metadata } from 'next'
import { IssuesList } from './issues-list'

export const metadata: Metadata = { title: 'Issues' }

export default function IssuesPage() {
  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col px-4 py-6 md:px-6">
      <IssuesList />
    </div>
  )
}
