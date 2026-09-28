/**
 * DOI minting and Crossref deposit.
 *
 * Two rules this module exists to enforce:
 *   1. A DOI is permanent. Once it is registered it may never be reassigned,
 *      reused for different content, or deleted — a retraction is a new record
 *      pointing at the old one.
 *   2. The suffix is opaque. It must carry no meaning that can go stale, so no
 *      author names, no section, nothing that a correction could invalidate.
 */

import { JOURNAL, type Article } from './mock-published'

export type DepositState = 'unminted' | 'minted' | 'queued' | 'submitted' | 'registered' | 'failed'

export interface DepositRecord {
  articleId: string
  doi: string | null
  state: DepositState
  /** Crossref submission id, once the deposit has been accepted for processing. */
  submissionId: string | null
  lastAttemptAt: string | null
  attempts: number
  error?: string
}

export const DEPOSIT_STATE: Record<
  DepositState,
  { label: string; variant: 'secondary' | 'info' | 'warning' | 'success' | 'danger'; blocking: string }
> = {
  unminted: { label: 'No DOI', variant: 'secondary', blocking: 'Not yet assigned' },
  minted: { label: 'Minted', variant: 'info', blocking: 'Assigned locally, not yet deposited' },
  queued: { label: 'Queued', variant: 'warning', blocking: 'Waiting for the deposit job' },
  submitted: { label: 'Submitted', variant: 'warning', blocking: 'With Crossref, awaiting confirmation' },
  registered: { label: 'Registered', variant: 'success', blocking: 'Live and resolving' },
  failed: { label: 'Failed', variant: 'danger', blocking: 'Deposit rejected — needs attention' },
}

/**
 * Mint a DOI from the journal's configured pattern. The counter is the article
 * number within the volume; in production it comes from a sequence the database
 * owns, never from a client, so two articles can never collide.
 */
export function mintDoi(
  pattern: string,
  vars: { prefix: string; journalSlug: string; year: number | string; articleNumber: number | string },
) {
  const padded = String(vars.articleNumber).padStart(4, '0')
  return pattern
    .replace('{prefix}', vars.prefix)
    .replace('{journalSlug}', vars.journalSlug)
    .replace('{year}', String(vars.year))
    .replace('{articleNumber}', padded)
}

/** A DOI is a prefix starting 10. and a non-empty suffix. Case-insensitive. */
export function isValidDoi(doi: string) {
  return /^10\.\d{4,9}\/\S+$/.test(doi.trim())
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Crossref journal-article deposit. Generated from the article record rather
 * than hand-written, so the metadata that is deposited is exactly the metadata
 * the article page shows — a mismatch between the two is how citations break.
 */
export function depositXml(
  article: Article,
  siteUrl = 'https://ujer.unilag.edu.ng',
  journal: {
    name: string
    abbreviation: string
    publisher: string
    issnElectronic: string
    issnPrint: string
  } = JOURNAL,
) {
  const [firstPage, lastPage] = article.pages.split('–')
  const [year, month, day] = article.publishedIso.split('-')
  const timestamp = article.publishedIso.replace(/-/g, '') + '000000'

  const contributors = article.authors
    .map((a, i) => {
      const parts = a.name.trim().split(' ')
      const surname = parts.pop()!
      const given = parts.join(' ')
      return `        <person_name sequence="${i === 0 ? 'first' : 'additional'}" contributor_role="author">
          <given_name>${esc(given)}</given_name>
          <surname>${esc(surname)}</surname>
          <affiliation>${esc(a.affiliation)}</affiliation>${
            a.orcid ? `\n          <ORCID>https://orcid.org/${a.orcid}</ORCID>` : ''
          }
        </person_name>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch xmlns="http://www.crossref.org/schema/5.3.1" version="5.3.1">
  <head>
    <doi_batch_id>${esc(article.id)}-${timestamp}</doi_batch_id>
    <timestamp>${timestamp}</timestamp>
    <depositor>
      <depositor_name>${esc(journal.abbreviation)}</depositor_name>
      <email_address>doi@ujer.unilag.edu.ng</email_address>
    </depositor>
    <registrant>${esc(journal.publisher)}</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata language="en">
        <full_title>${esc(journal.name)}</full_title>
        <abbrev_title>${esc(journal.abbreviation)}</abbrev_title>
        <issn media_type="electronic">${journal.issnElectronic}</issn>
        <issn media_type="print">${journal.issnPrint}</issn>
      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <month>${month}</month>
          <day>${day}</day>
          <year>${year}</year>
        </publication_date>
        <journal_volume><volume>${article.volume}</volume></journal_volume>
        <issue>${article.issue}</issue>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles><title>${esc(article.title)}</title></titles>
        <contributors>
${contributors}
        </contributors>
        <publication_date media_type="online">
          <month>${month}</month>
          <day>${day}</day>
          <year>${year}</year>
        </publication_date>
        <pages>
          <first_page>${esc(firstPage)}</first_page>
          <last_page>${esc(lastPage ?? firstPage)}</last_page>
        </pages>
        <doi_data>
          <doi>${article.doi}</doi>
          <resource>${siteUrl}/articles/${article.id}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`
}
