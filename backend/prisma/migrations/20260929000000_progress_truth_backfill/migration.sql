-- Premium Polish P0-2: progress truth backfill.
--
-- enrollment.progressPct used to be a frozen seed constant (60) with no
-- writer anywhere in the codebase, while the course detail page derived a
-- live percentage from watchEvents — so the dashboard, the course cards
-- and the detail page openly contradicted each other, and the dashboard's
-- "متوسط تقدّمك" could never move no matter how much a student watched.
--
-- The writer now lives in POST /lectures/:id/watch (it recomputes the
-- percentage from completed watchEvents on every completion transition).
-- This migration makes the EXISTING rows honest with the same formula,
-- so every surface agrees from the first request after deploy:
--
--   progressPct = round(100 * completedWatchEvents / lecturesInOffering)
--
-- Zero-lecture offerings resolve to 0 (NULLIF guard). All enrollment
-- rows are recomputed — the field is only ever read for active ones, but
-- leaving stale numbers anywhere is exactly the class of bug this fixes.

UPDATE "Enrollment" AS e
SET "progressPct" = COALESCE(
  ROUND(
    100.0 * (
      SELECT COUNT(*)
      FROM "WatchEvent" we
      JOIN "Lecture" l ON l."id" = we."lectureId"
      WHERE we."studentId" = e."studentId"
        AND l."offeringId" = e."offeringId"
        AND we."completed" = TRUE
    ) / NULLIF(
      (
        SELECT COUNT(*)
        FROM "Lecture" l
        WHERE l."offeringId" = e."offeringId"
      ),
      0
    )
  ),
  0
);
