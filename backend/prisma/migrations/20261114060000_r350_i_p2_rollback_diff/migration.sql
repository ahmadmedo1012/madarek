-- R350 I-P2 — rollback + diff: the per-row ledger learns what the
-- commit DID (action) and what the profile looked like BEFORE an
-- UPDATE (before); the job learns the rollback marker + summary.
-- Additive + nullable only (L6).

ALTER TABLE "ImportRow" ADD COLUMN "action" TEXT;
ALTER TABLE "ImportRow" ADD COLUMN "before" JSONB;

-- The rollback reads rows by (jobId, action) — one scan per undo.
CREATE INDEX "ImportRow_jobId_action_idx" ON "ImportRow"("jobId", "action");

ALTER TABLE "ImportJob" ADD COLUMN "rolledBackAt" TIMESTAMP(3);
ALTER TABLE "ImportJob" ADD COLUMN "rollbackSummary" JSONB;
