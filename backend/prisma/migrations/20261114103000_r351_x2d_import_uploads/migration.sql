-- R351 X2d — the import upload tickets (additive).
CREATE TABLE "ImportUpload" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "mintedBy" TEXT NOT NULL,
    "institutionId" TEXT,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportUpload_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ImportUpload_key_key" ON "ImportUpload"("key");
CREATE INDEX "ImportUpload_createdAt_idx" ON "ImportUpload"("createdAt");
