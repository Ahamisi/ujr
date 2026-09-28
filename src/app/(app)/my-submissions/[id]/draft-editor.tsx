'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { FilePreview } from '@/components/journal/file-preview'
import { KeywordField } from '@/components/journal/keyword-field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { activeJournal, api } from '@/lib/api'
import { DECLARATION_LABELS, DEFAULT_DECLARATIONS, type DeclarationKey } from '@/lib/declarations'

interface DraftFile {
  id: string
  originalName: string
}

export function DraftEditor({
  id,
  title,
  abstract,
  keywords,
  sectionId,
  affiliation,
  files,
  onSaved,
}: {
  id: string
  title: string
  abstract: string
  keywords: string[]
  sectionId: string | null
  affiliation: string
  files: DraftFile[]
  onSaved: () => void
}) {
  const router = useRouter()
  const toast = useToast()
  const [nextTitle, setNextTitle] = React.useState(title)
  const [nextAbstract, setNextAbstract] = React.useState(abstract)
  const [nextKeywords, setNextKeywords] = React.useState(keywords)
  const [nextSection, setNextSection] = React.useState(sectionId ?? '')
  const [nextAffiliation, setNextAffiliation] = React.useState(affiliation)
  const [sections, setSections] = React.useState<{ id: string; name: string }[]>([])
  const [required, setRequired] = React.useState<DeclarationKey[]>(DEFAULT_DECLARATIONS)
  const [checked, setChecked] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)
  const [replacing, setReplacing] = React.useState(false)
  const manuscriptFile = files[0]

  React.useEffect(() => {
    api<{ id: string; name: string; acceptsSubmissions: boolean }[]>('/sections')
      .then((rows) => setSections(rows.filter((row) => row.acceptsSubmissions)))
      .catch(() => {})
    api<{ requiredDeclarations?: DeclarationKey[] }>('')
      .then((journal) => {
        if (journal.requiredDeclarations?.length) setRequired(journal.requiredDeclarations)
      })
      .catch(() => {})
  }, [])

  async function save() {
    setSaving(true)
    try {
      await api(`/manuscripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: nextTitle.trim(),
          abstract: nextAbstract,
          keywords: nextKeywords,
          sectionId: nextSection || undefined,
          affiliation: nextAffiliation,
        }),
      })
      toast('Draft saved')
      onSaved()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save the draft')
    } finally {
      setSaving(false)
    }
  }

  async function replaceFile(file: File) {
    setReplacing(true)
    try {
      const body = new FormData()
      body.set('file', file)
      body.set('kind', 'manuscript')
      body.set('replace', 'true')
      await api(`/manuscripts/${id}/files`, { method: 'POST', body })
      toast('File replaced')
      onSaved()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not replace the file')
    } finally {
      setReplacing(false)
    }
  }

  async function submit() {
    const missing = required.filter((key) => !checked.includes(key))
    if (missing.length > 0) {
      toast(`Please confirm: ${DECLARATION_LABELS[missing[0]]}`)
      return
    }
    setSaving(true)
    try {
      await api(`/manuscripts/${id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: nextTitle.trim(),
          abstract: nextAbstract,
          keywords: nextKeywords,
          sectionId: nextSection || undefined,
          affiliation: nextAffiliation,
        }),
      })
      await api(`/manuscripts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          declarations: Object.fromEntries(required.map((key) => [key, { affirmed: true }])),
        }),
      })
      router.push('/my-submissions')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not submit')
      setSaving(false)
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-title">Title</Label>
        <Input id="draft-title" value={nextTitle} onChange={(e) => setNextTitle(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-abstract">Abstract</Label>
        <Textarea id="draft-abstract" value={nextAbstract} onChange={(e) => setNextAbstract(e.target.value)} className="min-h-36" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-keywords">Keywords</Label>
        <KeywordField id="draft-keywords" value={nextKeywords} onChange={setNextKeywords} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-affiliation">Institution</Label>
        <Input id="draft-affiliation" value={nextAffiliation} onChange={(e) => setNextAffiliation(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="draft-section">Section</Label>
        <select
          id="draft-section"
          value={nextSection}
          onChange={(e) => setNextSection(e.target.value)}
          className="border-input bg-card h-9 max-w-md rounded-md border px-3 text-sm"
        >
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{manuscriptFile ? manuscriptFile.originalName : 'No file yet'}</p>
          <label className="text-primary cursor-pointer text-sm hover:underline">
            {replacing ? 'Replacing…' : manuscriptFile ? 'Replace file' : 'Upload a file'}
            <input
              type="file"
              accept=".pdf,.docx,.tex,.zip"
              className="sr-only"
              disabled={replacing}
              onChange={(e) => {
                const next = e.target.files?.[0]
                if (next) void replaceFile(next)
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {manuscriptFile && (
          <FilePreview href={`/api/v1/j/${activeJournal()}/files/${manuscriptFile.id}`} name={manuscriptFile.originalName} />
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Confirm before submitting</legend>
        {required.map((key) => {
          const on = checked.includes(key)
          return (
            <label key={key} className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={on}
                className="accent-primary mt-0.5 size-4"
                onChange={() => setChecked((current) => (on ? current.filter((item) => item !== key) : [...current, key]))}
              />
              {DECLARATION_LABELS[key]}
            </label>
          )
        })}
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => void save()} disabled={saving || !nextTitle.trim()}>
          {saving ? 'Saving…' : 'Save draft'}
        </Button>
        <Button onClick={() => void submit()} disabled={saving || !nextTitle.trim() || checked.length !== required.length}>
          Submit manuscript
        </Button>
      </div>
    </div>
  )
}
