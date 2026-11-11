-- master-G1 — the global-search trigram index floor.
--
-- pg_trgm + GIN trgm indexes on the global search's raw name columns:
-- the engine fetches candidates via case-insensitive `contains`
-- (ILIKE '%q%') then re-verifies + ranks through the canonical Arabic
-- normalizer in JS (the established r155c pattern — normalize.ts is
-- the single fold source). Without these indexes every keystroke is a
-- sequential scan; with them the candidate fetch rides the trigram
-- index and stays in the milliseconds class at institutional scale.
--
-- Plain CREATE INDEX (not CONCURRENTLY): prisma migrations run inside
-- a transaction and CONCURRENTLY cannot — the index list is small and
-- the columns are not write-hot (names change rarely), so the brief
-- lock window is the honest trade (documented here, per the house law
-- that migrations carry their reasons inline).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "User_firstName_trgm_idx" ON "User" USING gin ("firstName" gin_trgm_ops);
CREATE INDEX "User_lastName_trgm_idx" ON "User" USING gin ("lastName" gin_trgm_ops);
CREATE INDEX "Institution_name_trgm_idx" ON "Institution" USING gin ("name" gin_trgm_ops);
CREATE INDEX "Faculty_name_trgm_idx" ON "Faculty" USING gin ("name" gin_trgm_ops);
CREATE INDEX "Department_name_trgm_idx" ON "Department" USING gin ("name" gin_trgm_ops);
CREATE INDEX "Course_name_trgm_idx" ON "Course" USING gin ("name" gin_trgm_ops);
CREATE INDEX "Announcement_title_trgm_idx" ON "Announcement" USING gin ("title" gin_trgm_ops);
