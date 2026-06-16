# Madarek — API Reference

**Base URL:** `/api/v1`
**Envelope:** `{ data: T }` on success, `{ error: { code, message, details? } }` on error

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | DB ping + latency + env + buildId |

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | rate-limited | Create account |
| POST | `/auth/login` | rate-limited | Login (email or university id) |
| POST | `/auth/refresh` | http-only cookie | Rotate refresh token |
| POST | `/auth/logout` | Bearer | Revoke refresh tokens |
| GET | `/auth/me` | Bearer | Current user profile |

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | ADMIN | List users (paginated, filter by role) |
| GET | `/users/:id` | self/ADMIN | User detail |
| PATCH | `/users/:id` | self/ADMIN | Update profile |

## Courses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses` | Bearer | List (paginated, filter by department) |
| GET | `/courses/:id` | Bearer | Detail with offerings |
| POST | `/courses` | ADMIN | Create |
| PATCH | `/courses/:id` | ADMIN | Update |
| DELETE | `/courses/:id` | ADMIN | Delete |

## Enrollments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/enrollments/me` | STUDENT | My enrollments |
| POST | `/enrollments` | ADMIN | Enroll student |
| DELETE | `/enrollments/:id` | ADMIN | Remove enrollment |

## Offerings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id` | access-checked | Offering detail |
| GET | `/offerings/:id/materials` | access-checked | List materials |
| POST | `/offerings/:id/materials` | TEACHER/ADMIN | Upload material |
| GET | `/offerings/:id/assignments` | access-checked | List assignments |
| POST | `/offerings/:id/assignments` | TEACHER/ADMIN | Create assignment |
| GET | `/offerings/:id/grades` | access-checked | List grades |
| POST | `/offerings/:id/grades` | TEACHER/ADMIN | Upsert grades |
| GET | `/offerings/:id/attendance` | access-checked | Attendance sessions |
| POST | `/offerings/:id/attendance` | TEACHER/ADMIN | Record attendance |

## Me / Notifications / Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | Paginated + unread count |
| PATCH | `/notifications/:id/read` | Bearer | Mark read |
| POST | `/notifications/read-all` | Bearer | Mark all read |
| GET | `/messages` | Bearer | DM list |
| POST | `/messages` | Bearer | Send DM |
| GET | `/me/profile` | Bearer | Learning profile |
| GET | `/me/resume` | Bearer | Learning resume |
| GET | `/me/matrix` | Bearer | Mastery matrix |
| GET | `/me/gaps` | Bearer | Gap detection |
| GET | `/me/research` | Bearer | My papers |
| POST | `/me/research` | Bearer | Submit paper |
| GET | `/me/achievements` | Bearer | My achievements |
| GET | `/me/skills` | Bearer | My skills |
| GET | `/me/certificates` | Bearer | My certificates |
| GET | `/me/loans` | Bearer | My library loans |
| GET | `/me/dashboard` | Bearer | Student dashboard aggregate |
| GET | `/me/materials` | TEACHER/ADMIN/OWNER | My materials (teacher) |
| GET | `/me/teacher-profile` | TEACHER/ADMIN/OWNER | Get teacher profile |
| PATCH | `/me/teacher-profile` | TEACHER/ADMIN/OWNER | Update teacher profile |

## Learning / Lectures

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id/full` | Bearer | Full offering (lectures, schedule) |
| GET | `/offerings/:id/lectures` | Bearer | Lectures |
| GET | `/lectures/:id` | Bearer | Lecture detail |
| POST | `/lectures/:id/watch` | Bearer | Watch progress |
| POST | `/lectures/:lid/checkpoints/:cid/answer` | Bearer | Answer checkpoint |

## Research

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/research/:id/scan` | Bearer | Simulate plagiarism + AI scan |
| POST | `/research/:id/grade` | RESEARCH_GRADE_* | Grade paper |
| GET | `/research/queue` | TEACHER/ADMIN | Review queue |
| POST | `/research/:id/publish` | TEACHER/ADMIN | Publish to library |
| GET | `/research/published` | Bearer | Published papers |
| GET | `/research/search` | Bearer | Full-text search |
| POST | `/research/:id/annotations` | Bearer | Add annotation |
| GET | `/research/:id/annotations` | Bearer | List annotations |
| DELETE | `/research/:id/annotations/:aid` | TEACHER/ADMIN | Delete annotation |

## Quality

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/quality/overview` | QUALITY_VIEW | Quality overview metrics |
| GET | `/quality/courses` | QUALITY_VIEW | Per-course quality data |
| GET | `/quality/professors` | QUALITY_VIEW | Professor performance |
| GET | `/quality/engagement` | QUALITY_VIEW | Engagement metrics |
| GET | `/quality/curriculum` | QUALITY_VIEW | Curriculum review data |

## Training (Self-Development)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/training/catalog` | Bearer | Published tracks (with progress) |
| GET | `/training/tracks/:slug` | Bearer | Track + lessons + progress |
| POST | `/training/tracks/:slug/enroll` | Bearer | Enroll in track |
| POST | `/training/lessons/:lessonId/complete` | Bearer | Complete lesson |
| GET | `/training/me` | Bearer | Summary (level, points, badges, certs) |
| GET | `/training/me/badges` | Bearer | Full badge list |
| GET | `/training/me/certificates` | Bearer | Certificates |
| GET | `/training/leaderboard` | Bearer | Top 20 by points |

## Teacher

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teacher/me/offerings` | TEACHER/ADMIN/OWNER | My offerings with KPIs |
| GET | `/teacher/offerings/:id/students` | TEACHER/ADMIN/OWNER | Roster + risk assessment |
| GET | `/teacher/offerings/:id/analytics` | TEACHER/ADMIN/OWNER | Offering analytics |
| GET | `/teacher/risks` | TEACHER/ADMIN/OWNER | At-risk students (all offerings) |
| POST | `/teacher/offerings/:id/attendance` | TEACHER/ADMIN/OWNER | Record attendance |
| POST | `/teacher/offerings/:id/curriculum/suggest` | CURRICULUM_EDIT_* | Suggest changes |
| GET | `/admin/teachers/:id/suggestions` | TEACHERS_VERIFY | Review suggestions |
| POST | `/admin/teachers/:id/verify` | TEACHERS_VERIFY | Verify teacher |
| GET | `/teacher/me/dashboard` | TEACHER/ADMIN/OWNER | Teacher dashboard aggregate |
| GET | `/teacher/me/materials` | TEACHER/ADMIN/OWNER | Teacher's materials |

## Live Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/live/sessions` | Bearer | List sessions |
| POST | `/live/sessions` | TEACHER/ADMIN/OWNER | Create live session |
| POST | `/live/sessions/:id/lifecycle` | TEACHER/ADMIN/OWNER | Start/end session |

## Exams & Question Bank

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/question-bank` | Bearer | Browse questions (filtered) |
| GET | `/question-bank/categories` | Bearer | List categories |
| POST | `/question-bank` | EXAMS_AUTHOR | Create question |
| POST | `/question-bank/:id/moderate` | EXAMS_MODERATE | Approve/reject question |
| POST | `/exams/templates` | EXAMS_AUTHOR | Create template |
| GET | `/exams/templates` | Bearer | List templates |
| GET | `/exams/templates/:id` | Bearer | Template detail |
| POST | `/exams/templates/:id/moderate` | EXAMS_MODERATE | Moderate template |
| POST | `/exams/templates/:id/publish` | EXAMS_AUTHOR | Publish exam |
| GET | `/exams/me` | STUDENT | My attempts |
| POST | `/exams/templates/:id/start` | STUDENT | Start attempt (timed) |
| POST | `/exams/attempts/:id/answer` | STUDENT | Answer question |
| POST | `/exams/attempts/:id/submit` | STUDENT | Submit attempt |
| GET | `/exams/moderation-queue` | EXAMS_MODERATE | Pending moderation |

## Social

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/announcements/feed` | Bearer | Scoped announcement feed |
| POST | `/announcements` | ANNOUNCE_* | Create announcement |
| GET | `/competitions` | Bearer | List competitions |
| POST | `/competitions` | COMPETITIONS_RUN | Create competition |
| POST | `/competitions/:id/enter` | Bearer | Enter competition |
| POST | `/competitions/:id/close` | COMPETITIONS_RUN | Close & judge |
| GET | `/events` | Bearer | List events |
| POST | `/events` | EVENTS_RUN | Create event |
| POST | `/events/:id/rsvp` | Bearer | RSVP to event |
| GET | `/posts` | Bearer | Social feed |
| POST | `/posts` | Bearer | Create post |
| POST | `/posts/:id/comment` | Bearer | Add comment |
| POST | `/posts/:id/react` | Bearer | React (like/save) |

## Catalog (Library / MOOCs / Jobs / Labs / Gamification)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/library/books` | Bearer | Book catalog |
| POST | `/library/books` | Bearer (admin) | Add book |
| POST | `/library/books/:id/loan` | Bearer | Borrow book |
| POST | `/library/loans/:id/return` | Bearer | Return book |
| GET | `/mooc` | Bearer | MOOC catalog |
| POST | `/mooc/:id/enroll` | Bearer | Enroll in MOOC |
| GET | `/jobs` | Bearer | Job listings |
| POST | `/jobs/:id/apply` | Bearer | Apply to job |
| GET | `/labs` | Bearer | Virtual labs |
| GET | `/ar-experiences` | Bearer | AR/VR experiences |
| GET | `/faculties` | Bearer | Faculty list |
| GET | `/leaderboard` | Bearer | Gamification leaderboard |

## Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/global?q=` | Bearer | Cross-entity search (autocomplete) |

## Admin

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/stats` | ADMIN | Platform stats |
| GET | `/admin/faculties` | ADMIN | Faculty management data |
| GET | `/admin/reports` | ADMIN | KPI reports |
| GET | `/admin/courses` | ADMIN | Course management data |
| GET | `/admin/sync` | USERS_MANAGE/QUALITY_VIEW | Sync status |
| POST | `/admin/sync/trigger` | USERS_MANAGE | Trigger sync |
| POST | `/admin/teachers/:id/suggestions` | TEACHERS_VERIFY | Review teacher |
| POST | `/admin/teachers/:id/verify` | TEACHERS_VERIFY | Verify teacher |

## Sync / University Facts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/sync` | USERS_MANAGE/QUALITY_VIEW | Sync status + history |
| POST | `/admin/sync/trigger` | USERS_MANAGE | Trigger sync |
| GET | `/university/facts` | Bearer | Institutional facts |

## AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | Bearer (rate-limited) | Chat with AI |
| GET | `/ai/conversations` | Bearer | List conversations |
| GET | `/ai/conversations/:id/messages` | Bearer | Conversation messages |

## Files

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/files/papers/:filename` | Bearer | Serve PDF (path-traversal protected, .pdf only) |

## Colleges (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/colleges` | PUBLIC | Light list (name, city, counts) |
| GET | `/colleges/leaderboard` | Bearer | Inter-college comparison |
| GET | `/colleges/:id` | Bearer | Per-college overview bundle |

## Admin Extras

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/students` | ADMIN | List students |
| GET | `/admin/analysis` | ADMIN | Analysis data |
| GET | `/admin/digital` | ADMIN | Digital transformation data |
| GET | `/admin/settings` | ADMIN | Settings |
| GET | `/admin/extra-reports` | ADMIN | Extra reports |

## Owner (Master Control)

All routes use `authMiddleware + requireRole(OWNER)`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/owner/stats` | Platform-wide statistics |
| GET | `/owner/users` | Paginated user list (filter by role, search) |
| POST | `/owner/users/:id/role` | Change user role |
| PATCH | `/owner/users/:id/status` | Toggle isActive |
| GET | `/owner/activity` | Paginated audit log |
| GET | `/owner/education` | Education aggregate (courses, workload, attendance trend) |
| GET | `/owner/system` | Operational telemetry (sync, alerts, activity) |
| GET | `/owner/realtime` | Live metrics snapshot |
| GET | `/owner/ai-metrics` | AI telemetry aggregates (7d) |
| GET | `/owner/alerts` | Unresolved alerts |
| POST | `/owner/alerts/:id/resolve` | Resolve alert |
| GET | `/owner/login-analytics` | Login event aggregates (30d) |
| GET | `/owner/settings` | All platform settings |
| PUT | `/owner/settings/:key` | Upsert setting |
| GET | `/owner/feature-flags` | All feature flags |
| PUT | `/owner/feature-flags/:slug` | Toggle flag |
| GET | `/owner/governance` | Governance metrics |
| GET | `/owner/realtime` | Live metrics (active sessions, AI/min, broadcasts, exams) |

## Student Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/dashboard` | Bearer | Aggregated student dashboard |
| GET | `/me/results` | Bearer | Student results |
| GET | `/me/materials` | Bearer | Student's materials |
| GET | `/me/lab-sessions` | Bearer | Lab sessions |

## Teacher Dashboard

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teacher/me/dashboard` | TEACHER/ADMIN/OWNER | Aggregated teacher dashboard |
| GET | `/teacher/me/materials` | TEACHER/ADMIN/OWNER | Teacher's materials |

## Theme & Onboarding (012 Feature)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/theme` | Bearer | Get theme preference |
| PUT | `/me/theme` | Bearer | Set theme preference |
| GET | `/me/onboarding` | Bearer | Get onboarding status |
| POST | `/me/onboarding/complete` | Bearer | Mark onboarding complete |
| GET | `/me/milestones` | Bearer | Get fired milestones |
| POST | `/me/milestones/fire` | Bearer | Fire a milestone |

## Permissions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/permissions` | Bearer | My effective capabilities |
| GET | `/admin/users/:id/permissions` | ADMIN | User's permission overrides |
| POST | `/admin/users/:id/permissions` | ROLES_ASSIGN | Grant/revoke permission |

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| BAD_REQUEST | 400 | Invalid input |
| VALIDATION_ERROR | 400 | Zod validation failed |
| UNAUTHENTICATED | 401 | Missing/invalid token |
| TOKEN_EXPIRED | 401 | Access token expired (triggers refresh) |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| FORBIDDEN | 403 | Insufficient role/capability |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Duplicate (Prisma P2002) |
| TOO_MANY_REQUESTS | 429 | Rate limited |
| INTERNAL | 500 | Unhandled error (no details leaked) |
