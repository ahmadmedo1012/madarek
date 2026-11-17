# DELIVERY — Agent 5 · R366 Native Mobile

Branch `agent/r366-native-mobile` (baselined `origin/main` @ 7a097457).
This file is the closing record: what shipped, what was measured, what moved.
Full log of executed work with evidence: RESUME.md (same directory).

## 1. What shipped (commits, oldest→newest)

| Commit | Lane | Change |
|---|---|---|
| 8c3f3cc / 19e1510 | L1 | ui-screens extended matrix (profile_set input) + line-safe emulator scripts; +35 deep stops in all 5 flows; gfxinfo jank capture |
| de01bd3 | L2 | responsive shell: M3 width classes, ≥600dp side RAIL + 640dp content column (useResponsive, Screen/FormScreen, RoleTabBar rail axis); jest +19 |
| ba4eb73…7fa85f4 | L4 | copy diet 16 batches + shared `src/lib/copy.ts`; 13043 → 10419 Arabic words (−20.1%); ceilings lowered in-lockstep |
| e04a4b0 | L2 | 12 worst inline-spacing screens migrated to `sp` tokens (134 literals) |
| 05f8518 | L5 | all 21 Expo SDK-58 packages aligned — expo-doctor 20/20 |
| 32ead51 | L2 | fs2 defect batch 1 from emulator evidence (row wrap, 2-line titles, grid-label caps) |
| 770906f | L2 | teacher-fs2 batch (schedule row wrap, Badge/Segmented chip geometry, SelectField wrap) |
| 18a7213 | L2 | ring inner labels capped at 1.25 (fs2 ring-overflow class) |
| f67d745 | L2 | login footer links wrap at fs2 |
| 09c07bf | L2 | stat-card labels wrap to two lines (KpiCard kit + dashboard trio) |
| 015d1ab / 593f84e | L1 | landscape capture harness: AVD panel swap + system rotation lock (see §5) |

## 2. Gates (before → after)

- Jest mobile: **1252/1252 → 1271/1271** (+19 responsive/a11y tests; 51 suites)
- `tsc --noEmit`: 0 errors (both ends)
- copy-budget-mobile: CLEAN both ends; ceiling sum lowered 13056 → 10419 words in-lockstep with the diet
- worklet-audit: LAWFUL (243 files, 0 violations)
- expo-doctor: 20/20 checks (after 05f8518)
- **APK size: 19,247,754 → 17,991,084 bytes (v1 pair; v2 17,991,145; v4 17,991,150) = −1.26 MB / −6.5%** — the ≤ +1 MB gate passes with the APK SHRINKING
- `android-latest` release pipeline untouched (no changes to build-android.yml)

## 3. Emulator evidence (the ui-screens program)

All capture runs on the same hermetic harness (API-34 emulator, swiftshader,
runner-local Postgres + media fixture). Run inventory:

| Run | Set | Result |
|---|---|---|
| 44098062444 (29) | before extended (main) | 21/21 green |
| 44102959939 (30) | before core teacher | 3/4 green (light-a11y-small: corrupt SDK system-image zip — infra flake, zero screenshots) |
| 44109069839 (31) | before core registrar | 4/4 green |
| 44127328335 (36) | after core (branch) | 21/21 green |
| 44136454642 (38) | before core all roles | 21/21 green (re-covers 30's flake) |
| 44110540931 (35) | after extended v1 (branch) | 20/21 (owner-dark-tablet cancelled externally; landscape shots portrait — harness bug, see §5) |
| 44144986235 (39) | after extended v2 (branch) | 21/21 green (landscape still portrait — config.ini not honored) |
| 44152506555 (41) | after extended v3 (branch 593f84e) | 21/21 green (landscape still portrait — user_rotation ignored) |
| 44160072788 (43) | after extended v4 (branch 06337b4) | 21/21 green — THE after evidence of record |
| (before-ext-v2/v3) | cancelled before start | sent ahead of verification; lesson logged |

### 3.1 Defect triage (all roles; VLM sheet reviews + full-res verifications)

REAL and FIXED on the branch:
- fs2 ring inner labels collide with the arc (student dashboard 44dp + 64dp rings) — 18a7213; proven AV7 (RINGS-OK)
- fs2 login footer links collide — f67d745; proven AV10 (LINKS-OK)
- stat-tile labels ellipsize at 360dp/fs1.3 + fs2 KpiCards — 09c07bf (KpiCard kit + trio)
- fs2 calendar weekday labels / schedule rows / materials titles / numerals chip / search placeholder / SelectField — 32ead51 + 770906f + the copy diet; proven AV8 (+ placeholder/chip resolved by branch copy)
- tablet phone-stretch + landscape portrait-squeeze (as a CLASS) — de01bd3; tablet proven AV1/AV11 (RAIL-INTACT, rail + centered column)

FALSE POSITIVES (closed with code ground truth or full-res checks):
- "content cut by the tab bar" on scrollable lists — TabBar is in layout flow; the class is normal mid-scroll state
- RTL chevron direction claims — StackHeader renders ArrowRight (back = right in RTL) by construction
- system status-bar clock at fs2 — system chrome, outside app control
- quality rail "clipped" — RAIL-INTACT (AV1); the active-tab dot "covering" the icon — 6dp dot at the bar's outer edge, geometry test-pinned (AV23 misread)
- quality dashboard stat cards without values — pre-existing capture-env data state (before-equal, full-res verified both sides)
- «مزوّد: local» — the honest provider badge (verbatim by design)

## 4. Before → after metrics (swiftshader harness — relative baseline only)

### 4.1 Cold start (Displayed, am start → first frame)

Extended matrix (v1 pair, student role worst-case): fs2 first-boot 5.891s → warm
relaunch 2.9s; tablet 2.491s; landscape ~2.97s. Target ≤ 2.5s met on the tablet
profile even on software rendering; the ≤5% jank device target needs real
hardware — the harness records the honest relative delta instead (documented
caveat in RESUME). Full per-role tables: RESUME.md (before-metrics + after-metrics).

Core matrix (runs 38 → 36): a11y-small profiles land +2.1s–4.2s; standard
+2.3s–6.3s. Full tables in RESUME.md.

### 4.2 gfxinfo janky %

Recorded per run in RESUME.md (before/after per profile); swiftshader software
rendering makes absolute % meaningless — recorded as the relative baseline.

## 5. Landscape harness bug (found + fixed; the honest record)

Pixel audit (PIL) proved every "landscape-2340x1080" shot in runs 29/35 measured
1080×2340 PORTRAIT: `wm size 2340x1080` is silently ignored on the portrait-native
AVD panel. All pre-R366 "landscape" evidence was portrait mislabeled landscape.
No app bug existed — at 411dp compact the bottom bar IS the correct M3 shell.
Four capture mechanisms were attempted; ALL are refused by this headless
configuration (wm size w>h normalized to portrait; config.ini hw.lcd not honored;
settings user_rotation ignored; `adb emu rotate` not applied on -no-window).
Landscape is delivered as a DOCUMENTED LIMITATION (sheets/LEDGER.md): the
landscape phone's 891dp is the same ≥600dp tier proven on the tablet (AV1/AV11,
identical useResponsive code path), the short-height dimension stays unproven,
and the workflow keeps the rotation lines so the profile self-corrects on any
runner that honors them.

## 6. Parity + requests

- PARITY.md (8240f81): 20-flow web↔mobile table with tokens/states mapping.
- REQUESTS-agent5-to-agent2.md: MOBILE-BOOT-SPEC seat (splash/boot numbers).
- REQUESTS-agent5-to-agent3.md: layout.contentMaxWidth token seat.

## 7. Coverage statement (the ≤40-sheet ledger)

Committed contact sheets: **30 = 15 before (run 29) + 15 after (run 43)** — one
per role × extended profile (tablet 800×1280, dark-tablet, fs2), 12 cells each
(6–12 crops rule), cells ≤480px, same cell subset on both sides (sheets/LEDGER.md).
Landscape slots are excluded per the §5 limitation. Core profiles (a11y-small
360×640@160 + fs1.3, standard) are covered by the run-36/38 artifact reviews +
metric tables in RESUME.md (10 a11y working sheets listed transparently in LEDGER.md).
