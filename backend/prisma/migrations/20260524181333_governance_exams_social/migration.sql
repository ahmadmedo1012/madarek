-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('BACHELORS', 'MASTERS', 'PHD');

-- CreateEnum
CREATE TYPE "Capability" AS ENUM ('RESEARCH_GRADE_OWN', 'RESEARCH_GRADE_ANY', 'RESEARCH_PUBLISH', 'EXAMS_AUTHOR', 'EXAMS_MODERATE', 'EXAMS_TAKE', 'CURRICULUM_EDIT_OWN', 'CURRICULUM_EDIT_ANY', 'USERS_MANAGE', 'ROLES_ASSIGN', 'TEACHERS_VERIFY', 'QUALITY_VIEW', 'QUALITY_REPORT', 'ANNOUNCE_PLATFORM', 'ANNOUNCE_FACULTY', 'COMPETITIONS_RUN', 'EVENTS_RUN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'TRUE_FALSE', 'SHORT', 'ESSAY');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "ExamKind" AS ENUM ('QUIZ', 'MIDTERM', 'FINAL', 'PRACTICE');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED', 'CLOSED');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('PLATFORM', 'FACULTY', 'DEPARTMENT', 'OFFERING');

-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('OPEN', 'CLOSED', 'JUDGED');

-- CreateEnum
CREATE TYPE "RsvpStatus" AS ENUM ('GOING', 'MAYBE', 'NO');

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "certifications" JSONB,
ADD COLUMN     "degreeLevel" "DegreeLevel" NOT NULL DEFAULT 'MASTERS',
ADD COLUMN     "subjectKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verifiedAt" TIMESTAMP(3),
ADD COLUMN     "verifiedById" TEXT,
ADD COLUMN     "yearsExperience" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "RolePermission" (
    "role" "Role" NOT NULL,
    "capability" "Capability" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("role","capability")
);

-- CreateTable
CREATE TABLE "UserPermission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capability" "Capability" NOT NULL,
    "grant" BOOLEAN NOT NULL DEFAULT true,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "grantedById" TEXT,
    "reason" TEXT,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "facultyId" TEXT,
    "departmentId" TEXT,
    "isShared" BOOLEAN NOT NULL DEFAULT false,
    "iconEmoji" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "choices" JSONB,
    "correctAnswer" JSONB,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'MEDIUM',
    "points" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "authorId" TEXT NOT NULL,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "moderatedById" TEXT,
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTemplate" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT,
    "facultyId" TEXT,
    "title" TEXT NOT NULL,
    "kind" "ExamKind" NOT NULL DEFAULT 'QUIZ',
    "description" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 45,
    "passingScore" INTEGER NOT NULL DEFAULT 50,
    "randomized" BOOLEAN NOT NULL DEFAULT true,
    "status" "ExamStatus" NOT NULL DEFAULT 'DRAFT',
    "authorId" TEXT NOT NULL,
    "moderatedById" TEXT,
    "moderationNote" TEXT,
    "openAt" TIMESTAMP(3),
    "closeAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamTemplateQuestion" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "pointsOverride" INTEGER,

    CONSTRAINT "ExamTemplateQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score" DECIMAL(6,2),
    "maxScore" DECIMAL(6,2) NOT NULL,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "choiceIndex" INTEGER,
    "isCorrect" BOOLEAN,
    "awardedPoints" DECIMAL(6,2),
    "feedback" TEXT,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExamAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Announcement" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL,
    "scopeId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "iconEmoji" TEXT,

    CONSTRAINT "Announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Competition" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prize" TEXT,
    "deadline" TIMESTAMP(3) NOT NULL,
    "organizerId" TEXT NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'OPEN',
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Competition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionEntry" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "fileUrl" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" INTEGER,

    CONSTRAINT "CompetitionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampusEvent" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 100,
    "organizerId" TEXT NOT NULL,
    "iconEmoji" TEXT,
    "themeColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRSVP" (
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "RsvpStatus" NOT NULL DEFAULT 'GOING',
    "rsvpedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventRSVP_pkey" PRIMARY KEY ("eventId","userId")
);

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE INDEX "UserPermission_userId_idx" ON "UserPermission"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_capability_key" ON "UserPermission"("userId", "capability");

-- CreateIndex
CREATE UNIQUE INDEX "QuestionCategory_slug_key" ON "QuestionCategory"("slug");

-- CreateIndex
CREATE INDEX "QuestionCategory_facultyId_idx" ON "QuestionCategory"("facultyId");

-- CreateIndex
CREATE INDEX "QuestionCategory_departmentId_idx" ON "QuestionCategory"("departmentId");

-- CreateIndex
CREATE INDEX "Question_categoryId_idx" ON "Question"("categoryId");

-- CreateIndex
CREATE INDEX "Question_authorId_idx" ON "Question"("authorId");

-- CreateIndex
CREATE INDEX "Question_difficulty_idx" ON "Question"("difficulty");

-- CreateIndex
CREATE INDEX "Question_isApproved_idx" ON "Question"("isApproved");

-- CreateIndex
CREATE INDEX "ExamTemplate_offeringId_idx" ON "ExamTemplate"("offeringId");

-- CreateIndex
CREATE INDEX "ExamTemplate_facultyId_idx" ON "ExamTemplate"("facultyId");

-- CreateIndex
CREATE INDEX "ExamTemplate_authorId_idx" ON "ExamTemplate"("authorId");

-- CreateIndex
CREATE INDEX "ExamTemplate_status_idx" ON "ExamTemplate"("status");

-- CreateIndex
CREATE INDEX "ExamTemplateQuestion_templateId_idx" ON "ExamTemplateQuestion"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTemplateQuestion_templateId_questionId_key" ON "ExamTemplateQuestion"("templateId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamTemplateQuestion_templateId_order_key" ON "ExamTemplateQuestion"("templateId", "order");

-- CreateIndex
CREATE INDEX "ExamAttempt_templateId_idx" ON "ExamAttempt"("templateId");

-- CreateIndex
CREATE INDEX "ExamAttempt_studentId_idx" ON "ExamAttempt"("studentId");

-- CreateIndex
CREATE INDEX "ExamAttempt_status_idx" ON "ExamAttempt"("status");

-- CreateIndex
CREATE INDEX "ExamAnswer_attemptId_idx" ON "ExamAnswer"("attemptId");

-- CreateIndex
CREATE UNIQUE INDEX "ExamAnswer_attemptId_questionId_key" ON "ExamAnswer"("attemptId", "questionId");

-- CreateIndex
CREATE INDEX "Announcement_scope_scopeId_idx" ON "Announcement"("scope", "scopeId");

-- CreateIndex
CREATE INDEX "Announcement_publishedAt_idx" ON "Announcement"("publishedAt");

-- CreateIndex
CREATE INDEX "Competition_status_idx" ON "Competition"("status");

-- CreateIndex
CREATE INDEX "Competition_deadline_idx" ON "Competition"("deadline");

-- CreateIndex
CREATE INDEX "CompetitionEntry_competitionId_idx" ON "CompetitionEntry"("competitionId");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionEntry_competitionId_userId_key" ON "CompetitionEntry"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "CampusEvent_startsAt_idx" ON "CampusEvent"("startsAt");

-- CreateIndex
CREATE INDEX "EventRSVP_userId_idx" ON "EventRSVP"("userId");

-- CreateIndex
CREATE INDEX "TeacherProfile_verifiedById_idx" ON "TeacherProfile"("verifiedById");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionCategory" ADD CONSTRAINT "QuestionCategory_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "QuestionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_facultyId_fkey" FOREIGN KEY ("facultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplate" ADD CONSTRAINT "ExamTemplate_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplateQuestion" ADD CONSTRAINT "ExamTemplateQuestion_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExamTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamTemplateQuestion" ADD CONSTRAINT "ExamTemplateQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ExamTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAnswer" ADD CONSTRAINT "ExamAnswer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionEntry" ADD CONSTRAINT "CompetitionEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "CampusEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRSVP" ADD CONSTRAINT "EventRSVP_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
