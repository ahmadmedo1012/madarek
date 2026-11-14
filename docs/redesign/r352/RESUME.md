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

## R1/R2 verified live (Android run 43606189827 on 5e139fe9)

- ALL FOUR jobs green: Build → **Emulator smoke → success** → Verify →
  Publish. smoke: **pass, attempts: 1** (the hermetic pin fixed the flow
  outright — login → dashboard → 60s alive against the runner's backend,
  first try). build-info.json: commit 5e139fe9 == main HEAD, verified: true.
  android-latest refreshed at 14:56Z. This closes R1+R2 for Android.

## Z2 — the production database, IDENTIFIED (indirect but hard evidence)

- Candidate DBs probed directly with the owner's credentials:
  - ep-icy-mode(neondb): NO app schema — not production.
  - ep-icy-mode/spike_r351: full schema + today's r351 migrations +
    TickRun fresh (12:21Z) — the r351 spike DB, 8 users — NOT production
    (user ids differ).
  - ep-cool-paper/neondb (Render's DATABASE_URL, read via the Render
    API): full schema + today's migrations, 28 users — NOT production
    (user ids differ).
- Production login (student@test.ly) returns user id cmw9d6awy… — a
  FOURTH database. The runtime errors (TickRun/RateLimitHit missing)
  mean it lacks today's three r351 migrations. The boot DB-identity log
  (773c617b) will name it on the next cold start.

## K1 — the production database repair (DONE — the round's biggest find)

The defect table's #1 turned out far bigger than "missing three
migrations". Full story in the 5e634d42 commit message; the essence:

- **Production = ep-icy-mode…eu-central-1/neondb — the owner's ORIGINAL
  database** (build-log identity evidence). The r351 docs were wrong on
  every count (ep-cool-paper, us-east-1, "co-located"); the 93 ms warm
  dbLatency was the iad1↔eu-central-1 RTT.
- Its `_prisma_migrations` held ONE FOREIGN row (`0001_ulara_baseline`,
  written 2026-11-13 by the ulara app sharing this Neon account) —
  Madarek's 43-migration history was never recorded there, and the
  schema was stale pre-r349_p1 (no TickRun/RateLimitHit/ImportUpload/
  MailOutbox/EmailVerificationToken/NotificationPreference, no r349
  profile fields, no r350 import-rollback columns).
- Every X4 deploy ran new code against that old schema: rate limiting
  failed OPEN on every request; every tick claim failed.
- **The repair** (executed + verified): resolve the failed init attempt
  → delete the foreign row → baseline all 43 migrations → apply the
  reviewed repair baseline (the migrate diff, one diff artifact fixed:
  GIN ASC) → migrate deploy green. Post-repair: prod == spike_r351
  (diff EMPTY), 44/44 rows finished, User 44 / Course 9 / Enrollment
  217 intact. Dead tables SyncRun (5 rows) + UniversityFact (33 rows,
  the 25-universities feature) dropped — pre-repair dumps in the
  `evidence-r352` GitHub Release.
- **Structural**: db:deploy rides every remote build (vercel.json) —
  drift is impossible going forward; .vercelignore now ships
  migrate-deploy.mjs (the first attempt's MODULE_NOT_FOUND) and joins
  the Deploy trigger paths.

| # | defect | evidence | fix | state |
|---|---|---|---|---|
| 1 | Production DB: foreign migration row + stale schema (details above) | vercel logs (RateLimitHit/TickRun 42P01 ×N) + direct DB inspection | repair baseline 5e634d42 + db:deploy on every build | DONE — but see the K1-regression note below: db:deploy now exits 1 silently |
| 2 | Cross-region DB roundtrip: warm dbLatencyMs 93 ms constant (function region ↔ DB region mismatch); burst handshakes 860-963 ms | 20 sequential + 20 burst health, 14:47Z (baseline table below) | a7d9eac2: regions iad1 → fra1 | DONE — AFTER table below (97.8 % dbLatency cut) |
| 3 | Neon autosuspend wake on first request after idle (~1.5 s dbLatency) | health attempt1 3.91 s wall / dbLatency 1559 ms vs warm 0.63 s | K3: warm-ping on app open (client) + tick-watch forced ticks every ≤30 min best-effort | partial — the ledger stays fresh (fastAt 34 s old at the 18:01Z probe); residual cold-start p95 2.2 s on burst |
| 4 | Smoke steps could kill publishing (iOS) / redden runs (Android) | runs 43596707814 / 43596707875 | R1+R2 fixes; verified green on 43606189827 | DONE |

### K1-regression (2026-11-14 18:20Z, this session) — db:deploy exits 1 SILENTLY

The 18:20 deploy on 8e108508 (green CI) failed its remote build:
`prisma migrate deploy` printed its header (schema loaded, datasource
ep-icy-mode…/neondb, "43 migrations found in prisma/migrations") then
exited 1 with NO further output — no "Applying", no "No pending
migrations to apply", no error text, no [migrate-deploy] catch line
(https://github.com/ahmadmedo1012/madarek/actions/runs/43625062386).
The 16:00/16:15 deploys on 8601f6a3 ran the same db:deploy GREEN —
the delta is NOT in the repo (nothing between the two touched prisma/)
→ prime suspect: production DB state (the ledger) or its env. The
repo folder holds 43 migration dirs; the repair story says the DB
holds 44 _prisma_migrations rows — if the 44th name is not a folder
name, deploy treats it… that theory needs the LEDGER, and the
diagnostics previously rode AFTER db:deploy in the buildCommand (a
failing deploy destroyed its own evidence channel).
→ e8cab95e: db:diagnostics moved BEFORE db:deploy + the ledger query
now lists every row BY NAME; the r352-db-diagnostics dispatch (flag
in → deploy → flag out → extract) reads it from the build log even
while the deploy fails. Next: dispatch, read the ledger, repair.

### K3 latency (AFTER the fra1 flip — measured 2026-11-14 ~17:5xZ, this session)

/api/v1/health, function fra1 (a7d9eac2), warm Neon: 20 sequential —
wall p50 257 / p95 312 ms, dbLatency p50 2 / p95 3 ms. 20 concurrent —
wall p50 339 / p95 2247 ms, dbLatency p50 2 / p95 153 ms. 0 errors.
vs BEFORE (iad1): dbLatency 93 → 2 ms (−97.8 %); burst db 860 → 2 ms
median (−99.8 %); burst wall 3075 → 339 ms (−89 %). The residual burst
p95 (wall 2.2 s / db 153 ms) is the Neon pooler under 20-way
concurrency — acceptable at pilot scale. Live status at 18:01Z:
storageDriver vercel-blob · buildId 8601f6a3c358 · tick fastAt 34 s
fresh. The defect table's #2 row is CLOSED by this table.

## M1/M2/M3 — mail (DONE, verified live)

- M1: `GET api.resend.com/domains` → 401 restricted_api_key (send-only key —
  documented, not guessed). Test send `Madarek <onboarding@resend.dev>` →
  the owner's inbox → HTTP 200 (id 01a1da87-bb40-7518-97b3-a7fb7a3aca55).
- M2: production env now MAIL_PROVIDER=resend + MAIL_API_KEY +
  MAIL_FROM=مدارك <onboarding@resend.dev> (each decrypt-verified; a
  quoting bug that leaked a trailing quote into all three was caught and
  fixed). docs/MAIL.md = the owner checklist (SPF/DKIM/DMARC, p=none →
  quarantine, the second-inbox proof) + the honest limitation: the shared
  dev sender delivers ONLY to the account owner's address until a custom
  domain is verified.
- M3: the ONE logo already rides every template (brand/icon-192.png from
  APP_ORIGIN, hash-pinned, PNG, dark-mode chip — verified HTTP 200 on the
  origin). BIMI: needs the owner's domain + DMARC enforcement + usually a
  VMC — stated once in MAIL.md with the TXT record staged.

## L2 — branch sweep (DONE)

| branch | ahead of main | verdict |
|---|---|---|
| wip/all-d-ci-abi-order | 0 | deleted (HTTP 204) |
| wip/p1-profiles-foundation | 0 | deleted (204) |
| wip/r349-smoke-diagnostics | 0 | deleted (204) |
| wip/x0-keepwarm-window | 0 | deleted (204) |
| wip/x1-vercel-spike | 0 | deleted (204) |
| wip/x3-remote-config | 0 | deleted (204) |
| wip/x4-cutover | 0 | deleted (204) |
| pr/45 | — | does not exist on origin |
| gh-pages | — | KEPT (remote-config mirror) |

Repo now: main + gh-pages only.

## Z1 — friendly URL (partial)

- `madarek.vercel.app` is owned by another team (API: owned-on-other-team).
- `madarek-app.vercel.app` claimed for the project + verified serving
  production (health 200, same buildId). Released the spare experiments
  (madarekly/madarek-apps/getmadarek). The FULL canonical flip
  (apiOrigins, CORS, SPA identity, mobile defaults, mail links) is one
  commit — deferred until the critical deploy chain settles; old origin
  stays as failover either way.

## K5 — uploads (CORRECTED + COMPLETED this session)

- CORRECTION (measured 18:01Z): production ALREADY runs
  STORAGE_DRIVER=vercel-blob (GET /api/v1/status → storageDriver:
  vercel-blob, buildId 8601f6a3) — the "flip PENDING" note below had
  lagged the live state; the flip happened without a data migration,
  so any pre-flip BinaryObject rows were stranded (a missing row = a
  404 file).
- COMPLETED (4c8f5bf9 + fixes): backend/scripts/storage-to-blob.mjs
  rides EVERY remote build (after db:deploy; no-op when 0 rows /
  preview / token-less; fail-closed: a partial migration fails the
  build). 13 unit pins + the .d.mts (the db-ops-lib pattern).
  r352-k5-blob-flip.yml = the env assertion/repair tool (idempotent;
  flip_back is the rollback). Rows are never deleted by the script —
  they stay the pre-flip backup until a later verified sweep.
- The migration counts on production land in the next deploy's build
  log ([storage-to-blob] lines) — blocked on the K1-regression above
  (db:deploy exits 1 before storage:blob runs).

## Commits this round

| sha | what |
|---|---|
| e4149448 | fix(r352-R1): the hermetic pin — remote config never overrides a non-production baked base |
| ad2ae0d9 | fix(r352-R2): smoke is a signal, never a gate — green-with-annotation on both pipelines |
| 5e139fe9 | docs(r352): the round ledger opens |
| a7d9eac2 | fix(r352-K3+Z2): the function moves to fra1 — it was NEVER co-located with the DB |
| b10af76b | docs(r352-M1+M2): the mail truth + the owner's DNS checklist |
| 773c617b | fix(r352-K1): migrations ride every deploy + the boot DB-identity log |
| e40686f5 | feat(r352-K3+R2b): the boot warm ping (web + mobile) + the iOS smoke steps can never kill a publish |
| 5e634d42 | fix(r352-K1): the production repair baseline — the schema is CURRENT and the history is clean |
| bfb058f0 | docs(r352): the repair story in the round ledger |
| 8601f6a3 | fix(r352-K1): the repair baseline gates itself — a no-op on every healthy database |
| 561c0ace | chore(r352-K1): the one-shot production diagnostics run (dispatch) — this session |
| 4c8f5bf9 | feat(r352-K5): the postgres→Blob storage flip — migration script + one dispatch — this session |
| d997f6e3 | feat(r352-R3+R4): the freshness watch + the prod-config proof on the emulator — this session |
| 8e108508 | fix(r352-K5): the migration test typechecks — a .d.mts + typed collaborators — this session (CI red on 4c8f5bf9 fixed) |
| 86be12c2 | feat(r352-K1/T): the DB diagnostics channel — through the remote build log — this session |
| e8cab95e | fix(r352-K1): db:diagnostics BEFORE db:deploy + the ledger by name — this session |

## Session 2026-11-14 ~17:40Z onward (continuation after the box reset)

- The box was RESET (the previous session's /home/z state died):
  /home/z/.madarek-env rebuilt from the fresh TOKENS block
  (GITHUB_PAT + EXPO_TOKEN + RESEND_API_KEY — no DATABASE_URL this
  time; logged here per the missing-token law); re-cloned
  (blobless, PAT embedded in the remote URL); push test OK.
- K3 AFTER measured (the table above) — defect #2 CLOSED.
- K5 corrected + completed (the table above).
- R3/R4 landed (the freshness watch + the prod-config proof).
- The K1-regression found + the diagnostics channel built for it
  (the K1-regression note above).
- Token audit: GITHUB_PAT read/write OK (this session's pushes);
  EXPO_TOKEN present (unused this session — no EAS builds needed);
  RESEND_API_KEY present (M1 already verified live last session).

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
