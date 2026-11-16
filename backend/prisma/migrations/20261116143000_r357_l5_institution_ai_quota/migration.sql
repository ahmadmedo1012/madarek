-- r357 L5 — the per-institution daily AI ask budget (quota.ts's
-- AiInstitutionQuota). Hand-written (NOT migrate-dev diffed): the repo's
-- trgm indexes live in raw SQL beyond Prisma's model, so a dev diff
-- would try to "fix" them. Surgical: this file creates ONLY the new
-- table + its indexes.

-- CreateTable
CREATE TABLE "AiInstitutionQuota" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiInstitutionQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiInstitutionQuota_institutionId_key" ON "AiInstitutionQuota"("institutionId");

-- CreateIndex
CREATE INDEX "AiInstitutionQuota_dayKey_idx" ON "AiInstitutionQuota"("dayKey");
