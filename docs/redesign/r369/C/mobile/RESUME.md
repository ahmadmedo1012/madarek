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
