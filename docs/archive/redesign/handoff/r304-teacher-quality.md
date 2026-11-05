# Handoff — R304 Agent 7 (teacher, quality & assessment UX)

Branch: `redesign/r304-teacher-quality` (from main @ r303 = `e3caf8d`)
Round: R304 · Final SHA: see `git log -1` (pushed)

## What this round did

One sentence: the five 4C-era family sheets consolidated into the ONE
dedicated `frontend/src/styles/teacher-quality.css`, and the teacher /
quality / assessment surfaces gained priority-legibility (due edges,
tone-coded attendance, severity filter), sortable rosters, an exam
lifecycle rail, and a big inline-style promotion — zero business-rule
changes.

## Sheet consolidation (the structural change)

- `frontend/src/styles/teacher-quality.css` is now the SINGLE family
  sheet (~2660 L, `@layer pages`): §1 `tq-` (shared primitives +
  dashboard/intelligence/profile/labs) · §2 `tpg-` (TeacherPages) ·
  §3 `qlt-` (QualityPages) · §4 `exa-` (ExamAuthorPages) · §5 `oex-`
  (OnlineExamsPages) · §6 `cur-` (curriculum builders) — the §2–§5
  bodies migrated VERBATIM from the deleted sheets, then §6-new R304
  primitives appended.
- DELETED: `styles/teacher-pages.css`, `styles/quality-pages.css`,
  `styles/exam-author.css`, `styles/online-exams.css` (zero consumers
  remain — every owned page module now imports
  `import '../../styles/teacher-quality.css';`).
- **admin.css dependency migrated**: QualityPages no longer imports
  admin.css nor consumes `.admin-students-*`; the same pill anatomy
  lives here as `.tq-toolbar` / `.tq-search` / `.tq-search-input`.
  admin.css itself untouched (owner's rules intact for admin/owner
  consumers).

## Layout decisions per surface (R304 deltas)

- `/teacher/students` + `/teacher/grades` read tables — sortable
  headers (الاسم / الحضور / المتوسّط) via a real `<button>` inside the
  columnheader (`tpg-sort`, glyph aria-hidden): click 1 = numeric
  highest-first (name alphabetical), click 2 flips, click 3 resets to
  the server order; active th carries `aria-sort`. Client-side view
  control only — wire payloads and default order untouched. Pure
  helpers exported-free, test-covered indirectly (roster order asserts
  in the temp browser check; unit pins all held).
- `/teacher/assignments` — queue sections carry `data-due`:
  `overdue` → 3px danger inline-start edge, `soon` (≤3 days) → warning
  edge (the quality-alerts edge grammar). `.queue-group` classes kept
  byte-identical (e2e locator contract).
- `/teacher/attendance` — sticky summary counts are tone-inked via
  `data-tone` (حاضر green / متأخّر amber / غائب rose / بعذر copper);
  honest zero-dim now rides `.tpg-att-stat.is-dim` /
  `.tpg-dist-row.is-dim` (was 5× inline opacity).
- `/teacher/exams/:templateId` — NEW `TemplateLifecycle` rail
  (`exa-lifecycle`): مسودة → مراجعة الجودة → الاعتماد → النشر للطلاب
  with done/current/rejected step states (REJECTED turns the review
  step danger; CLOSED shows the whole rail done). Stage labels are
  deliberately NOT the status vocabulary — the status Badge beside the
  title stays the source of truth; presentation only.
- `/quality/alerts` — severity filter pills (الكل/حرج/تحذير/معلومة
  with counts, `.filter-pill` grammar, `qlt-alert-filter` row) — a
  read-only client-side view control; default الكل keeps every pinned
  row contract visible.
- ExamAuthorPages — ~50 inline-style clusters promoted to the sheet
  (`exa-form`, `exa-form-foot`, `exa-error-line`, `exa-gate*`,
  `exa-fact-*` dotted-leader ledger, `exa-picker*`, `exa-grade-card`
  box + `exa-answer-surface`, `exa-choice-*`, `exa-note-line`). Only 2
  functional inline styles remain (Field minWidth, FormField margin).
  DetailLine keeps its `flex items-baseline gap-2 flex-wrap` utility
  composition (the r167 source-scan pin).
- Curriculum builders (AuthoringModal's siblings) — all row/form/
  structure inline styles promoted to `cur-*` classes; the lecture
  row's selection state now rides `[data-selected]` on `.cur-lec-row`
  instead of an inline border ternary. AuthoringModal itself untouched
  (shared with other families).
- OnlineExamsPages — sheet import line only (taker is code-frozen; the
  oex section moved verbatim).

## Files changed

- `frontend/src/styles/teacher-quality.css` (rewritten/consolidated +
  R304 sections)
- DELETED: the four sibling sheets (see above)
- `frontend/src/pages/teacher/TeacherPages.tsx` (sortable rosters,
  queue data-due, tone-coded summary, dim classes, tq-feedback/tq-area)
- `frontend/src/pages/teacher/ExamAuthorPages.tsx` (lifecycle rail +
  inline-style promotion)
- `frontend/src/pages/quality/QualityPages.tsx` (toolbar migration ×2,
  alerts severity filter, import line)
- `frontend/src/pages/exams/OnlineExamsPages.tsx` (import line)
- `frontend/src/pages/teacher/{TeacherDashboardPage,TeacherIntelligencePage,TeacherProfilePage,TeacherLabsPage}.tsx`
  (import comment only)
- `frontend/src/components/curriculum/{ChapterBuilder,CheckpointBuilder,CurriculumAuthoringPanel,LectureAuthoring}.tsx`
  (inline-style promotion)

## Test / gate results (final tree)

- `npm run lint` — 0 errors / 18 warnings (byte-equal to the base
  warning set).
- `npm run typecheck` — clean (both workspaces + test configs).
- `npm run test -w frontend` — 2055 passed / 7 failed; the 7 are the
  PRE-EXISTING base failures (landing-poster-refinement ×1,
  assets ×1, badge-rarity-contrast ×3, token-snapshot ×2 — verified
  failing on pristine r303 via stash). Zero new failures.
- `npm run test -w backend` — 1783/1783.
- Gates: `check-raw-css.sh` PASS (TSX inline spacing 0 findings) ·
  `check-colors.sh` OK · `check-motion-tokens.sh` OK ·
  `check-icons.sh` OK · CSP n/a (index.html untouched).
- Bundle: entry 71.3/80 PASS, pdf 95.7/110 PASS; TOTAL 823.5 KB gz vs
  the 650 ceiling **FAILS ON THE BASE TOO** (823.4 KB — r303's OPTIKKA
  three-module landing owns the ceiling breach; this branch adds
  +0.1 KB). Coordinator should re-key the total ceiling or land the
  landing split separately.
- Browser check (Playwright e2e over the real Vite SPA + mock
  transport, temp spec deleted after the run): dashboard desktop+390
  (no horizontal overflow, all priority regions render), students
  roster (aria-sort cycles + row order flips), exams hub, plus the
  committed journeys teacher-grading (2) / quality-moderation (2) /
  online-exams (2) — all green in the dark RTL theme.

## Requests for Agent 10 / coordinator

- The four sheet deletions are intentional; when folding main.tsx-level
  imports, keep exactly one `teacher-quality.css` import per owned lazy
  module (Vite dedupes).
- The pre-existing 7 unit failures + the bundle-total ceiling breach
  are NOT this branch's — flagged above with evidence.
- `.pf-filterbar .pill { min-block-size: 44px }` still lives here (4C
  request stands: drop it when 4E raises the shared pill floor).
