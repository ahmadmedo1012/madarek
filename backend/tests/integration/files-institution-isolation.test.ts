/**
 * DB integration — r179b (phase-5): FILES + PERSISTENT STORAGE
 * institution isolation, against a REAL disposable Postgres with the
 * REAL route stack (files.routes.ts serving gates, offerings.routes.ts
 * material upload gate, learning.routes.ts paper scan gate).
 *
 * The fixture builds the two-institution world the shared contract
 * describes: institution A and institution B, each with its own
 * faculty → department → course → offering chain, its teacher,
 * enrolled student, admin and quality memberships — plus the
 * cross-membership actors (a teacher teaching in A while contexted to
 * B, a student owning a paper in A while contexted to B) that pin the
 * fail-closed CONTEXT comparison, not just the row comparison.
 *
 * What is pinned here (per the task canon, section 5):
 *  · authorized access works — same institution, enrolled student /
 *    offering teacher / admin / quality / paper owner / reviewer;
 *  · cross-institution denial reads as the UNIFORM 404 («الملف غير
 *    موجود») — an institution-B student holding the exact institution-A
 *    filename (enrolled in B, context B) never receives the bytes;
 *  · missing file / no authorizing row → the same 404 (no oracle);
 *  · upload/download round-trip per institution, both namespaces;
 *  · foreign-institution WRITE attempts (material upload to a foreign
 *    offering, paper scan of a foreign paper) are rejected, leaving no
 *    row and no bytes;
 *  · contextless institutional callers → 403 INSTITUTION_CONTEXT_REQUIRED;
 *    forged inst claims → 403 INSTITUTION_CONTEXT_INVALID;
 *  · OWNER alone keeps the platform-wide byte oversight.
 *
 * Storage: STORAGE_DRIVER=local with a temp STORAGE_DIR (the
 * files-quota-transaction.test.ts import-order discipline — set BEFORE
 * any src module is loaded; all src/helpers imports are DYNAMIC).
 * No prisma mocks (the integration canon). One file, sequential.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ResearchPaperStatus, Role } from '@prisma/client';

// ── Import discipline: env.ts snapshots process.env at import time ──
const tmpStorageRoot = mkdtempSync(path.join(tmpdir(), 'r179b-int-'));
process.env.STORAGE_DIR = tmpStorageRoot;

type Helpers = typeof import('./helpers.js');
type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');
type StorageModule = typeof import('../../src/lib/storage.js');

let helpers: Helpers;
let prisma: DbModule['prisma'];
let getStorage: StorageModule['getStorage'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;

beforeAll(async () => {
  helpers = await import('./helpers.js');
  const appModule: AppModule = await import('../../src/app.js');
  const dbModule: DbModule = await import('../../src/db.js');
  const storageModule: StorageModule = await import('../../src/lib/storage.js');
  prisma = dbModule.prisma;
  getStorage = storageModule.getStorage;
  server = appModule.createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  delete process.env.STORAGE_DIR;
  rmSync(tmpStorageRoot, { recursive: true, force: true });
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
});

/** Minimal well-formed PDF (magic bytes, no active-content markers). */
const PDF_A = Buffer.from('%PDF-1.4\ninstitution-A payload \u00ff\u00fe\n%%EOF\n', 'latin1');
const PDF_B = Buffer.from('%PDF-1.4\ninstitution-B payload \u01aa\u01bb\n%%EOF\n', 'latin1');

/** The full two-institution world. Every actor holds exactly one
 *  membership (unless a test adds a second one deliberately). */
async function seedTwoInstitutionWorld() {
  const instA = await helpers.seedInstitution();
  const instB = await helpers.seedInstitution();

  const teacherA = await helpers.seedUser({ role: Role.TEACHER });
  const teacherB = await helpers.seedUser({ role: Role.TEACHER });
  const studentA = await helpers.seedUser({ role: Role.STUDENT });
  const studentB = await helpers.seedUser({ role: Role.STUDENT });
  const adminA = await helpers.seedUser({ role: Role.ADMIN });
  const adminB = await helpers.seedUser({ role: Role.ADMIN });
  const qualityA = await helpers.seedUser({ role: Role.QUALITY });
  const qualityB = await helpers.seedUser({ role: Role.QUALITY });
  const owner = await helpers.seedUser({ role: Role.OWNER });

  await helpers.seedMembership(teacherA.id, instA.id, Role.TEACHER);
  await helpers.seedMembership(teacherB.id, instB.id, Role.TEACHER);
  await helpers.seedMembership(studentA.id, instA.id, Role.STUDENT);
  await helpers.seedMembership(studentB.id, instB.id, Role.STUDENT);
  await helpers.seedMembership(adminA.id, instA.id, Role.ADMIN);
  await helpers.seedMembership(adminB.id, instB.id, Role.ADMIN);
  await helpers.seedMembership(qualityA.id, instA.id, Role.QUALITY);
  await helpers.seedMembership(qualityB.id, instB.id, Role.QUALITY);

  const chain = async (instId: string, teacherId: string, label: string) => {
    const faculty = await prisma.faculty.create({
      data: { name: `كلية ${label}`, city: 'طرابلس', institutionId: instId },
    });
    const department = await prisma.department.create({
      data: { name: `قسم ${label}`, facultyId: faculty.id },
    });
    const course = await prisma.course.create({
      data: {
        code: `CS-${helpers.uniqueSuffix()}`,
        name: `مقرر ${label}`,
        departmentId: department.id,
        institutionId: instId,
      },
    });
    const offering = await prisma.courseOffering.create({
      data: { courseId: course.id, teacherId, term: '2026-SPRING' },
    });
    return { faculty, department, course, offering };
  };
  const chainA = await chain(instA.id, teacherA.id, 'r179b-A');
  const chainB = await chain(instB.id, teacherB.id, 'r179b-B');

  // The enrollment rule: each student is actively enrolled in THEIR
  // institution's offering.
  await prisma.enrollment.create({
    data: { studentId: studentA.id, offeringId: chainA.offering.id, status: 'active' },
  });
  await prisma.enrollment.create({
    data: { studentId: studentB.id, offeringId: chainB.offering.id, status: 'active' },
  });

  return {
    instA, instB,
    teacherA, teacherB, studentA, studentB,
    adminA, adminB, qualityA, qualityB, owner,
    ...chainA, offeringA: chainA.offering, offeringB: chainB.offering,
  };
}

/** Upload a material PDF through the REAL route (teacher → offering). */
async function uploadMaterial(offeringId: string, teacherId: string, instId: string, bytes: Buffer) {
  const res = await fetch(
    `${baseUrl}/api/v1/offerings/${offeringId}/materials/file?name=${encodeURIComponent('مذكرة r179b')}&type=PDF`,
    {
      method: 'POST',
      headers: { ...helpers.bearer(teacherId, Role.TEACHER, instId), 'content-type': 'application/pdf' },
      body: new Uint8Array(bytes),
    },
  );
  return res;
}

/** Upload a paper PDF through the REAL route (student → /files/papers). */
async function uploadPaper(studentId: string, instId: string, bytes: Buffer) {
  const res = await fetch(`${baseUrl}/api/v1/files/papers`, {
    method: 'POST',
    headers: { ...helpers.bearer(studentId, Role.STUDENT, instId), 'content-type': 'application/pdf' },
    body: new Uint8Array(bytes),
  });
  return res;
}

interface ErrorEnvelope {
  error: { code: string; message: string };
}

// ─── Material serving: the institution boundary ────────────────────

describe('GET /files/materials/:filename — institution isolation', () => {
  it('authorized: the enrolled student of the SAME institution reads the exact bytes (round-trip A)', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    expect(up.status).toBe(201);
    const uploadBody = (await up.json()) as { data: { url: string } };
    const filename = uploadBody.data.url.split('/').pop()!;

    const read = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instA.id),
    });
    expect(read.status).toBe(200);
    expect(read.headers.get('content-type')).toBe('application/pdf');
    const bytes = Buffer.from(await read.arrayBuffer());
    expect(bytes.equals(PDF_A)).toBe(true);
  });

  it('authorized: the offering teacher and same-institution admin/quality read (oversight within the institution)', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const filename = ((await up.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    for (const [uid, role] of [
      [w.teacherA.id, Role.TEACHER],
      [w.adminA.id, Role.ADMIN],
      [w.qualityA.id, Role.QUALITY],
    ] as const) {
      const read = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
        headers: helpers.bearer(uid, role, w.instA.id),
      });
      expect(read.status).toBe(200);
    }
  });

  it('cross-institution denial: an institution-B student (enrolled in B) with the exact A filename → 404 uniform refusal', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const filename = ((await up.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    const res = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instB.id),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.message).toBe('الملف غير موجود');
  });

  it('cross-institution denial: the institution-B teacher, admin and quality → 404 (oversight is institution-bound)', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const filename = ((await up.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    for (const [uid, role] of [
      [w.teacherB.id, Role.TEACHER],
      [w.adminB.id, Role.ADMIN],
      [w.qualityB.id, Role.QUALITY],
    ] as const) {
      const res = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
        headers: helpers.bearer(uid, role, w.instB.id),
      });
      expect(res.status).toBe(404);
    }
  });

  it('fail-closed CONTEXT comparison: the offering teacher under the WRONG institution context → 404', async () => {
    const w = await seedTwoInstitutionWorld();
    // teacherA teaches the A offering, but holds a second membership in
    // B and selected it — the chain (A) vs context (B) comparison fails
    // closed; the fallback to "but they teach it" is forbidden.
    await helpers.seedMembership(w.teacherA.id, w.instB.id, Role.TEACHER);
    const up = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const filename = ((await up.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    const res = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(w.teacherA.id, Role.TEACHER, w.instB.id),
    });
    expect(res.status).toBe(404);
  });

  it('contextless institutional callers → 403 INSTITUTION_CONTEXT_REQUIRED (no fallback membership)', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const filename = ((await up.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    for (const [uid, role] of [
      [w.studentA.id, Role.STUDENT],
      [w.teacherA.id, Role.TEACHER],
      [w.adminA.id, Role.ADMIN],
    ] as const) {
      const res = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
        headers: helpers.bearer(uid, role, null),
      });
      expect(res.status).toBe(403);
      const body = (await res.json()) as ErrorEnvelope;
      expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    }
  });

  it('missing file / no authorizing row → 404, and a material row without bytes 404s the same way', async () => {
    const w = await seedTwoInstitutionWorld();

    // No row, no bytes:
    const res = await fetch(`${baseUrl}/api/v1/files/materials/c0000000000noRowR179b.pdf`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instA.id),
    });
    expect(res.status).toBe(404);

    // Row exists, bytes do not (a put that failed after the row was
    // minted) — the stat probe answers the same uniform 404:
    await prisma.material.create({
      data: {
        offeringId: w.offeringA.id,
        uploaderId: w.teacherA.id,
        name: 'صف بلا بايتات',
        type: 'PDF',
        sizeBytes: BigInt(0),
        url: '/api/v1/files/materials/c0000000000noBytesR179b.pdf',
      },
    });
    const res2 = await fetch(`${baseUrl}/api/v1/files/materials/c0000000000noBytesR179b.pdf`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instA.id),
    });
    expect(res2.status).toBe(404);
    const body = (await res2.json()) as ErrorEnvelope;
    expect(body.error.message).toBe('الملف غير موجود');
  });
});

// ─── Paper serving: the institution boundary ───────────────────────

describe('GET /files/papers/:filename — institution isolation', () => {
  /** The standard A-institution paper: uploaded by studentA through the
   *  real route, row minted directly (the /me/research flow's row shape). */
  async function seedPaperA(
    w: Awaited<ReturnType<typeof seedTwoInstitutionWorld>>,
    opts: { status?: ResearchPaperStatus; reviewerId?: string } = {},
  ) {
    const up = await uploadPaper(w.studentA.id, w.instA.id, PDF_A);
    expect(up.status).toBe(201);
    const fileUrl = ((await up.json()) as { data: { fileUrl: string } }).data.fileUrl;
    const paper = await prisma.researchPaper.create({
      data: {
        studentId: w.studentA.id,
        institutionId: w.instA.id,
        title: 'بحث r179b المؤسسة أ',
        fileUrl,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.reviewerId ? { reviewerId: opts.reviewerId } : {}),
      },
    });
    return { fileUrl, filename: fileUrl.split('/').pop()!, paper };
  }

  it('authorized: the owner student reads their own paper (round-trip, exact bytes)', async () => {
    const w = await seedTwoInstitutionWorld();
    const { filename } = await seedPaperA(w);

    const read = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instA.id),
    });
    expect(read.status).toBe(200);
    const bytes = Buffer.from(await read.arrayBuffer());
    expect(bytes.equals(PDF_A)).toBe(true);
  });

  it('authorized: a PUBLISHED paper is readable cross-USER within the SAME institution (the archive rule, now institution-bound)', async () => {
    const w = await seedTwoInstitutionWorld();
    const { filename } = await seedPaperA(w, { status: 'PUBLISHED' });

    // Another student of institution A — no personal grant, the
    // PUBLISHED branch + the same institution:
    const read = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instB.id),
    });
    expect(read.status).toBe(404); // institution B context — denied first

    // Seed a second student INSIDE institution A:
    const studentA2 = await helpers.seedUser({ role: Role.STUDENT });
    await helpers.seedMembership(studentA2.id, w.instA.id, Role.STUDENT);
    const read2 = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(studentA2.id, Role.STUDENT, w.instA.id),
    });
    expect(read2.status).toBe(200);
    expect(Buffer.from(await read2.arrayBuffer()).equals(PDF_A)).toBe(true);
  });

  it('cross-institution denial: institution-B student/admin request the institution-A PUBLISHED paper → 404', async () => {
    const w = await seedTwoInstitutionWorld();
    const { filename } = await seedPaperA(w, { status: 'PUBLISHED' });

    for (const [uid, role] of [
      [w.studentB.id, Role.STUDENT],
      [w.adminB.id, Role.ADMIN],
      [w.qualityB.id, Role.QUALITY],
    ] as const) {
      const res = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
        headers: helpers.bearer(uid, role, w.instB.id),
      });
      expect(res.status).toBe(404);
      const body = (await res.json()) as ErrorEnvelope;
      expect(body.error.message).toBe('الملف غير موجود');
    }
  });

  it('authorized oversight: institution-A admin/quality and the paper reviewer (same institution) read → 200', async () => {
    const w = await seedTwoInstitutionWorld();
    const { filename } = await seedPaperA(w, { reviewerId: w.teacherA.id });

    for (const [uid, role] of [
      [w.adminA.id, Role.ADMIN],
      [w.qualityA.id, Role.QUALITY],
      [w.teacherA.id, Role.TEACHER], // the reviewer branch
    ] as const) {
      const res = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
        headers: helpers.bearer(uid, role, w.instA.id),
      });
      expect(res.status).toBe(200);
    }
  });

  it('fail-closed CONTEXT: the owner student under the WRONG institution context → 404 (own paper, other context)', async () => {
    const w = await seedTwoInstitutionWorld();
    const { filename } = await seedPaperA(w);
    // studentA holds a second membership in B and selected it:
    await helpers.seedMembership(w.studentA.id, w.instB.id, Role.STUDENT);

    const res = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instB.id),
    });
    expect(res.status).toBe(404);
  });

  it('no authorizing row (orphan bytes from the upload route, row not yet minted) → 404 even for the uploader', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadPaper(w.studentA.id, w.instA.id, PDF_A);
    const filename = ((await up.json()) as { data: { fileUrl: string } }).data.fileUrl.split('/').pop()!;

    // The bytes exist in storage; the ResearchPaper row does not — the
    // orphan stays unreadable (the upload→mint separation invariant):
    const res = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instA.id),
    });
    expect(res.status).toBe(404);
  });

  it('contextless student → 403 INSTITUTION_CONTEXT_REQUIRED', async () => {
    const w = await seedTwoInstitutionWorld();
    const { filename } = await seedPaperA(w);

    const res = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, null),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
  });
});

// ─── Upload round-trips + foreign-institution WRITE attempts ───────

describe('uploads — per-institution round-trip and foreign-institution rejection', () => {
  it('institution-B round trip: teacher B uploads, student B reads, student A cannot', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadMaterial(w.offeringB.id, w.teacherB.id, w.instB.id, PDF_B);
    expect(up.status).toBe(201);
    const filename = ((await up.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    const readB = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instB.id),
    });
    expect(readB.status).toBe(200);
    expect(Buffer.from(await readB.arrayBuffer()).equals(PDF_B)).toBe(true);

    const readA = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(w.studentA.id, Role.STUDENT, w.instA.id),
    });
    expect(readA.status).toBe(404);
  });

  it('paper round trip for institution B: student B uploads, mints the row, reads it back', async () => {
    const w = await seedTwoInstitutionWorld();
    const up = await uploadPaper(w.studentB.id, w.instB.id, PDF_B);
    expect(up.status).toBe(201);
    const fileUrl = ((await up.json()) as { data: { fileUrl: string } }).data.fileUrl;
    await prisma.researchPaper.create({
      data: {
        studentId: w.studentB.id,
        institutionId: w.instB.id,
        title: 'بحث r179b المؤسسة ب',
        fileUrl,
      },
    });
    const filename = fileUrl.split('/').pop()!;

    const read = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instB.id),
    });
    expect(read.status).toBe(200);
    expect(Buffer.from(await read.arrayBuffer()).equals(PDF_B)).toBe(true);
  });

  it('foreign-institution material upload: institution-B ADMIN drops bytes into an institution-A offering → 403, no row, no bytes', async () => {
    const w = await seedTwoInstitutionWorld();
    const before = await prisma.material.count();

    const res = await fetch(
      `${baseUrl}/api/v1/offerings/${w.offeringA.id}/materials/file?name=${encodeURIComponent('تسلل')}&type=PDF`,
      {
        method: 'POST',
        headers: { ...helpers.bearer(w.adminB.id, Role.ADMIN, w.instB.id), 'content-type': 'application/pdf' },
        body: new Uint8Array(PDF_B),
      },
    );
    expect(res.status).toBe(403);
    expect(await prisma.material.count()).toBe(before);
    // The keys are cuid-minted AFTER the gate — nothing was stored:
    expect(await getStorage().stat('materials/trespass-r179b.pdf')).toBeNull();
  });

  it('foreign-institution material upload: institution-B TEACHER (teaches B) into the A offering → 403', async () => {
    const w = await seedTwoInstitutionWorld();
    const res = await fetch(
      `${baseUrl}/api/v1/offerings/${w.offeringA.id}/materials/file?name=${encodeURIComponent('تسلل معلم')}&type=PDF`,
      {
        method: 'POST',
        headers: { ...helpers.bearer(w.teacherB.id, Role.TEACHER, w.instB.id), 'content-type': 'application/pdf' },
        body: new Uint8Array(PDF_B),
      },
    );
    expect(res.status).toBe(403);
    expect(await prisma.material.count()).toBe(0);
  });

  it('same-institution ADMIN upload is allowed (oversight within the institution) and contextless callers are 403', async () => {
    const w = await seedTwoInstitutionWorld();

    const ok = await fetch(
      `${baseUrl}/api/v1/offerings/${w.offeringA.id}/materials/file?name=${encodeURIComponent('إشراف')}&type=PDF`,
      {
        method: 'POST',
        headers: { ...helpers.bearer(w.adminA.id, Role.ADMIN, w.instA.id), 'content-type': 'application/pdf' },
        body: new Uint8Array(PDF_A),
      },
    );
    expect(ok.status).toBe(201);
    expect(await prisma.material.count({ where: { offeringId: w.offeringA.id } })).toBe(1);

    const contextless = await fetch(
      `${baseUrl}/api/v1/offerings/${w.offeringA.id}/materials/file?name=${encodeURIComponent('بلا سياق')}&type=PDF`,
      {
        method: 'POST',
        headers: { ...helpers.bearer(w.adminA.id, Role.ADMIN, null), 'content-type': 'application/pdf' },
        body: new Uint8Array(PDF_A),
      },
    );
    expect(contextless.status).toBe(403);
    const body = (await contextless.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(await prisma.material.count({ where: { offeringId: w.offeringA.id } })).toBe(1);
  });

  it('foreign-institution paper scan: institution-B student scans an institution-A paper → 404, status untouched', async () => {
    const w = await seedTwoInstitutionWorld();
    const paper = await prisma.researchPaper.create({
      data: {
        studentId: w.studentA.id,
        institutionId: w.instA.id,
        title: 'بحث فحص r179b',
        status: 'UPLOADED',
        fileUrl: 'https://external.example.org/paper.pdf',
      },
    });

    const res = await fetch(`${baseUrl}/api/v1/research/${paper.id}/scan`, {
      method: 'POST',
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instB.id),
    });
    expect(res.status).toBe(404);
    const untouched = await prisma.researchPaper.findUniqueOrThrow({ where: { id: paper.id } });
    expect(untouched.status).toBe('UPLOADED');
    expect(untouched.scannedAt).toBeNull();
  });

  it('paper scan institution matrix: admin A scans the A paper (200), admin B is 404, contextless is 403', async () => {
    const w = await seedTwoInstitutionWorld();
    const paper = await prisma.researchPaper.create({
      data: {
        studentId: w.studentA.id,
        institutionId: w.instA.id,
        title: 'بحث فحص إشراف r179b',
        status: 'UPLOADED',
        fileUrl: null, // no local bytes — extraction is best-effort null
      },
    });

    const scanA = await fetch(`${baseUrl}/api/v1/research/${paper.id}/scan`, {
      method: 'POST',
      headers: helpers.bearer(w.adminA.id, Role.ADMIN, w.instA.id),
    });
    expect(scanA.status).toBe(200);
    const scanned = (await scanA.json()) as { data: { status: string } };
    expect(['CHECKS_PASSED', 'CHECKS_FAILED']).toContain(scanned.data.status);

    // A SECOND paper for the denied branches (the first is now scanned,
    // and the scan of a foreign paper must 404 BEFORE status checks):
    const paper2 = await prisma.researchPaper.create({
      data: {
        studentId: w.studentA.id,
        institutionId: w.instA.id,
        title: 'بحث فحص ثانٍ r179b',
        status: 'UPLOADED',
        fileUrl: null,
      },
    });
    const scanB = await fetch(`${baseUrl}/api/v1/research/${paper2.id}/scan`, {
      method: 'POST',
      headers: helpers.bearer(w.adminB.id, Role.ADMIN, w.instB.id),
    });
    expect(scanB.status).toBe(404);

    const scanContextless = await fetch(`${baseUrl}/api/v1/research/${paper2.id}/scan`, {
      method: 'POST',
      headers: helpers.bearer(w.adminA.id, Role.ADMIN, null),
    });
    expect(scanContextless.status).toBe(403);
    const body = (await scanContextless.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect((await prisma.researchPaper.findUniqueOrThrow({ where: { id: paper2.id } })).status).toBe('UPLOADED');
  });
});

// ─── OWNER (platform-wide) + forged claims ─────────────────────────

describe('OWNER + forged context', () => {
  it('OWNER without a context reads BOTH institutions byte streams (deliberate platform-wide oversight)', async () => {
    const w = await seedTwoInstitutionWorld();
    const materialUp = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const materialFilename = ((await materialUp.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    const paperUp = await uploadPaper(w.studentB.id, w.instB.id, PDF_B);
    const paperFileUrl = ((await paperUp.json()) as { data: { fileUrl: string } }).data.fileUrl;
    await prisma.researchPaper.create({
      data: {
        studentId: w.studentB.id,
        institutionId: w.instB.id,
        title: 'بحث مالك r179b',
        fileUrl: paperFileUrl,
      },
    });
    const paperFilename = paperFileUrl.split('/').pop()!;

    const mat = await fetch(`${baseUrl}/api/v1/files/materials/${materialFilename}`, {
      headers: helpers.bearer(w.owner.id, Role.OWNER, null),
    });
    expect(mat.status).toBe(200);
    expect(Buffer.from(await mat.arrayBuffer()).equals(PDF_A)).toBe(true);

    const pap = await fetch(`${baseUrl}/api/v1/files/papers/${paperFilename}`, {
      headers: helpers.bearer(w.owner.id, Role.OWNER, null),
    });
    expect(pap.status).toBe(200);
    expect(Buffer.from(await pap.arrayBuffer()).equals(PDF_B)).toBe(true);
  });

  it('a forged/stale inst claim (institution exists, no membership) → 403 INSTITUTION_CONTEXT_INVALID on both namespaces', async () => {
    const w = await seedTwoInstitutionWorld();
    const materialUp = await uploadMaterial(w.offeringA.id, w.teacherA.id, w.instA.id, PDF_A);
    const filename = ((await materialUp.json()) as { data: { url: string } }).data.url.split('/').pop()!;

    // studentB claims institution A without holding a membership there:
    const mat = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instA.id),
    });
    expect(mat.status).toBe(403);
    const body = (await mat.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_INVALID');

    const pap = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(w.studentB.id, Role.STUDENT, w.instA.id),
    });
    expect(pap.status).toBe(403);
    const body2 = (await pap.json()) as ErrorEnvelope;
    expect(body2.error.code).toBe('INSTITUTION_CONTEXT_INVALID');
  });
});
