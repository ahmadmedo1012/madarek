# R363 — Production Readiness, Deployment & Operational Resilience Audit

| | |
|---|---|
| Auditor | Agent 9 — independent DevOps, release engineering & production reliability |
| Baseline | `e98d6a0b832bcf912cc919ba9c7bc9ca33150c8a` (verified == HEAD of `origin/integration/r362-final-unification`) |
| Audit branch | `agent/r363-operations-readiness` (branched from the exact baseline; this report is the branch's only commit) |
| Audit window | 2026-11-17 (~05:50–06:40 UTC, live checks) |
| Method | Read-only. Five parallel specialist audits (A deployment/origins · B CI/CD · C database · D observability · E dependencies) + parent live GET-only HTTP checks, read-only GitHub/Vercel API queries, and SELECT-only production-DB probes. No deployments triggered, no credentials rotated, no DNS changed, no emails sent, no mutations. |
| Orchestration | Ruflo and gstack are not available in this environment → native GLM subagents were used (five parallel, all read-only). Consolidation by the parent. |
| Inputs honored | R362 integration record (`docs/redesign/r362-integration/INTEGRATION-RECORD.md`) and coordination contract (`R362-COORDINATION.md`) read in full; this audit branches from the documented baseline and touches no other agent's files. |

**Live production state at audit time (all verified in §Appendix A):** canonical origin healthy at main HEAD (`buildId 8f38b1548ec6`), failover alias serving the identical deployment, Render standby suspended (503), production DB schema == repo migrations 48/48, Android public APK == main HEAD, AI chain healthy, tick slots current.

---

## 1 · Executive readiness summary

**Verdict: READY WITH GAPS for the current supervised pilot posture. NOT READY for unsupervised production launch.**

Madarek's release engineering is unusually strong for a solo-maintainer free-tier stack: commit-to-production provenance is fully machine-verified end to end (SHA baked at build → `buildId` on `/api/v1/health` → deployment `READY` from the exact commit — all cross-checked live during this audit), the public Android artifact is GitHub-Actions-built, independently verified, and freshness-enforced (verified == HEAD at audit time), migrations deploy atomically inside the build with a production ledger that matches the repo exactly, and the dependency architecture (mail outbox with dead-lettering, AI provider chain with breakers and an honest local fallback, four-trigger idempotent tick, fail-closed webhooks) is genuinely above par.

What blocks an unqualified READY, in order:

| # | Blocking gap | Severity | Live evidence |
|---|---|---|---|
| 1 | **Runtime failure blindness** — no external error tracking; server 5xx alerts exist only as rows in the authenticated OWNER console; synthetic probes cover only 4 surfaces | **P0** | 4 unresolved `OperationalAlert` rows found in production DB (2× `HTTP_500` from Nov 13–14, unresolved ≥3 days) — invisible to every alerting channel |
| 2 | **Real-user transactional email is dead** — Resend `onboarding@resend.dev` delivers only to the owner; domain unverified | **P1 (launch blocker)** | 118 dead-lettered mails in `MailOutbox` (incl. `verify-email`, `reset-password`, `welcome`), 32 queued, only 4 ever sent |
| 3 | **Ungated production deploys** — Vercel git integration deploys every `main` push immediately; CI runs in parallel, not before; `main` has **no branch protection and no rulesets** | **P1** | `GET /branches/main/protection` → 404 "Branch not protected"; rulesets `[]`; red-CI commits can be live (documented: `0ddf853`) |
| 4 | **No scheduled, off-site, retained backups** — restore capability is proven by exercise but stale; last production-sourced dump 2026-10-18 (before the r352 repair, region flip, storage flip, and 5+ migrations) | **P1** | `scripts/db-backup.mjs:23-26` "does not schedule anything"; all 6 drill entries record off-site copy = NO |
| 5 | **The documented rollback path is expiring/rotted** — Render standby suspended (503 live), its blueprint contradicts itself, the 14-day window lapses ~2026-11-28, and the "migrations are additive" premise is falsified by two `DROP TABLE` migrations | **P1** | `madarek.onrender.com` → 503 "Service Suspended"; `render.yaml:6-8` vs `:176-186` contradictory; r349/r352-K1 migrations |
| 6 | **No durable error forensics** — no request IDs, ephemeral function logs, `vercel logs` CLI dead on this token/plan | **P1** | `r352-k1-diagnostics.yml:71-88`; grep for `requestId` → zero matches |
| 7 | **Monitoring cadence is best-effort, not guaranteed** — GitHub cron starvation | **P1/P2** | tick.yml `*/5` → ~4 runs/day; tick-watch `*/30` → 4 runs in 26h; soak `*/15` → 1 run in 12h; the Nov 17 02:40/02:41 iOS-rebuild and release-freshness windows were missed entirely |
| 8 | **Security headers missing on the canonical SPA document** — `vercel.json` has no `headers` block; the helmet CSP/HSTS suite applies only to `/api/*` | **P1** | Live `HEAD /` on `madarek-app.vercel.app`: no CSP, no `X-Content-Type-Options`, no `X-Frame-Options`, no `Referrer-Policy` (only Vercel-default HSTS) |

RPO/RTO: only **declared** targets exist — public preview RPO ≤ 7 days / RTO ≤ 24 h; institutional pilot RPO ≤ 24 h / RTO ≤ 4 h (`docs/12-deployment.md:357-381`, explicitly labeled "declared targets, not measured"). **No measured or configured RPO/RTO exists**; with zero off-site dumps, the practical recovery point is bounded only by Neon's platform backups. This report does not invent numbers.

---

## 2 · Deployment topology and verified canonical origin (Special Check #1)

### 2.1 The three-origin topology (verified)

| Role | Origin | Live state at audit | Evidence |
|---|---|---|---|
| **Canonical production** | `https://madarek-app.vercel.app` | **LIVE** — `/api/v1/health` 200 `{ok:true, buildId:"8f38b1548ec6", dbLatencyMs:106}` | Decided in R357 commit `514cd7a9` (2026-11-16); encoded in `backend/src/env.ts:268` CORS default, `frontend/index.html` canonical/OG, `sitemap.xml`/`robots.txt`, all 19 workflow URL references, mobile baked defaults (`eas.json`, `app.config.ts:178`), gh-pages config mirror |
| **Failover (same Vercel project)** | `https://madarek-nine.vercel.app` | **LIVE** — health 200, identical `buildId 8f38b1548ec6` | `docs/HOSTING.md:13`; second entry in `apiOrigins` (`frontend/public/config/app.json`, verified live on `ahmadmedo1012.github.io/madarek/config/app.json`) and `FALLBACK_ORIGINS` (`apps/mobile/src/lib/remote-config.ts:57-60`) |
| **Standby / rollback (suspended)** | `https://madarek.onrender.com` (Render, virginia, free) | **SUSPENDED** — HTTP 503 "This service has been suspended by its owner." | X4 cutover `29187787` (2026-11-14); suspension 2026-11-14 13:15:37 UTC recorded in `docs/redesign/r351/RESUME.md:34`; "14-day standby" → window lapses **~2026-11-28** |

### 2.2 The Render-URL question: stale metadata, not a runtime inconsistency — but it is user-facing

The GitHub repository metadata `homepage` advertises `https://madarek.onrender.com`. This is **stale metadata**: a full-repo census (subagent A, 107 `onrender` occurrences across 63 files) found **zero references in executable code** — runtime code (`backend/src`, `frontend/src`, `apps/mobile/src`) contains none; all remaining references are docs, historical evidence, dev scripts, or intentional test fixtures. The runtime topology is consistently post-R357 (canonical + failover on Vercel fra1, co-located with Neon eu-central-1).

However, it is not merely cosmetic: **the advertised URL returns a 503 "Service Suspended" page** (verified live). Anyone clicking the repo's homepage link — a prospective user, student, or evaluator — lands on a dead page. Additionally, ~12 living documents still name the wrong production origin (see finding R363-31).

**Fix (one click + docs sweep):** set the repo `homepage` to `https://madarek-app.vercel.app`; re-canonicalize the doc list in §R363-31.

### 2.3 Findings — deployment & origins

**R363-02 · P1 · No CSP/security headers on the canonical SPA document** (subagent A F1; **live-confirmed**)
- Evidence: `vercel.json` (no `headers` key — never had one, verified via `git log -p -- vercel.json`); live `HEAD /` shows no `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`; the Express helmet suite with sha256 pins (`backend/src/app.ts:153-186`) applies only to `/api/*` via the function rewrite. `scripts/smoke-deploy.mjs:205-210` would hard-FAIL its own CSP check against the canonical origin; `docs/12-deployment.md:104-107` documents the CSP contract the origin violates. (API responses DO carry the full helmet set — verified live, incl. `content-security-policy: ... sha256-jEZ9yPBzXBwMFxHwFlLFqiKKy+HtK9TOGA7FRviqIMc= ...`.)
- Impact: the document users actually visit has none of the D7 security headers maintained across 6 pin refreshes; the repo's own smoke tool contradicts its deployment.
- Verification: `curl -sI https://madarek-app.vercel.app/ | grep -iE 'content-security|x-content-type|x-frame|referrer'` → empty.
- Owner: Release engineering. Status: **VERIFIED (live)**.

**R363-21 · P2 · Monitoring/config fetch documented on the failover origin** — `docs/HOSTING.md:78,89-90` points the owner's UptimeRobot and diagnostic curls at `madarek-nine`; `apps/mobile/src/lib/remote-config.ts:43-45` fetches config from `madarek-nine` first. A canonical-alias-specific failure is invisible to the external monitor. Owner: Docs/Ops. VERIFIED.

**R363-41 · P2 · Repo homepage metadata → suspended Render URL** (above). Owner: Owner. VERIFIED (live 503).

**R363-31 · P3 (aggregate) · Living-docs origin drift** — ~12 files still name `madarek-nine` or Render as production: `docs/SECRETS-REFERENCE.md:21,99-100` (its `CORS_ORIGINS` example would *exclude* the canonical origin if copied), `BACKEND.md:41,284`, `docs/RELEASE.md:7`, `docs/PROJECT-REFERENCE.md:10`, `docs/launch-readiness.md:8,39`, `README.md:167-172,203`, `README.en.md:36,109`, `LICENSE:6`, `docs/MAIL.md:83,89`, `docs/PILOT.md:52`, `docs/06-configuration.md:24`, `docs/10-security.md:50`. Owner: Docs. VERIFIED.

**R363-10 · P1 · The Render standby blueprint has rotted inside its own window** (subagent A F3, B F3; live-confirmed suspended)
- Evidence: `render.yaml` untouched since pre-cutover `962f7f19`: (a) `:6-8` claims virginia is "co-located with the Neon primary" while `:176-186` of the same file says Neon is eu-central-1; (b) `RATE_LIMIT_STORE: value: memory` still pinned with the comment "Remove this line at the cutover" (the cutover happened 2026-11-14); (c) no `STORAGE_DRIVER` value → local ephemeral driver, while production data lives in Vercel Blob — a resumed standby would 404 every uploaded file; (d) `MADAREK_TEST_ACCOUNTS: '1'` still ON with "Turn OFF for launch" note.
- Impact: the documented rollback (`docs/HOSTING.md` §6) is currently decorative — exercising it after ~2026-11-28 (or even now) yields a standby with broken file storage, in-memory rate limiting, and auto-healed public test credentials.
- Verification: `git show HEAD:render.yaml | sed -n '1,10p;176,198p'`; `curl -s https://madarek.onrender.com/api/v1/health` → 503.
- Owner: Release engineering + Owner. Status: **VERIFIED (live)**.

Positive verifications (no defect): CORS fail-closed with credentials, no wildcards (`app.ts:187-199`, `env.ts:30-35`); SPA fallback parity both hosts; canonical/OG/sitemap/robots all consistent on `madarek-app` (15 sitemap URLs); email CTA links built from `APP_ORIGIN`; mobile baked defaults canonical-first with a failover walk; gh-pages config mirror in sync (verified live); no third PaaS. The X3 remote-config + `apiOrigins` failover design is genuinely good engineering.

---

## 3 · Commit-to-production provenance (Special Check #2)

The full chain, **every hop verified live at 2026-11-17 ~06:18 UTC**:

```
git: main HEAD ..................... 8f38b1548ec66115270db7709f68d9564094f18e  (2026-11-16 18:06 UTC)
  └─ Vercel build (git integration): dpl_78CUQPRv  state=READY  target=production  ref=main  commit=8f38b154…
       buildCommand (vercel.json:3):
         bake-build-sha.mjs → backend/src/lib/build-sha.generated.ts
                             + api/build-sha.json (+GIT_SHA at cold boot, api/main.mjs:48-57)
                             + frontend/public/build-sha.txt
         npm run build -w backend / -w frontend
         npm run db:diagnostics (no-op unless MADAREK_DB_DIAGNOSTICS=1)
         npm run db:deploy  → prisma migrate deploy → Neon (48 migrations; ledger verified 48/48 == repo)
         npm run storage:blob (BinaryObject→Blob; 0 rows → no-op)
  └─ Deployed origin ............... https://madarek-app.vercel.app  (alias: madarek-nine.vercel.app — same deployment)
  └─ Health verification ........... GET /api/v1/health → 200 {ok:true, buildId:"8f38b1548ec6"}  ✓ == main HEAD
       GET /build-sha.txt (CDN) → 8f38b1548ec6  ✓
       GET /api/v1/status → buildId 8f38b1548ec6, storageDriver vercel-blob, mailProvider resend,
                            AI chain {gemini, groq, openrouter}, allProvidersDownSince null  ✓
  └─ Release artifacts ............. android-latest build-info.json: commit 8f38b154… (run #43925273052 #117,
                                     release-signed, verify+smoke pass, versionCode 117)  ✓ == main HEAD
                                     sidestore-latest build-info.json: commit 514cd7a9 (2026-11-16 15:52, unsigned,
                                     verified) — path-fresh (later main commits are docs/QA-only)
  └─ Post-deploy gates ............. deploy-vercel.yml: await-CI-green-on-sha → poll buildId == sha →
                                     browser live-smoke (LCP/CLS/axe-lite/health)
                                     deploy-smoke.yml: health ×10 + login ×3 test seats + OpenAPI additive + vitals
                                     soak.yml: 4 probes every */15 (best-effort — see R363-11)
```

**Provenance verdict: VERIFIED.** An operator can map the running production service to an exact commit through three independent surfaces (health `buildId`, `/status`, CDN `/build-sha.txt`), the Vercel API confirms the production deployment `READY` from that exact SHA, and the Android artifact carries the same SHA with an independently re-verified APK (`build-info.json` `verified: true`, `verify_run_url` recorded). The build-identity design encodes its own incident history (r184 rot, R353 stale-env shadowing — `backend/src/lib/build-id.ts:60-83`).

**R363-03 · P1 · The chain is not gated: deploys happen before CI concludes, and `main` is unprotected** (subagent B F1; live-confirmed)
- Evidence: `deploy-vercel.yml:1-25` header documents the reality — "the Vercel GitHub integration deploys every push to main AUTOMATICALLY … including shas where this workflow failed"; the workflow only *verifies* post-hoc (`permissions: contents: read` — it cannot deploy or roll back) and opens no issue on failure. Live: `GET /repos/…/branches/main/protection` → **404 "Branch not protected"**; rulesets → `[]`. The only guard is social (`CONTRIBUTING.md:20-22`).
- Impact: a red-CI (or unreviewed) push to `main` is live in production within minutes, with migrations already applied by the build, before any gate can stop it; recovery = push a fix (fast, given auto-deploy) — but nothing automates detection→reversion.
- Verification: `gh api repos/ahmadmedo1012/madarek/branches/main/protection` → 404; `sed -n 1,25p .github/workflows/deploy-vercel.yml`.
- Owner: Owner + Release engineering. Status: **VERIFIED (live)**.

**R363-25 · P2 · The `android-latest` git tag is frozen at 7084c845 (2026-11-10)** while the release assets track HEAD (`build-info.json.commit == 8f38b154`, verified live). `scripts/ci/publish-rolling-release.sh:57-72` never moves the tag. Freshness watchers correctly read `build-info.json` instead, so enforcement is unaffected — but anyone resolving the tag gets 6-day-old source. Owner: Release engineering. VERIFIED (live).

---

## 4 · CI/CD and release verification

### 4.1 Workflow estate (26 workflows — the brief's "27/e2-nightly" is actually `e4-nightly.yml`)

Full census in subagent B's register; summary by class:
- **Gates**: `ci.yml` (12 jobs: typecheck, unit ×2, hermetic e2e + iOS-WebKit, db-integration on disposable PG, design/conformance/surface-drift gates), `size-gate.yml`, `deadcode.yml` (the only workflow with no `permissions:` block — R363-39, P3).
- **Deploy verification** (not deployment): `deploy-vercel.yml` (await-CI → buildId wait → browser smoke), `deploy-smoke.yml` (test-seat logins, OpenAPI additive check, opens issue on failure).
- **Release channels**: `build-android.yml` (every main push + nightly 02:25; build → hermetic smoke **non-gating** → independent verify **hard gate** → publish rolling prerelease `android-latest`), `build-ios-sidestore.yml` (unsigned IPA, `sidestore-latest`), `mobile.yml` (Expo OTA `eas update --auto`; EAS builds manual-only).
- **Watches**: `soak.yml` (*/15), `tick.yml` (*/5, dormant unless `TICK_TARGET_URL`), `tick-watch.yml` (*/30 + self-heal), `release-freshness.yml` (02:41), `r352-r3-freshness.yml` (04:10, ancestry-based), `e4-nightly.yml`, `flake-detector.yml` (03:17), `prod-accounts-e2e.yml` (03:43), `vercel-usage-watch.yml` (Mondays, commits to main → itself triggers a deploy, R363-38 P3).
- **Owner-only dispatch tools**: `r352-db-diagnostics.yml`, `r352-k1-diagnostics.yml`, `r352-k5-blob-flip.yml` (storage flip/rollback), `ui-screens.yml`, `ai-selftest.yml`, `ai-eval-live.yml` (manual-only — no scheduled paid-API spend, verified).

Permissions hygiene is good: `contents: write` confined to 4 justified workflows; `actions: write` to the 2 dispatch-only maintenance tools; `issues: write` for rolling-issue alerting.

### 4.2 Android distribution vs product intent (Special Check #4)

**VERIFIED: the public Android download is the latest GitHub Actions build, not an EAS artifact.**
- `frontend/src/pages/AppDownloadPage.tsx:43-48` links `releases/download/android-latest/Madarek.apk`; the page comment states "never an EAS artifact" — and the code proves it: `build-android.yml` builds with Gradle on `ubuntu-24.04` (EAS appears only in `mobile.yml`'s manual dispatch lane).
- Live at audit: `build-info.json` → `commit 8f38b154…` == main HEAD, `run_number 117`, `signing_mode "release"`, `certificate_sha256 746196e6…`, `verified: true`, `smoke: "pass"`, APK 59,066,124 bytes, arm64-v8a + armeabi-v7a, `version_code 117`, minSdk 24 / targetSdk 36.
- Freshness is enforced three layers deep: every-push rebuild (unfiltered), nightly 02:25 net, and two daily assertion workflows with path-aware tolerance (`release-freshness.yml` treats an empty release as an outage and fails loud — born from the real 2026-11-15 empty-release incident; the publish script itself has a CI regression test).
- Residual caveats: the frozen git tag (R363-25) and the non-gating emulator smoke (**R363-24 · P2** — a build that passes static verification but boots-crashes could publish with a ⚠️ badge; acceptable during development, revisit before public launch; Owner decision).

### 4.3 iOS availability messaging (Special Check #4)

**VERIFIED honest.** `/app` shows a non-clickable «قريبًا» ("coming soon") for iPhone — "no TestFlight, no SideStore, no unsigned IPA, no developer downloads" (`AppDownloadPage.tsx:19-33,215-220`); `docs/RELEASE.md:160-164` matches; the engineering `sidestore-latest` channel is internal-only. One cosmetic inconsistency: `AppDownloadPage.tsx:317` states "iOS 15+" among requirements though iOS is unavailable (P3).

### 4.4 Rollback (Special Check #3)

**R363-09 · P1 · "Migrations are additive — code rollback never needs a DB rollback" (`docs/PILOT.md:90-92`, `docs/12-deployment.md:377`) is falsified by the migration history.**
- Evidence: `20261111080000_r349_u_neutral_tenant/migration.sql:19-20` (`DROP TABLE IF EXISTS "UniversityFact"/"SyncRun"`) and `20261114154500_r352_k1_repair_baseline/migration.sql:141-147` (`DROP TABLE "SyncRun"`, `DROP TABLE "UniversityFact"` — pre-drop dumps preserved in the `evidence-r352` GitHub release, verified live: 4 assets incl. `repair-baseline.sql`).
- Impact: rolling the app back across those SHAs puts old code against a schema missing tables it references (the exact class of drift that produced the X4 incident — `api/main.mjs:59-65` documents "production pointed at a database NOBODY could name"). Prisma's per-migration transactions bound mid-run corruption, but partial-apply windows exist (migrations run before later build steps).
- Verification: `rg -n 'DROP TABLE' backend/prisma/migrations/`; `gh release view evidence-r352`.
- Owner: DB owner. Status: **VERIFIED**.

**R363-10 (rollback path)** — see §2.3. There is **no automated rollback** anywhere (verified by repo-wide search); Vercel's native instant rollback (promote previous READY deployment) is **not mentioned in any runbook** — the cheapest safe web-rollback is entirely undocumented. A draft runbook is provided in §11.1.

**R363-16 · P2 · Preview builds run `db:deploy` — against a separate database (verified live), but with no guard in the script.** The preview-scoped `DATABASE_URL` env entry exists (name-verified via Vercel API) and a live agent-branch preview build log shows migrations applied to database **`spike_r351`** on the same Neon endpoint (`ep-icy-mode…`), with `storage-to-blob` correctly skipping previews — so the feared "unreviewed PR migrates production" scenario is **designed-safe today**. However `backend/scripts/migrate-deploy.mjs` has no `VERCEL_ENV` guard (its sibling `storage-to-blob.mjs:28-33` has one) and no production-DB-name refusal — safety currently rests on one dashboard env value. Recommendation: skip `db:deploy` on previews or refuse if the URL's database name matches production. Owner: Release engineering. Status: **VERIFIED (live build log)**.

**R363-12 · P2 · Dual-host migration ownership** — both `vercel.json` and (if resumed) Render's root `npm run build` (`package.json:15` → `db:deploy` + `db:seed`) run `migrate deploy` against the same Neon primary with no advisory lock; the r352 K1-regression (a silent mid-migrate exit-1) was never conclusively attributed and a cross-host race was never excluded. Today Vercel is sole owner (Render suspended — live-verified). The rollback runbook (§11.1) must suspend the Vercel git integration before resuming Render. Owner: Platform. VERIFIED (mechanism).

**R363-11 · P1/P2 · GitHub cron starvation undermines the nightly/standing safety nets** (live-verified run history):
- `tick.yml` at `*/5`: 4 runs in the last ~26h (~4/day — matches the workflow header's own measured admission).
- `tick-watch.yml` at `*/30`: 4 runs in 26h.
- `soak.yml` at `*/15`: 1 scheduled run in the ~12h before audit (plus 2 dispatch runs on Nov 16).
- The **Nov 17 02:40 iOS rebuild and 02:41 release-freshness + e4-nightly windows were missed entirely** (last release-freshness run: Nov 16 10:10; last iOS run: Nov 16 15:32 push). Consequence: freshness assertions can silently skip a day; `sidestore-latest` currently sits at `514cd7a9` (path-fresh, since later commits are docs/QA-only — but only by luck of what was pushed).
- Impact: the monitoring/freshness cadence documented in the workflows is best-effort; the *hard* correctness guarantees do not depend on it (builds ride every push; opportunistic tick rides traffic — the live tick ledger shows fast and daily slots current, weekly last claimed Nov 14 within its 6-day window), but detection latency is hours-to-a-day, not minutes.
- Verification: `gh run list --workflow tick.yml --limit 10` (etc.).
- Owner: Ops. Status: **VERIFIED (live)**.

CI state on the audit baseline: `e98d6a0b` — CI / deadcode / Size gate all **success** (verified via API). Zero open PRs at audit time (the R362 agent branches were pushing directly to their own branches; two of four active branches had red CI mid-flight — expected mid-integration, not a baseline defect).

---

## 5 · Database migration, backup and recovery assessment

### 5.1 Migration state (live-verified)

- 48 migrations, 2026-05-23 → 2026-11-16 (`20260523171735_init` → `20261116143000_r357_l5_institution_ai_quota`).
- **Production `_prisma_migrations` ledger is byte-for-byte identical to the repo's 48 folders** (SELECT-only diff, audit-time): no drift, no missing, no extra — including no trace of the deleted junk migration `20261029125221` (a dev-only accident, corrected by idempotent `20261030120000_r324_restore_trgm_index`).
- Known cosmetic defect (live-confirmed): the duplicate `20260523171735_init` row — ledger reads 49 rows / 48 distinct names, exactly as documented in `docs/redesign/r352/RESUME.md:184-190`. Harmless to `migrate deploy` (proven by green deploys). **R363-37 · P3.**
- Deployment sequence: `bake-build-sha → builds → db:diagnostics (no-op) → db:deploy → storage:blob` (vercel.json:3). `migrate-deploy.mjs` (393 lines) does URL-candidate selection (DIRECT → derived-direct → pooler+`pgbouncer=true&connection_limit=1`), DNS/TCP/SELECT-1 wake loop for Neon autosuspend (8×5s), permanent/transient error classification, 3 attempts. Failure → build fails → deployment not promoted → old version stays live (but any already-applied migrations persist — bounded by per-migration transactions).
- `storage:blob` at every build: idempotent, fail-closed, one-row-at-a-time, never deletes; production `BinaryObject` = **0 rows** (live-verified) → currently a no-op listing.

### 5.2 Backup and restore evidence (Special Check: "a declared backup script is not proof of a successful restore")

The audit found the opposite of a mere script: **six recorded restore exercises with measured values** (`docs/runbooks/restore-exercise-log.md`), including **two against the real production database**:
- r183 (2026-10-17): production dump 315 KB (sha256 recorded) → isolated DB `madarek_restore_drill` → 80 tables / 21 migrations / 1353 rows matched 1:1, 124 FK constraints, 0 orphans → **production-mode boot + smoke 5/5**.
- r187 (2026-10-18): production dump 319 KB → local PG18 → `db:verify` PASS.
- Plus 4 more (local/seed sources, the last on 2026-10-31), and a **live PITR drill on Neon** (R357): a row deleted at 16:45:21Z was restored exactly as of 16:44:30Z via a `parent_timestamp` branch — minute-precision PITR proven on the `demo-dataset` branch.

**But the proof is stale and the habit does not exist (R363-05 · P1):**
- No backup is scheduled anywhere (no workflow, no cron, no scheduler reference — grep-verified). `scripts/db-backup.mjs:23-26` states it outright: "does not schedule anything and does not upload the dump anywhere: off-site storage is the owner's documented responsibility."
- **No dump has ever been moved off-site** — all six exercise entries record off-site = «لا» (NO); `backups/` is gitignored; the repo's own words: "a dump on the same box as the DB is not a backup."
- The last production-sourced dump predates the r352 production repair, the region flip (iad1→fra1), the storage flip (postgres→vercel-blob), and 5+ migrations (**R363-14 · P2** — restore chain unproven at HEAD).
- PITR is proven only on a demo branch, never on the production main branch, and the actual Neon plan's retention window is owner-side (the repo honestly refuses to assert a number — `docs/12-deployment.md:157-165`).
- Pre-drop dumps for the destructive r352-K1 migration exist in the `evidence-r352` GitHub release (verified live) — but the migration file's own citation points at a phantom path (`docs/redesign/r352/backups/` does not exist in-tree; R363-15 detail).

**Verdict: restore capability is real and was repeatedly exercised — stronger than most projects — but there is no operationally current backup of production at HEAD.** Recovery today rests on Neon platform backups/PITR plus scripts whose last exercise is 4+ weeks stale.

### 5.3 Connection pool health

- Runtime: single `PrismaClient` per process, no pool tuning (`backend/src/db.ts:12-14`), consuming the Neon **pooled** URL; migrations use direct/derived-direct or pooler+`pgbouncer=true&connection_limit=1` (correct split).
- **R363-13 · P2 · Pooler/prepared-statement compatibility never verified** — the documented production URL carries `sslmode=require&channel_binding=require` but **no `pgbouncer=true`**; Neon pooled endpoints are PgBouncer transaction-mode, and Prisma without the flag can throw intermittent `P2027` ("prepared statement does not exist") under concurrent transactions. `docs/redesign/r352/RESUME.md:399-403` still lists pooler verification as OPEN; unexplained LoginEvent failures (77/14d) were dismissed as "probe-era noise." (Audit's own SELECT-only session through the pooler: connect 1.5s cold, ~185ms/query from the sandbox — healthy; production `/health` showed `dbLatencyMs 5` warm from fra1.) NOT VERIFIABLE without reading the live env value — flagged for the owner. Owner: Backend platform.
- Neon autosuspend is handled by design (wake loops in migrate script; health DB-ping with 5s race; tick-watch keeps slots warm; residual cold-start p95 ~2.2s documented).
- `db:diagnostics` reports ledger/extensions/table sizes but has no pool-utilization section; production has **no `pg_stat_statements`** (Neon free tier).

### 5.4 Data safety in deploys

**R363-22 · P2 · Known-password test accounts** — 10 documented `@test.ly` accounts with a publicly documented shared password (see `shared/testAccounts.ts`, `docs/SECRETS-REFERENCE.md:56-92`) exist live in production (13 `@test.ly` rows counted at audit); on Render they are re-armed/healed on every boot (`server.ts:45-53`, `render.yaml:197-198`); on Vercel there is no boot ensure (serverless entry is pure) — but `MADAREK_TEST_ACCOUNTS` **is present in the production env** (name-verified) and the smoke/soak monitors depend on these seats (**R363-30 · P2** — turning them off at launch, as documented, breaks the monitors). The same credentials are also committed in plaintext inside the monitoring workflows (`soak.yml:43`, `deploy-smoke.yml:79-89`) — known and deliberate, but a launch-hardening item. Owner: Owner/Ops. VERIFIED (live count).

**R363-15 · P2 · The shared-account root cause is still live** — the largest incident (r352: a foreign `0001_ulara_baseline` migration row from a second app sharing the Neon account) is structurally unfixed: the Vercel account hosts a second project `ulara` (API-verified), preview DB `spike_r351` shares the production Neon endpoint, and production's mail outbox contains **86 dead letters addressed to `demo.ulara.ly`** — cross-app traffic in Madarek's production systems. Until the accounts/projects are separated (or ulara retired), the same class of contamination can recur. Owner: Owner. VERIFIED (live).

Declared RPO/RTO (recorded as written, not invented): public preview RPO ≤ 7d / RTO ≤ 24h; institutional pilot RPO ≤ 24h / RTO ≤ 4h — explicitly "declared targets, not measured" (`docs/12-deployment.md:357-381`). Live-restore over production is permitted only as a conscious rescue with `--confirm-live-restore` (`scripts/db-restore.mjs` guard; the guard compares values — its "entry 2 lesson" is documented).

---

## 6 · Monitoring, alerts and background jobs

### 6.1 Signal inventory (what exists — verified)

- **Health/status surfaces**: `/api/v1/health` (DB ping, buildId — public), `/api/v1/status` (tick ledger, storageDriver, mailProvider, AI chain state, buildId, serverTime — public, best-effort), `/owner/system|realtime|alerts|ai-metrics|login-analytics` (OWNER-authenticated in-app console), `/admin/mail/*` (dead letters, retries), `ClientError` inbox (mobile crashes).
- **Synthetic monitoring**: `soak.yml` — 4 probes (health, real login, role-scoped search, `/ai/config`) every */15 (best-effort, starved — R363-11), rolling issue + auto-close; `tick-watch.yml` — */30 with **self-healing forced tick** before alerting ("a stale-but-healable platform never pages anyone"); `deploy-vercel`/`deploy-smoke` post-deploy gates; `prod-accounts-e2e.yml` nightly live journey with throwaway accounts + cleanup; `e4-nightly` + `flake-detector` hermetic regressions; `vercel-usage-watch.yml` weekly (deploy count vs 100/day, buildId freshness pair).
- **Background jobs**: the tick platform — fast slot (55s claim: mail-outbox drain + AI provider-health guard), daily slot (20h: LoginEvent retention, assignment-due reminders, RateLimitHit prune, ImportUpload prune), weekly slot (6d: digest). Claim mechanism is a **pooler-safe row CAS on `TickRun`** (not advisory locks — correct for Neon PgBouncer; `tick.ts:73-91`). Four independent triggers (Vercel cron 03:00, GitHub */5, opportunistic traffic-riding ≤1/60s/instance with `waitUntil`, tick-watch forced) — **idempotency verified at each layer** (mail `dedupeKey` unique, digest `digest:<user>:<ISOweek>`, reminder `due:<a>:<s>:<day>`, cutoff-based prunes). Live at audit: fast + daily slots current (daily fired during the audit window), weekly within window.
- **Alerting**: everything lands as GitHub issues (rolling, auto-closing — a good pattern) or red Actions runs; in-app `OperationalAlert` rows (throttled 5min/code) for server 5xx; `AI_ALL_PROVIDERS_DOWN` in-app + issue path; pino JSON logs with a serious redaction list; boot-identity log per cold start (born from the r352 "nobody could name the production DB" incident).

### 6.2 The gaps

**R363-01 · P0 · Runtime failures outside the probe set are invisible** (subagent D D-6; live-confirmed)
- Evidence: no Sentry/Bugsnag/OTel/`/metrics` anywhere (grep-verified); `OperationalAlert` rows' only consumer is the authenticated OWNER console (`owner.routes.ts:821-990`); `raiseOperationalAlert` has no egress (`operational-alerts.ts:55-82`); the soak covers exactly 4 surfaces; CI e2e is hermetic (mocked API). **Live: 4 unresolved alerts — 2× `HTTP_500` (Nov 13/14), `SYNC_STALE_RUNS_REAPED`, `APP_INTERNAL` — sitting unseen in the production DB for 3+ days.** A data-dependent 500 on grading/submissions/files can run for days with zero operator signal.
- Verification: `rg -in "sentry|bugsnag|opentelemetry" backend/src api .github` → no true matches; `SELECT code,created_at FROM "OperationalAlert" WHERE "resolvedAt" IS NULL` (read-only).
- Owner: Backend + Ops. Status: **VERIFIED (live)**.

**R363-06 · P1 · No durable forensics** — no request-ID/correlation middleware (grep → zero); function logs ephemeral; `vercel logs` CLI fails on this token/plan (documented in `r352-k1-diagnostics.yml:71-88`); no log-drain; `OperationalAlert` stores a message, not a stack. "Debug yesterday's error" is currently impossible for backend web 5xx. Owner: Backend. VERIFIED.

**R363-07 · P1 · Single-channel alert delivery with no redundancy** — every alert rides GitHub issues/failed-run emails, whose delivery depends on account-level notification settings that the repo cannot verify; solo maintainer, no on-call, no second channel (the only out-of-band element is the owner's *optional* UptimeRobot step, which the docs point at the wrong origin — R363-21). One muted setting silently disables the entire alerting surface. Owner: Owner + Ops. PARTIAL (repo-side verified; account settings not verifiable).

**R363-17 · P2 · `/health` checks connectivity, not schema** — a repeat of the r352 class (stale schema passing health) is only caught for tick-dependent tables; mitigations (migrations in every build, tick-watch) cover part of the surface. Owner: Backend. VERIFIED.

**R363-18 · P2 · Daily tick slot vs the 60s function ceiling** — the daily sweep (retention batches + per-enrollment reminder N+1) can exceed `maxDuration: 60` and its pre-stamped claim then blocks the slot up to 20h (`tick.ts:22-25` documents the trade); tick-watch watches the fast slot only. Idempotent, self-healing next window — a latency gap, not correctness. Owner: Backend. VERIFIED (code-path).

**R363-20 · P2 · No saturation metrics** — Neon 0.5 GB / 190 compute-hours, Vercel Active-CPU (the most burnable Hobby quota), invocations, transfer, and Blob usage are all invisible to automation (`vercel-usage-watch.mjs:10-16` — the token/plan cannot read them); `dbLatencyMs` is exposed but never trended; no `/metrics`. Blob is the **only usage-billing line** and has no automated signal. Owner: Ops. VERIFIED.

Minor: mail dead-letters raise no alert outside the ADMIN mail page (**R363-29 · P2** — 118 sitting dead right now, invisible unless an admin looks); `prod-accounts-e2e` alert step can swallow failures (`|| true`, non-rolling issue — D-5, P3); `deploy-smoke.yml`/`remote-config.ts` header comments contradict their own targets (P3); bell-notification dedupe is check-then-create (race under dual-host scheduling — P3, dormant while Render stays suspended).

---

## 7 · Email, AI, storage and push dependency resilience

**Mail** — a real DB-backed outbox: CAS claims, unique `dedupeKey`, exponential backoff 1m→5m→30m→2h→6h → dead-letter, per-recipient (12/day) and per-institution (500/day) caps, svix-verified Resend webhook (fail-closed 503 without the secret) feeding a real suppression list, admin retry/cancel endpoints. The provider-less mode degrades honestly (queue + log; registrar's manual link as documented fallback). Two findings dominate:
- **R363-04 · P1 (launch blocker) · Real-user delivery is impossible today** — `MAIL_PROVIDER=resend` (live `/status` confirms) with `onboarding@resend.dev`, which Resend only delivers **to the account's own address**; every send to anyone else 403s → retries ~8.6h → dead letter. Live: **118 failed / 32 queued / 4 sent** — `verify-email`, `reset-password`, `welcome`, digests all dead-lettering to real (demo) recipients. Self-service password recovery is effectively broken for all non-owner users until the owner verifies a custom domain (`docs/MAIL.md:42-60` documents the 30-minute fix; the code side is done). No alert fires on any of this (R363-29).
- **R363-08 · P1 · Reset-link origin trusts the client `Origin` header** (`auth.routes.ts:420-424`) before `APP_ORIGIN`, with a `localhost:5173` fallback — a token-capture phishing amplifier (a genuine platform email whose CTA embeds a valid one-time token on an attacker-chosen domain). Owner: Backend. VERIFIED (code).
- **R363-42 · P2 · `RESEND_WEBHOOK_SECRET` is absent from the Vercel project env** (name-verified via API) → the webhook route fail-closes; bounce/complaint events are currently unprocessed and the suppression list never populates. Owner: Owner. VERIFIED (env names).

**AI** — genuinely resilient design: chain gemini → groq → openrouter → legacy → local composer; per-vendor timeouts (25s/15s/20s), 50s turn budget with pre-emption (Hobby's 60s ceiling), 3-strike breakers honoring `Retry-After`, per-user (25/day) and per-institution (1000/day) UTC-rolling quotas with CAS resets, honest «الوضع المحلي» degraded badge, cross-instance all-providers-down detection → `OperationalAlert` + GitHub issue. Live: chain mode, 3 providers, `allProvidersDownSince: null`. CI live-eval workflows are dispatch-only (no scheduled spend — verified). Minor: quota store fails open on DB outage (documented trade-off, bounded by the 20/60s route limiter); `AiBudget.estimatedCostMicros` stays an honest zero; `AI_INST_DAILY_LIMIT_DEFAULT` is read from raw `process.env` outside the zod schema (P3 hygiene).

**Storage** — production runs `STORAGE_DRIVER=vercel-blob` (live `/status` + `r352-k5-blob-flip.yml` status-correction header); four drivers with fail-closed boot configs; upload endpoints guarded (20 MB PDF cap, `%PDF-` magic, per-user 200 MB quota, presigned video with declared ceilings); `BinaryObject` = 0 rows (live) so the build-time migration is a no-op; the flip's rollback is complete-by-construction (rows never deleted). Gaps: **Blob SDK calls carry no app-level timeouts** (R363-28, P2 — same for awaited Expo push fan-out in request handlers, R363-27, P2); the **STT transcription job has an unbounded fetch inside a non-`waitUntil` fire-and-forget** (R363-26 · P2 — a hung provider leaves a lecture `RUNNING` forever and may be frozen mid-flight on serverless); the blob driver has no reachability probe on `/owner/system`.

**Push** — implemented and **proven end-to-end on production hardware** (push-firebase-proof.yml: emulator registers on prod → real platform announcement → `dumpsys` arrival proof; FCM v1 via service account, `google-services.json` from secret). Preference/quiet-hours aware with fail-closed mute reads; receipts checked; dead tokens pruned; best-effort contract means push can never 500 a committed academic write; unconfigured fallback is an honest retryable `registered:false` + in-app inbox. Live: 10 `PushDevice` rows. iOS push absent (documented — needs the Apple account).

**Rate limits & cost** — global 1000/15min/IP (NAT-campus rationale), failed-only login/register 10/15min, forgot-password 3/15min/email, AI 20/60s/user; **Postgres store is the code default on Vercel** (correct for Fluid concurrency; memory pinned only on the suspended Render standby), atomic upsert, fail-open on DB outage (documented); live `RateLimitHit` 245 rows/25h shows the DB store working. Documented ceilings are honest (`docs/HOSTING.md:44-58`): everything free/hard-stop except **Vercel Blob (1 GB → usage-based billing)**, which automation cannot see. Current spend: $0.

---

## 8 · Security and secret-handling observations

*(Variable names and configuration expectations only — no values anywhere in this report.)*

1. **No secrets committed** (subagent E, pattern-scanned: only obvious test placeholders; only `.env.example` files tracked). VERIFIED.
2. **Secret names referenced by workflows**: `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_ORG_ID`, `CRON_SECRET`, `EXPO_TOKEN`, `GOOGLE_SERVICES_JSON`, `ANDROID_KEYSTORE_BASE64`/`_PASSWORD`/`KEY_ALIAS`/`_KEY_PASSWORD`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `PROD_DATABASE_URL`, plus repo variable `TICK_TARGET_URL`. All have honest-absence paths except push-firebase-proof (hard-fails without its secret, by design).
3. **Vercel project env (names, live-verified)**: production-scoped `DATABASE_URL`, `APP_ORIGIN`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `MAIL_PROVIDER`/`MAIL_API_KEY`/`MAIL_FROM`, `STORAGE_DRIVER`, `GEMINI_API_KEY`, `GROQ_API_KEY`, `AI_*` group, `BLOB_READ_WRITE_TOKEN` (production+preview), `MADAREK_TEST_ACCOUNTS`, `MADAREK_DB_DIAGNOSTICS`; preview-scoped `DATABASE_URL` (separate `spike_r351` DB — verified in build logs), `CRON_SECRET` (both targets). **Missing**: `RESEND_WEBHOOK_SECRET` (R363-42), `DIRECT_DATABASE_URL` (migrations use the derived-direct fallback — acceptable), `CORS_ORIGINS` (code default is correct), `OPENROUTER_API_KEY` (chain's openrouter lane rides the legacy `AI_API_KEY`/`AI_BASE_URL` — works, but non-obvious), `STT_*` (manual-upload-only mode).
4. **R363-08 (reset-link Origin trust)** — the one real code-level secret-adjacent vulnerability found (P1, §7).
5. **Test-account credentials are public by design** (documented, healed on Render boots, plaintext in two workflows) — acceptable for the pilot, must be turned off (with monitor migration) at launch (R363-22/30).
6. **Audit-channel hygiene — rotation required**: live production credentials (GitHub PAT, Vercel token, Neon API key, production DB URL+password, Resend key, Expo token) were transmitted to this auditor through the IM conversation itself. They were stored mode-600 outside the repo, never echoed into any file or log, and the DB was touched only with SELECTs — but any credential passed through a chat channel should be considered exposed and **rotated after this audit** (GitHub PAT first — it carries repo-admin scope). Recommended owner: Owner. (This finding is about the audit process, not the repository.)
7. `docs/SECRETS-REFERENCE.md` is stale vs the real surface (missing the mail/webhook/cron/blob/AI-chain groups; wrong CORS default; wrong production URL) — the true inventory lives in `render.yaml` + `env.ts` + the Vercel dashboard (R363-31). P3.

---

## 9 · Missing runbooks and operational gaps

Missing entirely (drafts provided in §11):
1. **Vercel instant-rollback runbook** — the primary web rollback is a dashboard action that no document mentions.
2. **Failed-deployment / red-CI-on-main response runbook** — the current implicit procedure ("push a fix fast") is nowhere written down, and Deploy Vercel opens no issue on failure.
3. **Destructive-migration rollback drill** — the additive-rollback premise is falsified (R363-09); no drill covers rolling back across the r349/r352-K1 DROP TABLE era.
4. **Mail-outage / dead-letter runbook** — 118 dead letters sit unactioned; no documented owner procedure for noticing and replaying them (retry endpoints exist).
5. **Alert-routing escalation** — nothing documents who is contacted, how, or with what latency target (solo maintainer: name the backup contact).

Known-rotten documents (fix, not write): HOSTING.md §4/§5 monitor origin; RENDER rollback recipe (§6) needs its preconditions (storage driver, rate-limit store, test accounts) repaired before it can be exercised; `docs/13-maintenance.md:27-29` claims "no documented backup procedure" while `docs/12-deployment.md:142-232` documents a full one — the contradiction is dangerous mid-incident.

---

## 10 · Prioritized remediation list

**P0 — before any further unsupervised operation**
1. R363-01: Add an egress path for runtime failures — minimum: `raiseOperationalAlert` also enqueues an email via the existing outbox (or a daily "open alerts ≠ 0" digest); ideal: Sentry SDK + persist 5xx stacks into `OperationalAlert.metadata`. *(Backend + Ops; days)*
2. Triage the 4 unresolved production alerts found by this audit (2× HTTP_500, SYNC_STALE_RUNS_REAPED, APP_INTERNAL). *(Owner; hours)*

**P1 — before launch / public scale (launch blockers)**
3. R363-04: Verify a custom mail domain in Resend + flip `MAIL_FROM` (30-min checklist in `docs/MAIL.md:42-60`); then replay the dead-lettered queue via `/admin/mail` retry. *(Owner; hours)*
4. R363-03: Gate production — protect `main` (required checks: CI; block force-push) and/or enable a deploy-promotion gate; at minimum make `deploy-vercel` open an issue on failure. *(Owner + Release eng; hours)*
5. R363-02: Add a `headers` block to `vercel.json` (CSP with the existing sha256 pins, HSTS, nosniff, frame, referrer; `immutable` cache for `/assets`). *(Release eng; hours — one config block)*
6. R363-05: Schedule the backup — a weekly (pilot: daily) Actions run of `db:backup` with off-site upload (private release artifact or object storage), plus a retention note; then run one restore drill at HEAD and log it. *(Owner; days)*
7. R363-09/R363-10: Decide the rollback story — either repair the Render standby blueprint (storage driver, rate-limit store, test accounts, region comment) before ~2026-11-28, or retire the Render path and document Vercel instant-rollback as first-line (§11.1); amend the falsified "migrations are additive" claim. *(Owner + Release eng; days)*
8. R363-06/R363-07: Add request IDs (or at least persist stacks) and one out-of-band alert channel (e.g., a Telegram/email bridge step on soak/tick-watch/deploy-smoke failures). *(Backend + Ops; days)*
9. R363-08: Build reset URLs from `env.APP_ORIGIN` only; drop the `Origin`-header trust and the localhost fallback. *(Backend; hours)*
10. Rotate all credentials that transited the IM channel (§8.6). *(Owner; hours)*

**P2 — soon**
11. R363-11: Treat GitHub cron as best-effort — document actual cadences; consider a second external scheduler for the freshness/soak checks (e.g., UptimeRobot cron-hit or Vercel cron hitting a dispatch). *(Ops)*
12. R363-16: Add a `VERCEL_ENV=preview` guard (or production-DB-name refusal) to `migrate-deploy.mjs`. *(Release eng)*
13. R363-13: Verify/force `pgbouncer=true` on the runtime pooler URL; grep logs for `P2027`. *(Backend platform)*
14. R363-15: Separate the ulara/madarek accounts (or retire ulara); clean `demo.ulara.ly` traffic from production. *(Owner)*
15. R363-42: Set `RESEND_WEBHOOK_SECRET`; verify the webhook endpoint. *(Owner; minutes)*
16. R363-14: Fresh restore drill at HEAD (post-r352 chain). *(Owner)*
17. R363-26/27/28: Add deadlines to STT fetch (+ terminal `FAILED` + `waitUntil`), push fan-out, and Blob calls. *(Backend)*
18. R363-18/17: tick-watch daily/weekly leg; `/health` schema probe. *(Backend)*
19. R363-19/30/22: Plan the test-account sunset together with its monitors (dedicated smoke accounts with rotated secrets). *(Ops)*
20. R363-20: Weekly manual dashboard read of Vercel CPU/Blob + Neon usage — write it into HOSTING.md as a named checklist. *(Ops)*
21. R363-23: Add the failover alias to one standing probe. *(Ops)*

**P3 — hygiene**
22. R363-41/31/32: homepage field + the 12-file docs sweep + tooling defaults. *(Docs)*
23. R363-25: move or delete the frozen `android-latest` tag. *(Release eng)*
24. R363-37: ledger duplicate row (owner-side, optional). R363-38/39/35/36/34/33 and the §4–7 minor items. *(various)*

---

## 11 · Runbook drafts

### 11.1 Deployment rollback (draft)

> **Preconditions:** confirm which failure class you have. These steps never touch the database unless step 6 says so.

**A. Web/API regression (bad code is live, DB untouched) — Vercel instant rollback, first line**
1. Confirm what is live: `curl -s https://madarek-app.vercel.app/api/v1/health` → compare `buildId` (12-char) with `git log --oneline origin/main`.
2. Vercel dashboard → Project `madarek` → Deployments → the last `READY` **production** deployment whose commit is known-good → **⋯ → Promote to Production**. (Equivalent API: `POST /v13/deployments/{uid}/promote`.) Both aliases (`madarek-app`, `madarek-nine`) serve the promoted deployment — verify: `curl -s https://madarek-nine.vercel.app/api/v1/health`.
3. Freeze the bleeding: pause the Vercel git integration (Project → Git → disable Auto-Deploy on push) **or** push an explicit `git revert` commit (preferred: keeps history and resumes normal flow without a stale window).
4. Verify recovery: health + `/api/v1/status` (buildId now the old SHA) + one soak-style probe (login as a test seat, `/me/dashboard` 200). Re-enable auto-deploy.
5. Post-incident: file the issue; the `deploy-vercel`/`deploy-smoke` history holds the failing SHA's evidence.

**B. Migration-era rollback (the failure spans a migration) — check before promoting**
1. Identify the migrations applied since the known-good commit: `git diff --stat <good>..<bad> -- backend/prisma/migrations/`.
2. If none of them is destructive (no `DROP TABLE`/`DROP COLUMN`/data rewrite — check `rg -n 'DROP TABLE|DROP COLUMN' <new migrations>`): promoting the old deployment is safe — old code tolerates the newer additive schema (this is the documented additive contract, and it holds for everything except the r349/r352-K1 era).
3. If a destructive migration is in the window: **do NOT roll the app back across it** blindly. Sequence: (a) snapshot the current DB state first (Neon console → Create branch, or `scripts/db-backup.mjs`); (b) promote the old deployment only if the old code does not reference the dropped tables (verify: `rg -n 'UniversityFact|SyncRun' backend/src@<good>`); (c) otherwise fix forward — the dropped tables' pre-drop dumps are in the `evidence-r352` release, and the r349 migration's `UPDATE … ON UPDATE CASCADE` pattern means restoring them needs the dump, not a down-migration.
4. Never run a manual down-migration against production except as a last resort, dev-tested first (`docs/12-deployment.md:134-136`).

**C. Whole-origin failure (madarek-app alias/DNS/region issue) — failover flip**
1. Clients already walk `apiOrigins` → `madarek-nine` (mobile) — verify it is healthy (`curl -s https://madarek-nine.vercel.app/api/v1/health`).
2. For the web SPA: if the canonical alias is down at the platform level, the fastest user-facing fix is promoting a fresh deployment (Vercel re-provisions the alias); the Render standby is **not** a working fallback today (R363-10) — treat §HOSTING.md's Render rollback as unavailable until its blueprint is repaired.

### 11.2 Database recovery (draft — based on the proven drill chain)

**A. Point-in-time recovery (preferred for logical corruption)**
1. Neon console → Project → Branches → **Create branch with parent timestamp** — RESTORE WINDOW DEPENDS ON PLAN (free tier: hours; verify in Settings → Backups; do not assume). The R357 drill proved the mechanism at minute precision using `parent_timestamp` (note: the API field is `parent_timestamp`; the older `point_of_time` shape is silently ignored).
2. Point the app at the restored branch **only after verification**: create a scratch Vercel env / local boot with `DATABASE_URL` = restored branch; run `npm run db:verify` (tables, latest `_prisma_migrations` entry, role distribution, row counts) then a boot + smoke (the r183 drill pattern: production-mode boot, 5/5 smoke).
3. Cutover (production swap) is a conscious owner decision — the documented rescue protocol (`docs/12-deployment.md:368-376`): normal repair paths exhausted → isolated-branch restore verified → owner decision recorded → `scripts/db-restore.mjs --url-env <TARGET> --confirm-live-restore` (the guard refuses a target matching `DATABASE_URL` without the explicit flag).
4. Verify production after cutover: `/api/v1/health` `ok:true`, one login, `/me/dashboard`, tick ledger advancing (`/api/v1/status` → `tick.fastAt` fresh within ~60s of traffic).

**B. Dump-based restore (full-loss / cross-account recovery)**
1. Latest dump (or take one now from a still-readable source): `npm run db:backup -- --url-env DATABASE_URL` → `backups/<ts>/` with sha256.
2. Restore into a fresh, empty database (Neon branch or local PG): `npm run db:restore -- --url-env RESTORE_TARGET` (mandatory explicit target).
3. `npm run db:verify` → expect PASS; then boot + smoke against the restored DB.
4. Only then consider live-restore per A.3.
**Gap honored honestly:** no current off-site dump exists (R363-05) — step 1 assumes either Neon platform backups/PITR (A) or taking a dump while anything is still readable. Schedule the backup (remediation #6) before this runbook can be relied upon end-to-end.

### 11.3 Service outage response (draft)

1. **Detect** (soak issue / tick-watch issue / user report / failed deploy). Confirm scope: `curl -s https://madarek-app.vercel.app/api/v1/health` and `https://madarek-nine.vercel.app/api/v1/health`, then `/api/v1/status` on whichever answers.
2. **Classify** using `/status`:
   - Health `DB_UNAVAILABLE` / `dbLatencyMs` high → Neon: check the Neon console (autosuspend wake is ~1.5s and normal; storage/compute exhaustion is not). DB down = total outage → §11.2 path + comms.
   - Health OK but pages broken → buildId vs `origin/main` (regression) → §11.1 A.
   - `storageDriver`/`mailProvider`/AI-chain anomalies → dependency lane (§7 matrix): mail degrades to queue (no user error), AI degrades to local composer (labeled), storage = per-file 500s (check `BLOB_READ_WRITE_TOKEN`/Vercel Blob status).
   - Both aliases failing → Vercel platform incident: check vercelstatus.com; consider §11.1 C.
3. **Communicate**: in-app status is not implemented — post to the institution's existing channel (WhatsApp/etc. per pilot practice) with honest scope + next update time. (Recommended future: a static status page on gh-pages.)
4. **Stabilize**: pause auto-deploy if a deploy caused it; force a tick (`tick-watch` self-heals, or POST `/api/v1/internal/tick` with `CRON_SECRET`); avoid schema changes during an origin incident.
5. **Verify & close**: soak green ×2 consecutive, `/status` clean, tick slots fresh; file the post-incident note in `docs/runbooks/`; if any lane was skipped, mark it NOT VERIFIED in the note — never claim untested recovery.

---

## Appendix A · Live verification evidence log (all read-only; 2026-11-17 ~06:00–06:40 UTC)

| # | Check | Command (redacted) | Result |
|---|---|---|---|
| A1 | Canonical health | `GET https://madarek-app.vercel.app/api/v1/health` | 200 `{ok:true, buildId:"8f38b1548ec6", dbLatencyMs:106, env:"production"}` |
| A2 | Canonical status | `GET /api/v1/status` | buildId 8f38b1548ec6 · storageDriver `vercel-blob` · mailProvider `resend` · AI chain 3 providers, `allProvidersDownSince:null` · tick fast/daily fresh, weekly 2026-11-14 |
| A3 | SPA headers | `curl -sI https://madarek-app.vercel.app/` | **No CSP / nosniff / frame / referrer**; HSTS present (platform default) → R363-02 |
| A4 | API headers | `curl -sI …/api/v1/health` | Full helmet suite incl. CSP with the two sha256 pins → parity gap isolated to the static document |
| A5 | CDN build proof | `GET /build-sha.txt` | `8f38b1548ec6` == main HEAD |
| A6 | Failover origin | `GET https://madarek-nine.vercel.app/api/v1/health` | 200, identical buildId `8f38b1548ec6` |
| A7 | Render standby | `GET https://madarek.onrender.com/api/v1/health` | **503 "Service Suspended"** → R363-10/41 |
| A8 | Vercel deployments | `GET /v6/deployments?target=production` | Latest prod: `dpl_78CUQPRv` READY from `8f38b154` (main); prior chain matches git history (514cd7a9-era deploy-vercel failures were the CSP-pin churn, fixed by e8490cac) |
| A9 | Vercel env names | `GET /v9/projects/{id}/env` | Names+targets only (no values): preview `DATABASE_URL` separate entry; `RESEND_WEBHOOK_SECRET` absent → R363-42; `MADAREK_TEST_ACCOUNTS` present (production) |
| A10 | Preview build log | `GET /v3/deployments/{preview}/events` | `db:deploy` ran against DB **`spike_r351`** (not production); `storage-to-blob` skipped preview; URLs credential-redacted by the script → R363-16 |
| A11 | Production DB (SELECT-only) | `pg` client, pooler URL | PG 16.16; ledger 49 rows / 48 distinct == repo 48/48 (identical name set); `BinaryObject` 0; `User` 45 (13 `@test.ly`); `MailOutbox` 118 failed / 32 queued / 4 sent; 4 unresolved `OperationalAlert`s (2× HTTP_500 Nov 13–14, SYNC_STALE_RUNS_REAPED, APP_INTERNAL); `RateLimitHit` 245; `PushDevice` 10; dead letters by domain: demo.ulara.ly 86, test.ly 15, demo.madarek.ly 14 |
| A12 | android-latest release | `GET releases/tags/android-latest` + `build-info.json` | commit == main HEAD `8f38b154…`, run #117, release-signed, verified, smoke pass; tag frozen at 7084c845 → R363-25 |
| A13 | sidestore-latest | `GET …/sidestore-latest/build-info.json` | commit `514cd7a9`, unsigned, verified, built 2026-11-16 15:52 (Nov 17 nightly window missed — cron starvation) |
| A14 | Branch protection | `GET /branches/main/protection` · `/rulesets` | **404 "Branch not protected"** · `[]` → R363-03 |
| A15 | Baseline CI | runs @ `e98d6a0b` | CI / deadcode / Size gate — all success |
| A16 | Cron reality | workflow run histories | tick ~4/day at */5; tick-watch 4/26h at */30; soak 1/12h at */15; release-freshness + iOS nightly missed Nov 17 02:4x → R363-11 |
| A17 | evidence-r352 release | `GET releases/tags/evidence-r352` | Exists: pre-repair SyncRun/UniversityFact/_prisma_migrations dumps + repair-baseline.sql |
| A18 | gh-pages config mirror | `GET ahmadmedo1012.github.io/madarek/config/app.json` | `apiOrigins: [madarek-app, madarek-nine]` — in sync |
| A19 | Resend API | `GET api.resend.com/domains` | 401 "restricted_api_key" (send-only) → domain status NOT VERIFIED (docs state unverified domain; R363-04 stands on docs + dead-letter evidence) |
| A20 | Neon API | `GET api.neon.tech/api/v2/projects` | Unreachable from audit sandbox (egress-blocked) → branch/plan/PITR window NOT VERIFIED via API; DB-level evidence obtained directly (A11) |

**NOT VERIFIED (honest list):** actual Vercel env **values** (names only — by design); Neon plan/PITR window/branch list (API unreachable; dashboard owner-side); GitHub notification settings of the maintainer (account-level); `TICK_TARGET_URL` current value (repo evidence says set at R357; tick runs are firing live, which corroborates it); UptimeRobot existence; Render dashboard state beyond the public 503; whether the live production `DATABASE_URL` carries `pgbouncer=true` (R363-13); Expo/EAS build ledger contents (token not exercised against EAS API; GitHub-native artifact chain was verified instead); anything requiring write access or provider consoles.

## Appendix B · Specialist audit provenance

| Task ID | Area | Subagent | Verdict |
|---|---|---|---|
| 2-a | Deployment & origin consistency | GLM subagent (read-only, repo-only) | READY WITH GAPS |
| 2-b | CI/CD & release provenance | GLM subagent (read-only) | READY WITH GAPS |
| 2-c | Database operations & recovery | GLM subagent (read-only) | READY WITH GAPS |
| 2-d | Observability & background jobs | GLM subagent (read-only) | READY WITH GAPS (P0 finding D-6 → R363-01) |
| 2-e | External dependencies & resilience | GLM subagent (read-only) | READY WITH GAPS |
| 3 | Live verification (this appendix) | Parent agent (GET-only + SELECT-only) | 20 checks, 15 VERIFIED live, 5 NOT VERIFIED |

All five subagents worked on the same clone at the same baseline; none modified any file; the parent performed every network/DB check. Discrepancies resolved during consolidation: the preview-migration risk (B-F2) was downgraded after live build-log verification (spike_r351); D-6 was elevated to P0 after live confirmation of unseen unresolved alerts; B-F3/A-F3 were merged into R363-10 with live 503 confirmation.
