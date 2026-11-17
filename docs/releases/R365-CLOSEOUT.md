# R365 — Final closeout and production readiness (measured, not assumed)

Continuation of R364. Nothing here re-integrates R364's work: the repository was
already unified on `main`. Every number below was re-measured from this machine on
2026-11-17 (UTC); nothing is copied from an earlier report.

| | |
|---|---|
| Repository | `ahmadmedo1012/madarek` (public, default branch `main`) |
| Verified `main` | `7a097457bdddba1d414bcab5d299abcf71c9bad6` — `docs(r364): record the post-merge truth …` |
| PR #52 (R364 unification) | merged; every `agent/*` and `integration/*` branch is now an ancestor of `main` (0 commits ahead) |
| Open pull requests | **0** (PR #50 closed — see §2) |
| Ruleset `main — verified before merge (R364)` | **active**: pull request required, 13 required contexts, deletion and non-fast-forward blocked, repository-admin bypass |

## 1 · Live production verification (GET/HEAD only, no writes)

### 1.1 Security headers on the SPA document

`HEAD https://madarek-app.vercel.app/` → `HTTP/2 200`. All five headers the R363
audit reported missing are now **live**, not merely committed:

| Header | Live value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'sha256-jEZ9yPBz…' 'sha256-w8MW8JWf…'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' https://madarek-app.vercel.app https://madarek-nine.vercel.app; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-src 'self'` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |

### 1.2 API health, build identity and request correlation

| Probe | Result |
|---|---|
| `GET /api/v1/health` | `200 {"ok":true,"dbLatencyMs":4,"env":"production","buildId":"7a097457bddd"}` — the build id is the verified `main` SHA |
| `GET /api/v1/status` | `200` — `db.ok:true`, `storageDriver:vercel-blob`, `aiMode:chain`, `mailProvider:resend`, live `tick.fastAt/dailyAt/weeklyAt` |
| `x-request-id` echo | sending `x-request-id: probe-r365-1234` returns the same value; the correlator is live |
| `GET /api/health` | `404` — the real route is `/api/v1/health` (unchanged) |
| `GET /health` | serves the SPA (`200` HTML) — it is the catch-all rewrite, **not** an API probe. Do not use it in monitors |

### 1.3 Mobile release artifacts

Both rolling releases carry the verified `main` SHA and their own `verified: true` provenance file:

| Release | Commit | Bytes | SHA-256 (prefix) | Run |
|---|---|---|---|---|
| `android-latest` / `Madarek.apk` | `7a097457…` | 59,070,172 | `564bf8e825681da0…` | 44069011518 (success) |
| `sidestore-latest` / `Madarek.ipa` | `7a097457…` | 17,281,102 | `4a9ad13a79162a0b…` | 44070914155 (success) |

The iOS workflow's **rolling SideStore publication job completed successfully**
(asset re-uploaded 2026-11-17T12:15Z). The previous "still queued" state is resolved.

### 1.4 CI on the verified SHA

All required contexts passed on `7a097457`: CI (lint, typecheck, build, frontend,
backend, DB integration, E2E, iOS WebKit, design gates, conformance, surface drift),
Size gate, deadcode-ratchet, Android release APK, iOS unsigned IPA, Release freshness,
E4 nightly, Flake detector. `deploy-smoke` is green on its last applicable code push
`734385bd`; the current `main` head is a docs-only commit that the deploy workflow's
path filter does not trigger.

## 2 · Git, PR and local-state hygiene

* **PR #50 closed as superseded.** Its only file,
  `docs/redesign/r363-operations-readiness/REPORT.md`, is present on `main`
  (`agent/r363-operations-readiness` was merged by `f8eec814`). The branch carried
  no unique change.
* **Ten merged remote branches deleted**, after verifying each was 0 commits ahead of
  `main` (patch-equivalent for the two cherry-picked ones). Recorded for reversibility:

  | Branch | Last SHA |
  |---|---|
  | `agent/r362-design-system` | `0b9b9b09` |
  | `agent/r362-heron-experience` | `fabd1387` |
  | `agent/r362-native-mobile` | `ec2b5d14` |
  | `agent/r362-shell-nav` | `3b9dea73` |
  | `agent/r362-web-product` | `6de74253` |
  | `agent/r363-backend-hardening` | `9213585c` |
  | `agent/r363-operations-readiness` | `f25d417b` |
  | `integration/r362-final-unification` | `e98d6a0b` |
  | `integration/r364-final-main` | `df063c1f` |
  | `feat/heronai-uiux-overhaul` | `79659d8d` |

* **Deliberately retained:** `main`, `gh-pages` (publishing), every tag, and
  **`wip/r358-ui`** — 22 commits ahead, explicitly *rejected* in R364 §4 (it deletes
  six drift guards and regrows the overflow drawer). Rejected work is not merged
  work, so it is preserved rather than deleted.
* **Local-only work preserved, not discarded:** the two R364 worktrees
  (`madarek-r364`, `madarek-heronai-uiux`), the `feat/heronai-uiux-overhaul` local
  branch (its tail is cherry-picked into `main`), the r354 stash in the main clone,
  and the second clone's sparse-checkout configuration. No `git reset`, `clean`,
  `stash drop` or force-push was used.
* **Local `main` reconciled:** `/home/rh2011/madarek` was behind 325 commits; its only
  local diff was a trailing newline in `apps/mobile/package.json` (saved as a patch
  before the fast-forward, and unnecessary on the current tree). It now sits exactly on
  `7a097457`, clean.
* **Security hygiene:** `Projects/madarek`'s `origin` URL embedded a personal access
  token in `.git/config`; the URL was rewritten to the plain HTTPS form and the
  credential helper (`gh`) takes over. The token itself must be revoked by the owner.
* A 270 KB unreferenced `tmp-live-landing.png` at the repository root (committed in
  r350, referenced by nothing) was removed in this round.

## 3 · The "duplicate membership" question — answered

**There is no duplicate row, and no product defect.** The schema enforces
`@@unique([userId, institutionId])` (`Membership_userId_institutionId_key`, verified
in production), so a second row for the same pair is impossible. Production holds
46 users / 53 memberships / 5 institutions, and all 53 memberships are active.

What actually happened: the demo student (`student@test.ly`) is active in **two
different institutions** — the legacy `inst-ulara-showcase` (created 2026-11-09) and
`inst-madarek-demo` (created 2026-11-16) — so `resolveDefaultContext` correctly refuses
to auto-select (`r349` fail-closed rule) and the client must show the institution picker.

Sources of the reactivation, traced in code and configuration:

| Writer | Scope | Evidence |
|---|---|---|
| `ensureTestAccounts()` on boot, gated by `MADAREK_TEST_ACCOUNTS` (`backend/src/server.ts:45`) | `madarek-demo` + `alandalus-demo` seats; `upsert` with `isActive: true` | the Vercel **production** environment defines `MADAREK_TEST_ACCOUNTS`; `render.yaml:197` still ships `'1'` for the standby |
| `ensureMembership()` in `backend/prisma/seed.ts:309` and `seed-demo-r330.ts` | same two demo institutions | deploy-time seed, production-gated since r363 |
| Legacy `ulara` corpus | 39 memberships, no writer in `HEAD` | historical seed lineage; not reproducible from this tree |

The affected batch timestamps are **03:52Z** (`madarek-demo`/`alandalus-demo`) and
**03:55Z** (`ulara-demo`, 4 users). R364's report says `01:52Z`: that is the same
instant read through a +02:00 local timezone on a `timestamp without time zone`
column, not a different event.

**Concrete impact, reproduced and fixed:** the soak probe logged in as
`registrar@test.ly` (also two active memberships), called `/api/v1/search/discover`
without selecting an institution, received `INSTITUTION_CONTEXT_REQUIRED`, and opened
issue #51. The probe now follows the picker flow exactly like the web client and the
deploy smoke. Verified by running the same sequence against production:
`multi-membership seat — selecting inst-ulara-showcase (the picker flow)` →
`search answered=true` → `ai config answered=true` → `fails=0`.

## 4 · Remaining blockers — external, and honestly separated

Repository-owned code gaps are closed: security headers, request correlation, the
multi-institution smoke, and this soak probe are all live and green. What remains
needs credentials, DNS, billing or an account decision (exact steps in
`R365-OWNER-ACTIONS.md`):

| # | Blocker | Severity | Live status on 2026-11-17 |
|---|---|---|---|
| 1 | No external error tracking; 5xx visible only in the OWNER console | **P0** | 4 unresolved `OperationalAlert` rows remain (2× `HTTP_500` Nov 13–14, 1× `APP_INTERNAL`, 1× sync reaper); no Sentry/Bugsnag/OTel anywhere in the tree |
| 2 | Transactional mail dead | **P1** | `MailOutbox`: **118 failed** (dead letters), **36 queued**, **1 stuck in `sending`**, 4 sent; `MAIL_FROM` still the shared Resend test sender; the provided Resend key is send-only, so domain status cannot be read from CI |
| 3 | No scheduled off-site backup, no proven restore | **P1** | no backup workflow exists; `npm run db:backup` / `db:restore` are operator tools that deliberately do not upload; dumps must **not** be public GitHub artifacts in this public repository |
| 4 | Render standby suspended, rollback window lapsing ~2026-11-28 | **P1** | `madarek.onrender.com` → `503`; `render.yaml` still declares `autoDeploy: true` and `MADAREK_TEST_ACCOUNTS: '1'` |
| 5 | GitHub cron starvation | **P1/P2** | `tick.yml` is scheduled `*/5` but produced 11 runs in ~2.5 days (≈4.4/day, worst gap ~9 h); `soak.yml` `*/15` produced 4 runs in 4 days |
| 6 | Demo data drift (`MADAREK_TEST_ACCOUNTS` in production) | P2 | diagnosed above; needs an explicit keep/remove decision |

## 5 · Verdict

* **The release is verified.** Code, CI, artifacts, ruleset and live headers agree on
  `7a097457`.
* **The production service is not "ready" in the unrestricted sense** while the P0
  external blocker stands. No backup, mail delivery, recovery or off-site retention is
  claimed anywhere in this document.
* Entry points: this file, `docs/releases/R365-OWNER-ACTIONS.md`, and the reconciled
  `docs/releases/R364-ARABIC-HANDOVER.md`.
