-- Drop orphan indexes left behind by earlier migrations.
--
-- "Lecture_offeringId_idx" (created in 20260523232850_add_quality_role_and_matrix)
-- and "PointsLedger_userId_idx" (created in 20260524174538_add_training_rewards)
-- were never declared in schema.prisma and were never dropped afterwards.
-- Both are fully covered by composite indexes whose leading column matches:
--   - "Lecture"      @@index([offeringId, ordinal])   → "Lecture_offeringId_ordinal_idx"
--   - "PointsLedger" @@index([userId, createdAt])     → "PointsLedger_userId_createdAt_idx"
-- Postgres can serve any single-column lookup the orphan index would cover
-- via the composite's prefix, so the duplicates only cost write I/O and disk.
--
-- Idempotent: DROP INDEX IF EXISTS re-runs cleanly and is a no-op once the
-- indexes are gone. No schema.prisma change is needed (it never declared
-- these indexes, so dropping them introduces no drift).
DROP INDEX IF EXISTS "Lecture_offeringId_idx";
DROP INDEX IF EXISTS "PointsLedger_userId_idx";
