-- CreateTable
CREATE TABLE "EmailVerificationToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailVerificationToken_userId_idx" ON "EmailVerificationToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_userId_category_key" ON "NotificationPreference"("userId", "category");

-- AddForeignKey
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Re-assert the raw-SQL trgm floor (see r350_e2 for the pattern).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "User_firstName_trgm_idx" ON "User" USING gin ("firstName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "User_lastName_trgm_idx" ON "User" USING gin ("lastName" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Institution_name_trgm_idx" ON "Institution" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Faculty_name_trgm_idx" ON "Faculty" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Department_name_trgm_idx" ON "Department" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_name_trgm_idx" ON "Course" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Announcement_title_trgm_idx" ON "Announcement" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_content_trgm_idx" ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);
