# Y6 — the BOTTOM-STACK overlap evidence (R325)

Captured 2026-10-30, local Vite dev server (`--port 5206`) serving the
`r325/y6` worktree. Probe: `frontend/tests/r325/bottom-stack.spec.ts`
(Playwright project `r325`), run with `R325_EVIDENCE=before|after` —
the sheets below are the probe's own screenshots at the exact moment
each overlap state is asserted, plus each run's full log.

## The defect (before/ — the manager absent, r324 X1 rem numbers in place)

12 failed / 2 passed. The pairwise rect evidence from `probe-run.log`
(`getBoundingClientRect()` intersections the probe measured live):

| pair | viewport | boxes (x,y,w,h) | overlap |
|---|---|---|---|
| `.toast-stack` ∩ `.fb-fab` | 390 | toast (12,673.5,366,90.5) vs fab (18,732,42,40) | ~32px — the toast covers the FAB |
| `.toast-stack` ∩ `.fb-fab` | 1440 | toast (20,789.5,420,90.5) vs fab (18,842,115,40) | ~38px — the toast covers the FAB |
| `.cb-banner` ∩ `.toast-stack` | 320 | banner (0,652,320,48) vs toast (12,549,296,110.6) | ~7.6px kiss |
| `.cb-banner` ∩ `.toast-stack` | 390 | banner (0,796,390,48) vs toast (12,707.8,366,90.5) | ~2px kiss |
| `.cb-banner` ∩ `.toast-stack` | 1440 | banner (0,862,601,38) vs toast (20,773.5,420,90.5) | ~2px kiss |
| `.cb-banner` ∩ `.toast-stack` | 1920 | banner (0,949.3,801.3,50.7) vs toast (20,866.9,420,90.5) | ~8px kiss |

Root cause of the kisses: r324 X1 hoisted the toast stack with
hardcoded `2.4rem/3rem` seats — wrong at any root font-size (the fluid
rem root is 8.33px @1440 but 9.92px @390) and blind to the bar's real
height; the FAB was never in the model at all.

## The fix (after/ — lib/bottomStack.ts measuring every layer)

14 passed / 0 failed (`probe-run.log`). Every pairwise intersection
among [.cb-banner, .toast-stack, .fb-fab, .bottom-nav] **plus any
discovered interactive fixed/sticky bottom-band chrome** is empty at
320 / 390 / 1440 / 1920, paper and ink. The drop paths hold: accepting
the gate eases the toast to its natural seat (`landing-390-accepted-seat.png`,
bottom = vh − 80 ± 2), dismissing the toast drops the FAB to its own
seat (18px desktop / 72px+safe-area phone, ± 2), and every layer's
`inset-block-end` rides a pinned 200ms transition.

## Sheets

| file (before/ and after/) | state |
|---|---|
| `landing-320-toast-consent.png` (+ `-ink-`) | consent gate + toast, 320×700 |
| `landing-390-toast-consent.png` (+ `-ink-`) | consent gate + toast, 390×844 |
| `landing-1440-toast-consent.png` (+ `-ink-`) | consent gate + toast, 1440×900 |
| `landing-1920-toast-consent.png` (+ `-ink-`) | consent gate + toast, 1920×1000 |
| `landing-390-accepted-seat.png` | after «موافق» — toast at its natural seat (after/ only; the gate never yields a seat in before/) |
| `shell-390-toast-fab.png` | shell: toast above the dock, FAB above the toast |
| `shell-1440-toast-fab.png` | shell desktop: toast + FAB pair |
| `shell-390-fab-dropped.png` / `shell-1440-fab-dropped.png` | FAB back at its own seat after the toast dismisses |

Note: `shell-*-fab-dropped.png` is byte-similar across before/after by
design — with no toast and no gate on screen the FAB's seat is the same
natural 18px/72px in both worlds; the defect only exists under a toast.
