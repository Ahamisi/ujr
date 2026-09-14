'use client'

import * as React from 'react'
import { AlertTriangle, Check, Code2, Copy, Loader2, RefreshCw, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useToast } from '@/components/ui/toast'
import { PageHeader } from '@/components/shell/page-header'
import { DEPOSIT_STATE, depositXml, mintDoi, type DepositRecord, type DepositState } from '@/lib/doi'
import { ARTICLES, JOURNAL, doiUrl, type Article } from '@/lib/mock-published'

/** Starting state. In production this is a table, and the deposit job owns it. */
const INITIAL: DepositRecord[] = ARTICLES.map((a, i) => ({
  articleId: a.id,
  doi: i === 2 ? null : a.doi,
  state: i === 2 ? 'unminted' : i === 1 ? 'failed' : i === 4 ? 'queued' : 'registered',
  submissionId: i === 0 || i === 3 || i === 5 ? `CR-${1400 + i * 37}` : null,
  lastAttemptAt: i === 2 ? null : '2026-03-28',
  attempts: i === 1 ? 3 : i === 2 ? 0 : 1,
  error: i === 1 ? 'Duplicate title within the same ISSN — Crossref requires a resolution before retrying' : undefined,
}))

export function DoiRegistry() {
  const [records, setRecords] = React.useState<DepositRecord[]>(INITIAL)
  const [busy, setBusy] = React.useState<string[]>([])
  const [preview, setPreview] = React.useState<Article | null>(null)
  const [copied, setCopied] = React.useState(false)
  const toast = useToast()

  const byId = React.useMemo(() => new Map(ARTICLES.map((a) => [a.id, a])), [])

  const pending = records.filter((r) => r.state !== 'registered' && r.state !== 'failed')
  const failed = records.filter((r) => r.state === 'failed')
  const registered = records.filter((r) => r.state === 'registered')

  function update(id: string, patch: Partial<DepositRecord>) {
    setRecords((list) => list.map((r) => (r.articleId === id ? { ...r, ...patch } : r)))
  }

  /** Mint, then deposit. Minting is instant and local; depositing is a job. */
  async function register(record: DepositRecord) {
    const article = byId.get(record.articleId)
    if (!article) return

    setBusy((b) => [...b, record.articleId])

    let doi = record.doi
    if (!doi) {
      doi = mintDoi(JOURNAL.doiPrefix ? '{prefix}/{journalSlug}.{year}.{articleNumber}' : '', {
        prefix: JOURNAL.doiPrefix,
        journalSlug: JOURNAL.abbreviation.toLowerCase(),
        year: article.publishedIso.slice(0, 4),
        articleNumber: article.id.split('-').pop() ?? '0001',
      })
      update(record.articleId, { doi, state: 'minted' })
      await new Promise((r) => setTimeout(r, 350))
    }

    update(record.articleId, { state: 'submitted', attempts: record.attempts + 1, lastAttemptAt: '2026-09-14' })
    await new Promise((r) => setTimeout(r, 900))

    update(record.articleId, {
      state: 'registered',
      submissionId: `CR-${Math.floor(2000 + Math.random() * 900)}`,
      error: undefined,
    })
    setBusy((b) => b.filter((x) => x !== record.articleId))
    toast(`${doi} registered with Crossref`)
  }

  async function registerAll() {
    const queue = records.filter((r) => r.state !== 'registered')
    for (const r of queue) await register(r)
    toast(`${queue.length} deposits processed`)
  }

  async function copyXml(article: Article) {
    try {
      await navigator.clipboard.writeText(depositXml(article))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — the XML is selectable in the dialog */
    }
  }

  const TILES = [
    { value: registered.length, label: 'Registered', note: 'Live and resolving through doi.org' },
    { value: pending.length, label: 'Awaiting deposit', note: 'Minted or queued, not yet confirmed' },
    { value: failed.length, label: 'Failed', note: failed.length > 0 ? 'Needs a human' : 'Nothing to fix' },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="DOI registry"
        description={`Every published article, and where its Crossref deposit has got to. Prefix ${JOURNAL.doiPrefix}.`}
        actions={
          <Button size="sm" onClick={registerAll} disabled={records.every((r) => r.state === 'registered')}>
            <Send />
            Register all pending
          </Button>
        }
      />

      <div className="divide-border grid border-y sm:grid-cols-3 sm:divide-x">
        {TILES.map((t) => (
          <div key={t.label} className="px-4 py-3.5">
            <p className="font-serif tnum text-[28px] leading-none font-semibold tracking-[-0.02em]">{t.value}</p>
            <p className="mt-0.5 text-[13px] font-medium">{t.label}</p>
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">{t.note}</p>
          </div>
        ))}
      </div>

      <div className="bg-accent/40 flex items-start gap-2.5 border px-3.5 py-3">
        <AlertTriangle className="text-primary mt-0.5 size-4 shrink-0" />
        <p className="text-sm leading-relaxed">
          <span className="font-medium">A DOI is permanent.</span>{' '}
          <span className="text-muted-foreground">
            Once registered it can never be reassigned or deleted. Corrections update the metadata at the same DOI; a
            retraction is a new record pointing back at the original.
          </span>
        </p>
      </div>

      <div className="overflow-hidden border-y">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Article</TableHead>
              <TableHead className="w-[230px]">DOI</TableHead>
              <TableHead className="w-[140px]">Deposit</TableHead>
              <TableHead className="w-[120px]">Submission</TableHead>
              <TableHead className="w-[170px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((r) => {
              const article = byId.get(r.articleId)!
              const meta = DEPOSIT_STATE[r.state as DepositState]
              const working = busy.includes(r.articleId)
              return (
                <TableRow key={r.articleId}>
                  <TableCell className="max-w-sm">
                    <p className="font-medium">{article.title}</p>
                    <p className="text-muted-foreground tnum mt-0.5 text-xs">
                      {article.volume}({article.issue}), {article.pages} · {article.publishedAt}
                    </p>
                  </TableCell>

                  <TableCell>
                    {r.doi ? (
                      <a
                        href={doiUrl(r.doi)}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary tnum text-[13px] hover:underline"
                      >
                        {r.doi}
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">Not yet minted</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <Badge variant={meta.variant}>{working ? 'Working' : meta.label}</Badge>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
                      {r.error ?? meta.blocking}
                    </p>
                  </TableCell>

                  <TableCell className="text-muted-foreground tnum text-xs">
                    {r.submissionId ?? '—'}
                    {r.attempts > 1 && <p className="mt-0.5">{r.attempts} attempts</p>}
                  </TableCell>

                  <TableCell className="py-2">
                    <div className="flex flex-wrap gap-1.5">
                      <Button variant="ghost" size="sm" onClick={() => setPreview(article)}>
                        <Code2 />
                        XML
                      </Button>
                      {r.state !== 'registered' && (
                        <Button variant="outline" size="sm" disabled={working} onClick={() => register(r)}>
                          {working ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                          {r.state === 'failed' ? 'Retry' : r.doi ? 'Deposit' : 'Mint & deposit'}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={preview !== null} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Crossref deposit</DialogTitle>
            <DialogDescription>
              Generated from the article record, so what is deposited always matches what the article page shows.
              Schema 5.3.1.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            {preview && (
              <>
                <Button variant="outline" size="sm" className="mb-3" onClick={() => copyXml(preview)}>
                  {copied ? <Check /> : <Copy />}
                  {copied ? 'Copied' : 'Copy XML'}
                </Button>
                <pre className="bg-muted overflow-x-auto rounded-md p-3 font-mono text-[11px] leading-relaxed">
                  {depositXml(preview)}
                </pre>
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  )
}
