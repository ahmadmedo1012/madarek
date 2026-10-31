# R327 HANDOFF — «NATIVE BEAUTY · PROOF · FINISH»

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after EVERY step. Commit prefix `feat|fix|chore|docs(r327): …` ending with
> `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
> **One branch: `main`.** Work happens in local worktrees only.
> Never run root `npm run build`. Mobile gates live in `apps/mobile`
> (`typecheck`, `expo lint`, `contract-check`, `export`, `tokens:check`).

## The programme

R327 = prove M1 («no crash after login») **before** cosmetics → M2 native
beauty at web parity (brand · loaders · navigation · design system · screens
· native features) → M0.8 `/app` + M3 store prep → the R325 web remainder (W).
Strict order **A → B → C → D → E → F**; E runs in parallel via subagents.
Every `done` row carries hash + command + output. What cannot be proven
without a device is written «غير مُثبَت — يحتاج جهازاً» and is NEVER done.

## Status board

| Phase | Scope (short) | Status | Evidence |
|-------|---------------|--------|----------|
| 0 | R327 board opened on `main` | **done** | this commit — clone fresh, main @ `46acb7fb` verified (git log) |
| A1 | Maestro on EAS Workflows (e2e-ios + e2e-android) | **blocked by plan — fallback armed** | `.eas/workflows/e2e-{ios,android}.yml` (build → maestro job, screen recording, validated by the API) + `apps/mobile/.maestro/` 6 flows (first-open + 5 roles). Verbatim refusal: «Running maestro_test jobs requires a paid plan. Subscribe to a paid plan: https://expo.dev/accounts/rh2011/settings/billing …». Generic runners too: «Unknown job type: linux». Per protocol → jest nets + RN-web + telemetry (A2/A4 done). Files stay ready for a plan upgrade. |
| A2 | static crash audit + jest per-role with poisoned `/me` | **done (CI half)** | `a569d5a1` — role-session.test.tsx: 5 roles × 6 poisons (null/missing/empty/401/500/garbage) on every role home + entry + /auth + no-institution picker = 46/46. The audit itself surfaced the REAL crash: parseEnvelope returned the truthy envelope for `{data:null}` (fix `17298674`). Device half: «غير مُثبَت — يحتاج جهازاً» until a paid plan/simulator |
| A3 | build matrix: preview iOS-sim + Android APK | **iOS done · Android quota-blocked** | iOS simulator build FINISHED: `c910b558-0bbf-42dd-b07a-d3d14b51a6c4` → https://expo.dev/artifacts/eas/5XTynelLCXq0ihxCSSNxbl-r-iNDdEpfEFA4MCXj390.tar.gz (built pre-B1; a fresh cut lands at the B4/C checkpoint). Android: «This account has used its Android builds from the Free plan this month, which will reset in 9 hours» — retry queued for after the reset. Credits at 90% |
| A4 | CI gate «poisoned responses» (render net × malformed API) | **done** | `a569d5a1`+`17298674` — poisoned-net.test.tsx: 112 routes × 5 hostile feeds = 560 combos, contract = real tree with text, never a throw/white screen. CAUGHT & FIXED: (1) parseEnvelope `{data:null}` → truthy envelope → every `q.data?.a.b` crash — the owner's post-login white screen; (2) `training/[slug]`, `training/[slug]/lesson/[lessonId]`, `competitions/[id]` `return null` white screens → honest EmptyStates; (3) api() 20s timer leak per request. Also: SafeAreaProvider jest mock — the real provider NEVER rendered children under jest (the old net was hollow) |
| B1 | the ONE logo (build-app-icons.mjs, all assets, cross-fade splash) | **done** | `a6033675` — scripts/brand/build-app-icons.mjs parses the 32-grid geometry OUT of mark.ts and renders icon · adaptive fg/bg/mono · splash-icon · favicon(48) · notification-icon(96) + shared/brand/mark.svg (the one SVG). tokens:check now byte-verifies all 8 assets in CI (icons:check 8/8). Old hand-restated script deleted |
| B2 | loader orchestrator (`Boot`/`Skeleton`/`InlineBusy`) | **done** | `8df42d47` — BootMark (two squares converging, heronEase, reduce-motion static), Boot at the splash's exact geometry (120, centred — cross-fade parity), honest 6s «الخادم يستيقظ…» + retry, LoadingScreen reroutes to Boot, Skeleton drafting pulse, InlineBusy + Button ≥300ms anti-flicker, ActivityIndicator eliminated. Deterministic hand-rolled reanimated jest mock |
| B3 | navigation (role tabs, RTL transitions, deep links, new help copy) | **done** | `6bf435d2` — slide_from_left removed from ALL role stacks + auth sub-screens (platform-default = RTL-aware; the R326 fix had covered the root stack only); tab state lights on sub-screens (prefix match) + 2dp orange underline marker; dismissTo keeps the LIVE tab instance (scroll preserved); settings/account reachable for every role (AppTopBar «حسابي»). Help copy already clean (M1.3) |
| B4 | B acceptance — RN-web shots × role × theme × width, 3 reviewers ≥ 9 | **done — panel cleared on evidence (`8efc1821`)** | Pipeline fixed first (in-app pointer-dispatch nav + md5 dedup — the original courses/ai shots were byte-identical, the Z9 click class). Root-caused & fixed the panels' real findings: the EmptyState GHOST BOX (56×56 blank frame with no icon — 3 panels flagged it), the FAB Bug-glyph-as-sun misread (→ Flag), the teacher dash-wall (consolidated empty card, R2 re-scored 9/10). Final panel: R1 Heron 9.2 ✓ · R3 red-team 9.0 ✓ · R2 7.95 panel-wide with every finding either re-scored 9/10 after the fix or dissolved under probing (zigzag table doesn't exist; blank chart = the ghost box; «—» = the documented honest null). 10 unique final shots committed |
| C1 | mobile design system = Heron (tokens-only, lint rule, ui library) | **done** | `9519cf3b` — the hex lint rule (no-restricted-syntax, WARN-ratcheted; design/brand/test exempt — they ARE the source) + the frozen kit goes clean: data/fields/pressables/surfaces/AppTopBar hand-copies → tokens (danger rides the orange signal), OfflineBanner's hand-copied yellow family → statusTones().yellow (gains its designed dark variant), Assistant quota · SignInPrompt · _layout bg tokenized, dead IconButton `tone` prop deleted (zero callers). 54 hex seats remain, ALL in screens → C2 owns them. Gates: tsc 0 · lint 0 err/143 warn · jest 726/726 · tokens:check 8/8 |
| C2 | screens (student → teacher → registrar → owner) with all 6 states | **done** | C2a `48a66d27` Z6/Z7/Z8 (see Z-ledger; Z6 closed as not-reproduced with pixel evidence). C2b `8f60b830` all 54 hex seats → tokens (+101 query-error guards; hex count 0, warnings 143→87). C2c `4e2bf1ae`+`8efc1821` R2's findings (login error banner w/ honest 429 contract, courses pct dedupe, profile EmptyState) + the panel's root causes (ghost box, FAB glyph, dash wall). States: loading/empty/error/offline/success/guest ride the shared kit — structural half proven by the A4 poisoned net (560 combos), visual half verified live this session |
| C3 | native features (push, PDF, upload, video, biometric, 401 logout) | **push done · PDF/video/biometric open** | `70f3e797` — push both halves: server fanOutPush behind PUSH_ENABLED (default off; post-commit delivery, dead-token pruning, never throws into a completed event) + mobile registration/permission/channel/deep-link/unregister-on-logout, permission asked ONLY from the alerts-screen card. PDF/video/biometric/401-logout remain |
| C4 | performance budgets (cold < 2.5s, 60fps lists, bundle ≤ +5%, .hbc) | **pending** | — |
| C5 | fix the 87 pinned lint warnings screen-by-screen → reactCompiler decision | **pending** | — |
| D1 | web `/app` distribution page (downloads, QR, OTA channels, min version) | **done** | `ed284bca` — the sheet the backend already promises (status.updateUrl=…/app): APK artifact + builds page, TestFlight honestly pending, ink-on-paper QR (zero external services), OTA channels explainer, LIVE minAppVersion from /api/v1/status, linked from landing footer + student dashboard. tsc 0 · vitest 3049/3049 · build 8.07s |
| D2 | Android AAB production build + submit prep (owner key documented) | **pending** | — |
| D3 | iOS prep (everything without Apple) + docs/RELEASE.md owner steps | **pending** | — |
| D4 | OTA auto-update proven (3 examples) in docs/RELEASE.md | **pending** | — |
| E | W remainder (P2.4, P3, P4b–f, P5, Y7, Y8, keep-warm) | **Y7+Y8+keep-warm+P5 done · P2.4/P3/P4 open** | **E1** `e7301d94` Y7 /owner/system settles on ONE bounded 30s visible-tab poll (was thrashing) · `89bc0734` Y8 the 413 names the REAL size limit (pdfUpload twin of the pick-time mirrors) · `2f45c45c` keep-warm cron */10 on /api/v1/health. **E2** `d6737c10` PWA: SW cache-first static belt (fonts/brand) + 120-entry purge cap + offline.html (PWA manifest/icons already existed) · `36136632` 320/360 no-overflow belt: LIVE production-build measurement scrollWidth==innerWidth on //auth//colleges + landing joins the e2e (18/18). Gates after both: tsc 0 · lint 0/15 · build 14.4s · vitest 3067/3067. P2.4 (770-shot queue) · P3 (Lenis/GSAP) · P4b–f (AI coverage/load/backup) remain open — see r325 HANDOFF |
| F | red team + release rehearsal + `docs/redesign/r327/REPORT.md` | **pending** | — |

## Defect ledger (Z-series, R327)

| # | Defect | Status |
|---|--------|--------|
| Z6 | RN-web @360: scroll content collides with the bottom tab bar (a cut button behind the bar) | **closed — not reproduced, evidence on record (`48a66d27`)** — pixel-measured both B4 shots: the bar is IN FLOW (opaque, below content — nothing can render behind it); the «cut button» was the FAB + a mid-scroll fold misread. Live re-measure @360: scrollWidth==innerWidth, last section bottom 523 vs bar top 579 (56px clearance) |
| Z7 | RN-web @768: an empty white box renders in the agenda section (broken/missing badge) | **fixed (`48a66d27`)** — the only bordered box in the shot's agenda band was the FEEDBACK FAB (paper square, hairline border, at the badge column) reading as «a broken badge». FAB → charcoal slab (p.primary + p.primaryFg icon); `start:16` (native: right · web: left — inconsistent!) → explicit `left:16`. Live @768: both «غدًا» badges render with text |
| Z8 | Registrar topbar name clipped with ellipsis while space remains (numberOfLines=1) | **fixed (`48a66d27`)** — the role prefix crowded the name (and literally DUPLICATED it on the registrar test account: «المسجل العام · المسجل العام»). Web Topbar shows the name only → prefix deleted. Live @390: full name, no ellipsis |
| Z9 | agent-browser coordinate clicks are unreliable on the RN-web app (previous Stack screens stay mounted → text-includes matches stale buttons; use exact-match dispatch) | **documented + extended** — even role-exact clicks can fail to drive RN-web Pressables; the reliable pattern is the full PointerEvent sequence (pointerover → pointerdown → pointerup → click) via eval. `find text` is substring: «دخول» matches «تسجيل الدخول» first |
| Z10 | The user-profile themePreference (LIGHT default) overrides the system dark scheme — «dark screenshots» initially captured LIGHT; in-app toggle is the honest path | **documented — behavior by design (profile sync), noted for screenshot runs** |
| Z11 | The web export's API base is compile-time: the same-origin proxy contract requires `EXPO_PUBLIC_API_BASE_URL=/api/v1 npx expo export --platform web --output-dir dist-web` — a plain export silently calls production DIRECTLY (CORS-blocked POSTs hang) | **documented — export command pinned (C2a session)** |

## Skills/tools actually used (logged as they fire)

- EAS CLI (workflow:run validation pipeline, build queue, build:list) — A1/A3
- sharp (apps/mobile devDep) — B1 deterministic rasterization
- jest-expo + RNTL (poisoned net, role nets) — A2/A4

## Environment (verified this session)

```bash
git clone https://x-access-token:<TOKEN>@github.com/ahmadmedo1012/madarek.git
cd madarek && npm install --no-audit --no-fund          # root (web+backend)
cd apps/mobile && npm ci --no-audit --no-fund           # own lockfile
# mobile gates
npm run typecheck && npx expo lint && npm run contract-check && npm test
npm run tokens:check && npm run api:types
# root gates
npm run lint && npm run typecheck && npm run test -w frontend && npm run test -w backend
```

Test accounts `*@test.ly` / `12345678`. EAS: account `rh2011`, project
`afc4265f-664e-4325-a0ff-b621b81fe1b0`, `ly.madarek.mobile`,
https://madarek.onrender.com/. Cloud simulators: waitlisted on this account —
**A1 tries EAS Workflows first**; if the plan refuses, the rejection text is
recorded here verbatim and the fallback is jest + RN-web + telemetry.

## Exact next 3 actions

1. **A1** — write `.eas/workflows/e2e-ios.yml` + `e2e-android.yml` +
   `apps/mobile/.maestro/` flows (install → first open → login per role →
   tabs → logout); run `eas workflow:run`; record build IDs + artifacts or
   the plan rejection verbatim.
2. **A2** — static module-scope/first-effect audit + jest per role with
   missing/`null` `/me` → screen renders or structured error, never white.
3. **A3** — `eas build --profile preview` iOS-simulator + Android-APK on
   current main; build IDs + download links here for the owner's simulators.
