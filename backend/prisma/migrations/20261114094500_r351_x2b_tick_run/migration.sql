-- R351 X2b — the tick bookkeeping table (serverless timers → ticks).
-- Additive: one row per slot, created lazily by the claim code.
CREATE TABLE "TickRun" (
    "key" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDurationMs" INTEGER,
    "lastSummary" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TickRun_pkey" PRIMARY KEY ("key")
);
