-- R349 U2 — the neutral tenant, re-keyed for good.
--
-- The owner's word: «المشروع لا ينتمي لأي جامعة — احذفهم نهائيًا».
-- The demonstration institution keeps its DATA (users, faculties,
-- courses — every FK below) but its row id sheds the retired sync-source
-- name. Every FK to Institution carries ON UPDATE CASCADE (verified in
-- 0_init and every later AddForeignKey), so ONE update propagates.
-- The slug already says madarek-demo (r188); only the id lags.
--
-- Idempotent by construction: the WHERE guards make re-runs no-ops.
UPDATE "Institution"
   SET "id" = 'inst-madarek-demo'
 WHERE "id" = 'inst-zawia-showcase';

-- The university-facts pipeline is retired with it (U3): the
-- my-institution page reads the caller's own Institution + Faculty +
-- contact profiles. Tables dropped; data was per-tenant demo facts
-- sourced from the deleted zu-sync static source.
DROP TABLE IF EXISTS "UniversityFact";
DROP TABLE IF EXISTS "SyncRun";

-- The enum rides along.
DROP TYPE IF EXISTS "SyncRunStatus";
