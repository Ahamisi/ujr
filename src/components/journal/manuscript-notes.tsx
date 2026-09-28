'use client'

import * as React from 'react'
import { FilePreview } from '@/components/journal/file-preview'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { activeJournal, api } from '@/lib/api'

export interface ManuscriptNote {
  id: string
  fileId: string
  quote: string
  body: string
  pageNumber: number
  authorName: string
}

export function ManuscriptNotes({
  file,
  notes,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
  onUpload,
  uploadLabel,
}: {
  file: { id: string; href: string; name: string }
  notes: ManuscriptNote[]
  canEdit: boolean
  onAdd: (input: { quote: string; body: string; pageNumber: number }) => Promise<void>
  onEdit: (id: string, body: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onUpload: (file: File) => Promise<void>
  uploadLabel: string
}) {
  const [quote, setQuote] = React.useState('')
  const [body, setBody] = React.useState('')
  const [page, setPage] = React.useState('1')
  const [editing, setEditing] = React.useState<string | null>(null)
  const [editBody, setEditBody] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const isPdf = file.name.toLowerCase().endsWith('.pdf')
  const onThisFile = notes.filter((note) => note.fileId === file.id)

  async function add() {
    if (!body.trim()) return
    setBusy(true)
    setError(null)
    try {
      await onAdd({ quote: quote.trim(), body: body.trim(), pageNumber: Number(page) || 1 })
      setQuote('')
      setBody('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the comment')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <FilePreview
        href={file.href}
        name={file.name}
        quotes={onThisFile.map((note) => note.quote)}
        onQuote={isPdf ? undefined : setQuote}
      />
      <div className="bg-card flex flex-col gap-2 rounded-md border p-3">
        {quote && <p className="border-l-2 border-yellow-400 pl-2 text-sm">{quote}</p>}
        {isPdf && (
          <label className="text-muted-foreground flex items-center gap-2 text-xs">
            Page
            <input
              value={page}
              onChange={(e) => setPage(e.target.value)}
              className="border-input h-8 w-16 rounded-md border px-2 text-sm"
            />
            <input
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder="Passage you are marking"
              className="border-input h-8 min-w-0 flex-1 rounded-md border px-2 text-sm"
            />
          </label>
        )}
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="What should change here?"
          className="min-h-20"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => void add()} disabled={busy || !body.trim()}>
            Add comment
          </Button>
          <label className="text-primary cursor-pointer text-sm hover:underline">
            {uploadLabel}
            <input
              type="file"
              accept=".pdf,.docx"
              className="sr-only"
              onChange={(e) => {
                const next = e.target.files?.[0]
                e.target.value = ''
                if (!next) return
                setBusy(true)
                setError(null)
                void onUpload(next)
                  .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not upload the file'))
                  .finally(() => setBusy(false))
              }}
            />
          </label>
        </div>
        {error && <p className="text-destructive text-sm">{error}</p>}
      </div>
      {notes.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notes.map((note) => (
            <li key={note.id} className="bg-card rounded-md border px-3 py-2 text-sm">
              <p className="text-muted-foreground text-xs">
                {note.authorName}
                {note.pageNumber > 1 ? ` · page ${note.pageNumber}` : ''}
              </p>
              {note.quote && <p className="mt-1 border-l-2 border-yellow-400 pl-2">{note.quote}</p>}
              {editing === note.id ? (
                <div className="mt-2 flex flex-col gap-2">
                  <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} className="min-h-20" />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={!editBody.trim()}
                      onClick={() => {
                        setBusy(true)
                        void onEdit(note.id, editBody.trim())
                          .then(() => setEditing(null))
                          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not save'))
                          .finally(() => setBusy(false))
                      }}
                    >
                      Save
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="mt-1 leading-relaxed">{note.body}</p>
              )}
              {canEdit && editing !== note.id && (
                <div className="mt-2 flex gap-3 text-xs">
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => {
                      setEditing(note.id)
                      setEditBody(note.body)
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-destructive hover:underline"
                    onClick={() => {
                      void onDelete(note.id).catch((err: unknown) =>
                        setError(err instanceof Error ? err.message : 'Could not remove the comment'),
                      )
                    }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

async function tokenJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers)
  if (init?.body && !(init.body instanceof FormData)) headers.set('content-type', 'application/json')
  const response = await fetch(url, { ...init, headers, credentials: 'include' })
  const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null
  if (!response.ok) throw new Error(data?.error?.message ?? 'Could not save that')
  return data as T
}

export function ReviewerMarkup({ token, file }: { token: string; file: { id: string; originalName: string } }) {
  const [notes, setNotes] = React.useState<ManuscriptNote[]>([])
  const [current, setCurrent] = React.useState(file)

  React.useEffect(() => {
    tokenJson<ManuscriptNote[]>(`/api/v1/reviews/${token}/annotations`)
      .then(setNotes)
      .catch(() => {})
  }, [token])

  return (
    <ManuscriptNotes
      file={{ id: current.id, name: current.originalName, href: `/api/v1/reviews/${token}/files/${current.id}` }}
      notes={notes}
      canEdit
      uploadLabel="Upload a marked-up file"
      onAdd={async (input) => {
        const note = await tokenJson<ManuscriptNote>(`/api/v1/reviews/${token}/annotations`, {
          method: 'POST',
          body: JSON.stringify({ ...input, fileId: current.id }),
        })
        setNotes((list) => [...list, note])
      }}
      onEdit={async (id, body) => {
        const note = await tokenJson<ManuscriptNote>(`/api/v1/reviews/${token}/annotations/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ body }),
        })
        setNotes((list) => list.map((item) => (item.id === id ? note : item)))
      }}
      onDelete={async (id) => {
        await tokenJson(`/api/v1/reviews/${token}/annotations/${id}`, { method: 'DELETE' })
        setNotes((list) => list.filter((item) => item.id !== id))
      }}
      onUpload={async (upload) => {
        const body = new FormData()
        body.set('file', upload)
        const saved = await tokenJson<{ id: string; originalName: string }>(`/api/v1/reviews/${token}/files`, {
          method: 'POST',
          body,
        })
        setCurrent(saved)
      }}
    />
  )
}

export function EditorMarkup({
  manuscriptId,
  file,
  onUploaded,
}: {
  manuscriptId: string
  file: { id: string; name: string }
  onUploaded: (file: { id: string; kind: string; originalName: string; isMetadataScrubbed: boolean }) => void
}) {
  const [notes, setNotes] = React.useState<ManuscriptNote[]>([])

  React.useEffect(() => {
    api<ManuscriptNote[]>(`/manuscripts/${manuscriptId}/annotations`)
      .then(setNotes)
      .catch(() => {})
  }, [manuscriptId])

  return (
    <ManuscriptNotes
      file={{ id: file.id, name: file.name, href: `/api/v1/j/${activeJournal()}/files/${file.id}` }}
      notes={notes.filter((note) => note.fileId === file.id)}
      canEdit
      uploadLabel="Upload a corrected file"
      onAdd={async (input) => {
        const note = await api<ManuscriptNote>(`/manuscripts/${manuscriptId}/annotations`, {
          method: 'POST',
          body: JSON.stringify({ ...input, fileId: file.id }),
        })
        setNotes((list) => [...list, note])
      }}
      onEdit={async (id, body) => {
        const note = await api<ManuscriptNote>(`/annotations/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ body }),
        })
        setNotes((list) => list.map((item) => (item.id === id ? note : item)))
      }}
      onDelete={async (id) => {
        await api(`/annotations/${id}`, { method: 'DELETE' })
        setNotes((list) => list.filter((item) => item.id !== id))
      }}
      onUpload={async (upload) => {
        const body = new FormData()
        body.set('file', upload)
        body.set('kind', 'review_pdf')
        const saved = await api<{ id: string; kind: string; originalName: string; isMetadataScrubbed: boolean }>(
          `/manuscripts/${manuscriptId}/files`,
          { method: 'POST', body },
        )
        onUploaded(saved)
      }}
    />
  )
}
