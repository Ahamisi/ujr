'use client'

import * as React from 'react'
import Link from 'next/link'
import { CheckCircle2, EyeOff, FileUp, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { KeywordField } from '@/components/journal/keyword-field'
import { SuggestInput, type Suggestion } from '@/components/journal/suggest-input'
import { api } from '@/lib/api'
import { catalogueKey } from '@/lib/catalogue'
import { DECLARATION_LABELS, DEFAULT_DECLARATIONS, type DeclarationKey } from '@/lib/declarations'
import { useSession } from '@/lib/session'
import { cn } from '@/lib/utils'

type Step = 'upload' | 'details' | 'declarations' | 'done'

export function SubmitForm() {
  const { session } = useSession()
  const [step, setStep] = React.useState<Step>('upload')
  const [file, setFile] = React.useState<File | null>(null)
  const [title, setTitle] = React.useState('')
  const [abstract, setAbstract] = React.useState('')
  const [keywords, setKeywords] = React.useState<string[]>([])
  const [sections, setSections] = React.useState<{ id: string; name: string }[]>([])
  const [sectionId, setSectionId] = React.useState('')
  const [sectionName, setSectionName] = React.useState('')
  const [institution, setInstitution] = React.useState('')
  const [institutionOptions, setInstitutionOptions] = React.useState<Suggestion[]>([])
  const [requiredDeclarations, setRequiredDeclarations] = React.useState<DeclarationKey[]>(DEFAULT_DECLARATIONS)
  const [abstractLimit, setAbstractLimit] = React.useState(300)
  const [keywordLimit, setKeywordLimit] = React.useState(6)
  const [acceptedTypes, setAcceptedTypes] = React.useState(['.docx', '.pdf', '.tex', '.zip'])
  const [maxFileSizeMb, setMaxFileSizeMb] = React.useState(60)
  const [submittedId, setSubmittedId] = React.useState('')
  const [checked, setChecked] = React.useState<string[]>([])
  const [reference, setReference] = React.useState('')
  const [pending, setPending] = React.useState(false)
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [fileUrl, setFileUrl] = React.useState<string | null>(null)
  const draftId = React.useRef<string | null>(null)
  const fileUploaded = React.useRef(false)
  const toast = useToast()

  function openPreview() {
    if (file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      setFileUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return URL.createObjectURL(file)
      })
    }
    setPreviewOpen(true)
  }

  function closePreview(open: boolean) {
    if (!open) {
      setFileUrl((current) => {
        if (current) URL.revokeObjectURL(current)
        return null
      })
    }
    setPreviewOpen(open)
  }

  React.useEffect(() => {
    api<{ id: string; name: string; acceptsSubmissions: boolean }[]>('/sections')
      .then((rows) => {
        const open = rows.filter((row) => row.acceptsSubmissions)
        setSections(open)
        const first = open.find((row) => catalogueKey(row.name) === catalogueKey('Civil & Structural')) ?? open[0]
        if (first) {
          setSectionId(first.id)
          setSectionName(first.name)
        }
      })
      .catch(() => {})
    api<{
      requiredDeclarations?: DeclarationKey[]
      abstractWordLimit?: number
      maxKeywords?: number
      acceptedFileTypes?: string[]
      maxFileSizeMb?: number
    }>('')
      .then((journal) => {
        if (journal.requiredDeclarations?.length) setRequiredDeclarations(journal.requiredDeclarations)
        if (journal.abstractWordLimit) setAbstractLimit(journal.abstractWordLimit)
        if (typeof journal.maxKeywords === 'number') setKeywordLimit(journal.maxKeywords)
        if (journal.acceptedFileTypes?.length) setAcceptedTypes(journal.acceptedFileTypes)
        if (journal.maxFileSizeMb) setMaxFileSizeMb(journal.maxFileSizeMb)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    const handle = setTimeout(() => {
      api<{ id: string; name: string; useCount: number }[]>(`/institutions?q=${encodeURIComponent(institution)}`)
        .then((rows) =>
          setInstitutionOptions(
            rows.map((row) => ({
              id: row.id,
              label: row.name,
              hint: row.useCount > 0 ? String(row.useCount) : undefined,
            })),
          ),
        )
        .catch(() => {})
    }, 150)
    return () => clearTimeout(handle)
  }, [institution])

  async function commitSection(name: string) {
    const match = sections.find((row) => catalogueKey(row.name) === catalogueKey(name))
    if (match) {
      setSectionId(match.id)
      return match.name
    }
    const created = await api<{ id: string; name: string }>('/sections', {
      method: 'POST',
      body: JSON.stringify({ name }),
    })
    setSections((list) => [...list, { id: created.id, name: created.name }])
    setSectionId(created.id)
    return created.name
  }

  async function commitInstitution(name: string, count = false) {
    const saved = await api<{ id: string; name: string; useCount: number }>('/institutions', {
      method: 'POST',
      body: JSON.stringify({ name, count }),
    })
    return saved.name
  }

  function wordCount(value: string) {
    return value.trim().split(/\s+/).filter(Boolean).length
  }

  function takeFile(next: File) {
    const extension = next.name.includes('.') ? `.${next.name.split('.').pop()!.toLowerCase()}` : ''
    if (!acceptedTypes.includes(extension)) {
      toast(`This journal accepts ${acceptedTypes.join(', ')}`)
      return
    }
    if (next.size > maxFileSizeMb * 1024 * 1024) {
      toast(`File is larger than ${maxFileSizeMb} MB`)
      return
    }
    fileUploaded.current = false
    draftId.current = null
    setFile(next)
  }

  async function submitManuscript() {
    if (!session || !file || !sectionId) return
    if (wordCount(abstract) > abstractLimit) {
      toast(`Abstract is over the ${abstractLimit} word limit`)
      return
    }
    const missing = requiredDeclarations.filter((id) => !checked.includes(id))
    if (missing.length > 0) {
      toast(`Please confirm: ${DECLARATION_LABELS[missing[0]]}`)
      return
    }
    const [givenName, ...rest] = session.name.split(/\s+/)
    const familyName = rest.join(' ') || givenName
    setPending(true)
    try {
      let id = draftId.current
      if (!id) {
        const draft = await api<{ id: string; reference: string }>('/manuscripts', {
          method: 'POST',
          body: JSON.stringify({
            sectionId,
            title: title.trim(),
            abstract: abstract.trim(),
            keywords,
            authors: [
              {
                givenName,
                familyName,
                email: session.email,
                affiliation: institution.trim() ? await commitInstitution(institution, true) : undefined,
                isCorresponding: true,
              },
            ],
          }),
        })
        id = draft.id
        draftId.current = id
      }
      if (!fileUploaded.current) {
        const body = new FormData()
        body.set('file', file)
        body.set('kind', 'manuscript')
        await api(`/manuscripts/${id}/files`, { method: 'POST', body })
        fileUploaded.current = true
      }
      const declarations = Object.fromEntries(requiredDeclarations.map((key) => [key, { affirmed: true }]))
      const submitted = await api<{ reference: string }>(`/manuscripts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ declarations }),
      })
      setReference(submitted.reference)
      setSubmittedId(id)
      setStep('done')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not submit')
    } finally {
      setPending(false)
    }
  }

  const declarations = requiredDeclarations.map((id) => ({ id, label: DECLARATION_LABELS[id] }))
  const allDeclared = declarations.every((item) => checked.includes(item.id))
  const pdfPreview = file?.type === 'application/pdf' || file?.name.toLowerCase().endsWith('.pdf')

  if (step === 'done') {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="text-success mx-auto size-10" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Submitted</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm leading-relaxed">
          Your manuscript has the reference <span className="tnum font-medium">{reference}</span>. It is on My
          submissions, and the editors have been notified.
        </p>
        {submittedId && (
          <Link href={`/my-submissions/${submittedId}`} className="text-primary mt-4 inline-block text-sm hover:underline">
            Open the submission
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex flex-wrap gap-x-6 gap-y-1">
        {(['upload', 'details', 'declarations'] as Step[]).map((s, i) => (
          <li
            key={s}
            className={cn(
              'flex items-center gap-2 text-sm',
              step === s ? 'font-medium' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'tnum flex size-5 items-center justify-center rounded-full border text-[11px]',
                step === s && 'border-primary bg-primary text-primary-foreground',
              )}
            >
              {i + 1}
            </span>
            {s === 'upload' ? 'Upload' : s === 'details' ? 'Check the details' : 'Declarations'}
          </li>
        ))}
      </ol>

      {step === 'upload' && (
        <div className="flex flex-col gap-4">
          <label className="border-border hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-ring flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-12 transition-colors">
            <FileUp className="text-muted-foreground size-6" />
            <span className="text-sm font-medium">{file ? file.name : 'Choose a manuscript file'}</span>
            <span className="text-muted-foreground text-xs">{acceptedTypes.join(', ')} · up to {maxFileSizeMb} MB</span>
            <input
              type="file"
              accept={acceptedTypes.join(',')}
              className="sr-only"
              onChange={(e) => {
                const next = e.target.files?.[0]
                if (next) takeFile(next)
              }}
            />
          </label>
          <Button disabled={!file} onClick={() => setStep('details')}>
            Continue
          </Button>

          <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            We read the title, authors, abstract and references out of the file so you can correct them rather than
            retype them.
          </p>
        </div>
      )}

      {step === 'details' && (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">These are stored with the file you uploaded.</p>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-title">Title</Label>
            <Input id="sub-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-abstract">Abstract</Label>
            <Textarea
              id="sub-abstract"
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              className="min-h-36"
            />
            <p className={cn('tnum text-xs', wordCount(abstract) > abstractLimit ? 'text-destructive' : 'text-muted-foreground')}>
              {wordCount(abstract)} of {abstractLimit} words
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-keywords">Keywords</Label>
            <KeywordField id="sub-keywords" value={keywords} onChange={setKeywords} limit={keywordLimit} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-institution">Institution</Label>
            <SuggestInput
              id="sub-institution"
              value={institution}
              placeholder="University of Lagos"
              options={institutionOptions}
              onChange={setInstitution}
              onCommit={(name) => commitInstitution(name)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-section">Section</Label>
            <SuggestInput
              id="sub-section"
              value={sectionName}
              placeholder="Civil & Structural"
              options={sections
                .filter((row) => catalogueKey(row.name).includes(catalogueKey(sectionName)) || sectionName.trim() === '')
                .map((row) => ({ id: row.id, label: row.name }))}
              onChange={setSectionName}
              onCommit={commitSection}
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button
              onClick={() => {
                void (async () => {
                  try {
                    if (sectionName.trim()) setSectionName(await commitSection(sectionName))
                    if (institution.trim()) setInstitution(await commitInstitution(institution))
                    setStep('declarations')
                  } catch (err) {
                    toast(err instanceof Error ? err.message : 'Could not save those details')
                  }
                })()
              }}
              disabled={!title.trim() || !sectionName.trim() || institution.trim().length < 2 || wordCount(abstract) > abstractLimit}
            >
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'declarations' && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Please confirm</legend>
            {declarations.map((d) => {
              const on = checked.includes(d.id)
              return (
                <label
                  key={d.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm transition-colors',
                    on ? 'border-primary bg-accent/40' : 'border-border hover:bg-muted',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setChecked((c) => (on ? c.filter((x) => x !== d.id) : [...c, d.id]))
                    }
                    className="accent-primary mt-0.5 size-4"
                  />
                  {d.label}
                </label>
              )
            })}
          </fieldset>

          <div className="bg-card rounded-lg border p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <EyeOff className="size-4" />
              What the reviewers will see
            </h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              This journal reviews double-blind. Reviewers see the title, abstract and keywords. Your name, email
              and institution are left off that record.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={openPreview}>
              Preview the anonymised version
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setStep('details')}>
              Back
            </Button>
            <Button disabled={!allDeclared || pending || !sectionId} onClick={() => void submitManuscript()}>
              {pending ? 'Submitting…' : 'Submit manuscript'}
            </Button>
            {!allDeclared && (
              <Badge variant="secondary">
                {declarations.filter((item) => !checked.includes(item.id)).length} declaration(s) left
              </Badge>
            )}
          </div>
        </div>
      )}

      <Dialog open={previewOpen} onOpenChange={closePreview}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>What a reviewer sees</DialogTitle>
            <DialogDescription>
              Name, email and institution are not on this record. The file below is the one you uploaded.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-4">
            <div>
              <p className="text-muted-foreground text-xs">Title</p>
              <p className="text-sm font-medium">{title.trim() || 'Untitled'}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Abstract</p>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{abstract.trim() || 'No abstract yet.'}</p>
            </div>
            {keywords.length > 0 && (
              <p className="text-muted-foreground text-xs">{keywords.join(' · ')}</p>
            )}
            <p className="text-muted-foreground text-xs">Section: {sectionName}</p>
            <div className="rounded-md border border-dashed px-3 py-2 text-sm">
              <p className="font-medium">Withheld</p>
              <p className="text-muted-foreground mt-1">{session?.name}</p>
              <p className="text-muted-foreground">{session?.email}</p>
              <p className="text-muted-foreground">{institution}</p>
            </div>
            {pdfPreview && fileUrl ? (
              <iframe title="Uploaded manuscript" src={fileUrl} className="h-[28rem] w-full rounded-md border" />
            ) : (
              <p className="text-muted-foreground text-sm">
                {file ? file.name : 'No file'} is attached. A PDF opens here; other file types stay as a download for the editor.
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
