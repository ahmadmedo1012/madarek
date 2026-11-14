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

### LANE H — H5 slow-endpoint fix + boot time + telemetry (this commit)
- BEFORE (prod, single-shot, warm): /me/dashboard **1.453s** · /status 0.585s · /courses 0.575s ·
  /people/directory 0.504s · /me 0.201s · /lectures 0.192s · /students 0.201s.
- Root cause of the dashboard outlier: six SEQUENTIAL DB round-trips after wave-1 (lecture
  groupBy → attendance groupBy → assignments+count → live → examTemplates → rank counts),
  each paying the Neon pooler RTT. Fix: ONE Promise.all wave for all eight independent
  queries (the exam-attempts follow-up stays dependent on the templates). No schema/index
  change needed — the queries were already indexed; the N+1-shaped sequencing was the cost.
- Telemetry: app.ts gains the slow-request middleware (≥400ms → warn with ROUTE PATTERN,
  never raw URLs/ids) — the top slow endpoints now read from the Render log stream.
- Boot time (local embedded PG 16, node dist): **776ms to listening** (target <8s — 10×
  under), dbLatency 3ms; local /me/dashboard 33ms (parallel wave proof). Prod after-deploy
  measurement rides the next deploy (Render auto-deploys this commit).
- Gates: backend tsc 0/0 · vitest 2119 passed / 19 skipped (full).

### LANE E — E2 the mail outbox lands (this commit)
- Schema (additive): MailOutbox (status queued|sending|sent|failed|suppressed, attempts,
  nextAttemptAt, provider+providerId, lastError, dedupeKey UNIQUE, institutionId, sentAt;
  3 covering indexes) + MailSuppression (email+type unique, reason) — migration
  `20261113233247_r350_e2_mail_outbox`. CAUGHT + FIXED during authoring: the auto-generated
  migration wanted to DROP the 8 raw-SQL pg_trgm search indexes (invisible to the schema
  diff) — the DROPs removed, `CREATE INDEX IF NOT EXISTS` re-assertions added (the E1/F1
  pattern); local proof: 8/8 trgm indexes + both tables present after the fixed apply.
- lib/mail-outbox.ts: queueMail (caps checked BEFORE insert — recipient 12/day, institution
  500/day UTC; dedupeKey P2002 → the replay contract), drainOutbox (CAS claim, suppression
  consult, backoff 1m/5m/30m/2h/6h → dead-letter, provider=none parks rows = the honest off),
  the in-process worker (30s ticks) wired into scheduler.ts start/stop.
- The forgot-password caller queues through the outbox now (dedupeKey reset:<email>:<token18>)
  — the generic 200 contract unchanged; auth-password-reset tests extended for the outbox.
- Pinned: tests/modules/mail-outbox.test.ts — 11 tests (schedule, caps, dedupe, CAS, suppress,
  backoff, dead-letter, honest-off, lost-race skip).
- Gates: backend tsc 0/0 · full vitest 2128→2130 green (18 reset tests re-green) · verify --fast PASS.

### LANE H — H5 prod after-measurement (partial)
- Deployed (buildId e6bfd0ba04d3): /me/dashboard 1.45s → ~1.3s median warm (0.77–1.38 band;
  /me baseline 0.20s) — the parallel wave helped but ~0.6–1.1s of server time remains. The
  remaining attribution needs the slow_request warn lines (now instrumented ≥400ms) in the
  Render log stream, or the Neon slow-query list — neither readable from this box (no
  RENDER_API_KEY / Neon MCP). Honest state: instrumented + first structural fix shipped.

### LANE E — E4 deliverability & compliance (this commit)
- sendMail → SendOutcome {ok, providerId} (resend id / brevo messageId recorded on the
  outbox row) + optional transport headers (List-Unsubscribe / RFC 8058 one-click).
- mail.routes.ts: POST /api/v1/mail/webhook — svix-signed (HMAC-SHA256 over
  `${svix-id}.${svix-timestamp}.${rawBody}`, space-separated v1 schemes — the initial
  comma-split bug caught by the pure tests), RESEND_WEBHOOK_SECRET fail-closed (503 when
  unset), email.bounced → hard_bounce suppression, email.complained → complaint suppression,
  email.delivered → outbox providerId link, unknown events acked-and-ignored.
- GET/POST /api/v1/mail/unsubscribe — the signed one-click (HMAC of JWT_ACCESS_SECRET over
  `unsub:<email>`, timing-safe compare), the Arabic RTL no-login page, idempotent
  MailSuppression(type: unsubscribe). Mounted BEFORE the rate limiter (webhooks must never
  be throttled). Raw body via the json parser's verify hook (one capture, no second parser).
- The outbox attaches List-Unsubscribe headers to NON-transactional templates only
  (reset-password / security-alert / verify-email exempt — a password reset must always arrive).
- render.yaml gains RESEND_WEBHOOK_SECRET (sync:false). Owner steps to appear in the final
  guide: Resend dashboard → Webhooks → add https://madarek.onrender.com/api/v1/mail/webhook,
  copy the signing secret into the Render env.
- Pinned: tests/modules/mail-webhook.test.ts — 13 tests (pure svix good/tampered/wrong-secret/
  missing-headers, token round-trip, bounce/complaint upserts, 401-no-write, ack-unknown,
  GET page, invalid-token refusal, POST one-click).
- Gates: backend tsc 0/0 · full vitest 2143 passed / 19 skipped.

### LANE E — E3 events → mail: the verification flow + security alerts (this commit)
- Schema (additive): EmailVerificationToken (tokenHash unique, one-live-per-user, 24h TTL) +
  NotificationPreference (userId+category unique; security/account are ESSENTIAL — never
  user-suppressible; courses/announcements/digest optional, absent row = ON).
- email-verification.service.ts: the reset-service security shape (randomBytes→SHA-256,
  single-use CAS claim, equal-cost unknown path, generic Arabic refusal — no oracle).
- mail-events.ts: sendEventMail (preference-aware dispatch through the E2 outbox) + the
  template registry: verify-email, welcome, password-changed, new-device, role-changed,
  activation-invite (Arabic, shared shell).
- Wired: register → verify + welcome; login → new-device alert (first unseen ip+UA pair,
  LoginEvent consult, non-blocking); change-password → the security alert;
  GET /auth/verify-email (claim) + POST /auth/resend-verification (authMiddleware +
  rate-limited, generic 200).
- Pinned: tests/modules/mail-events.test.ts — 9 tests (mint/claim/no-oracle/one-live,
  preference law ×3, template content). Full backend suite 2152 green.
- Remaining E3 events (announcements, assignment due/graded, exam schedule, enrolment,
  registrar approval, weekly digest) follow the same sendEventMail pattern at their
  trigger seats — next session's continuation.

### LANE R — R8 the second-paint-killer verdict + the triple infra fix (0b983e1e)
- Run 43531370824 root-cause table (closed): (1) the udev rule wrote
  `KERNEL==kvm"` (missing opening quote) → matched NOTHING → no KVM →
  5-min software boot → system_server monitor-contention storm → ANRs
  (bluetooth/phone/system) → the "Process system isn't responding" dialog
  covered the app in ALL 5 screenshots (the same 23.7% light box); the app
  ITSELF painted (attempt1 shows the dark UI). (2) `expo config` ran
  without MADAREK_VERSION_CODE → verify failed `unexpected versionCode:
  36`. (3) iOS `migrate-deploy` died: dns.resolve4 can never see
  /etc/hosts → localhost ESERVFAIL on macOS.
- Fixes: the quoted rule + `test -r/-w /dev/kvm` proof; the env rides the
  config-resolution step (+ an assertion the resolved config records it);
  dns.lookup (getaddrinfo) in diagDns; a real phone panel (1080x2340
  @420dpi via pre-emulator-launch-script) + cores 3 / ram 3072M / heap
  512M; post-boot settle (dev.bootcomplete + keyguard + 20s).
- **VERDICT: run 43541517670 on 0b983e1e = ALL FOUR JOBS GREEN — smoke:
  pass, attempts: 1, hermetic 10.0.2.2:4000. android-latest now carries
  0b983e1e (ancestor of main), version_code 37, verified: true,
  release-signed, APK 59,043,736B @2026-11-14T01:52Z.** The 13-run mystery
  is closed: every prior failure was the missing-KVM storm, never the app.
- R4 freshness proof (half): mobile-touching commit 0b983e1e → new APK in
  ~38 min; web/backend-only c54a702b → NO Android rebuild (paths filter).
  iOS 43541598221 in flight on the same fixes.

### LANE E — E3 continuation: the course-life events (c54a702b)
- 9 wired seats (all void + never-throw + outbox-owned): announcements
  fan-out (same audience as bell/push), assignment-graded, exam-graded,
  exam PUBLISH now TELLS its audience (bell+push+mail — was silent),
  enrollment-confirmed, users/owner status-change (ESSENTIAL), owner
  role-change (the previously-unused template), import activation invites
  (F1 mode A + r323 CSV; placeholder-domain rows stay sheet-only;
  summary.activationMailQueued), scheduler daily 12–36h due-reminder +
  weekly digest (ISO-week dedupe).
- 8 new Arabic templates + escapeHtml retrofit across ALL templates +
  isDeliverableEmail/clipText/appUrl/formatLyDateTime (Africa/Tripoli).
- sendEventMail returns whether it queued (the fan-out counts real queues).
- Tests +17 (mail-events 19, scheduler-mail 7); backend suite 2169 green;
  verify --fast PASS; lint 0 errors.

### LANE E — E5b the shell-craft completion on top of 0bb17236 (this commit)
- Concurrent-session note: a parallel box landed E5 (0bb17236) while this session
  built the same lane; reconciled by adopting 0bb17236 as the base and shipping
  the deltas it lacked (evidence-first, no duplicated surfaces):
  · per-template Arabic preheaders — all 16 render* functions thread a real
    teaser line through sendEventMail (the base shell defaulted preheader to
    the title; every template now carries its own line; account-status × both
    branches; digest × both variants).
  · the bulletproof padded-cell CTA (bgcolor on td / padding on anchor — the
    Outlook-safe pair) replacing the single-anchor button.
  · the anti-leak preheader filler (45 × &#847;&zwnj; — trailing client content
    can never leak into the inbox preview).
  · the ≤420px gutter squeeze (.pad class on every 32px cell).
- Pinned: tests/modules/mail-shell.test.ts — 20 tests (shell craft + EVERY
  MAIL_TEMPLATE_SAMPLES entry × rtl/preheader+filler/absolute-href/plain-text).
- Contact sheet regenerated through the canonical script (15 templates ×
  390/600/dark); VLM reset@390: solid orange button + chip+wordmark, 9/10.
- Gates: backend vitest 2192 passed/19 skipped · tsc src 0/0 · tsc tests 0/0.
