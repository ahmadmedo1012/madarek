-- CreateTable
CREATE TABLE "ClientError" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "route" TEXT,
    "role" TEXT,
    "breadcrumbs" JSONB,
    "appVersion" TEXT,
    "updateId" TEXT,
    "runtimeVersion" TEXT,
    "deviceModel" TEXT,
    "osName" TEXT,
    "osVersion" TEXT,
    "userAgent" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientError_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "expoToken" TEXT NOT NULL,
    "appVersion" TEXT,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PushDevice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientError_kind_createdAt_idx" ON "ClientError"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "ClientError_reviewedAt_createdAt_idx" ON "ClientError"("reviewedAt", "createdAt");

-- CreateIndex
CREATE INDEX "ClientError_userId_idx" ON "ClientError"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PushDevice_expoToken_key" ON "PushDevice"("expoToken");

-- CreateIndex
CREATE INDEX "PushDevice_userId_idx" ON "PushDevice"("userId");

-- CreateIndex
CREATE INDEX "PushDevice_lastSeenAt_idx" ON "PushDevice"("lastSeenAt");

-- AddForeignKey
ALTER TABLE "ClientError" ADD CONSTRAINT "ClientError_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushDevice" ADD CONSTRAINT "PushDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- r326 guard (r324 lesson): the GIN trigram index is raw SQL (not
-- expressible in the Prisma schema DSL), so schema diffs try to drop it.
-- Never ship that drop; re-assert it idempotently instead.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_content_trgm_idx"
    ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);
