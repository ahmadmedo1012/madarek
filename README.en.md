<div dir="ltr">

# Madarek — Smart Learning Platform

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
with a bespoke two-theme design system (night/gold · cream/copper).

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
git clone https://github.com/ahmadmedo1012/madarek.git && cd madarek
cp .env.example backend/.env       # fill DATABASE_URL + both JWT secrets
npm install
npm run db:migrate                 # apply schema
npm run db:seed                    # demo data

# two terminals:
npm run dev                        # backend :4000
npm run dev:web                    # frontend :5173 (proxies /api → :4000)
```

**Demo accounts** after seeding — **the password is NOT published here**
(r188: removed from public docs; delivered via the operator pilot guide and
a private handoff), spanning the **two demo institutions**:

- Madarek Demo University (the explicitly-fictional demo tenant, r188 —
  25 faculties across three knowledge campuses):
  `student@`, `teacher@`, `admin@`, `quality@demo.madarek.ly`
- Al-Andalus Education Institute (the second demo institution proving
  isolation): `student2@`, `teacher2@`, `admin2@demo.madarek.ly`
- Platform owner (no membership — platform scope): `owner@demo.madarek.ly`

Log in as `student@demo.madarek.ly` then `student2@demo.madarek.ly` — the two
students share reg-number `UZ-2024-00001` on purpose and each sees only
their institution's courses (a foreign offering answers 403). Deploy-time
seeding on Render runs after every deploy, non-destructively (r180).

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
