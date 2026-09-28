'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, EyeOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FilePreview } from '@/components/journal/file-preview'
import { StatusBadge } from '@/components/journal/status-badge'
import { DraftEditor } from './draft-editor'
import { Remote, useRemote } from '@/components/shell/remote'
import { useToast } from '@/components/ui/toast'
import { activeJournal, api, formatWhen } from '@/lib/api'
import { STATUS_META } from '@/lib/manuscript-status'
import type { ManuscriptStatus } from '@/lib/types'

interface AuthorManuscript {
  id: string
  reference: string
  title: string
  abstract: string | null
  keywords: string[]
  status: ManuscriptStatus
  sectionId: string | null
  section: string
  files: { id: string; kind: string; originalName: string }[]
  submittedAt: string | null
  authors: { givenName: string; familyName: string; affiliation: string | null; isCorresponding: boolean }[]
  decisions: { round: number; decision: string; letterBody: string; createdAt: string }[]
  reviews: { displayName: string; round: number; comments: Record<string, unknown> }[]
}

export function SubmissionView({ id }: { id: string }) {
  const { data, error, loading, reload } = useRemote<AuthorManuscript>(`/manuscripts/${id}`)
  const [confirming, setConfirming] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const router = useRouter()
  const toast = useToast()

  async function removeDraft() {
    setDeleting(true)
    try {
      await api(`/manuscripts/${id}`, { method: 'DELETE' })
      router.push('/my-submissions')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not delete that draft')
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[820px] px-4 py-6 md:px-6">
      <Link href="/my-submissions" className="text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-3.5" />
        My submissions
      </Link>
      <Remote loading={loading} error={error}>
        {data && (
          <>
            <p className="text-muted-foreground tnum text-[13px]">
              {data.reference} · {data.submittedAt ? `Submitted ${formatWhen(data.submittedAt)}` : 'Not submitted'}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight text-balance">{data.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={data.status} />
              <Badge variant="outline" className="gap-1">
                <EyeOff className="size-3" />
                Double-blind
              </Badge>
              {data.status === 'draft' && (
                <Button variant="outline" size="sm" className="ml-auto" onClick={() => setConfirming(true)}>
                  Delete draft
                </Button>
              )}
            </div>
            <div className="bg-accent/50 mt-5 rounded-lg border px-4 py-3">
              <p className="text-sm leading-relaxed">{STATUS_META[data.status].blocking}</p>
            </div>
            {data.status === 'draft' ? (
              <DraftEditor
                id={data.id}
                title={data.title}
                abstract={data.abstract ?? ''}
                keywords={data.keywords ?? []}
                sectionId={data.sectionId}
                affiliation={data.authors.find((author) => author.isCorresponding)?.affiliation ?? data.authors[0]?.affiliation ?? ''}
                files={(data.files ?? []).filter((file) => file.kind === 'manuscript')}
                onSaved={reload}
              />
            ) : (
              <>
            {(data.keywords ?? []).length > 0 && (
              <p className="text-muted-foreground mt-3 text-xs">{data.keywords.join(' · ')}</p>
            )}
            {(data.files ?? []).map((file) => (
              <section key={file.id} className="mt-4 flex flex-col gap-2">
                <a href={`/api/v1/j/${activeJournal()}/files/${file.id}`} className="text-primary text-sm hover:underline">
                  {file.originalName}
                </a>
                <FilePreview href={`/api/v1/j/${activeJournal()}/files/${file.id}`} name={file.originalName} />
              </section>
            ))}
            {data.abstract && (
              <section className="mt-6">
                <h2 className="text-sm font-medium">Abstract</h2>
                <p className="mt-2 max-w-prose text-sm leading-relaxed">{data.abstract}</p>
              </section>
            )}
            {data.decisions.length > 0 && (
              <section className="mt-6 flex flex-col gap-3">
                <h2 className="text-sm font-medium">Decisions</h2>
                {data.decisions.map((decision) => (
                  <article key={`${decision.round}-${decision.createdAt}`} className="bg-card rounded-lg border p-4">
                    <p className="text-muted-foreground tnum text-xs">
                      Round {decision.round} · {decision.decision.replaceAll('_', ' ')} · {formatWhen(decision.createdAt)}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">{decision.letterBody}</p>
                  </article>
                ))}
              </section>
            )}
            {data.reviews.length > 0 && (
              <section className="mt-6 flex flex-col gap-3">
                <h2 className="text-sm font-medium">Reviews</h2>
                {data.reviews.map((review) => (
                  <article key={`${review.displayName}-${review.round}`} className="bg-card rounded-lg border p-4">
                    <p className="text-sm font-medium">
                      {review.displayName} · round {review.round}
                    </p>
                    <ul className="mt-2 flex flex-col gap-2">
                      {Object.entries(review.comments).map(([key, value]) => (
                        <li key={key} className="text-sm leading-relaxed">
                          {String(value)}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </section>
            )}
              </>
            )}
          </>
        )}
      </Remote>

      <Dialog open={confirming} onOpenChange={(open) => !open && !deleting && setConfirming(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this draft?</DialogTitle>
            <DialogDescription>It has not been submitted. The manuscript and the uploaded file are removed.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={() => void removeDraft()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete draft'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
