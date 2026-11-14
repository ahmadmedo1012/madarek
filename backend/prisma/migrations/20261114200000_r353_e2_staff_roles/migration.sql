-- R353 E2 — the Libyan staff-office axis (docs/ROLES-LIBYA.md).
--
-- Role stays the coarse authN enum; StaffRole names the OFFICE:
--   ADMIN   + REGISTRAR_GENERAL  = المسجل العام (university registrar)
--   ADMIN   + COLLEGE_REGISTRAR  = مسجل الكلية (requires scopeFacultyId)
--   QUALITY + EXAMS_CONTROLLER   = مراقب الامتحانات (owns EXAMS_MODERATE)
--   QUALITY + QUALITY_OFFICER    = موظف مكتب الجودة (no exam moderation)
--
-- Backfill (conservative, listed for the owner):
--   * every existing ADMIN without a faculty scope → REGISTRAR_GENERAL
--     (they keep exactly the powers they had; now correctly named)
--   * every existing ADMIN scoped to a faculty → COLLEGE_REGISTRAR
--   * every existing QUALITY user → EXAMS_CONTROLLER **with** a global
--     EXAMS_MODERATE UserPermission grant: they keep the moderation
--     power they had on main (the role default is dropped in this same
--     change — the explicit grant preserves behavior for incumbents);
--     the seed then resets the demo quality@ account to QUALITY_OFFICER
--     and adds a dedicated exams@ demo controller.
--   * the seeded RolePermission row (QUALITY, EXAMS_MODERATE) is
--     DELETED so the DB layer cannot resurrect the quality-office
--     default the code just dropped.

-- 1. The enum + the User columns
CREATE TYPE "StaffRole" AS ENUM ('REGISTRAR_GENERAL', 'COLLEGE_REGISTRAR', 'EXAMS_CONTROLLER', 'QUALITY_OFFICER');
ALTER TABLE "User" ADD COLUMN "staffRole" "StaffRole",
                    ADD COLUMN "staffRoleAt" TIMESTAMP(3);

-- 2. Backfill the offices
UPDATE "User" SET "staffRole" = 'REGISTRAR_GENERAL', "staffRoleAt" = NOW()
 WHERE "role" = 'ADMIN' AND "scopeFacultyId" IS NULL AND "staffRole" IS NULL;
UPDATE "User" SET "staffRole" = 'COLLEGE_REGISTRAR', "staffRoleAt" = NOW()
 WHERE "role" = 'ADMIN' AND "scopeFacultyId" IS NOT NULL AND "staffRole" IS NULL;

-- 3. QUALITY incumbents keep their moderation, now as the exams office
--    (explicit global grant; the code's role default is gone).
UPDATE "User" SET "staffRole" = 'EXAMS_CONTROLLER', "staffRoleAt" = NOW()
 WHERE "role" = 'QUALITY' AND "staffRole" IS NULL;
INSERT INTO "UserPermission" ("id", "userId", "capability", "institutionId", "grant", "grantedAt", "reason")
SELECT CONCAT('e2exams-', "id"), "id", 'EXAMS_MODERATE', NULL, true, NOW(), 'R353 E2 — incumbent quality user keeps exam moderation as مراقب الامتحانات'
  FROM "User" u
 WHERE "role" = 'QUALITY'
   AND NOT EXISTS (
     SELECT 1 FROM "UserPermission" up
      WHERE up."userId" = u."id" AND up."capability" = 'EXAMS_MODERATE'
   );
-- (cuid-shaped ids are not required by the schema; the deterministic
--  prefix keeps the backfill idempotent and auditable.)

-- 4. The quality-office default row leaves the RolePermission layer
DELETE FROM "RolePermission"
 WHERE "role" = 'QUALITY' AND "capability" = 'EXAMS_MODERATE';
