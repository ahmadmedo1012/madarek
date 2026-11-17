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

## 2026-11-17 — L1 BEFORE-SET: full all-roles evidence (run 44098062444)

Session continuation. Run 44098062444 (app_ref=main, extended, role=all) finished GREEN
on all 20 capture jobs + preview APK. Board state around it:

- Previous session's dispatch poller (`/home/z/.r366/dispatch-poller.sh`) was found STILL
  RUNNING; it had dispatched 44102959939 (teacher:core:main — 4 core jobs, GREEN except
  light-a11y-small) and 44109069839 (registrar:core:main, in progress). The poller was
  killed and its remaining queue consolidated into a new sequential chain
  (`chain2.sh`: after-core → before-core-all) after the manually-dispatched after-set.
- 44102959939 teacher light-a11y-small FAILURE root-caused from the job log: the
  emulator's `system-images;android-34;google_apis;x86_64` zip failed to prepare
  ("Error on ZipFile unknown archive") → the AVD never booted → the walk step died
  before ANY screenshot existed (no artifact uploaded). GitHub infra flake, not an
  app/flow failure; the queued all:core:main rerun re-covers that profile.
- GitHub queueing lesson (documented for future runs): in a per-ref concurrency group
  the NEWEST QUEUED run supersedes (cancels) older queued ones — three rapid dispatches
  collapse into one. All dispatches after this note go ONE AT A TIME.

### Artifacts + sheets

- All 21 artifacts downloaded (`/home/z/a5-work/before/`): 20 capture jobs + preview
  APK (19,247,754 bytes — matches the CHECKLIST's before-APK figure exactly).
- 20 before contact sheets cut (`sheets/before/sheet-<role>-<profile>.jpg`, 12 cells
  each, cells ≤480px; prologue 00–03 always kept; beyond 12 an evenly-spaced sample —
  the SAME subset is reused for the after sheets, so the comparison is honest).
  Previous session's 5 sheets (student ×4 + teacher-fs2, `/home/z/.r366/sheets/`) kept
  as provenance; the final committed L6 set is the 40-sheet ledger (20 before + 20 after).

### VLM defect review (20 sheets + 20 full-res verifications)

Defect classes, triaged against code ground truth (TabBar is in layout flow — no
overlay possible; StackHeader back is ArrowRight in RTL by construction; "local-logo"
is the honest provider badge, verbatim by design):

| Class | Verdict | Action |
|---|---|---|
| "Last row cut by tab bar / screen edge" on scrollable lists (student library/my-data/gamification, teacher students/intelligence/attendance/assignments/materials, quality dashboard/reports/engagement, registrar faculties/directory/digital, owner system/dashboard) | FALSE POSITIVE — mid-scroll state on Screen(scroll) bodies; tab bar sits in layout flow below content | none (logged) |
| RTL chevron direction (registrar landscape back arrows "point wrong", quality professors header arrow, student calendar chevron) | FALSE POSITIVE — StackHeader renders ArrowRight (back = right in RTL); landscape reads contradicted the tablet reads of the same screens | none (code-cited) |
| Ring inner label collides with the arc at fs2 (student dashboard «أرقام هذا الفصل» 44dp ring + attendance 64dp ring; two independent VLM reads) | REAL | FIXED — maxFontSizeMultiplier 1.25 on both inner labels (commit 18a7213) |
| Login footer links «نسيت كلمة المرور؟/إنشاء حساب جديد» collide at fs2 (previous session's teacher-fs2 review) | REAL | FIXED — wrap + gap + tap padding (commit f67d745) |
| Teachers search placeholder truncated at fs2 («ابحث بالاسم أو البريد الإلكترون..») | REAL on main; ALREADY fixed on branch by the copy diet (SEARCH_NAME_OR_EMAIL now «ابحث بالاسم أو البريد…») | after-set proves |
| Settings numerals Segmented chip truncated at fs2 («٠١٢٣ عربية-هن..») | REAL on main; ALREADY fixed on branch (770906f chip geometry) | after-set proves |
| Calendar weekday labels / schedule rows / materials titles at fs2 | REAL on main; ALREADY fixed on branch (32ead51, 770906f) | after-set proves |
| Tablet phone-stretch + landscape portrait-squeeze | REAL on main; ALREADY fixed on branch (de01bd3 rail + column) | after-set proves |
| Owner realtime card label "طلبات الذكاء الا..." truncated | UNREPRODUCIBLE — StatLine labels wrap by construction (no numberOfLines); the only AI-ish label is «طلبات AI / دقيقة» which fits; VLM misread | none (logged) |
| «مزوّد: local» raw provider id in AI header (fs2/tablet reads) | INTENTIONAL — the honest provider badge renders the id verbatim by design (capture env = local backend); not a layout defect | none (logged) |
| Registrar dashboard badge overlaps timeline (dark-tablet) | FALSE POSITIVE (full-res verify: NOT) | none |
| Status-bar overlap (student calendar dark-tablet) | FALSE POSITIVE (full-res verify: NO-OVERLAP) | none |

### Before-metrics (all 20 jobs; swiftshader harness — relative baseline only)

```
JOB                              FRAMES  JANKY%   DISPLAYED
owner-dark-tablet                  443   74.04   +3s779ms
owner-light-fs2                    374   91.44   +3s460ms
owner-light-landscape               445   73.71   +3s241ms
owner-light-tablet                  528   57.77   (no line*)
quality-dark-tablet                409   60.15   +2s382ms
quality-light-fs2                  315   83.49   +2s472ms
quality-light-landscape             350   69.43   +3s475ms
quality-light-tablet               427   57.14   +2s34ms
registrar-dark-tablet              546   53.30   +2s536ms
registrar-light-fs2                444   79.73   +1s993ms
registrar-light-landscape           487   65.09   +2s543ms
registrar-light-tablet             558   53.41   +2s652ms
student-dark-tablet                624   63.46   +4s106ms
student-light-fs2                  457   87.96   +5s891ms (first-boot path)
student-light-landscape             549   71.77   +2s971ms
student-light-tablet               626   55.91   +2s491ms
teacher-dark-tablet                451   77.61   +6s201ms
teacher-light-fs2                  407   86.98   +2s74ms
teacher-light-landscape             438   74.89   +2s633ms
teacher-light-tablet               546   55.49   +2s656ms
```
* owner-light-tablet: the Displayed line fell outside the logcat window (first-boot
rotation); gfxinfo intact. After-set will report the same columns for the delta.

### CI board at this point (dispatch order = execution order)

1. 44109069839 registrar:core:main — in progress (poller's last dispatch)
2. 44110540931 all:extended:current (AFTER-SET) — pending, dispatched manually;
   branch tip at dispatch = f67d745 (ring caps + login links wrap included)
3. chain2: all:core:current (after-core)
4. chain2: all:core:main (before-core, re-covers teacher a11y-small too)
