-- CreateEnum
CREATE TYPE "ResearchPaperStatus" AS ENUM ('UPLOADED', 'SCANNING', 'CHECKS_PASSED', 'CHECKS_FAILED', 'GRADED', 'PUBLISHED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'QUALITY';

-- CreateTable
CREATE TABLE "Lecture" (
    "id" TEXT NOT NULL,
    "offeringId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "durationSec" INTEGER NOT NULL DEFAULT 0,
    "videoUrl" TEXT NOT NULL,
    "posterUrl" TEXT,
    "transcriptUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lecture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureChapter" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startSec" INTEGER NOT NULL,
    "endSec" INTEGER NOT NULL,
    "ordinal" INTEGER NOT NULL DEFAULT 0,
    "conceptId" TEXT,

    CONSTRAINT "LectureChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LectureCheckpoint" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "conceptId" TEXT,
    "triggerSec" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,

    CONSTRAINT "LectureCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchEvent" (
    "id" TEXT NOT NULL,
    "lectureId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "watchedSec" INTEGER NOT NULL,
    "totalSec" INTEGER NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "replays" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeConcept" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "ordinal" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "KnowledgeConcept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentMastery" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "level" DECIMAL(4,3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "lastUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentMastery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchPaper" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "reviewerId" TEXT,
    "offeringId" TEXT,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "fileUrl" TEXT,
    "status" "ResearchPaperStatus" NOT NULL DEFAULT 'UPLOADED',
    "plagiarismPct" DECIMAL(4,1),
    "aiContentPct" DECIMAL(4,1),
    "grade" DECIMAL(4,1),
    "feedback" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scannedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ResearchPaper_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lecture_offeringId_idx" ON "Lecture"("offeringId");

-- CreateIndex
CREATE INDEX "Lecture_ordinal_idx" ON "Lecture"("ordinal");

-- CreateIndex
CREATE INDEX "LectureChapter_lectureId_idx" ON "LectureChapter"("lectureId");

-- CreateIndex
CREATE INDEX "LectureCheckpoint_lectureId_idx" ON "LectureCheckpoint"("lectureId");

-- CreateIndex
CREATE INDEX "WatchEvent_studentId_idx" ON "WatchEvent"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "WatchEvent_lectureId_studentId_key" ON "WatchEvent"("lectureId", "studentId");

-- CreateIndex
CREATE INDEX "KnowledgeConcept_courseId_idx" ON "KnowledgeConcept"("courseId");

-- CreateIndex
CREATE INDEX "StudentMastery_studentId_idx" ON "StudentMastery"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentMastery_studentId_conceptId_key" ON "StudentMastery"("studentId", "conceptId");

-- CreateIndex
CREATE INDEX "ResearchPaper_studentId_idx" ON "ResearchPaper"("studentId");

-- CreateIndex
CREATE INDEX "ResearchPaper_reviewerId_idx" ON "ResearchPaper"("reviewerId");

-- CreateIndex
CREATE INDEX "ResearchPaper_status_idx" ON "ResearchPaper"("status");

-- AddForeignKey
ALTER TABLE "Lecture" ADD CONSTRAINT "Lecture_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureChapter" ADD CONSTRAINT "LectureChapter_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureChapter" ADD CONSTRAINT "LectureChapter_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "KnowledgeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureCheckpoint" ADD CONSTRAINT "LectureCheckpoint_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LectureCheckpoint" ADD CONSTRAINT "LectureCheckpoint_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "KnowledgeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEvent" ADD CONSTRAINT "WatchEvent_lectureId_fkey" FOREIGN KEY ("lectureId") REFERENCES "Lecture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchEvent" ADD CONSTRAINT "WatchEvent_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeConcept" ADD CONSTRAINT "KnowledgeConcept_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeConcept" ADD CONSTRAINT "KnowledgeConcept_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "KnowledgeConcept"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentMastery" ADD CONSTRAINT "StudentMastery_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "KnowledgeConcept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "CourseOffering"("id") ON DELETE SET NULL ON UPDATE CASCADE;
