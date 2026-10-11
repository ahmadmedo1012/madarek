-- r146 — FK gap closing, second hardening round (follows the 20260924000000
-- index_hardening methodology: audit-driven, plain CREATE/DROP INDEX with
-- IF NOT EXISTS / IF EXISTS so the migration is idempotent; no CONCURRENTLY
-- because `prisma migrate deploy` wraps migrations in a single transaction —
-- plain index builds take a brief lock, acceptable in the Render build step).
--
-- Why:
-- 1. "UserBadge"."badgeId" — FK ON DELETE RESTRICT with NO index (the PK
--    (userId, badgeId) does not cover badgeId): deleting a Badge scan-joins
--    UserBadge. The 20260924 round indexed the sibling FKs
--    (UserAchievement_achievementId, UserSkill_skillId) but missed this one.
-- 2. "UserPermission"."grantedById" — FK ON DELETE SET NULL with NO index
--    (the unique (userId, capability) does not cover it): deleting a granter
--    User scan-joins the table.
-- 3. "Notification"(userId, createdAt) — GET /me/notifications (the most
--    polled route in the app) filters by userId and sorts by createdAt desc;
--    the existing (userId, readAt) serves only the unread counter, so the
--    list query paid a sort step on every poll. This composite turns it into
--    an index range scan.
-- 4. "ExamAttempt_status_idx" dropped — fully covered by the leading column
--    of "ExamAttempt_status_expiresAt_idx" (same redundant-prefix class the
--    20260924050000 orphan-index round removed); one less btree write per
--    exam attempt.

-- DropIndex
DROP INDEX IF EXISTS "ExamAttempt_status_idx";

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserBadge_badgeId_idx" ON "UserBadge"("badgeId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserPermission_grantedById_idx" ON "UserPermission"("grantedById");
