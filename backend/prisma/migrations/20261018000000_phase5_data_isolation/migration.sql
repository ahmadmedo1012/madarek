-- r179 (phase-5) — institution ownership for the user-generated and
-- institution-data surfaces that have no parent-relation chain.
--
-- Columns are added NULLABLE first, backfilled to the showcase
-- institution ('inst-zawia-showcase' — the documented pre-launch owner
-- of ALL existing rows: the platform started as the Zawia showcase),
-- then set NOT NULL, exactly the r178 backfill pattern.
--
-- UniversityFact: the single-column PK (key) becomes the composite PK
-- (institutionId, key) — facts are per-institution and the Zawia
-- static source is only ever THE ZAWIA source. SyncRun gains the
-- institution the run synced.
--
-- Fresh/empty databases: every UPDATE below is a no-op; the showcase
-- institution is inserted guarded with ON CONFLICT (slug) DO NOTHING.

-- ── Backfill anchor: the showcase institution (r178 fixed literal) ──
INSERT INTO "Institution" ("id", "name", "slug", "status", "createdAt", "updatedAt")
VALUES ('inst-zawia-showcase', 'جامعة الزاوية', 'zawia-showcase', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO NOTHING;

-- ── Post: institution-scoped community feed ───────────────────────
ALTER TABLE "Post" ADD COLUMN "institutionId" TEXT;
UPDATE "Post" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "Post" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "Post_institutionId_createdAt_idx" ON "Post"("institutionId", "createdAt");
ALTER TABLE "Post" ADD CONSTRAINT "Post_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── StudyRoom: institution-scoped study rooms ─────────────────────
ALTER TABLE "StudyRoom" ADD COLUMN "institutionId" TEXT;
UPDATE "StudyRoom" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "StudyRoom" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "StudyRoom_institutionId_idx" ON "StudyRoom"("institutionId");
ALTER TABLE "StudyRoom" ADD CONSTRAINT "StudyRoom_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── CampusEvent: institution-scoped events ────────────────────────
ALTER TABLE "CampusEvent" ADD COLUMN "institutionId" TEXT;
UPDATE "CampusEvent" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "CampusEvent" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "CampusEvent_institutionId_startsAt_idx" ON "CampusEvent"("institutionId", "startsAt");
ALTER TABLE "CampusEvent" ADD CONSTRAINT "CampusEvent_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Competition: institution-scoped competitions ──────────────────
ALTER TABLE "Competition" ADD COLUMN "institutionId" TEXT;
UPDATE "Competition" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "Competition" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "Competition_institutionId_deadline_idx" ON "Competition"("institutionId", "deadline");
ALTER TABLE "Competition" ADD CONSTRAINT "Competition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── ResearchPaper: the membership institution of the submission ───
ALTER TABLE "ResearchPaper" ADD COLUMN "institutionId" TEXT;
UPDATE "ResearchPaper" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "ResearchPaper" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "ResearchPaper_institutionId_idx" ON "ResearchPaper"("institutionId");
ALTER TABLE "ResearchPaper" ADD CONSTRAINT "ResearchPaper_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── AiConversation: institution-scoped AI history ─────────────────
ALTER TABLE "AiConversation" ADD COLUMN "institutionId" TEXT;
UPDATE "AiConversation" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "AiConversation" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "AiConversation_userId_institutionId_idx" ON "AiConversation"("userId", "institutionId");
ALTER TABLE "AiConversation" ADD CONSTRAINT "AiConversation_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── UniversityFact: per-institution facts (composite PK) ──────────
-- Drop the single-column PK, add the institution column, backfill,
-- enforce NOT NULL, then rebuild the PK as (institutionId, key).
ALTER TABLE "UniversityFact" DROP CONSTRAINT "UniversityFact_pkey";
ALTER TABLE "UniversityFact" ADD COLUMN "institutionId" TEXT;
UPDATE "UniversityFact" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "UniversityFact" ALTER COLUMN "institutionId" SET NOT NULL;
ALTER TABLE "UniversityFact" ADD CONSTRAINT "UniversityFact_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UniversityFact" ADD CONSTRAINT "UniversityFact_pkey" PRIMARY KEY ("institutionId", "key");
DROP INDEX IF EXISTS "UniversityFact_category_idx";
CREATE INDEX "UniversityFact_institutionId_category_idx" ON "UniversityFact"("institutionId", "category");

-- ── SyncRun: the institution the run synced ───────────────────────
ALTER TABLE "SyncRun" ADD COLUMN "institutionId" TEXT;
UPDATE "SyncRun" SET "institutionId" = 'inst-zawia-showcase' WHERE "institutionId" IS NULL;
ALTER TABLE "SyncRun" ALTER COLUMN "institutionId" SET NOT NULL;
CREATE INDEX "SyncRun_institutionId_startedAt_idx" ON "SyncRun"("institutionId", "startedAt");
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
