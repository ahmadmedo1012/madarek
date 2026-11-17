/**
 * Backend unit test — r363 (Agent 7 backend hardening) regression belt
 * for the lecture serving + direct-upload binding fixes:
 *
 *  · B-6/D-1 — GET /files/lectures/:filename previously served video
 *    AND transcript bytes to ANY authenticated user of ANY institution.
 *    The gate now mirrors the papers/materials family: DB-verified
 *    institution context, the authorizing Lecture row resolved through
 *    BOTH URL columns (videoUrl + transcriptUrl) with the grant
 *    predicate inside the query, foreign filenames 404 with no
 *    existence oracle, and the platform OWNER keeps the row-less path.
 *  · The pre-save PREVIEW window — the uploader streams their own just-
 *    completed upload through a consumed ImportUpload ticket minted by
 *    THEM (a foreign uploader's ticket is a 404; an unconsumed one
 *    never previews).
 *  · D-12 — POST /files/uploads/complete binds the key to its
 *    presigner (a foreign teacher's leaked key is refused with the
 *    invalid-key envelope before any store IO).
 *
 * The pure predicate (accessibleLectureWhere) is pinned DB-free like
 * files-institution-gate.test.ts pins its siblings. The route
 * conversation rides the real app on an ephemeral port (the
 * files-serving.test.ts pattern): prisma mocked at db.js, the storage
 * driver mocked at the lib boundary (pure key helpers stay REAL).
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';

vi.mock('../../src/db.js', () => ({
  prisma: {
    lecture: { findFirst: vi.fn() },
    importUpload: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    membership: { findFirst: vi.fn() },
    $queryRaw: vi.fn(),
    $transaction: vi.fn(),
  },
  withRetry: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

/* The driver mock lives in a hoisted box so the module-factory hands the
 * SAME instance to every getStorage() call the routes make. */
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
import { accessibleLectureWhere } from '../../src/http/routes/files.routes.js';

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

const membershipFindFirst = vi.mocked(prisma.membership.findFirst);
const lectureFindFirst = vi.mocked(prisma.lecture.findFirst);
const ticketFindUnique = vi.mocked(prisma.importUpload.findUnique);

const authAs = (userId: string, role: Role, inst: string | null) => ({
  authorization: `Bearer ${signAccessToken(userId, role, inst)}`,
});

/** The caller holds an ACTIVE membership in inst-a (verified context). */
function verifiedInstitutionA() {
  membershipFindFirst.mockResolvedValue({ institutionId: 'inst-a' } as never);
}

const VIDEO_FILENAME = 'c0123456789abcdef0123456789abcdef.mp4';
const VIDEO_KEY = `lectures/${VIDEO_FILENAME}`;

describe('accessibleLectureWhere (the pure grant predicate)', () => {
  it('resolves the filename through BOTH URL columns (video + transcript sidecar)', () => {
    const where = accessibleLectureWhere(VIDEO_FILENAME, Role.STUDENT, 'student-1', 'inst-a');
    expect(where.OR).toEqual([
      { videoUrl: { endsWith: `/${VIDEO_FILENAME}` } },
      { transcriptUrl: { endsWith: `/${VIDEO_FILENAME}` } },
    ]);
  });

  it('STUDENT grants ride the offering chain: teacher OR active enrollment', () => {
    const where = accessibleLectureWhere(VIDEO_FILENAME, Role.STUDENT, 'student-1', 'inst-a');
    expect(where.offering).toMatchObject({
      course: { department: { faculty: { institutionId: 'inst-a' } } },
      OR: [
        { teacherId: 'student-1' },
        { enrollments: { some: { studentId: 'student-1', status: 'active' } } },
      ],
    });
  });

  it('TEACHER gets the per-row grant branch (their own offering)', () => {
    const where = accessibleLectureWhere('lec-1.vtt', Role.TEACHER, 'teacher-1', 'inst-a');
    expect(where.offering).toHaveProperty('OR');
  });

  it('ADMIN/QUALITY oversight carries NO per-row grant — the institution binds', () => {
    for (const role of [Role.ADMIN, Role.QUALITY]) {
      const where = accessibleLectureWhere(VIDEO_FILENAME, role, 'admin-1', 'inst-a');
      expect(where.offering).not.toHaveProperty('OR');
      expect(where.offering).toMatchObject({
        course: { department: { faculty: { institutionId: 'inst-a' } } },
      });
    }
  });
});

describe('r363 — B-6/D-1: GET /files/lectures/:filename access gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifiedInstitutionA();
  });

  it('404s a foreign-institution filename BEFORE any storage IO (no existence oracle)', async () => {
    lectureFindFirst.mockResolvedValue(null as never); // no authorizing row in inst-a
    ticketFindUnique.mockResolvedValue(null as never); // no upload ticket either
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('student-b', Role.STUDENT, 'inst-a'),
    });
    expect(res.status).toBe(404);
    expect(storageMock.stat).not.toHaveBeenCalled();
    expect(storageMock.get).not.toHaveBeenCalled();
    // The gate consulted BOTH fallbacks before refusing — a student has
    // no ticket, so the answer is the same plain 404.
    expect(lectureFindFirst).toHaveBeenCalledTimes(1);
    expect(ticketFindUnique).toHaveBeenCalledWith({ where: { key: VIDEO_KEY } });
  });

  it('serves an enrolled same-institution student (the authorizing Lecture row resolves)', async () => {
    lectureFindFirst.mockResolvedValue({ id: 'lec-1' } as never);
    storageMock.stat.mockResolvedValue({ size: 1024 } as never);
    storageMock.get.mockResolvedValue(Buffer.from('fake-video-bytes') as never);
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('student-a', Role.STUDENT, 'inst-a'),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('video/mp4');
    expect(res.headers.get('accept-ranges')).toBe('bytes');
    expect(lectureFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: accessibleLectureWhere(VIDEO_FILENAME, Role.STUDENT, 'student-a', 'inst-a'),
      }),
    );
  });

  it('serves the .vtt transcript sidecar through the same gate', async () => {
    lectureFindFirst.mockResolvedValue({ id: 'lec-1' } as never);
    storageMock.stat.mockResolvedValue({ size: 44 } as never);
    storageMock.get.mockResolvedValue(Buffer.from('WEBVTT\n\n') as never);
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/lec-1.vtt`, {
      headers: authAs('student-a', Role.STUDENT, 'inst-a'),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toBe('text/vtt; charset=utf-8');
  });

  it('serves the uploader their OWN completed upload (the pre-save preview window)', async () => {
    lectureFindFirst.mockResolvedValue(null as never); // no Lecture row yet
    ticketFindUnique.mockResolvedValue({
      key: VIDEO_KEY,
      consumedAt: new Date(),
      mintedBy: 'teacher-1',
    } as never);
    storageMock.stat.mockResolvedValue({ size: 2048 } as never);
    storageMock.get.mockResolvedValue(Buffer.from('preview-bytes') as never);
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('teacher-1', Role.TEACHER, 'inst-a'),
    });
    expect(res.status).toBe(200);
  });

  it('refuses ANOTHER uploader\u2019s ticket (404, no preview for foreign keys)', async () => {
    lectureFindFirst.mockResolvedValue(null as never);
    ticketFindUnique.mockResolvedValue({
      key: VIDEO_KEY,
      consumedAt: new Date(),
      mintedBy: 'teacher-2', // minted by someone else
    } as never);
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('teacher-1', Role.TEACHER, 'inst-a'),
    });
    expect(res.status).toBe(404);
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('refuses an UNCONSUMED ticket (the upload never completed — no bytes promised)', async () => {
    lectureFindFirst.mockResolvedValue(null as never);
    ticketFindUnique.mockResolvedValue({
      key: VIDEO_KEY,
      consumedAt: null,
      mintedBy: 'teacher-1',
    } as never);
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('teacher-1', Role.TEACHER, 'inst-a'),
    });
    expect(res.status).toBe(404);
  });

  it('OWNER keeps the row-less platform-wide fast path (no gate reads)', async () => {
    storageMock.stat.mockResolvedValue({ size: 1024 } as never);
    storageMock.get.mockResolvedValue(Buffer.from('owner-bytes') as never);
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('owner-1', Role.OWNER, null),
    });
    expect(res.status).toBe(200);
    expect(lectureFindFirst).not.toHaveBeenCalled();
    expect(ticketFindUnique).not.toHaveBeenCalled();
  });

  it('a contextless institutional caller is refused fail-closed (403)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/files/lectures/${VIDEO_FILENAME}`, {
      headers: authAs('admin-1', Role.ADMIN, null),
    });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INSTITUTION_CONTEXT_REQUIRED');
    expect(storageMock.stat).not.toHaveBeenCalled();
  });
});

describe('r363 — D-12: POST /files/uploads/complete presigner binding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    verifiedInstitutionA();
  });

  it("refuses a key minted for ANOTHER user with the invalid-key envelope (before store IO)", async () => {
    ticketFindUnique.mockResolvedValue({
      key: VIDEO_KEY,
      consumedAt: null,
      mintedBy: 'teacher-2',
    } as never);
    const res = await fetch(`${baseUrl}/api/v1/files/uploads/complete`, {
      method: 'POST',
      headers: { ...authAs('teacher-1', Role.TEACHER, 'inst-a'), 'content-type': 'application/json' },
      body: JSON.stringify({ key: VIDEO_KEY }),
    });
    expect(res.status).toBe(400);
    expect(storageMock.stat).not.toHaveBeenCalled();
  });

  it('refuses a key with NO ticket at all (never presigned through this server)', async () => {
    ticketFindUnique.mockResolvedValue(null as never);
    const res = await fetch(`${baseUrl}/api/v1/files/uploads/complete`, {
      method: 'POST',
      headers: { ...authAs('teacher-1', Role.TEACHER, 'inst-a'), 'content-type': 'application/json' },
      body: JSON.stringify({ key: VIDEO_KEY }),
    });
    expect(res.status).toBe(400);
  });

  it("passes the presigner binding for the minter's OWN key (fails LATER at the driver gate, not the binding)", async () => {
    // The mocked driver is not an S3Driver instance → the honest 503
    // proves the ticket binding let the caller through.
    ticketFindUnique.mockResolvedValue({
      key: VIDEO_KEY,
      consumedAt: null,
      mintedBy: 'teacher-1',
    } as never);
    const res = await fetch(`${baseUrl}/api/v1/files/uploads/complete`, {
      method: 'POST',
      headers: { ...authAs('teacher-1', Role.TEACHER, 'inst-a'), 'content-type': 'application/json' },
      body: JSON.stringify({ key: VIDEO_KEY }),
    });
    expect(res.status).toBe(503);
  });
});
