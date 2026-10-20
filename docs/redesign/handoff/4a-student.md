# Handoff — Agent 4A (student learning surfaces)

> Branch `redesign/4a-student` (from origin/main @ r198). Superlist direction for every
> student learning route this family owns. Working notes live here while the work is
> in progress; the final summary replaces this paragraph when the branch is done.

## Route map → user goal → mobile recomposition (Phase A)

| Route / file | Primary user goal (one line) | Mobile recomposition (one line) |
|---|---|---|
| `/student/dashboard` `DashboardPage.tsx` | «ماذا أفعل الآن؟» — today's commitments + one dominant continue action | TodayList items stack; StatLine wraps to 2×2 compact line; week ledger stays chronological |
| `/student/courses` `CoursesPage.tsx` | Find my course and re-enter it where I left | Row list (not card grid); rows keep progress bar inline; upcoming-assignments table stacks |
| `/student/courses/:offeringId` `CourseDetailPage.tsx` | Orient in the curriculum and start the next lecture | Hero condenses; lecture rows + nested materials/assignments expand inline, detail attached to the row |
| `/student/lectures/:lectureId` `LecturePlayerPage.tsx` | Watch, answer interaction points, navigate chapters | Player on top full-width; chapters/questions/materials panel becomes a below-player sheet |
| `/student/matrix` `MatrixPage.tsx` | See what I master and what to fix, then act (سدّ الفجوة) | Dense concept grid becomes a concept list with the same statuses |
| `/student/calendar` `CalendarPage.tsx` | See the term's commitments on a calendar | Month grid → week/agenda list focus |
| `/student/gamification` `MorePages.tsx` (GamificationPage) | Feel progress: points, tier, achievements, rank | Two panels stack; leaderboard rows keep ≥44px targets |
| `/student/skills` `MorePages.tsx` (SkillsPage) | See technical skill growth | Radar → list rows with bars (same data table) |
| `/student/results` `MorePages.tsx` (ResultsPage) | Read my grades and feedback | Table rows stack; chart keeps prose+table fallback |
| `/student/schedule` `MorePages.tsx` (SchedulePage) | Weekly class rhythm | Day rows stack |
| `/student/{catalog,profile,messages,labs,live,jobs,mooc,payment,map,webinars,ar,social,downloads,university}` | long tail — goal per page | per-page stack, no horizontal scroll |
| `/student/online-exams*` (4C files) | — | — |

## Ownership (BLUEPRINT §1 wins)

- Mine: `pages/student/{DashboardPage,CoursesPage,CourseDetailPage,LecturePlayerPage,MatrixPage,CalendarPage,CatalogPage,ProfilePage,MessagesPage,MorePages,LabsPage,LivePage,JobsPage,MoocPage,PaymentPage,CampusMapPage,WebinarsPage}.tsx`, `components/player/`, `components/onboarding/`, `styles/student.css`, `styles/player.css`.
- Not mine but related: `TrainingPages.tsx` + `/training*` + `/achievements` = 4E; `LibraryPage/ResearchPage` = 4B; `OnlineExamsPages.tsx` (taker incl.) = 4C — UX issues logged below, no edits.
- `student.css` is strict-gated (raw-css) and source-contract-pinned (r166a/r183) — edits confined to my family's sections; pins renegotiated only with visual proof.

## Exam UX issues to propose (4C owns `OnlineExamsPages.tsx`)

- (to be filled after walkthrough)

## Selectors made obsolete (for Agent Z)

- (appended at the end)

## Requests for tokens/primitives/patterns

- Need S's `SplitView`, `TodayList`, `StatLine`, `PageHeader`, `RowList`, `FilterBar` per `components/patterns/CONTRACT.md` — composing pages as soon as `origin/redesign/shell` lands.
