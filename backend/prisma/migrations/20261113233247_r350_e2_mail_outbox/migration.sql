-- CreateEnum
CREATE TYPE "MailOutboxStatus" AS ENUM ('queued', 'sending', 'sent', 'failed', 'suppressed');

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

-- CreateIndex
CREATE UNIQUE INDEX "MailOutbox_dedupeKey_key" ON "MailOutbox"("dedupeKey");

-- CreateIndex
CREATE INDEX "MailOutbox_status_nextAttemptAt_idx" ON "MailOutbox"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "MailOutbox_to_createdAt_idx" ON "MailOutbox"("to", "createdAt");

-- CreateIndex
CREATE INDEX "MailOutbox_institutionId_createdAt_idx" ON "MailOutbox"("institutionId", "createdAt");

-- CreateIndex
CREATE INDEX "MailSuppression_email_idx" ON "MailSuppression"("email");

-- CreateIndex
CREATE UNIQUE INDEX "MailSuppression_email_type_key" ON "MailSuppression"("email", "type");

-- The auto-generated diff wanted to DROP the raw-SQL trgm indexes (they
-- live outside schema.prisma by design — GIN/trgm is not expressible in
-- Prisma schema syntax). Removed, and re-asserted here instead (the E1/F1
-- pattern): a fresh environment and any environment where an earlier
-- `migrate dev` dropped them gets the search floor back.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "User_firstName_trgm_idx" ON "User" USING gin ("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_lastName_trgm_idx" ON "User" USING gin ("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Institution_name_trgm_idx" ON "Institution" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Faculty_name_trgm_idx" ON "Faculty" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Department_name_trgm_idx" ON "Department" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_name_trgm_idx" ON "Course" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Announcement_title_trgm_idx" ON "Announcement" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_content_trgm_idx" ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);
