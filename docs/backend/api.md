# HTTP API

Base path `/api/v1`. JSON unless a route says it returns a file.

Errors:

```json
{ "error": { "code": "not_found", "message": "Manuscript was not found" } }
```

`code` is `unauthorized` (401), `forbidden` (403), `not_found` (404), `conflict` (409), `invalid` (400, with `issues`), `gone` (410), `unconfigured` (503), or `internal` (500). 500 responses do not include the exception text.

Authenticated routes need the Better Auth session cookie. Journal routes also name the journal in the path. There is no `X-Journal-Id` header. The slug is the tenant.

`GET /api/health` and the article routes do not need a session. Reviewer routes need the token and nothing else.

## Identity

| Method | Path | |
|---|---|---|
| GET, POST | `/api/auth/*` | Better Auth. Sign-up, sign-in, sign-out, ORCID callback, password reset |
| GET | `/api/v1/me` | `{ user, memberships }` for the signed-in person |
| GET | `/api/health` | `{ ok, database: "up" \| "down" \| "not_configured" }` |

Sign-up body includes `email`, `password`, `name`, `givenName`, `familyName`. Optional: `affiliation`, `country`, `orcid`.

## Journal routes

Prefix `/api/v1/j/:slug`.

### Manuscripts

| Method | Path | Who | |
|---|---|---|---|
| GET | `/desk` | editorial | Queue of statuses that are waiting on the office |
| GET | `/manuscripts` | editorial | Submitted manuscripts in scope. Drafts stay with the author |
| GET | `/mine` | author | Manuscripts this person submitted or is named on |
| POST | `/manuscripts` | author | Create a draft. Body below |
| DELETE | `/manuscripts/:id` | author of it | Deletes a draft and its file. A submitted manuscript cannot be deleted |
| GET | `/manuscripts/:id` | author of it, else staff | Author view hides reviewer identity. Staff view includes it |
| PUT | `/manuscripts/:id` | author of it | Edit a draft: `{ title, abstract?, keywords?, sectionId?, affiliation? }` |
| POST | `/manuscripts/:id/submit` | author of it | Freezes policy. Body `{ declarations }` |
| POST | `/manuscripts/:id/resubmit` | author of it | From `revision_requested` only |
| POST | `/manuscripts/:id/transition` | editorial, not an author of it | `{ to, reason? }` |
| POST | `/manuscripts/:id/assign` | editorial, not an author of it | `{ editorId }` |
| POST | `/manuscripts/:id/files` | author of it, or an editor | Multipart. Fields `file` and `kind` |
| POST | `/manuscripts/:id/invitations` | editorial, not an author of it | `{ reviewerId, round? }` |
| POST | `/manuscripts/:id/decisions/draft` | editorial, not an author of it | `{ decision }` returns `{ letter }` |
| POST | `/manuscripts/:id/decisions` | editorial, not an author of it | `{ decision, letterBody, isAppeal? }` |

Draft body:

```json
{
  "sectionId": "uuid",
  "title": "…",
  "abstract": "…",
  "keywords": ["…"],
  "authors": [
    { "givenName": "…", "familyName": "…", "email": "…", "isCorresponding": true }
  ]
}
```

`declarations` keys are the policy enum: `ethics_approval`, `conflict_of_interest`, `funding`, `data_availability`, `generative_ai_use`, `informed_consent`, `authorship_agreement`. Each value is `{ "affirmed": true }`.

`kind` is one of `manuscript`, `manuscript_anonymised`, `review_pdf`, `figure`, `supplementary`, `cover_letter`, `response_to_reviewers`, `similarity_report`, `galley_pdf`, `galley_xml`, `reviewer_attachment`.

`decision` is `accept`, `minor_revision`, `major_revision`, `reject`, `reject_with_resubmission`, or `desk_reject`.

`to` is a manuscript status. The transition table in `src/server/manuscripts/transitions.ts` is the allow-list.

### Files

| Method | Path | Who | |
|---|---|---|---|
| GET | `/files/:id` | author of that manuscript, else staff | Bytes. Authors do not receive similarity reports or reviewer attachments |
| POST | `/files/:id/scrubbed` | editorial | Marks a reviewer-facing copy scrubbed. Refuses `kind = manuscript` |

### Reviewers, on a token

No cookie. Prefix `/api/v1/reviews/:token`.

| Method | Path | |
|---|---|---|
| GET | `/api/v1/reviews/:token` | The anonymised manuscript and the form. Authors included only when the frozen blinding mode allows it |
| POST | `/api/v1/reviews/:token/respond` | `{ "action": "accept" \| "decline", "reason"? }` |
| POST | `/api/v1/reviews/:token/submit` | `{ recommendation, answers }`. `answers` is keyed by question id |
| GET | `/api/v1/reviews/:token/files/:fileId` | The manuscript file for this assignment, or a file the reviewer uploaded. `?inline=1` displays it |
| GET | `/api/v1/reviews/:token/annotations` | This reviewer's comments |
| POST | `/api/v1/reviews/:token/annotations` | `{ fileId, body, quote?, pageNumber? }`. The invitation must be accepted. Hidden from the author |
| PUT | `/api/v1/reviews/:token/annotations/:id` | `{ body }`. Only a comment this reviewer wrote |
| DELETE | `/api/v1/reviews/:token/annotations/:id` | Removes a comment this reviewer wrote |
| POST | `/api/v1/reviews/:token/files` | Multipart field `file`. Stored as `reviewer_attachment` |

### Comments, for an editor

| Method | Path | Who | |
|---|---|---|---|
| GET | `/manuscripts/:id/annotations` | editorial | Every comment on the manuscript, with the writer's name |
| POST | `/manuscripts/:id/annotations` | editorial | `{ fileId, body, quote?, pageNumber? }` |
| PUT | `/annotations/:id` | editorial | `{ body }`. Corrects a reviewer comment or an editor comment |
| DELETE | `/annotations/:id` | editorial | Removes the comment |

`recommendation` is `accept`, `minor_revision`, `major_revision`, or `reject`.

### Settings

| Method | Path | Who | |
|---|---|---|---|
| GET | `/people` | settings | Members of the journal and their roles |
| POST | `/people` | settings | `{ email, givenName, familyName, role, password? }`. A new email needs a password. `journal_manager` is the admin |
| DELETE | `/people/:userId/:role` | settings | Removes that role. The last admin cannot be removed |
| GET | `/settings` | settings | `{ policy, policyVersion, inFlight }` |
| PUT | `/settings` | settings | The full policy object from `journalPolicySchema`. Response adds `changes` |

### Money

| Method | Path | Who | |
|---|---|---|---|
| GET | `/charges` | finance | |
| POST | `/charges/:id/waive` | finance | `{ reason }` at least 8 characters |
| POST | `/charges/:id/refund` | finance | Same body. Only from `paid`. Does not call Paystack |
| POST | `/charges/:id/checkout` | author | Returns `{ authorizationUrl, reference }` |

`POST /api/v1/webhooks/paystack` is not under the journal prefix. It reads the raw body, checks `x-paystack-signature` (HMAC SHA512 of the body with `PAYSTACK_SECRET_KEY`), then marks the charge paid or failed. A repeated `charge.success` is `{ ok: true, duplicate: true }`.

### Issues, production, DOI, reports

| Method | Path | Who | |
|---|---|---|---|
| GET, POST | `/issues` | editorial | POST `{ volume, number, title?, targetDate? }` `targetDate` is `YYYY-MM-DD` |
| GET, POST | `/production` | production | POST `{ manuscriptId, stage, assigneeId? }`. Stage is `copyediting`, `typesetting`, `proofing`, or `ready` |
| GET | `/doi` | production | Manuscripts from `accepted` onward, with the latest deposit row |
| POST | `/doi/mint/:manuscriptId` | production | Allocates the next article number. A second call returns the same DOI |
| POST | `/doi/deposit/:manuscriptId` | production | Queues a Crossref job |
| GET | `/reports` | editorial | Status counts, decision mix, reviewer acceptance rate, median days to first decision |
| GET | `/reviewers` | editorial | Members with the reviewer role, plus anyone already assigned |

### Notifications

| Method | Path | Who | |
|---|---|---|---|
| GET | `/notifications` | any member | Only rows for the signed-in user |
| POST | `/notifications/:id/read` | any member | Sets `readAt` |

### Public articles

No session. Only `published` manuscripts. Reviewer names are not on this payload yet; add them when `publishReviewerNames` on the snapshot should be honoured for the indexers.

| Method | Path | |
|---|---|---|
| GET | `/articles` | Optional `?q=` matches title, abstract, or an exact DOI |
| GET | `/articles/:id` | One article |

### Sections and institutions

Sections belong to the journal. Institutions are shared across journals, with one row per normalised name (`UNILAG` and `University of Lagos` are the same row). `useCount` goes up only when someone saves an affiliation.

| Method | Path | Who | |
|---|---|---|---|
| GET | `/sections` | author | Sections that accept submissions |
| POST | `/sections` | author | `{ name }`. Reuses a section with the same normalised name, or creates one |
| GET | `/institutions` | public | Optional `?q=`. Most-used names first, up to 12 |
| POST | `/institutions` | signed-in member | `{ name, count? }`. `count: true` records that the name was saved |

## Jobs

`POST /api/v1/jobs/tick` with `Authorization: Bearer $JOB_SECRET`.

Claims up to 10 due jobs, runs them, and makes sure a `reviewer_reminder` job is queued. Call it from cron. Do not call it from a page request.

## Seed accounts

`npm run db:seed` creates journal `ujer`, the Civil & Structural section, and a published copy of the standard review form. With `SEED_EDITOR_PASSWORD` and `SEED_AUTHOR_PASSWORD` it also creates:

- `okonkwo@unilag.edu.ng`, role `handling_editor`
- `balogun@unilag.edu.ng`, role `author`
