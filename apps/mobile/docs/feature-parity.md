# Madarek Mobile — Feature & API Parity Matrix

**App:** `apps/mobile` (Expo SDK 58 · RN 0.88.1 · expo-router · TypeScript strict)
**API:** `https://madarek.onrender.com/api/v1` — deployed `buildId b773b188ce31` (= GitHub `b773b18`, r323 B3.6) at time of writing; the backend continues to evolve on `main` and the deployed service may lag behind source between Render deploys.
**Sources of truth:** `frontend/src/App.tsx` (113 web routes), `backend/src/app.ts` + `backend/src/http/routes/*` (real contract), `DESIGN.md` + `frontend/src/styles/tokens.css` (Heron).

**Status legend:**
- ✅ implemented & wired to the real API
- 🧩 implemented, device-verification pending (works in bundle/export checks; no native device in sandbox)
- 🚫 unsupported by current backend/source (documented honestly)
- ⚠️ simulated by the existing product (disclosure preserved: «محاكاة»)
- 🔗 blocked by external configuration (documented precisely)

## 1. Common & public

| Feature (web route) | Native route | API | Status |
|---|---|---|---|
| Welcome/landing (`/`) | `app/index.tsx` | `GET /auth/me` (session) | ✅ |
| Login (`/auth`) | `app/auth/index.tsx` | `POST /auth/login` | ✅ cookie captured, persisted in SecureStore |
| Register 2-step (`/auth/register`) | `app/auth/register.tsx` | `POST /auth/register`, `GET /institutions`, `GET /faculties`, `GET /invites/:code/validate` | ✅ |
| Forgot password | `app/auth/forgot-password.tsx` | `POST /auth/forgot-password` (devInbox surfaced for @test.ly) | ✅ |
| Reset password | `app/auth/reset-password.tsx` | `POST /auth/reset-password` | ✅ |
| Institution selection (multi-membership) | `app/select-institution.tsx` | `POST /auth/select-institution` | ✅ |
| Settings (`/settings`) | `app/settings.tsx` | `PUT /me/theme`, `POST /auth/change-password` | ✅ |
| Global search | `app/search.tsx` | `GET /search/global` | ✅ |
| Notifications inbox (per role) | `app/{student,teacher,admin,quality,owner}/alerts` + owner `(tabs)/notifications` | `GET /me/notifications`, `PATCH /me/notifications/:id/read`, `POST /me/notifications/read-all` | ✅ |
| Messages (DMs) | `student/messages`, `teacher/messages` | `GET /me/messages`, `POST /me/messages`, `POST /me/messages/read-all` | ✅ |
| Document viewer (PDF) | `app/document/[filename].tsx` | `GET /files/papers/:f`, `GET /files/materials/:f` (Range, auth) | 🧩 pdf.js in WebView + authenticated cached download |
| Vision roadmap | `app/vision/*` | — (static concepts) | ✅ |
| Colleges public catalog | `app/colleges/*` | `GET /colleges`, `GET /colleges/leaderboard`, `GET /colleges/:id` | ✅ |
| Competitions | `app/competitions/*` | `GET /competitions`, `POST /competitions/:id/enter` | ✅ |
| Community | `app/community.tsx` | `GET/POST /posts`, `POST /posts/:id/react`, `GET /announcements/feed`, `GET /events`, `POST /events/:id/rsvp`, `GET/POST /study-rooms` | ✅ |
| Training tracks | `app/training/*` + `student/training` links | `GET /training/catalog`, `GET /training/tracks/:slug`, `POST /training/tracks/:slug/enroll`, `POST /training/lessons/:id/complete` | ✅ |
| Achievements | `app/achievements` | `GET /me/achievements`, `GET /training/me/badges`, `GET /training/me/certificates`, `GET /training/leaderboard` | ✅ |
| Legal pages (6) | `app/legal/[doc].tsx` | — | ✅ |
| About/Help/Contact | `app/about.tsx`, `app/help.tsx`, `app/contact.tsx` | — | ✅ |
| Campus life | `app/campus.tsx` | — (documentary) | ✅ |
| Feedback loop («أبلغ عن مشكلة») | `FeedbackSheetHost` (root) | `POST /feedback` | ✅ (no screenshot/console tape on mobile — disclosed) |
| Theme sync (light/dark/system) | settings | `PUT /me/theme` | ✅ |
| Onboarding/milestones | welcome + role home | `POST /me/onboarding/complete` fired on first role-home | ✅ (4-frame tour & milestone scenes are web instruments, not ported) |
| Remote push notifications | — | backend has **no device-token model** | 🔗 additive backend proposal in `docs/push-backend-proposal.md`; Expo registration present, gated |

## 2. Student

| Feature | Native route | API | Status |
|---|---|---|---|
| Dashboard | `(tabs)/dashboard` | `GET /me/dashboard`, `GET /me/resume`, `GET /me/gaps` | ✅ |
| My courses | `(tabs)/courses` | `GET /enrollments/me` | ✅ |
| Course detail | `courses/[offeringId]` | `GET /offerings/:id/full` | ✅ |
| Lecture player (interactive checkpoints) | `lectures/[lectureId]` | `GET /lectures/:id`, `POST /lectures/:id/watch` (95% rule, 10s cadence), `POST /lectures/:id/checkpoints/:cid/answer`, transcript VTT | ✅ expo-video; checkpoint pause/answer/resume; resume seek |
| Chapters + transcript panel | player | `GET /files/lectures/*.vtt` | ✅ search + click-to-seek |
| Mastery matrix | `matrix` | `GET /me/matrix` | ✅ recomposed for small screens |
| Knowledge gaps | dashboard + matrix | `GET /me/gaps` | ✅ |
| Catalog (read-only) | `catalog` | `GET /courses` | ✅ |
| Weekly schedule | `schedule` | `GET /enrollments/me` slots | ✅ |
| Calendar | `calendar` | `GET /me/dashboard` agenda | ✅ |
| Results | `results` | `GET /me/results` | ✅ |
| Online exams list | `online-exams` | `GET /exams/me` | ✅ |
| Exam taker (timer, autosave, auto-submit) | `online-exams/[templateId]` | `POST /exams/templates/:id/start`, `POST /exams/attempts/:id/answer`, `POST /exams/attempts/:id/submit`, `GET /exams/attempts/:id/review` | ✅ |
| Research submission (PDF) | `research` | `POST /files/papers` (raw ≤20MB + `%PDF-` magic), `POST /me/research`, `POST /research/:id/scan` | ✅ progress via FileSystem.uploadAsync |
| Research library + search | `library` | `GET /library/books`, `POST /library/loans`, `POST /library/loans/:id/return`, `GET /research/published`, `GET /research/search`, `GET /me/loans` | ✅ |
| Plagiarism/AI scan | research + document viewer | deterministic simulated percentages | ⚠️ «محاكاة» preserved (thresholds 15/25 · 25/40) |
| Training lessons + quiz | `training/[slug]/lesson/[lessonId]` | `POST /training/lessons/:id/complete {quizAnswer}` | ✅ |
| Gamification (XP/tiers) | `gamification` | `GET /leaderboard`, XP from profile | ✅ |
| Skills | `skills` | `GET /me/skills` | ✅ |
| Social posts | `social` | `GET/POST /posts`, react | ✅ |
| MOOCs | `mooc` | `GET /mooc` | ✅ |
| Jobs board | `jobs` | `GET /jobs`, `POST /jobs/:id/apply` | ✅ |
| Live sessions (Jitsi) | `live` | `GET /live/sessions`, `POST /live/sessions/:id/join` | ✅ join opens external browser (Jitsi embed is a browser surface — disclosed) |
| Webinars | `webinars` | `GET /live/sessions` (upcoming) | ✅ |
| Virtual labs index | `labs` | `GET /labs`, `POST /me/lab-sessions` | ⚠️ index real; experiment runner stays client-side script (web parity, disclosed) |
| Downloads/materials | `materials` | `GET /me/materials` | ✅ |
| University info | `university` | `GET /university/facts` | ✅ |
| Campus map (by city) | `map` | `GET /faculties` | ✅ |
| Payment/fees | `payment` | — | 🚫 no fee entities in backend — honest «قيد التطوير» |
| AR/VR index | `ar` | `GET /ar-experiences` | ✅ index only (parity) |
| Assignments cross-list | `assignments` | `GET /offerings/:id/full` | ✅ submit flow |
| AI academic assistant | `(tabs)/ai` | `GET /ai/config`, `POST /ai/chat`, `GET /ai/conversations`, `POST /ai/feedback` | ✅ provider badge honest (`local` = template composer — disclosed) |
| Profile | `(tabs)/profile` | `GET /me/profile` | ✅ |

## 3. Teacher

| Feature | Native route | API | Status |
|---|---|---|---|
| Dashboard | `(tabs)/dashboard` | `GET /teacher/dashboard` | ✅ |
| Schedule | `(tabs)/schedule` | `GET /teacher/me/offerings` | ✅ |
| Students roster + risk | `(tabs)/students`, `students/[offeringId]` | `GET /teacher/offerings/:id/students`, `GET /teacher/risks` | ✅ |
| Attendance | `attendance` | `POST /teacher/offerings/:id/attendance` | ✅ |
| Grades upsert | `grades` | `POST /offerings/:id/grades` | ✅ |
| Materials (JSON + PDF file) | `materials` | `POST /offerings/:id/materials`, `POST /offerings/:id/materials/file?name=&type=PDF` (raw ≤20MB) | ✅ |
| Assignments + submissions | `assignments` | `GET /teacher/me/assignments`, `GET /teacher/me/pending-submissions`, `POST /offerings/:id/assignments`, `POST /submissions/:id/grade` | ✅ |
| Exam authoring + question bank | `exams`, `exams/[templateId]` | `GET/POST /question-bank`, `GET /question-bank/categories`, `GET/POST /exams/templates`, `PATCH /exams/templates/:id`, `POST /exams/templates/:id/clone|publish`, `GET /exams/templates/:id/attempts`, `POST /exams/attempts/:id/grade` | ✅ |
| Lecture/chapter/checkpoint authoring | `curriculum` | `POST/PATCH/DELETE /offerings/:oid/lectures`, `/chapters`, `/checkpoints`, reorder | ✅ |
| Video upload (presign) | curriculum | `POST /files/uploads/presign`, `POST /files/uploads/complete` | 🧩 single PUT; multipart documented; requires S3-backed storage on prod |
| Research review (queue/annotate/grade/publish) | `research-review` | `GET /research/queue`, `POST /research/:id/grade`, `POST /research/:id/publish`, annotations CRUD | ✅ annotations as native panel + PDF viewer |
| Intelligence analytics | `(tabs)/intelligence` | `GET /teacher/offerings/:id/analytics`, `POST /teacher/offerings/:id/curriculum/suggest` | ⚠️ suggest = template simulation (disclosed) |
| Live sessions management | `live` | `POST /live/sessions`, `POST /live/sessions/:id/lifecycle` | ✅ |
| Teacher profile (CV) | `(tabs)/profile` | `GET/PATCH /me/teacher-profile` | ✅ |
| Labs preview | `labs` | `GET /labs` | ✅ |
| Messages / AI / library / alerts | mirrors student | same | ✅ |

## 4. Admin (المسجل العام)

| Feature | Native route | API | Status |
|---|---|---|---|
| Dashboard | `(tabs)/dashboard` | `GET /admin/stats`, `GET /admin/papers` | ✅ |
| Faculties & departments | `(tabs)/faculties` | `GET /admin/faculties`, `POST /admin/faculties`, `POST /admin/departments` | ✅ |
| Students + enrollments | `(tabs)/students` | `GET /admin/users?role=STUDENT`, `GET /enrollments?studentId=`, `GET /enrollments/offerings`, `POST /enrollments`, `DELETE /enrollments/:id` | ✅ |
| Teachers + positions + verify | `(tabs)/teachers` | `POST /admin/teachers/:id/verify`, `POST /admin/teachers/:id/position`, `GET /admin/teachers/:id/suggestions` | ✅ |
| Courses CRUD + offerings | `courses` | `GET /admin/courses`, `POST /courses`, `PATCH /courses/:id`, `DELETE /courses/:id`, `POST /offerings` | ✅ |
| Permissions & scope | `permissions/[id]` | `GET/POST /admin/users/:id/permissions`, `POST /admin/users/:id/scope` | ✅ |
| Reports | `(tabs)/reports` | `GET /admin/reports` | ✅ |
| Digital metrics | `digital` | `GET /admin/digital`, `GET /health` | ✅ |
| Sync console | `sync` | `GET /admin/sync`, `POST /admin/sync/trigger` | ✅ «وضع محدود» disclosed |
| Invites | `invites` | `GET/POST /invites`, `DELETE /invites/:id` | ✅ |
| Bulk import | `bulk-import` | `POST /users/bulk-import/preview|commit` | ✅ CSV picker |
| Feedback inbox | `feedback` | `GET /feedback`, `PATCH /feedback/:id` | ✅ |
| Papers drill | dashboard | `GET /admin/papers` | ⚠️ plagiarism column labeled «محاكاة» |

## 5. Quality

| Feature | Native route | API | Status |
|---|---|---|---|
| Overview | `(tabs)/dashboard` | `GET /quality/overview` | ✅ |
| Course quality | `(tabs)/courses` | `GET /quality/courses` | ✅ paginated |
| Professors eval | `professors` | `GET /quality/professors` | ✅ paginated |
| Engagement | `(tabs)/engagement` | `GET /quality/engagement` | ✅ |
| Curriculum tree | `(tabs)/curriculum` | `GET /quality/curriculum` | ✅ |
| Reports | `(tabs)/reports` | `GET /quality/*` projections | ✅ |
| Operational alerts | `alerts` | `GET /quality/alerts` | ✅ |
| Exam moderation | `exam-moderation` | `GET /exams/moderation-queue`, `POST /exams/templates/:id/moderate`, `POST /question-bank/:id/moderate` | ✅ |

## 6. Owner

| Feature | Native route | API | Status |
|---|---|---|---|
| Dashboard | `(tabs)/dashboard` | `GET /owner/stats`, `GET /owner/alerts`, `GET /owner/activity` | ✅ |
| Users directory + role/status | `(tabs)/users` | `GET /owner/users`, `POST /owner/users/:id/role`, `PATCH /owner/users/:id/status` | ✅ |
| Institutions console | `institutions`, `institutions/[slug]` | `GET/POST /owner/institutions`, `PATCH /owner/institutions/:id`, `POST /owner/institutions/:id/administrators`, memberships revoke/restore | ✅ |
| Activity log | `activity` | `GET /owner/activity` | ✅ |
| Realtime | `(tabs)/realtime` | `GET /owner/realtime` (15s poll) | ✅ |
| Governance | `(tabs)/governance` | `GET /owner/governance`, `GET /owner/login-analytics` | ✅ |
| Education metrics | `education` | `GET /owner/education` | ✅ |
| AI metrics | `ai` | `GET /owner/ai-metrics` | ✅ provider badge honest |
| System + settings + flags | `system` | `GET /owner/system`, `GET/PUT /owner/settings`, `GET/PUT /owner/feature-flags` | ✅ |
| Alerts board | `alerts` | `GET /owner/alerts`, `POST /owner/alerts/:id/resolve` | ✅ |
| Feedback inbox | `feedback` | `GET /feedback`, `PATCH /feedback/:id` | ✅ |
| Personal inbox | `(tabs)/notifications` | `/me/notifications` | ✅ |

## 7. Cross-cutting integrations

| Concern | Implementation | Status |
|---|---|---|
| Auth transport | Bearer access (15min) + `mdrk_refresh` cookie replayed manually (Set-Cookie captured natively; SameSite/Secure are browser-only constraints) | ✅ verified against live API |
| Token storage | SecureStore (access + refresh value); user JSON in AsyncStorage; never logged | ✅ |
| Session boundaries | logout / change-password / reset bump tokenVersion → clean sign-out honored | ✅ |
| Cache discipline | TanStack Query, institution-scoped keys, `queryClient.clear()` at session boundaries | ✅ |
| Pagination | `{data, meta}` offset pagination; keepPreviousData on page flips | ✅ |
| Offline | NetInfo banner; cached reads; writes blocked honestly | ✅ |
| RTL | forced RTL, logical props, mirrored back arrow | ✅ (Android first-ever launch applies from second start — native limitation, documented) |
| Deep links | web-path-mirroring routes + `madarek://` scheme; notification links honor safe in-app paths | ✅ |
| Performance | FlashList on long feeds, expo-image caching, lazy tabs | ✅ |

## 8. Deployment mismatch watch

The backend deploys continuously via Render from `main`. Endpoints added in source but not yet deployed return 404 until the next deploy; the client normalizes this honestly rather than fabricating data. At integration time the deployed `buildId` was current with `main` (`b773b18`).
