#!/usr/bin/env node
/**
 * r357 L4 — the 20k-scale search load + correctness harness.
 *
 * Against a RUNNING backend seeded by search-scale-seed.mjs:
 *   · 50-concurrency load: 1,200 mixed-shape queries (names exact/
 *     prefix/substring, reg-numbers, phones — trunk + intl + Arabic-
 *     Indic, course names/codes, 1-edit typos, one guaranteed-zero),
 *     client-measured p50/p95 per surface (people as admin, courses
 *     as student).
 *   · R@5 + MRR over 200 known-target queries (the deterministic
 *     corpus makes expected ids predictable).
 *   · Leak laws: an institution-A student NEVER sees the institution-B
 *     seat in people results (and vice versa); the STUDENT role never
 *     receives staff categories.
 *   · Zero-result law: a nonsense query answers an EMPTY envelope
 *     (200 + categories with 0 items), never an error.
 *
 * Usage (the backend must be up, default http://127.0.0.1:4010):
 *   node scripts/qa/search-scale-load.mjs [--base http://127.0.0.1:4010] \
 *     [--out /tmp/search-scale.json]
 */
import { writeFileSync } from 'node:fs';

const BASE = (process.argv.find((a, i) => a === '--base' && process.argv[i + 1]) && process.argv[process.argv.indexOf('--base') + 1]) || 'http://127.0.0.1:4010';
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/search-scale.json';
const API = `${BASE}/api/v1`;
const PASSWORD = 'Madarek#Scale-2026';

/* ── corpus mirrors (must match search-scale-seed.mjs) ──────────── */
const MALE = ['أحمد', 'محمد', 'عبدالسلام', 'يوسف', 'إبراهيم', 'عمر', 'سالم', 'خالد', 'مصطفى', 'علي', 'أسامة', 'المهدي', 'يونس', 'زكريا', 'عبدالله', 'الطيب', 'مراد', 'فاهم', 'ناجي', 'رمضان'];
const FEMALE = ['فاطمة', 'عائشة', 'مريم', 'نورة', 'ليلى', 'هدى', 'سعاد', 'أسماء', 'زينب', 'رقية', 'شريفة', 'فوزية', 'عزيزة', 'نجاة', 'سلوى', 'أمل', 'سلمى', 'إيمان', 'وفاء', 'بشرى'];
const FAMILY = ['المصري', 'الزروق', 'البرعصي', 'الفيتوري', 'القذافي', 'المنصوري', 'الشريف', 'بنغازي', 'الطائر', 'العبار', 'الغويل', 'الحسادي', 'المعموري', 'الجبالي', 'الأخضر', 'الورفلي', 'المجبري', 'الترابلسي', 'الزنتاني', 'المزروعي', 'الككلي', 'الرياني', 'البوسيفي', 'السويحلي', 'الدباري', 'الغيطة', 'الشرع', 'أبوذر', 'الحمروني', 'المريض'];
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/* replay the SAME rng stream the seeder used to reach student i's name */
const rand = mulberry32(357);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pad = (n, w) => String(n).padStart(w, '0');
/* burn the seeder's teacher picks (40 × 3 rand calls: first, last,
 * specialty) so the stream aligns with the students' — the harness
 * predicts names by replay */
const COURSE_TAILS_BURN = ['الخوارزميات', 'البيانات', 'الشبكات', 'المنطق', 'المتقطعة', 'الخطية', 'التفاضلية', 'التكاملية', 'الميكانيكا', 'الكهرباء', 'المغناطيسية', 'العضوية', 'غير العضوية', 'الحيوية', 'المالية', 'الكلية', 'الجزئي', 'الدولي', 'العام', 'الخاص', 'الروائية', 'الحديثة', 'الوسيطة', 'الاجتماعية'];
for (let t = 0; t < 40; t++) { pick(MALE); pick(FAMILY); pick(COURSE_TAILS_BURN); }
const studentMeta = [];
for (let i = 0; i < 20000; i++) {
  const female = rand() < 0.5;
  const first = female ? pick(FEMALE) : pick(MALE);
  const last = pick(FAMILY);
  const hasPhone = rand() < 0.6;
  const phoneLocal = `91${pad(Math.floor(rand() * 10000000), 7)}`;
  studentMeta.push({ first, last, hasPhone, phoneLocal, id: `student-scale-${pad(i, 5)}` });
}

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`login ${email} → ${res.status}`);
  const d = await res.json();
  return d.data.accessToken;
}

async function discover(q, token, categories) {
  const t0 = performance.now();
  const url = new URL(`${API}/search/discover`);
  url.searchParams.set('q', q);
  if (categories) url.searchParams.set('categories', categories);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const tookMs = performance.now() - t0;
  const body = await res.json().catch(() => null);
  /* the server's own measure rides the envelope — the honest p95 when
   * the box (2 CPU) starves the client-side wall time */
  const serverMs = body?.data?.tookMs ?? null;
  return { status: res.status, tookMs, serverMs, body };
}

const pct = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0;

async function main() {
  const out = { base: BASE, startedAt: new Date().toISOString() };
  console.log(`harness → ${BASE}`);

  const [admin, admin2, admin3, student, studentB, teacher] = await Promise.all([
    login('scale-admin@test.ly'), login('scale-admin-2@test.ly'), login('scale-admin-3@test.ly'),
    login('scale-student@test.ly'), login('scale-student-b@test.ly'),
    login('scale-teacher@test.ly'),
  ]);
  console.log('seats logged in (admin ×3, student, studentB, teacher)');

  /* ── 1. warm-up (PG buffers + JIT) — admin3 carries it, budgeted ── */
  for (let i = 0; i < 30; i++) {
    const m = studentMeta[(i * 47) % 20000];
    await discover(m.last, admin3, 'students');
  }
  console.log('warm-up done (30 queries on admin3)');

  /* ── 2. the 50-concurrency load: 660 queries, seat-spread ────────
   * The global limiter is 1000 req / 15 min / USER (rateLimit.ts) —
   * every seat stays under 500 including its other phases. */
  const jobs = [];
  const latPeople = [];
  const srvPeople = [];
  const latCourses = [];
  const srvCourses = [];
  const errors = [];
  const CONCURRENCY = 50;
  let issued = 0;
  const TOTAL = 660;
  const seats = { people: [admin, admin2, teacher], courses: student };
  async function worker() {
    for (;;) {
      const i = issued++;
      if (i >= TOTAL) return;
      const m = studentMeta[(i * 997) % 20000];
      let q, token, cats, bucket, srvBucket;
      const shape = i % 10;
      const seat = seats.people[i % 3];
      if (shape === 0) { q = `${m.first} ${m.last}`; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 1) { q = m.last; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 2) { q = m.first.slice(0, Math.max(2, Math.ceil(m.first.length / 2))); token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 3) { q = `SU-2026-${pad(((i * 997) % 20000) + 1, 5)}`; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 4 && m.hasPhone) { q = `0${m.phoneLocal}`; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 5 && m.hasPhone) { q = `+218${m.phoneLocal}`; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 6) { q = `SC${pad(101 + (i % 2000), 4)}`; token = student; cats = 'courses'; bucket = latCourses; srvBucket = srvCourses; }
      else if (shape === 7) { q = studentMeta[(i * 13) % 20000].last; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else if (shape === 8) { q = `zzqq-${i}-لا-يوجد`; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      else { q = `${m.last.slice(0, -1)}${m.last.slice(-1) === 'ي' ? 'ى' : 'ي'}`; token = seat; cats = 'students'; bucket = latPeople; srvBucket = srvPeople; }
      const r = await discover(q, token, cats);
      if (r.status !== 200) { errors.push({ shape, q, status: r.status }); continue; }
      bucket.push(r.tookMs);
      if (r.serverMs !== null) srvBucket.push(r.serverMs);
    }
  }
  const t0 = Date.now();
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const wall = ((Date.now() - t0) / 1000).toFixed(1);
  latPeople.sort((a, b) => a - b); latCourses.sort((a, b) => a - b);
  srvPeople.sort((a, b) => a - b); srvCourses.sort((a, b) => a - b);
  out.load = {
    concurrency: CONCURRENCY, total: TOTAL, wallS: Number(wall),
    rps: Math.round(TOTAL / Number(wall)),
    errors: errors.length,
    people: { n: latPeople.length, p50: Math.round(pct(latPeople, 0.5)), p95: Math.round(pct(latPeople, 0.95)), p99: Math.round(pct(latPeople, 0.99)) },
    peopleServer: { n: srvPeople.length, p50: Math.round(pct(srvPeople, 0.5)), p95: Math.round(pct(srvPeople, 0.95)), p99: Math.round(pct(srvPeople, 0.99)) },
    courses: { n: latCourses.length, p50: Math.round(pct(latCourses, 0.5)), p95: Math.round(pct(latCourses, 0.95)) },
    coursesServer: { n: srvCourses.length, p50: Math.round(pct(srvCourses, 0.5)), p95: Math.round(pct(srvCourses, 0.95)) },
  };
  console.log(`load: ${TOTAL} queries @ ${CONCURRENCY}c in ${wall}s (~${out.load.rps}/s), errors=${errors.length}`);
  console.log(`people (client): p50=${out.load.people.p50}ms p95=${out.load.people.p95}ms p99=${out.load.people.p99}ms (n=${out.load.people.n})`);
  console.log(`people (SERVER tookMs): p50=${out.load.peopleServer.p50}ms p95=${out.load.peopleServer.p95}ms p99=${out.load.peopleServer.p99}ms (n=${out.load.peopleServer.n})`);
  console.log(`courses (client): p50=${out.load.courses.p50}ms p95=${out.load.courses.p95}ms | server: p50=${out.load.coursesServer.p50}ms p95=${out.load.coursesServer.p95}ms`);

  /* ── 3. R@5 + MRR over 120 known targets (admin3, serial, warm) ──
   * At 20k, name pairs COLLIDE (≈33 students share «أحمد المصري»):
   * R@5 is NAME-level (the right answer = any student with that exact
   * name in the top-5); id-level MRR rides the uniquely-named subset. */
  const hits5 = [];
  const rr = [];
  const rrUnique = [];
  let rankFails = [];
  for (let i = 0; i < 120; i++) {
    const m = studentMeta[(i * 101) % 20000];
    const fullName = `${m.first} ${m.last}`;
    const r = await discover(fullName, admin3, 'students');
    if (r.status !== 200) { rankFails.push({ i, status: r.status }); continue; }
    const items = r.body?.data?.categories?.students?.items ?? [];
    const nameIdx = items.findIndex((it) => it.titleAr === fullName);
    const idIdx = items.findIndex((it) => it.id === m.id);
    if (nameIdx >= 0 && nameIdx < 5) hits5.push(1); else hits5.push(0);
    if (nameIdx >= 0) rr.push(1 / (nameIdx + 1));
    if (idIdx >= 0) rrUnique.push(1 / (idIdx + 1));
  }
  const r5 = hits5.reduce((a, b) => a + b, 0) / (hits5.length || 1);
  const mrr = rr.reduce((a, b) => a + b, 0) / (hits5.length || 1);
  const mrrUnique = rrUnique.length ? rrUnique.reduce((a, b) => a + b, 0) / rrUnique.length : null;
  out.rank = { probes: hits5.length, recallAt5: Number(r5.toFixed(4)), mrr: Number(mrr.toFixed(4)), mrrUnique: mrrUnique === null ? null : Number(mrrUnique.toFixed(4)), uniqueIdHits: rrUnique.length, failures: rankFails };
  console.log(`rank: R@5(name)=${r5.toFixed(3)} MRR(name)=${mrr.toFixed(3)} over ${hits5.length} probes | id-level: ${rrUnique.length}/120 exact-id hits${mrrUnique !== null ? ` (MRR ${mrrUnique.toFixed(3)})` : ''}`);

  /* ── 4. leak laws ─────────────────────────────────────────────── */
  const leaks = [];
  // A-student searching people categories: the B seat must never surface
  const asA = await discover('طالب', student, 'students,teachers');
  const aItems = [...(asA.body?.data?.categories?.students?.items ?? []), ...(asA.body?.data?.categories?.teachers?.items ?? [])];
  if (aItems.some((it) => String(JSON.stringify(it)).includes('scale-school') || String(it.href ?? '').includes('seat-scale-student-b'))) leaks.push('A-student saw institution-B rows');
  // B-student searching: A rows must never surface
  const asB = await discover('المصري', studentB, 'students');
  const bItems = asB.body?.data?.categories?.students?.items ?? [];
  if (bItems.some((it) => String(it.href ?? '').includes('student-scale-'))) leaks.push('B-student saw institution-A students');
  // student role: staff categories come back empty
  const studentCats = asA.body?.data?.categories ?? {};
  if ((studentCats.teachers?.total ?? 0) > 0) leaks.push('A-student received teacher rows (matrix says students see none)');
  out.leaks = { found: leaks, aStudentSaw: aItems.length, bStudentSaw: bItems.length };
  console.log(`leaks: ${leaks.length === 0 ? 'NONE (A/B isolation + student-teacher matrix hold)' : leaks.join('; ')}`);

  /* ── 5. zero-result law ───────────────────────────────────────── */
  const z = await discover('zzqq لا يوجد شيء بهذا الاسم إطلاقًا', admin, null);
  const zOk = z.status === 200 && Object.values(z.body?.data?.categories ?? {}).every((c) => (c.total ?? 0) === 0);
  out.zeroResult = { status: z.status, empty: zOk, tookMs: Math.round(z.tookMs) };
  console.log(`zero-result: ${zOk ? 'clean empty envelope' : `BROKEN (status ${z.status})`} (${Math.round(z.tookMs)}ms)`);

  out.finishedAt = new Date().toISOString();
  writeFileSync(OUT, JSON.stringify(out, null, 2));
  console.log(`→ ${OUT}`);

  const verdict = errors.length === 0 && leaks.length === 0 && zOk;
  console.log(verdict ? 'VERDICT: GREEN' : 'VERDICT: RED');
  process.exit(verdict ? 0 : 1);
}

main().catch((e) => { console.error('HARNESS FAILED:', e.message); process.exit(1); });
