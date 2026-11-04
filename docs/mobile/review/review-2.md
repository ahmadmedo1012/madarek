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

<!-- TICKETS -->
