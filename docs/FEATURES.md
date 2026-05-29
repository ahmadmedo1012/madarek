# Features — what each does, backing models & pages

Every feature lists its purpose, the Prisma models behind it, and the page route(s).

---

## Roles matrix

| Area | STUDENT | TEACHER | ADMIN | QUALITY | OWNER |
|------|:------:|:------:|:----:|:------:|:----:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Courses / lectures | ✓ | ✓ (manage) | ✓ (CRUD) | – | – |
| Flipped classroom | ✓ | ✓ | – | – | – |
| Educational matrix | ✓ | ✓ (insight) | – | – | – |
| Research workflow | author | review/grade | – | – | – |
| Online exams | take | author | – | moderate | – |
| Attendance / grades | view | manage | – | view | – |
| Quality oversight | – | – | – | ✓ | – |
| Admin (faculties/sync) | – | – | ✓ | – | – |
| Community / social | ✓ | ✓ | ✓ | ✓ | – |
| Platform governance | – | – | – | – | ✓ |

---

## 1. Flipped classroom
Recorded chaptered lectures with embedded checkpoint questions, watch tracking,
and auto‑attendance on full watch.
**Models:** Lecture, LectureChapter, LectureCheckpoint, WatchEvent, AttendanceSession/Record
**Pages:** `/student/lectures/:lectureId`, `/student/courses/:offeringId`

## 2. Educational matrix (knowledge tracing)
Per‑concept mastery over a hierarchical concept tree; gap detection + recommendations.
**Models:** KnowledgeConcept, StudentMastery, LectureCheckpoint
**Pages:** `/student/matrix`

## 3. Research papers workflow + plagiarism/AI scan
Upload → automatic plagiarism % + AI‑content % scan → teacher review with
page‑anchored annotations → publish to library.
**Models:** ResearchPaper, PaperAnnotation
**Pages:** `/student/research`, `/teacher/research`

## 4. Library + cross‑document search
Book catalog, loans, and full‑text search across published papers (title +
abstract + extracted body via pdf‑parse).
**Models:** Book, Loan, ResearchPaper
**Pages:** `/student/library`, `/teacher/library`

## 5. Quality oversight (4th sector)
Read‑only institutional health: per‑course quality, professor performance,
engagement, curriculum review, exam moderation, reports.
**Models:** reads CourseOffering, Grade, AttendanceRecord, Enrollment, ExamTemplate, Question
**Pages:** `/quality/*`

## 6. Admin
Faculty/department/course management, teacher verification, KPI reports, sync.
**Models:** Faculty, Department, Course, TeacherProfile, User, SyncRun, UniversityFact
**Pages:** `/admin/*`

## 7. Smart attendance
Auto‑marks PRESENT when a lecture is fully watched; manual sessions supported.
**Models:** WatchEvent, AttendanceSession, AttendanceRecord
**Pages:** `/teacher/attendance`

## 8. PDF viewer
Page nav, zoom, search, highlight, fullscreen, RTL chrome, paper annotations.
**Models:** ResearchPaper, PaperAnnotation
**Pages:** `/document/:filename` (`PdfViewer`, `AnnotationsPanel`)

## 9. Notifications
Bell badge with real unread count (60 s poll); URGENT/ACADEMIC/SYSTEM/SOCIAL.
**Models:** Notification
**Pages:** `NotificationDropdown`, `/student/alerts`

## 10. Social feed
Posts with hashtags, reactions (like/save), comments; persisted.
**Models:** Post, PostComment, PostReaction
**Pages:** `/student/social`

## 11. University info
Official UoZ data (29 colleges / 9 cities, vision/mission, rankings, contacts).
**Models:** UniversityFact, SyncRun
**Pages:** `/student/university`

## 12. AI assistant (Oasis)
Conversational assistant with stored history + token counting; platform telemetry.
**Models:** AiConversation, AiMessage, AiTelemetry
**Pages:** `/student/ai`, `/teacher/ai`

## 13. Virtual labs
Lab environments (Cisco Packet Tracer, Arduino Sim…) with progress + scoring.
**Models:** VirtualLab, LabSession
**Pages:** `/student/labs`, `/teacher/labs`

## 14. AR/VR experiences
Augmented/virtual reality educational content by subject.
**Models:** ArExperience
**Pages:** `/student/ar`

## 15. Gamification
XP, levels, achievements, badges (4 rarities), skills (1–5), points ledger, leaderboards.
**Models:** Achievement, UserAchievement, Skill, UserSkill, Badge, UserBadge, PointsLedger, StudentProfile
**Pages:** `/student/gamification`, `/student/skills`, `/achievements`

## 16. MOOCs
Curated external course catalog with enrollment, progress, certificate status.
**Models:** MoocCourse, MoocEnrollment
**Pages:** `/student/mooc`

## 17. Jobs
Job board (full/part‑time, internship, freelance, remote) with applications + match scoring.
**Models:** Job, JobApplication
**Pages:** `/student/jobs`

## 18. Webinars
Webinar/seminar listings for academic events.
**Models:** CampusEvent (or external data)
**Pages:** `/student/webinars`

## 19. Online exams
Question bank (MCQ/TF/SHORT/ESSAY) + templates with moderation workflow, timed
attempts, auto‑grading for objective items, manual for essays.
**Models:** QuestionCategory, Question, ExamTemplate, ExamTemplateQuestion, ExamAttempt, ExamAnswer
**Pages:** `/student/online-exams` (+ `/:id`), `/quality/exam-moderation`

## 20. Live broadcast
Teacher‑controlled sessions (SCHEDULED→LIVE→ENDED); external providers; recordings.
**Models:** LiveSession
**Pages:** `/student/live`, `/teacher/live`

## 21. Payments
Student tuition/fees page (UI; no dedicated payment model in schema).
**Pages:** `/student/payment`

## 22. Self‑development (training tracks)
11 categories of markdown lesson paths with quizzes, points, badges, certificates.
**Models:** TrainingTrack, TrainingLesson, TrainingEnrollment, LessonProgress, Badge, UserBadge, Certificate, PointsLedger
**Pages:** `/training`, `/training/:slug`, `/training/:slug/lesson/:lessonId`

## 23. Community hub
Announcements (scoped), competitions, campus events + RSVP, study rooms.
**Models:** Announcement, Competition, CompetitionEntry, CampusEvent, EventRSVP, StudyRoom, StudyRoomMember
**Pages:** `/community` (shared across roles)

## 24. Owner enterprise panel
Super‑admin: realtime monitoring, users, activity, content/branding, settings,
feature flags, AI telemetry, operational alerts, governance.
**Models:** PlatformSetting, FeatureFlag, AiTelemetry, OperationalAlert, LoginEvent, AuditLog
**Pages:** `/owner/*`

## 25. Teacher intelligence
AI‑powered analytics per offering: performance insights, engagement, at‑risk students.
**Models:** reads Enrollment, Grade, WatchEvent, AttendanceRecord, StudentMastery
**Pages:** `/teacher/intelligence` (+ `/:offeringId`)

## 26. Vision gallery
Institutional vision/roadmap showcase for all authenticated users.
**Pages:** `/vision`, `/vision/:slug` (`lib/vision.ts`)

## 27. Campus map
Interactive map of campus locations.
**Pages:** `/student/map`
