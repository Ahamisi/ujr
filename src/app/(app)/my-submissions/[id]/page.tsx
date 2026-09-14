import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, EyeOff, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/journal/status-badge'
import { AUTHOR_VISIBLE_REVIEWS, MY_SUBMISSIONS } from '@/lib/mock-author'

export const metadata: Metadata = { title: 'Submission' }

export default async function AuthorSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = MY_SUBMISSIONS.find((m) => m.id === id)
  if (!s) notFound()

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 md:px-6">
      <Link
        href="/my-submissions"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        My submissions
      </Link>

      <p className="text-muted-foreground tnum text-[13px]">
        {s.reference} · Submitted {s.submittedAt}
      </p>
      <h1 className="mt-1 text-xl font-semibold tracking-tight text-balance">{s.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <StatusBadge status={s.status} />
        <Badge variant="outline" className="gap-1">
          <EyeOff className="size-3" />
          Double-blind
        </Badge>
      </div>

      <div className="bg-accent/50 mt-5 rounded-lg border px-4 py-3">
        <p className="text-sm leading-relaxed">{s.whatHappensNext}</p>
        {s.actionRequired && (
          <Button size="sm" className="mt-3">
            <Upload />
            Upload a revision
          </Button>
        )}
      </div>

      {AUTHOR_VISIBLE_REVIEWS.length > 0 && s.reviewsReceived > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-medium">Reviewer comments</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            This journal reviews double-blind. The reviewers were not told who wrote this manuscript, and you are
            not told who they are — not now, and not after publication. Comments they marked confidential to the
            editor are not shown here and are not part of your decision letter.
          </p>

          <div className="mt-4 flex flex-col gap-4">
            {AUTHOR_VISIBLE_REVIEWS.map((r) => (
              <article key={r.id} className="bg-card rounded-lg border">
                <header className="border-b px-4 py-2.5">
                  <h3 className="text-sm font-medium">{r.label}</h3>
                </header>
                <p className="px-4 py-3 text-sm leading-relaxed">{r.body}</p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
