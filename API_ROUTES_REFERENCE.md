# API Routes Reference

## Base URL
`/api/v1`

## Authentication
All routes require `Authorization: Bearer <access_token>` except `/auth/*`

---

## Auth Routes (`/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Email/password login |
| POST | `/auth/register` | Student registration |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current user profile |

---

## Me Routes (`/me`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/me` | Full user profile + relations |
| PATCH | `/me` | Update profile |
| GET | `/me/notifications` | Paginated notifications |
| PATCH | `/me/notifications/:id/read` | Mark notification read |
| POST | `/me/notifications/read-all` | Mark all read |
| GET | `/me/messages` | Paginated DMs |
| POST | `/me/messages` | Send DM |

**012 additions**:
| Method | Path | Description |
|--------|------|-------------|
| GET | `/me/theme` | Get theme preference |
| PUT | `/me/theme` | Update theme preference |
| POST | `/me/onboarding/complete` | Mark onboarding done |

---

## Student Routes (`/student`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/student/dashboard` | Dashboard KPIs |
| GET | `/student/courses` | Enrolled courses |
| GET | `/student/courses/:id` | Course detail |
| GET | `/student/schedule` | Weekly schedule |
| GET | `/student/assignments` | Assignments list |
| GET | `/student/grades` | Grades overview |
| GET | `/student/attendance` | Attendance record |
| GET | `/student/library` | Library catalog |
| GET | `/student/mooc` | MOOC catalog |
| GET | `/student/jobs` | Job board |
| GET | `/student/ai` | AI assistant |
| GET | `/student/labs` | Virtual labs |
| GET | `/student/live` | Live sessions |
| GET | `/student/research` | Research papers |
| GET | `/student/profile` | Profile settings |
| GET | `/student/webinars` | Webinars |
| GET | `/student/exams` | Online exams |

---

## Teacher Routes (`/teacher`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/teacher/dashboard` | Teacher dashboard |
| GET | `/teacher/courses` | Teaching offerings |
| GET | `/teacher/courses/:id` | Offering detail |
| GET | `/teacher/schedule` | Teaching schedule |
| GET | `/teacher/attendance` | Take attendance |
| GET | `/teacher/grades` | Grade submissions |
| GET | `/teacher/materials` | Upload materials |
| GET | `/teacher/assignments` | Create assignments |
| GET | `/teacher/research` | Review papers |
| GET | `/teacher/students` | Student list |
| GET | `/teacher/performance` | Analytics |
| GET | `/teacher/messages` | DMs |
| GET | `/teacher/live` | Manage live sessions |
| GET | `/teacher/labs` | Lab sessions |

---

## Admin Routes (`/admin`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/admin/dashboard` | System overview |
| GET | `/admin/students` | Manage students |
| GET | `/admin/teachers` | Manage teachers |
| GET | `/admin/permissions/:id` | User permissions |
| GET | `/admin/sync` | University data sync |
| GET | `/admin/faculties` | Faculty management |
| GET | `/admin/courses` | Course management |
| GET | `/admin/reports` | System reports |
| GET | `/admin/settings` | Platform settings |
| GET | `/admin/analysis` | Analytics |
| GET | `/admin/digital` | Digital transformation |

---

## Owner Routes (`/owner`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/owner/dashboard` | Platform metrics |
| GET | `/owner/users` | All users |
| GET | `/owner/activity` | Activity feed |
| GET | `/owner/content` | Content moderation |
| GET | `/owner/system` | System health |
| GET | `/owner/education` | Education metrics |
| GET | `/owner/realtime` | Real-time monitor |
| GET | `/owner/ai` | AI telemetry |
| GET | `/owner/alerts` | Operational alerts |
| GET | `/owner/governance` | Governance panel |

---

## Quality Routes (`/quality`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/quality/dashboard` | Quality overview |
| GET | `/quality/courses` | Course quality |
| GET | `/quality/professors` | Professor quality |
| GET | `/quality/engagement` | Engagement metrics |
| GET | `/quality/reports` | Quality reports |
| GET | `/quality/curriculum` | Curriculum review |
| GET | `/quality/alerts` | Quality alerts |

---

## Exams Routes (`/exams`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/exams` | Exam list |
| POST | `/exams` | Create exam template |
| GET | `/exams/:id` | Exam detail |
| POST | `/exams/:id/attempt` | Start attempt |
| GET | `/exams/attempts/:id` | Attempt detail |
| POST | `/exams/attempts/:id/submit` | Submit attempt |

---

## Colleges Routes (`/colleges`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/colleges` | Gallery |
| GET | `/colleges/:slug` | College detail |
| GET | `/colleges/leaderboard` | Rankings |

---

## Competitions Routes (`/competitions`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/competitions` | List |
| GET | `/competitions/:id` | Detail |
| POST | `/competitions/:id/enter` | Submit entry |

---

## Community Routes (`/community`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/community` | Feed |
| GET | `/community/posts/:id` | Post detail |

---

## Catalog Routes (`/catalog`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/catalog/courses` | Course catalog |
| GET | `/catalog/moocs` | MOOC catalog |
| GET | `/catalog/jobs` | Job catalog |
| GET | `/catalog/labs` | Lab catalog |

---

## Courses Routes (`/courses`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/courses` | List |
| POST | `/courses` | Create |
| GET | `/courses/:id` | Detail |
| PATCH | `/courses/:id` | Update |

---

## Enrollments Routes (`/enrollments`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/enrollments` | Enroll |
| DELETE | `/enrollments/:id` | Drop |
| PATCH | `/enrollments/:id` | Update status |

---

## Sync Routes (`/sync`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/sync/run` | Trigger sync |
| GET | `/sync/runs` | Sync history |
| GET | `/sync/facts` | University facts |

---

## Milestones (Internal) (`/me/milestones`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/me/milestones/:id/fire` | Fire milestone (service-to-service) |

Milestone IDs: `first-assignment-complete`, `first-course-complete`, `exam-window-opens:<windowId>`
