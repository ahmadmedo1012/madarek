-- R353 C2 — AiTelemetry.provider: which chain provider actually
-- answered (gemini/groq/openrouter/… or 'local' for the chain's
-- terminal composer fallback). Additive + nullable, no backfill:
-- rows from the single-provider era honestly stay NULL.

ALTER TABLE "AiTelemetry" ADD COLUMN "provider" TEXT;
