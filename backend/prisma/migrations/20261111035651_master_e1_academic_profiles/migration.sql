-- CreateEnum
CREATE TYPE "InstitutionKind" AS ENUM ('SCHOOL', 'UNIVERSITY', 'COLLEGE', 'TRAINING_CENTER', 'OTHER');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "FieldEntity" AS ENUM ('STUDENT', 'TEACHER', 'STAFF');

-- CreateEnum
CREATE TYPE "FieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT');

-- AlterTable
ALTER TABLE "Institution" ADD COLUMN     "academicConfig" JSONB,
ADD COLUMN     "kind" "InstitutionKind";

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "additionalPhone" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "emergencyContactName" TEXT,
ADD COLUMN     "emergencyContactPhone" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "grade" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "guardianPhoneNormalized" TEXT,
ADD COLUMN     "guardianRelationship" TEXT,
ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "previousSchool" TEXT,
ADD COLUMN     "profileImageUrl" TEXT,
ADD COLUMN     "section" TEXT,
ADD COLUMN     "stage" TEXT,
ADD COLUMN     "studentPhone" TEXT,
ADD COLUMN     "studentPhoneNormalized" TEXT,
ADD COLUMN     "transferStatus" TEXT;

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "employeeId" TEXT,
ADD COLUMN     "nameAr" TEXT,
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "officialEmail" TEXT,
ADD COLUMN     "officialPhone" TEXT,
ADD COLUMN     "personalPhone" TEXT,
ADD COLUMN     "personalPhoneNormalized" TEXT;

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

-- CreateIndex
CREATE INDEX "InstitutionFieldDefinition_institutionId_entity_idx" ON "InstitutionFieldDefinition"("institutionId", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionFieldDefinition_institutionId_key_key" ON "InstitutionFieldDefinition"("institutionId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "InstitutionFieldDefinition_institutionId_entity_sortOrder_key" ON "InstitutionFieldDefinition"("institutionId", "entity", "sortOrder");

-- CreateIndex
CREATE INDEX "FieldValue_studentProfileId_idx" ON "FieldValue"("studentProfileId");

-- CreateIndex
CREATE INDEX "FieldValue_teacherProfileId_idx" ON "FieldValue"("teacherProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_definitionId_studentProfileId_key" ON "FieldValue"("definitionId", "studentProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "FieldValue_definitionId_teacherProfileId_key" ON "FieldValue"("definitionId", "teacherProfileId");

-- CreateIndex
CREATE INDEX "StudentProfile_studentPhoneNormalized_idx" ON "StudentProfile"("studentPhoneNormalized");

-- CreateIndex
CREATE INDEX "TeacherProfile_employeeId_idx" ON "TeacherProfile"("employeeId");

-- AddForeignKey
ALTER TABLE "InstitutionFieldDefinition" ADD CONSTRAINT "InstitutionFieldDefinition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "InstitutionFieldDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldValue" ADD CONSTRAINT "FieldValue_teacherProfileId_fkey" FOREIGN KEY ("teacherProfileId") REFERENCES "TeacherProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- master-E1 guard (r324/r326 lesson): the GIN trigram index is raw SQL
-- (not expressible in the Prisma schema DSL), so schema diffs try to
-- drop it. This migration is ADDITIVE ONLY (school/university duality
-- — no existing column, enum, or index is ever renamed, retyped, or
-- dropped); never ship that drop — re-assert the index idempotently.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_content_trgm_idx"
    ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);
