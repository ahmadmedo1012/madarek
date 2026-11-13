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
