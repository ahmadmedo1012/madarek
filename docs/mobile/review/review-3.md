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
| 16 | `/student/assignments` (qs) | 8 | 8 | 7.5 | 8 | 8 | 7.5 | 8.5 | 8.5 | 8.5 | 8.5 | 8 | 8 | **8.1** | FAIL |
| 17 | `/student/calendar` (qs) | 7.5 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 18 | `/teacher/dashboard` (qs) | 8 | 8 | 7.5 | 8.5 | 8 | 8.5 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **8.1** | FAIL |
| 19 | `/teacher/grades` (deep) | 7.5 | 7.5 | 7 | 8 | 7.5 | 8 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **7.9** | FAIL |
| 20 | `/teacher/live` (qs) | 7.5 | 7.5 | 7 | 7.5 | 7.5 | 7.5 | 8 | 8.5 | 8 | 8.5 | 7.5 | 7 | **7.8** | FAIL |
| 21 | `/teacher/intelligence` (qs) | 7.5 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.7** | FAIL |
| 22 | `/teacher/students` (qs) | 7 | 7.5 | 7 | 7.5 | 7.5 | 5.5 | 8 | 7 | 8 | 8 | 7.5 | 7 | **7.4** | FAIL |
| 23 | `/teacher/exams` + `[templateId]` (qs) | 7 | 7.5 | 7 | 7.5 | 7 | 5.5 | 7.5 | 8.5 | 8 | 8 | 7.5 | 7 | **7.4** | FAIL |
| 24 | `/admin/dashboard` (qs) | 8 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 25 | `/admin/students` (qs) | 7.5 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 26 | `/quality/dashboard` (deep) | 7 | 7.5 | 7 | 7.5 | 7 | 5.5 | 7.5 | 8 | 8 | 7.5 | 7.5 | 7 | **7.3** | FAIL |
| 27 | `/owner/dashboard` (qs) | 7.5 | 7.5 | 7.5 | 8 | 7 | 5.5 | 7.5 | 8.5 | 8 | 7.5 | 7.5 | 7 | **7.6** | FAIL |
| 28 | `/settings` (qs) | 8 | 8 | 8 | 8 | 8 | 7.5 | 8 | 7.5 | 8.5 | 8.5 | 8.5 | 8 | **8.0** | FAIL |
| 29 | `/report` sheet route (deep) | 8 | 8 | 8 | 8 | 7.5 | 8 | 8.5 | 8 | 8 | 8 | 8 | 8 | **8.0** | FAIL |
| 30 | `/select-institution` (qs) | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 8.5 | 8.5 | 8.5 | 8 | **8.3** | FAIL |

**Overall average: 7.95 / 10 — 0 of 30 PASS.** Best: student dashboard 8.5;
worst: quality dashboard 7.3. No criterion scored below 5.5 anywhere — the gap
to 9 is craft uniformity, not correctness.

## 4 — The skeptic's case: what still feels web-dashboard (all code-verified)

1. **Ten zero-motion seats.** Grep-verified: `online-exams.tsx`, `calendar.tsx`,
   `teacher/(tabs)/intelligence.tsx`, `teacher/(tabs)/students.tsx`,
   `teacher/exams.tsx`, `teacher/exams/[templateId].tsx`,
   `admin/(tabs)/dashboard.tsx`, `admin/(tabs)/students.tsx`,
   `quality/(tabs)/dashboard.tsx`, `owner/(tabs)/dashboard.tsx` have **0**
   `useEntrance|enterStagger|PressableScale` and **0** `haptics.` hits —
   static rows in a ScrollView with stock press opacity is the exact
   web-dashboard signature the mission set out to kill.
2. **`EmptyState` sits top-stuck in scroll flow** — `states.tsx:189` uses
   `paddingVertical: sp[40]` with no flex centering, so sparse-data screens
   render a content-top page over a paper void.
3. **`Button`/`IconButton` bypass the haptics policy** — `pressables.tsx:62,117`
   call raw `Haptics.impactAsync`, outside the persisted kill-switch + 60ms
   throttle that `@/haptics` owns; welcome CTA and every primary action feel
   (and disable) inconsistently.
4. **Register + notifications delegates have haptics but no entrance motion**
   (0 motion hits) — form/inbox arrivals hard-cut like page loads.
5. **Untyped governance wire** — quality dashboard parses
   `overview.data as Record<string, unknown>` ×3 with hand-filtered
   `knownKeys`; generic dashboard feel + brittleness in one.
6. **Teacher students triad is ad-hoc** — muted `<T>` text / bare Cards where
   every sibling screen uses kit `EmptyState`/`ErrorState` grammar.

## 5 — Tickets (sub-9 drivers; file → issue → fix)

| # | File | Issue | Fix |
|---|---|---|---|
| P0-1 | `apps/mobile/src/components/ui/pressables.tsx:62,117` | Raw `Haptics.impactAsync` bypasses `@/haptics` kill-switch + throttle | Route through `haptics.impact("light")` (2 lines) |
| P0-2 | `apps/mobile/src/components/ui/states.tsx:189` | `EmptyState` top-stuck in scroll flow → paper void on sparse screens | `flex:1` + optical centering when body is otherwise empty |
| P0-3 | 10 files listed in §4.1 | Zero entrance motion, zero press feedback | `useStaggerEntrance` on first content block + `PressableScale` on rows (~1 h/screen with kit) |
| P0-4 | `apps/mobile/app/quality/(tabs)/dashboard.tsx:43-50` | `Record<string, unknown>` casts ×3 + `knownKeys` hand-filter | Type `qualityApi.overview()` in `src/api/quality` |
| P0-5 | `apps/mobile/app/teacher/(tabs)/students.tsx` | Ad-hoc muted-text/Card triad, not kit states | Swap to `EmptyState`/`ErrorState` |
| P1-1 | `apps/mobile/src/components/shell/TabBar.tsx` | 11/14 labels tiny; badge `start:12` fixed (glyph collision risk at 360dp); 6dp dot whisper-quiet on dark | Raise inactive contrast a step; measure badge offset; consider 8dp dot |
| P1-2 | `apps/mobile/app/auth/register.tsx` | No entrance motion (haptics present) | `useStaggerEntrance` on the form card |
| P1-3 | `apps/mobile/src/features/notifications/NotificationsScreen.tsx` | No entrance motion on inbox arrival | Same kit entrance |
| P1-4 | `apps/mobile/app/student/calendar.tsx` | Press-heavy month grid, no `haptics.selection()`/`PressableScale` | Add both on day cells |
| P1-5 | `apps/mobile/src/features/ai/Assistant.tsx` (header) | Provider badge + icon buttons + stacked back = busy header | Collapse provider/model into one trailing info chip → sheet |
| P1-6 | `apps/mobile/app/index.tsx` (GridBackdrop) | Redraws `cols+rows` SVG lines each render, unmeasured | Memoize the path/lines or hoist |

## 6 — Verdict

**7.95 / 10 · 0/30 PASS · 5 P0 · 6 P1.** The shell's three headline claims
(persistent bar, immersive-hide, transform-only indicator) all **HOLD in code**
at `apps/mobile/src/components/shell/TabBar.tsx` + `immersive.tsx` +
`app/student/(tabs)/_layout.tsx` — wired, test-pinned, reduced-motion-aware.
Student core (dashboard, player, exam runner, grades) genuinely earns its
native feel in code. What blocks the 9-bar is uniformity: ten motionless
web-dashboard seats, top-stuck empty states, a haptics-policy bypass in the
shared Button, and one untyped governance dashboard. Every P0 is a patterned
fix on existing kit.

*Reviewer 3 — evidence: code reads + per-file kit-adoption greps (counts in
§1); route-inventory.md; screens docs. No VLM, no captures, no code changed.*
