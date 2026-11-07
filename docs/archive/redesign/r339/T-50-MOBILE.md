# T-50 — Mobile P1 tickets (Track E, part 1)

Branch `r339/t50` (base main 9c7661b3). Scope: `apps/mobile/**` only.
Inputs: `docs/mobile/review/{review-1,review-2,review-3,FIXES}.md`.

## P1 work-list → status

| ID (source) | Class | Screen(s) | Fix | Status |
|---|---|---|---|---|
| R2 P0-1 (→P1) | bidi isolation | courses, dashboard, results, teacher-students | `BidiText` + `isolateLatinRuns` in ui/text (nested-`<Text>` `ltrText` islands, copy byte-identical, digits stay inline); applied at boundary-Latin strings («· SE301», agenda sublines, course titles, offering summary) | ✅ done (+6-case test net) |
| R3 §4.1 (10 seats; 4 already fixed by A-Fix-P0s) | motionless screens | online-exams, calendar, intelligence, teacher students, teacher exams (+detail), admin students | `useStaggerEntrance({base:40,step:60})` on first content block + `haptics.selection()`/`impact("light")` on segments, pickers, rows, primary actions — all through the existing `@/motion` + `@/haptics` kit, zero new animation code | ✅ done (6 seats this pass; register/notifications already had motion) |
| R1 T12 | calendar motion | calendar | stagger + month-swap `fadeIn` (remount key) + day/month haptics | ✅ done |
| R2 P1-4 / R3 P0-2 | sparse-state dead space | kit-wide | `EmptyState fill` prop (grow + optical center); `DataList` contentContainer `flexGrow:1`; applied: exams center, teacher students, grades ×2, live | ✅ done (opt-in; inline section empties unchanged) |
| R3 P0-5 / R1 T6 | state grammar | teacher students | bare Card+text true-empty → `EmptyState room="library"` | ✅ done |
| P1-d | predictive back | app.config.ts | `predictiveBackGestureEnabled: true` (grep-verified: zero `BackHandler` overrides in app/) | ✅ flag set — **ships with T-51 build** |

Not done (time-boxed; hand to T-51/T-52 or next pass): R2 P1-5 exams chip
hierarchy, R2 P1-6 live CTA competition, R1 T15 settings grouping, R1 T9
transcript virtualization, profile 30-row grouping (R1 T22), muted-ink AA
audit (R2 P1-7).

## Gates (baseline → final)

| Gate | Baseline | Final |
|---|---|---|
| `tsc --noEmit` | 0 errors | **0 errors** |
| `jest` | 38 suites / 1154 green | **39 suites / 1160 green** (+6 BidiText) |
| `expo lint` | 0 err / 15 pre-existing warnings | **0 err / 15 pre-existing warnings** (none in touched files) |
| `tokens:check` | — | **clean** (assets byte-identical) |
| `contract-check` | — | **no drift** |

## Notes for T-51 / T-52

- **T-51 (Android build)**: `predictiveBackGestureEnabled: true` is native
  config — needs the gradle/EAS build + fingerprint bump to take effect
  (OTA cannot ship it). Also verify day-strip re-capture (R1 T7) on device.
- **T-52 (build workflow)**: include `expo-navigation-bar` (LR-001) in the
  same native pass.
- `npm install` in this sandbox needed `--cache /tmp/t50-npm-cache` (shared
  cacache corruption) — note for CI parity if it recurs.
- No emulator: motion/haptics are code-verified only (reduced-motion gates
  by construction via `useStaggerEntrance`/reanimated `ReduceMotion.System`).
