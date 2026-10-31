/**
 * Backend unit test — r326 additive surfaces through the REAL app
 * (createApp, ephemeral port, prisma mocked — the sync-routes-scope
 * pattern):
 *
 *   POST /client-errors      — anonymous 201 (pre-login crashes land),
 *                              authed 201 attributes the user, bad kind 422
 *   GET  /client-errors      — OWNER inbox only (STUDENT 403), meta.unreviewed
 *   PATCH /client-errors/:id/reviewed — OWNER toggles; unknown 404
 *   POST /me/push-devices    — upserts by token (re-register rebinds the
 *                              latest user); anonymous 401; strict body 422
 *   GET  /me/push-devices    — caller-scoped rows only
 *   DELETE /me/push-devices/:id — own row deleted; another user's row 404
 *   GET  /status             — minAppVersion + updateUrl present (the
 *                              mobile gate reads them)
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

vi.mock('../../src/db.js', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    clientError: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pushDevice: {
      upsert: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
  withRetry: vi.fn(),
}));

import { createApp } from '../../src/app.js';
import { prisma } from '../../src/db.js';
import { signAccessToken } from '../../src/lib/jwt.js';

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

const OWNER_TOKEN = signAccessToken('owner-1', 'OWNER', null);
const STUDENT_TOKEN = signAccessToken('student-1', 'STUDENT', 'inst-1');

const REPORT = {
  kind: 'render',
  message: 'Cannot read property map of undefined',
  stack: 'at StudentDashboard (app/student/dashboard.tsx:44:5)',
  route: '/student/dashboard',
  role: 'STUDENT',
  breadcrumbs: ['23:38:01 nav /student/dashboard', '23:38:02 api /student/dashboard FAIL'],
  appVersion: '1.0.0',
  updateId: 'f1c2d3e4-0000-0000-0000-000000000000',
  runtimeVersion: 'fp-abc123',
  deviceModel: 'Pixel 7',
  osName: 'android',
  osVersion: '35',
};

describe('POST /api/v1/client-errors', () => {
  it('lands an ANONYMOUS report (pre-login crash) with 201', async () => {
    const created = vi.mocked(prisma.clientError.create).mockResolvedValue({ id: 'ce-1' } as never);
    const res = await fetch(`${baseUrl}/api/v1/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(REPORT),
    });
    expect(res.status).toBe(201);
    expect(created.mock.calls[0]![0].data.userId).toBeNull();
    expect(created.mock.calls[0]![0].data.kind).toBe('render');
    expect(created.mock.calls[0]![0].data.breadcrumbs).toEqual({ rows: REPORT.breadcrumbs });
  });

  it('attributes the report when a valid token rides along', async () => {
    const created = vi.mocked(prisma.clientError.create);
    created.mockReset().mockResolvedValue({ id: 'ce-2' } as never);
    const res = await fetch(`${baseUrl}/api/v1/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STUDENT_TOKEN}` },
      body: JSON.stringify({ ...REPORT, kind: 'crash' }),
    });
    expect(res.status).toBe(201);
    expect(created.mock.calls.at(-1)![0].data.userId).toBe('student-1');
  });

  it('refuses an unknown kind with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${baseUrl}/api/v1/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...REPORT, kind: 'nonsense' }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('refuses extra fields (strict) with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/client-errors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...REPORT, evil: true }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/client-errors (the OWNER inbox)', () => {
  it('is OWNER-only — a student gets 403', async () => {
    const res = await fetch(`${baseUrl}/api/v1/client-errors`, {
      headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
    });
    expect(res.status).toBe(403);
  });

  it('returns rows + unreviewed meta to the OWNER', async () => {
    vi.mocked(prisma.clientError.findMany).mockReset().mockResolvedValue([
      { id: 'ce-1', kind: 'crash', message: 'x', reviewedAt: null },
    ] as never);
    const findMany = vi.mocked(prisma.clientError.findMany);
    vi.mocked(prisma.clientError.count)
      .mockReset()
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(4);
    const res = await fetch(`${baseUrl}/api/v1/client-errors`, {
      headers: { Authorization: `Bearer ${OWNER_TOKEN}` },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: unknown[]; meta: { unreviewed: number } };
    expect(body.data).toHaveLength(1);
    expect(body.meta.unreviewed).toBe(4);
    // default filter = unreviewed only
    expect(findMany.mock.calls.at(-1)![0]!.where).toEqual({ reviewedAt: null });
  });
});

describe('PATCH /api/v1/client-errors/:id/reviewed', () => {
  it('toggles reviewedAt for the OWNER', async () => {
    vi.mocked(prisma.clientError.findUnique).mockResolvedValue({ id: 'ce-1', reviewedAt: null } as never);
    vi.mocked(prisma.clientError.update).mockResolvedValue({ id: 'ce-1', reviewedAt: new Date() } as never);
    const res = await fetch(`${baseUrl}/api/v1/client-errors/ce-1/reviewed`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${OWNER_TOKEN}` },
    });
    expect(res.status).toBe(200);
  });

  it('404s an unknown id', async () => {
    vi.mocked(prisma.clientError.findUnique).mockResolvedValue(null as never);
    const res = await fetch(`${baseUrl}/api/v1/client-errors/nope/reviewed`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${OWNER_TOKEN}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/me/push-devices', () => {
  it('401s anonymous registration', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/push-devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expoToken: 'ExponentPushToken[a-long-token-xxxxxxxxxxxx]', platform: 'ANDROID' }),
    });
    expect(res.status).toBe(401);
  });

  it('upserts by token — a reinstall rebinds the LATEST user', async () => {
    const upsert = vi.mocked(prisma.pushDevice.upsert);
    upsert.mockReset().mockResolvedValue({
      id: 'pd-1', platform: 'ANDROID',
    } as never);
    const token = 'ExponentPushToken[reinstall-token-abc123]';
    const first = await fetch(`${baseUrl}/api/v1/me/push-devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STUDENT_TOKEN}` },
      body: JSON.stringify({ expoToken: token, platform: 'ANDROID', appVersion: '1.0.0' }),
    });
    expect(first.status).toBe(201);
    expect(upsert.mock.calls.at(-1)![0].where).toEqual({ expoToken: token });
    expect(upsert.mock.calls.at(-1)![0].update.userId).toBe('student-1');
  });

  it('refuses a junk platform with 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/me/push-devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${STUDENT_TOKEN}` },
      body: JSON.stringify({ expoToken: 'ExponentPushToken[junk-platform-token]', platform: 'SYMBIAN' }),
    });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/me/push-devices', () => {
  it('returns only the caller’s devices, newest first', async () => {
    const findMany = vi.mocked(prisma.pushDevice.findMany);
    findMany.mockReset().mockResolvedValue([
      { id: 'pd-1', platform: 'IOS' },
    ] as never);
    const res = await fetch(`${baseUrl}/api/v1/me/push-devices`, {
      headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(findMany.mock.calls.at(-1)![0]!.where).toEqual({ userId: 'student-1' });
    const body = (await res.json()) as { data: unknown[] };
    expect(body.data).toHaveLength(1);
  });
});

describe('DELETE /api/v1/me/push-devices/:id', () => {
  it('deletes the caller’s own device', async () => {
    vi.mocked(prisma.pushDevice.findUnique).mockResolvedValue({ id: 'pd-1', userId: 'student-1' } as never);
    const del = vi.mocked(prisma.pushDevice.delete).mockResolvedValue({ id: 'pd-1' } as never);
    const res = await fetch(`${baseUrl}/api/v1/me/push-devices/pd-1`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
    });
    expect(res.status).toBe(200);
    expect(del).toHaveBeenCalledWith({ where: { id: 'pd-1' } });
  });

  it('404s another user’s device (no cross-user deletes)', async () => {
    vi.mocked(prisma.pushDevice.findUnique).mockResolvedValue({ id: 'pd-2', userId: 'someone-else' } as never);
    const res = await fetch(`${baseUrl}/api/v1/me/push-devices/pd-2`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${STUDENT_TOKEN}` },
    });
    expect(res.status).toBe(404);
  });
});

describe('GET /api/v1/status — the mobile gate fields', () => {
  it('carries minAppVersion (null when unset) + updateUrl', async () => {
    const res = await fetch(`${baseUrl}/api/v1/status`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { minAppVersion: string | null; updateUrl: string } };
    expect(body.data).toHaveProperty('minAppVersion');
    expect(body.data.updateUrl).toMatch(/^https:\/\//);
  });
});
