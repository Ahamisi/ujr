import type { Metadata } from 'next'
import { JOURNAL } from '@/lib/mock-published'
import { JoinForm } from './join-form'

export const metadata: Metadata = {
  title: 'Join the reviewer pool',
  description: `Volunteer to review for the ${JOURNAL.name}.`,
}

export default function JoinPage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">Join the reviewer pool</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">
        Peer review is unpaid work that the whole system rests on. In return this journal will tell you what a
        review will cost you before you agree to it, never chase you more often than you agreed, and let you decline
        without explanation.
      </p>
      <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
        You do not need an account. Invitations arrive by email with their own link.
      </p>
      <JoinForm />
    </div>
  )
}
