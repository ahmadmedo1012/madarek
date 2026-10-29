-- r323 B2.3 — the STT generation job state for lecture transcripts.
CREATE TYPE "TranscriptStatus" AS ENUM ('NONE', 'QUEUED', 'RUNNING', 'DONE', 'FAILED');

ALTER TABLE "Lecture"
  ADD COLUMN "transcriptStatus" "TranscriptStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "transcriptError" TEXT;
