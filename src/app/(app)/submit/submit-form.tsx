'use client'

import * as React from 'react'
import { CheckCircle2, EyeOff, FileUp, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const SECTIONS = [
  'Civil & Structural',
  'Electrical & Electronics',
  'Mechanical',
  'Chemical & Petroleum',
  'Metallurgical & Materials',
  'Systems & Computing',
]

const DECLARATIONS = [
  { id: 'conflict', label: 'No conflict of interest, or it is declared in the manuscript' },
  { id: 'funding', label: 'All funding sources are stated' },
  { id: 'data', label: 'A data availability statement is included' },
  { id: 'ai', label: 'Any use of generative AI is disclosed' },
  { id: 'authorship', label: 'All listed authors agreed to this submission' },
]

type Step = 'upload' | 'details' | 'declarations' | 'done'

/** What extraction pulls out of the uploaded file. The author corrects it;
 *  they never retype what the document already contains. */
const EXTRACTED = {
  title: 'Shear Capacity of Bamboo-Reinforced Concrete Beams in Tropical Service Conditions',
  abstract:
    'Bamboo has been proposed repeatedly as a low-cost substitute for steel reinforcement in regions where steel is expensive or scarce. This study tests eight bamboo-reinforced concrete beams in four-point bending after 0, 90 and 180 days of exposure to a humid tropical environment...',
  keywords: 'bamboo reinforcement, shear capacity, tropical exposure, low-cost construction',
}

export function SubmitForm() {
  const [step, setStep] = React.useState<Step>('upload')
  const [extracting, setExtracting] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [abstract, setAbstract] = React.useState('')
  const [keywords, setKeywords] = React.useState('')
  const [section, setSection] = React.useState(SECTIONS[0])
  const [checked, setChecked] = React.useState<string[]>([])
  const toast = useToast()

  function fakeUpload() {
    setExtracting(true)
    setTimeout(() => {
      setTitle(EXTRACTED.title)
      setAbstract(EXTRACTED.abstract)
      setKeywords(EXTRACTED.keywords)
      setExtracting(false)
      setStep('details')
    }, 900)
  }

  const allDeclared = checked.length === DECLARATIONS.length

  if (step === 'done') {
    return (
      <div className="py-12 text-center">
        <CheckCircle2 className="text-success mx-auto size-10" />
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Submitted</h2>
        <p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm leading-relaxed">
          Your manuscript has the reference <span className="tnum font-medium">UJER-2026-0171</span>. You will get an
          email confirming it, and another when the desk check is done — usually within a week.
        </p>
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
          <button
            type="button"
            onClick={fakeUpload}
            disabled={extracting}
            className="border-border hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-ring flex flex-col items-center gap-2 border border-dashed px-6 py-12 transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
          >
            <FileUp className="text-muted-foreground size-6" />
            <span className="text-sm font-medium">
              {extracting ? 'Reading your manuscript…' : 'Choose a file or drop it here'}
            </span>
            <span className="text-muted-foreground text-xs">
              .docx, .pdf or .tex — up to 60MB. Uploads resume if your connection drops.
            </span>
          </button>

          <p className="text-muted-foreground flex items-start gap-2 text-xs leading-relaxed">
            <Sparkles className="mt-0.5 size-3.5 shrink-0" />
            We read the title, authors, abstract and references out of the file so you can correct them rather than
            retype them.
          </p>
        </div>
      )}

      {step === 'details' && (
        <div className="flex flex-col gap-4">
          <p className="text-muted-foreground text-sm">
            Pulled from your file. Fix anything that came out wrong.
          </p>

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
            <p className="text-muted-foreground tnum text-xs">
              {abstract.trim().split(/\s+/).filter(Boolean).length} of 300 words
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-keywords">Keywords</Label>
            <Input id="sub-keywords" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sub-section">Section</Label>
            <Select value={section} onValueChange={setSection}>
              <SelectTrigger id="sub-section" className="w-full max-w-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep('upload')}>
              Back
            </Button>
            <Button onClick={() => setStep('declarations')} disabled={title.trim().length < 10}>
              Continue
            </Button>
          </div>
        </div>
      )}

      {step === 'declarations' && (
        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Please confirm</legend>
            {DECLARATIONS.map((d) => {
              const on = checked.includes(d.id)
              return (
                <label
                  key={d.id}
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 border px-3 py-2.5 text-sm transition-colors',
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

          <div className="border p-4">
            <h3 className="flex items-center gap-2 text-sm font-medium">
              <EyeOff className="size-4" />
              What the reviewers will see
            </h3>
            <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
              This journal reviews double-blind. Your names, affiliations, funding statement and the file&rsquo;s own
              metadata are removed automatically before any reviewer opens it — you do not have to do it yourself.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => toast('Anonymised preview opens here')}>
              Preview the anonymised version
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" onClick={() => setStep('details')}>
              Back
            </Button>
            <Button disabled={!allDeclared} onClick={() => setStep('done')}>
              Submit manuscript
            </Button>
            {!allDeclared && (
              <Badge variant="secondary">
                {DECLARATIONS.length - checked.length} declaration(s) left
              </Badge>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
