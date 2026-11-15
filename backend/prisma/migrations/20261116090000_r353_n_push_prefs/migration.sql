-- R353 N — per-user PUSH preferences + quiet hours (LANE N backend).
--
-- NotificationPreference gains three columns:
--   pushEnabled  BOOLEAN NOT NULL DEFAULT true  — absent-row semantics
--                stay "ON" (the fan-out treats a missing row as
--                push-on, exactly like emailEnabled's E3 contract);
--   quietStart   INTEGER (UTC hour 0-23, nullable) — the quiet window
--   quietEnd     INTEGER (UTC hour 0-23, nullable)   [start, end),
--                active only when BOTH ends are set; wrap-around
--                (e.g. 22→6) is the intended overnight shape.
--
-- Push categories are the NotificationPayload types (URGENT | ACADEMIC
-- | SYSTEM | SOCIAL) and share the (userId, category) unique key with
-- the mail categories (security/account/courses/announcements/digest)
-- — no new table, no backfill: every existing row simply becomes
-- push-on with no quiet hours, and absent rows need no row at all.

-- 1. The three columns (additive; existing rows default push-on)
ALTER TABLE "NotificationPreference" ADD COLUMN "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
                                          ADD COLUMN "quietStart" INTEGER,
                                          ADD COLUMN "quietEnd" INTEGER;
