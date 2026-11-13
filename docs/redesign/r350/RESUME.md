# R350 RESUME — LANE: ALL (one session; heartbeat per commit)

Spec: R350 master prompt (supersedes R349), written against `main@a2f7dbc7`.
Tokens in `/home/z/.madarek-env` (600). Lane order: H → R → E1 → E · S · I · P-rem · N → W · T · V → Z.

## done

### §0 stop-checks (2026-11-14)
- env saved (600) · clone OK (`--filter=blob:none`) · push test `wip/hello` push+delete OK.
- Token audit: GITHUB_PAT valid (repo read/write) · RESEND_API_KEY valid but **send-only**
  (`restricted_api_key` on GET /domains — domain management must be owner-side; live SENDS work) ·
  EXPO_TOKEN present (eas CLI absent on box; OTA pushes go through CI with the repo secret).
- No gh CLI → GitHub API via curl + PAT (AGENTS.md §8 pattern). Node v24 / npm 11.

### LANE R — R1 root-cause table (evidence: run 43186743416 artifacts + 43135742169 iOS)
| platform | step failed | cause (proven) |
|---|---|---|
| Android | `welcome-title` never visible (120s), screenshot = bare paper #F6F6EE | (1) the `ensureRTL()` mid-boot `Updates.reloadAsync()` killed the reanimated UI runtime → tree mounted, zero frames painted (convicted by prior session's logcat: "Running main" ×2 + "already finished thread: v_native" ×20); fixed by ef384313 (native RTL bake). (2) POST-fix run 43186743416 (65300dfb) STILL bare paper: no reload, no thread-death, splash removed at +1.5s, 3 EGL frames drawn of paper only → a SECOND paint killer survives (suspect: R8 minification vs reanimated entering, or emulator env). Discriminator built into the hermetic smoke (no-minify variant + paint probes). |
| iOS | `tab-courses` never visible (post-login) | login/dashboard depends on the PRODUCTION API, which was asleep (503) — welcome/login UI themselves worked. Confirms the R2 hermetic requirement. |
- android-latest release: last asset update 2026-11-11 11:32 (commit 7084c845, pre-iOS-crash-fix) — STALE, matching the brief.
- Resend domains API: 401 restricted (see §0) → E1(a) domain verify is owner-side; E1(c) live send via onboarding@resend.dev possible.

### LANE R — pre-merge (2026-11-14)
- `wip/r349-smoke-diagnostics` (cab229b6 diagnostics + ef384313 RTL fix + 65300dfb P4 mobile people
  surface) fast-forward merged to main and pushed as `65300dfb`. Local gates before push:
  mobile tsc 0/0 · jest 43 suites **1201/1201** · `verify.sh --fast` PASS (bundle 761.3/770,
  css ratchet 52 held, identity CLEAN 1892 files, brand 18/18). CI watch: build-android on
  65300dfb = the RTL fix's first live proof (smoke still expected red on the 2nd killer until R2 lands).
- `wip/p1-profiles-foundation` = fully merged already (0 commits ahead) — stale, sweep in Z3.

### LANE H — H2+H3 (2026-11-14, this commit)
- H1 evidence: keep-warm failures = `curl -sf` exit 22 on the instant 503 wake page (run 43286710657
  log: exit 22 after 0.17s); URL was CORRECT (`/api/v1/health`); cron starved to ~4 runs/day (measured).
- H2: keep-warm.yml rewritten — wake-aware retry (12 × 15s, 502/503 = waking), verifies BOTH
  /api/v1/health (includes the Neon SELECT-1 via dbLatencyMs) and `/`, `*/5` cron + dispatch,
  red only on a real post-wake failure.
- H3: docs/RELEASE.md §Keep-warm — the honest cron-starvation limits + the 5-Arabic-line
  UptimeRobot owner setup + the 3-line `render.yaml` Starter change (owner decision, not a blocker).
  render.yaml already carries `healthCheckPath: /api/v1/health`.

## next (in order)
1. R2: hermetic Android smoke (postgres service + backend + 10.0.2.2 smoke APK) + paint
   discriminators (no-minify variant, screencap timeline, a11y dumps) + disable-animations:false.
2. R3: publish policy (verify-gated; smoke pass|fail recorded in build-info.json; nightly net;
   maestro retry-once for flaky infra).
3. E1: live Resend send (onboarding@resend.dev → owner) + MAIL_* dashboard doc.
4. Watch 65300dfb CI → R4 freshness proof.

### LANE R — R2+R3 the hermetic smoke + the publish policy (this commit)
- build-android.yml rewritten: smoke job now runs PARALLEL to build (no needs) with its own
  postgres:16 service + the same-commit backend (migrate+seed+boot, MADAREK_TEST_ACCOUNTS=1)
  and builds its own x86_64 smoke APK with EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:4000/api/v1
  baked at Metro time + a cleartext patch on the throwaway prebuild tree (release parity kept:
  R8 minified). A no-minify x86_64 variant is pre-built as the paint-freeze discriminator and
  installed ONLY on double maestro failure (screencap + a11y dump + logcat). Paint probes
  (screencap@8s/@25s + uiautomator dump) run before Maestro; disable-animations:false.
- Publish policy: needs [verify, smoke] with always(); verify-success on main (push|schedule|
  dispatch-main) publishes; the smoke result merges into build-info.json (smoke: pass|fail|
  pass-flaky|unknown + run URL + api + attempts), the release notes gain a smoke badge line,
  the summary shows it; a red smoke job makes the run loud without blocking the APK.
- Nightly `schedule: 25 2 * * *` freshness net added.
- Flaky-infra: maestro retries exactly once inside the emulator script (both attempts'
  junit files land in the diagnostics artifact).

### LANE H — H6 live smoke wired + measured (this commit)
- live-smoke.mjs: portable playwright resolution (frontend workspace @playwright/test via
  import.meta.url — was a hardcoded sandbox path + the wrong package), wake-aware health
  (502/503 = waking, 10×10s), screenshot to a repo-relative path.
- deploy-smoke.yml: the health step goes wake-aware (10 attempts); the full browser-level
  live-vitals step added after the API checks (LCP/CLS/INP budgets, page errors, RTL sanity,
  /auth) — wired as the after-every-deploy gate. (The `branches: [main]` trigger was NEVER
  broken — the `ain]` reading was the terminal eating `[m` as an ANSI escape; bytes verified.)
- Measured NOW on production (evidence): health 200/843ms · LCP 1660ms (<2500) · CLS 0.0118
  (<0.05) · INP-proxy 96ms (<200) · TTFB 219ms · 0 page errors · RTL sanity h1+2749 chars ·
  /auth 200 — ALL LIVE CHECKS PASS (chromium 1223 installed on this box).

### LANE H — H4 the cold-boot UX becomes a real state machine (this commit)
- WEB (api.ts): transport-level wake retry — a GET/HEAD that dies on TRANSPORT (timeout/
  network fault, no HTTP answer) re-enters the pipeline after 2s/6s/12s backoff with a
  tighter 10s retry timeout (worst ≈64s). Writes NEVER blind-retry; an answered server's
  refusal is final (503 ≠ booting). The page keeps skeletons the whole window — no error
  flash; the SlowServerCard's «نُعيد المحاولة تلقائيًا» copy becomes TRUE at the layer
  that matters. serverWake gains phases (waking 4s / long 25s) and the pill swaps to the
  honest «عادةً ٣٠–٦٠ ثانية، لا تُغلق الصفحة» copy past 25s.
- MOBILE (client.ts): the same law — GET-only, 3s/8s/15s backoff, 12s retry timeout,
  worst ≈60s; the Boot screen's calm label stays up the whole window (the request is
  still pending), the Arabic timeout error only surfaces after the budget is spent.
- Pinned: 5 frontend tests (r350/wake-retry) + 4 mobile jest tests — retry law, no-write-
  retry, answered-is-final, bounded budget, tighter retry timeout.
- Gates: fe tsc 0/0 · r350 vitest 5/5 · build ✓ · mobile tsc 0/0 · jest 1205/1205.
