# R334 Mobile Mission — MERGE PACKAGE (for the lead)

Branch: `feat/mobile-r334-pro` · Base: `origin/main` @ `7d4ba8b` · Final head: _pending (kept current)_

## 1. Changed paths outside `apps/mobile/**` & `docs/mobile/**`
- **None.** (Must remain none — anything needed elsewhere is in `LEAD-REQUESTS.md`.)

## 2. Native-change list (does the lead need a new EAS Build / fingerprint bump?)
- Round 1: **none** — only already-installed native modules are used (see HANDOFF baseline).
- Updated per phase below as work lands.

## 3. CI/workflow changes needed
- None expected. Mobile jobs must stay green on the branch; no gates/baselines/budgets weakened.

## 4. Known conflict hot-spots with `main`
- None so far — all Round-1 work is inside `apps/mobile/**` + `docs/mobile/**`, merges conflict-free.
- Watch-outs for the lead: `src/components/ui/toast.tsx`, `data.tsx`, `fields.tsx`, `states.tsx`, `src/design/theme.tsx`, `src/lib/queryClient.ts`, `src/lib/format.ts` were modified additively (all pre-existing exports/signatures preserved — grep-verified + tsc + render-net 113/113). If `main` touches these files, prefer this branch's version and re-apply main's deltas.

## 5. Test / gate results
- Baseline (before changes, branch start): tsc 0 (verified on clean branch).
- **After Round 1 (foundations + audits) — ALL GREEN, sandbox-verified:**
  - `tsc --noEmit` → **0 errors**
  - `jest` full suite → **984/984 passed (26 suites)** — up from the 726 baseline; foundations added ~258 tests
  - `expo lint` → **0 errors, 2 warnings** (both pre-existing on main in `src/brand/**`: `primitives.tsx` unused export, `usePlanDraw.ts` set-state-in-effect — NOT introduced by this branch)
  - `contract-check` → no drift · `tokens:check` → green (icons byte-identical)
- Final: _pending_

### Round 1 deliverables (all merged, conflict-free)
- `src/motion/**` (14 files: presets, PressableScale, entrance, Skeleton, CountUp, RingProgress + 6 test suites, 52 tests)
- `src/haptics.ts` (throttled, persisted, Android-mapped; 24 tests)
- `src/components/ui/sheet.tsx` (AppSheet + Confirm/Action/Filter/Picker presets on @gorhom/bottom-sheet v5, lazy native load) + toast queue upgrade (44 consumers unchanged) — 16 tests
- `src/components/ui/data.tsx` → DataList on FlashList v2 (+usePagedList, makeRow; web fallback) — 25 tests
- `src/components/ui/form.tsx` + upgraded `fields.tsx` (FormScreen, Arabic zod validation) — 23 tests
- `src/design/semantic.ts` + `statusbar.tsx` + `type.ts` + numerals in `lib/format.ts` (40 tests)
- `src/components/ui/states.tsx` blueprint-room Empty/Error/Offline + `src/lib/resilience/**` (network banner, query persistence, exam answer queue) + queryClient retry defaults (42 tests)
- `src/lib/errors.ts` Arabic humanizeError (+tests)
- Docs: arsenal, route-inventory (125 routes audited), audit-static, 8 foundation guides
- 401-refresh single-flight: **verified present** in `src/api/client.ts` (no gap)

## 6. Rollout plan
- JS-only changes → OTA via EAS Update on the production channel **by the lead** (this branch never publishes to production/preview).
- Any native change (none planned) → EAS Build + `min-version` gate per `docs/RELEASE.md`.

## 7. Verification matrix
| Area | Status |
|---|---|
| Foundations (motion/haptics/sheets/lists/forms/theming/resilience) | **jest+typecheck-verified** (984/984, tsc 0) — device behavior unverified (no emulator; owner validates on EAS preview build `1cd3219d`) |
| Screens (Phase D) | Round 2 in progress |
| RN-web captures | Round 3 |
| Performance budgets | Round 3 |
| Every claim carries an explicit label: device-verified / emulator-verified / RN-web-verified / unverified | enforced |

## 8. Before/after gallery index
- `docs/mobile/screens/<name>.md` per screen (thumbnails ≤150 KB committed; full captures in Release asset `evidence-r334`, not git).
