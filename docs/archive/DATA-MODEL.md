# Data Model — Prisma schema (`backend/prisma/schema.prisma`)

PostgreSQL (Neon) via Prisma 5.22. 60+ models grouped by domain below. Migrations
are committed and applied with `prisma migrate deploy` during the Render build.

---

## Identity & access
| Model | Purpose |
|-------|---------|
| `User` | Core identity: email, role, auth fields, `tokenVersion` for revocation |
| `StudentProfile` | universityId, faculty, department, year, GPA, XP, level |
| `TeacherProfile` | specialty, academic rank, department, publications, awards, verification |
| `RolePermission` | Default capabilities per role |
| `UserPermission` | Per‑user capability grant/revoke with audit trail |

## Academic structure
| Model | Purpose |
|-------|---------|
| `Faculty` | Top‑level unit (كلية) — 29 across 9 cities |
| `Department` | Sub‑unit of a faculty (قسم) |
| `Course` | Course with code, credits, department link |
| `CourseOffering` | A course instance in a term, taught by a teacher |
| `Enrollment` | Student ↔ offering with progress |
| `ScheduleSlot` | Weekly time slots (day, time, room) |

## Flipped classroom
| Model | Purpose |
|-------|---------|
| `Lecture` | Recorded video lecture (duration, poster, transcript) |
| `LectureChapter` | Chaptered segments linked to knowledge concepts |
| `LectureCheckpoint` | Mid‑video quiz at a timestamp |
| `WatchEvent` | Per‑student watch progress (seconds, completion, replays) |

## Educational matrix (knowledge tracing)
| Model | Purpose |
|-------|---------|
| `KnowledgeConcept` | Hierarchical concept tree per course (self‑referencing) |
| `StudentMastery` | Per‑student per‑concept mastery (0.000–1.000), attempts, correct |

## Materials, assignments, grades, attendance
| Model | Purpose |
|-------|---------|
| `Material` | Uploaded materials (PDF/PPT/VIDEO/DOC) with view/download counts |
| `Assignment` | Homework/quiz/project/exam with due date + weight |
| `Submission` | Student submission with grading workflow |
| `Grade` | Scored record per offering/student/kind |
| `AttendanceSession` | A single attendance event for an offering/date |
| `AttendanceRecord` | Individual status: PRESENT/LATE/ABSENT/EXCUSED |

## Research papers
| Model | Purpose |
|-------|---------|
| `ResearchPaper` | Paper with plagiarism %, AI‑content %, status workflow |
| `PaperAnnotation` | Page‑anchored reviewer comments |

## Online exams
| Model | Purpose |
|-------|---------|
| `QuestionCategory` | Category (faculty/department scoped) |
| `Question` | MCQ / TRUE_FALSE / SHORT / ESSAY with difficulty + approval |
| `ExamTemplate` | Exam definition (kind, duration, passing score, moderation) |
| `ExamTemplateQuestion` | Ordered template ↔ question link |
| `ExamAttempt` | Student session with timing + scoring |
| `ExamAnswer` | Per‑question answer in an attempt |

## Notifications & messaging
| Model | Purpose |
|-------|---------|
| `Notification` | URGENT/ACADEMIC/SYSTEM/SOCIAL with read tracking |
| `Message` | Direct messages between users |

## Social & community
| Model | Purpose |
|-------|---------|
| `Post`, `PostComment`, `PostReaction` | Social feed (hashtags, comments, like/save) |
| `StudyRoom`, `StudyRoomMember` | Collaborative study rooms |
| `Announcement` | Scoped: PLATFORM/FACULTY/DEPARTMENT/OFFERING |
| `Competition`, `CompetitionEntry` | Academic competitions + entries |
| `CampusEvent`, `EventRSVP` | Events with capacity + RSVP |

## Library
| Model | Purpose |
|-------|---------|
| `Book` | Catalog entry with availability |
| `Loan` | Borrowing record with due date + status |

## Gamification & self‑development
| Model | Purpose |
|-------|---------|
| `Achievement`, `UserAchievement` | Unlockable achievements + XP |
| `Skill`, `UserSkill` | Skills with level 1–5 + progress |
| `Certificate` | Earned certificates (issuer, hours, URL) |
| `TrainingTrack`, `TrainingLesson` | Learning paths (11 categories) + markdown lessons |
| `TrainingEnrollment`, `LessonProgress` | Enrollment + completion tracking |
| `Badge`, `UserBadge` | Milestone badges (COMMON/RARE/EPIC/LEGENDARY) |
| `PointsLedger` | Append‑only audit of point awards |

## MOOCs & jobs
| Model | Purpose |
|-------|---------|
| `MoocCourse`, `MoocEnrollment` | External courses + enrollment |
| `Job`, `JobApplication` | Listings + applications with match scoring |

## Virtual labs & AR/VR
| Model | Purpose |
|-------|---------|
| `VirtualLab`, `LabSession` | Lab definitions + student sessions |
| `ArExperience` | AR/VR experiences with content URLs |

## AI assistant
| Model | Purpose |
|-------|---------|
| `AiConversation`, `AiMessage` | Chat threads + messages (USER/ASSISTANT/SYSTEM) with token counts |

## University data & live
| Model | Purpose |
|-------|---------|
| `UniversityFact` | Key‑value institutional facts |
| `SyncRun` | Audit log of sync attempts |
| `LiveSession` | Live broadcasts (SCHEDULED→LIVE→ENDED) |

## Owner / platform operations
| Model | Purpose |
|-------|---------|
| `PlatformSetting` | Key‑value config |
| `FeatureFlag` | Feature toggles with categories |
| `AiTelemetry` | AI usage metrics (tokens, latency, success) |
| `OperationalAlert` | System alerts with severity + resolution |
| `LoginEvent` | Login attempt audit (success/failure, IP, UA) |
| `AuditLog` | General user‑action audit trail |

---

## Key relations
- `User` → one `StudentProfile` **or** `TeacherProfile`.
- `Faculty` → `Department` → `Course` → `CourseOffering` (per term/teacher).
- `CourseOffering` → many: `Enrollment`, `Material`, `Assignment`, `Lecture`,
  `Grade`, `AttendanceSession`, `ResearchPaper`, `ExamTemplate`, `LiveSession`.
- `Lecture` → `LectureChapter` + `LectureCheckpoint` + `WatchEvent`.
- `KnowledgeConcept` → self‑referencing tree; linked from chapters/checkpoints;
  `StudentMastery` links `User` ↔ `KnowledgeConcept`.
- `ResearchPaper` → author (student) + reviewer (professor) + `PaperAnnotation`.
- `ExamTemplate` → `ExamTemplateQuestion` → `Question`; → `ExamAttempt` → `ExamAnswer`.
- `TrainingTrack` → `TrainingLesson` + `TrainingEnrollment` + `Badge` + `Certificate`.

---

## Enums
- **Role:** STUDENT, TEACHER, ADMIN, QUALITY, OWNER
- **Question type:** MCQ, TRUE_FALSE, SHORT, ESSAY
- **Exam kind:** QUIZ, MIDTERM, FINAL, PRACTICE
- **Exam status:** DRAFT → PENDING_REVIEW → APPROVED/REJECTED → PUBLISHED → CLOSED
- **Research status:** UPLOADED → SCANNING → CHECKS_PASSED/FAILED → GRADED → PUBLISHED
- **Training category (11):** ONBOARDING, ACADEMIC, FLIPPED, STUDY_SKILLS, RESEARCH,
  CAREER, COMMUNICATION, ENGLISH, PROGRAMMING, PRODUCTIVITY, VISION
- **Badge rarity:** COMMON, RARE, EPIC, LEGENDARY
- **Attendance status:** PRESENT, LATE, ABSENT, EXCUSED
