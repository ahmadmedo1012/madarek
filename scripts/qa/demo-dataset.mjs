#!/usr/bin/env node
/**
 * r357 L8 — the university-demo dataset (ONE command, isolated database).
 *
 * What it builds (deterministic, mulberry32(2026)):
 *   · On top of the existing fictional corpus (مؤسسة مدارك النموذجية —
 *     the university, مؤسسة الأندلس التعليمية — the school):
 *     +3 university faculties / +6 departments, +16 teachers,
 *     +36 courses with offerings, **380 university students** and
 *     **60 school students** — all clearly fake: emails bulk*@demo.madarek.ly,
 *     reg numbers DM26-#####/AD26-#####, phones in the 0915xxxxxx demo block.
 *   · 2–4 course enrollments per university student (grades/attendance
 *     surfaces get volume).
 *   · Idempotent (create-once): a second run is a no-op.
 *   · --reset: deletes ONLY this cohort (bulk*@demo.madarek.ly users +
 *     demodata-* faculties/departments/courses/offerings) — surgical,
 *     the curated corpus and the @test.ly seats are never touched.
 *
 * SAFETY (the r357 L8 demo-data law): REFUSES to run against anything
 * except 127.0.0.1/localhost or the dedicated Neon branch endpoint
 * ep-still-wildflower-b9w5zc5q (branch demo-dataset of project ULARA).
 * Production (ep-icy-mode-b9d573ot) is named-refused explicitly.
 *
 * Usage:
 *   DATABASE_URL='postgresql://neondb_owner:…@ep-still-wildflower-b9w5zc5q-pooler.c-7.eu-central-1.aws.neon.tech/neondb?sslmode=require' \
 *     node scripts/qa/demo-dataset.mjs            # seed
 *     node scripts/qa/demo-dataset.mjs --reset    # remove the cohort
 *   Local rehearsal: point DATABASE_URL at a fresh local DB — the script
 *   applies migrations + the full curated seed first (it detects the
 *   empty database), then tops up.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import argon2 from 'argon2';
import { PrismaClient, Role, Gender } from '../../backend/node_modules/@prisma/client/index.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BACKEND = path.join(HERE, '..', '..', 'backend');
const DEMO_ENDPOINT = 'ep-still-wildflower-b9w5zc5q'; // branch demo-dataset (project ULARA)
const PROD_ENDPOINT = 'ep-icy-mode-b9d573ot'; // production main — NEVER

const url = process.env.DATABASE_URL ?? '';
const host = /^postgres(ql)?:\/\/[^@]*@([^:/]+)/.exec(url)?.[2] ?? '';
const isLocal = /^(127\.0\.0\.1|localhost)(\b|$)/.test(host);
const isDemoBranch = host.startsWith(DEMO_ENDPOINT);
if (!url) {
  console.error('REFUSING: DATABASE_URL is not set');
  process.exit(2);
}
if (host.startsWith(PROD_ENDPOINT)) {
  console.error('REFUSING: this is PRODUCTION — the demo dataset never touches it. Point DATABASE_URL at the demo-dataset branch (' + DEMO_ENDPOINT + '-pooler…) or a local database.');
  process.exit(2);
}
if (!isLocal && !isDemoBranch) {
  console.error('REFUSING: host ' + host + ' is neither 127.0.0.1/localhost nor the demo-dataset branch endpoint — the r357 L8 demo-data law.');
  process.exit(2);
}

const prisma = new PrismaClient();

/* ── deterministic PRNG ─────────────────────────────────────────── */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pad = (n, w) => String(n).padStart(w, '0');

const MALE = ['أحمد', 'محمد', 'عبدالسلام', 'يوسف', 'إبراهيم', 'عمر', 'سالم', 'خالد', 'مصطفى', 'علي', 'المهدي', 'يونس', 'زكريا', 'عبدالله', 'مراد', 'ناجي', 'رمضان', 'الطيب'];
const FEMALE = ['فاطمة', 'عائشة', 'مريم', 'نورة', 'ليلى', 'هدى', 'سعاد', 'أسماء', 'زينب', 'رقية', 'شريفة', 'فوزية', 'عزيزة', 'نجاة', 'سلوى', 'أمل', 'سلمى', 'إيمان'];
const FAMILY = ['الزروق', 'البرعصي', 'الفيتوري', 'المنصوري', 'الشريف', 'العبار', 'الغويل', 'الحسادي', 'المعموري', 'الجبالي', 'الورفلي', 'الترابلسي', 'الزنتاني', 'الككلي', 'الرياني', 'السويحلي', 'الغيطة', 'أبوذر', 'الحمروني', 'المصري'];
const CITY = ['طرابلس', 'بنغازي', 'مصراتة', 'البيضاء', 'سبها', 'الزاوية', 'زليتن', 'درنة'];
const COURSE_WORDS = ['مقدمة في', 'أساسيات', 'تحليل', 'تصميم', 'برمجة', 'قواعد', 'شبكات', 'رياضيات', 'إحصاء', 'فيزياء', 'كيمياء', 'أحياء', 'محاسبة', 'اقتصاد', 'إدارة', 'قانون', 'نحو', 'تشريح', 'فسيولوجيا', 'أمراض'];
const COURSE_TAILS = ['الخوارزميات', 'البيانات', 'الشبكات', 'المنطق', 'المعاملات', 'الميكانيكا', 'الكهرباء', 'العضوية', 'الحيوية', 'المالية', 'الدولي', 'العام', 'الروائية', 'الاجتماعية', 'الطبية', 'السريرية', 'الإدارية', 'التجارية'];
const BULK_EMAIL_DOMAIN = '@demo.madarek.ly';
const BULK_PASSWORD = 'Madarek#Demo-2026';
const STAGES = ['ابتدائية', 'إعدادية', 'ثانوية'];
const GRADES = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس'];
const SECTIONS = ['أ', 'ب', 'ج'];

const run = (cmd, args, extraEnv = {}) => {
  const r = spawnSync(cmd, args, { cwd: BACKEND, stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  if (r.status !== 0) { console.error(`FAILED: ${cmd} ${args.join(' ')} (exit ${r.status})`); process.exit(1); }
};

async function reset() {
  const bulkUsers = await prisma.user.findMany({ where: { email: { startsWith: 'bulk', endsWith: BULK_EMAIL_DOMAIN } }, select: { id: true } });
  const ids = bulkUsers.map((u) => u.id);
  const t0 = Date.now();
  const deleted = { enrollments: 0, offerings: 0, courses: 0, teacherProfiles: 0, studentProfiles: 0, memberships: 0, users: 0, departments: 0, faculties: 0 };
  deleted.enrollments = await prisma.enrollment.deleteMany({ where: { OR: [{ studentId: { in: ids } }, { offeringId: { startsWith: 'demodata-' } }] } }).then((r) => r.count);
  deleted.offerings = await prisma.courseOffering.deleteMany({ where: { id: { startsWith: 'demodata-' } } }).then((r) => r.count);
  deleted.courses = await prisma.course.deleteMany({ where: { id: { startsWith: 'demodata-' } } }).then((r) => r.count);
  if (ids.length) {
    deleted.teacherProfiles = await prisma.teacherProfile.deleteMany({ where: { userId: { in: ids } } }).then((r) => r.count);
    deleted.studentProfiles = await prisma.studentProfile.deleteMany({ where: { userId: { in: ids } } }).then((r) => r.count);
    deleted.memberships = await prisma.membership.deleteMany({ where: { userId: { in: ids } } }).then((r) => r.count);
    deleted.users = await prisma.user.deleteMany({ where: { id: { in: ids } } }).then((r) => r.count);
  }
  deleted.departments = await prisma.department.deleteMany({ where: { id: { startsWith: 'demodata-' } } }).then((r) => r.count);
  deleted.faculties = await prisma.faculty.deleteMany({ where: { id: { startsWith: 'demodata-' } } }).then((r) => r.count);
  console.log(`RESET in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${JSON.stringify(deleted)}`);
}

async function main() {
  const mode = process.argv[2] ?? '';
  if (mode === '--reset') { await reset(); return; }

  const t0 = Date.now();
  /* 1 — schema (no-op when up to date; fresh on a local rehearsal DB) */
  run('npx', ['prisma', 'migrate', 'deploy'], { DATABASE_URL: url });

  /* 2 — the curated corpus + @test.ly seats, ONLY when the DB is empty */
  const existing = await prisma.user.count();
  if (existing < 5) {
    console.log('empty database — running the curated seed first (MADAREK_SEED_FORCE=1)…');
    run('npm', ['run', 'prisma:seed'], { DATABASE_URL: url, MADAREK_SEED_FORCE: '1' });
  }

  /* 3 — idempotence: the cohort is create-once */
  const already = await prisma.user.count({ where: { email: { startsWith: 'bulk', endsWith: BULK_EMAIL_DOMAIN } } });
  if (already > 0) {
    console.log(`demo dataset already present (${already} bulk users) — re-run with --reset to rebuild. Nothing written.`);
    return;
  }

  const uni = await prisma.institution.findUnique({ where: { slug: 'madarek-demo' } });
  const school = await prisma.institution.findUnique({ where: { slug: 'alandalus-demo' } });
  if (!uni || !school) { console.error('REFUSING: the fictional corpus (madarek-demo/alandalus-demo) is absent — run the curated seed first'); process.exit(2); }
  const hash = await argon2.hash(BULK_PASSWORD);

  /* 4 — the university tree: +3 faculties / 6 departments (fac↔dep pairs) */
  const uniFaculties = await prisma.faculty.findMany({ where: { institutionId: uni.id }, select: { id: true, departments: { select: { id: true } } } });
  const uniPairs = uniFaculties.flatMap((f) => f.departments.map((d) => ({ facId: f.id, depId: d.id })));
  const newFacs = [['كلية الطب البشري', ['قسم الطب العام', 'قسم الجراحة']], ['كلية الهندسة', ['قسم الهندسة المدنية', 'قسم الهندسة الكهربائية']], ['كلية إدارة الأعمال', ['قسم المحاسبة', 'قسم التسويق']]];
  for (let f = 0; f < newFacs.length; f++) {
    const [fname, dnames] = newFacs[f];
    const fac = await prisma.faculty.create({ data: { id: `demodata-fac-${f}`, name: fname, institutionId: uni.id, city: 'طرابلس' } });
    for (let d = 0; d < dnames.length; d++) {
      const dep = await prisma.department.create({ data: { id: `demodata-dep-${f}-${d}`, name: dnames[d], facultyId: fac.id } });
      uniPairs.push({ facId: fac.id, depId: dep.id });
    }
  }

  /* 5 — +16 teachers */
  const teacherIds = [];
  for (let i = 0; i < 16; i++) {
    const uid = `bulk-teacher-${pad(i, 2)}`;
    const first = pick(MALE);
    const last = pick(FAMILY);
    const depId = uniPairs[i % uniPairs.length].depId;
    await prisma.user.create({ data: { id: uid, email: `bulk-teacher-${pad(i, 2)}${BULK_EMAIL_DOMAIN}`, passwordHash: hash, firstName: `د. ${first}`, lastName: last, role: Role.TEACHER, emailVerifiedAt: new Date(), memberships: { create: { id: `demodata-mem-teacher-${pad(i, 2)}`, institutionId: uni.id, role: Role.TEACHER } } } });
    await prisma.teacherProfile.create({ data: { id: `demodata-tprof-${pad(i, 2)}`, userId: uid, membershipId: `demodata-mem-teacher-${pad(i, 2)}`, specialty: pick(COURSE_TAILS), departmentId: depId } });
    teacherIds.push(uid);
  }

  /* 6 — +36 courses + offerings */
  const offerings = [];
  for (let i = 0; i < 36; i++) {
    const cid = `demodata-course-${pad(i, 2)}`;
    await prisma.course.create({ data: { id: cid, code: `DM${pad(201 + i, 3)}`, name: `${pick(COURSE_WORDS)} ${pick(COURSE_TAILS)}`, institutionId: uni.id, departmentId: uniPairs[i % uniPairs.length].depId } });
    const oid = `demodata-offering-${pad(i, 2)}`;
    await prisma.courseOffering.create({ data: { id: oid, courseId: cid, teacherId: teacherIds[i % teacherIds.length], term: '2026-FALL' } });
    offerings.push(oid);
  }

  /* 7 — students: 380 university + 60 school, batched */
  const schoolFac = await prisma.faculty.findFirst({ where: { institutionId: school.id }, select: { id: true, departments: { select: { id: true }, take: 1 } } });
  let schoolPair = schoolFac && schoolFac.departments.length ? { facId: schoolFac.id, depId: schoolFac.departments[0].id } : null;
  if (!schoolPair) {
    const fac = await prisma.faculty.create({ data: { id: 'demodata-fac-school', name: 'كلية المرحلة العامة', institutionId: school.id, city: 'طرابلس' } });
    const dep = await prisma.department.create({ data: { id: 'demodata-dep-school', name: 'قسم المرحلة العامة', facultyId: fac.id } });
    schoolPair = { facId: fac.id, depId: dep.id };
  }

  const BATCH = 110;
  const makeStudent = (i, instId, facId, depId, regPrefix, isUni) => {
    const female = rand() < 0.5;
    const first = female ? pick(FEMALE) : pick(MALE);
    const last = pick(FAMILY);
    const father = pick(MALE);
    const uid = isUni ? `bulk-u-${pad(i, 4)}` : `bulk-s-${pad(i, 4)}`;
    const mid = isUni ? `demodata-mem-u-${pad(i, 4)}` : `demodata-mem-s-${pad(i, 4)}`;
    const hasPhone = rand() < 0.6;
    const phoneLocal = `915${pad(Math.floor(rand() * 1000000), 6)}`; // 0915xxxxxx — the demo block
    const dobYear = isUni ? 2001 + (i % 6) : 2010 + (i % 5);
    const user = {
      id: uid, email: `${isUni ? 'bulk-u' : 'bulk-s'}${pad(i, 4)}${BULK_EMAIL_DOMAIN}`,
      passwordHash: hash, firstName: first, lastName: last, role: Role.STUDENT, emailVerifiedAt: new Date(),
    };
    const membership = { id: mid, userId: uid, institutionId: instId, role: Role.STUDENT };
    const profile = {
      id: `demodata-prof-${isUni ? 'u' : 's'}-${pad(i, 4)}`, userId: uid, membershipId: mid, institutionId: instId,
      universityId: `${regPrefix}-${pad(i + 1, 5)}`,
      facultyId: facId, departmentId: depId,
      year: 1 + (i % 4), gpa: Math.round((1.5 + rand() * 2.5) * 100) / 100,
      nameAr: `${first} ${father} ${last}`, fatherName: father, grandfatherName: pick(MALE),
      gender: female ? Gender.FEMALE : Gender.MALE,
      city: pick(CITY), birthPlace: pick(CITY),
      dateOfBirth: new Date(dobYear, i % 12, 1 + (i % 28)),
      ...(hasPhone ? { studentPhone: `0${phoneLocal}`, studentPhoneNormalized: `218${phoneLocal}` } : {}),
      guardianName: `${pick(MALE)} ${last}`, guardianRelationship: 'أب', guardianPhone: `0925${pad(Math.floor(rand() * 1000000), 6)}`,
      ...(isUni ? { studyType: rand() < 0.75 ? 'MORNING' : 'EVENING', enrollmentStatus: 'ACTIVE', admissionYear: 2022 + (i % 4) }
        : { stage: pick(STAGES), grade: pick(GRADES), section: pick(SECTIONS), previousSchool: 'مدرسة العرض النموذجية', transferStatus: 'مستجد' }),
    };
    return { user, membership, profile };
  };
  const seedBatch = async (count, instId, pairs, regPrefix, isUni) => {
    for (let base = 0; base < count; base += BATCH) {
      const users = [], memberships = [], profiles = [];
      for (let i = base; i < Math.min(base + BATCH, count); i++) {
        const pair = pairs[i % pairs.length];
        const s = makeStudent(i, instId, pair.facId, pair.depId, regPrefix, isUni);
        users.push(s.user); memberships.push(s.membership); profiles.push(s.profile);
      }
      await prisma.user.createMany({ data: users });
      await prisma.membership.createMany({ data: memberships });
      await prisma.studentProfile.createMany({ data: profiles });
    }
  };
  await seedBatch(380, uni.id, uniPairs, 'DM26', true);
  await seedBatch(60, school.id, [schoolPair], 'AD26', false);

  /* 8 — enrollments: 2–4 offerings per university student */
  const uniStudentIds = await prisma.user.findMany({ where: { email: { startsWith: 'bulk-u', endsWith: BULK_EMAIL_DOMAIN } }, select: { id: true } });
  for (let base = 0; base < uniStudentIds.length; base += 200) {
    const rows = [];
    for (const s of uniStudentIds.slice(base, base + 200)) {
      const n = 2 + Math.floor(rand() * 3);
      const chosen = new Set();
      while (chosen.size < n) chosen.add(offerings[Math.floor(rand() * offerings.length)]);
      for (const oid of chosen) rows.push({ studentId: s.id, offeringId: oid, progressPct: Math.floor(rand() * 100) });
    }
    await prisma.enrollment.createMany({ data: rows, skipDuplicates: true });
  }

  const counts = {
    users: await prisma.user.count(),
    students: await prisma.studentProfile.count(),
    teachers: await prisma.teacherProfile.count(),
    courses: await prisma.course.count(),
    offerings: await prisma.courseOffering.count(),
    enrollments: await prisma.enrollment.count(),
  };
  console.log(`DEMO DATASET SEEDED in ${((Date.now() - t0) / 1000).toFixed(1)}s: ${JSON.stringify(counts)}`);
  console.log(`bulk cohort: 380 university + 60 school students + 16 teachers — password ${BULK_PASSWORD} (bulk-u0000@demo.madarek.ly …). Reset: node scripts/qa/demo-dataset.mjs --reset`);
}

main()
  .catch((e) => { console.error('FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
