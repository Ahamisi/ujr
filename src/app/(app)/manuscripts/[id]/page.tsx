import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, EyeOff, FileText, Gavel, Scale, UserPlus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityStream } from '@/components/journal/activity-stream'
import { ReviewCard } from '@/components/journal/review-card'
import { SimilarityScore } from '@/components/journal/similarity-score'
import { StatusBadge } from '@/components/journal/status-badge'
import { ACTIVITY, MANUSCRIPT_DETAIL, REVIEWS } from '@/lib/mock-manuscript'

export const metadata: Metadata = { title: MANUSCRIPT_DETAIL.reference }

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="text-right text-[13px]">{children}</dd>
    </div>
  )
}

export default function ManuscriptPage() {
  const m = MANUSCRIPT_DETAIL
  const split = new Set(REVIEWS.map((r) => r.recommendation)).size > 1

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <Link
        href="/desk"
        className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm"
      >
        <ArrowLeft className="size-3.5" />
        Editor desk
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-muted-foreground tnum flex items-center gap-2 text-[13px]">
            {m.reference}
            <span>·</span>
            Round {m.round}
            <span>·</span>
            {m.section}
          </p>
          <h1 className="mt-1 max-w-3xl text-xl font-semibold tracking-tight text-balance">{m.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={m.status} />
            <Badge variant="outline" className="gap-1">
              <EyeOff className="size-3" />
              Double-blind
            </Badge>
            <span className="text-muted-foreground text-xs">{m.daysInStatus} days in this status</span>
          </div>
        </div>

        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm">
            <UserPlus />
            Invite a reviewer
          </Button>
          <Button size="sm">
            <Gavel />
            Record a decision
          </Button>
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Tabs defaultValue="reviews">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="reviews">
              Reviews
              <span className="bg-muted text-muted-foreground tnum rounded px-1.5 py-0.5 text-[11px]">
                {REVIEWS.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="manuscript">Manuscript</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="flex flex-col gap-4">
            {split && (
              <div className="bg-warning-muted/60 border-warning/40 flex items-start gap-2.5 rounded-md border px-3.5 py-2.5">
                <Scale className="text-warning mt-0.5 size-4 shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">The reviewers disagree.</span>{' '}
                  <span className="text-muted-foreground">
                    Minor revision against major revision. Both reports are below, side by side — read Reviewer 2 on
                    the statistical claim before deciding.
                  </span>
                </p>
              </div>
            )}
            <div className="grid gap-4 xl:grid-cols-2">
              {REVIEWS.map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="manuscript" className="flex flex-col gap-4">
            <div className="bg-card rounded-lg border p-5">
              <h2 className="mb-2 text-sm font-medium">Abstract</h2>
              <p className="max-w-prose text-sm leading-relaxed">{m.abstract}</p>
            </div>
            <div className="bg-card rounded-lg border p-5">
              <h2 className="mb-3 text-sm font-medium">Files</h2>
              <ul className="flex flex-col gap-2">
                {[
                  { name: 'manuscript_v1.docx', note: 'as submitted' },
                  { name: 'manuscript_v1_anonymised.pdf', note: 'metadata scrubbed — what reviewers see' },
                  { name: 'figures.zip', note: '8 figures' },
                  { name: 'similarity_report.pdf', note: '8% overall' },
                ].map((f) => (
                  <li key={f.name} className="flex items-center gap-2.5 text-sm">
                    <FileText className="text-muted-foreground size-4 shrink-0" />
                    <span className="font-medium">{f.name}</span>
                    <span className="text-muted-foreground text-xs">{f.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="activity">
            <ActivityStream entries={ACTIVITY} />
          </TabsContent>
        </Tabs>

        <aside className="flex flex-col gap-4">
          <div className="bg-card rounded-lg border p-4">
            <dl>
              <Property label="Handling editor">{m.handlingEditor}</Property>
              <Property label="Submitted">{m.submittedAt}</Property>
              <Property label="Reviews required">
                <span className="tnum">
                  {REVIEWS.length}/{m.reviewsRequired}
                </span>
              </Property>
              <Property label="Similarity">
                <SimilarityScore value={m.similarityPercent} />
              </Property>
              <Property label="Licence">{m.licence}</Property>
            </dl>
            <Separator className="my-3" />
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Policy frozen at submission on 2 July 2026. Changing journal settings now will not affect this
              manuscript.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <h2 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">
              Authors
            </h2>
            <ul className="flex flex-col gap-2.5">
              {m.authors.map((a) => (
                <li key={a.name}>
                  <p className="flex items-center gap-1.5 text-[13px] font-medium">
                    {a.name}
                    {a.corresponding && (
                      <Badge variant="secondary" className="font-normal">
                        Corresponding
                      </Badge>
                    )}
                  </p>
                  <p className="text-muted-foreground text-xs">{a.affiliation}</p>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
