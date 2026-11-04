# R334 Mission §9 — Review Panel 3 of 3 (FINAL RETRY): native-feel skeptic

Independent panel. Branch `r334/rev3`. Method: **CODE-ONLY — no VLM calls, no
captures** (per final-retry instruction). Output: this file + 2 commits. No code changed.

## 1 — Method

- Top-30 from `docs/mobile/route-inventory.md` §3. Each screen scored 0–10 on 12
  criteria from **code reads + `docs/mobile/screens/*.md` + repo-wide kit-adoption
  greps** (`useEntrance|enterStagger|PressableScale`, `haptics.`,
  `EmptyState|ErrorState|Skeleton`, `DataList|FlashList|FlatList`,
  `CountUp|RingProgress|MetricHero` — per-file counts recorded during review).
- **Deep reads (15)**: shell trio (below), `/`, `/auth`, student dashboard,
  lecture player (docblock + structure), online-exams list, quality dashboard,
  teacher grades (docblock + structure), Assistant, report, plus
  `pressables.tsx` / `states.tsx` spot reads. **Quick-scan (15)**: identified
  "quick-scan" in §3 — scored from docblocks, imports and adoption greps only.
- Delegates counted: `Assistant` (motion 5/haptic 12), `NotificationsScreen`
  (0/4), `MessagesUI` (2/7), `ReportProblem` (3/5), `governance/components` (8).
- **PASS = avg ≥ 9 AND min ≥ 8.** Motion/feel scored from code (UI-thread
  springs, entrance, press feedback, reduced-motion gates, haptics wiring) —
  no emulator exists in this sandbox; animated feel is device-unverified.

## 2 — Shell-claims verification (mandate)

Read in full: `apps/mobile/src/components/shell/TabBar.tsx` (311 ln),
`apps/mobile/src/components/shell/immersive.tsx` (82 ln),
`apps/mobile/app/student/(tabs)/_layout.tsx` (48 ln).

| Claim | Verdict | Evidence |
|---|---|---|
| Persistent bar, rendered once, outside screens | **HOLDS** | `(tabs)/_layout.tsx` renders `RoleTabBar` solely via the `tabBar` prop; docblock pins the no-remount contract to `src/test/navigation-stability.test.tsx`. |
| Immersive-hide | **HOLDS in code** | `useImmersiveTabBar()` wired ONLY in the (tabs) layout; matchers = lectures/online-exams detail (`s.length >= 3`) + `/student/ai` under `useKeyboardState()`. TabBar animates `translateY` spring (`springs.default`, reduced-motion → instant), NEVER unmounts, position-flips out of flow only while hidden. |
| Transform-only animated indicator | **HOLDS in code** | Exactly ONE 6dp orange dot; `withSpring(springs.snappy)` on the UI thread; `transform:[{translateX}]` only; pure `indicatorOffset()` RTL start-anchor with sign flip; a11y-hidden + `pointerEvents="none"`. |

Skeptic nits (code-level): tab labels pinned at **fontSize 11 / lineHeight 14**
(small-type compromise for 5-slot RTL rows); badge offset `start: 12` is fixed,
not glyph-aware; 6dp dot is a whisper on dark ground; icon-morph + badge-pop
springs correctly respect `useReduceMotion()`. Feel = device-unverified (docs
label this honestly).

## 3 — Score table (30 screens × 12 criteria)

Legend — **C** composition · **T** typography · **S** spacing/rhythm · **H**
hierarchy · **I** iconography · **M** motion/feel (code) · **N** navigation ·
**St** states · **A** accessibility · **R** RTL/Arabic · **B** brand tokens ·
**P** polish. `qs` = quick-scan.

| # | Screen | C | T | S | H | I | M | N | St | A | R | B | P | Avg | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` boot (deep) | 8 | 8 | 8 | 8 | 7 | 7 | 9 | 9 | 8 | 8 | 8.5 | 8 | **8.0** | FAIL |
| 2 | `/auth` welcome (deep) | 8 | 8.5 | 8 | 8.5 | 8 | 8 | 8.5 | 8 | 8 | 8.5 | 8.5 | 8 | **8.3** | FAIL |
| 3 | `/auth/register` (qs) | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 7 | 8 | 8 | 8 | 8 | 8 | 7.5 | **7.7** | FAIL |
| 4 | `/student/dashboard` (deep) | 8 | 8 | 7.5 | 8.5 | 8 | 9 | 8.5 | 9.5 | 9 | 8.5 | 8.5 | 8 | **8.5** | FAIL |
| 5 | `/student/courses` (qs) | 8 | 7.5 | 7.5 | 8 | 8 | 8.5 | 8.5 | 9.5 | 9 | 8.5 | 8 | 8 | **8.2** | FAIL |
| 6 | `/student/courses/[offeringId]` (qs) | 8.5 | 8 | 8 | 8.5 | 8 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | **8.4** | FAIL |
| 7 | `/student/lectures/[lectureId]` (deep) | 8.5 | 8 | 8 | 9 | 8.5 | 8.5 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 8 | **8.4** | FAIL |
| 8 | `/student/ai` → Assistant (deep) | 7.5 | 7.5 | 7 | 7.5 | 7.5 | 8.5 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 9 | `/student/alerts` → Notifications (qs) | 7 | 7.5 | 7 | 7.5 | 8 | 7 | 7.5 | 8.5 | 8 | 8 | 8 | 7.5 | **7.7** | FAIL |
| 10 | `/student/profile` (qs) | 8 | 8 | 8 | 8 | 8 | 8 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | **8.4** | FAIL |
| 11 | `/student/online-exams` (deep) | 7.5 | 7.5 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8 | 8.5 | 8 | 7.5 | **7.7** | FAIL |
| 12 | `/student/online-exams/[templateId]` (qs) | 8.5 | 8 | 8 | 8.5 | 8 | 8.5 | 8.5 | 9 | 8.5 | 8 | 8.5 | 8 | **8.4** | FAIL |
| 13 | `/student/results` (qs) | 8 | 8 | 7.5 | 8 | 7.5 | 8 | 8 | 9 | 8.5 | 8.5 | 8 | 8 | **8.1** | FAIL |
| 14 | `/student/schedule` (qs) | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 9 | 8.5 | 8.5 | 8 | 8 | **8.1** | FAIL |
| 15 | `/student/messages` → MessagesUI (qs) | 7.5 | 7.5 | 7 | 7.5 | 8 | 7.5 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.8** | FAIL |
