import type { Metadata } from 'next'
import Link from 'next/link'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shell/page-header'
import { StatusBadge } from '@/components/journal/status-badge'
import { MY_SUBMISSIONS } from '@/lib/mock-author'

export const metadata: Metadata = { title: 'My submissions' }

export default function MySubmissionsPage() {
  const needsYou = MY_SUBMISSIONS.filter((s) => s.actionRequired)

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="My submissions"
        description={
          needsYou.length > 0
            ? `${needsYou.length} submission needs something from you.`
            : 'Nothing needs you right now.'
        }
      />

      <div className="flex flex-col gap-3">
        {MY_SUBMISSIONS.map((s) => (
          <Link
            key={s.id}
            href={`/my-submissions/${s.id}`}
            className="hover:border-primary/40 focus-visible:ring-ring block border px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <p className="text-muted-foreground tnum flex flex-wrap items-center gap-2 text-xs">
                  {s.reference}
                  {s.round > 0 && <span>Round {s.round}</span>}
                  <span>Submitted {s.submittedAt}</span>
                </p>
                <h2 className="mt-1 font-medium text-balance">{s.title}</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge status={s.status} />
                {s.actionRequired && (
                  <Badge variant="warning" className="gap-1">
                    <AlertCircle className="size-3" />
                    Action needed
                  </Badge>
                )}
              </div>
            </div>

            <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-sm leading-relaxed">
              {s.whatHappensNext}
            </p>

            {s.reviewsReceived > 0 && (
              <p className="text-primary mt-2 flex items-center gap-1 text-xs font-medium">
                Read the {s.reviewsReceived} reviews
                <ArrowRight className="size-3" />
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
