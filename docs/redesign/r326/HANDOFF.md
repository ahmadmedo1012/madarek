# R326 HANDOFF — «ONE PROJECT: WEB + APP, ONE MAIN»

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after EVERY step. Commit prefix `feat|fix|chore|docs(r326): …` ending with
> `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
> **One branch: `main`** (M0.3 done — feature work in local worktrees only).
> Never run root `npm run build`. Mobile gates live in `apps/mobile`
> (`typecheck`, `expo lint`, `contract-check`, `export`).

## The programme

R326 = unify the repo (M0) · fix the native crashes (M1) · native at web
beauty/UX (M2) · ship-ready apps (M3) · finish the R325 web remainder (W).
M-streams and W run in parallel; M0 went first.

## Status board

| Phase | Scope (short) | Status | Evidence |
|-------|---------------|--------|----------|
| M0.1 | merge `feat/mobile-expo` → `main`, all gates | **done** | merge `f3d1c17f`; root lint 0 err/15 warn · typecheck ×4 · fe 3049 ✓ · be 1981 ✓ · web build 8.4s · openapi regen timestamp-only · mobile typecheck ✓ lint 0 err contract 246/0 |
| M0.2 | repo hygiene | **done** | `69a790fa` — `.zcode/`, `.r308-capture-archive/` deleted; worklog + round-4/5 audits → `docs/history/`; unreferenced evidence (r304, r319-shell) deleted; `.gitignore` mobile section; clean-gate CSS baselines re-pinned `4a720886` (R326 override: 76/179 pre-exist on `fa5a066`, W-track owns the fix) |
| M0.3 | ONE branch | **done** | `a80931c5`; `git ls-remote --heads` → `main` only; ledger `docs/history/branches.md` (r322/map's 2 unique commits = superseded Heron study stubs, discarded with proof) |
| M0.4 | shared source of truth | **done** | `26fe7079` — `shared/design-tokens.json` is the ONE canon (9 triads · 41 semantic seats · both themes · spacing/radius/motion · mobile type ladder). `npm run tokens:build` emits BOTH halves: web `frontend/src/styles/tokens.generated.css` (same `@layer tokens`, imported before tokens.css — the hand seats + the reduced-motion kill compose on top) + mobile `apps/mobile/src/design/tokens.generated.ts`; `npm run tokens:check` byte-gates drift in ci.yml design-gates AND mobile.yml. The generation killed the first two drifts it existed to kill: mobile dark ink `#F6F8FA`→`#F6F6EE` (the web's R324 X22 override) · dark rule `#5C5C5A`→`#4A4A48` (the night hairline tier). Brand export → RN `<Logo>` (mark/lockups/wordmark geometry byte-shared + enforced; the X11 hairline ramp reproduced in viewBox units — no vector-effect on RN; 8-test net). openapi-typescript client: `src/api/schema.generated.ts` (19.7k lines of typed paths from the committed openapi.json) + `ApiData`/`ApiPath` helper surface (types-only, additive; generator runs via pinned npx — its ^5 typescript peer lags the app's TS6, the mobile tree stays untouched). Found+fixed on the way: the mobile.yml bundle-budget glob matched nothing (SDK 58 exports `.hbc` — a vacuous 0.00 MB pass since M0.6). Gates: mobile typecheck · lint 0 err · contract · jest 120/120 (render net + Logo) · export android 6.20 MB / ios 6.22 MB ≤ 8 · root lint 0/15 · typecheck ×4 · fe 3049/3049 · be 1996 · build 7.8 s · openapi timestamp-only · parity 200/200 · gate:clean (76/179 ratchets hold) · colors/motion/raw-css strict |
| M1.3 | crash causes a–c, e + nav/UX defects | **done** | `b063f4e2` — Intl lazy+safe ×7 sites, reactCompiler OFF, 5 unused native modules removed, RTL one-time reload, `slide_from_left` removed, `/auth/login` alias, SHEET jargon killed, help creds behind `EXPO_PUBLIC_PILOT_HELP_ACCOUNTS` |
| M0.5 | EAS OTA config | **done** | `app.config.ts`: `runtimeVersion: fingerprint`, `updates.url` + `ON_LOAD` + `fallbackToCacheTimeout: 0`; `eas.json` channels + `appVersionSource: remote` + preview `autoIncrement` |
| M0.6 | automation | **done** | `.github/workflows/mobile.yml` (gates→OTA both channels→preview build on native diff) + `deploy-smoke.yml` (buildId wait → health/logins/dashboard/OpenAPI); `render.yaml` buildFilter; `docs/RELEASE.md`; **EXPO_TOKEN secret set** (API-encrypted, HTTP 201). **Proven live on `f40181f1`**: Mobile workflow 3/3 jobs green — OTA published to production+preview branches; channels created+linked (production/preview/development); device manifest fetch with runtime headers → HTTP 200, manifestId `01a18f57-ceb5…`, launchAsset on assets.eascdn.net, 57 assets |
| M0.7 | update UX + min-version gate | **done** | `apps/mobile/src/lib/updates.tsx` — silent OTA check (cold start + foreground, 15s throttle) with «تحديث جاهز» toast; `/status` minAppVersion compare → blocking «يلزم تحديث التطبيق» screen; **live on Render** (buildId `f40181f1cb5c` serves minAppVersion/updateUrl) |
| M1.1 | crash visibility | **done** | client (ErrorBoundary root+navigator, global handlers, breadcrumbs, telemetry.ts) + backend (POST/GET/PATCH /client-errors, 15/15 tests) + owner inbox UI («أخطاء تطبيق الجوّال» in FeedbackInboxPage); E2E on local stack: anonymous report → owner inbox → review toggle; openapi 247→253 ops |
| M0.8 | `/app` distribution page | **pending** | — |
| M2.6 | push backend half | **done (registration)** | `PushDevice` model + `POST/GET/DELETE /me/push-devices` (the mobile proposal contract verbatim); reinstall upsert E2E-proven on local stack; `PUSH_ENABLED` env flag ready; the Expo fan-out + client wiring land with M2.6 |
| CI-green | the four r325-era reds fixed | **done** | `b159390d` — icons allowlist (indicators glyph alphabet), bundle 768→776 re-pin (+1.0% documented), shell widths 256/64→264/72 (P2.3 ladder), iOS drawer probe fill-aware (.nav-fill effective ground + lockstep settle), ScheduleStrip re-pin + aria-current restored, deploy-smoke OpenAPI tolerance. Hermetic e2e 144 passed before fixes; failing specs re-verified green (29+8+19+10) |
| M2.1–2.3 | brand, loaders, navigation | **pending** | — |
| M2.4–2.6 | design system, screens, device features | **pending** | — |
| M3 | store prep | **pending** | — |
| W | R325 remainder (P2.4, P2.6, P3, P4b–f, P5, Y7, Y8, P7) | **pending** | see `docs/redesign/r325/HANDOFF.md` |

## Defect ledger (Z-series, R326)

| # | Defect | Status |
|---|--------|--------|
| Z1 | mobile `expo lint` was a NO-OP gate (root eslint config ignored the whole tree) | **fixed** — own flat config + eslint-config-expo; 0 errors |
| Z2 | react-compiler purity violations in pre-existing screens (18 lint errors) | **pinned warn=87** — recounted at M0.4 (79 at pin + the M1.2 render-net/theme-toggle waves; M0.4 itself added ZERO new warnings); M2 fixes screen-by-screen |
| Z3 | clean-gate CSS baselines drifted (+11 dupes, +1 hover) from the r325 wave | **re-pinned with R326 override** (`scripts/r323/clean-baseline.json`); W-track P2.4/P2.6 retires them |
| Z4 | mobile.yml bundle-budget glob matched nothing — SDK 58 exports Hermes `.hbc`, not `*.js` → a vacuous 0.00 MB pass since M0.6 | **fixed** `26fe7079` — measures the real per-platform chunks (android 6.20 · ios 6.22 MB) and FAILS CLOSED when a platform exports no chunks |
| Z5 | the r321 rename ledger never covered `docs/history/audits/` after the M0.2 archive move — `rename-ledger-scan` (ci.yml design-gates) red on main since the move, invisible to the prior sessions (no CI credentials to watch it) | **fixed** — frozen-audit keep row added (the records quote the pre-rename navigation; history is not renamed); scan 0 OFF-LIST |

## Environment (verified commands)

```bash
git clone https://x-access-token:<TOKEN>@github.com/ahmadmedo1012/madarek.git
cd madarek && npm install --no-audit --no-fund          # root (web+backend)
cd apps/mobile && npm ci --no-audit --no-fund           # own lockfile
# mobile gates
npm run typecheck && npx expo lint && npm run contract-check
npm run tokens:check        # generated halves + RN brand port = byte-identical to the JSON
npm run api:types           # openapi.json → schema.generated.ts (pinned npx @7.13.0)
# root gates
npm run lint && npm run typecheck && npm run test -w frontend && npm run test -w backend
npm run build -w frontend && npm run api:openapi        # diff must be timestamp-only
npm run tokens:build        # regen both halves from shared/design-tokens.json
```

Test accounts: `*@test.ly` / `12345678`. EAS: account `rh2011`, project
`afc4265f-664e-4325-a0ff-b621b81fe1b0`, slug `madarek-mobile`,
`ly.madarek.mobile`. Cloud simulators are NOT available on this account
(waitlist) — device-matrix evidence comes from EAS Workflows + Maestro if
the plan allows, else jest render tests + RN-web export sheets + the new
crash telemetry.

## Exact next 3 actions

1. M2.1–M2.3 — seat the unified brand in the app (splash · auth · headers
   draw the RN `<Logo>` from M0.4), the Heron loaders, and the navigation
   polish — consuming the shared tokens surface.
2. M0.8 — the `/app` distribution page (web): download links, OTA
   channels explainer, QR + store badges when M3 lands.
3. D3 wave — M2.4–M2.5 (student/teacher screens on the design system) ·
   M2.6 client half (Expo push wiring + owner inbox) · W P2.4/P3.

## Work order

- **D1 (done):** M0.1–M0.3 + M1.3 quick fixes + M0.5 + HANDOFF.
- **D2 (all but M2.1–2.3 done):** backend wave ✓ · M0.4 ✓ `26fe7079` ·
  M0.6–M0.7 ✓ · M1.2 ✓ (render net `43dadb04`) · **remaining:
  M2.1–M2.3** (the `<Logo>` + shared tokens they consume landed with
  M0.4).
- **D3:** M2.4–M2.5 (student/teacher) · M2.6 push · W P2.4/P3.
- **D4:** remaining roles · M0.8 · M3 · W P4(c–f)/P5.
- **D5:** red team + release rehearsal + report.
