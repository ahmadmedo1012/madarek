# R321 §B — THE AUTHENTICATED SWEEP: student inventory + all-role route map (r321-c1-B0)

Method: code-marker census over `frontend/src/App.tsx` + every page component (the
`r319s-page`/`r319-student` opt-in markers are the sheet-system conversion signal), plus
41 route screenshots @390×844 light + 7 @1440×900 (48 total) (local stack `npm run dev:full`,
student@test.ly, intro-skip) in `audits/evidence/r321/student/`. Chromium locally —
**WebKit-iPhone is the CI leg** (the container has no webkit system libs; e2e ios-webkit job owns it).

## 1 · The canonical §B per-page rubric (every page, every batch)

sheet frame + grain + ruler ticks (the shell owns these on authed routes) · `[nn]` mono
title bar + SHEET code · ≤ 1 display heading (inner titles ≤ 32px) · hairline cells ·
indicators (RulerGauge / CourseBar / StatusChip / WeekStrip / mono counts) · hatched empty
states · skeleton/error/offline states exist · square avatars (no blue circles) · radius 0,
no shadows, no pink pills · ONE numeral system · `bdi` isolation on mixed runs · no raw
ids/codes/test strings/placeholders · tables → hairline + sticky header + card transform
≤767 (no horizontal scroll) · forms → 16px hairline fields, mono labels, correct
inputmode/autocomplete/enterkeyhint, inline Arabic validation, keyboard never hides submit
(`visualViewport`/`dvh`) · dialogs → paper + hairline, bottom sheets on phones with
safe-area · paired state tokens · contrast ≥ 4.5:1 in every state · ≥ 44px targets ·
landmarks, focus order, reduced-motion = complete static page · dark pair verified.

## 2 · Student route table (37 student-visible routes incl. redirects)

| route | component | file | sheet? | shot (@390) |
|---|---|---|---|---|
| /student/dashboard | StudentDashboardPage | pages/student/DashboardPage.tsx | ✅ r319 | dashboard-390.jpg (+1440) |
| /student/calendar | StudentCalendarPage | pages/student/CalendarPage.tsx | ✅ | calendar-390.jpg |
| /student/schedule | SchedulePage | pages/student/MorePages.tsx | ✅ | schedule-390.jpg |
| /student/courses | StudentCoursesPage | pages/student/CoursesPage.tsx | ✅ | courses-390.jpg |
| /student/courses/:offeringId | CourseDetailPage | pages/student/CourseDetailPage.tsx | ✅ | course-detail-390.jpg |
| /student/catalog | CatalogPage | pages/student/CatalogPage.tsx | ✅ | catalog-390.jpg |
| /student/labs | LabsPage | pages/student/LabsPage.tsx | ✅ | labs-390.jpg |
| /student/matrix | MatrixPage | pages/student/MatrixPage.tsx | ✅ | matrix-390.jpg |
| /student/mooc | MoocPage | pages/student/MoocPage.tsx | ✅ | mooc-390.jpg |
| /student/library | LibraryPage | pages/student/LibraryPage.tsx | ✅ | library-390.jpg |
| /student/research | StudentResearchPage | pages/student/ResearchPage.tsx | ✅ | research-390.jpg |
| /student/jobs | JobsPage | pages/student/JobsPage.tsx | ✅ | jobs-390.jpg |
| /student/ai | AiAssistantPage | pages/student/AiAssistantPage.tsx | ✅ | ai-390.jpg |
| /student/gamification | GamificationPage | pages/student/MorePages.tsx | ✅ | gamification-390.jpg |
| /student/skills | SkillsPage | pages/student/MorePages.tsx | ✅ | skills-390.jpg |
| /student/alerts | AlertsPage | pages/student/MorePages.tsx | ✅ | alerts-390.jpg |
| /student/messages | StudentMessagesPage | pages/student/MessagesPage.tsx | ✅ | messages-390.jpg |
| /student/ar | ArVrPage | pages/student/MorePages.tsx | ✅ | ar-390.jpg |
| /student/social | SocialPage | pages/student/MorePages.tsx | ✅ | social-390.jpg |
| /student/downloads | DownloadsPage | pages/student/MorePages.tsx | ✅ | downloads-390.jpg |
| /student/university | UniversityInfoPage | pages/student/MorePages.tsx | ✅ | university-390.jpg |
| /student/results | ResultsPage | pages/student/MorePages.tsx | ✅ | results-390.jpg (+1440) |
| /student/payment | PaymentPage | pages/student/PaymentPage.tsx | ✅ (R320 KEEP rows live here) | payment-390.jpg |
| /student/profile | ProfilePage | pages/student/ProfilePage.tsx | ✅ | profile-390.jpg (+1440) |
| /student/settings → /settings | SettingsPage | (r320 settings package) | ✅ | settings-390.jpg |
| /student/webinars | WebinarsPage | pages/student/WebinarsPage.tsx | ✅ | webinars-390.jpg |
| /training · /training/:slug · /training/:slug/lesson/:lessonId | TrainingCatalog/Track/LessonPage | pages/student/TrainingPages.tsx | ✅ | training-{,track-,lesson-}390.jpg |
| /achievements (← /student/achievements) | AchievementsPage | pages/student/TrainingPages.tsx | ✅ | achievements-390.jpg |
| **/student/online-exams** | OnlineExamsPage | **pages/exams/OnlineExamsPages.tsx (1,951 ln)** | ❌ **0 markers, 0 PageFrame** | online-exams-390.jpg (+1440) |
| **/student/online-exams/:id** | ExamTakerPage | **pages/exams/OnlineExamsPages.tsx** | ❌ | exam-taker-390.jpg |
| **/student/map** | CampusMapPage | pages/student/CampusMapPage.tsx (212 ln) | ❌ no r319 (PageFrame yes) | map-390.jpg |
| **/student/lectures/:lectureId** | LecturePlayerPage | pages/student/LecturePlayerPage.tsx (1,004 ln) | ❌ 0 markers, 0 PageFrame | lecture-player-390.jpg (+1440) |
| **/student/live** | LivePage | pages/student/LivePage.tsx (255 ln) | ❌ no r19 | live-390.jpg |
| **/community (← /student/community)** | CommunityPage | **pages/community/CommunityPages.tsx (849 ln)** | ❌ no r319 — the ×5-duplicate family | community-390.jpg (+1440) |
| /student/exams → /student/online-exams | Navigate | — | redirect | — |
| /student/colleges → /colleges | Navigate | — | redirect | — |
| /vision · /vision/:slug | VisionGallery/DetailPage | (shared pages) | ✅ r320 shell | vision(-detail)-390.jpg |
| /document/:filename | DocumentViewerPage | (shared) | ✅ | document-viewer-390.jpg |
| /competitions · /competitions/:id | CompetitionsIndex/DetailPage | (shared) | ✅ | competitions(-detail)-390.jpg |

The §A8 demo-panel open-by-default state is confirmed + shot: `auth-demo-panel-390.jpg`.

## 3 · The conversion targets (the real §B student remaining work)

T-1 **pages/exams/OnlineExamsPages.tsx** (1,951 lines — OnlineExamsPage + ExamTakerPage):
the largest unconverted surface; zero sheet markers, zero PageFrame. The exam TAKER
(keyboard/scroll/answer-state/timer UX) is the highest-risk conversion (pair with the
r305 focus/keyboard contracts; timer + palette + question list are state-machine code).
T-2 **pages/student/CampusMapPage.tsx** (212 ln): PageFrame only; needs the r319 opt-in +
the campus.css family audit (SVG map furniture, no collisions at 390/768).
T-3 **pages/student/LivePage.tsx** (255 ln): PageFrame only; live-session UI (video pane +
session list + chat?) — needs the sheet grammar + the player family audit.
T-4 **pages/student/LecturePlayerPage.tsx** (1,004 ln): 0 markers, 0 PageFrame — its own
player.css family; the lecture player chrome + notes + attachments all pre-sheet.
T-5 **pages/community/CommunityPages.tsx** (849 ln): the KNOWN §C duplicate family
(CommunityPage ×5 mounts) — conversion should happen WITH the dedupe (one parametrised
component, per §C-2) to avoid converting the same page five times.

Everything else with a ✅ is a VERIFICATION target (rubric pass at 390/768/1440 × light/dark
+ console cleanliness), not a conversion — the r319/r320 sweeps converted them and left
belts, but the §B target is 100% routes × viewports × themes captured+green, which the
B-verification batch proves with evidence.

## 4 · The WP queue (foreman assigns; each batch = one agent + reviewer)

- **B1** — T-1 OnlineExamsPages.tsx conversion (list + taker) + belt (the §B2 settings-package
  recipe: one `.r319s-page`-style opt-in root, page sheet for family-unique rules only,
  hairline exam surfaces, keyboard/timer contracts, empty/skeleton/error states, WebKit
  contract rows in CI).
- **B2** — T-2 CampusMapPage + T-3 LivePage (small, same-family PageFrame adopters).
- **B3** — T-4 LecturePlayerPage (player chrome; coordinate with player.css family owner
  rules; §E perf: player route chunk lazy already?).
- **B4** — T-5 CommunityPages.tsx conversion + the ×5 dedupe (with §C-2 recipe).
- **B-verify** — the rubric sweep over ALL ✅ routes (390/768/1440 × light/dark × the
  checklist, console clean, shots for dark pair) → the coverage table (routes × viewports
  × themes captured+green / total) that §B reports.

## 5 · All-role route map (appendix; screenshots are later cycles' evidence)

| role | home (A10-proven) | routes | sweep cycle (§I) |
|---|---|---|---|
| STUDENT | /student/dashboard | 37 student-visible (above) + redirects | C2 (this inventory) |
| TEACHER | /teacher/dashboard | 21 `/teacher/*` routes (exam authoring, grading, attendance, intelligence, labs, profile, settings) | C3 |
| DEPARTMENT_HEAD / DEAN / ASSOCIATE_DEAN | /teacher/dashboard (scoped views) | the teacher tree + scoped variants | C4 |
| ADMIN (المسجل العام) | /admin/dashboard | 13 `/admin/*` routes (governance, sync, permissions, reports) + the faculty-scoped variant | C4 |
| QUALITY | /quality/dashboard | 10 `/quality/*` routes | C5 |
| OWNER | /owner/dashboard | 13 `/owner/*` routes | C5 |

## 6 · Honest notes

- This census is CODE-MARKER + screenshot driven; the per-route rubric was not yet
  scored cell-by-cell for the ✅ routes — B-verify owns that with the judging evidence.
- WebKit-iPhone is the CI leg (ios-webkit e2e job); local evidence is chromium.
- The B0 agent died at the 15-min tool deadline mid-census; foreman-B completed the
  route map, markers and this document from the agent's 49 shots + the router.
