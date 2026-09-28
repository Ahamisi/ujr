'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, EyeOff, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ActivityStream } from '@/components/journal/activity-stream'
import { EditorMarkup } from '@/components/journal/manuscript-notes'
import { SimilarityScore } from '@/components/journal/similarity-score'
import { StatusBadge } from '@/components/journal/status-badge'
import { InviteReviewerDialog } from '@/components/journal/invite-reviewer-dialog'
import { Remote, useRemote } from '@/components/shell/remote'
import { activeJournal, api, formatWhen } from '@/lib/api'
import type { ActivityEntry } from '@/lib/mock-manuscript'
import { ASSIGNMENT_META } from '@/lib/manuscript-status'
import type { AssignmentStatus, ManuscriptStatus } from '@/lib/types'
import { RecordDecisionDialog } from './record-decision-dialog'

interface EditorManuscript {
  id: string
  reference: string
  title: string
  abstract: string | null
  status: ManuscriptStatus
  section: string
  round: number
  submittedAt: string | null
  daysInStatus: number
  similarityPercent: number | null
  handlingEditor: string | null
  blinding: string | null
  authors: { name: string; affiliation: string | null; corresponding: boolean }[]
  reviewers: { id: string; displayName: string; realName: string; status: AssignmentStatus; dueAt: string }[]
  files: { id: string; kind: string; originalName: string; isMetadataScrubbed: boolean }[]
  activity: { id: string; fromStatus: string | null; toStatus: string; reason: string | null; createdAt: string }[]
  policy?: { policy?: { review?: { reviewsRequired?: number }; publishing?: { licence?: string } } } | null
}

function Property({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-muted-foreground shrink-0 text-xs">{label}</dt>
      <dd className="text-right text-[13px]">{children}</dd>
    </div>
  )
}

export function ManuscriptScreen({ id }: { id: string }) {
  const { data, error, loading, setData } = useRemote<EditorManuscript>(`/manuscripts/${id}`)
  const [tab, setTab] = React.useState('activity')

  const activity: ActivityEntry[] = (data?.activity ?? []).map((entry) => ({
    id: entry.id,
    kind: 'system',
    actor: 'Journal',
    text: `${entry.fromStatus ?? 'created'} → ${entry.toStatus}${entry.reason ? ` — ${entry.reason}` : ''}`,
    at: formatWhen(entry.createdAt),
  }))

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 md:px-6">
      <Link href="/desk" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-3.5" />
        Editor desk
      </Link>
      <Remote loading={loading} error={error}>
        {data && (
          <>
            <header className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-muted-foreground tnum flex items-center gap-2 text-[13px]">
                  {data.reference}
                  <span>·</span>
                  Round {data.round}
                  <span>·</span>
                  {data.section || 'No section'}
                </p>
                <h1 className="mt-1 max-w-3xl text-xl font-semibold tracking-tight text-balance">{data.title}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={data.status} />
                  <Badge variant="outline" className="gap-1">
                    <EyeOff className="size-3" />
                    {(data.blinding ?? 'double_blind').replaceAll('_', ' ')}
                  </Badge>
                  <span className="text-muted-foreground text-xs">{data.daysInStatus} days in this status</span>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <InviteReviewerDialog
                  subject={data.reference}
                  onInvite={async (reviewer) => {
                    await api(`/manuscripts/${id}/invitations`, {
                      method: 'POST',
                      body: JSON.stringify({ reviewerId: reviewer.id }),
                    })
                  }}
                />
                {data.status === 'decision_pending' && (
                  <RecordDecisionDialog
                    manuscriptId={id}
                    reference={data.reference}
                    onDecide={(status) => setData((current) => (current ? { ...current, status } : current))}
                  />
                )}
              </div>
            </header>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full justify-start overflow-x-auto">
                  <TabsTrigger value="reviews">
                    Reviewers
                    <span className="bg-muted text-muted-foreground tnum rounded px-1.5 py-0.5 text-[11px]">
                      {data.reviewers.length}
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

                <TabsContent value="reviews" className="flex flex-col gap-2">
                  {data.reviewers.length === 0 ? (
                    <div className="bg-card rounded-lg border px-4 py-12 text-center">
                      <p className="text-sm font-medium">No reviewers yet</p>
                      <p className="text-muted-foreground mt-1 text-sm">Invite someone to get this moving.</p>
                    </div>
                  ) : (
                    data.reviewers.map((reviewer) => (
                      <div key={reviewer.id} className="bg-card flex items-center justify-between rounded-lg border px-4 py-3">
                        <div>
                          <p className="text-sm font-medium">{reviewer.realName}</p>
                          <p className="text-muted-foreground text-xs">{reviewer.displayName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">{ASSIGNMENT_META[reviewer.status]?.label ?? reviewer.status}</p>
                          <p className="text-muted-foreground tnum text-xs">Due {formatWhen(reviewer.dueAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="manuscript" className="flex flex-col gap-4">
                  <div className="bg-card rounded-lg border p-5">
                    <h2 className="mb-2 text-sm font-medium">Abstract</h2>
                    <p className="max-w-prose text-sm leading-relaxed">{data.abstract || 'No abstract yet.'}</p>
                  </div>
                  <div className="bg-card rounded-lg border p-5">
                    <h2 className="mb-3 text-sm font-medium">Files</h2>
                    {data.files.length === 0 ? (
                      <p className="text-muted-foreground text-sm">No files uploaded.</p>
                    ) : (
                      <ul className="flex flex-col gap-4">
                        {data.files.map((file) => (
                          <li key={file.id} className="flex flex-col gap-2 text-sm">
                            <div className="flex items-center gap-2.5">
                              <FileText className="text-muted-foreground size-4 shrink-0" />
                              <a className="font-medium hover:underline" href={`/api/v1/j/${activeJournal()}/files/${file.id}`}>
                                {file.originalName}
                              </a>
                              <span className="text-muted-foreground text-xs">
                                {file.kind}
                                {file.isMetadataScrubbed ? ' · metadata scrubbed' : ''}
                              </span>
                            </div>
                            <EditorMarkup
                              manuscriptId={data.id}
                              file={{ id: file.id, name: file.originalName }}
                              onUploaded={(uploaded) =>
                                setData((current) =>
                                  current
                                    ? {
                                        ...current,
                                        files: [
                                          ...current.files,
                                          {
                                            id: uploaded.id,
                                            kind: uploaded.kind,
                                            originalName: uploaded.originalName,
                                            isMetadataScrubbed: uploaded.isMetadataScrubbed,
                                          },
                                        ],
                                      }
                                    : current,
                                )
                              }
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="activity">
                  <ActivityStream entries={activity} />
                </TabsContent>
              </Tabs>

              <aside className="flex flex-col gap-4">
                <div className="bg-card rounded-lg border p-4">
                  <dl>
                    <Property label="Handling editor">{data.handlingEditor ?? 'Unassigned'}</Property>
                    <Property label="Submitted">{formatWhen(data.submittedAt)}</Property>
                    <Property label="Reviews required">
                      <span className="tnum">
                        {data.reviewers.filter((reviewer) => reviewer.status === 'submitted').length}/
                        {data.policy?.policy?.review?.reviewsRequired ?? 2}
                      </span>
                    </Property>
                    <Property label="Similarity">
                      <SimilarityScore value={data.similarityPercent} />
                    </Property>
                    <Property label="Licence">{data.policy?.policy?.publishing?.licence ?? '—'}</Property>
                  </dl>
                  <Separator className="my-3" />
                  <p className="text-muted-foreground text-[11px] leading-relaxed">
                    Policy is frozen onto the manuscript at submission. Later settings changes do not rewrite it.
                  </p>
                </div>
                <div className="bg-card rounded-lg border p-4">
                  <h2 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">Authors</h2>
                  <ul className="flex flex-col gap-2.5">
                    {(data.authors ?? []).map((author) => (
                      <li key={author.name}>
                        <p className="flex items-center gap-1.5 text-[13px] font-medium">
                          {author.name}
                          {author.corresponding && (
                            <Badge variant="secondary" className="font-normal">
                              Corresponding
                            </Badge>
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">{author.affiliation}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </aside>
            </div>
          </>
        )}
      </Remote>
    </div>
  )
}
