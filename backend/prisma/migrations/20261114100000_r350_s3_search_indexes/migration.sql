-- R350 S3 — the discovery engine's trigram index extension.
--
-- The engine grew eight record kinds (SEARCH-DESIGN.md §1: lectures,
-- materials, papers, tracks, books, jobs, events, questions) and each
-- new kind's candidate fetch is the established windowed
-- case-insensitive `contains` (ILIKE '%q%') — without a GIN trgm
-- index on the queried column every keystroke is a sequential scan.
--
-- The index set serves EXACTLY the columns the engine's WHERE clauses
-- touch (the honest floor — an index nothing queries is dead weight):
--  · Lecture.title, Material.name — the offering-scoped content kinds
--  · ResearchPaper.title (abstract is a RANK haystack, never a WHERE
--    arm — indexing it would serve nothing; documented deviation from
--    the design doc's aspirational list)
--  · TrainingTrack.title + titleEn — both are query arms
--  · Book.title + author, Job.title + company — both arms of each
--  · CampusEvent.title, Question.prompt
--  · Course.code — the courses scan's exact-code arm (varchar, no
--    cast needed)
--  · StudentProfile.studentPhoneNormalized + guardianPhoneNormalized —
--    the registrar's phone-search arm (§5 «من هذا الرقم؟»)
--
-- Plain CREATE INDEX (not CONCURRENTLY): prisma migrations run inside
-- a transaction and CONCURRENTLY cannot — the same documented trade
-- as the G1 floor (small index list, not write-hot columns). All
-- IF NOT EXISTS so the chain stays idempotent across the E1/F1-style
-- re-assertions.
CREATE INDEX IF NOT EXISTS "Lecture_title_trgm_idx" ON "Lecture" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Material_name_trgm_idx" ON "Material" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "ResearchPaper_title_trgm_idx" ON "ResearchPaper" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TrainingTrack_title_trgm_idx" ON "TrainingTrack" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TrainingTrack_titleEn_trgm_idx" ON "TrainingTrack" USING gin ("titleEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Book_title_trgm_idx" ON "Book" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Book_author_trgm_idx" ON "Book" USING gin ("author" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Job_title_trgm_idx" ON "Job" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Job_company_trgm_idx" ON "Job" USING gin ("company" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "CampusEvent_title_trgm_idx" ON "CampusEvent" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Question_prompt_trgm_idx" ON "Question" USING gin ("prompt" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Course_code_trgm_idx" ON "Course" USING gin ("code" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "StudentProfile_studentPhoneNormalized_trgm_idx" ON "StudentProfile" USING gin ("studentPhoneNormalized" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "StudentProfile_guardianPhoneNormalized_trgm_idx" ON "StudentProfile" USING gin ("guardianPhoneNormalized" gin_trgm_ops);
