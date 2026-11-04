# R334 §9 — Review Panel 1 (Independent)

**Reviewer:** #1 of 3 · **Worktree:** `/home/z/wt-rev1` (branch `r334/rev1`, checkout of finished `feat/mobile-r334-pro`) · **Date:** mission R334 §9.
**Scope:** the TOP-30 routes from `docs/mobile/route-inventory.md` §3. **No code changed.**

---

## 1 — Method (honesty labels)

**Code read (DEEP, full file):** `app/index.tsx` (boot), `app/auth/index.tsx` (welcome), `app/student/(tabs)/dashboard.tsx`, `app/student/(tabs)/courses.tsx` (≈430/505 ln incl. all state branches), `app/student/(tabs)/profile.tsx` (290/421), `app/student/(tabs)/ai.tsx`, `alerts.tsx`, `messages.tsx` (wrappers) + `src/features/ai/Assistant.tsx` (header/list/composer half), `app/student/results.tsx`, `app/student/assignments.tsx`, `app/teacher/(tabs)/dashboard.tsx` (220/510), `app/teacher/grades.tsx` (110/436 + docblock), `app/teacher/(tabs)/students.tsx`, `app/quality/(tabs)/dashboard.tsx`, `app/owner/(tabs)/dashboard.tsx` (120/318), `app/admin/(tabs)/dashboard.tsx` (100/209), `app/settings.tsx` (90/322), `app/(modals)/report.tsx`.

**Code read (PART — docblock + imports + render signatures + targeted greps):** `register`, `courses/[offeringId]`, `lectures/[lectureId]`, `online-exams` (+`[templateId]`), `schedule`, `calendar`, `teacher/live`, `teacher/(tabs)/intelligence`, `teacher/exams` (+`[templateId]`), `admin/(tabs)/students`, `select-institution`, `src/features/notifications/NotificationsScreen.tsx`, `src/features/messages/MessagesUI.tsx` (sizes + grep only). **Cross-cutting greps:** haptics consumers, reanimated/`entering=`/reduced-motion, state-kit usage, `accessibilityLabel` counts, hardcoded hex (→ 0 in `app/**`; only `src/design` + `src/brand` legitimately hold hex). **Kit read:** `src/motion/entrance.ts`, `src/components/ui/states.tsx` (Skeleton/SkeletonList/LoadingState/EmptyState rooms).

**Visual inspection (VLM, `z-ai vision`):** 8 captures inspected: `r-student-dashboard.png`, `r-student-dashboard-dark.png`, `r-student-dashboard-360.png`, `r-student-courses.png`, `r-student-ai-dark.png`, `10-alerts.png`, `r-student-results.png`, `r-student-schedule.png`. The VLM endpoint then rate-limited (HTTP 429) for the remainder of the window — teacher/admin/quality/owner captures were NOT re-inspected by me; those screens are **code-review-only** (marked ⌕ in the table). `console-errors.txt` in the capture dir reads `(none)` — no runtime errors during the capture walk.

**Honesty caveats:**
- **No emulator/device exists in this environment — RN-web captures only.** Native feel (haptics, native sheets, expo-video) is judged from code, not felt.
- Several `r-*` captures **predate the latest fix commits** on this branch (`eeca75e` tab-label clipping + stats wrap, `0abea65` CountUp width). Where a VLM finding is contradicted by current code, I score the code and file a *verify* ticket instead of docking.
- VLM misreads Arabic glyph strings (e.g. read «مقرراتي» as «مدراري»). I trusted VLM for geometry/clipping/composition findings and re-verified string claims against code; unverified string claims are discarded.
- `route-inventory.md` §3 describes `/` as the plan-drawing welcome; the welcome now lives at `/auth` (boot handoff) — inventory row 1 is stale, not the code.

**Scoring:** 12 criteria × 0–10. **PASS = avg ≥ 9 AND no criterion < 8.** 9 = genuinely good, 10 = exemplary. Criterion order: **C**omposition · **T**ypography · **S**pacing · **H**ierarchy · **I**conography · **M**otion · **N**avigation · **St**ates · **A**11y · **R**TL · **B**rand · **P**olish.

---

## 2 — Score table (30 rows)

| # | Route | C | T | S | H | I | M | N | St | A | R | B | P | Avg | Verdict |
|---|---|---|---|---|---|---|---|---|----|---|---|---|---|-----|---------|
| 1 | `/` boot (index.tsx) | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 10 | 9 | 9 | 10 | 10 | **9.08** | **PASS** |
| 2 | `/auth` welcome | 10 | 10 | 9 | 10 | 9 | 10 | 9 | 9 | 8 | 10 | 10 | 9 | **9.33** | **PASS** |
| 3 | `/auth/register` ⌕ | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 9 | 9 | 8 | 8.08 | FAIL |
| 4 | `/student/dashboard` | 9 | 9 | 9 | 10 | 9 | 9 | 9 | 9 | 9 | 9 | 10 | 9 | **9.08** | **PASS** |
| 5 | `/student/courses` | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 10 | 9 | 9 | 9 | 9 | **9.08** | **PASS** |
| 6 | `/student/courses/[offeringId]` ⌕ | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 8 | 8 | 9 | 9 | 8 | 8.67 | FAIL |
| 7 | `/student/lectures/[lectureId]` ⌕ | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 8 | 8.92 | FAIL |
| 8 | `/student/ai` (Assistant) | 8 | 9 | 8 | 9 | 8 | 9 | 8 | 9 | 8 | 9 | 9 | 8 | 8.50 | FAIL |
| 9 | `/student/alerts` (NotificationsScreen) ⌕ | 8 | 9 | 8 | 9 | 8 | 7 | 9 | 9 | 8 | 9 | 9 | 8 | 8.42 | FAIL |
| 10 | `/student/profile` | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 10 | 9 | 8 | 8.83 | FAIL |
| 11 | `/student/online-exams` ⌕ | 9 | 9 | 9 | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 9 | 9 | 8.67 | FAIL |
| 12 | `/student/online-exams/[templateId]` ⌕ | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 8.83 | FAIL |
| 13 | `/student/results` | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 10 | 9 | 9 | 8.92 | FAIL |
| 14 | `/student/schedule` ⌕ | 8 | 9 | 8 | 9 | 9 | 8 | 9 | 10 | 8 | 9 | 9 | 8 | 8.67 | FAIL |
| 15 | `/student/messages` (MessagesUI) ⌕ | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 8 | 8 | 8 | 7.83 | FAIL |
| 16 | `/student/assignments` | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 10 | 9 | 9 | 8.92 | FAIL |
| 17 | `/student/calendar` ⌕ | 8 | 9 | 8 | 9 | 8 | 6 | 8 | 8 | 7 | 10 | 9 | 8 | 8.17 | FAIL |
| 18 | `/teacher/dashboard` | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 8 | 7 | 9 | 9 | 9 | 8.75 | FAIL |
| 19 | `/teacher/grades` | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8.92 | FAIL |
| 20 | `/teacher/live` ⌕ | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 9 | 8.83 | FAIL |
| 21 | `/teacher/intelligence` ⌕ | 8 | 8 | 8 | 8 | 8 | 6 | 8 | 8 | 7 | 8 | 8 | 8 | 7.75 | FAIL |
| 22 | `/teacher/students` | 8 | 9 | 9 | 9 | 8 | 7 | 9 | 7 | 7 | 9 | 9 | 8 | 8.25 | FAIL |
| 23 | `/teacher/exams` (+`[templateId]`) ⌕ | 8 | 8 | 8 | 8 | 8 | 6 | 8 | 8 | 7 | 8 | 8 | 7 | 7.67 | FAIL |
| 24 | `/admin/dashboard` | 9 | 9 | 8 | 9 | 8 | 6 | 9 | 7 | 7 | 9 | 9 | 8 | 8.17 | FAIL |
| 25 | `/admin/students` ⌕ | 8 | 8 | 8 | 8 | 8 | 6 | 8 | 9 | 6 | 8 | 8 | 8 | 7.75 | FAIL |
| 26 | `/quality/dashboard` | 8 | 8 | 8 | 8 | 8 | 6 | 8 | 8 | 7 | 9 | 8 | 8 | 7.83 | FAIL |
| 27 | `/owner/dashboard` | 8 | 8 | 8 | 8 | 8 | 6 | 8 | 7 | 7 | 9 | 8 | 8 | 7.75 | FAIL |
| 28 | `/settings` | 8 | 9 | 8 | 8 | 8 | 7 | 8 | 8 | 7 | 9 | 9 | 8 | 8.08 | FAIL |
| 29 | `/report` (sheet route) ⌕ | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 7 | 7 | 9 | 9 | 8 | 8.08 | FAIL |
| 30 | `/select-institution` ⌕ | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 9 | 7 | 9 | 9 | 8 | 8.25 | FAIL |

⌕ = code-review-only (no fresh VLM inspection this panel — rate-limited or PART read). **Overall average: 8.47 / 10. PASS 4 · FAIL 26.**

**Reading of the result:** the four passes are the boot handoff, the signature welcome, and the two most-trafficked student tabs — exactly the surfaces the R334 mission invested in (staggered entrances, haptics, real-geometry skeletons, one-accent discipline, CountUp/RingProgress with a11y). Everything else misses **PASS** on motion (governance/teacher/admin dashboards have zero entrance animation and mostly zero haptics), thin a11y labeling, and state-grammar drift (muted-text empties instead of the kit's `EmptyState` rooms). None of the failures is broken — floor across the board is a solid L2; the gap to L3 is systematic, not random.

---

## 3 — Tickets (every lost point, grouped)

### P0 — blocks L3 (systemic, hits many screens)

- **T1 · `app/quality/(tabs)/dashboard.tsx`, `app/owner/(tabs)/dashboard.tsx`, `app/admin/(tabs)/dashboard.tsx` — no motion at all** (M=6): zero `useStaggerEntrance`/`PressableScale`/`entering=` on the role homes students of those roles see first. Fix: apply the `@/motion` stagger (≤8 children, ≤400 ms) + `haptics.selection` on the quick-action/menu rows, exactly as `student/(tabs)/dashboard.tsx` does.
- **T2 · `app/quality/(tabs)/dashboard.tsx:43-50` — untyped `Record<string, unknown>` wire casts** (`numOf` fallbacks, `rest` HonestLedger): brittle + a latent technical-string path. Fix: generate a typed `QualityOverview` in `src/api/types` and delete the casts.
- **T3 · a11y labels missing on interactive rows across admin/teacher surfaces** — `admin/(tabs)/students.tsx` (1 label), `teacher/(tabs)/intelligence.tsx` (1), `settings.tsx` (1), `select-institution.tsx` (1), `teacher/exams.tsx` (6). Fix: `accessibilityRole="button"` + Arabic `accessibilityLabel` on every Pressable/LedgerRow (parity with student core, e.g. courses.tsx:86).
- **T4 · `app/teacher/(tabs)/dashboard.tsx:178-191` — `RingProgress` has no `accessibilityLabel`** (student dashboard's twin at dashboard.tsx:213 has one). Fix: add `نسبة الحضور …` label.
- **T5 · `app/admin/(tabs)/dashboard.tsx:75-81` — error state rendered via `EmptyState`** (misuse: "تعذّر تحميل الإحصائيات" is an error, not an empty). Fix: swap to `ErrorState` + `onRetry`, keep `EmptyState` for true-empty.
- **T6 · `app/owner/(tabs)/dashboard.tsx:133-136` + `app/teacher/(tabs)/students.tsx:38-44` — empty states as muted `<T>`/Card+text** instead of kit `EmptyState` rooms. Fix: `EmptyState` with room + action, matching courses.tsx:339.

### P1 — should fix

- **T7 · `app/student/schedule.tsx` — day-strip rendering suspect**: the (possibly pre-recompose) capture shows only «الكل/الأحد» chips, vertical labels, big void. Fix: re-capture post-`eeca75e` and, if reproduced, debug the chip strip layout (width/flex) at 390 px.
- **T8 · dark-mode verification** — `r-student-dashboard-dark.png` and `r-student-ai-dark.png` read as light/paper palettes to VLM. Fix: re-capture with the dark preference actually applied; if the walk harness never toggled theme, fix the harness naming (they may be mislabeled light captures).
- **T9 · `app/student/lectures/[lectureId].tsx` — transcript renders up to 200 cues as `.map` rows** (scroll jank risk on long lectures). Fix: virtualize cue list (FlatList windowing) or cap rendered window to visible ± buffer.
- **T10 · `src/features/ai/Assistant.tsx` — empty-state dead space + composer crowding** (VLM: chips sit high, send icon hugs field edge; helper text contrast borderline). Fix: center the suggestion block in the leftover space (code already uses `flexGrow:1` — verify on device), add breathing room around the send affordance, darken helper text one step.
- **T11 · `app/auth/register.tsx`, `teacher/exams.tsx`, `admin/(tabs)/students.tsx`, `teacher/(tabs)/intelligence.tsx` — no entrance motion, sparse haptics** (M=6-7). Fix: `useStaggerEntrance` on the first content block + `haptics.notify("success")` on submit/publish mutations.
- **T12 · `app/student/calendar.tsx` — no motion/haptics on a highly-tactile grid** (M=6): month grid + day sheet fire no haptics and no entrance. Fix: `haptics.selection()` on day tap, `fadeIn` on month swap.
- **T13 · `app/student/online-exams.tsx` — 7/10 a11y + no motion** (M=7, A=7). Fix: labels on segmented filter + attempt chips; stagger the list entrance.
- **T14 · `app/teacher/(tabs)/students.tsx` + `app/student/courses/[offeringId].tsx` — empty sections as muted text** (inventory-flagged grammar drift; St=7-8). Fix: route section empties through `EmptyState` (small variant) instead of `<T color="muted">`.
- **T15 · `app/settings.tsx` — menu-list feel, no grouped-section motion, 1 a11y label** (M=7, A=7). Fix: group into SectionBar blocks with stagger; label every row; consider moving haptics/biometric blocks into shared components with profile.tsx (duplicated logic).
- **T16 · `app/(modals)/report.tsx` — delegate `ReportProblemSheet` unaudited + success path has no motion** (St=7). Fix: audit the sheet; add `haptics.notify("success")` + a success micro-state before dismiss.

### P2 — nice

- **T17 · `app/student/(tabs)/dashboard.tsx:473` — `Badge label="LIVE" tone="yellow" mono`** is an English technical-ish string in the Arabic agenda. Fix: «مباشر» chip (keep mono only for codes).
- **T18 · `app/student/(tabs)/dashboard.tsx:120-122` — institution subtitle `sm muted` on paper reads low-contrast** (VLM flagged). Fix: bump to `secondary` color token.
- **T19 · `app/index.tsx` (welcome→`/auth/index.tsx:59`) — `PlanBuilding` has no `accessibilityLabel`** (decorative-drawing ambiguity). Fix: add `hidden` or a label («رسم معماري لواجهة جامعة»).
- **T20 · `app/student/results.tsx:87-90` — empty state lacks a blueprint room** (VLM: dead space, no art). Fix: `EmptyState room="exam-hall"` + optional «تحديث» action.
- **T21 · `app/student/results.tsx:114-120` — share CTA has no haptics/entrance**; add `haptics.selection()` and hero stagger.
- **T22 · `app/student/(tabs)/profile.tsx` — 30-link flat menu hub** (no section grouping/virtualization). Fix: group into 4-5 SectionBar clusters (أكاديمي/مالي/خدمات/نظام).
- **T23 · `SectionBar` `[01]` mono index tags** read as technical to VLM on 3 screens — intentional blueprint aesthetic, but worth a design call: Arabic-Indic ٠١ or drop brackets.
- **T24 · `app/quality/(tabs)/dashboard.tsx` — raw `gap: 8` literals** instead of `sp[8]` tokens (style-token drift vs. student core).
- **T25 · `app/teacher/grades.tsx` — swipe gesture has no visual hint**; add a first-run «اسحب للتنقل بين الطلاب» hint chip.
- **T26 · `app/student/assignments.tsx` — submit sheet + rows lack entrance stagger** (M=8); cap-stagger the first rows like courses.tsx.

### Lost-point ledger (remaining sub-9 criteria not already ticketed above)

One line per screen still failing (criterion: cause → fix); all are P2-grade individually:
- **3 register** (St8: no skeleton mirror for the institution query; A7: field labels; M7: no stagger) → T11/T3 pattern.
- **6 course-detail** (M8/St8/A8/P8): tab switch lacks `PressableScale`; announce-tab empty = muted text; poster images need labels; verify hairline overflow on chips at 360 px.
- **7 lecture player** (N8: prev/next affordance at screen edge; P8: letterbox + chrome auto-hide polish).
- **8 ai** (C8/S8/I8/N8: header badge wrap on narrow; suggestions ragged rows → 2×2 grid; back label crowding).
- **9 alerts** (M7: no entrance/press motion in inbox rows; C8/S8: empty-state vertical centering; banner margins asymmetric).
- **10 profile** (M8: no stagger; P8: flat 30-row list T22; A8: KPI cards unlabeled).
- **11 online-exams** (M7/A7 → T13; window-rule copy density on 360 px).
- **12 exam runner** (A8: option radionyms; P8: timer ring + submit confirm polish).
- **13 results** (M8/A8 → T21; per-row breakdown lacks individual skeleton).
- **14 schedule** (C8/S8/P8 → T7; day-section sticky header hairline).
- **15 messages** (all 8s + M7/A7 → T3/T11 pattern; delegate deep-read needed).
- **17 calendar** (I8: dot legend unclear; N8: month-swap affordance; A7: cells unlabeled «يوم X — N أحداث»).
- **18 teacher dash** (M8/St8/A7 → T1/T4; trend chart has no a11y summary).
- **19 grades** (I8: kind icons; A8: draft-input labels; P9→8 n/a).
- **20 live** (St8: sessions list empty = Card+text → T6 pattern; A8: lifecycle buttons labels exist, rows thin).
- **21 intelligence** (all → T1/T3/T11; at-risk rows need tone legend).
- **22 teacher students** (I8: picker affordance; M7/St7/A7 → T1/T6/T3).
- **23 teacher exams** (all → T1/T3/T11; P7: dense authoring forms — consider section sheets).
- **24 admin dash** (S8: peek-list fixed `height: 400` magic number; I8; M6/St7/A7 → T1/T5/T3).
- **25 admin students** (A6: only 1 label; M6 → T3/T11; search+filter lack result-count feedback).
- **26 quality dash** (→ T1/T2/T24; header hand-rolled instead of PageHeader; no pull-to-refresh).
- **27 owner dash** (→ T1/T6; alerts rows not pressable to detail; no pull-to-refresh).
- **28 settings** (→ T15).
- **29 report** (→ T16).
- **30 select-institution** (A7: institution rows need labels; P8: brand mark + list spacing).

---

## 4 — Overall

- **Overall average: 8.47 / 10** (30 screens × 12 criteria). **PASS 4 · FAIL 26.**
- Weakest dimensions app-wide: **motion/feel (avg ≈ 7.6)** and **accessibility labeling (avg ≈ 7.8)** — both are mechanical to fix with the existing `@/motion` + haptics kit.
- Strongest dimensions: **RTL/Arabic craft (avg ≈ 9.1)** — latn-numeral policy, `countAr` plurals everywhere, RTL-aware `slideInFromStart` — and **brand token discipline (avg ≈ 8.9)** — zero hardcoded hex in routes, one-accent rule enforced in code comments and practice.
- The student core (4-5 screens) is genuinely L3; teacher core is one motion/a11y pass away; governance dashboards need the full triad (motion + typed wire + state grammar) before they can claim L3.

*Panel 1 of 3 — independent; no other reviewer's work was consulted.*
