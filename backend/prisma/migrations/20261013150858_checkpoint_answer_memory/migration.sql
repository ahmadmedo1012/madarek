-- r157 (W2-F7 / audit 6A5): checkpoint answer memory.
--
-- Checkpoints had NO server-side answer state: every page reload re-fired
-- every quiz, and re-answering burned the r155a MASTERY_ATTEMPT_CAP — a
-- student who reloaded a lecture 4 times hit the frozen-mastery wall while
-- the checkpoints kept quizzing them. This table stores the LAST answer
-- per (student, checkpoint):
--
--   · the answer POST route upserts (last answer wins: answerIndex,
--     correct, updatedAt);
--   · GET /lectures/:id projects the student's own rows back as bare
--     checkpointIds (answers: [{ checkpointId }]) so the player can seed
--     its answeredCheckpointIds and never re-quiz on resume;
--   · answerIndex / correct are never projected to the wire (privacy of
--     attempts — only "was it answered" is the player's business).
--
-- One row per (student, checkpoint) — enforced by the unique index below;
-- deleting a checkpoint (or its lecture) cascades the answers away, and a
-- deleted student's rows go with them (the answers are meaningless
-- without their owner). Hand-written to Prisma's exact generated shape
-- (no live DB in this sandbox); `prisma generate` validates the schema
-- side, and migrate-deploy applies this file in the Render build step.

-- CreateTable
CREATE TABLE "CheckpointAnswer" (
    "id" TEXT NOT NULL,
    "checkpointId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answerIndex" INTEGER NOT NULL,
    "correct" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CheckpointAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CheckpointAnswer_checkpointId_studentId_key" ON "CheckpointAnswer"("checkpointId", "studentId");

-- CreateIndex
CREATE INDEX "CheckpointAnswer_studentId_idx" ON "CheckpointAnswer"("studentId");

-- AddForeignKey
ALTER TABLE "CheckpointAnswer" ADD CONSTRAINT "CheckpointAnswer_checkpointId_fkey" FOREIGN KEY ("checkpointId") REFERENCES "LectureCheckpoint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckpointAnswer" ADD CONSTRAINT "CheckpointAnswer_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
