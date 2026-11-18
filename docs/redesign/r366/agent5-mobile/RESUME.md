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

## 2026-11-17 — AFTER-SET v1 (run 44110540931) + the landscape harness discovery

### After-set v1 (extended, all roles, branch tip incl. f67d745)

- All 21 jobs GREEN except ONE job cancelled mid-flight by an external actor (see
  below): `owner — dark-tablet` (no artifact). The other 19 capture artifacts +
  preview APK downloaded; 19 after sheets cut (same 12-cell selection as before);
  VLM review + 13 full-res verifications.
- **Fixes PROVEN by full-res verification (the positive proofs)**:
  - Ring inner labels at fs2 — RINGS-OK (commit 18a7213 validated; AV7)
  - Calendar weekday labels at fs2 — LABELS-OK (32ead51 validated; AV8)
  - Login footer links at fs2 — LINKS-OK, fully separated (f67d745 validated; AV10)
  - Tablet rail + content column — RAIL-INTACT + RAIL-AND-COLUMN-OK (de01bd3
    validated; AV1/AV11 — rail on the START (right) edge under forced RTL, orange
    active dot, content column centered)
- **APK size**: before 19,247,754 → after **17,991,084 bytes (−1,256,670 / −6.5%)**
  (same ui-screens preview-APK pipeline both sides). The ≤ +1 MB gate PASSES with
  the budget actually SHRINKING (the copy diet's shorter strings are the likely
  driver).
- After-metrics (gfxinfo + Displayed) table cut for all 19 jobs — the L6
  before→after delta table assembles at closing.
- Pre-existing (before-equal, closed): quality dashboard stat cards render label
  without numeric value in the hermetic capture env — full-res verified on BOTH
  sets (data state, not a layout regression; quality KPI endpoints return nulls
  under MADAREK_TEST_ACCOUNTS=1 — noted for the backend owner, not mobile).
- VLM false-positive classes on the after sheets (same families as before,
  re-confirmed and closed): mid-scroll bottom clips on scrollable lists; RTL
  chevron direction (code: StackHeader ArrowRight); system status-bar clock at
  fs2 (system chrome, outside app control); quality rail "clipped" (AV1:
  RAIL-INTACT — misread of the hairline edge).

### THE LANDSCAPE HARNESS BUG (pixel-verified, fixed in 015d1ab)

- PIL dimension audit: every "landscape-2340x1080" shot in runs 29 (before) and
  35 (after) measures **1080×2340 PORTRAIT** — `wm size 2340x1080` is SILENTLY
  IGNORED on the portrait-native AVD panel. Portrait-shaped overrides work
  (800×1280 tablet and 360×640 small both apply), landscape-shaped ones do not.
- Consequence: ALL "landscape" evidence to date (both sessions' reviews) was
  portrait shots mislabeled landscape. No app bug exists — at 1080×2340@420 the
  window is 411dp (compact) and the bottom bar IS the correct M3 shell for that
  width; the rail engages from 600dp (proven on the 800dp tablet).
- Fix (commit 015d1ab): the AVD panel itself is created landscape before first
  boot via a profile-conditional `hw.lcd.width/height` in pre-emulator-launch
  (one line, line-safe; density stays 420 → 2340px/2.625 = 891dp → rail tier).
  Both jobs' pre-launch blocks got the conditional (identical behavior for the
  core profiles which are never landscape).

### CI board incident + revised plan (one at a time, NO watchdog)

- A 30-min cron watchdog (created as session-death insurance) fired as a parallel
  agent instance, raced my manual dispatch (duplicate after-core 34s apart) and
  is the plausible canceller of the owner-dark-tablet job (cancelled between
  16:25–16:35 while all sibling jobs stayed green). The watchdog was DELETED; my
  duplicate after-core run was cancelled; the watchdog's own dispatch
  (44127328335) became THE after-core run. Lesson recorded: schedule-driven
  agents and inline polling must never both own a dispatch board.
- Revised queue (ONE AT A TIME; GitHub keeps only the newest QUEUED run per
  concurrency group — older queued entries get superseded/cancelled):
  1. 44127328335 after-core (all/core/current) — running
  2. before-core (all/core/main) — re-covers teacher light-a11y-small too
  3. after-ext-v2 (all/extended/current) — with the landscape panel fix; fills
     the owner-dark-tablet hole and re-proves all four extended profiles
  4. before-ext-v2 (all/extended/main) — the TRUE landscape before-set

## 2026-11-17 — landscape harness, attempts 2+3; a11y-core evidence

### Attempt 2 (run 39, after-ext-v2) FAILED — rotation fix follows

- Run 39 (after-ext-v2, branch 09c07bf) completed 21/21 GREEN but the pixel audit
  showed the landscape shots STILL 1080×2340 PORTRAIT: the pre-launch config.ini
  `hw.lcd.width/height` swap is NOT honored by this action/image combo (the panel
  comes from the system image, not late config.ini appends). The run's
  tablet/fs2/dark-tablet evidence remains valid (those profiles never depended on
  the landscape geometry); only its landscape subset is unusable.
- Fix (commit 593f84e): the standard CI rotation — `settings put system
  accelerometer_rotation 0` + `settings put system user_rotation 1`, applied
  profile-conditionally (one-liners, line-safe) in the extended job's script,
  BEFORE app start; settles during the existing `sleep 4`. Both mechanisms now
  ship (hw.lcd panel swap + rotation lock); after-ext-v3 dispatched from 593f84e.
- The prematurely dispatched before-ext-v2 (sent before v2 verification) was
  CANCELLED within 2 minutes (it never started); the re-queue is
  after-ext-v3 → before-ext-v3.
- after2 preview-APK artifact download glitched (UNZIP-FAIL) — retried separately;
  the APK-size pair of record stays the measured v1 pair (19,247,754 → 17,991,084).

### Core-profile evidence (runs 36 after-core / 38 before-core)

- after-core (44127328335): 21/21 green. a11y-small review (10 working sheets,
  360×640@160+fs1.3 × light/dark × all roles): one REAL defect found+fixed —
  stat-tile labels ellipsized mid-word («تكليفات معلّقة» etc.); FIXED at the kit
  level (KpiCard numberOfLines 1→2 + cap 1.25, commit 09c07bf) and the dashboard
  trio (same change). Full-res proofs: teacher attendance "garble" = NO-OVERLAP
  (normal table mid-scroll, AV22); active-tab dot "covering" the icon = misread
  (the dot is 6dp at the bar's outer edge — geometry pinned by tests; the active
  icon is accent-FILLED, which the VLM read as a covering circle, AV23).
- teacher light-a11y-small re-covered GREEN in run 38 (17 shots at 360×640 —
  pixel-verified), closing the run-30 infra flake (corrupt SDK zip).
- before-core metrics + after-core metrics tables extracted (the L6 core delta).

## 2026-11-17 — CLOSING (session 2)

### Landscape, attempts 3+4 (final) — the honest limitation

- Attempt 3 (run 41, after-ext-v3, settings user_rotation): 21/21 green but ALL
  80 landscape pngs still 1080×2340 — the headless emulator ignores the system
  rotation setting.
- Attempt 4 (run 43, after-ext-v4, `adb emu rotate` + wm size dropped for the
  profile; branch 06337b4): 21/21 green, landscape STILL portrait. FOUR
  mechanisms documented and refused (see sheets/LEDGER.md). No fifth attempt:
  the limitation is delivered as written record; the landscape-phone width
  class rides the SAME ≥600dp tier proven on the tablet (AV1/AV11), and the
  workflow keeps the rotation lines so the profile self-corrects on any
  runner that honors them.
- before-ext-v3 (mistakenly dispatched before v3 verification) was cancelled
  within minutes, twice; the final board stands at 8 executed runs.

### Final proofs on v4 (run 43)

- Stat-tile label wrap — AV31 (student trio: «تكليفات معلّقة» whole) + AV32
  (registrar KpiCards: «الطلاب المسجَّلون» whole) — commit 09c07bf validated.
- All earlier proofs carry (same app code 09c07bf across v1–v4; v4 re-verified
  the two late fixes only — ring caps and login links were proven on v1).

### Final before → after metrics

### Final before → after (same swiftshader harness; relative baseline only)

| Profile (per-role rows) | Janky% | Displayed |
|---|---|---|
| EXT owner-light-fs2 | 91.44 → 85.53 | +3s460ms → +2s372ms |
| EXT owner-light-tablet-800x1280 | 57.77 → 45.54 | none → +2s913ms |
| EXT quality-dark-tablet-800x1280 | 60.15 → 53.55 | +2s382ms → +2s431ms |
| EXT quality-light-fs2 | 83.49 → 80.30 | +2s472ms → +2s574ms |
| EXT quality-light-tablet-800x1280 | 57.14 → 59.08 | +2s34ms → +2s539ms |
| EXT registrar-dark-tablet-800x1280 | 53.30 → 53.23 | +2s536ms → +2s392ms |
| EXT registrar-light-fs2 | 79.73 → 78.85 | +1s993ms → +2s739ms |
| EXT registrar-light-tablet-800x1280 | 53.41 → 63.56 | +2s652ms → +3s850ms |
| EXT student-dark-tablet-800x1280 | 63.46 → 50.08 | +4s106ms → +3s198ms |
| EXT student-light-fs2 | 87.96 → 77.09 | +5s891ms → +2s558ms |
| EXT student-light-tablet-800x1280 | 55.91 → 43.43 | +2s491ms → +2s368ms |
| EXT teacher-dark-tablet-800x1280 | 77.61 → 72.43 | +6s201ms → +4s38ms |
| EXT teacher-light-fs2 | 86.98 → 89.76 | +2s74ms → +5s69ms |
| EXT teacher-light-tablet-800x1280 | 55.49 → 52.97 | +2s656ms → +2s908ms |
| CORE owner-dark-a11y-small | 29.18 → 29.73 | +2s711ms → +2s677ms |
| CORE owner-dark-standard | 85.64 → 83.71 | +3s347ms → +2s300ms |
| CORE owner-light-a11y-small | 30.56 → 33.23 | +2s954ms → +3s182ms |
| CORE owner-light-standard | 89.47 → 84.01 | +3s613ms → +3s381ms |
| CORE quality-dark-a11y-small | 38.32 → 37.90 | +2s742ms → +2s397ms |
| CORE quality-dark-standard | 74.64 → 88.41 | +2s366ms → +3s334ms |
| CORE quality-light-a11y-small | 51.95 → 43.16 | +3s20ms → +2s618ms |
| CORE quality-light-standard | 91.03 → 93.08 | +4s156ms → +6s330ms |
| CORE registrar-dark-a11y-small | 49.73 → 33.33 | +4s220ms → +3s407ms |
| CORE registrar-dark-standard | 84.22 → 81.97 | +4s808ms → +3s455ms |
| CORE registrar-light-a11y-small | 30.99 → 30.93 | +3s537ms → +2s115ms |
| CORE registrar-light-standard | 81.07 → 75.88 | +2s502ms → +3s347ms |
| CORE student-dark-a11y-small | 28.80 → 37.98 | +2s631ms → none |
| CORE student-dark-standard | 80.30 → 86.35 | +3s636ms → +4s31ms |
| CORE student-light-a11y-small | 37.98 → 43.09 | +3s623ms → +4s207ms |
| CORE student-light-standard | 87.30 → 79.46 | +3s940ms → +3s528ms |
| CORE teacher-dark-a11y-small | 63.13 → 43.03 | +4s605ms → +3s907ms |
| CORE teacher-dark-standard | 80.86 → 81.00 | +2s742ms → +2s826ms |
| CORE teacher-light-a11y-small | 33.44 → 35.35 | +2s286ms → +2s335ms |
| CORE teacher-light-standard | 74.78 → 86.29 | +3s139ms → +2s546ms |

Landscape rows are EXCLUDED from this table (fake-portrait geometry on both
sides — see LEDGER.md). APK size pair of record: 19,247,754 → 17,991,084
(v1) / 17,991,145 (v2) / 17,991,150 (v4 preview) — −1.26 MB (−6.5%), gate ≤ +1 MB
passed with the APK shrinking.

### Committed evidence set

30 sheets (15 before run-29 + 15 after run-43) under sheets/ with LEDGER.md
(budget: 30/40 used; the 10 a11y working sheets + superseded sets listed
transparently inside LEDGER.md).
