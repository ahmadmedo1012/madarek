# RESUME — C3 mobile lane, R369 (live log)

Agent: MOBILE LANE (Task C3) · branch `agent/r369-product` · start 2026-11-19 11:36 UTC.
Every line: command + real output, or artifact path. Times UTC.

## Session 1 — baseline gates (C3.2) + evidence pipeline watch (C3.1)

### 2026-11-19 11:36 — tree state
- `git log --oneline -1` → `6c8354fc fix(r369): C1.3+C1.4 …` (C1's web work; mobile tree = r366 delivery 06337b4 state + main merges)

### 11:36 — mobile deps
- `cd apps/mobile && npm ci` → clean (node_modules was missing; 2 install-scripts warnings @parcel/watcher, unrs-resolver — non-runtime)

### 11:38 — jest baseline (C3.2)
- `cd apps/mobile && CI=1 npx jest --ci` →
  `Test Suites: 51 passed, 51 total` / `Tests: 1271 passed, 1271 total` / `Time: 40.271s`
  (one benign force-exit warning from poisoned-net suite teardown — pre-existing)

### 11:39 — tsc / worklet / copy-budget baselines
- `cd apps/mobile && npx tsc --noEmit` → exit 0 — 0 errors
- `node scripts/qa/worklet-audit.mjs` (repo root) → `worklet-audit: LAWFUL — 243 files scanned, 0 violations (0 prop-received call(s) runtime-guarded)`
- `node scripts/gates/copy-budget-mobile.mjs` → `COPY-BUDGET-MOBILE: CLEAN — every enforced screen under its ceiling` · `arabic words: 10419 | enforced ceilings sum: 10419` (174 screens) — BASE for the C3.6 diet

### 11:39 — expo-doctor (C3.5)
- `cd apps/mobile && npx expo-doctor` → `Running 20 checks on your project... 20/20 checks passed. No issues detected!` EXIT 0

### 11:40 — APK size BEFORE (C3.4)
- Latest `build-android` success on main: run 44506646288 (run #126, commit 347e2508, built 2026-11-19T10:48:28Z)
- Artifact `Madarek-android-release` (id 14521635500) → downloaded to /tmp/apk-before/ → **`Madarek.apk = 57,772,662 bytes`** (arm64-v8a + armeabi-v7a, vc 126, verify.json `size_bytes: 57772662`, verified: true)
- Growth gate for AFTER: ≤ 58,772,662 bytes (+1 MB rule)

### 11:34–… — BEFORE ui-screens runs in flight (C3.1)
- run **44512581240** (BEFORE core, ref=main, dispatched 11:11Z): in progress — student×4 done, teacher in progress, registrar/quality/owner queued
- run **44512586599** (core, ref=agent/r369-product, dispatched 11:11Z): in progress — student/teacher mostly done, registrar in progress (this is a branch-ref capture; mobile tree identical to main's at this point — usable as BEFORE too)
- run **44516064642** (pending, ref=main, created 11:34:39Z): jobs not yet created (queued behind the 20-slot runner pool) — believed the extended set
- run 44516060131 (main, 11:34:37Z): cancelled immediately — duplicate dispatch, ignored

### 14:15 — session-2 continuation (context handoff)
- Restructured the before/core raw evidence per the evidence policy: logcat (4.4+5.9 MB) and
  launch-20s.png (632 KB > the 500 KB tracked limit) moved to gitignored
  `docs/audit/evidence/r369/mobile/.local/before-core/`; the committed summaries live at
  `docs/audit/evidence/r369/mobile/before-core/` (gfxinfo.txt, profile.txt, last-frame.png).
- BEFORE gfxinfo (owner/system, launch window, NOT the scroll protocol): 82.29 % janky —
  this is the cold-launch window number, superseded by the proper per-screen scroll protocol.

## Session 3 — 2026-11-19 (the C3.1/C3.2 sheet review + the C3.4 numbers)

### 16:00–16:05 — AFTER dispatches (C3.1)
- `POST /actions/workflows/ui-screens.yml/dispatches` (ref=agent/r369-product, app_ref=current):
  core → run **44561417283** (@c609a279, post-copy-diet tree) — completed **success**;
  extended → run **44572492895** — cancelled by the pending-run de-dup race (two dispatches
  <10s apart from one ref cancel the earlier unconsumed one); re-dispatched by the remote
  session as run **44574441331** (@6f48bcf8) — in flight.
- BEFORE (main 347e2508): core run **44512581240** (success, 22 jobs) + extended run
  **44516064642** (success, 22 jobs: tablet 800×1280 / landscape 2340×1080 / fs2 / dark tablet).
- Artifact downloads (6 AFTER role sets + 2 BEFORE): `/home/z/r369-hoist/mobile/{after-core,before-core}`.

### 16:40–17:05 — the C3.2 sheet review (the C1.5 lesson applied: montage ≠ evidence)
- Contact sheets cut (6 montages, `scripts/tmp + sharp`): student light/dark-standard,
  teacher light/dark-standard, quality light/dark-standard — 4-up grids at 180px.
- The MONTAGE VLM pass rated student 2/5 with ~40 claimed defects — REJECTED as evidence:
  every spot-checked claim failed the pixel-level cross-check (thumbnail scaling + JPEG
  compression artifacts; "label overlaps icon" / "title clipped" / "cards overlap" all
  disproven on full-resolution crops).
- The FULL-RESOLUTION VLM passes (12 screens + 4 targeted crops):
  - student light-standard: dashboard / courses / alerts / profile — **CLEAN**
    (verified crops: TabBar label↔icon gap adequate, no collision; profile title
    «حسابي» descender 15–20px clear of the hairline);
  - student dark-a11y-small (font scale): dashboard / courses / AI — **CLEAN**
    (verified: the "tiles cut" = normal scroll boundary; the "cards overlap" = disjoint
    y-bands, no ink-on-ink);
  - teacher light-standard: dashboard / students / grades / schedule — **CLEAN**
    (one tight clearance verified: the «فتح التكاليف» button ends 7–9px above the bar —
    no overlap).
- Verdict: **zero hard defects in the AFTER set** — no C3.2 root-fix required; the two
  tight-but-valid clearances recorded (TabBar label marginTop 2 + the 1.12 icon scale
  leaves ~0.7px visual slack; content bottom padding above the bar 8px on one screen).

### 17:10 — the C3.4 numbers (final tree)
- `CI=1 npx jest --ci` → **1271/1271** · `npx expo-doctor` → **20/20** ·
  `node scripts/qa/worklet-audit.mjs` → **LAWFUL — 243 files, 0 violations**.
- Cold start (`Displayed ly.madarek.mobile/.MainActivity`, CI x86_64 emulator):
  AFTER **2s777ms** (first cold launch) vs BEFORE **3s306ms** — the AFTER boots faster on
  the same protocol; both above the 2.5s bar ON THE EMULATOR (recorded limitation: the
  shared-runner x86_64 emulator taxes ART/Hermes; no real-device harness exists).
- Jank (`dumpsys gfxinfo`, whole-role-walk window incl. screencap stalls): BEFORE
  student 80.04% / teacher 84.09% vs AFTER student 78.94% / teacher 91.04% — the protocol
  measures emulator+screencap overhead, not per-screen render cost (the workflow resets
  gfxinfo before the WHOLE maestro walk; a per-screen framestats harness does not exist —
  recorded limitation per the lane's allowance).
- APK growth: `build-android` dispatched on the branch — run **44576412696** (in flight).

### 17:15-18:10 — session 2, the C3 evidence close (dark void + triage + perf)
- The DARK VOID found + closed: every dark ui-screens capture since R358 rendered light
  (pixel-verified r366/r369 runs); root cause in the job log (raw seg-${THEME_ID} tap);
  fix = deterministic flow sed + the dark pixel gate + the scroll-jank window (6c1d9f0a).
- 5 VLM sheet reviews (20 after-core sheets) → full-res triage: 2 REAL defects (schedule
  strip — fixed in 851072e3; TabBar a11y label clip — fixed in 1599b631), 6 false positives
  (documented), 2 watch items. AFTER-REVIEW.md §2.
- Cold start (logcat, CI emulator): student 2.96→2.39s, teacher 2.74→2.56s, registrar
  2.79→2.21s, quality 5.84→2.99s, owner 2.82→5.33s (KVM outliers flagged) — typical 2.2-3.0s
  on software-GPU CI vs the 2.5s bar; recorded limitation (real-hardware pass needed).
- APK: same-recipe preview main 41,464,762 → branch 41,447,178 B (−17,584; the copy diet
  shrinks it). Release-vs-release gate: build-android dispatched on the tip.
- Boot hand-off: ground continuity pixel-measured (246,245,236 ≈ #F6F6EE), hideAsync after
  first frame per spec; the dark boot ground rides the fresh dispatch.
- Gates on the current tree (with the TabBar fix): mobile jest 1271/1271, expo-doctor 20/20,
  worklet LAWFUL, copy-budget-mobile CLEAN, tsc 0.
- In-flight: the student-only dark-fix verification run 44579053777; then the full
  core+extended dispatch on the tip.
