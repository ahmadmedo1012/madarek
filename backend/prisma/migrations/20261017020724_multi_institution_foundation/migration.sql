-- r178 — multi-institution foundation (Institution + Membership).
--
-- Prisma generated the DDL for the new schema; this file is the SAME DDL
-- (identical constraint/index names — verified drift-free afterwards)
-- re-ordered and interleaved with the data backfill, because Prisma
-- assumes EMPTY tables while the production demo database HAS rows:
--
--   · New NOT NULL columns (Faculty/Course/StudentProfile.institutionId,
--     StudentProfile/TeacherProfile.membershipId, the new profile PK ids)
--     are added NULLABLE first, backfilled, then set NOT NULL.
--   · Membership rows are created for every existing non-OWNER user
--     (public registration only ever produced STUDENT/TEACHER accounts,
--     and the demo admin/quality accounts carry no profile — a profile
--     holder is never an OWNER, so the profile backfill below is safe).
--   · Course.institutionId is derived through the department→faculty
--     chain (the same invariant app code now enforces on every write).
--   · UserPermission/AuditLog institution_id stays NULL — existing
--     grants are platform-global, existing audit rows are platform-scope.
--
-- Fresh/empty databases: every INSERT/UPDATE below is a no-op, and the
-- showcase institution INSERT is guarded with ON CONFLICT (slug) DO
-- NOTHING so re-deploys stay deterministic. The fixed literal id
-- 'inst-zawia-showcase' is referenced by seed.ts and tests.

-- CreateEnum
CREATE TYPE "InstitutionStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "status" "InstitutionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Institution_slug_key" ON "Institution"("slug");

-- CreateIndex
CREATE INDEX "Institution_status_idx" ON "Institution"("status");

-- CreateIndex
CREATE INDEX "Membership_institutionId_role_idx" ON "Membership"("institutionId", "role");

-- CreateIndex
CREATE INDEX "Membership_institutionId_isActive_idx" ON "Membership"("institutionId", "isActive");

-- CreateIndex
CREATE INDEX "Membership_userId_isActive_idx" ON "Membership"("userId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_institutionId_key" ON "Membership"("userId", "institutionId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────
--  Backfill (a): the reference showcase institution. Fixed literal id
--  so the seed and tests can reference it deterministically.
-- ────────────────────────────────────────────────────────────────
INSERT INTO "Institution" ("id", "name", "nameEn", "slug", "status", "createdAt", "updatedAt")
VALUES ('inst-zawia-showcase', 'جامعة الزاوية', 'University of Zawia', 'zawia-showcase', 'ACTIVE', now(), now())
ON CONFLICT ("slug") DO NOTHING;

-- ────────────────────────────────────────────────────────────────
--  Faculty: attach to the showcase institution, then swap the unique
--  (name, city) → (institutionId, name, city) and drop the city default.
-- ────────────────────────────────────────────────────────────────
-- AlterTable
ALTER TABLE "Faculty" ADD COLUMN     "institutionId" TEXT,
ALTER COLUMN "city" DROP DEFAULT;

UPDATE "Faculty" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;

-- AlterTable
ALTER TABLE "Faculty" ALTER COLUMN "institutionId" SET NOT NULL;

-- DropIndex
DROP INDEX "Faculty_name_city_key";

-- CreateIndex
CREATE INDEX "Faculty_institutionId_idx" ON "Faculty"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Faculty_institutionId_name_city_key" ON "Faculty"("institutionId", "name", "city");

-- AddForeignKey
ALTER TABLE "Faculty" ADD CONSTRAINT "Faculty_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────
--  Backfill (c): one Membership per existing non-OWNER user in the
--  showcase institution (OWNER = platform owner, never a member).
--  Existing rows are already unique per user; the NOT EXISTS guard
--  keeps the statement deterministic if ever re-applied manually.
-- ────────────────────────────────────────────────────────────────
INSERT INTO "Membership" ("id", "userId", "institutionId", "role", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, u."id", 'inst-zawia-showcase', u."role", true, now(), now()
FROM "User" u
WHERE u."role" <> 'OWNER'
  AND NOT EXISTS (
    SELECT 1 FROM "Membership" m
    WHERE m."userId" = u."id" AND m."institutionId" = 'inst-zawia-showcase'
  );

-- ────────────────────────────────────────────────────────────────
--  StudentProfile: per-membership restructure — new cuid-style id PK
--  (was: userId PK), institutionId + membershipId backfilled, then
--  universityId unique goes from global to institution-scoped.
-- ────────────────────────────────────────────────────────────────
-- AlterTable (columns first, NULLable — backfill — then NOT NULL)
ALTER TABLE "StudentProfile"
ADD COLUMN     "id" TEXT,
ADD COLUMN     "institutionId" TEXT,
ADD COLUMN     "membershipId" TEXT;

UPDATE "StudentProfile" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;
UPDATE "StudentProfile" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;

UPDATE "StudentProfile" sp
SET "membershipId" = m."id"
FROM "Membership" m
WHERE m."userId" = sp."userId"
  AND m."institutionId" = 'inst-zawia-showcase'
  AND sp."membershipId" IS NULL;

-- AlterTable
ALTER TABLE "StudentProfile"
ALTER COLUMN "id" SET NOT NULL,
ALTER COLUMN "institutionId" SET NOT NULL,
ALTER COLUMN "membershipId" SET NOT NULL,
DROP CONSTRAINT "StudentProfile_pkey",
ADD CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id");

-- DropIndex (global reg-number unique — becomes institution-scoped)
DROP INDEX "StudentProfile_universityId_key";

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_membershipId_key" ON "StudentProfile"("membershipId");

-- CreateIndex
CREATE INDEX "StudentProfile_userId_idx" ON "StudentProfile"("userId");

-- CreateIndex
CREATE INDEX "StudentProfile_institutionId_idx" ON "StudentProfile"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_institutionId_universityId_key" ON "StudentProfile"("institutionId", "universityId");

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────
--  TeacherProfile: per-membership restructure — new id PK +
--  membershipId (institution reached via the membership).
-- ────────────────────────────────────────────────────────────────
-- AlterTable (nullable first, backfill, then NOT NULL + PK swap)
ALTER TABLE "TeacherProfile"
ADD COLUMN     "id" TEXT,
ADD COLUMN     "membershipId" TEXT;

UPDATE "TeacherProfile" SET "id" = gen_random_uuid()::text WHERE "id" IS NULL;

UPDATE "TeacherProfile" tp
SET "membershipId" = m."id"
FROM "Membership" m
WHERE m."userId" = tp."userId"
  AND m."institutionId" = 'inst-zawia-showcase'
  AND tp."membershipId" IS NULL;

-- AlterTable
ALTER TABLE "TeacherProfile"
ALTER COLUMN "id" SET NOT NULL,
ALTER COLUMN "membershipId" SET NOT NULL,
DROP CONSTRAINT "TeacherProfile_pkey",
ADD CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_membershipId_key" ON "TeacherProfile"("membershipId");

-- CreateIndex
CREATE INDEX "TeacherProfile_userId_idx" ON "TeacherProfile"("userId");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "Membership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────
--  Course: institution derived from department→faculty; code unique
--  goes from global to institution-scoped.
-- ────────────────────────────────────────────────────────────────
-- AlterTable
ALTER TABLE "Course" ADD COLUMN     "institutionId" TEXT;

UPDATE "Course" c
SET "institutionId" = f."institutionId"
FROM "Department" d
JOIN "Faculty" f ON d."facultyId" = f."id"
WHERE c."departmentId" = d."id"
  AND c."institutionId" IS NULL;

-- Safety net: any course whose department chain is missing still lands
-- in the showcase institution (departmentId is NOT NULL, so this only
-- guards against corrupted chains).
UPDATE "Course" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;

-- AlterTable
ALTER TABLE "Course" ALTER COLUMN "institutionId" SET NOT NULL;

-- DropIndex
DROP INDEX "Course_code_key";

-- CreateIndex
CREATE INDEX "Course_institutionId_idx" ON "Course"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "Course_institutionId_code_key" ON "Course"("institutionId", "code");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────
--  UserPermission: nullable institutionId (NULL = platform-global
--  grant). Existing grants keep NULL — preserved as global grants.
-- ────────────────────────────────────────────────────────────────
-- AlterTable
ALTER TABLE "UserPermission" ADD COLUMN     "institutionId" TEXT;

-- DropIndex
DROP INDEX "UserPermission_userId_capability_key";

-- CreateIndex
CREATE UNIQUE INDEX "UserPermission_userId_capability_institutionId_key" ON "UserPermission"("userId", "capability", "institutionId");

-- AddForeignKey
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ────────────────────────────────────────────────────────────────
--  AuditLog: nullable institutionId (NULL = platform-scope entry).
--  Existing rows keep NULL.
-- ────────────────────────────────────────────────────────────────
-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "institutionId" TEXT;

-- CreateIndex
CREATE INDEX "AuditLog_institutionId_idx" ON "AuditLog"("institutionId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
