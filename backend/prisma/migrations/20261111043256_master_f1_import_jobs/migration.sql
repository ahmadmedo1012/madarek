-- CreateEnum
CREATE TYPE "ImportFormat" AS ENUM ('CSV', 'XLSX');

-- CreateEnum
CREATE TYPE "ImportJobStatus" AS ENUM ('UPLOADED', 'MAPPED', 'VALIDATED', 'COMMITTING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('PENDING', 'OK', 'SKIPPED', 'ERROR');

-- master-F1 guard (same lesson as master-E1): the GIN trigram index is
-- raw SQL (not expressible in the Prisma schema DSL), so schema diffs
-- try to drop it. This migration is ADDITIVE ONLY (import jobs — no
-- existing column, enum, or index is renamed, retyped, or dropped);
-- never ship that drop — re-assert the index idempotently instead.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_content_trgm_idx"
    ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);

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

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
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

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_idempotencyKey_key" ON "ImportJob"("idempotencyKey");

-- CreateIndex
CREATE INDEX "ImportJob_institutionId_status_idx" ON "ImportJob"("institutionId", "status");

-- CreateIndex
CREATE INDEX "ImportJob_createdByUserId_createdAt_idx" ON "ImportJob"("createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "ImportRow_jobId_status_idx" ON "ImportRow"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_jobId_line_key" ON "ImportRow"("jobId", "line");

-- CreateIndex
CREATE INDEX "ImportMappingProfile_institutionId_entity_idx" ON "ImportMappingProfile"("institutionId", "entity");

-- CreateIndex
CREATE UNIQUE INDEX "ImportMappingProfile_institutionId_name_key" ON "ImportMappingProfile"("institutionId", "name");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMappingProfile" ADD CONSTRAINT "ImportMappingProfile_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportMappingProfile" ADD CONSTRAINT "ImportMappingProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
