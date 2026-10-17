/**
 * Backend unit test — r166d (WS-E3): the PDF serving routes ride the
 * storage abstraction honestly (backend/src/http/routes/files.routes.ts
 * servePdfFromStorage + the two gated GET routes).
 *
 * The pure guards (traversal/extension/oversight) are pinned by
 * files-guard.test.ts; what had no coverage is the ROUTE-LEVEL
 * conversation: stat → 404, 200 with the PDF headers, single-range →
 * 206 + Content-Range, unsatisfiable range → 416, and the access gate
 * 404ing BEFORE storage is consulted. The real app rides an ephemeral
 * port (the owner-alerts-counts pattern): prisma mocked at db.js, the
 * storage driver mocked at the lib boundary (pure key helpers stay
 * REAL — buildStorageKey is the contract between route and driver).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    researchPaper: { findFirst: vi.fn() },
    material: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  withRetry: vi.fn(),
}));

/* The driver mock lives in a hoisted box so the module-factory
 * (hoisted above every import) can hand the SAME instance to every
 * getStorage() call the routes make. */
const storageMock = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  getRange: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('../../src/lib/storage.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/storage.js')>();
  return {
    ...actual, // buildStorageKey / guards / serving-path helpers stay REAL
    getStorage: () => storageMock,
  };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(async () => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

// ── Mocked delegates + helpers ─────────────────────────────────────

const paperFindFirst = vi.mocked(prisma.researchPaper.findFirst);
const materialFindFirst = vi.mocked(prisma.material.findFirst);

const PDF_BYTES = Buffer.from('%PDF-1.7\nroute serving test payload \u00ff\u00fe', 'latin1');
const PDF_FILENAME = 'cku5c2x9p0000route.pdf';

const bearer = (userId: string, role: Role) => ({
  authorization: `Bearer ${signAccessToken(userId, role, null)}`,
});

const getPdf = (role: Role, filename = PDF_FILENAME, range?: string) =>
  fetch(`${baseUrl}/api/v1/files/papers/${filename}`, {
    headers: { ...bearer(role === Role.ADMIN ? 'admin-1' : 'student-1', role), ...(range ? { range } : {}) },
  });

beforeEach(() => {
  vi.clearAllMocks();
  // Default store state: the object exists at its full size.
  storageMock.stat.mockResolvedValue({ size: PDF_BYTES.length });
  storageMock.get.mockResolvedValue(PDF_BYTES);
});

// ── GET /files/papers/:filename — the serving conversation ────────

describe('GET /api/v1/files/papers/:filename — full-body serving (oversight role)', () => {
  it('200 + application/pdf + the true Content-Length + Accept-Ranges + private cache', async () => {
    const res = await getPdf(Role.ADMIN);
    expect(res.status).toBe(200);

    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(res.headers.get('content-length')).toBe(String(PDF_BYTES.length));
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(res.headers.get('cache-control')).toBe('private, max-age=3600');

    const body = Buffer.from(await res.arrayBuffer());
    expect(body.equals(PDF_BYTES)).toBe(true);
    // The serving key the route built for the driver (real buildStorageKey).
    expect(storageMock.stat).toHaveBeenCalledWith(`papers/${PDF_FILENAME}`);
    expect(storageMock.get).toHaveBeenCalledWith(`papers/${PDF_FILENAME}`);
    expect(storageMock.getRange).not.toHaveBeenCalled();
    // Oversight roles skip the paper-row lookup entirely.
    expect(paperFindFirst).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/files/papers/:filename — single-range serving', () => {
  it('a satisfiable window answers 206 with Content-Range and the sliced bytes', async () => {
    const start = 2;
    const end = 11;
    const slice = PDF_BYTES.subarray(start, end + 1);
    storageMock.getRange.mockResolvedValue(slice);

    const res = await getPdf(Role.ADMIN, PDF_FILENAME, `bytes=${start}-${end}`);
    expect(res.status).toBe(206);
    expect(res.headers.get('content-range')).toBe(`bytes ${start}-${end}/${PDF_BYTES.length}`);
    // Content-Length is the SLICE length — the truth about the bytes served.
    expect(res.headers.get('content-length')).toBe(String(slice.length));
    expect(Buffer.from(await res.arrayBuffer()).equals(slice)).toBe(true);

    expect(storageMock.stat).toHaveBeenCalledWith(`papers/${PDF_FILENAME}`);
    expect(storageMock.getRange).toHaveBeenCalledWith(`papers/${PDF_FILENAME}`, start, end);
    expect(storageMock.get).not.toHaveBeenCalled();
  });

  it('an unsatisfiable range (start at/past EOF) answers 416 with Content-Range bytes */size and NO body read', async () => {
    const res = await getPdf(Role.ADMIN, PDF_FILENAME, `bytes=${PDF_BYTES.length}-999`);
    expect(res.status).toBe(416);
    expect(res.headers.get('content-range')).toBe(`bytes */${PDF_BYTES.length}`);
    expect(storageMock.get).not.toHaveBeenCalled();
    expect(storageMock.getRange).not.toHaveBeenCalled();
  });

  it('a malformed / multi-range header is ignored honestly — full 200 (single-range support only)', async () => {
    for (const bad of ['bytes=5-2', 'bytes=0-1,5-9', 'notbytes', 'bytes=-']) {
      const res = await getPdf(Role.ADMIN, PDF_FILENAME, bad);
      expect(res.status).toBe(200);
      expect(Buffer.from(await res.arrayBuffer()).equals(PDF_BYTES)).toBe(true);
    }
    expect(storageMock.getRange).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/files/papers/:filename — absence + the access gate', () => {
  it('stat → null answers 404 with the one Arabic refusal message (never a fake 500)', async () => {
    storageMock.stat.mockResolvedValue(null);

    const res = await getPdf(Role.ADMIN);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.message).toBe('الملف غير موجود');
    expect(storageMock.get).not.toHaveBeenCalled();
  });

  it('a STUDENT without an authorizing paper row is 404ed BEFORE storage is consulted (no existence leak)', async () => {
    paperFindFirst.mockResolvedValue(null);

    const res = await getPdf(Role.STUDENT);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string } };
    // Deliberately the SAME message as absent bytes — indistinguishable.
    expect(body.error.message).toBe('الملف غير موجود');
    expect(paperFindFirst).toHaveBeenCalledWith({
      where: {
        fileUrl: { endsWith: `/${PDF_FILENAME}` },
        OR: [{ status: 'PUBLISHED' }, { studentId: 'student-1' }, { reviewerId: 'student-1' }],
      },
      select: { id: true },
    });
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('a STUDENT with an authorizing row is served (the gate opens, then the same serving path)', async () => {
    paperFindFirst.mockResolvedValue({ id: 'paper-1' } as never);

    const res = await getPdf(Role.STUDENT);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(storageMock.stat).toHaveBeenCalledWith(`papers/${PDF_FILENAME}`);
  });
});

// ── GET /files/materials/:filename — the sibling route ────────────

describe('GET /api/v1/files/materials/:filename — same serving, Material-gated', () => {
  it('an enrolled student is served through the same 200/pdf/length conversation', async () => {
    materialFindFirst.mockResolvedValue({ id: 'material-1' } as never);

    const done = await fetch(`${baseUrl}/api/v1/files/materials/${PDF_FILENAME}`, {
      headers: bearer('student-1', Role.STUDENT),
    });
    expect(done.status).toBe(200);
    expect(done.headers.get('content-type')).toBe('application/pdf');
    expect(done.headers.get('content-length')).toBe(String(PDF_BYTES.length));

    expect(materialFindFirst).toHaveBeenCalledWith({
      where: {
        url: { endsWith: `/${PDF_FILENAME}` },
        OR: [
          { offering: { teacherId: 'student-1' } },
          { offering: { enrollments: { some: { studentId: 'student-1', status: 'active' } } } },
        ],
      },
      select: { id: true },
    });
    expect(storageMock.stat).toHaveBeenCalledWith(`materials/${PDF_FILENAME}`);
    expect(storageMock.get).toHaveBeenCalledWith(`materials/${PDF_FILENAME}`);
  });

  it('no authorizing material row → the same 404 refusal, storage untouched', async () => {
    materialFindFirst.mockResolvedValue(null);

    const res = await fetch(`${baseUrl}/api/v1/files/materials/${PDF_FILENAME}`, {
      headers: bearer('student-1', Role.STUDENT),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('الملف غير موجود');
    expect(storageMock.stat).not.toHaveBeenCalled();
  });
});
