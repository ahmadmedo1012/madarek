# R334 Mobile Mission §9 — Review Panel 3 (of 3): the native-feel skeptic

Branch `r334/rev3` (read-only checkout of the finished mission branch). Reviewer role:
**native-feel skeptic** — actively hunt what still feels like a web dashboard (flat
lists, missing press feedback, generic layouts, header crowding, tab-bar issues,
overlay remnants) and verify the shell's persistent-bar / immersive-hide / animated-
indicator claims in code.

## 1 — Method & honesty labels

- **Top-30** as listed in `docs/mobile/route-inventory.md` §3. Per screen: read the
  route file (+ delegate feature file where the route is a thin wrapper), the owning
  `docs/mobile/screens/*.md`, and grepped adoption of the motion/haptics/states kit.
- **Visual evidence**: 16 captures under `/home/z/caps/` inspected via `z-ai vision`
  (one pointed critique prompt per capture, JSON outputs kept at `/tmp/vlm3-*.json`
  during review). Captures are **RN-web renders with sparse seed data** — the VLM's
  web-feel complaints must be read with that grain; several captures also **predate
  late fixes** (flagged below where code and capture disagree).
- **Code-review-only screens** (no capture inspected, honestly marked): auth/register,
  course detail, lecture player, exam runner, profile, teacher intelligence, teacher
  exams ×2, admin students, settings, report, select-institution. Captures that exist
  but were NOT VLM-inspected within this reviewer's timebox: `r-student-assignments`,
  `r-student-calendar`, `r-student-library`, `r-admin-*`, `login-390`, `10-*` (except
  alerts), `fix-courses-390`, `fix-dashboard-768`, dashboard 360/430/768 variants.
- **No emulator exists in this sandbox** — every motion/feel criterion is scored from
  CODE (reanimated usage, UI-thread springs, reduced-motion gates, haptics wiring),
  not from device feel. Static captures cannot show press feedback or springs.
- Scores 0–10 per criterion. **PASS = avg ≥ 9 AND no criterion < 8.**

## 2 — Shell-claims verification (this reviewer's mandate)

Read in full: `src/components/shell/TabBar.tsx`, `src/components/shell/immersive.tsx`,
`app/student/(tabs)/_layout.tsx` (+ grepped the four sibling role layouts).

| Claim | Verdict | Evidence |
|---|---|---|
| Persistent bar rendered ONCE per role, outside screens | **HOLDS** | All five `(tabs)/_layout.tsx` render `RoleTabBar` via the `tabBar` prop only; docblock cites the navigation-stability test pinning no-remount across pushes. |
| Immersive-hide (lecture player, exam runner, AI composer keyboard) | **HOLDS in code** | `useImmersiveTabBar()` wired ONLY in the five `(tabs)` layouts (verified in all five files); `IMMERSIVE_ROUTE_MATCHERS` = lectures/online-exams detail (`s.length >= 3`), `COMPOSER_ROUTE_MATCHERS` = `/student/ai` + `useKeyboardState()`. TabBar animates `translateY` (reanimated spring, reduced-motion → instant), NEVER unmounts, leaves layout flow only while hidden (position flip). Device-unverified per the doc's own honesty label. |
| Animated selection indicator | **HOLDS in code** | Exactly ONE 6dp orange dot, `withSpring(springs.snappy)` on the UI thread, transform-only, start-anchored with RTL sign flip in the pure, unit-tested `indicatorOffset()`; a11y-hidden + `pointerEvents="none"`; reduced-motion = instant set. |
| Extras verified | — | Icon morph outline→filled + 1.12 scale spring; badge pop (scale/opacity); `haptics.selection()` on switch (no-op on same tab); `animation:"fade"` tab transitions in all five layouts; tab labels 11/14 + no-wrap (the Round-3 clipping fix). |

**Shell verdict: the three claims are true in code and test-pinned; the animated
FEEL remains device-unverified (docs label this honestly).** One nit: the dot at
6dp on dark ground was read by the VLM as a "red underline artifact" under the
active label — at capture scale it reads ambiguous, not clearly intentional.

## 3 — Score table (30 screens × 12 criteria)

Legend — **C** composition · **T** typography · **S** spacing/rhythm · **H**
hierarchy · **I** iconography · **M** motion/feel (from code) · **N** navigation
clarity · **St** states · **A** accessibility · **R** RTL/Arabic craft · **B**
brand-token consistency · **P** polish. `*` = code-review-only (no capture).

| # | Screen | C | T | S | H | I | M | N | St | A | R | B | P | Avg | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` boot → welcome (`auth/index`) | 7 | 8 | 6.5 | 8 | 8 | 7 | 8 | 8 | 8 | 8 | 8.5 | 7.5 | **7.6** | FAIL |
| 2 | `/auth` login | 8 | 8 | 7.5 | 8 | 8 | 7.5 | 8.5 | 9 | 8.5 | 8.5 | 8.5 | 8 | **8.2** | FAIL |
| 3 | `/auth/register` * | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 7 | 7.5 | 8 | 8 | 8 | 8 | 7.5 | **7.7** | FAIL |
| 4 | `/student/dashboard` | 7.5 | 8 | 7 | 8 | 8 | 9 | 8.5 | 9.5 | 9 | 8.5 | 8 | 8 | **8.2** | FAIL |
| 5 | `/student/courses` | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 8.5 | 8.5 | 9.5 | 9 | 8.5 | 8 | 8 | **8.1** | FAIL |
| 6 | `/student/courses/[offeringId]` * | 8.5 | 8 | 8 | 8 | 8 | 8.5 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | **8.4** | FAIL |
| 7 | `/student/lectures/[lectureId]` * | 8.5 | 8 | 8 | 8.5 | 8 | 8 | 8.5 | 8.5 | 8.5 | 8 | 8.5 | 8 | **8.3** | FAIL |
| 8 | `/student/ai` (Assistant) | 6.5 | 7 | 6.5 | 7 | 6.5 | 8.5 | 7.5 | 8.5 | 8 | 7.5 | 7.5 | 7 | **7.4** | FAIL |
| 9 | `/student/alerts` (NotificationsScreen) | 6.5 | 7.5 | 6.5 | 7.5 | 8 | 7 | 7 | 8.5 | 8 | 8 | 8 | 7 | **7.4** | FAIL |
| 10 | `/student/profile` * | 8 | 8 | 8 | 8 | 8 | 8 | 8.5 | 9 | 9 | 8.5 | 8.5 | 8 | **8.3** | FAIL |
| 11 | `/student/online-exams` | 7 | 7.5 | 7 | 7 | 7.5 | 5.5 | 7.5 | 8.5 | 8 | 8 | 7 | 7 | **7.3** | FAIL |
| 12 | `/student/online-exams/[templateId]` * | 8.5 | 8 | 8 | 8.5 | 8 | 8.5 | 8.5 | 9 | 8.5 | 8 | 8.5 | 8 | **8.4** | FAIL |
| 13 | `/student/results` | 7.5 | 8 | 7.5 | 8 | 8 | 8 | 8 | 9 | 8.5 | 8 | 8 | 8 | **8.0** | FAIL |
| 14 | `/student/schedule` | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 9 | 8.5 | 8.5 | 8 | 8 | **8.1** | FAIL |
| 15 | `/student/messages` (MessagesUI) | 7 | 7.5 | 7 | 7.5 | 8 | 8 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 16 | `/student/assignments` * | 8 | 8 | 8 | 8 | 8 | 7 | 8.5 | 8.5 | 8.5 | 8.5 | 8 | 8 | **8.1** | FAIL |
| 17 | `/student/calendar` * | 7.5 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.6** | FAIL |
| 18 | `/teacher/dashboard` | 7 | 7.5 | 7 | 7.5 | 7.5 | 8.5 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 19 | `/teacher/grades` | 6.5 | 7 | 6.5 | 7.5 | 7.5 | 7 | 7.5 | 8.5 | 8 | 8 | 7.5 | 7 | **7.4** | FAIL |
| 20 | `/teacher/live` | 7 | 7 | 7 | 7.5 | 7.5 | 7 | 8 | 8.5 | 8 | 8.5 | 7.5 | 7 | **7.5** | FAIL |
| 21 | `/teacher/intelligence` * | 7.5 | 7.5 | 7.5 | 7.5 | 7.5 | 5.5 | 8 | 8.5 | 8 | 8 | 8 | 7.5 | **7.6** | FAIL |
| 22 | `/teacher/students` | 7 | 7.5 | 7 | 7.5 | 7.5 | 5.5 | 8 | 7 | 8 | 8 | 7.5 | 7 | **7.4** | FAIL |
| 23 | `/teacher/exams` + `[templateId]` * | 7 | 7.5 | 7 | 7.5 | 7 | 5.5 | 7.5 | 8.5 | 8 | 8 | 7.5 | 7 | **7.4** | FAIL |
| 24 | `/admin/dashboard` | 7.5 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **7.7** | FAIL |
| 25 | `/admin/students` * | 7.5 | 8 | 7.5 | 8 | 7.5 | 5.5 | 8 | 8.5 | 8.5 | 8 | 8 | 7.5 | **7.7** | FAIL |
| 26 | `/quality/dashboard` | 6.5 | 7 | 6.5 | 7 | 7 | 5.5 | 7 | 8 | 7.5 | 7.5 | 7 | 6.5 | **7.0** | FAIL |
| 27 | `/owner/dashboard` | 6.5 | 7 | 7 | 7.5 | 7 | 5.5 | 7.5 | 8 | 8 | 7 | 7.5 | 7 | **7.3** | FAIL |
| 28 | `/settings` * | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 8.5 | 8.5 | 8.5 | 8 | **8.1** | FAIL |
| 29 | `/report` (AppSheet route) * | 7.5 | 8 | 7.5 | 8 | 7.5 | 7.5 | 8 | 8 | 8 | 8 | 8 | 7.5 | **7.8** | FAIL |
| 30 | `/select-institution` * | 8 | 8 | 8 | 8 | 8 | 8 | 8 | 9 | 8.5 | 8.5 | 8.5 | 8 | **8.3** | FAIL |

**Overall average: 7.83 / 10 — 0 of 30 PASS** (best: course detail & exam runner, 8.4;
worst: quality dashboard, 7.0). Every screen is at least structurally sound (no
criterion below 5.5 anywhere); the gap to 9 is craft, not correctness.

### What the scores reward (verified in code)

- Student core (dashboard/courses/detail/player/exam-runner/profile/results) adopted
  the R334 foundations for real: `CountUp`/`RingProgress` stats, `useEntrance`/
  `enterStagger` card entrances, `PressableScale` press feedback, `haptics` on
  discrete choices, DataList (FlashList v2) virtualization with tri-state slots,
  humanized errors, `numberOfLines`/44pt floors, semantic palette only (0 hardcoded
  hex in routes).
- Sheets are real (`@gorhom/bottom-sheet` + keyboard-controller), states are the kit
  triad, a11y labels are near-universal on LedgerRow/Pressable, Arabic-first copy
  with `latn` numerals and counted plurals is consistent.

### What keeps it below 9 (the skeptic's case)

1. **Empty-state dead space everywhere** — VLM flagged it on alerts, messages,
   results, grades, live, quality, owner: content top-stuck, 40–70% of the viewport
   a paper void. `EmptyState` sits in scroll flow instead of optically centering.
2. **Motion adoption is 20/30, not 30/30** — online-exams list, calendar, teacher
   intelligence/students/exams, admin dashboard/students, quality + owner dashboards
   have NO entrance motion and NO press feedback beyond stock Pressable opacity
   (several use raw `style={({pressed})…}` instead of `PressableScale`). These are
   exactly the "web dashboard" seats.
3. **Dashboard-strip crowding at 360–430dp** — the 4-KPI + ring strip and 4-tile
   quick-action grids still read cramped at small widths (VLM on base + fix-390);
   numerals hug card edges; baseline of labels under numerals off-center.
4. **Tab bar craft at the margins** — labels at 11/14 fit but read tiny/low-contrast;
   badge dot placement collides with the label on some captures; the 6dp indicator
   dot reads as an artifact on dark ground.
5. **Header crowding / three-alignment axes** on AI (badge + model line + back), and
   `[01]`-bracket MonoLabel section indices (a deliberate drafting-table motif, but
   in RTL it injects LTR bracket noise and the VLM consistently reads it as web
   chrome).
6. **Stale-capture vs code disagreements** (honesty): AI raw model id, owner raw
   audit codes (`APP_INTERNAL`…), results/schedule layouts — the CODE has all four
   fixed (model id dropped, `auditActionLabel` fallback «عمليّة إداريّة», EmptyState
   + DataList recompose); the captures predate those commits. Scored on code, noted
   from captures.

## 4 — Tickets (every sub-9 driver; file → issue → fix)

### P0 — blocks any 9+ claim

| # | File | Issue | Fix |
|---|---|---|---|
| P0-1 | `src/components/ui/states.tsx` | `EmptyState` renders top-stuck in scroll flow → 40–70% dead void on 7+ captured screens (alerts, messages, results, grades, live, quality, owner) | Center optically: `flex:1` + `justifyContent:center` when the screen body is otherwise empty (or `minHeight: 60vh`), keep illustration+copy+CTA as one group |
| P0-2 | `app/student/(tabs)/dashboard.tsx` (+ `features/student/components.tsx`) | 4-KPI strip + ring crams at 360–390dp; numerals hug edges; label baselines off-center under numerals (VLM base + fix-390) | 2×2 grid below a width breakpoint; give numerals `paddingHorizontal` floor and align label baselines on one grid |
| P0-3 | 10 screens: `online-exams.tsx`, `calendar.tsx`, `teacher/(tabs)/intelligence.tsx`, `teacher/(tabs)/students.tsx`, `teacher/exams.tsx`, `teacher/exams/[templateId].tsx`, `admin/(tabs)/dashboard.tsx`, `admin/(tabs)/students.tsx`, `quality/(tabs)/dashboard.tsx`, `owner/(tabs)/dashboard.tsx` | Zero entrance motion, zero press feedback (stock `pressed` opacity or nothing) — the residual web-dashboard seats | Adopt `useEntrance`/`enterStagger` on first content block + `PressableScale` on every card/row; ~1 h per screen with the kit |
| P0-4 | `src/components/ui/pressables.tsx` (lines ~62, ~117) | `Button`/`IconButton` fire raw `Haptics.impactAsync` — bypasses the persisted kill-switch + 60ms throttle the `@/haptics` module owns | Route through `haptics.impact("light")` (2-line change; policy stays in one place) |
| P0-5 | `app/teacher/grades.tsx` | Helper line «اسحب…» clipped off-screen at the left edge on the 390 capture (breadcrumb overflow) | `numberOfLines={1}` + ellipsis or wrap the instruction under the picker; verify at 360dp |

### P1 — clear 9-blockers on specific screens

| # | File | Issue | Fix |
|---|---|---|---|
| P1-1 | `app/quality/(tabs)/dashboard.tsx` | `overview.data as Record<string, unknown>` ×3 — untyped wire, brittle + generic feel (route-inventory #4 worst) | Type the payload in `src/api/*` (zod/manual), render through MetricHero/Tiles like admin |
| P1-2 | `app/owner/(tabs)/dashboard.tsx` | Stat cards render number-only (blank, contentless feel); alerts list manual | Pair each MetricTile with a trend/delta or sparkline; reuse kit EmptyState grammar for the alerts list |
| P1-3 | `src/features/ai/Assistant.tsx` (header) | Provider badge + disclosure + icon buttons = three alignment axes; header reads debug-ish (VLM) | Collapse provider/model into ONE trailing info chip that opens a sheet |
| P1-4 | `app/student/lectures/[lectureId].tsx` | Transcript maps up to 200 cues in a ScrollView — jank risk on long lectures (perf) | Virtualize cues (FlatList inverted or FlashList) |
| P1-5 | `src/components/shell/TabBar.tsx` | 11/14 labels fit but read tiny + low-contrast inactive on light; badge dot can overlap label glyphs at 360dp; 6dp dot ambiguous on dark | Raise inactive label contrast one step; nudge badge `start` offset; consider 8dp dot or dot+icon morph only |
| P1-6 | `app/student/online-exams.tsx` | Orange exam-title + «متاح الآن» chip + «لماذا؟» + link = 4 accent uses on one card; no haptics/motion on the list | Title to ink; keep accent on the single CTA chip; add selection haptic |
| P1-7 | `app/teacher/(tabs)/students.tsx` | Triad rendered as ad-hoc muted text/Cards, not kit `EmptyState`/`ErrorState` (grammar inconsistency) | Swap to the kit states (matches OfferingRoster elsewhere) |
| P1-8 | `app/student/calendar.tsx` | No motion/haptics on a press-heavy month grid | `PressableScale` on day cells + `haptics.selection()` on day pick |

### P2 — polish & design-debate

| # | File | Issue | Fix |
|---|---|---|---|
| P2-1 | `src/components/ui/screen.tsx` (`SectionBar`) | `[01]` MonoLabel indices: deliberate drafting motif, but LTR brackets inject bidi noise in RTL headers and read as web counters | Keep if brand-intentional, but render via RTL-isolated `<T>` (or move to a start-side rule); at minimum A/B on device |
| P2-2 | `app/index.tsx` / welcome | No haptic on the CTA «ابدأ الآن»; ~300px dead gap between subhead and CTA (VLM) | `haptics.impact("light")` on press (via P0-4 fix) + tighten the gap or add the plan-drawing animation there |
| P2-3 | `app/student/results.tsx` | CountUp/Ring present but no haptics on segment/share actions | Add `haptics.selection()` |
| P2-4 | Segment control styling (`courses` toolbar, `online-exams` filter) | Outlined 1px boxes read as HTML tabs (VLM ×2) | Consider filled-track native segmented look (`accentSoft` track + thumb) |
| P2-5 | `r-quality-dashboard` capture | Tab labels show kashida-like stretching («اللـوجـة») — likely RN-web justify artifact, unverifiable here | Verify on device; if real, drop `textAlign: justify`-style stretching on tab labels |
| P2-6 | Captures vs code drift | 4 stale-capture disagreements (AI model id, owner audit codes, results/schedule layouts) — reviewers downstream may re-flag fixed issues | Re-capture after the fix commits; version captures in `docs/mobile/screens/captures/` |

## 5 — Verdict

**Overall average 7.83 / 10 · 0/30 PASS · 5 P0 · 8 P1 · 6 P2.** The engineering
foundations (shell, motion kit, haptics policy, states kit, RTL discipline,
palette-only theming) are genuinely strong and honestly labeled — the shell's three
headline claims all hold in code. What keeps the mission below its own 9-bar is
uniformity of CRAFT, not architecture: 10 ungoverned-feeling seats with zero motion,
empty states that die at the top of the scroll, small-width crowding on the two
flagship dashboards, and a tab bar whose marginal details (label contrast, badge
placement, dot ambiguity) are the last 5% a native app earns. None of the P0s are
large; all are patterned fixes on existing kit.

*Reviewer 3 — evidence: code reads (all files cited), 16 VLM-inspected captures,
`route-inventory.md`, 13 `docs/mobile/screens/*.md`. No code changed.*
