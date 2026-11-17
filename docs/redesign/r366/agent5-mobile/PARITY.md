# Web ↔ Mobile Parity — R366 Agent 5

The 20 most important product flows: web route ↔ mobile route ↔ the shared
design language (tokens from `shared/design-tokens.json` on both sides) and
state coverage (loading / empty / error / dark). Mobile routes are expo-router
paths; every mobile screen rides the same `Screen`/kit states and the same
token source as the web (`scripts/tokens/build.mjs` → `tokens.generated.{css,ts}`).

| # | Flow | Web page (frontend/src/pages) | Mobile screen (apps/mobile/app) | Same tokens | States covered (mobile) |
|---|------|------------------------------|--------------------------------|-------------|-------------------------|
| 1 | Welcome / marketing entry | `LandingPage` | `index.tsx` → `auth/index.tsx` (welcome sheet) | ✓ palette/type/motion | entering animation, offline banner |
| 2 | Login | auth pages | `auth/login.tsx` | ✓ | validation, error toast, cold-boot wake (`boot.tsx`) |
| 3 | Register (student/teacher) | auth pages | `auth/register.tsx` | ✓ | role split, invite code, validation |
| 4 | Forgot / reset password | auth pages | `auth/forgot-password.tsx`, `auth/reset-password.tsx` | ✓ | sent/confirm, expired-link error |
| 5 | Institution selection | app shell | `select-institution.tsx` | ✓ | search, no-membership empty |
| 6 | Student dashboard | student dashboard | `student/(tabs)/dashboard.tsx` | ✓ KpiCard/StatLine | skeleton, not-enrolled empty, live-now chip |
| 7 | Course list (student) | student courses | `student/(tabs)/courses.tsx` | ✓ DataList rows | filter empty, retry footer |
| 8 | Course detail | student course detail | `student/courses/[offeringId].tsx` | ✓ | announcements/materials/lecture sections |
| 9 | Lecture player | student lecture page | `student/lectures/[lectureId].tsx` | ✓ immersive shell | transcript states, checkpoints, resume |
| 10 | Schedule | student schedule | `student/schedule.tsx` + `student/calendar.tsx` | ✓ | per-day empty, room names |
| 11 | Assignments (student) | student assignments | `student/assignments.tsx` | ✓ submit sheet | due-countdown grammar, late submit |
| 12 | Online exams (student) | student exams | `student/online-exams.tsx` + `[templateId].tsx` | ✓ exam runner | pending answers, offline queue, results |
| 13 | Results / grades (student) | student results | `student/results.tsx` | ✓ | no-grades empty |
| 14 | Library & research | student library | `student/library.tsx`, `student/research.tsx` | ✓ | borrow states, plagiarism states |
| 15 | Teacher dashboard | teacher dashboard | `teacher/(tabs)/dashboard.tsx` | ✓ | needs-grading counters, weekly chart |
| 16 | Attendance (teacher) | teacher attendance | `teacher/attendance.tsx` | ✓ | one-record-per-date law |
| 17 | Grading (teacher) | teacher grades | `teacher/grades.tsx` | ✓ swipe-to-next | draft indicator, validation |
| 18 | Curriculum builder (teacher) | teacher curriculum | `teacher/curriculum.tsx` | ✓ | lecture/chapter/checkpoint sheets |
| 19 | Registrar students & courses | admin students/courses | `admin/(tabs)/students.tsx`, `admin/courses.tsx` | ✓ | search, enroll sheet, delete guards |
| 20 | Quality exam moderation | quality moderation | `quality/exam-moderation.tsx` | ✓ | approve/reject flows with notes |

Cross-cutting parity seats:
- **Tokens**: one source (`shared/design-tokens.json`) — `tokens:check` gates
  drift on both platforms.
- **States**: mobile `states.tsx` (EmptyState rooms, ErrorState, skeletons)
  mirrors the web state vocabulary; every list screen uses the tri-state.
- **Copy**: shared wording lives once on mobile in `src/lib/copy.ts`; the
  copy ratchets (`copy-budget.mjs` web, `copy-budget-mobile.mjs` mobile) keep
  both surfaces on a diet.
- **Roles/permissions**: identical route guards (`RoleGate` ↔ web guards);
  routes/API/logic untouched by this agent.
