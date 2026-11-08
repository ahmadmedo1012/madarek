# R342-08 — Student Experience — branch record

Branch: `wip/r342-student` · base `620a31ec` (origin/main at start).
Agent: R342-08 (Student Experience Product Designer / Frontend Lead).

## Scope verified

- **Reconnaissance**: `AGENTS.md`, `docs/redesign/r341/{QUEUE,OWNERSHIP,HANDOFF,arsenal}.md`,
  `frontend/src/App.tsx` route tree, `lib/nav.ts` STUDENT_NAV, the pattern
  library (`components/patterns/*`, `styles/patterns.css`), and the D8/D11
  header-CTA-pair precedent from the merged w8 commits.
- **What earlier waves already solved** (measured, not assumed):
  D6 shell, D7a dashboard/courses/catalog/calendar (+course detail),
  D7b exams chips, D7c results/schedule/alerts/messages — all ≥ floor when
  re-measured on this branch with the hermetic fixture method
  (dashboard 99/99.1 · courses 98.8/98.7 · catalog 98.9/98.9 · calendar
  99.3/99.3 light; course detail 98.8/98.8; results/schedule/alerts/messages
  97.7–99.3). NOT rewritten — the branch preserves them.
  `/student/lectures/:id` measured 95.2–95.6 l+d (above floor; the missing
  [nn] numeral is its one weak axis) — left untouched per "don't rewrite
  pages already meeting the target".

## What this branch changed

### 1. The honest measurement first (`scripts/conformance/pages-student.mjs`)

The D7d twin of pages-authed.mjs (D7a) / pages-teacher.mjs (D8) /
pages-owner.mjs (D11): the exact pages.mjs probe (6 axes · floor 90) +
the seeded-STUDENT hermetic session + a 24-endpoint honest fixture corpus
(mooc · jobs · labs · lab-sessions · ar-experiences · library/books ·
loans · matrix · research · published · live/sessions · events · ai
config+conversations · posts · leaderboard · achievements · skills ·
training/me · materials — every wire shape mirrors its hook interface).

**Honest BEFORE (with fixtures, light 1440+390)**: every D7d route failed
@390 (77.1–82.6) — hover axis 0 (the D6 topbar «اسأل AI» hides ≤920, so the
phone band had no in-viewport primary on 15 pages); `/student/ai` failed
hover at BOTH bands (the composer's send button rides disabled on an empty
draft); ar/university missed the [nn] numeral (pattern 80).

### 2. The D7d header CTA pairs (15 pages + online-exams)

The D11/D8 measured recipe: ONE accent primary + ONE ghost, honest
navigation to each surface's real siblings (the exam journey's
results→mastery loop, the immersive trio, the growth family, the
university-services family, the library/research/downloads shelves).
`/student/online-exams` carried the same phone-band defect (81.9 @390 →
98.6/99). ar + university also seat the family grammar ([01] numeral +
eyebrow; university's numeral rides the identity SectionBar because the
r183 pin owns its h1 text).

**AFTER (light + dark, 1440+390)**: 72/72 D7d cells ≥ 97.6, gate PASS.
Online-exams 98.3–99 l+d. D7a regression green (≥98.7 l · 99 d).

### 3. The topbar unread badge contrast repair (notifications.css)

The badge mixed `--danger-ink` (the deep TEXT shade) under `--danger-fg`
(warm-ink — the ink designed for the CORAL fill): 1.98:1 on every page.
Re-seated on the tokens' own documented pair (`--danger` fill +
`--danger-fg`): 5.10:1 light · 7.81:1 dark. Every student page's darkInk
axis lifted.

## Tests-are-law reconciliations (zero test edits)

- r183-B3 pins the university h1 text → numeral re-seated on the identity
  section's §B2 bar (same heading semantics the r305s-kicker carried).
- r157 6A7 pins ZERO anchors on /student/downloads → its pair navigates
  via useNavigate buttons, never `<a>`.
- r157/r164g own «رفع بحث جديد» / «محادثة جديدة» uniqueness → research
  pairs library+courses, ai pairs matrix+library (the rail/sidebar keep
  the workflow labels).
- 18-G renders JobsPage WITHOUT a Router → JobsHeaderAction
  (useInRouterContext) rides the SPA Link in-app, a plain href in bare
  unit renders.

## Verification (executed on this branch)

| check | result |
|---|---|
| `npm run typecheck` | 0 errors (both workspaces + tests) |
| `npm run lint` | 0 errors (15 pre-existing warnings, none in touched files) |
| `npm test` (vitest) | frontend 3040 ✓ · backend 1998 ✓ |
| e2e: student-pages-a/b, ai-assistant, library-borrow, notifications, student-dashboard, online-exams, r305-shell-heron, r319-shell-chrome, mobile-bottom-nav | 56 ✓ |
| `pages-student.mjs --gate` (18 D7d × 1440/390 light) | PASS, worst 97.6 |
| `pages-student.mjs` dark (18 D7d × both bps) | worst 97.9 |
| `pages-authed.mjs` D7a regression | ≥98.7 light · ≥99 dark |
| stylelint ratchet gate | green — errors 45→44, rawZIndex 79→75, rawHex 36→34 (improved) |
| check-colors --strict / check-icons / check-raw-css --strict / check-motion-tokens / tokens build --check | all PASS |
| css-counts | 78 files · 52 important (held) |
| bundle gate | 756.2 / 770 KB gz PASS (entry 64.4 ≤ 92 · pdf 95.7 ≤ 110) |
| browser review (Chromium, screenshots + probes) | 390/768/1024/1440/1920 light + 390 dark sampled; header pairs in-viewport at every band; bottom-nav clearance 81–240px (measured, the VLM "cut off" reads were crop artifacts) |

## Commits

- `691e83e0` feat(r342/08): pages-student.mjs — the D7d conformance harness + the honest fixture corpus
- `63cae31a` feat(r342/08): the D7d header CTA pairs — 15 student surfaces on the D11/D8 measured seat
- `22b00053` fix(r342/08): the topbar unread badge's contrast repair — 1.98:1 → 5.10:1 (light) / 7.81:1 (dark)
- `4ba39c28` feat(r342/08): /student/online-exams header CTA pair — the phone band's primary
- `bb4d91c6` chore(r342/08): pages-student-results.json — the AFTER matrix, gate PASS

## Residuals (honest)

- The `[nn]`-numeral gap on `/student/lectures/:id` (95.2–95.6 l+d, above
  floor) — left per the "don't rewrite pages meeting the target" rule.
- `--fs-app-h1` (28px @1440) is invisible to the rung-harvest regex
  (the `[a-z-]+` name pattern can't match the digit `1`), so every page's
  h1 counts as one off-ladder node; payment's six SectionBars make it the
  weakest type cell (87–88). Instrument-level truth — reported, not
  touched (shared instrument, lead-owned).
- The shell skip-link rests at 3.76:1 (white on raw accent — a shared
  base.css element outside this task's ownership; documented AA exception
  family, 1 node per page).
- WebKit cells not measured (no WebKit build on this box — reported as
  residual per the AGENTS.md law, never faked).
