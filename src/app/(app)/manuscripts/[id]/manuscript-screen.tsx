'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, EyeOff, FileText, Scale } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityStream } from '@/components/journal/activity-stream'
import { ReviewCard } from '@/components/journal/review-card'
import { SimilarityScore } from '@/components/journal/similarity-score'
import { StatusBadge } from '@/components/journal/status-badge'
import { getManuscriptDetail, type ActivityEntry } from '@/lib/mock-manuscript'
import type { ManuscriptStatus } from '@/lib/types'
import { InviteReviewerDialog } from '@/components/journal/invite-reviewer-dialog'
import { RecordDecisionDialog } from './record-decision-dialog'

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="text-right text-[13px]">{children}</dd>
    </div>
  )
}

function now() {
  return new Date().toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export function ManuscriptScreen({ id }: { id: string }) {
  const data = React.useMemo(() => getManuscriptDetail(id), [id])
  const m = data?.detail
  const reviews = React.useMemo(() => data?.reviews ?? [], [data])

  const [status, setStatus] = React.useState<ManuscriptStatus>(m?.status ?? 'submitted')
  const [activity, setActivity] = React.useState<ActivityEntry[]>(data?.activity ?? [])
  const [invited, setInvited] = React.useState<string[]>([])
  const [tab, setTab] = React.useState(reviews.length > 0 ? 'reviews' : 'activity')

  const split = new Set(reviews.map((r) => r.recommendation)).size > 1
  const decided = status !== 'decision_pending'

  function log(entry: Omit<ActivityEntry, 'id'>) {
    setActivity((a) => [...a, { ...entry, id: `z${a.length + 1}` }])
  }

  if (!m) {
    return (
      <div className="mx-auto w-full max-w-[600px] px-4 py-16 text-center md:px-6">
        <h1 className="text-lg font-semibold">No such manuscript</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Reference <span className="tnum">{id}</span> is not in this journal.
        </p>
        <Link href="/desk" className="text-primary mt-4 inline-block text-sm hover:underline">
          Back to the editor desk
        </Link>
      </div>
    )
  }

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
            <StatusBadge status={status} />
            <Badge variant="outline" className="gap-1">
              <EyeOff className="size-3" />
              Double-blind
            </Badge>
            <span className="text-muted-foreground text-xs">{m.daysInStatus} days in this status</span>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <InviteReviewerDialog
            onInvite={(name) => {
              setInvited((i) => [...i, name])
              log({ kind: 'system', actor: 'A. Okonkwo', text: `invited ${name}`, at: now() })
              setTab('activity')
            }}
          />
          {!decided && reviews.length > 0 && (
            <RecordDecisionDialog
              onDecide={(next, label) => {
                setStatus(next)
                log({
                  kind: 'system',
                  actor: 'A. Okonkwo',
                  text: `recorded a decision — ${label.toLowerCase()} — and sent the letter`,
                  at: now(),
                  tone: next === 'accepted' ? 'success' : 'default',
                })
                setTab('activity')
              }}
            />
          )}
        </div>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="reviews">
              Reviews
              <span className="bg-muted text-muted-foreground tnum rounded px-1.5 py-0.5 text-[11px]">
                {reviews.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="manuscript">Manuscript</TabsTrigger>
            <TabsTrigger value="activity">
              Activity
              <span className="bg-muted text-muted-foreground tnum rounded px-1.5 py-0.5 text-[11px]">
                {activity.length}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reviews" className="flex flex-col gap-4">
            {split && !decided && (
              <div className="bg-warning-muted/60 border-warning/40 flex items-start gap-2.5 rounded-md border px-3.5 py-2.5">
                <Scale className="text-warning mt-0.5 size-4 shrink-0" />
                <p className="text-sm">
                  <span className="font-medium">The reviewers disagree.</span>{' '}
                  <span className="text-muted-foreground">
                    Minor revision against major revision. Read Reviewer 2 on the statistical claim before deciding.
                  </span>
                </p>
              </div>
            )}
            {reviews.length === 0 ? (
              <div className="bg-card rounded-lg border px-4 py-12 text-center">
                <p className="text-sm font-medium">No reviews yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Invite a reviewer to get this moving. Reports appear here as they are filed.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            )}
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
            <ActivityStream entries={activity} />
          </TabsContent>
        </Tabs>

        <aside className="flex flex-col gap-4">
          <div className="bg-card rounded-lg border p-4">
            <dl>
              <Property label="Handling editor">{m.handlingEditor}</Property>
              <Property label="Submitted">{m.submittedAt}</Property>
              <Property label="Reviews required">
                <span className="tnum">
                  {reviews.length}/{m.reviewsRequired}
                </span>
              </Property>
              {invited.length > 0 && (
                <Property label="Newly invited">
                  <span className="tnum">{invited.length}</span>
                </Property>
              )}
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
            <h2 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">Authors</h2>
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
