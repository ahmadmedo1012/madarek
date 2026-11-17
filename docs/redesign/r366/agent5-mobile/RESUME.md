# RESUME — Agent 5 · R366 Native Mobile

Log of executed work with evidence. Newest at the bottom.

## Environment inventory (first 30 min)

- Sandbox: Java 21 present; **no adb / Android SDK / Maestro / emulator locally** → emulator
  evidence rides the GitHub Actions `ui-screens.yml` (dispatch via REST works: HTTP 204).
- Node v24.22.3, npm 11.19.1. Repo cloned @ `7a09745` (matches stated main HEAD).
- Credentials saved `~/.madarek-env` (chmod 600). Never committed.
- Baselines measured (see CHECKLIST header): tsc 0 errors; jest 1252/1252; copy-mobile CLEAN
  13043 words/174 screens; worklet-audit pending root node_modules.

## 2026-11-17 — setup

- Branch `agent/r366-native-mobile` created from origin/main.
- Before-set dispatched on main: ui-screens student role → run 44091736405 (later failed — see pipeline fix).

## 2026-11-17 — L2 responsive shell (commit de01bd3)

- `src/hooks/useResponsive.ts`: M3 window classes + CONTENT_MAX_WIDTH=640 (+tests).
- `Screen`/`FormScreen`: responsive content column on ≥600dp (paper stays full-bleed) + `wide` opt-out.
- `RoleTabBar`: rail axis (vertical) for ≥600dp windows — start-pinned under RTL, hairline on
  content edge, vertical dot travel, immersive slide flips to X. All 5 (tabs) layouts flip
  `tabBarPosition` + orientation. jest +19 → 1271/1271.

## 2026-11-17 — L1 pipeline (commits 8c3f3cc, 19e1510)

- ui-screens.yml: `profile_set` input (core|extended); extended matrix = tablet 800×1280@160,
  landscape 2340×1080, font-scale 2.0, dark tablet; twin job sharing the preview APK.
- All 5 screens-*.yaml flows: +35 deep stops (student 10, teacher 8, registrar 6, quality 3,
  owner 8) via deep links; 12–19 screenshots per role profile.
- **PIPELINE BUG FOUND+FIXED**: android-emulator-runner executes the `script` field LINE BY
  LINE (sh -c per line) — the R362-era multi-line for/if assert+retry blocks were syntax
  errors ("expecting done"); main's own ui-screens runs had silently broken since (runs
  44091736405, 44094644445 died at the for line with ZERO screenshots). Rewritten as
  line-safe one-liners (device-shell assert loop; ||-chained retry). Every non-comment line
  of both scripts passes `sh -n` standalone.
- gfxinfo jank capture added (reset before flow, dump after) to both jobs.

## 2026-11-17 — L4 copy diet (commits ba4eb73 → 7fa85f4)

- 16 batches, ~800 substitutions across ~100 screens/features; three systematic passes
  (verbose strings >5 words; tier-2 3+-word; tier-3 2+-word) + grammar-filler rules
  (لا توجد→لا، البريد الإلكتروني→البريد، إجمالي→∅) + **shared product-copy constants**
  (`src/lib/copy.ts` — the same labels were re-typed in up to 11 screens; DRY + counted once).
- **13043 → 10419 Arabic words (−20.1%)**; ratchet ceilings lowered in-lockstep in the same
  commits (helper `lower-ceilings.mjs` reuses the GATE'S OWN scanner — lexer can't drift).
- Counted-noun grammar (countAr four-form families) preserved — two honest reversions.
- Gate CLEAN; jest 1271/1271; test pins updated where copy changed.

## 2026-11-17 — L2/L5 sweeps

- sp-token migration: 12 worst inline-spacing screens, 134 literals → sp[N] (commit e04a4b0).
- a11y: **0 raw Pressable/Touchable without accessibilityLabel/Role** across app+src
  (385 accessibilityLabel instances; kit Button defaults label→a11y).
- expo-doctor: **20/20 checks** after aligning all 21 Expo SDK-58 packages (commit 05f8518;
  jest 1271/1271, tsc clean, contract-check no drift).
- PARITY.md: 20-flow web↔mobile table (commit 8240f81). REQUESTS written to Agent 2
  (MOBILE-BOOT-SPEC) and Agent 3 (layout.contentMaxWidth seat).

## 2026-11-17 — L1 evidence: BEFORE-SET analysis (student, extended profiles)

Run 44098062444 (fixed scripts; app_ref=main, my flows) — student jobs GREEN:

- Artifacts downloaded (fs2 / tablet / landscape), contact sheets cut (≤480px cells,
  3 sheets used of the 40 budget), **VLM defect review** (glm-5.3-flash):

### Defect list (screen → defect → action)

| Screen | Defect (VLM, before-set) | Action |
|---|---|---|
| student-14-achievements | «الصفحة غير موجودة» — my flow deep-linked /student/achievements but the route is ROOT /achievements | FIXED in flow (flow bug, not app) |
| student-08-schedule | event titles truncate mid-word at fs2 (time crowds the row); room badge clipped on landscape | FIXED: row wraps; title 2 lines (commit 32ead51) |
| student-09-calendar | weekday header clipped at fs2 (fixed 7-col geometry) | FIXED: maxFontSizeMultiplier 1.3 on grid labels |
| student-12-materials | file titles truncated at fs2 | FIXED: titles 2 lines |
| student-11-library | author/rating lines cramped at fs2 | titles already 2-line; re-check in after-set |
| student-04-courses | course title ellipsized at fs2 | already 2-line; re-check in after-set |
| settings (02/03) | code badge clipped at fs2 | re-check in after-set (chip geometry) |
| ALL screens (tablet) | phone-only layout stretched edge-to-edge — sparse, wide reading lines | ROOT-FIXED by responsive column + rail (de01bd3); after-set will prove |
| ALL screens (landscape) | portrait-only squeeze; bottom bar crowding | ROOT-FIXED by rail at ≥600dp width; after-set will prove |
| student-05-ai (landscape) | composer clipped at bottom edge | immersive tab-bar policy already handles keyboard; re-check after-set |

### Cold-start evidence (before-set, swiftshader emulator)

- tablet 800×1280@160: **Displayed +1s569ms** (target ≤2.5s MET even on software GPU)
- landscape: Displayed +3s627ms; fs2 first boot +5s891ms / warm relaunch +2s896ms
- Caveat (documented): these run on swiftshader software rendering — slower than any
  real mid-range device; the AFTER-set on the same harness gives the honest relative delta.
- Boot/splash hand-off: splash bg #F6F6EE/#282828 == heron light/dark bg (tokens); splash
  held until fonts+RTL ready; Stack contentStyle from tokens — flicker-free by construction;
  launch-20s.png in every artifact shows the first painted frame (no white flash observed).

### gfxinfo (before-set, student, whole-walk aggregate)

- fs2: 457 frames, 87.96% janky, p50 81ms — swiftshader software rendering; usable ONLY as
  the before/after relative baseline (same harness), NOT against the ≤5% device target.
  Tablet/landscape gfxinfo.txt captured in artifacts for the same comparison.
