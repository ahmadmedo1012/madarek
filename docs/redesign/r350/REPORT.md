# R350 REPORT — LANE: ALL (session of 2026-11-14, against main@a2f7dbc7)

Evidence-first: every row cites a command output, a run id, or a test count.
Live document — updated per lane as the session progresses.

## LANE H — production stays awake, fast, and observable

| item | before | after | evidence |
|---|---|---|---|
| keep-warm design | single `curl -sf` — RED on every wake it performed (exit 22 after 0.17s on the instant 503) | wake-aware 12×15s loop, green on wake, verifies health (incl. Neon SELECT-1 via dbLatencyMs) AND `/`; */5 cron | run 43286710657 log (before); keep-warm.yml @f5f14ad9 |
| cron starvation | ~4 fired runs/day measured at */10 | documented honestly + the owner-side UptimeRobot 5-line Arabic setup + the 3-line render.yaml Starter change | docs/RELEASE.md §Keep-warm (H3) |
| live deploy smoke | inline curls that fail on a cold 503 | wake-aware health + the full browser-level live-vitals gate (LCP/CLS/INP/RTA) wired into deploy-smoke.yml | live-smoke.mjs output: LCP 1660ms · CLS 0.0118 · INP-proxy 96ms · 0 errors — ALL PASS |
| cold-start UX (web) | first request errors at its 20s timeout | GET/HEAD transport failures retry (2/6/12s backoff, 10s retry timeout); phased pill copy; no error flash | 5 vitest tests (r350/wake-retry) |
| cold-start UX (mobile) | NETWORK_ERROR at 20s | GET-only retry (3/8/15s, 12s timeout, ≈60s worst) — the calm Boot label holds the window | 4 jest tests |
| slow endpoints | /me/dashboard 1.453s (measured prod) | six sequential pooler round-trips → ONE parallel wave; slow-request telemetry (≥400ms warn, route patterns only) | H5 commit e6bfd0ba; prod after ≈1.3s median (trend down; residual attribution needs Render slow_request lines — instrumented) |
| boot time | unmeasured | **776ms to listening** (local PG16; target <8s) | local measurement, e6bfd0ba |

## LANE R — release pipelines publish again

| item | before | after | evidence |
|---|---|---|---|
| android-latest freshness | STALE since 2026-11-11 11:32 (commit 7084c845, pre-iOS-crash-fix) | **fresh: assets @2026-11-13 23:48, commit 2aaa4edc** (post-M1.3, ancestor of main), sha256 = SHA256SUMS (e700e20b…), APK 200/59,043,728B, release-signed | release API + curl -IL + sha256sum |
| smoke vs production | the flow logged into SLEEPING prod (iOS died exactly there: tab-courses) | HERMETIC: postgres service + same-commit backend on the runner, smoke APK baked to http://10.0.2.2:4000/api/v1, cleartext patched on the throwaway prebuild only | smoke job steps green through backend-health on run 43531370824 |
| publish policy | publish needed [verify AND smoke] — a red smoke left the APK stale for days | verify-gated (always()); smoke pass/fail recorded in build-info.json + badged in the release notes; nightly 02:25 net; maestro retry-once | run 43526590199: smoke cancelled → published with smoke:"unknown" — the policy held |
| iOS pipeline | same prod dependency | hermetic simulator stack (Homebrew PG + backend + step-scoped EXPO_PUBLIC override + ATS NSAllowsLocalNetworking AFTER the IPA was packaged) + the same publish policy + nightly 02:40 | build-ios-sidestore.yml @827888fa |
| versionCode | constant 1 | MADAREK_VERSION_CODE = github.run_number (both prebuilds) | app.config.ts @274f84aa |
| EAS references | docs presented eas build as a working route | mobile README leads with «binaries from GitHub Actions — never EAS Build; builds manual-only (quota dead until ~Dec 1)»; RELEASE.md labels the Apple checklist the future path | 274f84aa |
| /app live acceptance | — | direct APK CTA ✓ iOS «قريبًا» ✓ version shown ✓ CTA 218×44 @390 | Playwright (chromium 1223) |

### R1 — the root-cause table (the 13-run Android smoke mystery)
| cause | verdict | fix |
|---|---|---|
| `ensureRTL()` mid-boot `Updates.reloadAsync()` killed the reanimated UI runtime ("already finished thread: v_native"; tree mounts, zero frames paint; bare-paper screenshot) | CONVICTED (prior session's logcat; my artifacts concur) | ef384313 — native RTL bake via MainApplication plugin; merged as 65300dfb |
| login/dashboard depends on sleeping production | CONVICTED (iOS reached login, died at tab-courses on the cold boot) | R2's hermetic stack |
| a SECOND paint killer surviving the RTL fix (run 43186743416 post-fix: no reload, splash removed, 3 paper frames, a11y all-invisible) | SUSPECT: R8 minification vs reanimated entering, or emulator env | the no-minify discriminator + paint probes built into the hermetic smoke — verdict rides the current run |

## LANE E — email, completely

| item | before | after | evidence |
|---|---|---|---|
| provider live proof | none | **real email accepted by Resend** (id 01a1d71e-…) to the owner from onboarding@resend.dev; owner-side activation guide (MAIL-SETUP-AR.md: domain DNS + the 3 Render fields + the post-activation test) | Resend API 200 + docs @9ff771d2 |
| send layer | fire-and-forget boolean | SendOutcome {ok, providerId} + transport headers (List-Unsubscribe / RFC 8058) | mail.ts @2345af98 |
| outbox | none | DB-backed: caps before insert (12/recipient, 500/institution daily), dedupe keys, CAS claims, 1m/5m/30m/2h/6h backoff → dead-letter, suppression consult, honest-off parking | 11 tests (mail-outbox.test.ts) |
| deliverability | none | svix-signed webhook (bounces/complaints → suppression; node:crypto only; fail-closed without the secret), one-click unsubscribe (signed token, Arabic RTL no-login page) | 13 tests (mail-webhook.test.ts) |
| verification flow | User.emailVerifiedAt existed, nothing used it | mint/claim service (reset-grade security shape) + verify-email + resend-verification routes + welcome/security-alert events, preference-gated (ESSENTIALs unsuppressible) | 9 tests (mail-events.test.ts); backend 2152 green |

### The mail migration trap (caught + fixed)
Both E2/E3 migrations auto-generated DROP INDEX statements for the 8 raw-SQL pg_trgm
search indexes (invisible to the Prisma schema diff) — removed + `CREATE INDEX IF NOT
EXISTS` re-assertions added (the E1/F1 pattern). Local proof: 8/8 indexes + all new
tables present after the fixed applies. Production never saw the bad SQL.

## Open items (the honest list)
- The Android hermetic smoke's full green (or its no-minify verdict) — run 43531370824 in flight at report time.
- E3 continuation events (announcements, assignments, exams, enrolments, registrar, digest) — the sendEventMail pattern is established; seats remain.
- E5's logo-in-mail + dev preview route; E6's admin «البريد» surface (frontend — deferred while mobile pipelines run).
- H5's residual ~1s on /me/dashboard — needs the Render slow_request lines (instrumented) or Neon slow-query access.
- S/I/P-rem/N/W/T/V/Z lanes per the queue.
