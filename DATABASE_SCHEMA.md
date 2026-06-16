# Database Schema Reference

## Enums (Prisma)

### Role
- STUDENT, TEACHER, ADMIN, QUALITY, OWNER

### AcademicRank
- LECTURER, ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, PROFESSOR

### AcademicPosition
- DEAN, ASSOCIATE_DEAN, DEPARTMENT_HEAD

### AttendanceStatus
- PRESENT, LATE, ABSENT, EXCUSED

### AssignmentType
- HOMEWORK, QUIZ, PROJECT, EXAM

### GradeKind
- HOMEWORK, QUIZ_1, QUIZ_2, MIDTERM, PROJECT, FINAL

### SubmissionStatus
- DRAFT, SUBMITTED, GRADED, RETURNED, LATE

### NotificationType
- URGENT, ACADEMIC, SYSTEM, SOCIAL

### MaterialType
- PDF, PPT, VIDEO, DOC, ZIP, IMAGE, OTHER

### JobType
- FULL_TIME, PART_TIME, INTERNSHIP, FREELANCE, REMOTE

### JobApplicationStatus
- APPLIED, REVIEWED, SHORTLISTED, REJECTED, HIRED

### CertificateStatus
- ONGOING, COMPLETED, EXPIRED

### LoanStatus
- ACTIVE, RETURNED, OVERDUE

### ArExperienceType
- AR, VR

### AiMessageRole
- USER, ASSISTANT, SYSTEM

### DegreeLevel
- BACHELORS, MASTERS, PHD

### Capability (16 total)
- RESEARCH_GRADE_OWN, RESEARCH_GRADE_ANY, RESEARCH_PUBLISH
- EXAMS_AUTHOR, EXAMS_MODERATE, EXAMS_TAKE
- CURRICULUM_EDIT_OWN, CURRICULUM_EDIT_ANY
- USERS_MANAGE, ROLES_ASSIGN, TEACHERS_VERIFY
- QUALITY_VIEW, QUALITY_REPORT
- ANNOUNCE_PLATFORM, ANNOUNCE_FACULTY, COMPETITIONS_RUN, EVENTS_RUN

### QuestionType
- MCQ, TRUE_FALSE, SHORT, ESSAY

### DifficultyLevel
- EASY, MEDIUM, HARD

### ExamKind
- QUIZ, MIDTERM, FINAL, PRACTICE

### ExamStatus
- DRAFT, PENDING_REVIEW, APPROVED, REJECTED, PUBLISHED, CLOSED

### AttemptStatus
- IN_PROGRESS, SUBMITTED, GRADED, EXPIRED

### AnnouncementScope
- PLATFORM, FACULTY, DEPARTMENT, OFFERING

### CompetitionStatus
- OPEN, CLOSED, JUDGED

### RsvpStatus
- GOING, MAYBE, NO

### ThemePreference (012)
- LIGHT, DARK, SYSTEM

### ResearchPaperStatus
- UPLOADED, SCANNING, CHECKS_PASSED, CHECKS_FAILED, GRADED, PUBLISHED

### TrainingTrackCategory
- ONBOARDING, ACADEMIC, FLIPPED, STUDY_SKILLS, RESEARCH, CAREER, COMMUNICATION, ENGLISH, PROGRAMMING, PRODUCTIVITY, VISION

### SyncRunStatus
- RUNNING, SUCCESS, PARTIAL, FAILED

### LiveSessionStatus
- SCHEDULED, LIVE, ENDED, CANCELLED

## Core Models

### User
- id, email, passwordHash, role, firstName, lastName
- avatarColor, avatarInitials, emailVerifiedAt, isActive
- tokenVersion, failedLoginCount, lockedUntil
- scopeFacultyId (governance scope)
- **012 additions**: themePreference, themePreferenceUpdatedAt, onboardingCompletedAt, firedMilestones
- Relations: studentProfile, teacherProfile, enrollments, taughtOfferings, submissions, grades, attendanceRecords, materials, notifications, messages, posts, comments, reactions, studyRooms, loans, moocEnrollments, jobApplications, achievements, skills, certificates, labSessions, aiConversations, auditLogs, watchEvents, masteries, researchPapers, paperAnnotations, trainingEnrollments, badges, pointsLedger, permissionGrants, permissionGrantedBy, verifiedTeachers, authoredQuestions, moderatedQuestions, authoredExams, moderatedExams, examAttempts, liveSessions, announcements, competitionsRun, competitionEntries, eventsRun, eventRsvps

### StudentProfile
- userId (PK), universityId, facultyId, departmentId, year, gpa, totalXp, level

### TeacherProfile
- userId (PK), specialty, rank, departmentId, bio
- degreeLevel, yearsExperience, certifications, publications, awards
- profileImageUrl, officeLocation, officeHours, websiteUrl, subjectKeywords
- verifiedAt, verifiedById, position, positionFacultyId, positionDepartmentId

### Faculty
- id, name, nameEn, iconEmoji, city
- Relations: departments, students, questionCategories, examTemplates, scopedAdmins, leadership

### Department
- id, name, nameEn, facultyId
- Relations: courses, students, teachers, questionCategories, leadership

### Course
- id, code (unique), name, nameEn, description, credits, iconEmoji, themeColor, departmentId

### CourseOffering
- id, courseId, teacherId, term, room, capacity
- Unique: [courseId, term, teacherId]
- Relations: enrollments, schedule, materials, assignments, attendance, grades, lectures, researchPapers, examTemplates, liveSessions

### Enrollment
- id, studentId, offeringId, status, progressPct
- Unique: [studentId, offeringId]

## Academic Models

### Assignment
- id, offeringId, title, description, type, dueAt, weight, maxScore

### Submission
- id, assignmentId, studentId, fileUrl, textAnswer, status, grade, feedback

### Grade
- id, offeringId, studentId, kind, score, maxScore, weight, feedback
- Unique: [offeringId, studentId, kind]

### AttendanceSession
- id, offeringId, date, topic

### AttendanceRecord
- id, sessionId, studentId, status, notes
- Unique: [sessionId, studentId]

### Material
- id, offeringId, uploaderId, name, description, type, sizeBytes, url

### ScheduleSlot
- id, offeringId, dayOfWeek, startTime, endTime, room

## Social Models

### Notification
- id, userId, type, icon, title, body, link, readAt

### Message
- id, fromUserId, toUserId, body, readAt

### Post / PostComment / PostReaction
- Standard social models with hashtags, images, reactions

### StudyRoom / StudyRoomMember
- Collaborative study spaces

## Gamification

### Achievement / UserAchievement
- XP-based achievements with codes

### Skill / UserSkill
- Skills with 1-5 levels and progress

### Certificate
- External certificates with track linkage

### Badge / UserBadge
- Visual milestones with rarity (COMMON/RARE/EPIC/LEGENDARY)

### PointsLedger
- Append-only audit of point awards

## Content & External

### MoocCourse / MoocEnrollment
- External course integrations

### Job / JobApplication
- Job board with matching scores

### VirtualLab / LabSession
- Virtual lab platforms

### ArExperience
- AR/VR experiences

### AiConversation / AiMessage
- AI chat history with token tracking

## Flipped Classroom

### Lecture
- id, offeringId, title, ordinal, durationSec, videoUrl, posterUrl, transcriptUrl

### LectureChapter
- id, lectureId, title, startSec, endSec, ordinal, conceptId

### LectureCheckpoint
- id, lectureId, conceptId, triggerSec, question, options, correctIndex, explanation

### WatchEvent
- id, lectureId, studentId, watchedSec, totalSec, completed, replays
- Unique: [lectureId, studentId]

## Knowledge Tracing

### KnowledgeConcept
- Hierarchical concepts per course

### StudentMastery
- id, studentId, conceptId, level (0-1), attempts, correct

## Research

### ResearchPaper
- Student papers with plagiarism/AI detection

### PaperAnnotation
- Page-anchored inline feedback

## Training (Self-Development)

### TrainingTrack / TrainingLesson / TrainingEnrollment / LessonProgress
- Structured learning paths

## Governance

### RolePermission / UserPermission
- Two-layer capability system

## Exams

### QuestionCategory / Question
- Question bank with moderation

### ExamTemplate / ExamTemplateQuestion / ExamAttempt / ExamAnswer
- Full exam lifecycle

## Community

### Announcement / Competition / CompetitionEntry / CampusEvent / EventRSVP
- Platform-wide social features

## Sync

### UniversityFact / SyncRun
- Daily sync from zu.edu.ly

## Live Streaming

### LiveSession
- Teacher-controlled live sessions

## Owner Enterprise

### PlatformSetting / FeatureFlag / AiTelemetry / OperationalAlert / LoginEvent
- Platform governance and telemetry

## Indexes
- All foreign keys indexed
- Composite unique constraints on business keys
- Query-optimized indexes on status, date, userId columns
