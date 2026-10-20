# Handoff — Agent 4B (Research cycle & library) — `redesign/4b-research`

> Final report at the bottom (§ Final report). Branch: `redesign/4b-research`.

## Scope (BLUEPRINT §1, family 4B)

Owned files: `pages/student/LibraryPage.tsx`, `pages/student/ResearchPage.tsx`,
`pages/teacher/ResearchReviewPage.tsx`, `pages/DocumentViewerPage.tsx`,
`components/pdf/` (PdfViewer, AnnotationsPanel, loadError), `styles/pdf.css`.
Family additions (page-scoped to my routes only): `components/paper/`
(StatusPipeline, ScanResults), `styles/research.css`, this handoff file.

Routes: `/student/research`, `/teacher/research`, `/student/library` +
`/teacher/library` (same file), `/document/:filename`.

## Route map — user goal + mobile recomposition

| Route / surface | Primary user goal | Mobile recomposition |
|---|---|---|
| `/student/research` | Submit a paper and know exactly where it stands (فحص → تقييم → نشر) and what the next action is. | StatLine wraps; rows keep title+badge+disclosure; the pipeline keeps its dot-over-label geometry at every width; row actions full-width ≥44px. |
| `/student/library` (+ `/teacher/library`) | Find a book to borrow or a published research to read — search-first. | Search pill full-width first-class; category pills → bottom Sheet trigger; book rows wrap to [chip+body | full-width tail ≥44px]. |
| `/teacher/research` | Work the review queue: grade, publish graded ones, never accidentally publish. | StatLine wraps 2-up; queue rows stack; review modal keeps the explicit-publish footer contract. |
| `/document/:filename` | Read the PDF comfortably; annotate per page (reviewer). | Full-viewport reader; annotations in a bottom Sheet behind a portaled floating trigger. |

## Layout decisions (one line per page)

- **ResearchPage**: page = the list. RowList of RowItems; each row = title +
  course/date + status badge, expandable body (open by default when the
  student must act or watch: UPLOADED/SCANNING/CHECKS_FAILED) carrying the
  journey rail, the declared-simulation results, grade/feedback and the next
  action. StatLine replaces the MetricCard wall. The upload modal (FormField
  canon + staged-upload + discard guard + r168b copy pins) is untouched.
- **LibraryPage**: PageHeader with the tab strip in its `tabs` slot; the
  search-first pill leads the page (one debounced query, per-tab placeholder,
  aria-label + clear); loans = quiet section (RowList compact or one honest
  line); FilterBar carries the category pills (fragment — see note) + the
  honest count; books = RowList of RowItems (identity chip | title/author/
  category/rating | badge + borrow); research tab = StatLine + count line +
  RowList of RowItems with the <mark> snippet as the (default-open)
  expandable body; the honest pager survives unchanged.
- **ResearchReviewPage**: PageHeader + tabs; StatLine trio; three queue
  sections (قائمة المراجعة / رفضها الفحص / مُقيَّمة — جاهزة للنشر) as
  SectionHeader + RowList; ReviewRow/GradedRow are RowItems with the scan
  cells + actions open by default; the review modal keeps every 15-e/r157
  contract (discard guard, form-Enter, explicit publish).
- **DocumentViewerPage**: quiet reader head (back + title), .doc-reader
  split (document main + annotations side, RTL logical properties), mobile =
  full-viewport reader + annotations bottom Sheet behind a portaled FAB;
  pdfjs stays lazy (pdf chunk 95.7 KB gz unchanged).

## Pattern consumption (Agent S contract v1, merged from origin/redesign/shell)

PageFrame (default/full) · PageHeader (+tabs slot) · SectionHeader ·
RowList/RowItem (expandable bodies, defaultExpanded by state) · StatLine ·
FilterBar (filters + trailing). SplitView NOT used for the reader: its
list→detail model (click row → detail) does not fit a reader+side-panel; the
family's .doc-reader split + Sheet + FAB implements the same two bands with
the annotations always available — noted as a deliberate deviation.

**FilterBar gotcha (for other families):** never pass a `.filter-bar`
(container-type: inline-size) wrapper as `filters` — containment collapses a
nested flex child to its padding and the pills stack vertically. Pass the
controls as a bare fragment; `.pf-filterbar-filters` is the flex row.

**pf-row-meta spacing:** patterns render `.pf-row-meta` as a plain block; my
meta fragments are multi-run, so research.css adds a scoped
`.pf-row .pf-row-meta { display:flex; gap }` (only my pages load the sheet).

## Selectors made obsolete (for Agent Z)

- student.css §research `.paper-row` family (incl. `-head/-main/-side/
  -course/-abstract/-title/-cta/-grade*/-failed/-published`): zero consumers
  since r231 (student + teacher rows → RowItem). Retire when 4A confirms.
- student.css `.lib-skel-tile` / `.lib-skel-row`: replaced by the shared
  RowList loading skeleton.
- student.css `.research-card` family + `.lib-count`: replaced by RowItem +
  `.rs-count`.
- student.css `.thumb-card` LIBRARY instance (`.grid-auto-200` on the
  library) + `.lib-cover-title` / `.lib-cover-author`: books are rows; the
  identity chip no longer paints the title (r186 renegotiated twice —
  current contract: aria-hidden chip + single read in the row body).
  `.thumb-card` may still have consumers OUTSIDE my routes — verify before
  retiring globally.
- student.css `.lib-filters` ≤640px pill floor still applies inside the
  filter Sheet (kept).

## Sheet import lines that may conflict (Agent Z)

- `import '../../styles/research.css'` in ResearchPage / LibraryPage /
  ResearchReviewPage; `import '../styles/research.css'` +
  `import '../styles/pdf.css'` in DocumentViewerPage. Idempotent modules —
  keep them page-scoped.
- The shell merge added `import './styles/patterns.css'` to main.tsx
  (Agent S) — no conflict with my lines.

## Requests for tokens/primitives/patterns

- None blocking. (Nice-to-have, not requested as work: a RowItem `as`/heading
  level prop if pages need semantic row headings; patterns render titles as
  spans by design.)

## Gate results (final, this branch)

lint 0 errors / 19 documented warnings · typecheck ✓ · frontend tests 1971 ✓
· backend tests 1783 ✓ · parity export 190/190 · icons Lucide-only ✓ ·
motion tokens ✓ · colors strict ✓ (0 findings, 16 sanctioned allows) ·
raw-css strict ✓ (type/radius/spacing 0 findings, TSX inline 0) · CSP hashes ✓
· colleges 25/25 ✓ · bundle 637.2/650 KB gz (entry 71.2/80, pdf 95.7/110).

## Browser verification (real data, seeded stack)

- Surfaces: /student/research, /student/library (both tabs + real Arabic
  search «التعلم» with <mark> snippets), /teacher/research (+ review modal,
  + publish CTA), /document/sample.pdf (real PDF, annotations create/list,
  jump chip) — student AND teacher roles.
- Widths × themes: 1440 light+dark, 768 dark, 390 light+dark, 360 light —
  no horizontal scroll (documentElement scrollWidth checked), no clipped
  text, focus rings visible, RTL arrows correct, Western digits.
- States: loading skeletons (RowList), empty (no-loans line, no-results,
  empty queue), error (API-down paths covered by tests + ErrorState
  onRetry). Reduced motion: the platform belt (base.css) zeroes every
  animation (0.01ms/1 iteration) — pulse/sweep/toolbar-fade degrade to
  complete static results; nothing is revealed by motion alone.
- Console: no errors from my surfaces (pre-existing React fetchPriority
  warning is not ours; one HMR-transient was ruled out by clean reload).

## Incomplete / deviations

- SplitView not consumed (see above) — deliberate; documented for Agent Z.
- SplitView/TodayList remain unused by this family by design (no surface
  matches the click-row→detail or agenda model).
- The old `.rs-row`-based standalone row CSS was pruned in r232; if Agent Z
  finds a stray reference, it's dead — remove.

## Final report

- **Branch**: `redesign/4b-research` (from origin/main r198; merged
  origin/redesign/shell at Agent S's r210 contract).
- **Final SHA**: see `git rev-parse HEAD` at read time — r232 chain
  (r230 boot+core, r231 browser-verified fixes, r232 patterns composition).
- **Routes completed** (5/5, all with loading/empty/error + mobile + both
  themes): /student/research (list-first rows + journey rail + StatLine),
  /student/library & /teacher/library (search-first, RowList books, snippet
  hits, FilterBar, honest pager), /teacher/research (queue sections + review
  modal contract), /document/:filename (quiet reader, RTL split, mobile
  notes sheet + portaled FAB, lazy pdfjs).
- **Files changed**: the 4 owned pages + pdf.css + new research.css +
  components/paper/{StatusPipeline,ScanResults}.tsx + renegotiated tests
  (r186-book-covers, LibraryPage-loans 3→2 pin, ResearchReviewPage stat
  selectors) + this handoff.
- **Gates**: all green (numbers above). **Not tested**: db-integration belt
  and e2e Playwright journeys (not runnable in this sandbox session);
  backend untouched (0 diff lines).
