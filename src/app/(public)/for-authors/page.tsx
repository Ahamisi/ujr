import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { JOURNAL } from '@/lib/mock-published'

export const metadata: Metadata = {
  title: 'For authors',
  description: `How to submit to the ${JOURNAL.name}: scope, review process, timelines and policies.`,
}

const STAGES = [
  { days: '2–7 days', label: 'Desk check', body: 'Scope, completeness, declarations and a similarity report. Around half of submissions end here — quickly, and with a reason.' },
  { days: '4–8 weeks', label: 'Peer review', body: 'Two reviewers minimum, double-blind. Your name, affiliation and funding statement are removed from the file automatically.' },
  { days: '1–2 weeks', label: 'Decision', body: 'A handling editor weighs the reports and writes to you. Most papers are asked for revisions at least once.' },
  { days: '3–6 weeks', label: 'Production', body: 'Copyediting, typesetting and your proof. Nothing is published until you have approved it.' },
]

export default function ForAuthorsPage() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-4 py-10 md:px-6">
      <h1 className="font-serif text-3xl font-medium tracking-tight">For authors</h1>
      <p className="text-muted-foreground mt-3 leading-relaxed">{JOURNAL.scope}</p>

      <section className="mt-10">
        <h2 className="text-sm font-medium">What happens after you submit</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Median time from submission to a first decision is 63 days. These are real ranges, not aspirations.
        </p>

        <ol className="border-rule mt-5 border-l-2">
          {STAGES.map((s) => (
            <li key={s.label} className="relative pb-6 pl-6 last:pb-0">
              <span className="border-primary bg-background absolute top-1.5 -left-[7px] size-3 rounded-full border-2" />
              <p className="text-primary tnum text-xs">{s.days}</p>
              <p className="mt-0.5 font-medium">{s.label}</p>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Before you start</h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {[
            'A manuscript in .docx, .pdf or .tex, under 60MB including figures.',
            'An abstract of no more than 300 words, and up to six keywords.',
            'References in IEEE style.',
            'Declarations: conflicts of interest, funding, data availability, and any use of generative AI.',
            'An ORCID iD if you have one — it fills in your details and makes your authorship unambiguous at deposit.',
          ].map((item) => (
            <li key={item} className="text-muted-foreground relative pl-5 text-sm leading-relaxed">
              <span className="bg-primary absolute top-[0.55em] left-0 size-1.5 rounded-full" />
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-card mt-10 border p-5">
        <h2 className="text-sm font-medium">Charges</h2>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          There is no submission fee. Any article charge is raised only after acceptance, never before — and waivers
          are available on request for authors without grant funding. Charging before a decision is what predatory
          journals do, and this one does not.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium">Your rights</h2>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          Articles are published open access under{' '}
          <a href={JOURNAL.licenceUrl} className="text-primary hover:underline" target="_blank" rel="noreferrer">
            {JOURNAL.licence}
          </a>
          . You keep copyright. Every article gets a registered DOI, so a link to your work keeps resolving whatever
          happens to this website.
        </p>
      </section>

      <Link
        href="/sign-in"
        className="bg-primary text-primary-foreground focus-visible:ring-ring mt-10 inline-flex h-10 items-center gap-1.5 rounded-md px-5 text-sm font-medium transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:outline-none"
      >
        Submit a manuscript
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
