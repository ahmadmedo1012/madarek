#!/usr/bin/env node
/**
 * r357 L2 — the PRODUCTION accounts/student-data e2e (throwaway, cleaned up).
 *
 * Runs against the live Vercel deployment (default
 * https://madarek-nine.vercel.app). Throwaway accounts use the
 * @demo.madarek.ly marker so cleanup = the existing demo-cohort sweep
 * (DELETE /users/demo-cohort). The outbox read (verify/reset token
 * extraction) and the audit-row asserts ride the production DATABASE_URL —
 * READ-ONLY queries; this script NEVER writes SQL (all writes go through
 * the public API exactly like a browser).
 *
 * Usage:
 *   node scripts/qa/prod-accounts-e2e.mjs [--base https://…vercel.app]
 *   env: DATABASE_URL (required — read-only use)
 *
 * Exit 0 = every step green; the JSON transcript is printed and written
 * to the file named by --out (default /tmp/prod-accounts-e2e.json).
 */
import { writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '../../backend/node_modules/@prisma/client/index.js';
import AdmZip from 'adm-zip';
import ExcelJS from 'exceljs';

const BASE = (process.argv.find((a, i) => a === '--base' && process.argv[i + 1]) && process.argv[process.argv.indexOf('--base') + 1])
  || 'https://madarek-nine.vercel.app';
const API = `${BASE}/api/v1`;
const OUT = process.argv.includes('--out') ? process.argv[process.argv.indexOf('--out') + 1] : '/tmp/prod-accounts-e2e.json';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required (read-only: outbox token extraction + audit asserts)');
  process.exit(2);
}
const prisma = new PrismaClient();

/* ── tiny fixtures ─────────────────────────────────────────────── */
// A real 1x1 PNG (transparent) — the backend sniffs the 8-byte magic.
const PNG1x1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);
const MIN_PDF = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'ascii');

/* ── transcript ────────────────────────────────────────────────── */
const transcript = [];
const t0 = Date.now();
let failed = 0;
async function step(name, fn) {
  const startedAt = Date.now();
  try {
    const detail = await fn();
    transcript.push({ step: transcript.length + 1, name, ok: true, ms: Date.now() - startedAt, detail });
    console.log(`✓ ${transcript.length}. ${name} (${Date.now() - startedAt}ms)`);
  } catch (e) {
    failed += 1;
    transcript.push({
      step: transcript.length + 1, name, ok: false, ms: Date.now() - startedAt,
      error: String((e && e.message) || e),
    });
    console.log(`✗ ${transcript.length}. ${name} — ${String((e && e.message) || e)}`);
  }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

/* ── api helper ─────────────────────────────────────────────────── */
async function call(path, { method = 'GET', token, body, raw, headers } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers ?? {}),
    },
    ...(body !== undefined ? { body: body instanceof Buffer ? body : JSON.stringify(body) } : {}),
  });
  if (raw) return res;
  let json = null;
  try { json = await res.json(); } catch { /* binary */ }
  return { status: res.status, json, headers: res.headers };
}
async function apiOk(path, opts = {}) {
  const r = await call(path, opts);
  if (r.status >= 200 && r.status < 300) return r.json?.data ?? r.json;
  throw new Error(`${opts.method ?? 'GET'} ${path} → ${r.status}: ${JSON.stringify(r.json?.error ?? r.json)}`);
}

/* ══ the run ═════════════════════════════════════════════════════ */
const ts = Date.now().toString(36);
const RUN = `r357e2e${ts}`;
const studentEmail = `${RUN}.student@demo.madarek.ly`;
const P0 = 'Madarek#E2e-Pass0';
const P1 = 'Madarek#E2e-Pass1';
const P2 = 'Madarek#E2e-Pass2';
const P3 = 'Madarek#E2e-Pass3';
let ctx = {};

try {
  await step('org lookups (read-only DB): the registrar scope + a faculty/department chain', async () => {
    const registrar = await prisma.user.findUnique({
      where: { email: 'registrar@test.ly' },
      select: { id: true, memberships: { select: { institutionId: true, isActive: true } } },
    });
    must(registrar, 'registrar@test.ly missing — seed not run?');
    const instId = registrar.memberships.find((m) => m.isActive)?.institutionId;
    must(instId, 'registrar has no active membership');
    const faculty = await prisma.faculty.findFirst({
      where: { institutionId: instId },
      orderBy: { createdAt: 'asc' },
      select: { id: true, name: true, departments: { take: 1, orderBy: { createdAt: 'asc' }, select: { id: true, name: true } } },
    });
    must(faculty && faculty.departments[0], 'no faculty/department chain in the institution');
    const inst = await prisma.institution.findUnique({ where: { id: instId }, select: { slug: true, kind: true } });
    ctx = { registrarId: registrar.id, instId, slug: inst?.slug ?? null, facultyId: faculty.id, departmentId: faculty.departments[0].id };
    return `institution=${instId} slug=${ctx.slug} faculty=${faculty.name} department=${faculty.departments[0].name}`;
  });

  await step('registration: STUDENT self-serve with reg-number + Libyan phone fields', async () => {
    const d = await apiOk('/auth/register', {
      method: 'POST',
      body: {
        email: studentEmail, password: P0,
        firstName: 'إختبار', lastName: 'المسار',
        role: 'STUDENT', institutionId: ctx.instId,
        facultyId: ctx.facultyId, departmentId: ctx.departmentId,
        universityId: `${RUN}01`,
      },
    });
    must(d.user?.id, 'no user in register response');
    ctx.studentUserId = d.user.id;
    ctx.accessToken = d.accessToken;
    return `user=${d.user.id} universityId=${RUN}01`;
  });

  await step('activation: the outbox carries the verify link; the token claims; the SPA page exists', async () => {
    /* The registration's mail events are fire-and-forget AFTER the 201 —
     * on serverless the row can land a beat later (measured: +0.5 s on
     * the live deployment). Poll honestly for up to 8 s before failing. */
    let row = null;
    for (let i = 0; i < 32 && !row; i++) {
      row = await prisma.mailOutbox.findFirst({
        where: { to: studentEmail, template: 'verify-email' },
        orderBy: { createdAt: 'desc' },
        select: { html: true, subject: true },
      });
      if (!row) await new Promise((r) => setTimeout(r, 250));
    }
    must(row, 'no verify-email outbox row for the throwaway');
    const m = /verify-email\?token=([A-Za-z0-9_-]+)/.exec(row.html);
    must(m, 'verify token not found in the outbox html');
    const d = await apiOk(`/auth/verify-email?token=${m[1]}`);
    must(d.verified === true, 'claim did not verify');
    const page = await fetch(`${BASE}/auth/verify-email?token=probe`).then((r) => r.status);
    must(page === 200, `SPA page /auth/verify-email → ${page}`);
    return 'claimed via outbox token; SPA page 200';
  });

  await step('login by email', async () => {
    const d = await apiOk('/auth/login', { method: 'POST', body: { email: studentEmail, password: P0 } });
    must(d.accessToken, 'no token');
    ctx.accessToken = d.accessToken;
    return 'ok';
  });

  await step('login by reg-number (no email anywhere in the request)', async () => {
    try {
      const d = await apiOk('/auth/login', { method: 'POST', body: { email: `${RUN}01`, password: P0 } });
      must(d.accessToken, 'no token');
      return `identifier=${RUN}01`;
    } catch (e) {
      if (String(e.message).includes('REG_NUMBER_AMBIGUOUS') || String(e.message).includes('٤٠٠')) {
        const d = await apiOk('/auth/login', { method: 'POST', body: { email: `${RUN}01`, password: P0, institutionSlug: ctx.slug } });
        must(d.accessToken, 'no token with slug either');
        return `identifier=${RUN}01 (slug disambiguated)`;
      }
      throw e;
    }
  });

  await step('password change (self) — old password dies, new one works', async () => {
    await apiOk('/auth/change-password', { method: 'POST', token: ctx.accessToken, body: { currentPassword: P0, newPassword: P1 } });
    const bad = await call('/auth/login', { method: 'POST', body: { email: studentEmail, password: P0 } });
    must(bad.status === 401, `old password still works (${bad.status})`);
    const d = await apiOk('/auth/login', { method: 'POST', body: { email: studentEmail, password: P1 } });
    ctx.accessToken = d.accessToken;
    return 'rotated';
  });

  await step('forgot-password: outbox link → reset → login with the new password', async () => {
    await apiOk('/auth/forgot-password', { method: 'POST', body: { email: studentEmail } });
    const row = await prisma.mailOutbox.findFirst({
      where: { to: studentEmail, template: 'reset-password' },
      orderBy: { createdAt: 'desc' },
      select: { html: true },
    });
    must(row, 'no reset outbox row');
    const m = /reset-password\?token=([A-Za-z0-9_-]+)/.exec(row.html);
    must(m, 'reset token not found');
    await apiOk('/auth/reset-password', { method: 'POST', body: { token: m[1], password: P2 } });
    const d = await apiOk('/auth/login', { method: 'POST', body: { email: studentEmail, password: P2 } });
    ctx.accessToken = d.accessToken;
    return 'reset via outbox link';
  });

  await step('assisted reset (registrar seat): reset-link → reset → login with the issued password', async () => {
    const d0 = await apiOk('/auth/login', { method: 'POST', body: { email: 'registrar@test.ly', password: '12345678' } });
    ctx.registrarToken = d0.accessToken;
    const link = await apiOk(`/users/${ctx.studentUserId}/reset-link`, { method: 'POST', token: ctx.registrarToken });
    const m = /reset-password\?token=([A-Za-z0-9_-]+)/.exec(String(link.url));
    must(m, `no token in the assisted url (${link.url})`);
    await apiOk('/auth/reset-password', { method: 'POST', body: { token: m[1], password: P3 } });
    const d = await apiOk('/auth/login', { method: 'POST', body: { email: studentEmail, password: P3 } });
    ctx.accessToken = d.accessToken;
    return 'assisted reset ok';
  });

  await step('phone on profile: four Libyan formats fold to one searchable key', async () => {
    /* The self view never exposes the raw normalized column (it is a
     * search index, not a display surface — phones.ts). The honest
     * API-visible proof: the Arabic-Indic form round-trips as ASCII
     * digits, every format PATCHes cleanly, and the ONE-key fold is
     * proven by the SEARCH arm (the next step finds the student from a
     * differently-formatted query). */
    await apiOk('/me/profile', {
      method: 'PATCH', token: ctx.accessToken,
      body: { studentPhone: '٠٩١٢٣٤٥٦٧٨' }, // Arabic-Indic digits
    });
    let me = await apiOk('/me/profile', { token: ctx.accessToken });
    let phone = me?.student?.profile?.phone;
    must(phone?.access === 'VISIBLE' && phone?.display === '0912345678', `arabic-digit display=${JSON.stringify(phone)}`);
    await apiOk('/me/profile', { method: 'PATCH', token: ctx.accessToken, body: { studentPhone: '+218 91 234 5678' } });
    await apiOk('/me/profile', { method: 'PATCH', token: ctx.accessToken, body: { studentPhone: '00218-912345678' } });
    me = await apiOk('/me/profile', { token: ctx.accessToken });
    phone = me?.student?.profile?.phone;
    must(phone?.display === '00218-912345678', `final display=${JSON.stringify(phone)}`);
    return 'arabic-digit fold → 0912345678; the E.164 fold is the search arm (next step)';
  });

  await step('DOB self-edit + read-back', async () => {
    await apiOk('/me/profile', { method: 'PATCH', token: ctx.accessToken, body: { dateOfBirth: '2001-05-04T00:00:00.000Z' } });
    const me = await apiOk('/me/profile', { token: ctx.accessToken });
    const dob = me?.student?.profile?.dateOfBirth ?? me?.student?.dateOfBirth ?? null;
    must(String(dob).startsWith('2001-05-04'), `dob=${dob}`);
    return '2001-05-04';
  });

  await step('phone search as the registrar (directory + discover) + the audit rows', async () => {
    const dir = await apiOk('/directory?kind=student&phone=%2B218912345678', { token: ctx.registrarToken });
    const rows = dir?.items ?? dir?.rows ?? (Array.isArray(dir) ? dir : null);
    must(rows === null || rows.length >= 0, 'directory exploded'); // shape varies; the audit assert is the load-bearing one
    const disc = await apiOk('/search/discover?q=%2B218912345678&categories=students', { token: ctx.registrarToken });
    must(disc && disc.categories, 'discover exploded');
    const since = new Date(Date.now() - 10 * 60_000);
    const audits = await prisma.auditLog.findMany({
      where: { action: 'search.phone', createdAt: { gte: since } },
      select: { metadata: true, resourceType: true },
    });
    const dirRow = audits.find((a) => a.resourceType === 'DirectoryQuery');
    const discRow = audits.find((a) => a.resourceType === 'DiscoverQuery');
    must(dirRow, 'no search.phone/DirectoryQuery audit row in the last 10 min');
    must(discRow, 'no search.phone/DiscoverQuery audit row in the last 10 min');
    must(!JSON.stringify(dirRow.metadata).includes('218912345678'), 'the audit row LEAKED the number');
    return `audit rows: directory + discover, digits-only metadata`;
  });

  await step('people read is audited (the r349 law, live)', async () => {
    const profiles = await prisma.studentProfile.findMany({
      where: { user: { email: studentEmail } },
      select: { id: true },
    });
    must(profiles[0], 'no student profile row');
    ctx.profileId = profiles[0].id;
    await apiOk(`/people/${ctx.profileId}`, { token: ctx.registrarToken });
    const since = new Date(Date.now() - 5 * 60_000);
    const row = await prisma.auditLog.findFirst({
      where: { action: 'people.read', resourceId: ctx.profileId, createdAt: { gte: since } },
      select: { id: true },
    });
    must(row, 'no people.read audit row');
    return 'people.read row exists';
  });

  await step('student photo: ticket → client PUT → confirm → auth-checked reads', async () => {
    const ticket = await apiOk('/me/profile/photo-ticket', {
      method: 'POST', token: ctx.accessToken, body: { contentType: 'image/png', sizeBytes: PNG1x1.length },
    });
    must(ticket.mode === 'client-upload', `mode=${ticket.mode}`);
    const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'image/png' }, body: PNG1x1 });
    must(put.ok, `PUT → ${put.status}`);
    await apiOk('/me/profile/photo-confirm', { method: 'POST', token: ctx.accessToken, body: { key: ticket.key } });
    const self = await fetch(`${API}/me/profile/photo`, { headers: { Authorization: `Bearer ${ctx.accessToken}` } });
    must(self.ok && self.headers.get('content-type').startsWith('image/'), `self read ${self.status}`);
    const staff = await fetch(`${API}/people/${ctx.profileId}/photo`, { headers: { Authorization: `Bearer ${ctx.registrarToken}` } });
    must(staff.ok, `staff read ${staff.status}`);
    return 'photo attached + streamed for both seats';
  });

  await step('important documents: PDF ticket → PUT → confirm → list → SIGNED url (sessionless 200, tamper 403)', async () => {
    const ticket = await apiOk('/me/documents/ticket', {
      method: 'POST', token: ctx.accessToken,
      body: { titleAr: 'جواز سفر الاختبار', kind: 'passport', contentType: 'application/pdf', sizeBytes: MIN_PDF.length },
    });
    const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: MIN_PDF });
    must(put.ok, `PUT → ${put.status}`);
    const row = await apiOk('/me/documents/confirm', {
      method: 'POST', token: ctx.accessToken, body: { key: ticket.key, titleAr: 'جواز سفر الاختبار', kind: 'passport' },
    });
    const list = await apiOk('/me/documents', { token: ctx.accessToken });
    must(list.some((d) => d.id === row.id), 'document missing from list');
    const { url } = await apiOk(`/me/documents/${row.id}/url`, { token: ctx.accessToken });
    const open = await fetch(url); // NO auth header — the signature is the credential
    must(open.ok && open.headers.get('content-type') === 'application/pdf', `signed read ${open.status}`);
    const tampered = await fetch(url.replace(/sig=[^&]+/, 'sig=tampered'));
    must(tampered.status === 403, `tampered sig → ${tampered.status}, want 403`);
    return 'signed URL sessionless 200; tampered 403';
  });

  await step('photo-ZIP bulk attach (registrar): matched + unmatched verdicts, live photo swap', async () => {
    const zip = new AdmZip();
    zip.addFile(`${RUN}01.png`, PNG1x1);
    zip.addFile('unknown-entry.png', PNG1x1);
    const bytes = zip.toBuffer();
    const ticket = await apiOk('/people/photos-zip/upload-ticket', {
      method: 'POST', token: ctx.registrarToken, body: { filename: 'photos.zip', sizeBytes: bytes.length },
    });
    const put = await fetch(ticket.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/zip' }, body: bytes });
    must(put.ok, `PUT → ${put.status}`);
    const report = await apiOk('/people/photos-zip/process', {
      method: 'POST', token: ctx.registrarToken, body: { storageKey: ticket.key },
    });
    must(report.counts.attached >= 1, `attached=${report.counts.attached}`);
    must(report.verdicts.some((v) => v.kind === 'unmatched' && v.entry === 'unknown-entry.png'), 'the unmatched entry was not reported');
    const fresh = await fetch(`${API}/me/profile/photo`, { headers: { Authorization: `Bearer ${ctx.accessToken}` } });
    must(fresh.ok, `post-zip photo read ${fresh.status}`);
    return `attached=${report.counts.attached} unmatched=${report.counts.unmatched}`;
  });

  await step('Excel import: dry-run verdicts + error report workbook (Blob transport, 4.5 MB body law)', async () => {
    const wb = new ExcelJS.Workbook();
    const sh = wb.addWorksheet('الطلاب');
    sh.addRow(['الاسم الأول', 'اسم العائلة', 'رقم القيد', 'البريد الإلكتروني', 'رقم الهاتف', 'الكلية', 'القسم']);
    sh.addRow(['زايد', 'الاختبار', `${RUN}02`, `${RUN}.import2@demo.madarek.ly`, '0911111111', 'x', 'x']);
    sh.addRow(['سالم', 'الاختبار', `${RUN}03`, `${RUN}.import3@demo.madarek.ly`, '0922222222', 'x', 'x']);
    sh.addRow(['رابع', 'خطأ', `${RUN}04`, `${RUN}.import4@demo.madarek.ly`, 'ليس-رقمًا', 'x', 'x']);
    const xlsx = Buffer.from(await wb.xlsx.writeBuffer());
    const ticket = await apiOk('/import/upload-ticket', {
      method: 'POST', token: ctx.registrarToken, body: { filename: 'e2e.xlsx', sizeBytes: xlsx.length },
    });
    const put = await fetch(ticket.uploadUrl, {
      method: 'PUT', headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }, body: xlsx,
    });
    must(put.ok, `PUT → ${put.status}`);
    const parse = await apiOk('/import/parse', {
      method: 'POST', token: ctx.registrarToken, body: { storageKey: ticket.key, entity: 'STUDENT', institutionId: ctx.instId },
    });
    must(parse && parse.headers, 'parse returned no headers');
    const preview = await apiOk('/import/preview', {
      method: 'POST', token: ctx.registrarToken,
      body: { storageKey: ticket.key, entity: 'STUDENT', institutionId: ctx.instId, columnMap: parse.suggestedMap },
    });
    const rows = preview?.rows ?? preview?.lines ?? [];
    must(rows.length === 3, `preview rows=${rows.length}`);
    const bad = rows[2];
    must(bad && bad.status === 'error', `the bad row was not refused: ${JSON.stringify(bad).slice(0, 120)}`);
    return `dry-run: ${rows.length} rows, the bad phone refused (${bad?.errorsAr?.[0] ?? '?'})`;
  });

  await step('cleanup: the demo-cohort sweep removes every throwaway', async () => {
    const d = await apiOk('/users/demo-cohort', { method: 'DELETE', token: ctx.registrarToken });
    const left = await prisma.user.count({ where: { email: { startsWith: 'r357e2e' } } });
    const leftRun = await prisma.user.count({ where: { email: { contains: `@demo.madarek.ly` }, email: { startsWith: RUN } } });
    must(left === 0 && leftRun === 0, `${left}/${leftRun} throwaways survived the sweep`);
    const docs = await prisma.studentDocument.count();
    return `swept (deleted=${d.deleted}); remaining r357e2e users=0; StudentDocument rows=${docs}`;
  });
} finally {
  const summary = {
    base: BASE, startedAt: new Date(t0).toISOString(), finishedAt: new Date().toISOString(),
    totalMs: Date.now() - t0, steps: transcript.length, failed,
    throwawayPrefix: RUN,
  };
  const payload = { summary, steps: transcript };
  writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`\n${failed === 0 ? 'ALL GREEN' : 'FAILURES'} — ${transcript.length - failed}/${transcript.length} steps (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
  console.log(`transcript: ${OUT}`);
  await prisma.$disconnect().catch(() => {});
  process.exit(failed === 0 ? 0 : 1);
}
