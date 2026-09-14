import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shell/page-header'
import { MY_REVIEW_REQUESTS } from '@/lib/mock-author'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Review requests' }

export default function MyReviewsPage() {
  const open = MY_REVIEW_REQUESTS.filter((r) => r.state !== 'submitted')

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-6 px-4 py-6 md:px-6">
      <PageHeader
        title="Review requests"
        description={
          open.length > 0
            ? `${open.length} open. Reviewing is unpaid work — the journal tries to tell you what it costs before you agree.`
            : 'Nothing outstanding. Thank you.'
        }
      />

      <div className="flex flex-col gap-3">
        {MY_REVIEW_REQUESTS.map((r) => {
          const done = r.state === 'submitted'
          const urgent = !done && r.daysLeft <= 7
          return (
            <Link
              key={r.id}
              href={`/review/${r.token}`}
              className={cn(
                'hover:border-primary/40 focus-visible:ring-ring block border px-4 py-3.5 transition-colors focus-visible:ring-2 focus-visible:outline-none',
                done && 'opacity-70',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                <div className="min-w-0 flex-1">
                  <p className="text-muted-foreground tnum text-xs">
                    {r.reference} · {r.section}
                  </p>
                  <h2 className="mt-1 font-medium text-balance">{r.title}</h2>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {done ? (
                    <Badge variant="success" className="gap-1">
                      <CheckCircle2 className="size-3" />
                      Submitted
                    </Badge>
                  ) : (
                    <>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="size-3" />
                        About {r.estimatedMinutes} min
                      </Badge>
                      <Badge variant={urgent ? 'warning' : 'secondary'}>
                        {urgent ? `${r.daysLeft} days left` : `Due ${r.dueDate}`}
                      </Badge>
                    </>
                  )}
                </div>
              </div>

              {!done && (
                <p className="text-primary mt-2 flex items-center gap-1 text-xs font-medium">
                  {r.state === 'invited' ? 'Read the abstract and decide' : 'Continue your review'}
                  <ArrowRight className="size-3" />
                </p>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
