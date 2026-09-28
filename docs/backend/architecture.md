# Architecture

One Next.js process. Postgres is the system of record. There is no second backend service.

A separate API would have to re-own the Drizzle schema, the policy types, and the status enums that the screens already import. Those types are the contract. Keeping the server in this repo means a manuscript status added in `schema.ts` fails the type check in the same commit that updates the desk.

Long work does not run inside the request that triggered it. Metadata scrubbing, similarity checks, reviewer reminders, and Crossref deposits are rows in `jobs`. `POST /api/v1/jobs/tick` claims them. The user's request only inserts the row and returns.

## Request path

```
Route  src/app/api/...          parses HTTP, nothing else
        |
Service src/server/<module>     the rule: who may do this, and what gets written
        |
Tenant  src/db/tenant.ts        one transaction, app.journal_id set for its duration
        |
Schema  src/db/schema.ts        tables, enums, the RLS policies to apply
```

Routes are thin on purpose. A bug in a permission check belongs in the service, where the transaction can roll the write back with the check.

`api()` in `src/server/http.ts` turns `AppError` and Zod failures into JSON. A missing row and a row in another journal are both 404. Confirming that a manuscript id exists is itself a disclosure.

## Tenancy

Every journal-owned table has `journal_id`. The services also filter on it. Row-level security is the second check, for the query that forgets.

`withJournal` opens a transaction and runs:

```sql
select set_config('app.journal_id', '<uuid>', true)
```

`true` means the setting dies at commit, which is `SET LOCAL`. The app role must not be a superuser, and the policies at the bottom of `schema.ts` must be applied, or this setting is only a comment. Until those policies exist, the `WHERE journal_id = …` in each service is what isolates tenants. Do not remove those clauses when the policies are added.

Three lookups happen before the journal is known. Each one has its own setting and its own policy, written out in `schema.ts`:

- Reviewer token. The sha256 of the token is set as `app.review_token_hash`, the assignment is found, then `app.journal_id` is set and the rest of the request is an ordinary tenant transaction. The raw token is never stored.
- Paystack webhook. The signature is checked first. Then `app.paystack_reference` is set and the charge is found.
- `GET /api/v1/me`. `app.user_id` is set so a person can list their own memberships across journals.

`users`, `sessions`, `accounts`, and `verifications` have no `journal_id`. A person is not owned by a journal. What they may do in one is a `memberships` row.

## Policy is frozen

`freezePolicy()` in `src/db/policy.ts` runs once, on draft to submitted, and writes `manuscripts.policy_snapshot`. Reviewer deadlines, blinding, the review form id, fees, and which decisions are available are read from that snapshot afterwards.

`saveSettings` writes the live journal policy and a `settings_history` row. It does not update snapshots. The response includes `inFlight`, the count of manuscripts still moving under the old policy, which is the number an editor has to see before confirming a change.

Fees copy `amount_minor` and `currency` onto `charges` at the moment the trigger fires (`on_submission`, `on_acceptance`, or `on_publication`). A later fee change does not rebill.

## Nothing is deleted

`status_transitions`, `settings_history`, `audit_log`, and `doi_deposits` are insert-only. A decision is a new row. A retraction is a new status, not a removal of the article. Refunds set `charges.status` to `refunded` and write an audit row; the charge stays.

`jobs` are updated as they run. They are a queue, not a record. Invitation URLs inside a `send_email` payload are cleared when the job succeeds.

## Blinding

`src/server/blinding.ts` is the only place that decides who sees a name.

| Mode | Reviewer sees authors | Author sees reviewer names |
|---|---|---|
| double_blind | no | no |
| single_blind | yes | no |
| open | yes | yes |
| transparent | yes | yes |

Publishing reviewer names is a separate switch and applies to the public article, not to the in-review author page.

An editor who is also an author of the manuscript gets the author view of that manuscript. Otherwise they would read the reviewer names on their own paper. `assertNotAuthor` blocks them from being assigned as its handling editor, from inviting its reviewers, and from recording its decision.

Reviewer files are a second boundary. `readForReviewer` serves only `manuscript_anonymised`, `review_pdf`, `figure`, and `supplementary`, and only when `is_metadata_scrubbed` is true. The original `manuscript` file is never in that set. The scrubber job currently fails on purpose and leaves the flag false. Until a real scrubber exists, an editor marks a reviewer-facing copy scrubbed with `POST /api/v1/j/:slug/files/:id/scrubbed`, which is audited and refuses the original file.

Author-visible review text is included only after a decision exists for that round, and only for questions whose visibility is `author_and_editor`. The decision-letter draft reads the same set. It does not read `editor_only` answers. The letter stored on `decisions` is the text the editor sent.

## Status

Legal moves are `TRANSITIONS` in `src/server/manuscripts/transitions.ts`. Anything else is a 409. Publishing requires a DOI and an issue. Withdrawing a published article is not a transition; retraction is.

`rejected` is the outcome of review. `desk_rejected` is a close before review. They are different rows on purpose. A desk reject is refused once the manuscript is in `decision_pending`.

A recorded decision maps to a status in `DECISION_STATUS`. Revision decisions are refused when `current_round` has reached `maxRevisionRounds` on the snapshot.

## Modules

Each module is a file under `src/server`. The route table is in [api.md](./api.md).

**Identity.** Better Auth. Email and password now. ORCID when both client env vars are set, through the generic OIDC plugin against `https://orcid.org`. Roles are not a column on the user.

**Memberships.** Fifteen roles, scoped to a journal, a section, or an issue. `findGrant` picks the widest grant that covers the resource. A section editor listing the desk only sees that section, via `scopeFilter`.

**Manuscripts.** Draft, submit (freeze, declarations, file required, reference already allocated), resubmit, assign a handling editor, transition. The desk is the `NEEDS_ACTION` statuses from `manuscript-status.ts`.

**Files.** Bytes go to `.data/objects/<journal>/<manuscript>/<file>` under a key we generate. The original filename is metadata only. A scrub job is enqueued and, today, fails closed.

**Reviews.** Invite stores a hash and emails the raw token once. Accept moves `reviewer_search` or `resubmitted` to `under_review`. When submitted reviews reach `reviewsRequiredToDecide`, the manuscript moves to `decision_pending`. If every reviewer declines or expires and none remain, it returns to `reviewer_search`. Late reviews are accepted. Reminders do not rotate the token, because that would kill the link the reviewer saved.

**Decisions.** One row per decision, including the letter. The author is notified that a letter is waiting. The notification does not contain reviewer names.

**Charges.** One charge per manuscript, unique on `manuscript_id`. Amount comes from the snapshot. Country auto-waiver uses the corresponding author's user country. Student auto-waiver is in the policy object and is not applied yet, because a manuscript does not record that the author is a student. Waive and refund are audited. Checkout calls Paystack after the transaction commits. The webhook is idempotent.

**Settings.** Full policy in, diff and history out, snapshots untouched.

**Issues and production.** Accept does not create a production task. `accepted` to `in_production` does, at `copyediting`. Stage changes are updates on that one task.

**DOI.** `doi_counters` is the sequence. The suffix comes from `mintDoi` and the pattern on the snapshot. Deposits are append-only. The Crossref XML is built from the manuscript. The HTTP post to Crossref is not wired; the job records that and fails, so a DOI is never marked registered by a local build.

**Reports.** Counts and a median from `status_transitions`, so an edited manuscript row cannot change the history.

**Notifications.** An in-app row and a `send_email` job in the same transaction. Mail is logged until `SMTP_URL` is set. In production, a set `SMTP_URL` throws, because silently dropping mail is worse than failing the job.

**Jobs.** `FOR UPDATE SKIP LOCKED`, five attempts, then `failed`. Types: `scrub_metadata`, `send_email`, `reviewer_reminder`, `crossref_deposit`, `similarity_check`. The tick also makes sure a reminder sweep is queued.

## What is deliberately not here yet

- The screens still import `src/lib/mock-*.ts`.
- The demo session in `src/lib/session.tsx` is still what the shell checks. Better Auth is mounted and unused by the UI.
- Document metadata is not actually stripped. The flag stays false until a scrubber, or an editor, says otherwise.
- Similarity providers are not called.
- Crossref is not posted to.
- Paystack refunds are a status change, not a call to Paystack's refund endpoint. Move the money in the dashboard, then record it here.
- Row-level security policies are written as SQL in the schema comment. `db:migrate` creates tables. Applying the policies is a follow-up migration that should land before a second journal is added.
