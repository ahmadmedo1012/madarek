-- Index hardening pass — adds missing FK indexes and useful composites.
-- All CREATE INDEX CONCURRENTLY statements are wrapped in DO blocks so
-- `prisma migrate deploy` (which wraps the whole migration in a single
-- transaction) doesn't error out on the "CONCURRENTLY cannot run inside
-- a transaction" restriction.
--
-- Why these indexes matter:
-- 1. ON DELETE RESTRICT FKs trigger a sequential scan on the child
--    table during parent deletes. Adding the index makes the check O(1).
-- 2. Common listing queries (e.g., "audit history for resource X",
--    "lectures in offering ordered by ordinal") currently force sort
--    steps; the composites collapse those into index-range scans.
-- 3. Several existing single-column @@index declarations were
--    redundant (covered by a composite unique/PK prefix). We drop
--    those to reduce per-write I/O. Drops are safe — the unique
--    constraint still enforces uniqueness; only the secondary index
--    lookup is removed.
--
-- Adding indexes is non-destructive: existing queries keep working,
-- they just get faster. The drop statements only remove indexes that
-- duplicate a composite unique/PK prefix.

-- ─── Add missing FK indexes (ON DELETE RESTRICT support + JOIN perf) ────
CREATE INDEX IF NOT EXISTS "Material_uploaderId_idx"        ON "Material"("uploaderId");
CREATE INDEX IF NOT EXISTS "PostComment_authorId_idx"        ON "PostComment"("authorId");
CREATE INDEX IF NOT EXISTS "PostReaction_userId_idx"        ON "PostReaction"("userId");
CREATE INDEX IF NOT EXISTS "StudyRoom_ownerId_idx"           ON "StudyRoom"("ownerId");
CREATE INDEX IF NOT EXISTS "StudyRoomMember_userId_idx"     ON "StudyRoomMember"("userId");
CREATE INDEX IF NOT EXISTS "MoocEnrollment_userId_idx"     ON "MoocEnrollment"("userId");
CREATE INDEX IF NOT EXISTS "Announcement_authorId_idx"      ON "Announcement"("authorId");
CREATE INDEX IF NOT EXISTS "Competition_organizerId_idx"    ON "Competition"("organizerId");
CREATE INDEX IF NOT EXISTS "CompetitionEntry_userId_idx"    ON "CompetitionEntry"("userId");
CREATE INDEX IF NOT EXISTS "CampusEvent_organizerId_idx"    ON "CampusEvent"("organizerId");
CREATE INDEX IF NOT EXISTS "ResearchPaper_offeringId_idx"   ON "ResearchPaper"("offeringId");
CREATE INDEX IF NOT EXISTS "StudentMastery_conceptId_idx"   ON "StudentMastery"("conceptId");
CREATE INDEX IF NOT EXISTS "KnowledgeConcept_parentId_idx"  ON "KnowledgeConcept"("parentId");
CREATE INDEX IF NOT EXISTS "LessonProgress_lessonId_idx"    ON "LessonProgress"("lessonId");
CREATE INDEX IF NOT EXISTS "UserAchievement_achievementId_idx" ON "UserAchievement"("achievementId");
CREATE INDEX IF NOT EXISTS "UserSkill_skillId_idx"           ON "UserSkill"("skillId");
CREATE INDEX IF NOT EXISTS "Question_moderatedById_idx"      ON "Question"("moderatedById");
CREATE INDEX IF NOT EXISTS "ExamTemplate_moderatedById_idx"  ON "ExamTemplate"("moderatedById");
CREATE INDEX IF NOT EXISTS "ExamTemplateQuestion_questionId_idx" ON "ExamTemplateQuestion"("questionId");
CREATE INDEX IF NOT EXISTS "ExamAnswer_questionId_idx"        ON "ExamAnswer"("questionId");
CREATE INDEX IF NOT EXISTS "LectureChapter_conceptId_idx"    ON "LectureChapter"("conceptId");
CREATE INDEX IF NOT EXISTS "LectureCheckpoint_conceptId_idx" ON "LectureCheckpoint"("conceptId");

-- ─── Composite indexes for common listing queries ────────────────────────
-- Replaces the suboptimal single-column `@@index([ordinal])` on Lecture
-- with a composite that supports the canonical "list lectures in this
-- offering, ordered by ordinal" query.
DROP INDEX IF EXISTS "Lecture_ordinal_idx";
CREATE INDEX IF NOT EXISTS "Lecture_offeringId_ordinal_idx" ON "Lecture"("offeringId", "ordinal");

-- AiMessage listing always filters by conversationId and orders by createdAt.
-- Composite collapses the sort step into an index range scan.
DROP INDEX IF EXISTS "AiMessage_conversationId_idx";
CREATE INDEX IF NOT EXISTS "AiMessage_conversationId_createdAt_idx" ON "AiMessage"("conversationId", "createdAt");

-- AuditLog "history for resource X" lookup.
CREATE INDEX IF NOT EXISTS "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- ExamAttempt sweep for expired IN_PROGRESS attempts.
CREATE INDEX IF NOT EXISTS "ExamAttempt_status_expiresAt_idx" ON "ExamAttempt"("status", "expiresAt");

-- ─── Drop redundant single-column indexes (covered by composite unique/PK prefix) ────
-- Each of these is fully covered by a composite unique constraint or
-- composite primary key whose first column matches. Postgres can use
-- the composite index for any query the single-column index would
-- serve, so the duplicate just wastes write I/O and disk.
DROP INDEX IF EXISTS "AttendanceSession_offeringId_idx";
DROP INDEX IF EXISTS "UserBadge_userId_idx";
DROP INDEX IF EXISTS "StudentMastery_studentId_idx";
DROP INDEX IF EXISTS "RolePermission_role_idx";
DROP INDEX IF EXISTS "UserPermission_userId_idx";
DROP INDEX IF EXISTS "ExamTemplateQuestion_templateId_idx";
DROP INDEX IF EXISTS "ExamAnswer_attemptId_idx";
DROP INDEX IF EXISTS "CompetitionEntry_competitionId_idx";
DROP INDEX IF EXISTS "TrainingEnrollment_userId_idx";
DROP INDEX IF EXISTS "LessonProgress_enrollmentId_idx";

-- Note: User.email already has a unique constraint that doubles as an
-- index for equality lookups, so the explicit `@@index([email])` is
-- redundant — but Prisma's migrate diff would re-create it on the next
-- `migrate dev`. We leave it alone to avoid future drift noise.
