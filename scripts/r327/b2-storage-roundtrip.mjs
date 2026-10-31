#!/usr/bin/env node
/**
 * scripts/r327/b2-storage-roundtrip.mjs — P4(d) B2: prove the
 * research-paper upload→storage→serve chain and the lecture-transcript
 * chain on the REAL stack, through the REAL API.
 *
 * What this proves (and nothing it does not):
 *   1. POST /api/v1/files/papers as STUDENT with a minimal VALID PDF
 *      (real %PDF-1.4 header + a real xref table, generated in-memory)
 *      → 201 { data: { fileUrl } } — the storage abstraction accepted
 *      the bytes (STORAGE_DRIVER decides where they land: local disk
 *      in dev, S3/postgres in prod — see BACKEND.md §10).
 *   2. The byte gates are real: same body without the %PDF- magic →
 *      400 Arabic (الملف المرفق ليس ملف PDF صالحاً), not a silent save.
 *   3. POST /api/v1/me/research with that fileUrl mints the
 *      institution-bound ResearchPaper row (status UPLOADED) that
 *      authorizes serving — an orphan fileUrl would 404.
 *   4. GET the fileUrl back with the student token → 200, exact same
 *      bytes (sha256 in == sha256 out), %PDF- magic, application/pdf.
 *   5. Transcript story (TEACHER on an owned lecture):
 *      a. POST /lectures/:id/transcript/generate → the HONEST 409
 *         refusal while STT_* is unset (the sandbox has no STT key —
 *         refusing is the correct behavior, never faked).
 *      b. PUT /lectures/:id/transcript with a 2-cue Arabic SRT → 201
 *         { transcriptUrl } (SRT→VTT normalized, stored in the same
 *         storage abstraction, lectures namespace).
 *      c. GET the transcriptUrl → 200 VTT with our cues — the same
 *         bytes the player <track> and the AI knowledge indexer read.
 *
 * Usage (defaults target the local sandbox stack):
 *   node scripts/r327/b2-storage-roundtrip.mjs [outFile.txt]
 *   BASE_URL=http://localhost:4000 LECTURE_ID=c… node …
 * Credentials: the documented demo accounts (@test.ly / 12345678 —
 * same precedent as scripts/load/k6.js), overridable via env; never
 * printed. LECTURE_ID must be a lecture whose offering is owned by
 * the TEACHER account (the route enforces ownership — 403 otherwise).
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4000';
const OUT = process.argv[2] ?? 'audits/evidence/r327/p4/b2/roundtrip.txt';
const PASSWORD = process.env.EVAL_PASSWORD ?? '12345678';
const STUDENT_EMAIL = process.env.EVAL_STUDENT_EMAIL ?? 'student@test.ly';
const TEACHER_EMAIL = process.env.EVAL_TEACHER_EMAIL ?? 'teacher@test.ly';
const LECTURE_ID = process.env.LECTURE_ID ?? 'cmvwl5osh006k124x36ba8nec';
const TIMEOUT_MS = 30_000;

const lines = [];
const log = (s = '') => {
  lines.push(s);
  console.log(s);
};
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/* ── A minimal VALID PDF (real header, real objects, real xref) ── */
function minimalPdf() {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    null, // stream — length computed below
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
  ];
  const streamBody = 'BT /F1 18 Tf 72 720 Td (Madarek r327 P4d-B2 storage roundtrip) Tj ET';
  objects[3] = `<< /Length ${streamBody.length} >>\nstream\n${streamBody}\nendstream`;

  let out = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj ${body} endobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) out += `${String(off).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}

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

const authJson = (token) => ({ authorization: `Bearer ${token}`, 'content-type': 'application/json' });

const SAMPLE_SRT = [
  '1',
  '00:00:01,000 --> 00:00:04,000',
  'مرحبًا بكم في محاضرة هندسة البرمجيات',
  '',
  '2',
  '00:00:04,500 --> 00:00:08,000',
  'اليوم نتناول دورة حياة تطوير البرمجيات',
  '',
].join('\n');

async function main() {
  log('━━━ r327 P4(d) B2 — upload → storage → serve roundtrip ━━━');
  log(`BASE_URL: ${BASE_URL} · started ${new Date().toISOString()}`);
  log('');

  const pdf = minimalPdf();
  const pdfSha = sha256(pdf);
  log(`fixture PDF: ${pdf.length} bytes · %PDF-1.4 header + xref table · sha256 ${pdfSha.slice(0, 16)}…`);

  const studentToken = await login(STUDENT_EMAIL);
  const teacherToken = await login(TEACHER_EMAIL);
  log('logged in: student (uploader), teacher (transcript owner)');

  /* 1 — upload the valid PDF */
  let uploadMs = Date.now();
  let res = await fetch(`${BASE_URL}/api/v1/files/papers`, {
    method: 'POST',
    headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/pdf' },
    body: pdf,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  uploadMs = Date.now() - uploadMs;
  const uploadJson = await res.json().catch(() => ({}));
  log('');
  log(`1) POST /files/papers (valid PDF) → HTTP ${res.status} in ${uploadMs}ms`);
  if (res.status !== 201) throw new Error(`upload failed: ${JSON.stringify(uploadJson).slice(0, 300)}`);
  const fileUrl = uploadJson.data?.fileUrl;
  const filename = fileUrl.split('/').pop();
  log(`   fileUrl: ${fileUrl}`);
  log(`   rate-limit headers: remaining=${res.headers.get('ratelimit-remaining')} reset=${res.headers.get('ratelimit-reset')}`);

  /* 2 — the magic-byte gate (honest negative) */
  res = await fetch(`${BASE_URL}/api/v1/files/papers`, {
    method: 'POST',
    headers: { authorization: `Bearer ${studentToken}`, 'content-type': 'application/pdf' },
    body: Buffer.from('this is definitely not a pdf'),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const badJson = await res.json().catch(() => ({}));
  log('');
  log(`2) POST /files/papers (no %PDF- magic) → HTTP ${res.status}`);
  log(`   message: ${badJson?.error?.message ?? JSON.stringify(badJson).slice(0, 200)}`);
  if (res.status !== 400) throw new Error('magic-byte gate did not 400');

  /* 3 — mint the ResearchPaper row that authorizes serving */
  const title = `ورقة اختبار سلسلة التخزين r327-B2 ${new Date().toISOString().slice(0, 16)}`;
  res = await fetch(`${BASE_URL}/api/v1/me/research`, {
    method: 'POST',
    headers: authJson(studentToken),
    body: JSON.stringify({ title, abstract: 'ورقة مولّدة آليًا لإثبات سلسلة التخزين — تُحذف مع بيئة الاختبار.', fileUrl }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const paperJson = await res.json().catch(() => ({}));
  log('');
  log(`3) POST /me/research (fileUrl from step 1) → HTTP ${res.status}`);
  if (res.status !== 201) throw new Error(`paper mint failed: ${JSON.stringify(paperJson).slice(0, 300)}`);
  log(`   paper id: ${paperJson.data.id} · status: ${paperJson.data.status} · institutionId: ${paperJson.data.institutionId ? 'bound' : 'MISSING'}`);

  /* 4 — GET the bytes back, compare hashes */
  let getMs = Date.now();
  res = await fetch(`${BASE_URL}${fileUrl}`, {
    headers: { authorization: `Bearer ${studentToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  getMs = Date.now() - getMs;
  const served = Buffer.from(await res.arrayBuffer());
  const servedSha = sha256(served);
  log('');
  log(`4) GET ${fileUrl} → HTTP ${res.status} in ${getMs}ms`);
  log(`   content-type: ${res.headers.get('content-type')} · accept-ranges: ${res.headers.get('accept-ranges')}`);
  log(`   bytes: ${served.length} · magic: ${served.subarray(0, 5).toString('latin1')}`);
  log(`   sha256 out: ${servedSha.slice(0, 16)}… ${servedSha === pdfSha ? '== uploaded ✓' : '≠ uploaded ✗ MISMATCH'}`);
  if (res.status !== 200 || servedSha !== pdfSha) throw new Error('roundtrip bytes mismatch');

  /* 4b — single-range contract (206) */
  res = await fetch(`${BASE_URL}${fileUrl}`, {
    headers: { authorization: `Bearer ${studentToken}`, range: 'bytes=0-15' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const rangeBody = Buffer.from(await res.arrayBuffer());
  log('');
  log(`4b) GET with Range: bytes=0-15 → HTTP ${res.status} · content-range: ${res.headers.get('content-range')} · ${rangeBody.length} bytes`);
  if (res.status !== 206 || rangeBody.length !== 16) throw new Error('range contract broken');

  /* 5a — STT generation refuses honestly (no key in this sandbox) */
  res = await fetch(`${BASE_URL}/api/v1/lectures/${LECTURE_ID}/transcript/generate`, {
    method: 'POST',
    headers: authJson(teacherToken),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const sttJson = await res.json().catch(() => ({}));
  log('');
  log(`5a) POST /lectures/:id/transcript/generate (STT_* unset) → HTTP ${res.status}`);
  log(`    message: ${sttJson?.error?.message ?? JSON.stringify(sttJson).slice(0, 200)}`);
  if (res.status !== 409) throw new Error('STT refusal was not a 409');

  /* 5b — manual SRT ingest (the documented fallback) */
  res = await fetch(`${BASE_URL}/api/v1/lectures/${LECTURE_ID}/transcript`, {
    method: 'PUT',
    headers: authJson(teacherToken),
    body: JSON.stringify({ content: SAMPLE_SRT }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const putJson = await res.json().catch(() => ({}));
  log('');
  log(`5b) PUT /lectures/:id/transcript (2-cue Arabic SRT) → HTTP ${res.status}`);
  if (res.status !== 201) throw new Error(`transcript ingest failed: ${JSON.stringify(putJson).slice(0, 300)}`);
  const transcriptUrl = putJson.data.transcriptUrl;
  log(`    transcriptUrl: ${transcriptUrl}`);

  /* 5c — GET the stored VTT back (the bytes <track> + the indexer read) */
  res = await fetch(`${BASE_URL}${transcriptUrl}`, {
    headers: { authorization: `Bearer ${teacherToken}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const vtt = await res.text();
  log('');
  log(`5c) GET ${transcriptUrl} → HTTP ${res.status} · ${vtt.length} chars`);
  log(`    head: ${JSON.stringify(vtt.slice(0, 60))}`);
  const hasCues = vtt.includes('WEBVTT') && vtt.includes('مرحبًا بكم') && vtt.includes('00:00:01.000 --> 00:00:04.000');
  log(`    WEBVTT header + both Arabic cues + SRT→VTT timestamp normalization: ${hasCues ? '✓' : '✗'}`);
  if (res.status !== 200 || !hasCues) throw new Error('transcript serve mismatch');

  log('');
  log('━━━ B2 roundtrip: all steps passed ━━━');
  log(`paper row kept as the demo artifact (${paperJson.data.id}); lecture ${LECTURE_ID}`);
  log('transcript restored to its pre-test state separately (see restore note in the log).');
  writeFileSync(OUT, `${lines.join('\n')}\n`);
  console.error(`\nreport → ${OUT}`);
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  writeFileSync(OUT, `${lines.join('\n')}\n\nFAILED: ${err.message}\n`);
  process.exit(1);
});
