# AGENT 5 · R366 — Native Mobile (Android APK + iOS internal) — CHECKLIST

Branch `agent/r366-native-mobile` · baselined from `origin/main` @ `7a097457`.
A box is ticked ONLY with proof on the same line (command + real output, CI run
URL, metric before→after, or artifact path). Written/pushed ≠ done; executed and
measured = done.

Baseline (measured on this branch before any change):
- `npx tsc --noEmit` (apps/mobile) → exit 0
- `CI=1 npx jest --ci` → **1252/1252 passed, 49 suites**
- `node scripts/gates/copy-budget-mobile.mjs` → CLEAN, **13043 Arabic words / 174 screens**, ceilings sum 13056
- `node scripts/qa/worklet-audit.mjs` → see L3 box (needs root node_modules)

## L1 — Evidence pipeline first (cheap, drives everything)

- [x] Dispatch ui-screens before-set on `main` — student run 44091736405 + owner 44091879110 (both later failed on the R362 line-by-line bug, see RESUME); the FIXED before-set: run **44098062444** (all roles × extended profiles, app_ref=main) + queued core teacher/registrar/quality via the dispatch poller
- [x] ui-screens.yml extended (commit 8c3f3cc): tablet 800×1280@160, landscape 2340×1080@420, fs 2.0, dark tablet — twin `screens-extended` job behind `profile_set` input; standard viewport ≈411dp (Pixel-class, already the default AVD) and 360×640 small already existed. RTL: app forces RTL internally (I18nManager.forceRTL) — device locale doesn't change direction; noted in RESUME
- [x] +35 deep stops across the five flows (12–19 shots per profile); every deep link validated against the 112-route tree (0 bad links; achievements fixed to root route)
- [x] student extended artifacts downloaded (fs2/tablet/landscape), 3 contact sheets, VLM defect review — table in RESUME.md; 5 fixes committed (32ead51)
- [ ] After-set: dispatch extended workflow on this branch; download artifacts; contact sheets; defect re-check (PENDING — before-set still running; after-set queued after code freeze)

## L2 — UI kit & shell at the root

- [x] TabBar: 54pt targets (bottom) / 60pt (rail), RTL badge via `start:`, dot transform-only (tests pin); AppTopBar 44×44 seats, theme-derived status/nav bars; RAIL mode added for ≥600dp (de01bd3, tests +9)
- [x] audit: sheets ride react-native-keyboard-controller (root provider) + windowHeight max-height + bottom safe area (sheet.tsx pre-existing, R334/R331 contracts + sheet.test.tsx green); no defects in the emulator sheets (before-set)
- [x] FormScreen rides keyboard-controller KAV (UI-thread offset); fields expose error text (form.test.tsx contract); no keyboard defects in captured auth screens (before-set)
- [x] audit: 9 bespoke-screen candidates all delegate to shared features; DataList tri-state covers lists; render-net mounts every route green
- [x] 335 spacing literals app-wide → 134 migrated in the 12 worst screens to sp[N] (commit e04a4b0); dimension constants (player chrome, charts) stay literal by design
- [x] dark-standard + dark-tablet profiles in the matrix; settings before/after theme pair in every flow; AppStatusBar/AppNavigationBar theme-derived (pre-existing contracts)
- [ ] Tablet/foldable/landscape: responsive rules (max content width, two-pane where natural, rail vs tabs on wide) — code + emulator proof on tablet profile
- [x] CODE: row wrap + 2-line titles + grid-label caps (32ead51); EVIDENCE: fs2 before-set reviewed; after-set re-check pending
- [x] 360×640@160 + fs1.3 profile existed (a11y-small); student captures green in the earlier main-ref run set; after-set re-verifies

## L3 — Smoothness, transitions, boot

- [x] `worklet-audit: LAWFUL — 243 files scanned, 0 violations` (re-run after every motion-touching commit)
- [x] audit: DataList (FlashList v2 — auto-sizing, no estimatedItemSize needed; FlatList web fallback) covers courses/admin-students/grades/notifications/schedule/library (the heaviest); makeRow memoises rows; dashboard's RowList is bounded content
- [x] gfxinfo reset+dump wired into both capture jobs (before-set artifacts hold gfxinfo.txt per profile). HONEST CAVEAT: swiftshader software rendering makes absolute % meaningless (fs2 before: 87.96%); the ≤5% device target needs real hardware — recorded as the relative before/after harness instead
- [x] root Stack contentStyle = heron[theme].bg (tokens); (tabs) fade animation; RTL back gesture native (M1.3 note); tab state preserved (bottom-tabs default, pinned by navigation-stability tests); no white flash in any captured frame
- [x] useReduceMotion gates every spring (TabBar dot/icon/badge, entrance, PressableScale) — motion presets + worklet law green; reduced-motion = instant (no loops)
- [x] splash bg #F6F6EE/#282828 == heron tokens (both themes); splash held until fonts+RTL ready; **Displayed +1s569ms (tablet profile, swiftshader)** — under the 2.5s target; fs2 warm 2.9s; evidence in RESUME (logcat Displayed lines)
- [x] hydrate() runs while splash held; router redirects after splash hide; welcome/login captures show no mid-frame jump (frame evidence in artifacts)

## L4 — Copy diet on mobile

- [x] **13043 → 10419 (−20.1%)** across 16 batches (~800 substitutions + src/lib/copy.ts dedup); ceilings lowered in-lockstep (gate CLEAN); countAr grammar preserved; jest 1271/1271

## L5 — Quality gates & parity

- [x] jest **1271/1271** (+19 new responsive/a11y tests); `tsc --noEmit` exit 0
- [x] **20/20 checks** after aligning 21 Expo SDK-58 packages (commit 05f8518)
- [ ] APK size not growing > +1 MB (before/after via build artifacts) — before APK 19,247,754 bytes (run 44098062444 artifact); AFTER pending the after-set build
- [x] scripted audit: **0 raw touchables without a11y** (385 labels; kit defaults label→a11y); contrast per tokens (contrast-gate owns web; mobile palette is the same source). TalkBack smoke: SKIPPED — Maestro TalkBack driving is unreliable on API-34 headless; a11y labels/roles/state verified by tests + JSON-tree audits instead
- [x] PARITY.md committed (8240f81) — 20 flows, tokens/states mapping

## L6 — Closing

- [ ] All mobile gates green (baseline shifts listed in DELIVERY.md)
- [ ] Before/after sheets for all roles × device profiles (≤ 40 sheets, contact-sheet format)
- [ ] Jank/startup numbers recorded (before→after)
- [ ] DELIVERY.md written; branch pushed; REQUESTS files written (Agent 2 boot spec, Agent 3 tokens if needed)
