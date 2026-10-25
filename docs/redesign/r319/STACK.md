# R319 STACK — the full local Madarek stack (no Docker)

One command boots EVERYTHING the fleet needs to judge authenticated
screens: embedded PostgreSQL 16 + migrations + the realistic Arabic
seed + the Express API + the Vite dev server.

```bash
npm run dev:full
```

```
[dev:full] ✅ full local stack is up
[dev:full]    web  http://localhost:5173   · api http://localhost:4000/api/v1   · pg :5433
```

`Ctrl-C` tears the whole stack down (children killed by process group,
embedded postgres stopped — but ONLY the one dev-full itself booted).

---

## Ports (all overridable)

| Service | Default | Env override |
|---------|---------|--------------|
| Embedded PostgreSQL | **5433** (127.0.0.1, trust auth) | `MADAREK_PG_PORT` |
| Backend API | **4000** | `MADAREK_API_PORT` |
| Vite dev server | **5173** | `MADAREK_WEB_PORT` |

Verified in this worktree: fresh boot → health 200 in ~6 s; custom
`MADAREK_WEB_PORT=4311` works (the app talks to the API through the
Vite `/api` proxy, so CORS never enters the picture on any web port).

## Demo logins (seeded locally)

All five roles exist after the first `dev:full` (see
`backend/prisma/seed.ts` — the documented demo password is
**`Madarek2026!`** for every account):

| Role | Email | Dashboard | Smoke H1 |
|------|-------|-----------|----------|
| STUDENT | `student@demo.madarek.ly` | `/student/dashboard` | لوحة التحكم |
| TEACHER | `teacher@demo.madarek.ly` | `/teacher/dashboard` | لوحة الأستاذ |
| ADMIN | `admin@demo.madarek.ly` | `/admin/dashboard` | لوحة الإدارة |
| QUALITY | `quality@demo.madarek.ly` | `/quality/dashboard` | لوحة الجودة |
| OWNER | `owner@demo.madarek.ly` | `/owner/dashboard` | لوحة التحكم الرئيسية |

Also seeded: `student2@…`, `teacher2@…`, `admin2@…` (مؤسسة الأندلس
التعليمية — the second-institution demo).

## How it works

```
scripts/r319/local-db.mjs   start | stop | status     (npm run db:local -- …)
scripts/r319/dev-full.mjs   the orchestrator          (npm run dev:full)
```

1. **`local-db start`** resolves initdb / pg_ctl from the
   `embedded-postgres` root devDependency (platform package
   `@embedded-postgres/linux-x64`), hydrates the native `.so` symlinks
   npm may have stripped (blocked install scripts), runs `initdb` into
   **`.local/pgdata`** (gitignored, UTF8 for Arabic content) and
   daemonises postgres via `pg_ctl` on :5433 — it must SURVIVE the
   script, so the raw binaries are driven directly instead of the
   EmbeddedPostgres wrapper (whose async-exit-hook kills the cluster on
   script exit). Creates db `madarek_dev`, then writes
   **`backend/.env.local`** ONLY IF ABSENT (gitignored via `*.local`):
   `DATABASE_URL=postgresql://postgres@localhost:5433/madarek_dev` +
   `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (the exact var names from
   `backend/src/env.ts`) as fresh `crypto.randomBytes(48)` hex values —
   LOCAL ONLY, never production. Delete the file to rotate them.
2. **`dev:full`** (idempotent per step): boots postgres when not
   running → `npm run db:deploy` (prisma migrate deploy, 23 migrations)
   → `npm run db:seed` (the r183 established-db guard makes re-runs a
   zero-write no-op) → backend `tsx watch` on :4000 with the local env
   passed **inline** + `DOTENV_CONFIG_PATH=.env.local` (dotenv never
   overrides existing variables — e.g. this sandbox exports its own
   `DATABASE_URL`, which would otherwise shadow the local stack) →
   Vite on :5173. Prefixed, colour-coded logs (`[pg] [db] [api] [web]`).
3. **Teardown**: SIGINT/SIGTERM/SIGHUP + an orphan watchdog (parent
   died → tear down) all route to the same shutdown: children signalled
   as whole process groups, then `local-db stop` ONLY when dev-full
   itself booted the database.

Skip knobs: `MADAREK_SKIP_SEED=1` (migrate only) and
`MADAREK_SKIP_DB=1` (assume a migrated database — fastest restart).

Running the backend standalone: `npm run dev -w backend` reads env via
`dotenv/config`, which loads `.env` only — pass the local file
explicitly:

```bash
DOTENV_CONFIG_PATH=backend/.env.local npm run dev -w backend
```

(and beware ambient `DATABASE_URL` — dotenv does not override existing
variables; `dev:full` handles this for you).

## Playwright auth fixtures (real-API storage states)

`frontend/tests/e2e/fixtures/auth-storage.ts` exports
`storageStateForRole(role)` for the five roles: it POSTs the REAL
`/api/v1/auth/login` with the seeded demo credentials
(`MADAREK_E2E_API_URL`, default `http://localhost:4000`) and returns a
Playwright storageState seeding `mdrk-auth` on the frontend origin in
the EXACT zustand-persist shape (`{ state: { user, accessToken,
memberships, currentInstitution, membershipRole }, version: 1 }` — the
current store version, no migrate), so the SPA boots reload-style
signed-in with a live 15-minute token. The refresh cookie is
deliberately not carried (specs are short; states stay portable).

Smoke belt — `frontend/tests/e2e/r319-auth-stack.e2e.ts`, HERMETIC BY
DEFAULT (skips unless `MADAREK_E2E_STACK=1`, so CI never needs the
stack):

```bash
npm run dev:full
MADAREK_E2E_STACK=1 npx playwright test tests/e2e/r319-auth-stack.e2e.ts --project=e2e
```

Each role: real login → no `/auth` bounce → the role's dashboard H1
renders through the live API. Verified **5/5 passed (15.5 s)** against
`MADAREK_WEB_PORT=4311`. Against a non-default web port also set
`MADAREK_E2E_BASE_URL=http://localhost:4311` (the storageState origin
must match the page origin).

## Seed audit (§C1-B finding)

The current `backend/prisma/seed.ts` generation contains **none** of
the owner-reported production leaks — «قسم اختبار» (departments),
single-letter Latin names («J»), revision codes («r180») in values,
«السنة 8». Those came from the OLDER seed generation that seeded
production (the file's own header documents this); the current data is
realistic Arabic throughout (كلية تقنية المعلومات · قسم علوم الحاسوب ·
هندسة البرمجيات · أحمد الزروق …). The only placeholder-shaped values
are deliberate display-layer contracts: RFC-2606 reserved-host URLs
(`example.invalid`) on two demo materials + the second-institution
lecture — `frontend/src/lib/materialHref.ts` renders those as the
honest «غير متوفر بعد» non-link; `papers/sample.pdf` is a REAL file
committed at `backend/storage/papers/sample.pdf` and served by the API.

## Troubleshooting

- **`pg_ctl start failed`** → usually a stale `postmaster.pid` after an
  unclean shutdown: `rm .local/pgdata/postmaster.pid` and retry. The
  log is `.local/pg.log`.
- **Port 5433 busy** → another local postgres:
  `MADAREK_PG_PORT=5434 npm run dev:full` (the fresh env file then
  carries the new URL; delete `backend/.env.local` if it was written
  against the old port).
- **`401` on demo logins** → the database exists but predates the seed
  run (or an older seed generation wrote password "1234" — see the
  seed header): `MADAREK_SEED_FORCE=1 npm run db:seed` re-runs the
  create-only body and resets the demo passwords to the documented
  value.
- **Login events / lockout**: repeated wrong-password curls lock the
  account for a few minutes (same production lockout policy) — wait or
  re-seed with force.
- **`initdb`/`pg_ctl` not found** → the platform package's symlinks
  were stripped: `local-db start` re-hydrates them itself
  (`pg-symlinks.json`); if it still fails, reinstall:
  `npm install` at the repo root.
- **Postgres left running after a crash** → it is daemonised ON
  PURPOSE (survives scripts). Stop it explicitly:
  `npm run db:local -- stop` (data preserved) or `rm -rf .local/pgdata`
  for a completely fresh database.
- **Reset everything** → `npm run db:local -- stop && rm -rf .local
  backend/.env.local && npm run dev:full` (new datadir, new JWT
  secrets, full re-migrate + re-seed).
