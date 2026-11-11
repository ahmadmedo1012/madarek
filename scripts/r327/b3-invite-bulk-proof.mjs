#!/usr/bin/env node
/**
 * scripts/r327/b3-invite-bulk-proof.mjs — P4(d) B3: what "bulk import"
 * actually is on this platform, proven live through the real API.
 *
 * Finding first (the honest headline): there is NO CSV/file-upload bulk
 * import of students anywhere in backend/src. The r323 "B3.1 bulk-
 * import remainder" shipped as INVITE CODES — one code, minted by the
 * teacher/registrar, scoped to exactly one target (offering |
 * department | faculty), valid 1–90 days, usable 1–500 times. The
 * cohort then SELF-REGISTERS with that code: POST /auth/register
 * validates + atomically consumes it (counted claim under the cap,
 * unique per user) and enrolls each student into the scoped offering.
 * The admin/sync path (SyncRun) syncs UNIVERSITY FACTS, not users —
 * it is not a bulk import and is not exercised as one here.
 *
 * This script proves the whole chain on the seeded DB:
 *   1. teacher mints a STUDENT code scoped to an offering they own
 *      (maxUses 3, 7 days)                → 201 + code
 *   2. PUBLIC pre-submit validation       → valid + Arabic scope label
 *   3. three throwaway students register
 *      with the code                      → 201 each, enrolled
 *   4. one registered student lists their
 *      own enrollments                    → the scoped offering is there
 *   5. the teacher's invite list          → usedCount 3/3
 *   6. a 4th registration with the same
 *      code                               → honest 4xx Arabic (exhausted)
 *   7. role-mismatch validation           → honest Arabic verdict
 *
 * Throwaways register under @demo.madarek.ly (the registrar-sweepable
 * domain) and are removed afterwards by scripts/r327/b3-cleanup.mjs
 * (ordered delete of exactly the ids created here — the seed's own 30
 * demo users are NEVER touched).
 *
 * Usage: node scripts/r327/b3-invite-bulk-proof.mjs [outFile.txt]
 * Env: BASE_URL, EVAL_PASSWORD, EVAL_TEACHER_EMAIL, OFFERING_ID,
 *       FACULTY_ID, DEPARTMENT_ID (the demo IT faculty + CS
 *       department by default — the register route validates the
 *       academic chain belongs to the institution).
 */
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';
const OUT = process.argv[2] ?? 'audits/evidence/r327/p4/b3/invite-bulk-proof.txt';
const PASSWORD = process.env.EVAL_PASSWORD ?? '12345678';
const TEACHER_EMAIL = process.env.EVAL_TEACHER_EMAIL ?? 'teacher@test.ly';
const INSTITUTION_ID = process.env.INSTITUTION_ID ?? 'inst-madarek-demo';
// An offering owned by teacher@test.ly in the seed (هندسة البرمجيات).
const OFFERING_ID = process.env.OFFERING_ID ?? 'cmvwl5onk003s124xe5r1ufgt';
// The demo academic chain (كلية تقنية المعلومات → علوم الحاسوب).
const FACULTY_ID = process.env.FACULTY_ID ?? 'cmvwl5oiu0002124xqqg65j7p';
const DEPARTMENT_ID = process.env.DEPARTMENT_ID ?? 'cmvwl5ojg001g124x8a1251es';
const THROWAWAY_PASSWORD = 'r327-b3-throwaway!x';
const TIMEOUT_MS = 30_000;

const lines = [];
const log = (s = '') => {
  lines.push(s);
  console.log(s);
};

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
  log('━━━ r327 P4(d) B3 — invite-code bulk onboarding, proven live ━━━');
  log(`BASE_URL: ${BASE_URL} · started ${new Date().toISOString()}`);
  log('headline: NO CSV bulk import exists — B3.1 shipped as invite codes;');
  log('admin/sync syncs university FACTS (not users) and is not a bulk import.');
  log('');

  const teacherToken = await login(TEACHER_EMAIL);
  log('logged in: teacher (the code creator)');

  /* 1 — mint the code (maxUses 3, 7 days, offering scope) */
  let res = await fetch(`${BASE_URL}/api/v1/invites`, {
    method: 'POST',
    headers: { authorization: `Bearer ${teacherToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ role: 'STUDENT', offeringId: OFFERING_ID, expiresInDays: 7, maxUses: 3 }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const invite = (await res.json().catch(() => ({}))).data;
  log('');
  log(`1) POST /invites (STUDENT, offering scope, 7d, maxUses=3) → HTTP ${res.status}`);
  if (res.status !== 201) throw new Error(`invite mint failed: ${JSON.stringify(invite).slice(0, 300)}`);
  const { code, id: codeId } = invite;
  log(`   code: ${code} (id ${codeId})`);
  log(`   scope: ${invite.offering ? `مقرر ${invite.offering.course.code} — ${invite.offering.course.name}` : '??'}`);
  log(`   expiresAt: ${invite.expiresAt} · maxUses: ${invite.maxUses}`);

  /* 2 — public pre-submit validation (the register-page hint) */
  res = await fetch(`${BASE_URL}/api/v1/invites/${code}/validate?role=STUDENT`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const val = (await res.json().catch(() => ({}))).data;
  log('');
  log(`2) GET /invites/${code}/validate?role=STUDENT (PUBLIC, no auth) → HTTP ${res.status}`);
  log(`   valid: ${val?.valid} · role: ${val?.role} · scopeLabel: ${val?.scopeLabel}`);

  /* role-mismatch negative (honest verdict) */
  res = await fetch(`${BASE_URL}/api/v1/invites/${code}/validate?role=TEACHER`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const wrongRole = await res.json().catch(() => ({}));
  log(`   cross-check role=TEACHER → HTTP ${res.status} · ${wrongRole?.error?.message ?? ''}`);

  /* 3 — three throwaway registrations with the code */
  const stamp = Date.now().toString(36);
  const throwaways = [1, 2, 3].map((n) => ({
    email: `r327b3-${stamp}-${n}@demo.madarek.ly`,
    firstName: 'طالب',
    lastName: `اختبار ${n}`,
    universityId: `R327B3${stamp}${n}`.slice(0, 40),
  }));
  const created = [];
  for (const t of throwaways) {
    res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: t.email,
        password: THROWAWAY_PASSWORD,
        firstName: t.firstName,
        lastName: t.lastName,
        role: 'STUDENT',
        institutionId: INSTITUTION_ID,
        facultyId: FACULTY_ID,
        departmentId: DEPARTMENT_ID,
        universityId: t.universityId,
        inviteCode: code,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => ({}))).data;
    log('');
    log(`3) register ${t.email} (with code) → HTTP ${res.status}${body?.user ? ` · user ${body.user.id}` : ''}`);
    if (res.status !== 201) throw new Error(`registration failed: ${JSON.stringify(body).slice(0, 300)}`);
    created.push({ email: t.email, id: body.user.id, token: body.accessToken });
  }

  /* 4 — one throwaway lists their own enrollments (the invite enrolled them) */
  res = await fetch(`${BASE_URL}/api/v1/enrollments/me`, {
    headers: { authorization: `Bearer ${created[0].token}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const mine = (await res.json().catch(() => ({}))).data ?? [];
  const scoped = mine.find((e) => e.offering?.id === OFFERING_ID);
  log('');
  log(`4) GET /enrollments/me (throwaway #1) → HTTP ${res.status} · ${mine.length} enrollment(s)`);
  log(`   scoped offering present: ${scoped ? `✓ ${scoped.offering.course.code} — ${scoped.offering.course.name} (status ${scoped.progressPct !== undefined ? 'active' : ''})` : '✗ MISSING'}`);
  if (!scoped) throw new Error('invite enrollment did not land');

  /* 5 — the teacher's list shows the counted use */
  res = await fetch(`${BASE_URL}/api/v1/invites`, {
    headers: { authorization: `Bearer ${teacherToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const invites = (await res.json().catch(() => ({}))).data ?? [];
  const row = invites.find((i) => i.code === code);
  log('');
  log(`5) GET /invites (teacher) → HTTP ${res.status} · this code: usedCount ${row?.usedCount}/${row?.maxUses}`);
  if (row?.usedCount !== 3) throw new Error(`usedCount expected 3, got ${row?.usedCount}`);

  /* 6 — the 4th registration hits the honest cap */
  res = await fetch(`${BASE_URL}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: `r327b3-${stamp}-4@demo.madarek.ly`,
      password: THROWAWAY_PASSWORD,
      firstName: 'طالب',
      lastName: 'اختبار 4',
      role: 'STUDENT',
      institutionId: INSTITUTION_ID,
      facultyId: FACULTY_ID,
      departmentId: DEPARTMENT_ID,
      universityId: `R327B3${stamp}4`.slice(0, 40),
      inviteCode: code,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const exhausted = await res.json().catch(() => ({}));
  log('');
  log(`6) register a 4th student with the SAME code → HTTP ${res.status}`);
  log(`   message: ${exhausted?.error?.message ?? JSON.stringify(exhausted).slice(0, 200)}`);
  if (res.status === 201) throw new Error('the cap did not hold — a 4th registration succeeded');

  log('');
  log('━━━ B3: the invite-code bulk chain proven end-to-end ━━━');
  log(`created throwaways (removed by b3-cleanup.mjs afterwards): ${created.map((c) => c.email).join(', ')}`);
  log(`code minted: ${code} (row ${codeId})`);

  writeFileSync(OUT.replace(/\.txt$/, '.ids.json'), JSON.stringify({ codeId, code, created, institutionId: INSTITUTION_ID, offeringId: OFFERING_ID }, null, 1));
  writeFileSync(OUT, `${lines.join('\n')}\n`);
  console.error(`\nreport → ${OUT} · ids → ${OUT.replace(/\.txt$/, '.ids.json')}`);
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  writeFileSync(OUT, `${lines.join('\n')}\n\nFAILED: ${err.message}\n`);
  process.exit(1);
});
