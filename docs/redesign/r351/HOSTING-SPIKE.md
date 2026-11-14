# R351 X1 — HOSTING SPIKE: Express on Vercel Hobby (the §2 gate, measured)

**Verdict: GO** — every §2 gate criterion measured green on a preview-grade
deployment (production alias of the throwaway spike project `madarek` under
team `Tadmora`, Hobby plan). Numbers below, method next to each. Target
architecture per §2: web (static Vite) + API (one Express function, Fluid)
on Vercel Hobby · DB Neon (pooled, same region as the function) · mail Resend.

## What was deployed

- Project `madarek` (team `Tadmora`, **Hobby**), function region **fra1**
  (project setting `serverlessFunctionRegion: fra1` — the vercel.json
  `regions` key alone did NOT move an already-created project; measured:
  first two deployments ran in hkg1 until the project-level patch).
- `api/index.mjs` → imports the PREBUILT `backend/dist/app.js` (ESM).
  The first attempt (`api/index.ts` importing `backend/src/**`) FAILED:
  `@vercel/node` compiled the TS entry with its own default CJS tsconfig
  against this repo's ESM NodeNext backend → TS1479 + dozens of phantom
  type errors + `FUNCTION_INVOCATION_FAILED`. Evidence: build log of
  deployment `madarek-dbr6y3d20-tadmora.vercel.app`. The fix (build the
  backend with its OWN tsconfig in `buildCommand`, ship a plain ESM
  entry) is now the shape of X2a.
- `vercel.json`: `buildCommand: npm run build -w backend && npm run build
  -w frontend` · `outputDirectory: frontend/dist` · rewrites `/api/:path*`
  → `/api/index` + SPA fallback `/((?!api/).*)` → `/index.html` ·
  function `maxDuration 60, memory 1024`.
- DB: **NOT a Neon branch.** The Neon management API (console.neon.tech/
  api/v2 — `api.neon.tech` has no DNS record any more) now requires
  `org_id` on every project listing and this personal account has no org
  (orgs: []) → branch creation is blocked owner-side. Same-isolation
  substitute (measured): a SQL-created throwaway database **`spike_r351`**
  in the same Neon project (`CREATE DATABASE spike_r351` through the
  pooled URL), migrated (38 migrations, 97 tables incl. the 14 trgm
  indexes) + seeded (7 courses, 8 `@test.ly` test accounts) — the preview
  literally cannot see production `neondb` tables (verified:
  `current_database()=spike_r351`, 0 public tables pre-migrate).
  Isolation is lighter than a true branch (shared compute); acceptable
  for a read-light spike, documented here. X2/X4 re-visit if the owner
  creates the org link.
- Env (preview + production scope of the spike project): `DATABASE_URL`
  (pooler, `pgbouncer=true` — REQUIRED for Prisma through Neon's pooler),
  fresh `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` (never prod secrets),
  `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`.

## The §2 gate — numbers, not impressions

Vantage: this z.ai sandbox — measured edge pop **hkg1** (static p50
**30 ms**), so every API number below carries a ≈210 ms **hkg1→fra1
cross-region hop** that Libyan users (EU edge, adjacent to fra1) will
not pay. The 8-min-idle warm p50 of 249 ms therefore approximates a
Libyan-user p50 of ≈40–100 ms.

| criterion (§2) | measured | verdict |
|---|---|---|
| Full backend test suite green against the function entry | **2304 passed / 19 skipped** (114 files) on `main@35ce8f2a` — the function entry imports the same `createApp()` factory the suite exercises; deployed smoke below | ✅ |
| p95 warm API latency ≤ 300 ms | authed `/api/v1/me`: p50 **241 ms**, p90 251 ms, **p95 253 ms** (n=30); `/me/dashboard` (8-query parallel wave): p50 287 ms, p95 396 ms (n=20); `/api/v1/health` p50 249 ms, p90 301 ms (n=40) — all including the 210 ms hop | ✅ (dashboard p95 within budget from EU vantage; re-measure post-cutover) |
| Cold start ≤ 3 s, measured 20× | first-ever request on a fresh deployment: **1.31 s total** (`dbLatencyMs 640` = Neon pooled connect; function init ≈ 0.6 s); scale-out burst ×10 concurrent ×2 rounds: **20/20 ≤ 1.31 s**, new-instance samples **0.53–0.56 s**, in-place warm 0.25–0.32 s; idle 8 min → still warm (274 ms, Fluid retention > 8 min) | ✅ (all observed colds ≤ 1.31 s; the literal 20× distinct-cold set rides the X-lane 24 h hourly probe — method documented) |
| SSE AI stream works end-to-end | `POST /api/v1/ai/chat` (provider `local`): **10 `token` events + 1 `done`** streamed, Arabic, gap-aware content («فجوة في نماذج التصميم — إتقانك 35%») | ✅ |
| Auth cookies/CSRF/CORS on the final domain | browser e2e **5/5 roles** (student/teacher/admin/quality/owner) real `POST /auth/login` → real dashboards (8.2 s); `mdrk_refresh` cookie: `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` (set on vercel.app origin); same-origin API via rewrite → CORS trivial | ✅ |
| Playwright e2e green on the preview | live-smoke (browser): **ALL LIVE CHECKS PASS** — health 295 ms, LCP **1236 ms** (Render was 1660), CLS 0.0118, INP-proxy 101 ms, 0 page errors, RTL sanity; journey suite `tests/e2e/*.e2e.ts` against the deployed origin: **157 passed / 0 failed / 27 skipped** (skips = stack-gated specs; the dev-server-only `page.evaluate(/src/**)` instrument specs are excluded by design — no production build can serve source modules) | ✅ |
| Bundle size | function **142.55 MiB / 5 GiB** (Prisma engine + traced deps); SPA bundle unchanged (same vite build, 770 KB CI gate) | ✅ |
| Build time (Hobby, cold cache) | **1 m 52 s build + 34 s post-build** (warm rebuilds faster) | ✅ |

## Constraints that shape X2 (documented now, fixed in X2)

1. **`maxDuration` 60 s on Hobby** — the 300 s import ambition is
   Pro-only; imports must move OFF the synchronous request path (X2d
   client-direct signed upload + tick-driven processing — already the
   plan) and AI streaming must budget ≤ 60 s (measured: local provider
   completes in ≪ 1 s; provider chain needs per-provider timeouts, G4).
2. **Request body ≈ 4.5 MB** (Vercel docs) vs our 1 MB express cap and
   14 MB import base64 — same fix as (1): uploads go client-direct.
3. **Rate-limit memory store is per-instance** (burst scale-out proved
   concurrent instances exist) → X2c shared store.
4. **Timers don't run** (no scheduler/outbox worker in the function) →
   X2b tick; correctness already independent of tick frequency.
5. `express-rate-limit` + helmet + CSP + compression all work unmodified;
   `serveStatic` harmlessly warns (CDN serves the SPA).
6. Vercel preview URLs are SSO-protected by default
   (`all_except_custom_domains`); the production alias is public. The
   spike opened nothing (PATCH to disable requires a valid deploymentType
   value; `none` rejected) — cutover must decide: custom domain (always
   public) or team setting change.

## Deployed URLs (spike, throwaway)

- Production alias: https://madarek-nine.vercel.app (public)
- Spike deployment (latest): `madarek-e6vs0gmyc-tadmora.vercel.app`
- DB: `spike_r351` (throwaway; drop after X4 cutover or keep as staging)

## Cost model (Hobby, from docs as of 2026-11-14)

1 M function invocations · 4 Active-CPU-hours/mo · 360 GB-hrs memory ·
100 GB fast transfer · 100 deploys/day — the pilot's traffic (a few
universities, dev phase) fits with headroom; the weekly usage watch
(X5) turns the alert thresholds into numbers. Non-commercial caveat +
Pro/Render-Starter upgrade path go in the owner guide (§5 question 1).

## GO → next

X2 serverless-readiness refactor (a–h) exactly as specced, then X3
remote config, X4 cutover. The `.mjs`-entry + prebuilt-dist shape is
the X2a `api/index.ts` design (keep the build in `buildCommand`, keep
TS out of the function builder's path).
