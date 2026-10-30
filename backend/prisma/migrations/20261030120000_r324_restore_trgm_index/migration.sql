-- r324 P7.0 — corrective migration.
--
-- The migration folder `20261029125221_workspace_agent_exit_code_printf_n…`
-- (deleted with this round) was a shell-variable accident: its ONLY
-- statement was `DROP INDEX "AiKnowledgeChunk_content_trgm_idx";` — it
-- silently removed the GIN trigram index the RAG's lexical retrieval
-- depends on (AiKnowledgeChunk search). Any environment that applied it
-- lost the index; this restores it idempotently (the DDL matches the
-- original 20261029125203 migration byte-for-byte in intent).
--
-- CREATE INDEX IF NOT EXISTS is PG 9.5+; pg_trgm is ensured again in
-- case a fresh environment skips the 12:52:03 folder (it does not).

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "AiKnowledgeChunk_content_trgm_idx"
    ON "AiKnowledgeChunk" USING gin ("content" gin_trgm_ops);
