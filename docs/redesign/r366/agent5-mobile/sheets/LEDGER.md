# R366 A5 — contact-sheet ledger (the committed evidence set)

30 sheets total = 15 before + 15 after — one per role × extended profile
(tablet 800×1280, dark-tablet, font-scale 2.0) for all five roles. Cells
≤480px, 12 cells per sheet; the SAME cell subset on both sides (prologue
00–03 always kept, evenly-spaced sample beyond 12), cut by the same tool.

- before/ — run 44098062444 (app_ref=main, run_number 29)
- after/  — run 44160072788 (branch 06337b4 incl. all fixes, run_number 43)

## Landscape — documented limitation (not in the ledger)

Pixel audit (PIL) proved every "landscape-2340x1080" capture on this harness
measured 1080×2340 PORTRAIT. Four capture mechanisms were attempted and all
are refused by this headless emulator configuration:
1. `wm size 2340x1080` — normalized back to portrait (w>h on a portrait-native panel)
2. AVD `config.ini` hw.lcd panel swap (015d1ab) — not honored by the action/image
3. `settings put system user_rotation 1` (593f84e) — ignored headless
4. `adb emu rotate` (06337b4) — console rotate not applied on `-no-window` swiftshader

The landscape PHONE's width class (891dp @420) is the SAME `wide` tier
(≥600dp) as the tablet profile that IS proven (RAIL-INTACT + centered column,
AV1/AV11) — identical code path (useResponsive → rail + content column).
The short-height squeeze dimension of true landscape remains unproven on
this harness and is recorded as such; the workflow keeps the rotation lines
so the profile self-corrects on any runner/image that honors them.

## Working (non-committed) sheets — transparency list

- Session-1 sheets (superseded): student ×4 + teacher-fs2 (/home/z/.r366/sheets/)
- Session-2 extended v1: 20 before + 19 after (landscape subsets fake-portrait — superseded)
- Session-2 a11y review: 10 after-core sheets (360×640@160+fs1.3 × light/dark × 5 roles)
- Session-2 v2/v3 runs: landscape subsets unusable; tablet/fs2/dark-tablet equivalent to v4
