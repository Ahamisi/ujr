# UNILAG Journal Platform

Submission, peer review and publication. Multi-tenant from the first commit.

## Run it

**Install from macOS, not from a container.** `lightningcss`, `@tailwindcss/oxide`
and Next's SWC binary are platform-specific. If you see
`Cannot find module '../lightningcss.darwin-arm64.node'`, the tree was installed
on the wrong platform — `rm -rf node_modules package-lock.json .next && npm install`.

```bash
npm run dev      # http://localhost:3000 — redirects to /desk
npm run build    # production build
npx tsc --noEmit # type check
```

## Where things are

```
src/
  app/
    (app)/               authenticated shell — sidebar + topbar
      desk/              editor desk: the triage queue
      transactions/      charges, waivers, Paystack reconciliation
    (public)/            the journal's public face — no sign-in
      articles/[id]/     article of record, with Highwire citation meta tags
      archive/           every published issue
      search/            DOI and ISSN resolve; everything else is a text search
    review/[token]/      the reviewer's workspace, no account needed
    layout.tsx           root layout, pre-paint theme script
    globals.css          design tokens (light + dark), Tailwind v4
  components/
    ui/                  shadcn-style primitives (Radix + cva)
    journal/             domain display: status, reviewer track, similarity
    shell/               sidebar, topbar, theme toggle
  db/
    schema.ts            Drizzle/Postgres schema
    policy.ts            editorial policy: defaults, resolve, freeze, diff
  lib/
    types.ts             UI types mirroring the schema enums
    manuscript-status.ts status labels, colours, and what each one blocks on
    mock-data.ts         placeholder rows — delete once the DB is wired
```

`components.json` is present, so `npx shadcn@latest add <component>` works on any
network that can reach ui.shadcn.com. The primitives already here were written
by hand because that host was unreachable during setup — same API, same layout.

## Conventions worth keeping

**Colour encodes who is blocked, not progress.** In `manuscript-status.ts`:
warning = waiting on the editorial office, info = waiting on someone outside,
success = resolved for the author, danger = resolved against. An editor scanning
forty rows reads colour before text.

**Semantic colour is separate from the accent.** Teal is interaction only. A
status pill must never be mistaken for a button.

**Policy is frozen, not read live.** `freezePolicy()` snapshots the effective
configuration onto the manuscript at submission. Nothing downstream reads
`journals.policy`. Flipping a journal setting must never retroactively unmask a
reviewer or rebill an author.

**Nothing is deleted.** `status_transitions`, `settings_history` and `audit_log`
are append-only. They are what makes an editorial decision defensible.

**Tabular numerals on anything in a column.** Use the `tnum` class for
references, day counts and scores.

## State

Built, with placeholder data:

- App shell — sidebar, journal switcher, dark mode
- Editor desk (`/desk`) — filterable queue, status pills, reviewer dots, staleness
- Manuscript detail (`/manuscripts/[id]`) — side-by-side reviews with scored
  criteria, disagreement banner, fenced confidential comments, activity stream
- `db/schema.ts` and `db/policy.ts` — complete, type-checked, not yet connected

Nav items other than the desk will 404.

## Next, in order

1. **Reviewer screen.** The invitation lands on a token URL with no account:
   accept/decline, read the anonymised PDF, fill the structured form. Autosave to
   IndexedDB and flush when online. This screen decides whether reviewers come back.
2. **Database.** Connect Postgres, generate migrations with drizzle-kit, write the
   RLS policies from the template at the foot of `schema.ts`, seed from
   `mock-data.ts`, then delete that file.
3. **Auth.** Better Auth, plus signed reviewer tokens, plus ORCID through generic OIDC.
4. **Submission wizard.** Extract title/authors/abstract from the upload and have the
   author correct them. Resumable chunked uploads. Anonymised preview before submit.
5. **Document pipeline.** Metadata scrubbing on ingest (`core.xml`, track-changes
   attribution, comment authorship, PDF XMP), anonymised copy, PDF for annotation.
   Run it in a worker, never in the request path.
6. **Settings.** Render `policy.ts` as a form. Show `diffPolicy()` output as the
   blast-radius warning before every save.
7. **Public article pages.** Static, edge-cached, Highwire Press meta tags. Without
   those, Google Scholar indexes you wrong and authors stop submitting.

## Open decisions

- Default blinding mode for a newly provisioned journal
- Diamond open access, or article charges with a waiver policy
- Whether reviews are published alongside articles
- One DOI prefix for the platform, or one per journal
- Whether UNILAG already holds a Turnitin licence
- Whether other faculties run OJS (import path, and editor habits)
