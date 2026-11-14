/**
 * R350 S3 — the EXPLAIN proof for the new trigram indexes (local PG 16).
 * Fabricates a synthetic corpus, then EXPLAIN (ANALYZE, BUFFERS) the
 * engine's actual contains shapes. Index usage = pass; Seq Scan = fail.
 */
const { Client } = require('pg');
const url = process.env.DATABASE_URL || 'postgresql://postgres@localhost:5433/madarek_dev';

async function main() {
  const c = new Client({ connectionString: url });
  await c.connect();
  await c.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');

  const have = await c.query('SELECT COUNT(*)::int AS n FROM "Lecture"');
  if (have.rows[0].n < 10000) {
    console.log('fabricating the corpus...');
    await c.query(`INSERT INTO "QuestionCategory" (id, slug, title) VALUES ('seed-cat', 'seed-cat', 'تحليل') ON CONFLICT (id) DO NOTHING`);
    await c.query(`INSERT INTO "Institution" (id, name, slug, "updatedAt") VALUES ('seed-inst', 'seed', 'seed-inst', now()) ON CONFLICT (id) DO NOTHING`);
    await c.query(`INSERT INTO "Faculty" (id, name, city, "institutionId") VALUES ('seed-fac', 'seed', 'seed', 'seed-inst') ON CONFLICT (id) DO NOTHING`);
    await c.query(`INSERT INTO "Department" (id, name, "facultyId") VALUES ('seed-dep', 'seed', 'seed-fac') ON CONFLICT (id) DO NOTHING`);
    await c.query(`INSERT INTO "User" (id, email, "passwordHash", role, "firstName", "lastName", "updatedAt") VALUES ('seed-u', 'seed-u@seed.local', 'x', 'TEACHER', 's', 'u', now()) ON CONFLICT (id) DO NOTHING`);
    await c.query(`INSERT INTO "Course" (id, code, name, "departmentId", "institutionId", "updatedAt") VALUES ('seed-course', 'SEED1', 'seed', 'seed-dep', 'seed-inst', now()) ON CONFLICT (id) DO NOTHING`);
    await c.query(`INSERT INTO "CourseOffering" (id, "courseId", "teacherId", term) VALUES ('seed-off', 'seed-course', 'seed-u', 'SEED') ON CONFLICT (id) DO NOTHING`);

    const ins = async (table, cols, n, gen) => {
      for (let j = 0; j < n; j++) {
        const vals = gen(j);
        const ph = vals.map((_, k) => `$${k + 1}`);
        await c.query(`INSERT INTO ${table} (${cols}) VALUES (${ph.join(',')})`, vals);
      }
    };
    await ins('"Lecture"', '"id", title, "offeringId", "videoUrl"', 10000,
      (i) => [`lec-${i}`, `محاضرة ${i} في الرياضيات المتقطعة والتحليل العددي`, 'seed-off', 'x']);
    await ins('"Material"', '"id", name, "offeringId", "uploaderId", type, url', 5000,
      (i) => [`mat-${i}`, `ملف شرح ${i} للمحاضرات والواجبات`, 'seed-off', 'seed-u', 'PDF', 'x']);
    await ins('"Question"', '"id", prompt, "categoryId", type, "isApproved", "authorId", "updatedAt"', 5000,
      (i) => [`q-${i}`, `ما هو مفهوم الدالة ${i} في التحليل الرياضي`, 'seed-cat', 'MCQ', true, 'seed-u', new Date().toISOString()]);
    console.log('fabric done');
  } else {
    console.log('corpus already present:', have.rows[0].n, 'lectures');
  }

  const q = async (label, sql) => {
    const r = await c.query('EXPLAIN (ANALYZE, BUFFERS) ' + sql);
    const plan = r.rows.map((x) => x['QUERY PLAN']).join('\n');
    const idx = /Bitmap Index Scan|Index Scan/.test(plan);
    const seq = /Seq Scan/.test(plan);
    const exec = (plan.match(/Execution Time: ([\d.]+) ms/) || [])[1];
    console.log(`${label}: ${idx && !seq ? 'INDEX' : 'SEQ-SCAN'} | ${exec} ms`);
  };
  await q('Lecture.title ILIKE', `SELECT id FROM "Lecture" WHERE title ILIKE '%محاضرة 4321 في%' LIMIT 50`);
  await q('Material.name ILIKE', `SELECT id FROM "Material" WHERE name ILIKE '%شرح 4321 للمحاضرات%' LIMIT 50`);
  await q('Question.prompt ILIKE', `SELECT id FROM "Question" WHERE prompt ILIKE '%الدالة 4321%' AND "isApproved" = true LIMIT 50`);
  await c.end();
}

main().catch((e) => { console.error(e.message); process.exit(1); });
