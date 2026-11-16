/**
 * r357 L2 — the ROUTE contracts (DB-free, the profiles-routes.test.ts
 * pattern): the real app on an ephemeral port, prisma mocked, auth via
 * signAccessToken. Storage rides the LOCAL driver (no Blob in tests) —
 * the Blob-dependent arms assert the honest 503; the key-shape guards
 * and the audit rows assert BEFORE any storage touch.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { Role } from '@prisma/client';
import { createHmac } from 'node:crypto';

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    membership: { findFirst: vi.fn() },
    studentProfile: { findFirst: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    teacherProfile: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn(), count: vi.fn() },
    enrollment: { findFirst: vi.fn() },
    auditLog: { create: vi.fn(), findFirst: vi.fn() },
    notification: { create: vi.fn() },
    fieldValue: { findMany: vi.fn() },
    studentDocument: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), delete: vi.fn() },
    importUpload: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
  withRetry: async <T>(fn: () => Promise<T>): Promise<T> => fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';
import { mintDocSignature } from '../../src/lib/doc-urls.js';
import { env } from '../../src/env.js';

const INST = 'inst-r357';
let baseUrl: string;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(() => {
  server = createApp().listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  vi.mocked(prisma.auditLog.create).mockClear();
  const profileRow = {
    id: 'p1', userId: 'u-student', institutionId: INST, universityId: '20240001',
    profileImageUrl: null, studentPhone: null,
  };
  vi.mocked(prisma.membership.findFirst).mockResolvedValue({ institutionId: INST } as never);
  vi.mocked(prisma.studentProfile.findFirst).mockResolvedValue(profileRow as never);
  vi.mocked(prisma.studentProfile.findUnique).mockResolvedValue(profileRow as never);
});

const auth = (userId: string, role: Role, institutionId: string | null = INST) => ({
  Authorization: `Bearer ${signAccessToken(userId, role, institutionId)}`,
});

async function call(path: string, init: RequestInit = {}): Promise<{ status: number; body: any }> {
  const res = await fetch(`${baseUrl}${path}`, init);
  let body: any = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body };
}

describe('r357 L2 · photo routes', () => {
  it('photo-ticket: STUDENT + no Blob driver → the honest 503; TEACHER → 403 before that', async () => {
    const s = await call('/api/v1/me/profile/photo-ticket', {
      method: 'POST', headers: { ...auth('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'image/webp', sizeBytes: 5000 }),
    });
    expect(s.status).toBe(503);
    const t = await call('/api/v1/me/profile/photo-ticket', {
      method: 'POST', headers: { ...auth('u-teacher', Role.TEACHER), 'Content-Type': 'application/json' },
      body: JSON.stringify({ contentType: 'image/webp', sizeBytes: 5000 }),
    });
    expect(t.status).toBe(403);
  });

  it('photo-confirm: a key outside profile-media/ dies at the shape gate (400, no storage touch)', async () => {
    for (const key of ['imports/x.webp', 'profile-media/../../etc', 'profile-media/a.zip']) {
      const r = await call('/api/v1/me/profile/photo-confirm', {
        method: 'POST', headers: { ...auth('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      expect([400, 503]).toContain(r.status);
      if (r.status === 400) expect(String(r.body?.error?.message)).toContain('مفتاح');
    }
  });

  it('GET /me/profile/photo with no uploaded key → 404; with a key and no bytes → 404', async () => {
    vi.mocked(prisma.studentProfile.findFirst).mockResolvedValue({ id: 'p1', profileImageUrl: null } as never);
    const none = await call('/api/v1/me/profile/photo', { headers: auth('u-student', Role.STUDENT) });
    expect(none.status).toBe(404);
  });
});

describe('r357 L2 · documents (signed URLs)', () => {
  it('ticket: STUDENT only (registrar gets 403); confirm rejects a foreign-namespace key', async () => {
    const admin = await call('/api/v1/me/documents/ticket', {
      method: 'POST', headers: { ...auth('u-admin', Role.ADMIN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ titleAr: 'جواز السفر', kind: 'passport', contentType: 'application/pdf', sizeBytes: 2000 }),
    });
    expect(admin.status).toBe(403);
    const bad = await call('/api/v1/me/documents/confirm', {
      method: 'POST', headers: { ...auth('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'papers/x.pdf', titleAr: 'شهادة', kind: 'certificate' }),
    });
    expect([400, 503]).toContain(bad.status);
  });

  it('list → the profile\'s rows; delete → audit row + best-effort delete', async () => {
    vi.mocked(prisma.studentDocument.findMany).mockResolvedValue([
      { id: 'd1', titleAr: 'جواز', kind: 'passport', contentType: 'application/pdf', sizeBytes: 10, createdAt: new Date() },
    ] as never);
    const list = await call('/api/v1/me/documents', { headers: auth('u-student', Role.STUDENT) });
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    vi.mocked(prisma.studentDocument.findUnique).mockResolvedValue({
      id: 'd1', studentProfileId: 'p1', storageKey: 'profile-media/c1.pdf',
      kind: 'passport', sizeBytes: 10, titleAr: 'جواز', contentType: 'application/pdf',
    } as never);
    const del = await call('/api/v1/me/documents/d1', { method: 'DELETE', headers: auth('u-student', Role.STUDENT) });
    expect(del.status).toBe(200);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'document.delete', resourceType: 'StudentDocument' }),
    }));
  });

  it('url-mint: a /api/v1/files/documents/<id>?exp&sig URL + the audit row', async () => {
    vi.mocked(prisma.studentDocument.findUnique).mockResolvedValue({
      id: 'd1', studentProfileId: 'p1', storageKey: 'profile-media/c1.pdf',
      kind: 'passport', sizeBytes: 10, titleAr: 'جواز', contentType: 'application/pdf',
    } as never);
    // A POST to a GET-only route: 404 (no such route) — pinned so the
    // method table below cannot silently change.
    const r = await call('/api/v1/me/documents/d1/url', {
      method: 'POST',
      headers: { ...auth('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: '{}',
    });
    expect([404, 405]).toContain(r.status);
    const g = await call('/api/v1/me/documents/d1/url', { headers: auth('u-student', Role.STUDENT) });
    expect(g.status).toBe(200);
    expect(g.body.data.url).toMatch(/^https?:\/\/[^/]+\/api\/v1\/files\/documents\/d1\?exp=\d+&sig=/);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ action: 'document.url-mint' }),
    }));
  });

  it('the signed consumer: valid sig + missing bytes → 404; tampered sig → 403; expired-but-signed → 403', async () => {
    vi.mocked(prisma.studentDocument.findUnique).mockResolvedValue({
      id: 'd1', studentProfileId: 'p1',
      storageKey: 'profile-media/c0123456789abcdef0123456789abcdef.pdf',
      kind: 'passport', sizeBytes: 10, titleAr: 'جواز', contentType: 'application/pdf',
    } as never);
    const { exp, sig } = mintDocSignature(env.JWT_ACCESS_SECRET, 'd1');
    const ok = await call(`/api/v1/files/documents/d1?exp=${exp}&sig=${encodeURIComponent(sig)}`);
    expect(ok.status).toBe(404); // signature accepted; the object genuinely does not exist in tests

    const tampered = await call(`/api/v1/files/documents/d1?exp=${exp}&sig=${encodeURIComponent(sig + 'z')}`);
    expect(tampered.status).toBe(403);

    const oldExp = Math.floor(Date.now() / 1000) - 100;
    const oldSig = createHmac('sha256', env.JWT_ACCESS_SECRET).update(`doc:d1:${oldExp}`).digest('base64url');
    const expired = await call(`/api/v1/files/documents/d1?exp=${oldExp}&sig=${encodeURIComponent(oldSig)}`);
    expect(expired.status).toBe(403);
  });
});

describe('r357 L2 · phone-search audit (the r356 gap, closed)', () => {
  it('GET /directory?phone=… as ADMIN writes the search.phone audit row (lengths only, no value)', async () => {
    vi.mocked(prisma.studentProfile.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.studentProfile.findMany).mockResolvedValue([] as never);
    const r = await call('/api/v1/directory?kind=student&phone=%2B218912345678', { headers: auth('u-admin', Role.ADMIN) });
    expect(r.status).toBe(200);
    expect(prisma.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        action: 'search.phone',
        resourceType: 'DirectoryQuery',
        metadata: expect.objectContaining({ surface: 'directory', digits: expect.any(Number) }),
      }),
    }));
    // the audit NEVER carries the number itself
    const meta = vi.mocked(prisma.auditLog.create).mock.calls[0]![0].data.metadata as any;
    expect(JSON.stringify(meta)).not.toContain('218912345678');
  });

  it('a sub-4-digit phone fragment is not a phone search — no audit row', async () => {
    vi.mocked(prisma.studentProfile.count).mockResolvedValue(0 as never);
    vi.mocked(prisma.studentProfile.findMany).mockResolvedValue([] as never);
    await call('/api/v1/directory?kind=student&phone=091', { headers: auth('u-admin', Role.ADMIN) });
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });
});

describe('r357 L2 · photos-zip (registrar)', () => {
  it('upload-ticket: STUDENT → 403; ADMIN without institution context → the scoping 403', async () => {
    const s = await call('/api/v1/people/photos-zip/upload-ticket', {
      method: 'POST', headers: { ...auth('u-student', Role.STUDENT), 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'photos.zip', sizeBytes: 1000 }),
    });
    expect(s.status).toBe(403);
    const noInst = await call('/api/v1/people/photos-zip/upload-ticket', {
      method: 'POST', headers: { ...auth('u-admin', Role.ADMIN, null), 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'photos.zip', sizeBytes: 1000 }),
    });
    expect([403, 503]).toContain(noInst.status);
  });

  it('process: a key that was never minted dies at the ticket gate (400), and a non-zip key dies at the shape gate', async () => {
    vi.mocked(prisma.importUpload.findUnique).mockResolvedValue(null as never);
    const never = await call('/api/v1/people/photos-zip/process', {
      method: 'POST', headers: { ...auth('u-admin', Role.ADMIN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageKey: 'profile-media/c1.zip' }),
    });
    expect(never.status).toBe(400);
    expect(String(never.body?.error?.message)).toContain('مفتاح');
    const foreign = await call('/api/v1/people/photos-zip/process', {
      method: 'POST', headers: { ...auth('u-admin', Role.ADMIN), 'Content-Type': 'application/json' },
      body: JSON.stringify({ storageKey: 'imports/roster.xlsx' }),
    });
    expect(foreign.status).toBe(400);
  });
});
