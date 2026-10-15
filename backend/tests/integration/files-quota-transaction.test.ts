/**
 * DB integration — r171b: the material upload path's row/bytes coupling
 * and the per-user storage quota, against a REAL disposable Postgres
 * (the last piece of the documented gap: docs/16 «منطق المعاملات»).
 *
 * The seam under test (offerings.routes.ts POST /:id/materials/file):
 * the Material row is created FIRST (its generated id IS the storage
 * key), the bytes are put SECOND, and a failed put DELETES the row —
 * "atomic-ish": no row survives without its bytes. Simulating the
 * storage failure cleanly: STORAGE_DIR points at a path whose parent
 * is a regular FILE (mkdir → ENOTDIR on every put), so every write
 * fails deterministically while the DB stays healthy.
 *
 * IMPORTANT import discipline: env.ts snapshots process.env at import
 * time and getStorage() memoizes the local driver from that snapshot.
 * This file therefore sets process.env.STORAGE_DIR BEFORE any src
 * module is loaded — all src/helpers imports here are DYNAMIC (static
 * imports are hoisted above the assignment and would leak the default
 * storage root). Vitest's per-file isolation gives this file its own
 * module registry, so no other suite's driver sees this value.
 *
 * Also pins the papers quota decision (files.routes.ts, r170g): the
 * count of the user's ResearchPaper rows — a REAL DB query — decides
 * 413 vs pass; the pass case then fails at the (broken-on-purpose)
 * storage put with the distinct 500 message.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { Role } from '@prisma/client';

type Helpers = typeof import('./helpers.js');
type AppModule = typeof import('../../src/app.js');
type DbModule = typeof import('../../src/db.js');

// ── The deterministic storage failure ───────────────────────────────
const tmp = mkdtempSync(path.join(tmpdir(), 'r171b-int-'));
const blockerFile = path.join(tmp, 'blocker'); // a regular FILE…
writeFileSync(blockerFile, 'not-a-directory');
process.env.STORAGE_DIR = path.join(blockerFile, 'storage'); // …used as a directory → ENOTDIR

let helpers: Helpers;
let prisma: DbModule['prisma'];
let baseUrl: string;
let server: ReturnType<ReturnType<AppModule['createApp']>['listen']>;

beforeAll(async () => {
  helpers = await import('./helpers.js');
  const appModule: AppModule = await import('../../src/app.js');
  const dbModule: DbModule = await import('../../src/db.js');
  prisma = dbModule.prisma;
  server = appModule.createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
  // Restore worker hygiene: later files in this sequential suite must
  // not inherit the sabotaged STORAGE_DIR through their own env parse.
  delete process.env.STORAGE_DIR;
  rmSync(tmp, { recursive: true, force: true });
});

beforeEach(async () => {
  await helpers.truncateAll(prisma);
});

/** Minimal well-formed PDF: %PDF- magic bytes, no active-content
 * markers (/JavaScript /OpenAction /Launch — the r170g gate). */
const MINIMAL_PDF = Buffer.from('%PDF-1.4\n%%EOF\n', 'latin1');

interface ErrorEnvelope {
  error: { code: string; message: string };
}

describe('POST /offerings/:id/materials/file — Material row never survives a failed storage put', () => {
  it('storage put fails → 500 INTERNAL + the pre-created Material row is deleted (zero rows)', async () => {
    // Seed the teaching chain the access guard walks: teacher → offering.
    const teacher = await helpers.seedUser({ role: Role.TEACHER });
    const faculty = await prisma.faculty.create({ data: { name: 'كلية اختبار' } });
    const department = await prisma.department.create({ data: { name: 'قسم اختبار', facultyId: faculty.id } });
    const course = await prisma.course.create({
      data: { code: `CS-${helpers.uniqueSuffix()}`, name: 'مقرر اختبار', departmentId: department.id },
    });
    const offering = await prisma.courseOffering.create({
      data: { courseId: course.id, teacherId: teacher.id, term: '2026-SPRING' },
    });

    const res = await fetch(`${baseUrl}/api/v1/offerings/${offering.id}/materials/file?name=${encodeURIComponent('مذكرة الفصل')}&type=PDF`, {
      method: 'POST',
      headers: { ...helpers.bearer(teacher.id, Role.TEACHER), 'content-type': 'application/pdf' },
      body: new Uint8Array(MINIMAL_PDF),
    });

    // This exact message is only reachable AFTER material.create
    // succeeded — the route order is create → put → (fail) → delete.
    expect(res.status).toBe(500);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('تعذّر حفظ الملف — حاول مرة أخرى');

    // THE pin: the row was created and then removed — nothing survives
    // without its bytes (a leftover row would 404 on serve, but the
    // contract is stronger: it must not exist at all).
    expect(await prisma.material.count()).toBe(0);
    expect(await prisma.material.count({ where: { offeringId: offering.id } })).toBe(0);
  });
});

describe('POST /files/papers — the per-user storage quota reads the REAL row count (r170g)', () => {
  it('10 existing papers (worst-case 200 MB) → 413 quota refusal BEFORE any storage write', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    await prisma.researchPaper.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        studentId: student.id,
        title: `بحث ${i + 1}`,
      })),
    });

    const res = await fetch(`${baseUrl}/api/v1/files/papers`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/pdf' },
      body: new Uint8Array(MINIMAL_PDF),
    });
    expect(res.status).toBe(413);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('PAYLOAD_TOO_LARGE');
    expect(body.error.message).toBe('تجاوزت حصة التخزين الخاصة بك');
  });

  it('9 papers (worst-case 180 MB) → quota PASSES, the request proceeds to the storage put (distinct 500)', async () => {
    const student = await helpers.seedUser({ role: Role.STUDENT });
    await prisma.researchPaper.createMany({
      data: Array.from({ length: 9 }, (_, i) => ({
        studentId: student.id,
        title: `بحث ${i + 1}`,
      })),
    });

    const res = await fetch(`${baseUrl}/api/v1/files/papers`, {
      method: 'POST',
      headers: { ...helpers.bearer(student.id, Role.STUDENT), 'content-type': 'application/pdf' },
      body: new Uint8Array(MINIMAL_PDF),
    });
    // One paper below the cap: the DB count let the request through and
    // it failed at the (deliberately broken) storage layer instead —
    // different status AND different message than the quota refusal.
    expect(res.status).toBe(500);
    const body = (await res.json()) as ErrorEnvelope;
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('تعذّر حفظ الملف — حاول مرة أخرى');
  });
});
