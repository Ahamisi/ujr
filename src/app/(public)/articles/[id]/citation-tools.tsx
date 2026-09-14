'use client'

import * as React from 'react'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { JOURNAL, type Article } from '@/lib/mock-published'

function bibtex(a: Article) {
  const key = `${a.authors[0].name.split(' ').pop()!.toLowerCase()}${a.publishedIso.slice(0, 4)}`
  return `@article{${key},
  title   = {${a.title}},
  author  = {${a.authors.map((x) => x.name).join(' and ')}},
  journal = {${JOURNAL.name}},
  volume  = {${a.volume}},
  number  = {${a.issue}},
  pages   = {${a.pages}},
  year    = {${a.publishedIso.slice(0, 4)}},
  issn    = {${JOURNAL.issnElectronic}},
  doi     = {${a.doi}},
  url     = {https://doi.org/${a.doi}}
}`
}

function ris(a: Article) {
  return [
    'TY  - JOUR',
    ...a.authors.map((x) => `AU  - ${x.name}`),
    `TI  - ${a.title}`,
    `JO  - ${JOURNAL.name}`,
    `VL  - ${a.volume}`,
    `IS  - ${a.issue}`,
    `SP  - ${a.pages.split('–')[0]}`,
    `PY  - ${a.publishedIso.slice(0, 4)}`,
    `SN  - ${JOURNAL.issnElectronic}`,
    `DO  - ${a.doi}`,
    `UR  - https://doi.org/${a.doi}`,
    'ER  - ',
  ].join('\n')
}

function apa(a: Article) {
  const names = a.authors.map((x) => x.name).join(', ')
  return `${names} (${a.publishedIso.slice(0, 4)}). ${a.title}. ${JOURNAL.name}, ${a.volume}(${a.issue}), ${a.pages}. https://doi.org/${a.doi}`
}

export function CitationTools({ article }: { article: Article }) {
  const [copied, setCopied] = React.useState<string | null>(null)

  const formats = [
    { id: 'apa', label: 'APA', text: apa(article) },
    { id: 'bibtex', label: 'BibTeX', text: bibtex(article) },
    { id: 'ris', label: 'RIS', text: ris(article) },
  ]

  async function copy(id: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      /* clipboard blocked — the text is selectable on screen either way */
    }
  }

  return (
    <Tabs defaultValue="apa">
      <TabsList>
        {formats.map((f) => (
          <TabsTrigger key={f.id} value={f.id}>
            {f.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {formats.map((f) => (
        <TabsContent key={f.id} value={f.id}>
          <div className="bg-muted relative rounded-md p-3">
            <pre className="overflow-x-auto pr-20 font-mono text-xs leading-relaxed whitespace-pre-wrap">
              {f.text}
            </pre>
            <Button
              variant="outline"
              size="sm"
              className="absolute top-2 right-2"
              onClick={() => copy(f.id, f.text)}
            >
              {copied === f.id ? <Check /> : <Copy />}
              {copied === f.id ? 'Copied' : 'Copy'}
            </Button>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}
