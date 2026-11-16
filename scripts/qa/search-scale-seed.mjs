#!/usr/bin/env node
/**
 * r357 L4 — the 20k-student search-scale seed (THROWAWARY, local PG only).
 *
 * Seeds a deterministic corpus into an EMPTY database (the local
 * embedded PG booted by tools/boot-pg.sh, database madarek_scale):
 *   · 2 institutions (A = the scale tenant, B = the leak-test tenant)
 *   · 5 faculties / 20 departments (A), 1/2 (B)
 *   · 20,000 students (User + Membership + StudentProfile) — Libyan
 *     name pools, reg-numbers, ~60% phones (E.164 pairs), DOBs
 *   · 40 teachers + TeacherProfiles, 2,000 courses + one offering each
 *   · 4 documented test seats: scale-student/teacher/admin @test.ly
 *     (institution A) + scale-student-b@test.ly (institution B) —
 *     password Madarek#Scale-2026 (argon2, same lib as the app)
 *
 * Deterministic: mulberry32(357) — the same run seeds the same corpus,
 * so the load harness (search-scale-load.mjs) can predict expected ids
 * for the recall probes and the leak assertions.
 *
 * SAFETY: refuses to run against anything but 127.0.0.1/localhost —
 * this corpus must NEVER touch production (the r357 L8 demo-data law,
 * applied here too).
 *
 * Usage:
 *   DATABASE_URL=postgresql://madarek@127.0.0.1:5433/madarek_scale \
 *     node scripts/qa/search-scale-seed.mjs
 */
import argon2 from 'argon2';
import { PrismaClient, Role, Gender, InstitutionKind } from '../../backend/node_modules/@prisma/client/index.js';

const url = process.env.DATABASE_URL ?? '';
if (!/^postgres(ql)?:\/\/[^@]*@?(127\.0\.0\.1|localhost)/.test(url)) {
  console.error('REFUSING: DATABASE_URL is not 127.0.0.1/localhost — the scale corpus never leaves this box');
  process.exit(2);
}
if (!url.includes('madarek_scale')) {
  console.error('REFUSING: DATABASE_URL does not name madarek_scale — point at the throwaway database');
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
const rand = mulberry32(357);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pad = (n, w) => String(n).padStart(w, '0');

/* ── the name pools (Libyan-shaped, synthetic) ──────────────────── */
const MALE = ['أحمد', 'محمد', 'عبدالسلام', 'يوسف', 'إبراهيم', 'عمر', 'سالم', 'خالد', 'مصطفى', 'علي', 'أسامة', 'المهدي', 'يونس', 'زكريا', 'عبدالله', 'الطيب', 'مراد', 'فاهم', 'ناجي', 'رمضان'];
const FEMALE = ['فاطمة', 'عائشة', 'مريم', 'نورة', 'ليلى', 'هدى', 'سعاد', 'أسماء', 'زينب', 'رقية', 'شريفة', 'فوزية', 'عزيزة', 'نجاة', 'سلوى', 'أمل', 'سلمى', 'إيمان', 'وفاء', 'بشرى'];
const FAMILY = ['المصري', 'الزروق', 'البرعصي', 'الفيتوري', 'القذافي', 'المنصوري', 'الشريف', 'بنغازي', 'الطائر', 'العبار', 'الغويل', 'الحسادي', 'المعموري', 'الجبالي', 'الأخضر', 'الورفلي', 'المجبري', 'الترابلسي', 'الزنتاني', 'المزروعي', 'الككلي', 'الرياني', 'البوسيفي', 'السويحلي', 'الدباري', 'الغيطة', 'الشرع', 'أبوذر', 'الحمروني', 'المريض'];
const COURSE_WORDS = ['مقدمة في', 'أساسيات', 'تحليل', 'تصميم', 'برمجة', 'قواعد بيانات', 'شبكات', 'رياضيات', 'إحصاء', 'فيزياء', 'كيمياء', 'أحياء', 'محاسبة', 'اقتصاد', 'إدارة', 'قانون', 'لغة', 'تاريخ', 'جغرافيا', 'علم نفس', 'تربية', 'هندسة', 'طب', 'صيدلة', 'تمريض'];
const COURSE_TAILS = ['الخوارزميات', 'البيانات', 'الشبكات', 'المنطق', 'المتقطعة', 'الخطية', 'التفاضلية', 'التكاملية', 'الميكانيكا', 'الكهرباء', 'المغناطيسية', 'العضوية', 'غير العضوية', 'الحيوية', 'المالية', 'الكلية', 'الجزئي', 'الدولي', 'العام', 'الخاص', 'الروائية', 'الحديثة', 'الوسيطة', 'الاجتماعية'];

const INSTITUTION_A = 'inst-scale-a';
const INSTITUTION_B = 'inst-scale-b';
const TEST_PASSWORD = 'Madarek#Scale-2026';

async function main() {
  const t0 = Date.now();
  const existing = await prisma.user.count();
  if (existing > 0) {
    console.error(`REFUSING: database is not empty (${existing} users) — drop/recreate madarek_scale first`);
    process.exit(2);
  }

  const hash = await argon2.hash(TEST_PASSWORD);

  /* institutions + org tree */
  await prisma.institution.createMany({
    data: [
      { id: INSTITUTION_A, name: 'جامعة المقياس التقريبية', nameEn: 'Synthetic Scale University', slug: 'scale-university', kind: InstitutionKind.UNIVERSITY },
      { id: INSTITUTION_B, name: 'مدرسة النطاق الثانية', nameEn: 'Synthetic Scale School', slug: 'scale-school', kind: InstitutionKind.SCHOOL },
    ],
  });
  const faculties = [];
  for (let f = 0; f < 5; f++) {
    const id = `fac-scale-${f}`;
    await prisma.faculty.create({ data: { id, name: `كلية ${COURSE_WORDS[f * 4] ?? "العلوم"} ${f + 1}`, nameEn: `Faculty ${f + 1}`, institutionId: INSTITUTION_A, city: "طرابلس" } });
    faculties.push(id);
  }
  await prisma.faculty.create({ data: { id: 'fac-scale-b', name: 'كلية النطاق الثانية', institutionId: INSTITUTION_B, city: 'بنغازي' } });
  const departments = [];
  for (let f = 0; f < 5; f++) {
    for (let d = 0; d < 4; d++) {
      const id = `dep-scale-${f}-${d}`;
      await prisma.department.create({ data: { id, name: `قسم ${COURSE_TAILS[(f * 4 + d) % COURSE_TAILS.length]}`, facultyId: faculties[f] } });
      departments.push(id);
    }
  }
  const depB = 'dep-scale-b';
  await prisma.department.create({ data: { id: depB, name: 'قسم النطاق', facultyId: 'fac-scale-b' } });

  /* teachers (40) — User + Membership + TeacherProfile */
  const teacherIds = [];
  for (let i = 0; i < 40; i++) {
    const uid = `teacher-scale-${pad(i, 3)}`;
    const mid = `mem-teacher-${pad(i, 3)}`;
    const first = pick(MALE);
    const last = pick(FAMILY);
    await prisma.user.create({ data: { id: uid, email: `scale-teacher-${i}@scale.test`, passwordHash: hash, firstName: first, lastName: last, role: Role.TEACHER, memberships: { create: { id: mid, institutionId: INSTITUTION_A, role: Role.TEACHER } } } });
    await prisma.teacherProfile.create({ data: { id: `tprof-scale-${pad(i, 3)}`, userId: uid, membershipId: mid, specialty: pick(COURSE_TAILS), departmentId: departments[i % departments.length] } });
    teacherIds.push(uid);
  }

  /* students — 20,000, batched createMany for speed */
  const BATCH = 2000;
  for (let base = 0; base < 20000; base += BATCH) {
    const users = [];
    const memberships = [];
    const profiles = [];
    for (let i = base; i < base + BATCH; i++) {
      const uid = `student-scale-${pad(i, 5)}`;
      const mid = `mem-student-${pad(i, 5)}`;
      const female = rand() < 0.5;
      const first = female ? pick(FEMALE) : pick(MALE);
      const last = pick(FAMILY);
      const depId = departments[i % departments.length];
      const facId = faculties[Math.floor((i % departments.length) / 4)];
      const hasPhone = rand() < 0.6;
      const phoneLocal = `91${pad(Math.floor(rand() * 10000000), 7)}`; // 091XXXXXXX-shaped
      users.push({
        id: uid, email: `student${i}@scale.test`, passwordHash: hash,
        firstName: first, lastName: last, role: Role.STUDENT,
      });
      memberships.push({
        id: mid, userId: uid, institutionId: INSTITUTION_A, role: Role.STUDENT,
      });
      profiles.push({
        id: `prof-scale-${pad(i, 5)}`, userId: uid, membershipId: mid,
        institutionId: INSTITUTION_A,
        universityId: `SU-2026-${pad(i + 1, 5)}`,
        facultyId: facId, departmentId: depId, year: 1 + (i % 5),
        nameAr: `${first} ${last}`,
        gender: female ? Gender.FEMALE : Gender.MALE,
        dateOfBirth: new Date(2000 + (i % 6), i % 12, 1 + (i % 28)),
        ...(hasPhone ? { studentPhone: `0${phoneLocal}`, studentPhoneNormalized: `218${phoneLocal}` } : {}),
      });
    }
    await prisma.user.createMany({ data: users });
    await prisma.membership.createMany({ data: memberships });
    await prisma.studentProfile.createMany({ data: profiles });
  }

  /* courses — 2,000 + one offering each */
  for (let base = 0; base < 2000; base += 500) {
    const courses = [];
    const offerings = [];
    for (let i = base; i < base + 500; i++) {
      const cid = `course-scale-${pad(i, 4)}`;
      courses.push({
        id: cid, code: `SC${pad(101 + i, 4)}`,
        name: `${pick(COURSE_WORDS)} ${pick(COURSE_TAILS)}`,
        nameEn: `Scale Course ${i}`,
        institutionId: INSTITUTION_A,
        departmentId: departments[i % departments.length],
      });
      offerings.push({
        id: `offering-scale-${pad(i, 4)}`, courseId: cid,
        teacherId: teacherIds[i % teacherIds.length],
        term: '2026-FALL',
      });
    }
    await prisma.course.createMany({ data: courses });
    await prisma.courseOffering.createMany({ data: offerings });
  }

  /* the documented seats (A: student/teacher/admin, B: student) */
  for (const [email, role, instId, first, last] of [
    ['scale-student@test.ly', Role.STUDENT, INSTITUTION_A, 'طالب', 'المقياس'],
    ['scale-teacher@test.ly', Role.TEACHER, INSTITUTION_A, 'مدرّس', 'المقياس'],
    ['scale-admin@test.ly', Role.ADMIN, INSTITUTION_A, 'مسجل', 'المقياس'],
    ['scale-admin-2@test.ly', Role.ADMIN, INSTITUTION_A, 'مسجل', 'الثاني'],
    ['scale-admin-3@test.ly', Role.ADMIN, INSTITUTION_A, 'مسجل', 'الثالث'],
    ['scale-student-b@test.ly', Role.STUDENT, INSTITUTION_B, 'طالب', 'النطاق'],
  ]) {
    const uid = `seat-${email.split('@')[0]}`;
    const mid = `mem-${email.split('@')[0]}`;
    await prisma.user.create({ data: { id: uid, email, passwordHash: hash, firstName: first, lastName: last, role: role, memberships: { create: { id: mid, institutionId: instId, role } } } });
    if (role === Role.STUDENT) {
      const depId = instId === INSTITUTION_A ? departments[0] : depB;
      const facId = instId === INSTITUTION_A ? faculties[0] : 'fac-scale-b';
      await prisma.studentProfile.create({ data: { id: `sprof-${uid}`, userId: uid, membershipId: mid, institutionId: instId, universityId: instId === INSTITUTION_A ? 'SU-2026-99999' : 'SS-2026-00001', facultyId: facId, departmentId: depId, nameAr: `${first} ${last}` } });
    }
    if (role === Role.TEACHER) {
      await prisma.teacherProfile.create({ data: { id: `tprof-${uid}`, userId: uid, membershipId: mid, specialty: 'المقياس', departmentId: departments[0] } });
    }
  }

  const counts = {
    users: await prisma.user.count(),
    students: await prisma.studentProfile.count(),
    teachers: await prisma.teacherProfile.count(),
    courses: await prisma.course.count(),
    offerings: await prisma.courseOffering.count(),
  };
  console.log(`SEEDED in ${((Date.now() - t0) / 1000).toFixed(1)}s:`, JSON.stringify(counts));
  console.log('seats: scale-student/teacher/admin@test.ly + scale-student-b@test.ly (institution B) — password Madarek#Scale-2026');
}

main()
  .catch((e) => { console.error('SEED FAILED:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
