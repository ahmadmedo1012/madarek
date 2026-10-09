<div dir="ltr">

# Madarek — Zawia University Smart Learning Platform

**Arabic-primary README lives here: [`README.md`](README.md).** This file
is the English mirror for international readers and tooling.

**Madarek** is the official smart-learning platform of **University of
Zawia** (Ministry of Higher Education & Scientific Research, Libya).

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
| Core features, all five roles | **Shipped** — 1015 frontend + 1021 backend unit tests green (2026-10-10) |
| Design system | Documented in `DESIGN.md` — parity gate 163/163 green |
| AI assistant & plagiarism scan | **Deterministic local simulation, openly labeled** — see `docs/02-features.md` |
| English i18n, real E2E, file uploads | Not implemented — full list in `docs/16-decisions-and-limitations.md` |

## Documentation hub

The Arabic documentation hub: [`docs/README.md`](docs/README.md)
(numbered guides 01–16 + per-sector modules). Key references (English,
generated from code): [`docs/API-REFERENCE.md`](docs/API-REFERENCE.md)
(193 endpoints), [`docs/DATABASE-REFERENCE.md`](docs/DATABASE-REFERENCE.md)
(75 models / 30 enums), [`docs/FRONTEND-REFERENCE.md`](docs/FRONTEND-REFERENCE.md),
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

**Demo accounts** after seeding (password `Madarek2026!` — public demo
credential, re-seeding resets it): `student@`, `teacher@`, `admin@`,
`quality@`, `owner@zu.edu.ly`.

## Verify it yourself

```bash
npm run lint                          # ESLint — 0 errors
npm run typecheck                     # tsc — src + tests, both sides (no DB)
npm test                              # 1015 FE + 1021 BE (no DB)
node scripts/verify-parity-export.mjs # design-parity gate 163/163
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
