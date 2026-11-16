-- r357 L2 — important student documents (signed-URL reads).
-- One row per uploaded document; bytes live in private storage under
-- profile-media/ (no public URL exists for any document).

CREATE TABLE "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "titleAr" VARCHAR(160) NOT NULL,
    "kind" VARCHAR(40) NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" VARCHAR(80) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "institutionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentDocument_storageKey_key" ON "StudentDocument"("storageKey");
CREATE INDEX "StudentDocument_studentProfileId_idx" ON "StudentDocument"("studentProfileId");

ALTER TABLE "StudentDocument"
    ADD CONSTRAINT "StudentDocument_studentProfileId_fkey"
    FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
