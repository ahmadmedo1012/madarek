# Madarek — Specs & Features Reference

## Feature Branches History

| Branch | Feature | Status |
|--------|---------|--------|
| `001-premium-motion-system` | Motion tokens, primitives (Reveal, Skeleton, PageTransition, Parallax) | Complete (merged) |
| `002-visual-uplift` | Typography roles, chart palette, icon discipline | Complete (merged) |
| `003-motion-graphics-layer` | Decorative motion patterns (spec only) | Spec only |
| `004-colleges-gallery` | College gallery pages | Complete (merged) |
| `005-colleges-popover` | College popover component | Complete (merged) |
| `006-colleges-list-public` | Public college listing | Complete (merged) |
| `007-force-redeploy` | - | Complete |
| `008-colleges-mount-order` | College mount order fix | Complete (merged) |
| `011-platform-completeness-uplift` | Search, notifications, session policy | **Partial** — locale/i18n user story (US7) never implemented: no i18next/react-i18next dependency, no `frontend/src/i18n/` layer, no locale model. Landed parts: Arabic-aware search normalization (`modules/search/normalize.ts`), notification preferences groundwork, a11y CI deps, splash/skeleton primitives |
| `012-design-graphics-uplift` | Themes, illustrations, overlays, onboarding, milestones | **Complete** — landed via migration `20260602190000_012_design_uplift_state`, branch merged to `main` |

Spec directories on `main`: 001, 002, 003, 004, 011, 012 (no 009/010 ever existed).

## Feature 012-design-graphics-uplift (landed)

**Goal:** World-class design tier — full dark mode, role/college accent expressions, bespoke SVG illustrations, cinematic scroll storytelling, onboarding, milestones.

**Priority:** P1 (User Stories 1-4)

### Key Deliverables

| Area | What |
|------|------|
| **Theming** | Full dark mode (`[data-theme]`), role/college accent tinting, WCAG AA contrast, `prefers-contrast: more` support |
| **Illustrations** | 9 bespoke SVG scenes (hero, 404, empty states, onboarding 4-frame, milestone) |
| **Overlays** | Glass/frost effect on modals/sheets/popovers |
| **Onboarding** | 4-frame shared flow, runs once per user after release |
| **Milestones** | `first-assignment-complete`, `first-course-complete`, `exam-window-opens` |
| **Landing Page** | Scene-anchored sections, parallax, animated university stats |
| **Charts** | Custom Chart.js plugins (rounded caps, gradient fills, designed tooltips) |
| **Surface Depth** | Shadow stacks, soft inner borders, top-edge highlights |

### Docs Path
- `specs/012-design-graphics-uplift/plan.md` — Implementation plan
- `specs/012-design-graphics-uplift/spec.md` — Feature spec (with Clarifications)
- `specs/012-design-graphics-uplift/research.md` — Phase 0 decisions (R-001..R-012)
- `specs/012-design-graphics-uplift/data-model.md` — Prisma columns + state shapes
- `specs/012-design-graphics-uplift/quickstart.md` — Adoption guide
- `specs/012-design-graphics-uplift/contracts/` — 7 contract documents

### Schema Changes (012)
- `User.themePreference` — ThemePreference enum (LIGHT/DARK/SYSTEM)
- `User.onboardingCompletedAt` — DateTime?
- `User.firedMilestones` — String[]
- `ThemePreference` enum added

## Features Matrix

| # | Feature | Models | Pages | Roles |
|---|---------|--------|-------|-------|
| 1 | Flipped Classroom | Lecture, LectureChapter, LectureCheckpoint, WatchEvent | `/student/lectures/:id` | STUDENT, TEACHER |
| 2 | Educational Matrix | KnowledgeConcept, StudentMastery | `/student/matrix` | STUDENT |
| 3 | Research Papers | ResearchPaper, PaperAnnotation | `/student/research`, `/teacher/research` | STUDENT, TEACHER |
| 4 | Library | Book, Loan, ResearchPaper | `/student/library`, `/teacher/library` | STUDENT, TEACHER |
| 5 | Quality Oversight | (reads) CourseOffering, Grade, Attendance, Enrollment, ExamTemplate | `/quality/*` | QUALITY |
| 6 | Admin Management | Faculty, Department, Course, TeacherProfile | `/admin/*` | ADMIN |
| 7 | Smart Attendance | WatchEvent, AttendanceSession, AttendanceRecord | `/teacher/attendance` | TEACHER |
| 8 | PDF Viewer | ResearchPaper, PaperAnnotation | `/document/:filename` | All |
| 9 | Notifications | Notification | Dropdown + `/student/alerts` | All |
| 10 | Social Feed | Post, PostComment, PostReaction | `/student/social` | All |
| 11 | University Info | UniversityFact, SyncRun | `/student/university` | All |
| 12 | AI Assistant (Oasis) | AiConversation, AiMessage, AiTelemetry | `/student/ai`, `/teacher/ai` | All |
| 13 | Virtual Labs | VirtualLab, LabSession | `/student/labs`, `/teacher/labs` | STUDENT, TEACHER |
| 14 | AR/VR | ArExperience | `/student/ar` | STUDENT |
| 15 | Gamification | Achievement, Skill, Badge, PointsLedger | `/student/gamification`, `/achievements` | All |
| 16 | MOOCs | MoocCourse, MoocEnrollment | `/student/mooc` | STUDENT |
| 17 | Jobs | Job, JobApplication | `/student/jobs` | STUDENT |
| 18 | Online Exams | Question, ExamTemplate, ExamAttempt, ExamAnswer | `/student/online-exams`, `/quality/exam-moderation` | STUDENT, TEACHER, QUALITY |
| 19 | Live Broadcast | LiveSession | `/student/live`, `/teacher/live` | STUDENT, TEACHER |
| 20 | Payments | (UI only, no dedicated model) | `/student/payment` | STUDENT |
| 21 | Self-Development | TrainingTrack, TrainingLesson, TrainingEnrollment, LessonProgress, Badge, Certificate | `/training/*`, `/achievements` | All |
| 22 | Community Hub | Announcement, Competition, CampusEvent, StudyRoom | `/community` | All |
| 23 | Owner Enterprise | PlatformSetting, FeatureFlag, AiTelemetry, OperationalAlert, LoginEvent | `/owner/*` | OWNER |
| 24 | Teacher Intelligence | (reads) Enrollment, Grade, WatchEvent, StudentMastery | `/teacher/intelligence` | TEACHER |
| 25 | Vision Gallery | (UI only) | `/vision`, `/vision/:slug` | All |
| 26 | Campus Map | (UI only) | `/student/map` | STUDENT |
| 27 | College Pages | Faculty | `/colleges`, `/colleges/:id`, `/colleges/leaderboard` | All |

## Database Layer Overview

- 75 models in the Prisma schema
- 30 enums
- PostgreSQL on Neon (serverless)
- Prisma client with `withRetry()` for transient errors (P1017/P1001/P1002) — retries without force-disconnecting the shared client
- LoginEvent retention: the scheduler prunes rows older than 180 days (batched)
- Migrations committed, applied via `prisma migrate deploy` during build
