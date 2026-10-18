-- r188 — DEMONSTRATION-INSTITUTION REBRAND (idempotent data migration)
--
-- Replaces the retired real-university showcase identity (جامعة الزاوية /
-- zawia-showcase / zu.edu.ly demo emails) with the explicitly-FICTIONAL
-- demonstration tenant «جامعة مدارك التجريبية» (slug madarek-demo, demo
-- emails on demo.madarek.ly). Every statement is guarded by a WHERE on
-- the OLD value, so:
--   · an ESTABLISHED database is rebranded in place (stable row ids and
--     every FK/relationship preserved — rows are UPDATED, never deleted
--     and recreated);
--   · a FRESH database (faculties/users arrive only from the r188 seed)
--     no-ops on every statement.
-- The institution row keeps its legacy fixed id 'inst-zawia-showcase'
-- (a stable FK anchor referenced by older migrations/tests — an
-- internal identifier, never public identity).
--
-- UniversityFact rows for the tenant are DELETED (not edited): the
-- next scheduled sync (r188 static-source.ts) re-creates the fictional
-- fact sheet with honest demo provenance labels.

-- ── 1. Institution rename (slug is UNIQUE; guarded by the old slug) ──
UPDATE "Institution"
SET "name" = 'جامعة مدارك التجريبية',
    "nameEn" = 'Madarek Demo University',
    "slug" = 'madarek-demo'
WHERE "slug" = 'zawia-showcase' AND "id" = 'inst-zawia-showcase';

-- ── 2. Faculty campus/name re-map (25 rows, guarded by old (name, city)) ──
-- حرم المعرفة (13) — the former الزاوية campus rows keep their names.
UPDATE "Faculty" SET "city" = 'حرم المعرفة' WHERE "institutionId" = 'inst-zawia-showcase' AND "city" = 'الزاوية';
-- حرم الابتكار (8) — the former العجيلات rows.
UPDATE "Faculty" SET "city" = 'حرم الابتكار' WHERE "institutionId" = 'inst-zawia-showcase' AND "city" = 'العجيلات';
-- حرم البيان (4) — the former زوارة / أبو عيسى / ناصر / مناطق أخرى rows;
-- the two duplicate كلية التربية rows are re-named to distinct faculties.
UPDATE "Faculty" SET "city" = 'حرم البيان' WHERE "institutionId" = 'inst-zawia-showcase' AND "city" = 'زوارة';
UPDATE "Faculty" SET "name" = 'كلية اللغات', "nameEn" = 'Languages', "iconEmoji" = '🗣️', "city" = 'حرم البيان'
WHERE "institutionId" = 'inst-zawia-showcase' AND "name" = 'كلية التربية' AND "city" = 'أبو عيسى';
UPDATE "Faculty" SET "name" = 'كلية الفنون والتصميم', "nameEn" = 'Arts & Design', "iconEmoji" = '🎨', "city" = 'حرم البيان'
WHERE "institutionId" = 'inst-zawia-showcase' AND "name" = 'كلية التربية' AND "city" = 'ناصر';
UPDATE "Faculty" SET "city" = 'حرم البيان' WHERE "institutionId" = 'inst-zawia-showcase' AND "city" = 'مناطق أخرى';

-- ── 3. Demo-account email domain (5 accounts, guarded by old email) ──
UPDATE "User" SET "email" = 'student@demo.madarek.ly' WHERE "email" = 'student@zu.edu.ly';
UPDATE "User" SET "email" = 'teacher@demo.madarek.ly' WHERE "email" = 'teacher@zu.edu.ly';
UPDATE "User" SET "email" = 'admin@demo.madarek.ly'   WHERE "email" = 'admin@zu.edu.ly';
UPDATE "User" SET "email" = 'quality@demo.madarek.ly' WHERE "email" = 'quality@zu.edu.ly';
UPDATE "User" SET "email" = 'owner@demo.madarek.ly'   WHERE "email" = 'owner@zu.edu.ly';

-- ── 4. Seeded demo content carrying the retired identity (guarded) ──
UPDATE "Badge"
SET "slug" = 'badge-demo-pioneer', "title" = 'رائد المسارات'
WHERE "slug" = 'badge-zu-pioneer' AND "title" = 'رائد جامعة الزاوية';

UPDATE "ResearchPaper"
SET "title" = 'تأثير استراتيجية الصف المعكوس على تحصيل طلاب الهندسة في جامعة مدارك التجريبية'
WHERE "title" = 'تأثير استراتيجية الصف المعكوس على تحصيل طلاب الهندسة في جامعة الزاوية';

UPDATE "Job"
SET "company" = 'شركة تقنية المعرفة', "location" = 'حرم المعرفة · حضوري'
WHERE "company" = 'شركة تقنية الزاوية' AND "location" = 'الزاوية · حضوري';

UPDATE "Competition"
SET "description" = 'تستقبل الجامعة البحوث الطلابية في مجال الذكاء الاصطناعي وتطبيقاته. الفائز يحصل على منحة لحضور مؤتمر دولي.'
WHERE "description" LIKE 'تستقبل جامعة الزاوية البحوث الطلابية%';

UPDATE "TrainingTrack"
SET "summary" = 'مسار متخصص ضمن رؤية الجامعة التجريبية المستقبلية.'
WHERE "summary" = 'مسار متخصص ضمن رؤية جامعة الزاوية المستقبلية.';

UPDATE "TrainingLesson"
SET "contentMarkdown" = replace("contentMarkdown",
  'على درجات طلاب الهندسة في جامعة الزاوية',
  'على درجات طلاب الهندسة في الجامعة')
WHERE "contentMarkdown" LIKE '%جامعة الزاوية%';

UPDATE "TrainingLesson"
SET "quizAnswer" = replace("quizAnswer", 'zu.edu.ly', 'demo.madarek.ly')
WHERE "quizAnswer" LIKE '%zu.edu.ly%';

-- ── 5. Retired fact sheet: delete, the next sync re-creates the
--        fictional set (guarded by institution scope) ──
DELETE FROM "UniversityFact" WHERE "institutionId" = 'inst-zawia-showcase';
