#!/usr/bin/env bash
# Starts Postgres, creates the ujer_app login, migrates, applies row-level
# security, and seeds the journal. Safe to run again.
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env ]]; then
  admin_pw="$(openssl rand -hex 24)"
  app_pw="$(openssl rand -hex 24)"
  auth_secret="$(openssl rand -base64 32)"
  cat > .env <<EOF
POSTGRES_ADMIN_PASSWORD=${admin_pw}
UJER_APP_PASSWORD=${app_pw}
DATABASE_URL=postgres://ujer_app:${app_pw}@127.0.0.1:5434/unilag_journal
DATABASE_URL_ADMIN=postgres://postgres:${admin_pw}@127.0.0.1:5434/unilag_journal
BETTER_AUTH_SECRET=${auth_secret}
BETTER_AUTH_URL=http://localhost:3000
REQUIRE_EMAIL_VERIFICATION=false
JOB_SECRET=$(openssl rand -hex 24)
PUBLIC_SITE_URL=http://localhost:3000
SEED_EDITOR_PASSWORD=$(openssl rand -hex 12)
SEED_AUTHOR_PASSWORD=$(openssl rand -hex 12)
EOF
  echo "Wrote .env with a new ujer_app password."
fi

set -a
# shellcheck disable=SC1091
source .env
set +a

docker compose up -d

echo "Waiting for Postgres..."
for _ in $(seq 1 30); do
  if docker compose exec -T postgres pg_isready -U postgres -d unilag_journal >/dev/null 2>&1; then
    break
  fi
  sleep 1
done
docker compose exec -T postgres pg_isready -U postgres -d unilag_journal

docker compose exec -T postgres psql -U postgres -d unilag_journal -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ujer_app') THEN
    CREATE ROLE ujer_app LOGIN PASSWORD '${UJER_APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  ELSE
    ALTER ROLE ujer_app WITH LOGIN PASSWORD '${UJER_APP_PASSWORD}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE unilag_journal TO ujer_app;
SQL

echo "Migrating as postgres (table owner)..."
DATABASE_URL="$DATABASE_URL_ADMIN" npx drizzle-kit migrate

echo "Granting ujer_app and enabling row-level security..."
docker compose exec -T postgres psql -U postgres -d unilag_journal -v ON_ERROR_STOP=1 < scripts/rls.sql

echo "Seeding as postgres so the first journal can be inserted..."
DATABASE_URL="$DATABASE_URL_ADMIN" npx tsx src/db/seed.ts

echo "Postgres is ready. The app connects as ujer_app."
