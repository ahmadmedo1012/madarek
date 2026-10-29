-- r323 B1.1 — AI cost control + per-answer feedback.
--
-- Three additive tables beside the AiTelemetry family:
--   · AiQuota    — per-USER daily ask counter for the AI assistant
--                  (AI_DAILY_LIMIT_DEFAULT, default 25). One row per
--                  user (userId UNIQUE); `dayKey` ('YYYY-MM-DD' UTC)
--                  says which day `used` belongs to — the route resets
--                  a stale-day row via an updateMany CAS (dayKey ≠
--                  today → used = 0), so the roll-over never
--                  read-modify-writes across statements.
--   · AiBudget   — platform-wide MONTHLY token counter (monthKey
--                  'YYYY-MM' UNIQUE). usedTokens records REAL provider
--                  usage only (0 in local mode — never estimated);
--                  estimatedCostMicros stays 0 until a real price table
--                  exists (honest zero).
--   · AiFeedback — one rating (1 / -1, SMALLINT) per user per assistant
--                  answer; the (messageId, userId) unique pair is the
--                  upsert key (last rating wins) and keeps one row per
--                  rater per answer.
--
-- Hand-written to Prisma's exact generated DDL shape (same constraint
-- and index names `prisma migrate diff` would emit — the r157
-- checkpoint-answer-memory and R320 §D password-reset precedents).
-- Purely additive: no existing table, column or constraint changes;
-- userId stays a bare string (the AiTelemetry precedent — no FK), so
-- the User model is untouched.

-- CreateTable
CREATE TABLE "AiQuota" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "used" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiQuota_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiQuota_userId_key" ON "AiQuota"("userId");

-- CreateIndex
CREATE INDEX "AiQuota_dayKey_idx" ON "AiQuota"("dayKey");

-- CreateTable
CREATE TABLE "AiBudget" (
    "id" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "usedTokens" INTEGER NOT NULL DEFAULT 0,
    "estimatedCostMicros" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AiBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiBudget_monthKey_key" ON "AiBudget"("monthKey");

-- CreateTable
CREATE TABLE "AiFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "rating" SMALLINT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiFeedback_messageId_userId_key" ON "AiFeedback"("messageId", "userId");

-- CreateIndex
CREATE INDEX "AiFeedback_messageId_idx" ON "AiFeedback"("messageId");

-- CreateIndex
CREATE INDEX "AiFeedback_userId_idx" ON "AiFeedback"("userId");
