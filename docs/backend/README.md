# Backend

The screens still read mock data. This directory is the server those screens will call.

Start with [architecture.md](./architecture.md) for why the backend is shaped this way, then [auth.md](./auth.md) for who is allowed to do what, then [api.md](./api.md) for every route.

## Run it

Postgres 16 or newer. The application role must not be a superuser once row-level security is turned on, or the policies in `src/db/schema.ts` do nothing.

```bash
npm run db:up         # Docker Postgres, login ujer_app, tables, row-level security, seed
npm test
npm run dev
```

`npm run db:up` writes `.env` on the first run. The application login is `ujer_app`, database `unilag_journal`. That role is not a superuser. The `postgres` role is only for migrations. Both passwords live in `.env` (`UJER_APP_PASSWORD`, `POSTGRES_ADMIN_PASSWORD`).

On this machine port 5432 is already a local Postgres and 5433 is another project, so the journal container is published on **5434**.

`npm run db:migrate` alone expects `DATABASE_URL` to be a role that can create tables. Use `DATABASE_URL_ADMIN` for that. The running app must keep using `ujer_app`.

`GET /api/health` returns `{ database: "not_configured" }` until `DATABASE_URL` is set, and `{ database: "up" }` once Postgres answers. The existing UI does not call these routes, so `npm run dev` still works with no database.

## What is connected

| Piece | Where | Talks to Postgres |
|---|---|---|
| Drizzle schema | `src/db/schema.ts` | the tables |
| Policy freeze / diff | `src/db/policy.ts` | read by the services, not by the UI's settings form yet |
| Tenant transaction | `src/db/tenant.ts` | `set_config('app.journal_id', …, true)` |
| Identity | `src/server/auth/instance.ts` | Better Auth, `/api/auth/*` |
| Editorial API | `src/server/http/journal-routes.ts` | `/api/v1/...` |
| Screens | `src/app/(app)` and `src/app/(public)` | mock modules in `src/lib/mock-*.ts` |

Replacing a screen means changing its data import to `fetch` against the route in [api.md](./api.md). Do that one screen at a time. Do not delete a mock module until nothing imports it.
