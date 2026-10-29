<div dir="ltr">

# Madarek — Smart Learning Platform

> **Brand (one line, no image):** the khatam idea redrawn on a 32-unit
> grid — two squares in uniform hairline ink with miter joins and ONE
> solid orange point (`#FA3600`) seated on the grid intersection (24,8)
> — «a point becomes an orbit»; paper `#F6F6EE`, ink `#282828`, dark
> mode swaps via tokens. Guide:
> [`docs/redesign/r323/brand/BRAND.md`](docs/redesign/r323/brand/BRAND.md)
> · spec page: `/__brand`.

**Arabic-primary README lives here: [`README.md`](README.md).** This file
is the English mirror for international readers and tooling.

**Madarek** is an **independent** smart-learning platform (Arabic-first).
No official adoption or endorsement by any educational
institution exists — the institutional data currently shown (faculties,
facts) is showcase/reference data for the University of Zawia, sourced
from its public website.

## What it is

One platform serving students, teachers, admins, the quality office and
the platform owner: flipped classrooms with embedded checkpoints, a
per-concept mastery matrix, a full research-papers workflow with inline
PDF annotations, Arabic-normalized cross-document library search, a
read-only quality-oversight sector, and DB-driven administration with a
capability-based governance model and a full audit log — all Arabic-RTL,
with a bespoke two-theme design system driven by one token set
(paper/ink with the single orange signal — no gradients, no copper/gold
in the brand).

**Stack:** Express + TypeScript + Prisma 5 backend serving `/api/v1/*`
*and* the built React 18 + Vite SPA as a single service; PostgreSQL on
Neon; deployed on Render with auto-deploy from `main`.

## Current state (honest)

| Item | State |
|---|---|
| Core features, all five roles | **Shipped** — 1970 frontend + 1783 backend unit tests green + 116 DB integration tests + 28 e2e journeys (2026-10-19, rounds r141–r189) |
| Design system | Documented in `DESIGN.md` — parity gate 190/190 green |
| AI assistant | **Mastery-aware chat with per-response engine attribution** — runs the in-process local engine by default (zero external calls); an OpenAI-compatible/OpenRouter provider activates only when `AI_PROVIDER`/`AI_API_KEY` are set in the deployment (the current production deployment has them unset → local engine; `/api/v1/ai/config` reports the live truth). The plagiarism scan stays a deterministic simulation, openly labeled; see `docs/02-features.md` |
| English i18n | Not implemented. Real E2E (28 Playwright journeys) and PDF file uploads (durable postgres storage, r175) **are shipped** — full list in `docs/16-decisions-and-limitations.md` |

## Documentation hub

The Arabic documentation hub: [`docs/README.md`](docs/README.md)
(numbered guides 01–16 + per-sector modules). Key references (English,
generated from code): [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md)
(222 endpoints), [`docs/DATABASE-REFERENCE.md`](docs/DATABASE-REFERENCE.md)
(79 models / 31 enums), [`docs/FRONTEND-REFERENCE.md`](docs/FRONTEND-REFERENCE.md),
[`docs/PROJECT-REFERENCE.md`](docs/PROJECT-REFERENCE.md),
[`docs/SECRETS-REFERENCE.md`](docs/SECRETS-REFERENCE.md).
AI agents must read [`AGENTS.md`](AGENTS.md) first.

## Quick start

Prereqs: **Node `>=20 <25`**, **npm**, a PostgreSQL (free Neon works).
Full guide: `docs/05-setup.md`.

```bash
git clone <repository-url> && cd madarek
cp .env.example backend/.env       # fill DATABASE_URL + both JWT secrets
npm install
npm run db:migrate                 # apply schema
npm run db:seed                    # demo data

# two terminals:
npm run dev                        # backend :4000
npm run dev:web                    # frontend :5173 (proxies /api → :4000)
```

**Test accounts** (R320 §C — one easy account per job; the single source
of truth is `shared/testAccounts.ts`; `npm run db:seed` always ensures
them). Password for all: **`12345678`** — published TEST credentials
(development environment; never for production):

| Job | Email | Group |
|---|---|---|
| Student · second student (messages/community) | `student@test.ly` · `student2@test.ly` | التعليم |
| Teacher · department head · dean · vice dean | `teacher@test.ly` · `head@test.ly` · `dean@test.ly` · `vicedean@test.ly` | التعليم |
| University registrar · faculty registrar (faculty scope) · quality | `registrar@test.ly` · `faculty@test.ly` · `quality@test.ly` | الإدارة |
| Owner | `owner@test.ly` | النظام |

Plus two corpus accounts of the second demo institution (institution
isolation): `teacher2@test.ly` · `admin2@test.ly` (same password).

Log in as `student@test.ly` then `student2@test.ly` — the two
students share reg-number `UZ-2024-00001` on purpose and each sees only
their institution's courses (a foreign offering answers 403). Deploy-time
seeding on Render runs after every deploy, non-destructively (r180) —
the one documented exception being these `@test.ly` accounts (R320 §C;
on Render the boot-time ensure can be enabled with
`MADAREK_TEST_ACCOUNTS=1`).

## Verify it yourself

```bash
npm run lint                          # ESLint — 0 errors
npm run typecheck                     # tsc — src + tests, both sides (no DB)
npm test                              # 1970 FE + 1783 BE (no DB; incl. 7 live S3 tests against s3rver) — npm run test:integration adds 116 DB tests on a local disposable database (14 cross-institution r179 isolation tests + 2 seed repeat-safety r182 tests among them)
node scripts/verify-parity-export.mjs # design-parity gate 190/190
bash scripts/check-csp-hash.sh        # CSP pin drift guard (now in CI)
npm run validate:colleges             # 25 college identities (WCAG AA)
```

## Deploy on Render (3 steps)

1. Render → **New + → Blueprint** → pick this repo (`render.yaml` creates
   the service and auto-generates both JWT secrets).
2. Environment tab: set **`DATABASE_URL`** to your Neon **pooler** string
   (`?sslmode=require&channel_binding=require`).
3. Push to `main` — build applies migrations (`prisma migrate deploy`),
   then one Node service serves API + SPA with health check
   `/api/v1/health`. Details: `docs/12-deployment.md`.

## Environment variables (required only)

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooler string (`sslmode=require&channel_binding=require`) |
| `JWT_ACCESS_SECRET` | 64 bytes random hex — `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `JWT_REFRESH_SECRET` | a *different* 64-byte random hex |

Optional vars (`CORS_ORIGINS` — *replaces* the default list when set,
`INTERNAL_SERVICE_TOKEN`, `DIRECT_DATABASE_URL`, `PORT`): full table and
exact behavior in `docs/06-configuration.md`.

## License

Proprietary — see [`LICENSE`](LICENSE). Security reports: private
channels only, per [`SECURITY.md`](SECURITY.md).

</div>
