'use client'

import * as React from 'react'
import {
  CheckCircle2,
  CloudOff,
  Clock,
  Download,
  EyeOff,
  FileText,
  Loader2,
  Lock,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ANONYMISED_MANUSCRIPT as MS, REVIEW_FORM, type Question } from '@/lib/review-form'
import { cn } from '@/lib/utils'

type Stage = 'invitation' | 'reviewing' | 'declined' | 'submitted'
type Answers = Record<string, string | number>
type SaveState = 'idle' | 'saving' | 'saved' | 'offline'

const DECLINE_REASONS = [
  { value: 'expertise', label: 'Outside my area of expertise' },
  { value: 'time', label: 'No capacity before the deadline' },
  { value: 'conflict', label: 'Conflict of interest' },
  { value: 'other', label: 'Another reason' },
]

export function ReviewWorkspace({ token }: { token: string }) {
  const storageKey = `ujer-review-${token}`

  const [stage, setStage] = React.useState<Stage>('invitation')
  const [answers, setAnswers] = React.useState<Answers>({})
  const [save, setSave] = React.useState<SaveState>('idle')
  const [online, setOnline] = React.useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [declineReason, setDeclineReason] = React.useState('expertise')
  const [suggestion, setSuggestion] = React.useState('')
  const [restored, setRestored] = React.useState(false)

  /*
   * Restore any draft this browser holds. This genuinely has to run after mount:
   * the server has no access to the device's storage, so a lazy initialiser would
   * render a different tree on each side.
   */
  /* eslint-disable react-hooks/set-state-in-effect */
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const parsed = JSON.parse(raw) as { answers: Answers; stage: Stage }
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          setAnswers(parsed.answers)
          setStage(parsed.stage === 'submitted' ? 'submitted' : 'reviewing')
          setRestored(true)
        }
      }
    } catch {
      /* no draft available — the form still works, it just will not persist */
    }
  }, [storageKey])
  /* eslint-enable react-hooks/set-state-in-effect */

  React.useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  /* Debounced autosave. The real thing writes to IndexedDB and flushes to the
     server when the connection returns; localStorage is the same contract. */
  React.useEffect(() => {
    if (stage !== 'reviewing' || Object.keys(answers).length === 0) return
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ answers, stage }))
        setSave(online ? 'saved' : 'offline')
      } catch {
        setSave('idle')
      }
    }, 600)
    return () => clearTimeout(t)
  }, [answers, stage, storageKey, online])

  const required = REVIEW_FORM.questions.filter((q) => q.required)
  const missing = required.filter((q) => {
    const v = answers[q.id]
    return v === undefined || v === '' || (typeof v === 'string' && v.trim().length === 0)
  })

  function set(id: string, value: string | number) {
    setAnswers((a) => ({ ...a, [id]: value }))
    setSave('saving')
  }

  function submit() {
    setStage('submitted')
    try {
      localStorage.setItem(storageKey, JSON.stringify({ answers, stage: 'submitted' }))
    } catch {
      /* nothing to do — the submission itself is what matters */
    }
  }

  /* ---------------- invitation ---------------- */

  if (stage === 'invitation') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:px-6">
        <p className="text-muted-foreground text-sm">{MS.invitedBy} has asked you to review</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-balance">{MS.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            About {MS.estimatedMinutes} minutes
          </Badge>
          <Badge variant="warning">Due {MS.dueDate}</Badge>
          <Badge variant="outline" className="gap-1">
            <EyeOff className="size-3" />
            Double-blind
          </Badge>
        </div>

        <div className="bg-card mt-6 rounded-lg border p-5">
          <h2 className="text-muted-foreground mb-2 text-[11px] font-medium tracking-wider uppercase">Abstract</h2>
          <p className="text-sm leading-relaxed">{MS.abstract}</p>
          <p className="text-muted-foreground mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs">
            <span>{MS.section}</span>
            <span className="tnum">{MS.wordCount.toLocaleString()} words</span>
            <span className="tnum">{MS.figures} figures</span>
            <span className="tnum">{MS.tables} tables</span>
          </p>
        </div>

        <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
          Author names and affiliations have been removed from the manuscript and its file metadata. You do not need
          an account — this link is yours, and your work saves as you go, including offline.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => setStage('reviewing')}>Accept and start reviewing</Button>
          <Button variant="outline" onClick={() => setStage('declined')}>
            Decline
          </Button>
        </div>
      </div>
    )
  }

  /* ---------------- declined ---------------- */

  if (stage === 'declined') {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-10 md:px-6">
        <h1 className="text-xl font-semibold tracking-tight">Decline this invitation</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          A reason helps the editor find someone suitable faster. Nothing here reaches the authors.
        </p>

        <div className="mt-6 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="decline-reason">Reason</Label>
            <Select value={declineReason} onValueChange={setDeclineReason}>
              <SelectTrigger id="decline-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DECLINE_REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="suggestion">Suggest someone else</Label>
            <Textarea
              id="suggestion"
              value={suggestion}
              onChange={(e) => setSuggestion(e.target.value)}
              placeholder="A name and institution, or an email address. Optional, and genuinely useful."
              className="min-h-20"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setStage('submitted')}>Send decline</Button>
            <Button variant="ghost" onClick={() => setStage('invitation')}>
              Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------------- submitted ---------------- */

  if (stage === 'submitted') {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-16 text-center md:px-6">
        <CheckCircle2 className="text-success mx-auto size-10" />
        <h1 className="mt-4 text-xl font-semibold tracking-tight">Thank you</h1>
        <p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm leading-relaxed">
          Your review has been sent to the handling editor. You will hear the outcome once a decision is recorded,
          and your comments to the author will be included in the decision letter. Your confidential comments will
          not.
        </p>
        <p className="text-muted-foreground mt-6 text-xs">
          Peer review is unpaid work that holds the whole thing up. We know. Thank you.
        </p>
      </div>
    )
  }

  /* ---------------- reviewing ---------------- */

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 md:px-6">
      {!online && (
        <div className="border-warning/40 bg-warning-muted/60 mb-4 flex items-start gap-2.5 rounded-md border px-3.5 py-2.5">
          <CloudOff className="text-warning mt-0.5 size-4 shrink-0" />
          <p className="text-sm">
            <span className="font-medium">You are offline.</span>{' '}
            <span className="text-muted-foreground">
              Keep working — everything is saved on this device and will be sent when the connection returns.
            </span>
          </p>
        </div>
      )}

      {restored && (
        <p className="text-muted-foreground mb-4 text-sm">Picked up where you left off.</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground tnum text-xs">{MS.reference}</p>
            <h1 className="mt-1 text-sm font-semibold text-balance">{MS.title}</h1>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">{MS.abstract}</p>
            <Button variant="outline" size="sm" className="mt-3 w-full">
              <Download />
              Download the manuscript
            </Button>
            <p className="text-muted-foreground mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed">
              <FileText className="mt-0.5 size-3 shrink-0" />
              Anonymised PDF, {MS.figures} figures. Cached for offline reading once downloaded.
            </p>
          </div>

          <div className="bg-card rounded-lg border p-4">
            <p className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">Due</p>
            <p className="mt-0.5 text-sm font-medium">{MS.dueDate}</p>
            <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
              If you need longer, say so and the editor will extend it. A late review is worth far more than no
              review.
            </p>
          </div>
        </aside>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-lg font-semibold tracking-tight">Your review</h2>
            <span className="text-muted-foreground text-xs">
              {REVIEW_FORM.name} · v{REVIEW_FORM.version}
            </span>
            <SaveIndicator state={save} />
          </div>

          {REVIEW_FORM.questions.map((q) => (
            <QuestionField key={q.id} question={q} value={answers[q.id]} onChange={(v) => set(q.id, v)} />
          ))}

          <div className="bg-card sticky bottom-0 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3">
            <p className="text-muted-foreground min-w-[200px] flex-1 text-sm">
              {missing.length === 0
                ? 'Everything required is filled in.'
                : `${missing.length} required ${missing.length === 1 ? 'question' : 'questions'} left: ${missing
                    .map((q) => q.label.toLowerCase())
                    .join(', ')}.`}
            </p>
            <Button disabled={missing.length > 0} onClick={submit}>
              {online ? 'Submit review' : 'Submit when back online'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null
  if (state === 'saving')
    return (
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Loader2 className="size-3 animate-spin" />
        Saving
      </span>
    )
  if (state === 'offline')
    return (
      <span className="text-warning flex items-center gap-1.5 text-xs">
        <CloudOff className="size-3" />
        Saved on this device
      </span>
    )
  return (
    <span className="text-success flex items-center gap-1.5 text-xs">
      <CheckCircle2 className="size-3" />
      Saved
    </span>
  )
}

function QuestionField({
  question: q,
  value,
  onChange,
}: {
  question: Question
  value: string | number | undefined
  onChange: (v: string | number) => void
}) {
  const confidential = q.visibility === 'editor_only'

  return (
    <section
      className={cn(
        'rounded-lg border p-4',
        confidential ? 'border-warning/40 bg-warning-muted/40 border-dashed' : 'bg-card',
      )}
    >
      <div className="mb-2.5">
        <Label htmlFor={q.id} className="flex flex-wrap items-center gap-2 text-sm">
          {q.label}
          {!q.required && <span className="text-muted-foreground text-xs font-normal">optional</span>}
          {confidential && (
            <span className="text-warning flex items-center gap-1 text-[11px] font-medium tracking-wider uppercase">
              <Lock className="size-3" />
              Not shown to the author
            </span>
          )}
        </Label>
        {q.helpText && <p className="text-muted-foreground mt-1 max-w-prose text-xs leading-relaxed">{q.helpText}</p>}
      </div>

      {q.type === 'scale' && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1" role="radiogroup" aria-label={q.label}>
            {Array.from({ length: (q.max ?? 5) - (q.min ?? 1) + 1 }, (_, i) => {
              const n = (q.min ?? 1) + i
              const active = value === n
              return (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onChange(n)}
                  className={cn(
                    'tnum focus-visible:ring-ring size-9 rounded-md border text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
                    active
                      ? 'border-primary bg-primary text-primary-foreground font-medium'
                      : 'border-input hover:bg-accent',
                  )}
                >
                  {n}
                </button>
              )
            })}
          </div>
          {(q.minLabel || q.maxLabel) && (
            <p className="text-muted-foreground text-xs">
              {q.minLabel} → {q.maxLabel}
            </p>
          )}
        </div>
      )}

      {q.type === 'long_text' && (
        <Textarea
          id={q.id}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn('min-h-32', confidential && 'bg-background')}
        />
      )}

      {q.type === 'single_choice' && (
        <div className="flex flex-col gap-1" role="radiogroup" aria-label={q.label}>
          {q.options?.map((o) => {
            const active = value === o.value
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(o.value)}
                className={cn(
                  'focus-visible:ring-ring flex items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none',
                  active ? 'border-primary bg-background' : 'border-transparent hover:bg-background/60',
                )}
              >
                <span
                  className={cn(
                    'flex size-4 shrink-0 items-center justify-center rounded-full border',
                    active ? 'border-primary' : 'border-input',
                  )}
                >
                  {active && <span className="bg-primary size-2 rounded-full" />}
                </span>
                {o.label}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}
