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
| `/student/research` | Submit a paper and know exactly where it stands (فحص → تقييم → نشر) and what the next action is (ابدأ الفحص / رفع نسخة جديدة / مراجعة الملاحظات). | Rows stack full-width; the pipeline compresses to a compact horizontal rail; scan cells stack; actions become full-width ≥44px targets. |
| `/student/library` (+ `/teacher/library`) | Find a book to borrow or a published research to read — search-first. | Search field goes full-width first-class; category filters ride the existing bottom Sheet; result rows adapt (cover chip shrinks, actions full-width). |
| `/teacher/research` | Work the review queue: grade a paper, publish graded ones, never accidentally publish. | StatStrip reflows 2×2; queue rows stack; review modal becomes the full review surface with ≥44px actions. |
| `/document/:filename` | Read the PDF comfortably; annotate per page (reviewer). | Reader goes full-viewport; annotations move into a bottom Sheet with a floating 44px trigger; toolbar keeps 44px controls. |

## Sheet strategy

New family sheet `styles/research.css` (created by me; raw-css/color/motion gates
scan all `styles/*.css` so it is token-compliant from birth). Imported by the three
page files (mirrors how pdf.css is imported by DocumentViewerPage). Never touches
other families' sheets.

## Progress log

- (boot) Branch created from origin/main r198. Stack green on :5433/:4000/:5173.
