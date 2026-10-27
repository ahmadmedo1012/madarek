-- R320 §D (P0-3/P0-4) — forgot-password reset tokens (PAGES-GAP.md §5).
--
-- Hand-written to Prisma's exact generated DDL shape (same constraint
-- and index names `prisma migrate diff` would emit for the
-- PasswordResetToken model in schema.prisma — the r157
-- checkpoint-answer-memory precedent). The token is stored ONLY as its
-- sha-256 hex digest (`tokenHash`, UNIQUE — lookups by digest, never by
-- the raw secret), `expiresAt` carries the 30-minute TTL, `usedAt`
-- marks single use (claimed via an updateMany CAS on usedAt = null),
-- and `userId` cascades with the user.

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
