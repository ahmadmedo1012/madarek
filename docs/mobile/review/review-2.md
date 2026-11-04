# Review Panel 2 — Top-30 Screens (R334 mobile, independent)

Reviewer #2 of 3 · branch `r334/rev2` · evidence window: this session only.
Emphasis (this reviewer): **RTL/Arabic craft, accessibility, states coverage** — hunted
specifically for bidi issues in mixed Arabic/Latin strings, numeral consistency, and
empty-states that are actually error states (or vice versa).

## 1 — Method (and honesty labels)

Per screen of the TOP-30 in `docs/mobile/route-inventory.md` §3:

1. **Code read** — route file under `apps/mobile/app/**` (+ delegate under
   `src/features/**` where the route is a wrapper) and the per-screen doc
   `docs/mobile/screens/*.md`. Construction criteria (worklets, reduced-motion,
   state wiring, a11y props, haptics, one-accent discipline) judged from code.
2. **Visual evidence** — PNG captures in `/home/z/caps/` inspected via
   `z-ai vision` (my own 13 fresh calls; saved to `/tmp/vlm2/`). Composition,
   typography, spacing, clipping, RTL/bidi rendering judged from those answers.
3. Cross-checked with targeted greps (state-kit usage, `accessibilityLabel`
   density, `haptics.*`, `humanizeError`, DataList adoption) — counts recorded.

**Honesty labels used in the table:**

- `[VLM+code]` — my fresh vision call(s) on ≥1 capture + code read. Strongest evidence.
- `[code+doc]` — no fresh VLM (API quota exhausted after 13 calls — 429 rate-limit
  shared with sibling sessions; retried with backoff, documented in §4), judged from
  code read + per-screen doc + grep counts. **Visual criteria are inferred, not seen.**
- `[code]` — no capture exists for this screen at all (register, course detail,
  lecture player, exam runner, intelligence, teacher exams, settings, report,
  select-institution). Visual criteria scored from code structure only — marked
  CODE-ONLY and capped accordingly.

Corroboration used (labeled, not primary): the mission team's own dev artifacts
`/home/z/caps/vlm-3.json` (teacher dashboard + owner governance captures) and
`vlm-fix2.json` (dashboard 768 stat-overflow fix confirmation).

**VLM misreading discipline:** the vision model garbles Arabic glyphs when quoting
(e.g. read «الإتقان» as «الإيفان», «بنك الأسئلة» as «بنك مفاطر»). Every
"misspelled Arabic string" claim was checked against code and **discarded when the
code shows the correct string**. Only structural observations (dead space, bidi
run-ordering of Latin fragments, contrast, collisions) that are code-plausible were
kept as tickets. Numerals claims were verified against `src/lib/format.ts`:
`useNumerals()` renders ONE script per user preference (`latn` default, Arabic-Indic
opt-in) — the VLM's "٥ من 5 mixing" claims are misreadings of the mono `[01]`
SectionBar indices and were discarded; the SectionBar itself is a deliberate
mono-Latin design token (see ticket P2-5).

## 2 — Score table (30 × 12)

Criteria: C composition · T typography · S spacing/rhythm · H hierarchy · I iconography ·
M motion/feel · N navigation clarity · St states (empty/error/loading/offline) ·
A accessibility · R RTL/Arabic craft · B brand tokens (paper/ink/one-orange) · P polish.
PASS = avg ≥ 9 AND no criterion < 8.

| # | Screen | Ev | C | T | S | H | I | M | N | St | A | R | B | P | Avg | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | `/` welcome | VLM+code | 7 | 8 | 7 | 8 | 8 | 9 | 9 | 9 | 8 | 8 | 10 | 8 | 8.25 | FAIL |
| 2 | `/auth` login | VLM+code | 7 | 8 | 7 | 8 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 8 | 8.17 | FAIL |
| 3 | `/auth/register` | CODE-ONLY | 9 | 9 | 9 | 9 | 8 | 7 | 9 | 9 | 9 | 9 | 9 | 9 | 8.75 | FAIL |
| 4 | `/student/dashboard` | VLM+code | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 10 | 9 | 7 | 9 | 9 | 8.92 | FAIL |
| 5 | `/student/courses` | VLM+code | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 10 | 9 | 7 | 9 | 9 | 8.83 | FAIL |
| 6 | `/student/courses/[id]` | CODE-ONLY | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 8.92 | FAIL |
| 7 | `/student/lectures/[id]` | CODE-ONLY | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 10 | 8 | 9 | 9 | 9.00 | PASS |
| 8 | `/student/ai` | code+doc | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 9 | 9 | 9 | 9 | 8.92 | FAIL |
| 9 | `/student/alerts` | code+doc | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.75 | FAIL |
| 10 | `/student/profile` | code+doc | 9 | 9 | 8 | 8 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.67 | FAIL |
| 11 | `/student/online-exams` | VLM+code | 8 | 9 | 8 | 8 | 8 | 8 | 9 | 10 | 9 | 9 | 9 | 9 | 8.67 | FAIL |
| 12 | `/student/online-exams/[id]` | CODE-ONLY | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 10 | 10 | 9 | 9 | 9 | 9.08 | PASS |
| 13 | `/student/results` | code+doc | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 7 | 9 | 9 | 9 | 8.75 | FAIL |
| 14 | `/student/schedule` | code+doc | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.75 | FAIL |
| 15 | `/student/messages` | code+doc | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8.83 | FAIL |
| 16 | `/student/assignments` | code+doc | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.75 | FAIL |
| 17 | `/student/calendar` | code+doc | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.75 | FAIL |
| 18 | `/teacher/dashboard` | code+doc | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8.67 | FAIL |
| 19 | `/teacher/grades` | VLM+code | 8 | 9 | 8 | 8 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8.67 | FAIL |
| 20 | `/teacher/live` | VLM+code | 8 | 9 | 8 | 8 | 7 | 8 | 8 | 9 | 8 | 8 | 8 | 9 | 8.17 | FAIL |
| 21 | `/teacher/intelligence` | CODE-ONLY | 9 | 9 | 9 | 9 | 8 | 6 | 9 | 9 | 8 | 9 | 9 | 9 | 8.58 | FAIL |
| 22 | `/teacher/students` | code+doc | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.75 | FAIL |
| 23 | `/teacher/exams` (+detail) | CODE-ONLY | 8 | 9 | 8 | 8 | 8 | 6 | 8 | 9 | 8 | 9 | 9 | 8 | 8.17 | FAIL |
| 24 | `/admin/dashboard` | code+doc | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 8 | 8.75 | FAIL |
| 25 | `/admin/students` | code+doc | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 7 | 9 | 9 | 9 | 8.67 | FAIL |
| 26 | `/quality/dashboard` | code+doc | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 6 | 9 | 9 | 9 | 8.58 | FAIL |
| 27 | `/owner/dashboard` | code+doc | 9 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8 | 9 | 9 | 9 | 8.83 | FAIL |
| 28 | `/settings` | CODE-ONLY | 9 | 9 | 9 | 9 | 8 | 7 | 9 | 9 | 9 | 9 | 9 | 9 | 8.75 | FAIL |
| 29 | `/report` | CODE-ONLY | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 9 | 8 | 9 | 9 | 9 | 8.75 | FAIL |
| 30 | `/select-institution` | CODE-ONLY | 9 | 9 | 9 | 9 | 8 | 8 | 9 | 10 | 9 | 9 | 9 | 9 | 8.92 | FAIL |

**Overall average: 8.73 / 10 · PASS 2 · FAIL 28.**

Why so few passes under a strict bar: construction quality is genuinely high
(state triads + `humanizeError` verified in *every* screen file grepped; haptics on
all student/teacher core; RTL-first shell), but three systemic gaps recur —
(1) no bidi isolation for mixed Arabic/Latin data strings, (2) thin `accessibilityLabel`
coverage on governance/registry surfaces, (3) motion + empty-state composition debt on
teacher tools and long-tail. Each is a small fix multiplied by 30 screens.

## 3 — Tickets (every point under 9, consolidated)

### P0 — systemic, blocks "9" anywhere they touch

1. **[RTL] No bidi isolation for mixed Arabic↔Latin runs.** Data strings like
   «مخططات UML — Use Case», «SE301»، «د. سلام البوسعيدي» render as weak-direction
   runs; VLM confirmed dash/period placement flips at run boundaries on dashboard
   (360/430) and courses (dark + 390). Fix: wrap Latin fragments in Unicode FSI/PDI
   isolates (or a `BidiText` primitive) at `LedgerRow` sublines
   (`src/components/ui/data.tsx`) + dashboard agenda rows. Affects #4, #5, #13, #6.
2. **[a11y] Governance/registry surfaces are screen-reader-silent on rows.**
   `quality/(tabs)/dashboard.tsx` has **0** `accessibilityLabel`; `admin/(tabs)/students.tsx`
   **1**; `results.tsx` **1**. Fix: label every MetricTile/KPI row and result row
   (subject + value + unit), matching the student-core pattern. Affects #13, #25, #26.

### P1 — real UX defects

3. **[motion] Teacher tools motion debt:** `intelligence.tsx` and `exams.tsx`(+detail)
   have zero haptics/PressableScale/entrance — reads web-panel (teacher.md TODO
   admits it). Fix: adopt `haptics.selection` + `PressableScale` rows minimum.
   Affects #21, #23.
4. **[composition] Empty/sparse states leave a 40–70% dead band below content** —
   VLM flagged on welcome, exams list, grades («لا مقرّرات»), live («لا توجد جلسات
   قادمة»), teacher dashboard first-run (3 stacked empty sections). Fix: vertically
   center `EmptyState` in the remaining viewport or add quiet guidance footer.
   Affects #1, #11, #18, #19, #20.
5. **[hierarchy] Exams list: the «متاح الآن» accent chip out-shouts the real «ابدأ»
   action** (VLM, `r-student-online-exams.png`). Fix: demote chip to soft tone,
   promote start action. Affects #11.
6. **[polish] Live screen CTA competition:** orange «جلسة جديدة» vs white
   «إدارة البث المباشر» card fight for the accent moment (VLM, `r-teacher-live.png`).
   Fix: one accent — make the primary lifecycle action own it. Affects #20.
7. **[a11y] Muted `sm`/`xs` text on paper (#F6F6EE) likely < 4.5:1** — VLM flagged
   repeatedly (inactive segments, captions, footer). Fix: audit muted ink tokens in
   `src/design/theme.ts` for AA at real sizes. Cross-cutting.
8. **[a11y/polish] Login `SecretField`: eye toggle crowds the placeholder hint**
   (VLM, `02-login-filled.png`) — verify padding/hitbox at 200% font
   (`src/components/ui/fields.tsx`). Affects #2.
9. **[polish] Tab-bar unread badge dot sits close enough to «الإشعارات» label to read
   as collision** (VLM, courses-dark). Verify post no-wrap fix; nudge badge inset
   (`src/components/shell/TabBar.tsx`). Affects all 5 student tabs.

### P2 — polish & consistency

10. **Welcome footer legal line near-illegible + floor callouts use Latin digits 1–6**
    in the plan drawing; also dead band (→ P1-4). `app/index.tsx`.
11. **Profile menu = 30 flat `LedgerRow`s, no section grouping/virtualization**
    (`app/student/(tabs)/profile.tsx`) — scannability cost.
12. **Admin dashboard papers preview pinned to page 1** (`useState(1)`, no pagination
    UI) (`app/admin/(tabs)/dashboard.tsx`).
13. **Teacher exams authoring still `RowList.map` + `SelectField` sheets** —
    DataList/AppSheet migration owed (`app/teacher/exams.tsx`, 462 ln).
14. **Grades empty state is a dead end** — no CTA back to offerings
    (`app/teacher/grades.tsx`).
15. **SectionBar `[01]` mono Latin indices** — deliberate token, but consider
    Arabic-Indic rendering when the user's numerals preference is `arabic-indic`
    (`src/components/ui/screen.tsx`); also document the choice in theming.md.
16. **Register keeps local per-field validation** (documented compromise vs zod
    adapter) — same error seat but a second validation dialect. `app/auth/register.tsx`.
17. **Report route mounts sheet via `setState` after push** — fine on device per doc,
    but the 1-frame flash of empty `Screen` is unverified (no capture exists).

## 4 — Reviewer-2 process log (honesty)

- Fresh `z-ai vision` calls: **13 succeeded** (welcome, login ×2, dashboard ×4 incl.
  360/430/768/dark… note: base+360+430+768 are 4 of the 13; courses-dark, courses-390
  fix, exams, teacher-grades, teacher-live, admin-teachers→rendered the welcome screen
  (signed-out walk capture — provenance defect of that capture, not the app)).
- **21 calls were rejected with HTTP 429** (quota shared with sibling review sessions);
  retried with 15–25 s backoff across 3 waves — still throttled. Screens affected are
  labeled `[code+doc]` in the table; **their visual scores are inference, not sight.**
- One capture (`r-admin-teachers.png`) shows the welcome screen, not admin teachers —
  the walk was signed out; flagged so the lead re-captures.
- `r-student-dashboard-768.png` shows the pre-fix stat overflow; commit `0abea65`
  (CountUp input-neutralizing) + dev artifact `vlm-fix2.json` claim it fixed —
  credited, but reviewer-2 did not see a fresh post-fix 768 capture.
- Numerals: verified `useNumerals()` gives one script per preference app-wide
  (`src/lib/format.ts` + 20 call sites); VLM "mixed ٥/5" claims discarded as glyph
  misreads. The only true Latin-digit constants are SectionBar `[01]` (P2-15) and the
  welcome plan-drawing callouts (P2-10).
- Empty-vs-error honesty: dashboard's failed-agenda path was verified to render
  `ErrorState`, not the «استرح» empty note (student-home doc §D7, code confirmed) —
  no fake-empty found anywhere in the 30; this axis is genuinely strong.

## 5 — Verdict summary

**Overall average 8.73 · PASS 2/30 (#7 lecture player, #12 exam runner — both
CODE-ONLY, i.e. the two most instrumented screens in the codebase pass on
construction; their visual verification is still owed).** The brand system, state
triad discipline, and Arabic-first copy are excellent and consistent. The distance
to a 9+ fleet is: bidi isolation (P0-1), governance a11y labels (P0-2), teacher-tool
motion (P1-3), and empty-state composition (P1-4) — all mechanical fixes.

