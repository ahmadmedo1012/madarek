# R352 — RESUME (the working ledger)

Round scope: stabilize the Vercel production (K), fix the mobile build/publish
pipeline (R), finish mail (M), the AI agent (A), accounts/student-data (G),
pages/quality (W/T/V/Q), hygiene (L), domain (Z). Full brief in the run doc.

Evidence law: every claim carries a command + output or a run URL.

## Baseline (verified at round start)

- main = b3e93938, tree clean, `git fetch` clean.
- Health ×3 on https://madarek-nine.vercel.app/api/v1/health → 200
  `{ok:true, dbLatencyMs:1559, env:production, buildId:b3e93938b03d}`;
  wall-clock: 3.91 s (cold) / 0.63 s / 0.68 s (warm). **dbLatencyMs 1.5 s is
  the K3/Z2 region question — under investigation.**
- `bash scripts/verify.sh --fast` on b3e93938 → **FAST PASS** (tsc, vitest,
  bundle 773.0 KB ≤ 773 KB, CSS ratchet 52, identity CLEAN, brand OK).
- CI on b3e93938: CI / Size gate / deadcode / Deploy Vercel = green.
- RED at start: Android 43596707814 (smoke job), iOS 43596707875 (build job —
  publish skipped), keep-warm.yml failing on every push.

## R1 — root causes (DONE, evidence-backed)

**Android 43596707814 — the hermetic smoke talked to PRODUCTION.**
- The Maestro flow failed `Assertion is false: id: tab-courses is visible`
  (both attempts); ui-attempt1.xml shows the login form filled + the toast
  «حدث خطأ غير متوقع — حاول مرة أخرى»; backend.log (artifact
  android-smoke-diagnostics-46) shows the hermetic backend received ZERO
  requests — only its own outbox drain ticks.
- Mechanism: the live remote-config asset (`https://madarek-nine.vercel.app/config/app.json`
  + the gh-pages mirror, both live since the r351-X4 cutover) overrides the
  baked `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api/v1` —
  `apiBase()` resolves through `getActiveOrigin()`, the emulator has internet,
  fetched the config, and login went to `madarek-nine.vercel.app`.
  Why it passed on 2d0ab93b (11:33) and failed on 4d80e9aa (12:49): the
  config sources went live between the two runs (gh-pages mirror created
  from main@29187787; Vercel prod deployed at the cutover).
- The `FATAL: database "madarek" does not exist` spam in the job log is the
  service-container health check `pg_isready -U madarek` (defaults the DB
  name to the user name; `pg_isready` still exits 0 — cosmetic noise, NOT a
  failure cause).
- **Fix** (e4149448): the hermetic pin — a baked base whose origin is not in
  `FALLBACK_ORIGINS` (the known production set) disables the remote config
  and pins the baked origin; `EXPO_PUBLIC_DISABLE_REMOTE_CONFIG=1` forces it.
  4 new unit tests; 11/11 green; mobile tsc clean.

**iOS 43596707875 — Maestro XCUITest driver infra flake killed publishing.**
- `IOSDriverTimeoutException: iOS driver not ready in time` (driver startup
  exceeded Maestro's 120 s default on a loaded mac runner) → the smoke step
  is INSIDE the build job → whole job red → Verify IPA + Publish SKIPPED →
  **no iOS build published at all**.
- **Fix** (ad2ae0d9): `MAESTRO_DRIVER_STARTUP_TIMEOUT=360000` + one infra
  retry with attempt-1 diagnostics; the smoke steps are signal-only (see R2).

## R2 — smoke is a signal, never a gate (DONE)

- Android: the result writer records + `::warning::` + job summary; it never
  exits 1. The crash-buffer scan is recorded into smoke-result.json
  (`crashes: N`) instead of failing the job. Publish keeps
  `needs: [verify, smoke]` (the smoke job now concludes green; a genuinely
  dead runner still shows as infra failure).
- iOS: the flow + crash scan steps never fail the build job; verify + publish
  always run on an otherwise-good IPA; diagnostics upload moved from
  `if: failure()` to `always()` + ignore.
- Result shape (both): `{smoke, attempts, crashes, api, run_url, commit}` —
  rides build-info.json + the job summary.

## L3 — keep-warm deleted (DONE)

- `.github/workflows/keep-warm.yml` deleted (was disabled_manually since the
  X4 cutover; every push ran it red — pure noise). RELEASE.md rewritten:
  «Liveness & tick (Vercel era)» — the four tick triggers + the Render
  standby rollback note. AGENTS.md workflow list updated.

## K4 — tick reliability + the self-healing watch (DONE)

- Evidence: `tick.yml` has **zero runs** since the cutover (GitHub cron
  starvation on quiet repos, measured at R350 H3) — the fast slot rides the
  request-piggyback, Vercel's daily cron, and the post-enqueue drain.
- `/api/v1/status` now carries `tick.{fastAt,dailyAt,weeklyAt}` (TickRun
  ledger, ISO timestamps, best-effort nulls) — 3 unit tests green.
- New `tick-watch.yml` (*/30 best-effort): probes health + the ledger; when
  the fast slot is >30 min stale it FORCES a tick (CRON_SECRET) — a fifth
  trigger that fires exactly when the others are starved; opens/updates a
  `tick-watch`-labelled issue only when health is down or a forced tick
  cannot refresh the ledger; auto-closes on recovery.

## Commits this round

| sha | what |
|---|---|
| e4149448 | fix(r352-R1): the hermetic pin — remote config never overrides a non-production baked base |
| ad2ae0d9 | fix(r352-R2): smoke is a signal, never a gate — green-with-annotation on both pipelines |
| (this) | feat(r352-L3+K4): keep-warm deleted + the self-healing tick watch |

## Decisions

- **Hermetic pin rule** (not "block the emulator's internet"): the app must
  never be steered away from an explicitly-baked non-production base. Blocking
  DNS in CI is fragile and hides the real-world failover code path; the pin
  is explicit, unit-tested, and self-documenting.
- **Smoke = signal** (owner requirement: never a stale APK / always an IPA):
  a failed smoke is a warning annotation + build-info field + job summary —
  loud, but structurally incapable of blocking a publish.
- **Tick watch threshold = 30 min stale + forced-tick failure** (not a naked
  30-min alert): GitHub cron starvation makes a naked timer fire false
  positives daily; the forced tick converts the alert into a genuine
  "platform cannot tick" defect signal.
- **pg_isready noise left as-is**: changing the health-cmd to
  `pg_isready -U madarek -d madarek_smoke` would silence the log noise, but
  the noise is cosmetic and the command works; not worth a workflow-only
  churn commit in this batch (noted here for the record).

## Open (next in queue)

- K1: ranked defect table from Vercel runtime errors + Neon slow queries.
- K3/Z2: dbLatencyMs 1.5 s — region alignment (functions iad1 vs Neon
  eu-central-1?), p50/p95 measurement, pooler verification.
- K5/K6: Blob uploads e2e; usage guard + HOSTING.md.
- R3/R4: freshness assertion (nightly build-info.commit == HEAD) + APK
  remote-config proof on the emulator.
- M/A/G/W lanes: not started.
