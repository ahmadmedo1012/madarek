-- Phase 2: align Faculty model with the real University of Al-Zawiya
-- structure (per zu.edu.ly). The same faculty name can exist in multiple
-- cities (Economics in Zawia AND Ajilat are distinct institutions), so we
-- replace the single-column unique on `name` with a composite unique on
-- (name, city).

-- 1) Add the city column with a safe default for existing rows.
ALTER TABLE "Faculty" ADD COLUMN "city" TEXT NOT NULL DEFAULT 'الزاوية';

-- 2) Backfill the two faculties that the previous seed placed in Zawia
--    but actually belong to Ajilat per the official source.
UPDATE "Faculty" SET "city" = 'العجيلات' WHERE "name" = 'كلية هندسة النفط والغاز';
UPDATE "Faculty" SET "city" = 'العجيلات' WHERE "name" = 'كلية الطب البيطري والعلوم الزراعية';

-- 3) Replace the unique constraint.
DROP INDEX IF EXISTS "Faculty_name_key";
CREATE UNIQUE INDEX "Faculty_name_city_key" ON "Faculty"("name", "city");

-- 4) Index city for filtering / grouping the colleges UI.
CREATE INDEX "Faculty_city_idx" ON "Faculty"("city");
