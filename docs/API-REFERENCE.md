# Madarek — API Reference

**Base URL:** `/api/v1`
**Envelope:** `{ data: T }` on success, `{ error: { code, message, details? } }` on error
**Generated from:** `backend/src/app.ts` route mounts + `backend/src/http/routes/*.ts` + `backend/src/modules/{theme,onboarding,milestones}/router.ts` — 190 endpoints (189 route registrations + `/health`), one row each

## Conventions

- **Envelope:** success → `{ data: T }`; paginated lists → `{ data: T[], meta }` where `meta = { page, limit, total, totalPages }` (`lib/pagination.ts` `buildMeta`). Errors → `{ error: { code, message, details? } }`.
- **DELETE:** every delete route returns **200 `{ data: { ok: true } }`** — there are no 204s on the platform (courses, curriculum lecture/chapter/checkpoint, research annotation, enrollments — the last one flipped from 204 in wave 17).
- **Create/upsert POSTs:** return **201** (register, enroll, submit, enter competition, research submit, material/assignment/grade upserts, …).
- **Validation:** zod schemas on body + query; failures → 400 `VALIDATION_ERROR` (or `BAD_REQUEST`) with the `code` in **UPPER_SNAKE** and `details.fieldErrors` carrying the per-field issues. Schemas are `.strict()` where spoofed extra keys matter (e.g. manual grading).
- **Message language:** `message` is **Arabic** for everything user-facing (envelope defaults in `lib/errors.ts`, route guards, rate limiter, zod envelopes — wave 17). `code` stays English; dev-facing internals (Prisma mapping detail, zod field names inside `details`) stay English — the frontend's `apiErrorDetail` Arabic-guard keeps them out of the UI.
- **Input trimming:** user-content strings `.trim()` **before** `.min()`/`.max()` (wave 17, 68 fields — whitespace-only content is rejected, padded names/titles stored trimmed). Carve-outs: passwords (never trimmed) and answer-value prose (exam `answerText`, submission `textAnswer` — a space can be a legitimate answer fragment).
- **Per-domain limit caps:** every list/feed bounds its window — shared pagination schema `limit` ≤100 (default 20); admin user list ≤200; admin students ≤50; read windows per domain (`take` 20–500: materials/assignments 200, grades 500, social feeds/`SOCIAL_LIST_TAKE` 50, labs/AR 200); body fields capped per domain (messages/announcements body ≤4000 chars, grade `feedback` ≤2000, titles ≤200); grades batch ≤200 items; `q` search ≤120 chars; request body capped at 1 MB globally.

**Auth column legend:**
- **Bearer** — any authenticated user (`authMiddleware`)
- **self/ADMIN** — the target's own user, or an ADMIN/OWNER (faculty-scoped admins are 403-checked against their scope)
- a role/capability name — guarded by `requireRole(...)` / `requireCapability(...)`
- **access-checked** — `assertOfferingAccess`: ADMIN/OWNER bypass, QUALITY oversight, TEACHER owns the offering, STUDENT has an **active** enrollment (404 before 403)

**Rate limits:**

| Limiter | Scope | Budget |
|---------|-------|--------|
| Global (`globalRateLimiter`) | all `/api/v1/*` per IP | 1000 req / 15 min |
| Auth (`authRateLimiter`, failed attempts only) | `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/change-password` | 10 req / 15 min / IP |
| Route factory (`createRouteLimiter`, per-user when authenticated) | `POST /messages` (30/min), `POST /research/:id/scan` (10/min), `POST /ai/chat` (20/min) | 1 min window |

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | none | DB ping (5s timeout) + latency + env + buildId; 503 `DB_UNAVAILABLE` when the DB is down |

## Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | rate-limited | Create account (email/universityId/name/rank; shared password policy: 8–72 chars + common-password blocklist) |
| POST | `/auth/login` | rate-limited | Login (email or university registration number); 5 failures → 15-min lock (429 `TOO_MANY_REQUESTS`, LoginEvent reason `ACCOUNT_LOCKED`) |
| POST | `/auth/change-password` | Bearer + rate-limited | Change own password (`{ currentPassword, newPassword }`). Verifies current password (argon2), updates hash + bumps `tokenVersion` in one atomic write (other devices' refresh cookies die), re-issues this device's tokens. Returns `{ user, accessToken }` + rotated refresh cookie |
| POST | `/auth/refresh` | http-only cookie | Sliding refresh — re-issues tokens at the SAME `tokenVersion` (normal refresh never revokes other devices; successful refreshes skip the limiter) |
| POST | `/auth/logout` | Bearer *or* cookie | Revokes all refresh tokens (atomic `tokenVersion` bump) + clears the cookie; works with either credential |
| GET | `/auth/me` | Bearer | Current user profile |

## Users

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/users` | ADMIN/OWNER | List users — paginated `{ data, meta }`, `role` filter, `q` search (email/first/last). A faculty-scoped ADMIN only lists users of their own faculty |
| GET | `/users/:id` | self/ADMIN | User detail — explicit allow-list select (id/email/role/names/avatars/isActive/createdAt + studentProfile, teacherProfile incl. nested department). Security metadata (`failedLoginCount`, `lockedUntil`, `emailVerifiedAt`) is never returned. Scoped admins get 403 on out-of-faculty targets |
| PATCH | `/users/:id` | self/ADMIN | Update `{ firstName?, lastName?, avatarColor?, isActive? }` (strict). Non-privileged callers cannot set `isActive`; self-deactivation → 403; deactivating the last active OWNER → 409; deactivation bumps `tokenVersion` (kills the target's refresh tokens) and writes a `STATUS_CHANGE` audit row in one transaction |

## Governance (admin/owner user management)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/permissions` | Bearer | My effective capability set (role defaults ∪ grants ∖ revokes) |
| GET | `/admin/users` | USERS_MANAGE | Paginated `{ data, meta }` user list — `page`/`limit` (default 200, max 200)/`q` (≤120 chars)/`role`. Scoped admins see only their faculty |
| GET | `/admin/users/:id/permissions` | ROLES_ASSIGN | Effective + override list for a user (out-of-scope target → 403) |
| POST | `/admin/users/:id/permissions` | ROLES_ASSIGN | Grant/revoke/reset a capability override (`{ capability, grant: boolean\|null, reason? }`; `grant:null` removes the override). Writes a `CAPABILITY_OVERRIDE` audit row in the same transaction |
| POST | `/admin/users/:id/role` | ROLES_ASSIGN | Change role (`{ role, departmentId?, specialty? }`). Guards: self-change → 403; promoting to OWNER → 403 (OWNER is invitation-only); last-active-OWNER demotion → 409 (counted inside the transaction); scoped-admin out-of-faculty target → 403. STUDENT→TEACHER provisions the TeacherProfile in the same transaction (400 when no home department). Bumps `tokenVersion`, writes a `ROLE_CHANGE` audit row |
| POST | `/admin/users/:id/scope` | ROLES_ASSIGN | Set faculty governance scope (`{ scopeFacultyId: string\|null }`, ADMIN/QUALITY targets only). Self-scope-change → 403; a faculty-scoped actor cannot rewrite any ADMIN/QUALITY scope → 403. Audited (`USER_SCOPE_CHANGE`) |
| GET | `/admin/teachers/:id/suggestions` | TEACHERS_VERIFY/USERS_MANAGE | List review suggestions for a teacher |
| POST | `/admin/teachers/:id/verify` | TEACHERS_VERIFY | Verify a teacher profile |
| POST | `/admin/teachers/:id/position` | ROLES_ASSIGN | Assign a leadership position (dean / associate dean / department head, with faculty/department scope) |

## Courses

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/courses` | Bearer | List (paginated, `q` + department filter) |
| GET | `/courses/:id` | Bearer | Course detail with offerings — offering roster is role-gated: ADMIN/QUALITY/OWNER see all, TEACHER only their own, STUDENT only actively-enrolled ones |
| POST | `/courses` | ADMIN/OWNER | Create |
| PATCH | `/courses/:id` | ADMIN/OWNER | Update (partial) |
| DELETE | `/courses/:id` | ADMIN/OWNER | Delete → 200 `{ data: { ok: true } }`. 409 with a clear Arabic message when the course still has offerings or knowledge concepts (FK RESTRICT pre-check, no confusing P2003 envelope) |

## Enrollments

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/enrollments/me` | STUDENT | My enrollments (narrow select: progress + offering/course/teacher/schedule cards) |
| POST | `/enrollments` | ADMIN/OWNER | Enroll a STUDENT — pre-validates the target inside the capacity transaction (unknown student 404, non-STUDENT target 400, capacity full 409, duplicate 409); seat count filters `status:'active'`; writes an `ENROLLMENT_CREATED` audit row |
| DELETE | `/enrollments/:id` | ADMIN/OWNER | Remove enrollment (hard delete; 404 unknown) + `ENROLLMENT_REMOVED` audit row in one transaction. Returns `200 {data:{ok:true}}` |

## Offerings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id` | access-checked | Offering detail (course, teacher, schedule); clean 404 on unknown id |
| GET | `/offerings/:id/materials` | access-checked | Materials (take 200, newest first) |
| POST | `/offerings/:id/materials` | TEACHER/ADMIN/OWNER | Upload material record (`{ name, type, sizeBytes, url, description? }`) |
| GET | `/offerings/:id/assignments` | access-checked | Assignments (take 200) |
| POST | `/offerings/:id/assignments` | TEACHER/ADMIN/OWNER | Create assignment |
| GET | `/offerings/:id/grades` | access-checked | Grades (take 500; students see only their own rows) |
| POST | `/offerings/:id/grades` | TEACHER/ADMIN/OWNER | Bulk upsert grades — each item cross-validated (`score > maxScore` → path-scoped 400); an absent `feedback` clears the stored value |
| GET | `/offerings/:id/attendance` | access-checked | Attendance sessions (take 200) with records (take 500, deterministic order). The write path is `POST /teacher/offerings/:id/attendance` (the offerings-side twin was removed as dead code in wave 16) |

## Submissions (assignments)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/offerings/:offeringId/assignments/:assignmentId/submit` | STUDENT | Submit assignment (body `{ textAnswer?, fileUrl? }`; upsert on (assignmentId, studentId); status `SUBMITTED`\|`LATE` by dueAt). Race-safe: a concurrently GRADED attempt → 409, never overwritten; 201 on create/resubmit |
| POST | `/submissions/:id/grade` | TEACHER/ADMIN/OWNER | Grade a submission (body `{ grade, feedback? }`; ownership checked before any payload validation; sets status `GRADED` and notifies the student) |

## Curriculum authoring (lectures / chapters / checkpoints)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/offerings/:offeringId/lectures` | TEACHER/ADMIN/OWNER (owner) | Create lecture (body `{ title, description?, videoUrl, durationSec?, ordinal? }`; ordinal auto-increments) |
| PATCH | `/lectures/:id` | TEACHER/ADMIN/OWNER (owner) | Update lecture fields |
| DELETE | `/lectures/:id` | TEACHER/ADMIN/OWNER (owner) | Delete lecture (409 when watch history exists; chapters/checkpoints cascade) |
| POST | `/lectures/:lectureId/chapters` | TEACHER/ADMIN/OWNER (owner) | Create chapter (body `{ title, startSec, endSec }`; window validated against lecture duration) |
| PATCH | `/chapters/:id` | TEACHER/ADMIN/OWNER (owner) | Update chapter (window re-validated; `conceptId: null` clears the concept tag) |
| DELETE | `/chapters/:id` | TEACHER/ADMIN/OWNER (owner) | Delete chapter |
| POST | `/lectures/:lectureId/checkpoints` | TEACHER/ADMIN/OWNER (owner) | Create checkpoint (body `{ question, triggerSec, options[2..20], correctIndex, conceptId? }`; concept must belong to the offering's course) |
| PATCH | `/checkpoints/:id` | TEACHER/ADMIN/OWNER (owner) | Update checkpoint (correctIndex re-validated against options) |
| DELETE | `/checkpoints/:id` | TEACHER/ADMIN/OWNER (owner) | Delete checkpoint |

## Me / Notifications / Messages

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/notifications` | Bearer | Paginated + `meta.unread` count |
| PATCH | `/notifications/:id/read` | Bearer | Mark one read (own only; re-mark refreshes readAt) |
| POST | `/notifications/read-all` | Bearer | Mark all read → `{ updated }` |
| GET | `/messages` | Bearer | DM thread list (paginated, both directions) + `meta.unread` (incoming, readAt null) |
| POST | `/messages` | Bearer (30/min per user) | Send DM (`{ toUserId, body ≤4000 }`; recipient + notification written atomically; self-DM 400; unknown/inactive recipient 404/400) |
| PATCH | `/messages/:id/read` | Bearer | Mark one incoming DM read (recipient only — sender/other → 404) |
| POST | `/messages/read-all` | Bearer | Bulk mark incoming read → `{ updated }`; optional body `{ fromUserId }` scopes the sweep to one conversation |

## Learning / Lectures

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/offerings/:id/full` | Bearer | Full offering (lectures, schedule) |
| GET | `/offerings/:id/lectures` | Bearer | Lectures |
| GET | `/lectures/:id` | Bearer | Lecture detail |
| POST | `/lectures/:id/watch` | Bearer | Watch progress (`{ watchedSec, totalSec, completed? }`). Server-side completion rule: completed only at ≥90% of `min(totalSec, durationSec)` (integer cross-multiply — the client's `completed:true` alone never grants PRESENT). Row-locked high-water clamp (progress can never rewind); whole flow in one transaction |
| POST | `/lectures/:lid/checkpoints/:cid/answer` | Bearer | Answer checkpoint |

## Student Dashboard & Learning Profile

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/profile` | Bearer | Learning profile |
| GET | `/me/resume` | Bearer | Learning resume (active enrollments) |
| GET | `/me/matrix` | Bearer | Mastery matrix |
| GET | `/me/gaps` | Bearer | Gap detection (take 50) |
| GET | `/me/dashboard` | Bearer | Student dashboard aggregate (attendance uses the canonical formula: LATE = half credit, EXCUSED excluded; summer term = just-finished spring) |
| GET | `/me/results` | Bearer | Results — folds GRADED submission work into the per-course rollup alongside Grade rows |
| GET | `/me/materials` | Bearer | Student's materials |
| GET | `/me/lab-sessions` | Bearer | Lab sessions (totals from real count() queries, not the page slice) |

## Research

Workflow: UPLOADED → SCANNING → CHECKS_PASSED/FAILED → GRADED → PUBLISHED (gradeable in CHECKS_PASSED/FAILED/GRADED; PUBLISHED final).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/research` | Bearer | My papers |
| POST | `/me/research` | Bearer | Submit paper (registers `{ title, abstract?, fileUrl, offeringId? }` — no multipart upload; files are served from `backend/storage/papers/`) |
| POST | `/research/:id/scan` | Bearer (10/min) | Simulated plagiarism + AI scan (parses the PDF); TEACHER gated by paper ownership |
| POST | `/research/:id/grade` | RESEARCH_GRADE_OWN/ANY | Grade paper (only gradeable statuses; PUBLISHED → 409) |
| GET | `/research/queue` | TEACHER/ADMIN/OWNER | Review queue — student emails stripped from the payload; TEACHER view scoped to their offerings |
| POST | `/research/:id/publish` | TEACHER/ADMIN/OWNER | Publish to library (sets publishedAt) |
| GET | `/research/published` | Bearer | Published papers |
| GET | `/research/search` | Bearer | Full-text search (title + abstract + extractedText; `meta.total` is a real count) |
| GET | `/research/:id/annotations` | Bearer | List annotations (QUALITY can read any paper's annotations) |
| POST | `/research/:id/annotations` | TEACHER/ADMIN/OWNER | Add annotation (`{ page, comment, color? }`) |
| DELETE | `/research/annotations/:id` | Bearer (author) / ADMIN/OWNER | Delete annotation (authors delete their own; ADMIN/OWNER oversight) — note the flat path, not `/research/:id/annotations/:aid` |

## Quality

All `requireCapability('QUALITY_VIEW')`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/quality/alerts` | Derived alerts (attendance rates, stale offerings, engagement) — computed fresh, no persisted rows |
| GET | `/quality/overview` | Quality overview metrics |
| GET | `/quality/courses` | Per-course quality data |
| GET | `/quality/professors` | Professor performance (deterministic order + stable per-teacher seed) |
| GET | `/quality/engagement` | Engagement metrics |
| GET | `/quality/curriculum` | Curriculum review data |

## Training (Self-Development)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/training/catalog` | Bearer | Published tracks (with progress) |
| GET | `/training/tracks/:slug` | Bearer | Track + lessons + progress (404 when unpublished — no enrolled-student carve-out) |
| POST | `/training/tracks/:slug/enroll` | Bearer | Enroll in track |
| POST | `/training/lessons/:lessonId/complete` | Bearer | Complete lesson — quiz answers must match EXACTLY (trim + case-fold + separator-noise collapse; substring matches never pass; blank keys unsatisfiable) |
| GET | `/training/me` | Bearer | Summary (level, points, badges, certs) |
| GET | `/training/me/badges` | Bearer | Full badge list |
| GET | `/training/me/certificates` | Bearer | Certificates |
| GET | `/training/leaderboard` | Bearer | Top 20 by points (orphaned ledger rows skipped, ranks stay contiguous) |

## Teacher

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teacher/me/offerings` | TEACHER/OWNER | My offerings with KPIs |
| GET | `/teacher/offerings/:id/students` | TEACHER/ADMIN/OWNER | Roster + risk assessment (unified risk model: brand-new course = OK; assignment grading folded into avgGrade) |
| GET | `/teacher/offerings/:id/analytics` | TEACHER/ADMIN/OWNER | Offering analytics (attendance: LATE half credit, EXCUSED excluded; passRate over combined grades + GRADED submissions) |
| GET | `/teacher/risks` | TEACHER/ADMIN/OWNER | At-risk students (top 15) |
| POST | `/teacher/offerings/:id/attendance` | TEACHER/ADMIN/OWNER | Record attendance |
| POST | `/teacher/offerings/:id/curriculum/suggest` | CURRICULUM_EDIT_OWN/ANY | Suggest changes |

## Teacher Profile & Live Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/teacher-profile` | TEACHER/OWNER | Full academic profile |
| PATCH | `/me/teacher-profile` | TEACHER/OWNER | Update profile (publication/award years validated at runtime) |
| GET | `/live/sessions` | Bearer | List sessions — STUDENT via active enrollments; TEACHER for offerings they teach; per-status buckets so LIVE rows are never pushed out |
| POST | `/live/sessions` | TEACHER/ADMIN/OWNER | Create live session (past timestamps >5min rejected; offering ownership via the shared guard) |
| POST | `/live/sessions/:id/lifecycle` | TEACHER/ADMIN/OWNER | Start/end/cancel — state-machine transitions (SCHEDULED→LIVE\|CANCELLED, LIVE→ENDED\|CANCELLED); invalid transitions → 409; concurrent flips claim-guarded |

## Teacher Dashboard

Mounted at `/api/v1/teacher` (router: `authMiddleware + requireRole(TEACHER, ADMIN, OWNER)`).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/teacher/dashboard` | TEACHER/ADMIN/OWNER | Teacher dashboard aggregate (KPI averages via SQL groupBy, not row hydration) |
| GET | `/teacher/me/materials` | TEACHER/ADMIN/OWNER | Teacher's materials |
| GET | `/teacher/me/assignments` | TEACHER/ADMIN/OWNER | Teacher's assignments feed |

## Exams & Question Bank

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/question-bank` | Bearer | Browse questions (filtered) |
| GET | `/question-bank/categories` | Bearer | List categories |
| POST | `/question-bank` | EXAMS_AUTHOR | Create question (MCQ/TF need choices + in-range integer key — TF exactly 2 choices; SHORT needs a model answer; ESSAY optional rubric) |
| POST | `/question-bank/:id/moderate` | EXAMS_MODERATE | Approve/reject question |
| POST | `/exams/templates` | EXAMS_AUTHOR | Create template (openAt < closeAt; unique question ids; unknown/unapproved questions rejected) |
| GET | `/exams/templates` | Bearer | List templates |
| GET | `/exams/templates/:id` | Bearer | Template detail |
| POST | `/exams/templates/:id/moderate` | EXAMS_MODERATE | Moderate template |
| POST | `/exams/templates/:id/publish` | EXAMS_AUTHOR | Publish exam |
| GET | `/exams/me` | STUDENT | My attempts |
| POST | `/exams/templates/:id/start` | STUDENT | Start attempt (timed; Fisher-Yates shuffle when randomized). **Resume:** a live IN_PROGRESS attempt within the grace window returns 200 with the full fresh-start shape plus `resumed: true` and `attempt: { id, status, expiresAt, answers: [{ questionId, value }] }` (value = choiceIndex number \| answerText string; no reshuffle). Closed attempts (GRADED/EXPIRED/SUBMITTED) → `{ attemptId, status, alreadyAttempted: true }`. Expired-but-unflipped rows are flipped to EXPIRED inside the start transaction. One attempt per exam — EXPIRED included (PRACTICE retakeable while no live attempt) |
| POST | `/exams/attempts/:id/answer` | STUDENT | Answer question (saves only the provided dimension — text-only retry keeps a saved choice; type-appropriate field required) |
| POST | `/exams/attempts/:id/submit` | STUDENT | Submit attempt. Short answers graded by exact match (trim + case-fold, never substring); unanswered ESSAY / keyless SHORT park the attempt as SUBMITTED for manual grading. `passed` is `boolean\|null` (null while manual grading pending); late EXPIRED flip is claim-guarded (concurrently graded attempts are never overwritten) |
| GET | `/exams/templates/:id/attempts` | TEACHER/ADMIN/OWNER | Attempts of a template for grading — `{data: [{id, studentId, studentName, status, startedAt, submittedAt, score, maxScore, pendingReview, pendingAnswers: [{answerId, questionId, prompt, type, points, studentAnswer}]}]}`; pendingAnswers embedded on SUBMITTED rows only (IN_PROGRESS/EXPIRED keep counts, empty array); `?status=` filter, take 200; offering-owner teacher / keyless-template author / OWNER (ADMIN refused on keyless) |
| POST | `/exams/attempts/:attemptId/grade` | TEACHER/ADMIN/OWNER | **Manual grading** — body `{ answers: [{ answerId, isCorrect, feedback? }] }` (strict, both levels). SUBMITTED-only transition (claim-guarded, concurrent grade → 409); payload must grade exactly the pending answers (duplicates/not-pending/missing → 400 with offending ids); finalizes to GRADED with score = machine points + teacher decisions. Returns `{ score, maxScore, status, passed }` |
| GET | `/exams/moderation-queue` | EXAMS_MODERATE | Pending moderation |

## Social

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/announcements/feed` | Bearer | Scoped announcement feed (expired announcements leave the feeds; OWNER sees the full oversight branch) |
| POST | `/announcements` | ANNOUNCE_FACULTY/PLATFORM | Create announcement (`expiresAt` supported) |
| GET | `/competitions` | Bearer | List competitions (take 50; status order OPEN→CLOSED→JUDGED) |
| GET | `/competitions/:id` | Bearer | Competition detail + entries (take 50; non-organizers see the public entry projection) |
| POST | `/competitions` | COMPETITIONS_RUN | Create competition |
| POST | `/competitions/:id/enter` | Bearer | Enter competition (closed/deadline-passed → 409) |
| POST | `/competitions/:id/close` | COMPETITIONS_RUN | Close & judge (must be closed before judging; at least one scored entry unless empty) |
| POST | `/competitions/:id/entries/:entryId/score` | COMPETITIONS_RUN | Score an entry — **409 once the competition is JUDGED** (scores are final) |
| POST | `/competitions/:id/judge` | COMPETITIONS_RUN | Finalize judging (≥1 scored entry required, or no entries at all) |
| GET | `/events` | Bearer | List events (take 50, expiry-aware) |
| POST | `/events` | EVENTS_RUN | Create event (capacity bounds, endsAt > startsAt) |
| POST | `/events/:id/rsvp` | Bearer | RSVP (GOING/MAYBE/NO) — capacity serialized via a row lock on the event; only GOING consumes a seat |
| GET | `/posts` | Bearer | Social feed (paginated; `q` filters by body) |
| POST | `/posts` | Bearer | Create post (hashtags) |
| POST | `/posts/:id/react` | Bearer | React (like \| save) |

There is **no** `POST /posts/:id/comment` route — comments are read via the post payload only (`_count: comments`).

## Catalog (Library / MOOCs / Jobs / Labs / Gamification)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/library/books` | Bearer | Book catalog (paginated, `category` + `q` filters) |
| POST | `/library/loans` | Bearer | Borrow book (body `{ bookId }` — not `/library/books/:id/loan`); guarded decrement, no copies → 409 |
| POST | `/library/loans/:id/return` | Bearer | Return book (own loan; already closed → 409; copy restored with a totalCopies clamp) |
| GET | `/me/loans` | Bearer | My loans (take 100, newest first) |
| GET | `/mooc` | Bearer | MOOC catalog (paginated, category filter) |
| POST | `/mooc/:id/enroll` | Bearer | Enroll in MOOC |
| GET | `/jobs` | Bearer | Job listings (paginated, category filter) |
| POST | `/jobs/:id/apply` | Bearer | Apply to job (unknown job → clean 404) |
| GET | `/labs` | Bearer | Virtual labs (take 200) |
| GET | `/ar-experiences` | Bearer | AR/VR experiences (take 200) |
| GET | `/faculties` | Bearer | Faculty list |
| GET | `/leaderboard` | Bearer | Gamification leaderboard |
| GET | `/me/achievements` | Bearer | My achievements |
| GET | `/me/skills` | Bearer | My skills |
| GET | `/me/certificates` | Bearer | My certificates |
| GET | `/admin/stats` | ADMIN/OWNER | Platform stats |
| GET | `/admin/faculties` | ADMIN/OWNER | Faculty management data |
| GET | `/admin/reports` | ADMIN/OWNER | KPI reports (topCourses aggregated per course — enrollment counts, deterministic order) |
| GET | `/admin/courses` | ADMIN/OWNER | Course management data (totals aggregated across ALL of each page course's offerings, not the take:3 preview) |

## Search

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/search/global?q=` | Bearer | Cross-entity autocomplete (courses, lectures, papers, tracks — Arabic-normalized, parallel queries, deterministic ordering) |

## Sync / University Facts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/admin/sync` | USERS_MANAGE/QUALITY_VIEW | Sync status + history |
| POST | `/admin/sync/trigger` | USERS_MANAGE | Trigger sync |
| GET | `/university/facts` | Bearer | Institutional facts (key-value, synced from the official UoZ listing) |

## AI

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/ai/chat` | Bearer (20/min per user) | Chat with AI (telemetry recorded) |
| GET | `/ai/conversations` | Bearer | List conversations (take 50) |
| GET | `/ai/conversations/:id/messages` | Bearer | Conversation messages — capped at the newest 200 messages (delivered in chronological order) |

## Files

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/files/papers/:filename` | Bearer | Serve PDF from `backend/storage/papers/` — path-traversal protected (basename + dir-pin), `.pdf` only. Access gate: paper is PUBLISHED, requester is the owner or reviewer, or requester is ADMIN/OWNER/QUALITY (oversight). Orphan files are not served |

## Colleges (Public)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/colleges` | PUBLIC | Light list (name, city, counts) — 25 seeded faculties (13 Zawiya, 8 Ajilat, 1 Zwara, 1 Abu Issa, 1 Nasser, 1 other; unique on name+city) |
| GET | `/colleges/leaderboard` | Bearer | Inter-college comparison (constant 10-query aggregation, deterministic) |
| GET | `/colleges/:id` | Bearer | Per-college overview bundle (top students with deterministic tiebreak) |

## Admin Extras

Mounted at `/api/v1/admin` (router: `authMiddleware + requireRole(ADMIN, OWNER)`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/students` | Paginated student list — zod-validated query (`page`/`limit` ≤50 default 20/`q` ≤120/`facultyId` cuid). Malformed `page`/`limit`/`facultyId` → clean 400 (never a NaN 500). Scoped admins are pinned to their own faculty (a foreign facultyId intersects to zero rows). `{ data, meta }` via the shared buildMeta |
| GET | `/admin/digital` | Digital transformation data (9 bounded parallel counts) |

There are **no** `/admin/analysis`, `/admin/settings`, `/admin/extra-reports` endpoints. The admin UI pages map to real routes as: analysis → `/admin/reports`, students → `/admin/students`, digital → `/admin/digital`; the settings page renders static operational info (per-setting controls are marked "under development" in the UI).

## Owner (Master Control)

All routes: `authMiddleware + requireRole(OWNER)`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/owner/stats` | Platform-wide statistics |
| GET | `/owner/users` | Paginated user list (role filter, `q` search) |
| POST | `/owner/users/:id/role` | Change user role (self 403; OWNER promotion 403 via this path; last-active-owner guard with `FOR UPDATE` row locks → 409; TEACHER provisioning parity; `ROLE_CHANGE` audit row with `source:'owner'`) |
| PATCH | `/owner/users/:id/status` | Toggle isActive (self-deactivation 403; self **re-activation allowed**; last-owner guard 409; `tokenVersion` bumped on deactivation only; `STATUS_CHANGE` audit in-transaction) |
| GET | `/owner/activity` | Paginated audit log |
| GET | `/owner/education` | Education aggregate (topCourses + attendance trend) — SQL-aggregated (`date_trunc` month buckets); response shape unchanged |
| GET | `/owner/system` | Operational telemetry (sync, alerts, activity) |
| GET | `/owner/realtime` | Live metrics snapshot (active sessions, AI/min, broadcasts, exams) |
| GET | `/owner/ai-metrics` | AI telemetry aggregates (7d, SQL day buckets) |
| GET | `/owner/alerts` | Unresolved alerts |
| POST | `/owner/alerts/:id/resolve` | Resolve alert — already-resolved → **409**; resolution + `ALERT_RESOLVED` audit in one transaction |
| GET | `/owner/login-analytics` | Login event aggregates (30d, SQL day buckets; retention prunes LoginEvents after 180d) |
| GET | `/owner/settings` | All platform settings |
| PUT | `/owner/settings/:key` | Upsert setting — 400 when `value` > 2000 chars or `category` > 40 chars |
| GET | `/owner/feature-flags` | All feature flags |
| PUT | `/owner/feature-flags/:slug` | Toggle flag (audited in-transaction) |
| GET | `/owner/governance` | Governance metrics (8-week growth, SQL week buckets) |

## Theme & Onboarding & Milestones (012 feature)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/me/theme` | Bearer | Get theme preference (+ `themePreferenceUpdatedAt`) |
| PUT | `/me/theme` | Bearer | Set theme preference (`{ themePreference: LIGHT\|DARK\|SYSTEM }`, strict) |
| POST | `/me/onboarding/complete` | Bearer | Mark onboarding complete — idempotent + race-safe (conditional write + audit row in one transaction; repeats return the original timestamp). There is no `GET /me/onboarding` — the profile's `onboardingCompletedAt` + `firedMilestones` on `/auth/me` carry the state |
| POST | `/me/milestones/:id/fire` | **service token** (`x-internal-service-token`) | Fire a milestone for `{ userId }` — **server-to-server only, NOT user Bearer auth** (a user JWT always 403s). Fail-closed when `INTERNAL_SERVICE_TOKEN` is unset. Constant-time (SHA-256 digests + `timingSafeEqual`) comparison. Ids: `first-assignment-complete`, `first-course-complete`, `exam-window-opens:<windowId>`. In-process callers use `fireMilestone()` directly |

## Error Codes

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| BAD_REQUEST | 400 | Invalid input |
| VALIDATION_ERROR | 400 | Zod validation failed (`details` = flattened field errors) |
| UNAUTHENTICATED | 401 | Missing/invalid token |
| TOKEN_EXPIRED | 401 | Access token expired (triggers the frontend refresh flow) |
| INVALID_CREDENTIALS | 401 | Wrong email/password |
| FORBIDDEN | 403 | Insufficient role/capability/scope |
| NOT_FOUND | 404 | Resource not found (also used to hide existence) |
| CONFLICT | 409 | Duplicate/state conflict (Prisma P2002, last-owner guard, FK-RESTRICT pre-checks, lifecycle violations) |
| PAYLOAD_TOO_LARGE | 413 | Request body over the 1 MB cap (body-parser `entity.too.large` / `parameters.too.many`) |
| UNSUPPORTED_MEDIA_TYPE | 415 | Unsupported charset/encoding (body-parser `charset.unsupported` / `encoding.unsupported`) |
| TOO_MANY_REQUESTS | 429 | Rate limited |
| INTERNAL | 500 | Unhandled error (no internals leaked; raises an OperationalAlert) |

Notes:
- Body-parser rejects are mapped to 400/413/415 with our own message (the raw parser error — which embeds request bytes — is never echoed).
- Prisma `P2002` → 409, `P2025` → 404, `P2003` → 400, centralized in the error handler.
- 4xx responses never raise `OperationalAlert` rows; only true 5xx paths are telemetered.
- Unknown `/api/*` paths return the JSON envelope `NOT_FOUND` — never Express HTML.
