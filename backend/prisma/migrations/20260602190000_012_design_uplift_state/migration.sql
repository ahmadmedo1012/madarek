-- 012-design-graphics-uplift — presentation preferences on User.
-- See specs/012-design-graphics-uplift/data-model.md.

-- 1) New enum for the user's persisted theme choice.
CREATE TYPE "ThemePreference" AS ENUM ('LIGHT', 'DARK', 'SYSTEM');

-- 2) Four columns on User.
--    - themePreference defaults to SYSTEM (defer to OS / browser).
--    - themePreferenceUpdatedAt is the tiebreak timestamp used by
--      the local↔profile sync algorithm (research.md R-002).
--    - onboardingCompletedAt remains NULL for existing users so the
--      4-frame onboarding flow runs once on their next sign-in
--      after release (Q3 clarification).
--    - firedMilestones is an append-only string[] (never bounded
--      array constraints — see contract).
ALTER TABLE "User"
  ADD COLUMN "themePreference"          "ThemePreference" NOT NULL DEFAULT 'SYSTEM',
  ADD COLUMN "themePreferenceUpdatedAt" TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "onboardingCompletedAt"    TIMESTAMP(3),
  ADD COLUMN "firedMilestones"          TEXT[]            NOT NULL DEFAULT ARRAY[]::TEXT[];
