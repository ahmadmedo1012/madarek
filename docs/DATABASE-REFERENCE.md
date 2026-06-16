# Madarek — Database Reference

**Platform:** PostgreSQL (Neon serverless) via Prisma 5.22
**Models:** 60+ across ~27 domain groups
**Enums:** 20+

---

## Core Identity & Access

### User
The central identity model. Every person is a User with one role.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| email | String | Unique |
| passwordHash | String | Argon2id |
| role | Role enum | STUDENT/TEACHER/ADMIN/QUALITY/OWNER |
| firstName / lastName | String | |
| avatarColor / avatarInitials | String? | Hex color, Arabic initials |
| emailVerifiedAt | DateTime? | |
| isActive | Boolean | Default true |
| tokenVersion | Int | Bump to revoke all refresh tokens |
| failedLoginCount | Int | Lockout at 5 |
| lockedUntil | DateTime? | 15min lock |
| scopeFacultyId | String? | Facility scope for ADMIN/QUALITY |
| themePreference | ThemePreference | LIGHT/DARK/SYSTEM (012 feature) |
| onboardingCompletedAt | DateTime? | (012 feature) |
| firedMilestones | String[] | (012 feature) |

Relations: StudentProfile (1:1), TeacherProfile (1:1), ~30 other relations

### StudentProfile
| Field | Type | Notes |
|-------|------|-------|
| userId | String | PK, FK→User |
| universityId | String | Unique, registration number |
| facultyId | String | FK→Faculty |
| departmentId | String | FK→Department |
| year | Int | Default 1 |
| gpa | Decimal(3,2) | |
| totalXp / level | Int | Gamification |

### TeacherProfile
| Field | Type | Notes |
|-------|------|-------|
| userId | String | PK, FK→User |
| specialty | String | |
| rank | AcademicRank | LECTURER/ASSISTANT_PROFESSOR/ASSOCIATE_PROFESSOR/PROFESSOR |
| departmentId | String | FK→Department |
| degreeLevel | DegreeLevel | BACHELORS/MASTERS/PHD |
| yearsExperience | Int | |
| position | AcademicPosition? | DEAN/ASSOCIATE_DEAN/DEPARTMENT_HEAD |
| positionFacultyId / positionDepartmentId | String? | Leadership scope |
| verifiedAt / verifiedById | DateTime/String? | Verification |

---

## Academic Structure

### Faculty (كلية)
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | Unique with city |
| nameEn | String? | |
| iconEmoji | String? | |
| city | String | Default "الزاوية" |
| departments | Department[] | 1:N |
| **Unique** | [name, city] | Same name can exist in different cities |

### Department (قسم)
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| name | String | Unique within faculty |
| facultyId | String | FK→Faculty |
| courses | Course[] | 1:N |
| **Unique** | [facultyId, name] | |

### Course
| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| code | String | Unique (e.g. "CS101") |
| name / nameEn | String/String? | Arabic/English name |
| credits | Int | Default 3 |
| departmentId | String | FK→Department |

### CourseOffering
A specific instance of a course in a term taught by a teacher.

| Field | Type | Notes |
|-------|------|-------|
| id | String (cuid) | PK |
| courseId | String | FK→Course |
| teacherId | String | FK→User (TeacherOfferings) |
| term | String | e.g. "2024-FALL" |
| room / capacity | String/Int | |
| **Unique** | [courseId, term, teacherId] | |

### Enrollment
| Field | Type | Notes |
|-------|------|-------|
| studentId | String | FK→User |
| offeringId | String | FK→CourseOffering |
| status | String | "active" |
| progressPct | Int | |
| **Unique** | [studentId, offeringId] | |

### ScheduleSlot
| Field | Type | Notes |
|-------|------|-------|
| dayOfWeek | Int | 0=Sunday…6=Saturday |
| startTime / endTime | String | "08:00" format |
| room | String? | |

---

## Flipped Classroom

### Lecture
| Field | Type | Notes |
|-------|------|-------|
| offeringId | String | FK→CourseOffering |
| title | String | |
| ordinal | Int | Ordering |
| durationSec | Int | |
| videoUrl | String | |
| transcriptUrl / posterUrl | String? | |

### LectureChapter
| Field | Type | Notes |
|-------|------|-------|
| lectureId | String | FK→Lecture |
| title | String | |
| startSec / endSec | Int | Time range |
| conceptId | String? | FK→KnowledgeConcept |

### LectureCheckpoint
| Field | Type | Notes |
|-------|------|-------|
| lectureId | String | FK→Lecture |
| triggerSec | Int | Video timestamp |
| question | String | |
| options | Json | Array of choices |
| correctIndex | Int | |

### WatchEvent
| Field | Type | Notes |
|-------|------|-------|
| lectureId | String | FK→Lecture |
| studentId | String | FK→User |
| watchedSec / totalSec | Int | |
| completed | Boolean | Auto-attendance trigger |
| **Unique** | [lectureId, studentId] | |

---

## Educational Matrix (Knowledge Tracing)

### KnowledgeConcept
| Field | Type | Notes |
|-------|------|-------|
| courseId | String | FK→Course |
| name | String | |
| parentId | String? | Self-referencing tree |
| ordinal | Int | |

### StudentMastery
| Field | Type | Notes |
|-------|------|-------|
| studentId | String | FK→User |
| conceptId | String | FK→KnowledgeConcept |
| level | Decimal(4,3) | 0.000 — 1.000 |
| attempts / correct | Int | |
| **Unique** | [studentId, conceptId] | |

---

## Assignments & Submissions

### Assignment
| Field | Type | Notes |
|-------|------|-------|
| offeringId | String | FK→CourseOffering |
| title / description | String/String? | |
| type | AssignmentType | HOMEWORK/QUIZ/PROJECT/EXAM |
| dueAt | DateTime | |
| weight / maxScore | Int | |

### Submission
| Field | Type | Notes |
|-------|------|-------|
| assignmentId | String | FK→Assignment |
| studentId | String | FK→User |
| fileUrl / textAnswer | String? | |
| status | SubmissionStatus | DRAFT/SUBMITTED/GRADED/RETURNED/LATE |
| grade / feedback | Decimal/String? | |
| **Unique** | [assignmentId, studentId] | |

---

## Grades & Attendance

### Grade
| Field | Type | Notes |
|-------|------|-------|
| offeringId / studentId | String | |
| kind | GradeKind | HOMEWORK/QUIZ_1/QUIZ_2/MIDTERM/PROJECT/FINAL |
| score | Decimal(5,2) | |
| weight | Int | |
| **Unique** | [offeringId, studentId, kind] | |

### AttendanceSession
| Field | Type | Notes |
|-------|------|-------|
| offeringId | String | FK→CourseOffering |
| date | DateTime | Unique per offering |
| topic | String? | |

### AttendanceRecord
| Field | Type | Notes |
|-------|------|-------|
| sessionId | String | FK→AttendanceSession |
| studentId | String | FK→User |
| status | AttendanceStatus | PRESENT/LATE/ABSENT/EXCUSED |
| **Unique** | [sessionId, studentId] | |

---

## Research Papers

### ResearchPaper
Full workflow: UPLOADED → SCANNING → CHECKS_PASSED/FAILED → GRADED → PUBLISHED

| Field | Type | Notes |
|-------|------|-------|
| studentId / reviewerId | String | FK→User |
| offeringId | String? | FK→CourseOffering |
| title / abstract | String/String? | |
| fileUrl | String? | |
| status | ResearchPaperStatus | |
| plagiarismPct / aiContentPct | Decimal(4,1)? | Simulated scan |
| grade / feedback | Decimal/String? | |
| extractedText | Text? | For full-text search |

### PaperAnnotation
| Field | Type | Notes |
|-------|------|-------|
| paperId | String | FK→ResearchPaper |
| authorId | String | FK→User |
| page | Int | 1-indexed |
| comment / color | Text/String? | |

---

## Online Exams

### QuestionCategory
| Field | Type | Notes |
|-------|------|-------|
| slug | String | Unique |
| facultyId / departmentId | String? | Scope |
| isShared | Boolean | Cross-faculty visibility |

### Question
| Field | Type | Notes |
|-------|------|-------|
| type | QuestionType | MCQ/TRUE_FALSE/SHORT/ESSAY |
| prompt | Text | |
| choices / correctAnswer | Json? | |
| difficulty | DifficultyLevel | EASY/MEDIUM/HARD |
| points | Int | |
| isApproved | Boolean | Requires moderation |
| authorId / moderatedById | String | FK→User |

### ExamTemplate
| Field | Type | Notes |
|-------|------|-------|
| offeringId / facultyId | String? | Scope |
| title | String | |
| kind | ExamKind | QUIZ/MIDTERM/FINAL/PRACTICE |
| durationMin / passingScore | Int | |
| randomized | Boolean | Default true |
| status | ExamStatus | DRAFT→PENDING_REVIEW→APPROVED/REJECTED→PUBLISHED→CLOSED |
| openAt / closeAt | DateTime? | |

### ExamAttempt
| Field | Type | Notes |
|-------|------|-------|
| templateId | String | FK→ExamTemplate |
| studentId | String | FK→User |
| startedAt / submittedAt / expiresAt | DateTime | |
| status | AttemptStatus | IN_PROGRESS/SUBMITTED/GRADED/EXPIRED |
| score / maxScore | Decimal(6,2) | |

### ExamAnswer
| Field | Type | Notes |
|-------|------|-------|
| attemptId | String | FK→ExamAttempt |
| questionId | String | FK→Question |
| answerText / choiceIndex | String/Int? | |
| isCorrect / awardedPoints | Boolean/Decimal? | |
| **Unique** | [attemptId, questionId] | |

---

## Social & Community

### Post / PostComment / PostReaction
- Posts with hashtags[] and optional imageUrl
- Reactions: "like" or "save" (unique per [postId, userId, kind])

### StudyRoom / StudyRoomMember
- Study rooms with owner + members (composite PK [roomId, userId])

### Announcement
| Field | Type | Notes |
|-------|------|-------|
| scope | AnnouncementScope | PLATFORM/FACULTY/DEPARTMENT/OFFERING |
| scopeId | String? | FK based on scope |
| title / body | String/Text | |
| pinned | Boolean | |
| iconEmoji | String? | |

### Competition / CompetitionEntry
| Field | Type | Notes |
|-------|------|-------|
| status | CompetitionStatus | OPEN/CLOSED/JUDGED |
| deadline | DateTime | |
| category | String | بحث/برمجة/ابتكار/محاضرة/تصميم |

### CampusEvent / EventRSVP
| Field | Type | Notes |
|-------|------|-------|
| location / capacity | String/Int | |
| startsAt / endsAt | DateTime | |
| RSVP: status | RsvpStatus | GOING/MAYBE/NO |

---

## Self-Development (Training)

### TrainingTrack
| Field | Type | Notes |
|-------|------|-------|
| slug | String | Unique |
| title / titleEn | String/String? | |
| category | TrainingTrackCategory | 11 categories |
| level | String | BEGINNER/INTERMEDIATE/ADVANCED |
| iconEmoji / themeColor | String? | |
| estMinutes / pointsAward | Int | |
| order | Int | Sorting |

### TrainingLesson
| Field | Type | Notes |
|-------|------|-------|
| trackId | String | FK→TrainingTrack |
| order | Int | Unique per track |
| contentMarkdown | Text | Lesson body |
| estMinutes / pointsAward | Int | |
| quizQuestion / quizAnswer | String? | |

### TrainingEnrollment
| Field | Type | Notes |
|-------|------|-------|
| **Unique** | [userId, trackId] | |

### LessonProgress
| Field | Type | Notes |
|-------|------|-------|
| **Unique** | [enrollmentId, lessonId] | |

### Badge / UserBadge
| Field | Type | Notes |
|-------|------|-------|
| slug | String | Unique |
| rarity | String | COMMON/RARE/EPIC/LEGENDARY |
| trackId | String? | FK→TrainingTrack |

### PointsLedger
Append-only audit of every point award.

---

## Library & MOOCs & Jobs

### Book / Loan
- Book: title, author, category, totalCopies/availableCopies
- Loan: borrowedAt, dueAt, returnedAt, status (ACTIVE/RETURNED/OVERDUE)

### MoocCourse / MoocEnrollment
- External course catalog with rating, certificates, job-readiness

### Job / JobApplication
- Type: FULL_TIME/PART_TIME/INTERNSHIP/FREELANCE/REMOTE
- Application: APPLIED→REVIEWED→SHORTLISTED→REJECTED→HIRED

---

## Virtual Labs & AR/VR

### VirtualLab / LabSession
- Lab: platform (Cisco Packet Tracer, Arduino Sim...), category
- Session: experimentName, progressPct, score

### ArExperience
- Type: AR/VR, subject, contentUrl

---

## AI Assistant

### AiConversation / AiMessage
- Conversation per user with title
- Messages: role (USER/ASSISTANT/SYSTEM), content, token count

---

## Owner / Platform Operations

### PlatformSetting
- Key-value store with category

### FeatureFlag
| Field | Type | Notes |
|-------|------|-------|
| slug | String | Unique |
| enabled | Boolean | Default true |
| category | String | |

### AiTelemetry
- feature, model, inputTokens/outputTokens, latencyMs, success

### OperationalAlert
- severity, category, title, message, resolvedAt

### LoginEvent
- email, success, ip, userAgent, reason

### AuditLog
- action, resourceType, resourceId, userId, metadata (Json), ip, userAgent

### SyncRun
- source, status (RUNNING/SUCCESS/PARTIAL/FAILED), factsAdded/Updated, errorMsg

### UniversityFact
- Key-value institutional facts (vision, mission, contacts, grade scale, etc.)
- Fields: key (PK), value, category, source, syncedAt, isStale

---

## Enums

| Enum | Values |
|------|--------|
| Role | STUDENT, TEACHER, ADMIN, QUALITY, OWNER |
| AcademicRank | LECTURER, ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, PROFESSOR |
| AcademicPosition | DEAN, ASSOCIATE_DEAN, DEPARTMENT_HEAD |
| AttendanceStatus | PRESENT, LATE, ABSENT, EXCUSED |
| AssignmentType | HOMEWORK, QUIZ, PROJECT, EXAM |
| GradeKind | HOMEWORK, QUIZ_1, QUIZ_2, MIDTERM, PROJECT, FINAL |
| SubmissionStatus | DRAFT, SUBMITTED, GRADED, RETURNED, LATE |
| NotificationType | URGENT, ACADEMIC, SYSTEM, SOCIAL |
| MaterialType | PDF, PPT, VIDEO, DOC, ZIP, IMAGE, OTHER |
| JobType | FULL_TIME, PART_TIME, INTERNSHIP, FREELANCE, REMOTE |
| ResearchPaperStatus | UPLOADED, SCANNING, CHECKS_PASSED, CHECKS_FAILED, GRADED, PUBLISHED |
| QuestionType | MCQ, TRUE_FALSE, SHORT, ESSAY |
| DifficultyLevel | EASY, MEDIUM, HARD |
| ExamKind | QUIZ, MIDTERM, FINAL, PRACTICE |
| ExamStatus | DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED, CLOSED |
| AttemptStatus | IN_PROGRESS, SUBMITTED, GRADED, EXPIRED |
| Capability | 17 values (RESEARCH_*, EXAMS_*, CURRICULUM_*, USERS_*, QUALITY_*, ANNOUNCE_*, COMPETITIONS_*, EVENTS_*) |
| DegreeLevel | BACHELORS, MASTERS, PHD |
| ThemePreference | LIGHT, DARK, SYSTEM |
| TrainingTrackCategory | ONBOARDING, ACADEMIC, FLIPPED, STUDY_SKILLS, RESEARCH, CAREER, COMMUNICATION, ENGLISH, PROGRAMMING, PRODUCTIVITY, VISION |
| LiveSessionStatus | SCHEDULED, LIVE, ENDED, CANCELLED |
| SyncRunStatus | RUNNING, SUCCESS, PARTIAL, FAILED |

## Key Relations

```
User ──1:1── StudentProfile ──N:1── Faculty
User ──1:1── TeacherProfile ──N:1── Department
Faculty ──1:N── Department ──1:N── Course
Course ──1:N── CourseOffering ──1:N── Enrollment
CourseOffering ──1:N── Lecture ──1:N── LectureChapter
CourseOffering ──1:N── Assignment ──1:N── Submission
Lecture ──1:N── WatchEvent ──N:1── User
KnowledgeConcept ──self:N:1── parent (hierarchical tree)
CourseOffering ──1:N── ResearchPaper ──1:N── PaperAnnotation
ExamTemplate ──N:M── Question (via ExamTemplateQuestion)
ExamTemplate ──1:N── ExamAttempt ──1:N── ExamAnswer
TrainingTrack ──1:N── TrainingLesson ──1:N── LessonProgress
User ──N:M── Badge (via UserBadge)
User ──1:N── PointsLedger
```
