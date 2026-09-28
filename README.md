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

The server is documented in [`docs/backend`](docs/backend/README.md). Schema,
policy, Better Auth, and the `/api/v1` routes live there. The screens still
read the mock modules until each one is pointed at those routes.

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

The screens are a working prototype on placeholder data. The editorial API is
real and unused by those screens: Postgres via Drizzle, Better Auth, tenant
transactions, and a service per module. See [`docs/backend`](docs/backend/README.md).

Built, with placeholder data in the UI:

- App shell — sidebar, journal switcher, dark mode
- Editor desk (`/desk`) — filterable queue, status pills, reviewer dots, staleness
- Manuscript detail (`/manuscripts/[id]`) — side-by-side reviews with scored
  criteria, disagreement banner, fenced confidential comments, activity stream
- Author, reviewer, production, DOI, charges, settings, and the public journal

`npm run dev` does not need a database. `GET /api/health` reports whether
Postgres is configured.

## Next, in order

1. **Postgres.** `npm run db:generate`, `npm run db:migrate`, then apply the
   row-level security policies at the foot of `src/db/schema.ts` before a
   second journal is added. `npm run db:seed`.
2. **Cut the shell over to Better Auth.** Replace `src/lib/session.tsx`. One
   screen at a time, starting with the desk, which is `GET /api/v1/j/:slug/desk`.
3. **Scrubber and similarity.** The jobs exist and fail closed. Reviewers are
   not served a file until it is actually scrubbed.
4. **Crossref and Paystack refunds.** XML is built. The HTTP calls are not
   wired. Recording a refund does not move money.

## Open decisions

- Default blinding mode for a newly provisioned journal
- Diamond open access, or article charges with a waiver policy
- Whether reviews are published alongside articles
- One DOI prefix for the platform, or one per journal
- Whether UNILAG already holds a Turnitin licence
- Whether other faculties run OJS (import path, and editor habits)
