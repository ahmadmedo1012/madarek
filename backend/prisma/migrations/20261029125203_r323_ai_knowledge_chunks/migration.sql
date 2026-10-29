-- r323 B1.2 — the RAG store (AiKnowledgeChunk) + its lexical index.
-- pg_trgm rides the migration so a fresh environment gets the SAME
-- retrieval posture as dev (extension + GIN trigram index on content).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateTable
CREATE TABLE "AiKnowledgeChunk" (
    "id" TEXT NOT NULL,
    "institutionId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "locator" TEXT,
    "url" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiKnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiKnowledgeChunk_institutionId_idx" ON "AiKnowledgeChunk"("institutionId");

-- CreateIndex
CREATE INDEX "AiKnowledgeChunk_sourceType_sourceId_idx" ON "AiKnowledgeChunk"("sourceType", "sourceId");

-- The lexical retrieval index (Arabic-aware: the QUERY is normalized
-- before it reaches similarity(); the stored text stays as-written).
CREATE INDEX "AiKnowledgeChunk_content_trgm_idx" ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "AiKnowledgeChunk" ADD CONSTRAINT "AiKnowledgeChunk_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
