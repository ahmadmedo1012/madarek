# Handoff — Agent 4B (Research cycle & library) — `redesign/4b-research`

> Living handoff. Final summary lands at the bottom (§ Final report).

## Scope (BLUEPRINT §1, family 4B)

Owned files: `pages/student/LibraryPage.tsx`, `pages/student/ResearchPage.tsx`,
`pages/teacher/ResearchReviewPage.tsx`, `pages/DocumentViewerPage.tsx`,
`components/pdf/` (PdfViewer, AnnotationsPanel, loadError), `styles/pdf.css`.

Routes: `/student/research`, `/teacher/research`, `/student/library` +
`/teacher/library` (same file), `/document/:filename`.

## Route map — user goal + mobile recomposition (Phase A contract)

| Route / surface | Primary user goal | Mobile recomposition |
|---|---|---|
| `/student/research` | Submit a paper and know exactly where it stands (فحص → تقييم → نشر) and what the next action is (ابدأ الفحص / رفع نسخة جديدة / مراجعة الملاحظات). | Rows stack full-width; the pipeline keeps its dot-over-label geometry at every width; scan cells stack; row actions become full-width ≥44px. |
| `/student/library` (+ `/teacher/library`) | Find a book to borrow or a published research to read — search-first. | Search pill full-width first-class; category pills ride the existing bottom Sheet (trigger names the active category); book rows adapt (identity chip shrinks, CTA full-width ≥44px). |
| `/teacher/research` | Work the review queue: grade a paper, publish graded ones, never accidentally publish. | StatStrip reflows 2×2; queue rows stack; review modal is the full review surface with the explicit publish footer action. |
| `/document/:filename` | Read the PDF comfortably; annotate per page (reviewer). | Full-viewport reader; annotations move into a bottom Sheet behind one floating trigger (portaled to body — the page-transition transform breaks fixed inside the page). |

## Layout decisions (one line per page)

- **ResearchPage**: page = the list; each paper is a full-width row with the
  journey rail (رُفع → فُحص → التقييم → النشر), scan results (declared
  simulation), grade/feedback and next action ATTACHED to the row — the old
  MetricCard wall + Card-in-Card grid is gone (StatStrip carries the counts).
- **LibraryPage**: opens with the search pill (one debounced query, per-tab
  placeholder), tabs under it, books as ROWS (identity chip + body + borrow
  tail) not a thumb-card grid, honest count beside the filter bar, loans as a
  quiet section (rows or one honest line).
- **ResearchReviewPage**: header tabs, StatStrip trio, queue sections
  (قائمة المراجعة / رفضها الفحص / مُقيَّمة) as full-width rows with scan cells
  + actions attached; review modal keeps the discard-guard + explicit-publish
  contract (all 15-e/r157 pins intact).
- **DocumentViewerPage**: quiet reader head (back + title), SplitView
  (document main + annotations side, RTL-aware), mobile = full-screen reader +
  notes bottom-Sheet behind a portaled FAB; pdfjs stays lazy (chunk unchanged
  95.7 KB).

## Sheet strategy

New family sheet `styles/research.css` (raw-css/color/motion gates scan it —
token-compliant from birth: 0 findings, 0 allows). Imported by the three page
files the same way pdf.css is loaded by DocumentViewerPage.
`components/paper/` (StatusPipeline, ScanResults) is 4B-owned page-family
components — imported only by my routes.

## Selectors made obsolete (for Agent Z)

- student.css §research `.paper-row` family (`.paper-row`,
  `.paper-row-head/-main/-side/-course/-abstract/-title/-cta/-grade*`,
  `.paper-row-failed`, `.paper-row-published`): NO consumers left after r231
  (student + teacher rows moved to `.rs-row`). Retire when 4A confirms.
- student.css `.lib-skel-tile` / `.lib-skel-row` (library grid/row skeletons):
  replaced by shape-matched `.rs-book-row`/`.rs-row` skeletons.
- student.css `.research-card` family + `.lib-count`: replaced by `.rs-row` +
  `.rs-count`.
- student.css `.thumb-card` grid usage on the library (`.grid-auto-200`
  library instance): books are rows now. (`.thumb-card` itself may have other
  consumers outside my routes — verify before retiring globally.)
- `.lib-cover-title` / `.lib-cover-author`: no longer rendered (the identity
  chip is aria-hidden icon + band; the row body owns the readable title) —
  `.lib-book-cover`/`.lib-cover-mark`/`.lib-cover-band`/`--book-tint` remain
  in use (r186 test renegotiated to the row chip).

## Sheet import lines that may conflict

- `import '../../styles/research.css'` in ResearchPage / LibraryPage /
  ResearchReviewPage + `import '../styles/research.css'` in
  DocumentViewerPage — merge-safe (idempotent module), but if Agent S's shell
  or Agent Z restructures sheet loading, keep research.css page-scoped.

## Requests for tokens/primitives/patterns

- None blocking. When Agent S's `components/patterns` lands I will compose
  with PageFrame/PageHeader/RowList/SplitView/FilterBar/StatLine per the
  contract (my pages already match the shapes: PageHeader from 1B, rows as
  RowList children, SplitView == .doc-reader, FilterBar == search + pills).

## Progress log

- (boot) Branch from origin/main r198. Stack green on :5433/:4000/:5173.
- (r230) Phase A+B core: StatusPipeline + ScanResults + research.css family
  sheet; ResearchPage/LibraryPage/ResearchReviewPage/DocumentViewerPage
  recomposed; reader chrome + notes sheet + FAB; r186/loans tests renegotiated
  with the new contract. Pushed.
- (r231) Browser-verified fixes: stepper rail (equal cells, rail behind
  dots), filter-bar containment flex-grow fix, jacket 128×160 chip, FAB
  portal + 72px offset + 44px floor, scan-note copy dedup. Gates: lint 0 err /
  19 warn, typecheck ✓, tests 1971+1783 ✓, parity 190/190, icons/motion/
  colors/raw-css ✓, CSP ✓, colleges 25/25, bundle 635.8/650 (pdf 95.7/110).
