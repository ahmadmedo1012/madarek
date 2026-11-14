-- R352 K1 — the production repair baseline.
--
-- History: the production database (ep-icy-mode/neondb — the owner's
-- original, confirmed by the r352 identity evidence) carried a FOREIGN
-- migration row (0001_ulara_baseline, written 2026-11-13 by the other
-- app sharing this Neon account) instead of Madarek's 43-migration
-- history, and its schema was stale somewhere before r349_p1
-- (missing: the r349 profile fields, the r350 mail outbox +
-- verification preferences + import rollback columns, the r351
-- tick/rate-limit/import-upload tables). Every deploy since the X4
-- cutover ran new code against that old schema — the live errors were
-- `RateLimitHit does not exist` (rate limiting failed OPEN) and
-- `TickRun does not exist` (every tick claim failed).
--
-- The repair: this migration is the `prisma migrate diff` from the
-- LIVE database state to the current schema — reviewed line by line:
--  · 12 CREATE TABLEs (ImportJob family, MailOutbox, MailSuppression,
--    TickRun, RateLimitHit, ImportUpload, EmailVerificationToken,
--    FieldValue, InstitutionFieldDefinition, NotificationPreference)
--  · additive ADD COLUMNs (StudentProfile/TeacherProfile/Institution —
--    phones, DOB, photo keys, contact preferences)
--  · enum creations + FKs + indexes
--  · the ONLY destructive lines: DROP TABLE SyncRun (5 rows, the dead
--    pre-tick sync system) + DROP TABLE UniversityFact (33 rows, the
--    deleted-for-good 25-universities feature) + their enum/constraints.
--    Both tables are absent from the schema since their removal rounds
--    and their data was exported to docs/redesign/r352/backups/ before
--    this migration ran.
--
-- The baselining that ships with it (see the r352 RESUME): all 43
-- prior migrations are marked applied via `prisma migrate resolve`,
-- so this file is the single source of the catch-up DDL and the
-- history is clean going forward.
-- CONDITIONAL BODY (r352 follow-up): this migration already ran
-- against production (recorded 2026-11-14). On any database where the
-- regular 43-migration history ran normally, it must be a NO-OP — the
-- prod-broken state uniquely still had the dead SyncRun table (dropped
-- by 20261111080000_r349_u_neutral_tenant everywhere else) AND lacked
-- the ImportJob family this repair creates. Fresh databases (CI's
-- disposable Postgres, future environments) skip the body entirely.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'SyncRun')
     AND NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ImportJob')
  THEN
-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEFERRED', 'GRADUATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "FieldEntity" AS ENUM ('STUDENT', 'TEACHER', 'STAFF');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'MAPPED', 'VALIDATED', 'COMMITTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'OK', 'SKIPPED', 'ERROR');

-- CreateEnum
CREATE TYPE "InstitutionKind" AS ENUM ('SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER', 'OTHER');

-- CreateEnum
CREATE TYPE "MailOutboxStatus" AS ENUM ('queued', 'sending', 'sent', 'failed', 'suppressed');

-- CreateEnum
CREATE TYPE "PhoneVisibility" AS ENUM ('INSTITUTION_STAFF', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PreferredContact" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL', 'OFFICE_HOURS');

-- CreateEnum
CREATE TYPE "StudyType" AS ENUM ('MORNING', 'EVENING', 'PARALLEL');

-- DropForeignKey
ALTER TABLE "SyncRun" DROP CONSTRAINT "SyncRun_institutionId_fkey";

-- DropForeignKey
ALTER TABLE "UniversityFact" DROP CONSTRAINT "UniversityFact_institutionId_fkey";

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "academicConfig" JSONB,
ADD COLUMN     "kind" "InstitutionKind";

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "additionalPhone" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "admissionYear" INTEGER,
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "enrollmentStatus" "EnrollmentStatus",
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "grandfatherName" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "guardianPhoneNormalized" TEXT,
ADD COLUMN     "guardianPhoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'INSTITUTION_STAFF',
ADD COLUMN     "guardianRelationship" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "nationalIdHash" TEXT,
ADD COLUMN     "previousSchool" TEXT,
ADD COLUMN     "profileImageUrl" TEXT,
ADD COLUMN     "secondarySchool" TEXT,
ADD COLUMN     "secondarySchoolBranch" TEXT,
ADD COLUMN     "secondarySchoolPercent" DECIMAL(5,2),
ADD COLUMN     "section" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "studentPhone" TEXT,
ADD COLUMN     "studentPhoneNormalized" TEXT,
ADD COLUMN     "studentPhoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'INSTITUTION_STAFF',
ADD COLUMN     "studyType" "StudyType",
ADD COLUMN     "transferStatus" TEXT;

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "officialEmail" TEXT,
ADD COLUMN     "officialPhone" TEXT,
ADD COLUMN     "personalPhone" TEXT,
ADD COLUMN     "personalPhoneNormalized" TEXT,
ADD COLUMN     "personalPhoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'INSTITUTION_STAFF',
ADD COLUMN     "preferredContact" "PreferredContact";

-- DropTable
DROP TABLE "SyncRun";

-- DropTable
DROP TABLE "UniversityFact";

-- DropEnum
DROP TYPE "SyncRunStatus";

-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldValue" (
    "id" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "studentProfileId" TEXT,
    "teacherProfileId" TEXT,
    "valueText" TEXT,
    "valueNumber" DECIMAL(65,30),
    "valueDate" TIMESTAMP(3),
    "valueBoolean" BOOLEAN,
    "valueSelect" TEXT,
    "valueMultiSelect" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "FieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "entity" "FieldEntity" NOT NULL,
    "fileName" TEXT NOT NULL,
    "format" "ImportFormat" NOT NULL,
    "status" "ImportJobStatus" NOT NULL DEFAULT 'UPLOADED',
    "totalRows" INTEGER NOT NULL,
    "processedRows" INTEGER NOT NULL DEFAULT 0,
    "succeededRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "failedRows" INTEGER NOT NULL DEFAULT 0,
    "columnMap" JSONB,
    "summary" JSONB,
    "error" JSONB,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rolledBackAt" TIMESTAMP(3),
    "rollbackSummary" JSONB,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportMappingProfile" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entity" "FieldEntity" NOT NULL,
    "profile" JSONB NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportMappingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "line" INTEGER NOT NULL,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'PENDING',
    "rawData" JSONB NOT NULL,
    "mappedData" JSONB,
    "errorAr" TEXT,
    "resultRef" TEXT,
    "action" TEXT,
    "before" JSONB,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportUpload" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mintedBy" TEXT NOT NULL,
    "institutionId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstitutionFieldDefinition" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "labelAr" TEXT NOT NULL,
    "labelEn" TEXT NOT NULL,
    "entity" "FieldEntity" NOT NULL,
    "type" "FieldType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT false,
    "options" JSONB,
    "validation" JSONB,
    "visibleTo" JSONB,
    "searchable" BOOLEAN NOT NULL DEFAULT false,
    "importKeyAr" TEXT,
    "importKeyEn" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstitutionFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailOutbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" "MailOutboxStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "provider" TEXT,
    "providerId" TEXT,
    "lastError" TEXT,
    "dedupeKey" TEXT,
    "institutionId" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MailSuppression" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "suppressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MailSuppression_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitHit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "TickRun" (
    "key" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDurationMs" INTEGER,
    "lastSummary" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TickRun_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash" ASC);

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_definitionId_studentProfileId_key" ON "FieldValue"("definitionId" ASC, "studentProfileId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_definitionId_teacherProfileId_key" ON "FieldValue"("definitionId" ASC, "teacherProfileId" ASC);

-- CreateIndex
CREATE INDEX "FieldValue_studentProfileId_idx" ON "FieldValue"("studentProfileId" ASC);

-- CreateIndex
CREATE INDEX "FieldValue_teacherProfileId_idx" ON "FieldValue"("teacherProfileId" ASC);

-- CreateIndex
CREATE INDEX "ImportJob_createdByUserId_createdAt_idx" ON "ImportJob"("createdByUserId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_idempotencyKey_key" ON "ImportJob"("idempotencyKey" ASC);

-- CreateIndex
CREATE INDEX "ImportJob_institutionId_status_idx" ON "ImportJob"("institutionId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "ImportMappingProfile_institutionId_entity_idx" ON "ImportMappingProfile"("institutionId" ASC, "entity" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ImportMappingProfile_institutionId_name_key" ON "ImportMappingProfile"("institutionId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "ImportRow_jobId_action_idx" ON "ImportRow"("jobId" ASC, "action" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_jobId_line_key" ON "ImportRow"("jobId" ASC, "line" ASC);

-- CreateIndex
CREATE INDEX "ImportRow_jobId_status_idx" ON "ImportRow"("jobId" ASC, "status" ASC);

-- CreateIndex
CREATE INDEX "ImportUpload_createdAt_idx" ON "ImportUpload"("createdAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ImportUpload_key_key" ON "ImportUpload"("key" ASC);

-- CreateIndex
CREATE INDEX "InstitutionFieldDefinition_institutionId_entity_idx" ON "InstitutionFieldDefinition"("institutionId" ASC, "entity" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionFieldDefinition_institutionId_entity_sortOrder_key" ON "InstitutionFieldDefinition"("institutionId" ASC, "entity" ASC, "sortOrder" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionFieldDefinition_institutionId_key_key" ON "InstitutionFieldDefinition"("institutionId" ASC, "key" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MailOutbox_dedupeKey_key" ON "MailOutbox"("dedupeKey" ASC);

-- CreateIndex
CREATE INDEX "MailOutbox_institutionId_createdAt_idx" ON "MailOutbox"("institutionId" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MailOutbox_status_nextAttemptAt_idx" ON "MailOutbox"("status" ASC, "nextAttemptAt" ASC);

-- CreateIndex
CREATE INDEX "MailOutbox_to_createdAt_idx" ON "MailOutbox"("to" ASC, "createdAt" ASC);

-- CreateIndex
CREATE INDEX "MailSuppression_email_idx" ON "MailSuppression"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MailSuppression_email_type_key" ON "MailSuppression"("email" ASC, "type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "RateLimitHit_updatedAt_idx" ON "RateLimitHit"("updatedAt" ASC);

-- CreateIndex
CREATE INDEX "Announcement_title_trgm_idx" ON "Announcement" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Book_author_trgm_idx" ON "Book" USING GIN ("author" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Book_title_trgm_idx" ON "Book" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "CampusEvent_title_trgm_idx" ON "CampusEvent" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Course_code_trgm_idx" ON "Course" USING GIN ("code" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Course_name_trgm_idx" ON "Course" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Department_name_trgm_idx" ON "Department" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Faculty_name_trgm_idx" ON "Faculty" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Institution_name_trgm_idx" ON "Institution" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Job_company_trgm_idx" ON "Job" USING GIN ("company" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Job_title_trgm_idx" ON "Job" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Lecture_title_trgm_idx" ON "Lecture" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Material_name_trgm_idx" ON "Material" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "Question_prompt_trgm_idx" ON "Question" USING GIN ("prompt" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "ResearchPaper_title_trgm_idx" ON "ResearchPaper" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "StudentProfile_guardianPhoneNormalized_trgm_idx" ON "StudentProfile" USING GIN ("guardianPhoneNormalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "StudentProfile_nationalIdHash_idx" ON "StudentProfile"("nationalIdHash" ASC);

-- CreateIndex
CREATE INDEX "StudentProfile_studentPhoneNormalized_idx" ON "StudentProfile"("studentPhoneNormalized" ASC);

-- CreateIndex
CREATE INDEX "StudentProfile_studentPhoneNormalized_trgm_idx" ON "StudentProfile" USING GIN ("studentPhoneNormalized" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "TeacherProfile_employeeId_idx" ON "TeacherProfile"("employeeId" ASC);

-- CreateIndex
CREATE INDEX "TrainingTrack_titleEn_trgm_idx" ON "TrainingTrack" USING GIN ("titleEn" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "TrainingTrack_title_trgm_idx" ON "TrainingTrack" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_firstName_trgm_idx" ON "User" USING GIN ("firstName" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "User_lastName_trgm_idx" ON "User" USING GIN ("lastName" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "InstitutionFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMappingProfile" ADD CONSTRAINT "ImportMappingProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMappingProfile" ADD CONSTRAINT "ImportMappingProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstitutionFieldDefinition" ADD CONSTRAINT "InstitutionFieldDefinition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

  END IF;
END $$;
