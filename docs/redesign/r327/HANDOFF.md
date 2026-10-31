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
| B3 | navigation (role tabs, RTL transitions, deep links, new help copy) | **pending** | — |
| B4 | B acceptance — RN-web shots × role × theme × width, 3 reviewers ≥ 9 | **pending** | — |
| C1 | mobile design system = Heron (tokens-only, lint rule, ui library) | **pending** | — |
| C2 | screens (student → teacher → registrar → owner) with all 6 states | **pending** | — |
| C3 | native features (push, PDF, upload, video, biometric, 401 logout) | **pending** | — |
| C4 | performance budgets (cold < 2.5s, 60fps lists, bundle ≤ +5%, .hbc) | **pending** | — |
| C5 | fix the 87 pinned lint warnings screen-by-screen → reactCompiler decision | **pending** | — |
| D1 | web `/app` distribution page (downloads, QR, OTA channels, min version) | **pending** | — |
| D2 | Android AAB production build + submit prep (owner key documented) | **pending** | — |
| D3 | iOS prep (everything without Apple) + docs/RELEASE.md owner steps | **pending** | — |
| D4 | OTA auto-update proven (3 examples) in docs/RELEASE.md | **pending** | — |
| E | W remainder (P2.4, P3, P4b–f, P5, Y7, Y8, keep-warm) | **pending** | see `docs/redesign/r325/HANDOFF.md` |
| F | red team + release rehearsal + `docs/redesign/r327/REPORT.md` | **pending** | — |

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
