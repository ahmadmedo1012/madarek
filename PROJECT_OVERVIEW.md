# Madarek Platform - Project Overview

## Quick Reference

| Aspect | Details |
|--------|---------|
| **Project** | ZU Platform (جامعة الزاوية) |
| **Type** | Arabic-RTL Learning Platform |
| **Stack** | React 18, TypeScript, Vite, Express, Prisma, PostgreSQL |
| **Branch** | `012-design-graphics-uplift` |
| **Active Feature** | Design, Theming & Graphics Uplift — World-Class Tier |

## Architecture

```
zu-platform/
├── frontend/          # React SPA (Vite + React Router + TanStack Query)
├── backend/           # Express API (Prisma + PostgreSQL)
├── specs/             # Feature specifications (001-012)
├── design-system/     # Shared design tokens
└── scripts/           # Validation & maintenance scripts
```

## Database (PostgreSQL via Prisma)

**Core Models**: User, StudentProfile, TeacherProfile, Faculty, Department, Course, CourseOffering, Enrollment
**Academic**: Assignment, Submission, Grade, Attendance, ScheduleSlot, Material
**Social**: Post, Comment, Reaction, StudyRoom, Message, Notification
**Gamification**: Achievement, Skill, Certificate, Badge, PointsLedger
**Content**: Library, MOOC, Jobs, VirtualLab, ARExperience, AiConversation
**Flipped Classroom**: Lecture, LectureChapter, LectureCheckpoint, WatchEvent
**Knowledge Tracing**: KnowledgeConcept, StudentMastery
**Governance**: RolePermission, UserPermission, Capability enum
**Exams**: Question, ExamTemplate, ExamAttempt, ExamAnswer
**Sync**: UniversityFact, SyncRun
**Live**: LiveSession
**Owner**: PlatformSetting, FeatureFlag, AiTelemetry, OperationalAlert, LoginEvent

**New in 012**: User.themePreference, User.onboardingCompletedAt, User.firedMilestones

## Key Documentation Files

- `CLAUDE.md` - Project instructions
- `specs/012-design-graphics-uplift/plan.md` - Implementation plan
- `specs/012-design-graphics-uplift/spec.md` - Feature specification
- `specs/012-design-graphics-uplift/contracts/*.md` - 7 contract documents
- `backend/prisma/schema.prisma` - Database schema
