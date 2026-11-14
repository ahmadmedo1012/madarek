-- R351 X2c — the shared rate-limit store (additive).
CREATE TABLE "RateLimitHit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitHit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "RateLimitHit_updatedAt_idx" ON "RateLimitHit"("updatedAt");
