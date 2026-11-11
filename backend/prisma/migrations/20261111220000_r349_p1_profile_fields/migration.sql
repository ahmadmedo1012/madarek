-- r349 LANE P1 — الحقول المرنة للملف الليبي (PROFILES-RESEARCH.md §5).
-- Additive + nullable-first: لا حذف، لا rename، لا NOT NULL جديدة على
-- صفوف قائمة؛ أعمدة الظهور لها افتراض غير فارغ (قيمة جديدة فقط).

-- CreateEnum
CREATE TYPE "StudyType" AS ENUM ('MORNING', 'EVENING', 'PARALLEL');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEFERRED', 'GRADUATED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "PhoneVisibility" AS ENUM ('INSTITUTION_STAFF', 'PRIVATE');

-- CreateEnum
CREATE TYPE "PreferredContact" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL', 'OFFICE_HOURS');

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "grandfatherName" TEXT,
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "birthPlace" TEXT,
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "nationalIdHash" TEXT,
ADD COLUMN     "studyType" "StudyType",
ADD COLUMN     "enrollmentStatus" "EnrollmentStatus",
ADD COLUMN     "secondarySchool" TEXT,
ADD COLUMN     "secondarySchoolBranch" TEXT,
ADD COLUMN     "secondarySchoolPercent" DECIMAL(5,2),
ADD COLUMN     "admissionYear" INTEGER,
ADD COLUMN     "studentPhoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'INSTITUTION_STAFF',
ADD COLUMN     "guardianPhoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'INSTITUTION_STAFF';

-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "preferredContact" "PreferredContact",
ADD COLUMN     "personalPhoneVisibility" "PhoneVisibility" NOT NULL DEFAULT 'INSTITUTION_STAFF';

-- CreateIndex
CREATE INDEX "StudentProfile_nationalIdHash_idx" ON "StudentProfile"("nationalIdHash");
