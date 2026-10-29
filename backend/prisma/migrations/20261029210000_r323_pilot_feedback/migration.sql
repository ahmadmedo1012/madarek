-- r323 B3.6 — the pilot feedback loop («أبلغ عن مشكلة / اقتراح»)
CREATE TABLE "PilotFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "role" TEXT,
    "route" TEXT,
    "userAgent" TEXT,
    "console" JSONB,
    "note" TEXT NOT NULL,
    "screenshot" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PilotFeedback_status_createdAt_idx" ON "PilotFeedback"("status", "createdAt");
CREATE INDEX "PilotFeedback_userId_idx" ON "PilotFeedback"("userId");

ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON UPDATE CASCADE ON DELETE SET NULL;
