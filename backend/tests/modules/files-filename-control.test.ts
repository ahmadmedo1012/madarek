/**
 * Backend unit test — r170c: control-character filenames on the two
 * file-serving routes must answer 400 (shape refusal), never 500.
 *
 * The live repro (throwaway backend, shared dev DB): any authenticated
 * user requesting `/api/v1/files/papers/%00.pdf` got a 500 — the NUL
 * byte passes every existing filename gate, then explodes the
 * NON-oversight path inside Postgres (invalid UTF-8, error 22021, at
 * files.routes.ts researchPaper.findFirst) and the oversight path
 * inside Node fs (ERR_INVALID_ARG_VALUE in LocalDriver). A
 * client-mintable 500 + fake HTTP_500 alert row — the exact class the
 * error handler's client-reject mapping exists to prevent.
 *
 * Coverage here (pure + route-level):
 *  - containsControlChars / isSafePaperFilename / storageKeyIsValid
 *    reject NUL, newline, CR, TAB, DEL (and keep plain + Arabic names);
 *  - the real routes answer 400 «اسم الملف غير صالح» on BOTH namespaces
 *    and BOTH gate paths (student DB path, oversight fast path) BEFORE
 *    prisma or the storage driver are consulted;
 *  - a normal filename still serves 200 — the gate didn't over-block.
 *
 * Harness: the files-serving.test.ts pattern — real createApp on an
 * ephemeral port, prisma mocked at db.js, the storage driver mocked at
 * the lib boundary (pure key helpers stay REAL).
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

const storageMock = vi.hoisted(() => ({
  put: vi.fn(),
  get: vi.fn(),
  getRange: vi.fn(),
  stat: vi.fn(),
}));

vi.mock('../../src/lib/storage.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/lib/storage.js')>();
  return {
    ...actual, // storageKeyIsValid / buildStorageKey stay REAL
    getStorage: () => storageMock,
  };
});

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { storageKeyIsValid } from '../../src/lib/storage.js';
import {
  containsControlChars,
  containsTraversalPatterns,
  isSafePaperFilename,
} from '../../src/http/routes/files.routes';

// ── Pure gates ───────────────────────────────────────────────────────

describe('containsControlChars (r170c pure gate)', () => {
  it('flags the NUL byte — the byte that exploded both downstream layers', () => {
    expect(containsControlChars('\x00.pdf')).toBe(true);
    expect(containsControlChars('bad\x00name.pdf')).toBe(true);
  });

  it('flags every C0 control and DEL (newline, CR, TAB, ESC, DEL)', () => {
    expect(containsControlChars('bad\nname.pdf')).toBe(true);
    expect(containsControlChars('bad\rname.pdf')).toBe(true);
    expect(containsControlChars('bad\tname.pdf')).toBe(true);
    expect(containsControlChars('bad\x1bname.pdf')).toBe(true);
    expect(containsControlChars('bad\x7fname.pdf')).toBe(true);
  });

  it('passes plain, uppercase and Arabic filenames — no over-blocking', () => {
    expect(containsControlChars('cku5c2x9p0000route.pdf')).toBe(false);
    expect(containsControlChars('PAPER.PDF')).toBe(false);
    expect(containsControlChars('بحث-التخرج.pdf')).toBe(false);
    expect(containsControlChars('')).toBe(false);
  });

  it('stays orthogonal to the traversal gate (each flags its own class)', () => {
    expect(containsTraversalPatterns('\x00.pdf')).toBe(false);
    expect(containsControlChars('../secret.pdf')).toBe(false);
  });
});

describe('isSafePaperFilename (aggregate gate now includes control chars)', () => {
  it('rejects a NUL-byte .pdf that ends with the right extension', () => {
    expect(isSafePaperFilename('\x00.pdf')).toBe(false);
    expect(isSafePaperFilename('paper\x00.pdf')).toBe(false);
    expect(isSafePaperFilename('paper\n.pdf')).toBe(false);
  });

  it('still passes a plain name', () => {
    expect(isSafePaperFilename('paper-abc123.pdf')).toBe(true);
  });
});

describe('storageKeyIsValid (driver-side belt now includes control chars)', () => {
  it('rejects NUL / newline keys in both namespaces', () => {
    expect(storageKeyIsValid('papers/cku5c2x9p\x00.pdf')).toBe(false);
    expect(storageKeyIsValid('materials/cku5c2x9p\n.pdf')).toBe(false);
  });

  it('still accepts well-formed keys', () => {
    expect(storageKeyIsValid('papers/cku5c2x9p0000route.pdf')).toBe(true);
    expect(storageKeyIsValid('materials/cku5c2x9p0000route.pdf')).toBe(true);
  });
});

// ── Route level (real app, mocked prisma + driver) ───────────────────

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

const paperFindFirst = vi.mocked(prisma.researchPaper.findFirst);
const materialFindFirst = vi.mocked(prisma.material.findFirst);

const PDF_BYTES = Buffer.from('%PDF-1.7\nr170c control-char gate regression payload', 'latin1');
const GOOD_FILENAME = 'cku5c2x9p0000ctrl.pdf';

const bearer = (userId: string, role: Role) => ({
  authorization: `Bearer ${signAccessToken(userId, role)}`,
});

const getPdf = (role: Role, rawPath: string) =>
  fetch(`${baseUrl}${rawPath}`, {
    headers: bearer(role === Role.ADMIN ? 'admin-1' : 'student-1', role),
  });

beforeEach(() => {
  vi.clearAllMocks();
  storageMock.stat.mockResolvedValue({ size: PDF_BYTES.length });
  storageMock.get.mockResolvedValue(PDF_BYTES);
});

describe('GET /api/v1/files/papers/:filename — NUL-byte filename (r170c)', () => {
  it('student (DB-gate path): 400 shape refusal, never a 500 — prisma untouched', async () => {
    const res = await getPdf(Role.STUDENT, '/api/v1/files/papers/%00.pdf');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('BAD_REQUEST');
    expect(body.error.message).toBe('اسم الملف غير صالح');
    expect(paperFindFirst).not.toHaveBeenCalled();
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('oversight role (skips the DB gate): 400 shape refusal before storage — the fs ERR_INVALID_ARG_VALUE path is closed', async () => {
    const res = await getPdf(Role.ADMIN, '/api/v1/files/papers/%00.pdf');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('اسم الملف غير صالح');
    expect(paperFindFirst).not.toHaveBeenCalled();
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('a mid-name NUL byte is refused the same way (not just a leading one)', async () => {
    const res = await getPdf(Role.STUDENT, '/api/v1/files/papers/cku%00.pdf');
    expect(res.status).toBe(400);
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('newline in the filename: also a 400 shape refusal (probe verified 404-before — now uniform)', async () => {
    const res = await getPdf(Role.ADMIN, '/api/v1/files/papers/cku%0a.pdf');
    expect(res.status).toBe(400);
    expect(storageMock.stat).not.toHaveBeenCalled();
  });
});

describe('GET /api/v1/files/materials/:filename — NUL-byte filename (r170c)', () => {
  it('student: 400 shape refusal, material row lookup untouched', async () => {
    const res = await getPdf(Role.STUDENT, '/api/v1/files/materials/%00.pdf');
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toBe('اسم الملف غير صالح');
    expect(materialFindFirst).not.toHaveBeenCalled();
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('oversight role: same 400 before storage', async () => {
    const res = await getPdf(Role.ADMIN, '/api/v1/files/materials/%00.pdf');
    expect(res.status).toBe(400);
    expect(storageMock.stat).not.toHaveBeenCalled();
  });
});

describe('guard did not over-block (the happy path still serves)', () => {
  it('a normal filename still answers 200 through the full conversation', async () => {
    const res = await getPdf(Role.ADMIN, `/api/v1/files/papers/${GOOD_FILENAME}`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('application/pdf');
    expect(storageMock.stat).toHaveBeenCalledWith(`papers/${GOOD_FILENAME}`);
  });
});
