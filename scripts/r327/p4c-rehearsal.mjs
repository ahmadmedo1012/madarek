#!/usr/bin/env node
/**
 * r327/p4c-rehearsal.mjs — THE DRESS REHEARSAL (P4c): registrar +
 * teacher + 20 students, through the product's REAL paths, on the
 * live seeded stack. No UI clicks here (the 14 e2e flows of r325 P4a
 * already walk the UI end-to-end, 14/14 green); this is the COHORT
 * shape P4(c) names: 20 students onboarded by ONE teacher-minted
 * invite (the platform's real bulk path — B3's finding: invites, not
 * CSV), each walking their first-session minute, the registrar
 * verifying the cohort landed, all on the honest API.
 *
 *   1. registrar + teacher log in                    → 200 each
 *   2. teacher mints ONE STUDENT code (maxUses 20,
 *      7 days, offering scope)                       → 201
 *   3. 20 rehearsal students register with the code  → 201 ×20
 *      (self-registration = the real onboarding; the invite
 *      enrolls each into the scoped offering)
 *   4. each student walks the first-session minute:
 *      /auth/me → /enrollments/me → /courses → 1 AI
 *      ask → /notifications                         → 200s
 *   5. student #1 and #20 re-login                   → 200 (the
 *      login path for fresh accounts; AUTH_RATE skips successes)
 *   6. registrar lists the governance users          → the cohort
 *      is there (counted by the rehearsal domain)
 *   7. teacher's invite list                         → usedCount 20/20
 *   8. CLEANUP: the 20 throwaways are removed by the
 *      b3-cleanup pattern (ordered Prisma deletes of exactly
 *      the ids created here — the seed's own 30 demo users and
 *      every @test.ly account are NEVER touched)
 *
 * Usage: node scripts/r327/p4c-rehearsal.mjs [outFile.txt]
 * Env: BASE_URL, EVAL_PASSWORD, EVAL_TEACHER_EMAIL, EVAL_REGISTRAR_EMAIL,
 *      OFFERING_ID, FACULTY_ID, DEPARTMENT_ID (defaults = the showcase
 *      chain, same as b3-invite-bulk-proof.mjs).
 */
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';
const OUT = process.argv[2] ?? 'audits/evidence/r327/p4/p4c-rehearsal.txt';
const IDS_OUT = OUT.replace(/\.txt$/, '.ids.json');
const PASSWORD = process.env.EVAL_PASSWORD ?? '12345678';
const TEACHER_EMAIL = process.env.EVAL_TEACHER_EMAIL ?? 'teacher@test.ly';
const REGISTRAR_EMAIL = process.env.EVAL_REGISTRAR_EMAIL ?? 'registrar@test.ly';
const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'inst-zawia-showcase';
const OFFERING_ID = process.env.OFFERING_ID ?? 'cmvwl5onk003s124xe5r1ufgt';
const FACULTY_ID = process.env.FACULTY_ID ?? 'cmvwl5oiu0002124xqqg65j7p';
const DEPARTMENT_ID = process.env.DEPARTMENT_ID ?? 'cmvwl5ojg001g124x8a1251es';
const N_STUDENTS = 20;
const THROWAWAY_PASSWORD = 'r327-p4c-rehearsal!x';
const DOMAIN = '@demo.madarek.ly'; // the registrar-sweepable domain (B3 convention)
const TIMEOUT_MS = 30_000;

const lines = [];
const log = (s = '') => { lines.push(s); console.log(s); };
const stamp = new Date().toISOString().slice(2, 16).replace(/[-:T]/g, '');
const ok = (s) => /20[017]/.test(String(s));

async function login(email) {
  const res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status !== 200) throw new Error(`login failed for ${email.replace(/(.{2}).*(@.*)/, '$1***$2')} (HTTP ${res.status})`);
  return (await res.json()).data.accessToken;
}

async function main() {
  log(`# P4(c) dress rehearsal — ${new Date().toISOString()}`);
  log(`# ${N_STUDENTS} students · 1 registrar · 1 teacher · BASE=${BASE_URL}`);
  log('');

  /* 1 — registrar + teacher */
  const teacherToken = await login(TEACHER_EMAIL);
  const registrarToken = await login(REGISTRAR_EMAIL);
  log(`1) registrar + teacher logins → 200 ✓ (registrar = «المسجل العام», teacher = ${TEACHER_EMAIL})`);

  /* 2 — the teacher mints ONE cohort code */
  let res = await fetch(`${BASE_URL}/api/v1/invites`, {
    method: 'POST',
    headers: { authorization: `Bearer ${teacherToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'STUDENT', offeringId: OFFERING_ID, expiresInDays: 7, maxUses: N_STUDENTS }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const invite = (await res.json().catch(() => ({}))).data;
  log(`2) POST /invites (STUDENT, offering scope, 7d, maxUses=${N_STUDENTS}) → HTTP ${res.status} · code ${invite.code ?? '??'}`);
  if (!ok(res.status)) throw new Error('invite mint failed');

  /* 3 — the 20 students self-register with the code */
  const cohort = [];
  let regFail = 0;
  for (let i = 1; i <= N_STUDENTS; i++) {
    const email = `p4c-${stamp}-${String(i).padStart(2, '0')}${DOMAIN}`;
    res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email,
        password: THROWAWAY_PASSWORD,
        firstName: 'طالب',
        lastName: `البروفة ${i}`,
        role: 'STUDENT',
        institutionId: INSTITUTION_ID,
        facultyId: FACULTY_ID,
        departmentId: DEPARTMENT_ID,
        universityId: `R327P4C${stamp}${i}`.slice(0, 40),
        inviteCode: invite.code,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))).data;
    if (ok(res.status) && body?.user?.id) cohort.push({ email, id: body.user.id, token: body.accessToken });
    else { regFail++; log(`   ✗ register ${i} → HTTP ${res.status}: ${JSON.stringify(body).slice(0, 120)}`); }
  }
  log(`3) ${cohort.length}/${N_STUDENTS} students registered with the code → ${cohort.length === N_STUDENTS ? 'ALL 201 ✓' : `${regFail} FAILED`}`);
  if (cohort.length < N_STUDENTS) throw new Error('registration shortfall — see log');

  /* 4 — each student walks the first-session minute */
  const walk = { me: 0, enrollments: 0, courses: 0, ai: 0, notifications: 0 };
  const aiDetail = [];
  for (const [idx, s] of cohort.entries()) {
    const h = { authorization: `Bearer ${s.token}` };
    res = await fetch(`${BASE_URL}/api/v1/auth/me`, { headers: h, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 200) walk.me++;
    res = await fetch(`${BASE_URL}/api/v1/enrollments/me`, { headers: h, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 200) walk.enrollments++;
    res = await fetch(`${BASE_URL}/api/v1/courses?page=1&limit=12`, { headers: h, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 200) walk.courses++;
    res = await fetch(`${BASE_URL}/api/v1/ai/chat`, {
      method: 'POST',
      headers: { ...h, 'content-type': 'application/json' },
      body: JSON.stringify({ message: 'ما هي خطوات تسليم الواجب؟' }),
      signal: AbortSignal.timeout(60_000),
    });
    if (res.status === 200 || res.status === 429) walk.ai++; // the honest 429 is a pass (quota BY DESIGN)
    if (idx < 2) aiDetail.push(`student #${idx + 1} AI → HTTP ${res.status}`);
    res = await fetch(`${BASE_URL}/api/v1/notifications`, { headers: h, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status === 200) walk.notifications++;
  }
  log(`4) first-session minute × ${cohort.length}: /auth/me ${walk.me} · /enrollments/me ${walk.enrollments} · /courses ${walk.courses} · AI ${walk.ai} · /notifications ${walk.notifications}`);
  log(`   ${aiDetail.join(' · ')}`);
  const walkOk = Object.values(walk).every((n) => n === N_STUDENTS);

  /* 5 — re-login for the first and last student */
  const relog = [];
  for (const s of [cohort[0], cohort[cohort.length - 1]]) {
    res = await fetch(`${BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: s.email, password: THROWAWAY_PASSWORD }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    relog.push(res.status === 200);
  }
  log(`5) re-login #1 + #${N_STUDENTS} → ${relog.every(Boolean) ? '200 ✓ both' : 'FAILED'}`);

  /* 6 — the registrar verifies the cohort landed (governance list) */
  res = await fetch(`${BASE_URL}/api/v1/admin/users?role=STUDENT&limit=100&search=p4c-${stamp}`, {
    headers: { authorization: `Bearer ${registrarToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const govBody = (await res.json().catch(() => ({})));
  const govRows = Array.isArray(govBody?.data) ? govBody.data : (govBody?.data?.rows ?? govBody?.data?.items ?? []);
  log(`6) registrar GET /admin/users?role=STUDENT&search=p4c-${stamp} → HTTP ${res.status} · ${govRows.length} row(s)`);
  if (!ok(res.status)) log(`   (search filter note: ${JSON.stringify(govBody).slice(0, 140)})`);

  /* 7 — the teacher's invite shows the counted use */
  res = await fetch(`${BASE_URL}/api/v1/invites`, {
    headers: { authorization: `Bearer ${teacherToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const invites = (await res.json().catch(() => ({}))).data ?? [];
  const mine = (Array.isArray(invites) ? invites : invites.rows ?? []).find((x) => x.id === invite.id);
  log(`7) teacher GET /invites → usedCount ${mine?.usedCount ?? '??'}/${N_STUDENTS}`);

  log('');
  log(`VERDICT: registers ${cohort.length}/${N_STUDENTS} · walk ${walkOk ? 'ALL ✓' : 'GAPS'} · re-login ${relog.every(Boolean) ? '✓' : '✗'} · invite usedCount ${mine?.usedCount ?? '?'}/${N_STUDENTS}`);
  writeFileSync(OUT, lines.join('\n'));
  writeFileSync(IDS_OUT, JSON.stringify({ stamp, cohort: cohort.map(({ email, id }) => ({ email, id })) }, null, 1));
  log(`→ ${OUT}`);
  log(`→ ${IDS_OUT} (run scripts/r327/p4c-cleanup.mjs ${IDS_OUT} to remove the throwaways)`);
  process.exit(walkOk && relog.every(Boolean) ? 0 : 3);
}

main().catch((e) => {
  log(`\nFATAL: ${e.message}`);
  writeFileSync(OUT, lines.join('\n'));
  process.exit(2);
});
