-- CreateEnum
CREATE TYPE "AcademicPosition" AS ENUM ('DEAN', 'ASSOCIATE_DEAN', 'DEPARTMENT_HEAD');

-- AlterTable: User governance scope (NULL = university-wide; set = scoped to that faculty)
ALTER TABLE "User" ADD COLUMN "scopeFacultyId" TEXT;

-- AlterTable: TeacherProfile leadership appointment (layered on top of teaching role)
ALTER TABLE "TeacherProfile" ADD COLUMN "position" "AcademicPosition",
ADD COLUMN "positionFacultyId" TEXT,
ADD COLUMN "positionDepartmentId" TEXT,
ADD COLUMN "appointedAt" TIMESTAMP(3),
ADD COLUMN "termEndsAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "User_scopeFacultyId_idx" ON "User"("scopeFacultyId");

-- CreateIndex
CREATE INDEX "TeacherProfile_positionFacultyId_idx" ON "TeacherProfile"("positionFacultyId");

-- CreateIndex
CREATE INDEX "TeacherProfile_positionDepartmentId_idx" ON "TeacherProfile"("positionDepartmentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_scopeFacultyId_fkey" FOREIGN KEY ("scopeFacultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_positionFacultyId_fkey" FOREIGN KEY ("positionFacultyId") REFERENCES "Faculty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_positionDepartmentId_fkey" FOREIGN KEY ("positionDepartmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
