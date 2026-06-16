-- CreateEnum
CREATE TYPE "SyncRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED');

-- CreateTable
CREATE TABLE "UniversityFact" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "source" TEXT NOT NULL DEFAULT 'zu.edu.ly',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isStale" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "UniversityFact_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "status" "SyncRunStatus" NOT NULL DEFAULT 'RUNNING',
    "source" TEXT NOT NULL DEFAULT 'static-markdown',
    "factsAdded" INTEGER NOT NULL DEFAULT 0,
    "factsUpdated" INTEGER NOT NULL DEFAULT 0,
    "errorMsg" TEXT,
    "durationMs" INTEGER,
    "notes" TEXT,

    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UniversityFact_category_idx" ON "UniversityFact"("category");

-- CreateIndex
CREATE INDEX "SyncRun_startedAt_idx" ON "SyncRun"("startedAt");

-- CreateIndex
CREATE INDEX "SyncRun_status_idx" ON "SyncRun"("status");
