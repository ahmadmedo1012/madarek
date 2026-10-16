/**
 * DB integration — r175: the PostgresDriver (STORAGE_DRIVER=postgres)
 * against a REAL disposable Postgres, plus the authenticated serving
 * routes reading through it (files.routes.ts both namespaces).
 *
 * What this proves that the unit seam (storage-driver.test.ts) cannot:
 *  · real BYTEA round-trips through Prisma's `Bytes` mapping — byte
 *    integrity survives the driver ↔ Postgres ↔ driver trip;
 *  · durability is IN THE DATABASE, not process memory: bytes written
 *    through the app's PrismaClient are read back through a BRAND-NEW
 *    PrismaClient (a fresh-process simulation — the honest analogue of
 *    "does it survive a redeploy" inside a test);
 *  · the authenticated serving contracts: papers (owner 200 + exact
 *    bytes, single-range 206 + exact slice, non-owner 404) and
 *    materials (enrolled student 200, unenrolled 404) — through the
 *    REAL app with the postgres driver selected.
 *
 * Upload-failure cleanup note: the row-never-survives-a-failed-put
 * behavior is ROUTE logic shared by every driver and is integration-
 * pinned in files-quota-transaction.test.ts (local driver + ENOTDIR
 * failure); the postgres put-failure PROPAGATION is pinned at the unit
 * seam (storage-driver.test.ts, "model failure on put propagates").
 * Together they cover the cleanup contract for the postgres driver.
 *
 * Import discipline (same as files-quota-transaction.test.ts): env.ts
 * snapshots process.env at import time and getStorage() memoizes the
 * driver from that snapshot — STORAGE_DRIVER=postgres is set BEFORE
 * any src module is loaded; all src/helpers imports are DYNAMIC.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { randomBytes } from 'node:crypto';
import { PrismaClient, Role } from '@prisma/client';

// The driver selection — read by env.ts BEFORE any src import below.
process.env.STORAGE_DRIVER = 'postgres';

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
  delete process.env.STORAGE_DRIVER;
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
});

/** Binary content that is NOT utf8-roundtrip-safe — latin1 high bytes,
 * NUL-adjacent bytes, and a random 64 KB body (the size-reporting pin). */
const PDF_BYTES = Buffer.from(
  '%PDF-1.7\nr175 postgres driver integration \u00ff\u00fe\u0001\u0002\n',
  'latin1',
);
const BIG_PDF = Buffer.concat([PDF_BYTES, randomBytes(64 * 1024)]);

/** The teaching chain the materials access guard walks. */
async function seedOffering() {
  const teacher = await helpers.seedUser({ role: Role.TEACHER });
  const faculty = await prisma.faculty.create({ data: { name: 'كلية اختبار r175' } });
  const department = await prisma.department.create({ data: { name: 'قسم اختبار r175', facultyId: faculty.id } });
  const course = await prisma.course.create({
    data: { code: `CS-${helpers.uniqueSuffix()}`, name: 'مقرر اختبار r175', departmentId: department.id },
  });
  const offering = await prisma.courseOffering.create({
    data: { courseId: course.id, teacherId: teacher.id, term: '2026-FALL' },
  });
  return { teacher, faculty, department, course, offering };
}

// ─── Driver contract against the real database ─────────────────────

describe('PostgresDriver — BYTEA round-trips against real Postgres', () => {
  it('put → stat → get returns the exact bytes (both namespaces, size reported)', async () => {
    const driver = getStorage();
    await driver.put('papers/cku5r175pg0001roundtrip.pdf', PDF_BYTES);
    await driver.put('materials/cku5r175pg0002roundtrip.pdf', PDF_BYTES);

    expect(await driver.stat('papers/cku5r175pg0001roundtrip.pdf')).toEqual({ size: PDF_BYTES.length });
    const got = await driver.get('papers/cku5r175pg0001roundtrip.pdf');
    expect(got).not.toBeNull();
    expect(got!.equals(PDF_BYTES)).toBe(true); // byte-equal, not just length
    expect((await driver.get('materials/cku5r175pg0002roundtrip.pdf'))!.equals(PDF_BYTES)).toBe(true);
  });

  it('a 64 KB body keeps byte integrity and reports its true size', async () => {
    const driver = getStorage();
    await driver.put('papers/cku5r175pg0003big.pdf', BIG_PDF);
    expect(await driver.stat('papers/cku5r175pg0003big.pdf')).toEqual({ size: BIG_PDF.length });
    const got = await driver.get('papers/cku5r175pg0003big.pdf');
    expect(got!.length).toBe(BIG_PDF.length);
    expect(got!.equals(BIG_PDF)).toBe(true);
  });

  it('getRange returns the exact inclusive slice; out-of-bounds windows are null', async () => {
    const driver = getStorage();
    await driver.put('papers/cku5r175pg0004range.pdf', BIG_PDF);
    const start = 40;
    const end = 10_000;
    const slice = await driver.getRange('papers/cku5r175pg0004range.pdf', start, end);
    expect(slice!.equals(BIG_PDF.subarray(start, end + 1))).toBe(true);
    // Past-EOF clamps (honest partial tail):
    const tail = await driver.getRange('papers/cku5r175pg0004range.pdf', BIG_PDF.length - 4, BIG_PDF.length + 50);
    expect(tail!.equals(BIG_PDF.subarray(BIG_PDF.length - 4))).toBe(true);
    // Out-of-bounds → null, never a truncated lie:
    expect(await driver.getRange('papers/cku5r175pg0004range.pdf', BIG_PDF.length, BIG_PDF.length + 5)).toBeNull();
    expect(await driver.getRange('papers/cku5r175pg0004range.pdf', 5, 4)).toBeNull();
    expect(await driver.getRange('papers/cku5r175pg0004range.pdf', -1, 4)).toBeNull();
  });

  it('missing objects: get/stat/getRange → null (never a fake empty file)', async () => {
    const driver = getStorage();
    expect(await driver.get('papers/missing-r175.pdf')).toBeNull();
    expect(await driver.stat('papers/missing-r175.pdf')).toBeNull();
    expect(await driver.getRange('papers/missing-r175.pdf', 0, 10)).toBeNull();
  });

  it('re-put on the same key REPLACES the bytes (upsert — the overwrite semantics)', async () => {
    const driver = getStorage();
    await driver.put('papers/cku5r175pg0005replace.pdf', BIG_PDF);
    await driver.put('papers/cku5r175pg0005replace.pdf', PDF_BYTES);
    const got = await driver.get('papers/cku5r175pg0005replace.pdf');
    expect(got!.equals(PDF_BYTES)).toBe(true);
    expect(await driver.stat('papers/cku5r175pg0005replace.pdf')).toEqual({ size: PDF_BYTES.length });
  });

  it('DURABILITY: bytes written through the app client are read back through a BRAND-NEW PrismaClient', async () => {
    // A fresh PrismaClient is the closest a test gets to "the process
    // restarted": different connection, different engine instance, no
    // shared state with the writer. If the bytes come back, they live
    // in the DATABASE, not in the driver's process memory.
    await getStorage().put('papers/cku5r175pg0006durable.pdf', BIG_PDF);

    const freshClient = new PrismaClient();
    try {
      const row = await freshClient.binaryObject.findUnique({
        where: { key: 'papers/cku5r175pg0006durable.pdf' },
        select: { bytes: true, size: true },
      });
      expect(row).not.toBeNull();
      expect(row!.size).toBe(BIG_PDF.length);
      expect(Buffer.from(row!.bytes).equals(BIG_PDF)).toBe(true);
      // Exactly one row per canonical key — no duplication, no drift:
      expect(await freshClient.binaryObject.count()).toBe(1);
    } finally {
      await freshClient.$disconnect();
    }
  });
});

// ─── The authenticated serving routes over the postgres driver ──────

describe('files.routes.ts — papers through the postgres driver', () => {
  it('upload (STUDENT) → 201 fileUrl; the owner reads exact bytes back; range → 206 exact slice', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });

    const up = await fetch(`${baseUrl}/api/v1/files/papers`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/pdf' },
      body: new Uint8Array(BIG_PDF),
    });
    expect(up.status).toBe(201);
    const upload = (await up.json()) as { data: { fileUrl: string } };
    expect(upload.data.fileUrl).toMatch(/^\/api\/v1\/files\/papers\/c.+\.pdf$/);
    const filename = upload.data.fileUrl.split('/').pop()!;

    // Authorizing row (the serving gate resolves access through it):
    await prisma.researchPaper.create({
      data: { studentId: student.id, title: 'بحث r175', fileUrl: upload.data.fileUrl },
    });

    // Owner full read → 200 + exact bytes + honest length.
    const full = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: helpers.bearer(student.id, Role.STUDENT),
    });
    expect(full.status).toBe(200);
    expect(full.headers.get('content-type')).toBe('application/pdf');
    expect(full.headers.get('accept-ranges')).toBe('bytes');
    expect(full.headers.get('content-length')).toBe(String(BIG_PDF.length));
    const body = Buffer.from(await full.arrayBuffer());
    expect(body.equals(BIG_PDF)).toBe(true);

    // Single-range read → 206 + the exact inclusive slice.
    const ranged = await fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
      headers: { ...helpers.bearer(student.id, Role.STUDENT), range: 'bytes=100-199' },
    });
    expect(ranged.status).toBe(206);
    expect(ranged.headers.get('content-range')).toBe(`bytes 100-199/${BIG_PDF.length}`);
    expect(ranged.headers.get('content-length')).toBe('100');
    const slice = Buffer.from(await ranged.arrayBuffer());
    expect(slice.equals(BIG_PDF.subarray(100, 200))).toBe(true);
  });

  it('access stays gated: another student (no authorizing row) → 404, and the bytes are NOT served', async () => {
    const owner = await helpers.seedUser({ role: Role.STUDENT });
    const stranger = await helpers.seedUser({ role: Role.STUDENT });

    await getStorage().put('papers/cku5r175pg0007gated.pdf', PDF_BYTES);
    await prisma.researchPaper.create({
      data: { studentId: owner.id, title: 'بحث محجوب', fileUrl: '/api/v1/files/papers/cku5r175pg0007gated.pdf' },
    });

    const res = await fetch(`${baseUrl}/api/v1/files/papers/cku5r175pg0007gated.pdf`, {
      headers: helpers.bearer(stranger.id, Role.STUDENT),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('الملف غير موجود');
  });
});

describe('files.routes.ts — materials through the postgres driver', () => {
  it('teacher upload → 201 + row; enrolled student reads exact bytes; unenrolled → 404', async () => {
    const { teacher, offering } = await seedOffering();
    const enrolled = await helpers.seedUser({ role: Role.STUDENT });
    const stranger = await helpers.seedUser({ role: Role.STUDENT });
    await prisma.enrollment.create({
      data: { studentId: enrolled.id, offeringId: offering.id, status: 'active' },
    });

    const up = await fetch(
      `${baseUrl}/api/v1/offerings/${offering.id}/materials/file?name=${encodeURIComponent('مذكرة r175')}&type=PDF`,
      {
        method: 'POST',
        headers: { ...helpers.bearer(teacher.id, Role.TEACHER), 'content-type': 'application/pdf' },
        body: new Uint8Array(BIG_PDF),
      },
    );
    expect(up.status).toBe(201);
    expect(await prisma.material.count({ where: { offeringId: offering.id } })).toBe(1);
    const material = (await prisma.material.findFirst({ where: { offeringId: offering.id } }))!;
    const filename = material.url.split('/').pop()!;

    // Enrolled student: exact bytes through the gated route.
    const read = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(enrolled.id, Role.STUDENT),
    });
    expect(read.status).toBe(200);
    const body = Buffer.from(await read.arrayBuffer());
    expect(body.equals(BIG_PDF)).toBe(true);

    // Unenrolled stranger: 404, indistinguishable from a missing file.
    const denied = await fetch(`${baseUrl}/api/v1/files/materials/${filename}`, {
      headers: helpers.bearer(stranger.id, Role.STUDENT),
    });
    expect(denied.status).toBe(404);
  });

  it('a material row whose bytes were never written 404s honestly through the stat probe', async () => {
    const { offering } = await seedOffering();
    const student = await helpers.seedUser({ role: Role.STUDENT });
    await prisma.enrollment.create({
      data: { studentId: student.id, offeringId: offering.id, status: 'active' },
    });
    // The row exists, the bytes do NOT (an upload that raced a failed
    // put): serving must 404 through the stat probe — never a fake 200.
    await prisma.material.create({
      data: {
        offeringId: offering.id,
        uploaderId: (await prisma.user.findFirst({ where: { role: 'TEACHER' } }))!.id,
        name: 'مذكرة بلا بايتات',
        type: 'PDF',
        sizeBytes: BigInt(0),
        url: '/api/v1/files/materials/cku5r175pg0008no-bytes.pdf',
      },
    });

    const res = await fetch(`${baseUrl}/api/v1/files/materials/cku5r175pg0008no-bytes.pdf`, {
      headers: helpers.bearer(student.id, Role.STUDENT),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('الملف غير موجود');
  });
});
