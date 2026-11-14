/**
 * R351 X2c — the app-level proof that the limiters 429 through the
 * Postgres store: the change-password brute-force belt re-run with
 * MADAREK_TEST_DB_RATE_LIMIT_STORE=1 (the only switch that arms the DB
 * store under NODE_ENV=test), db's $queryRaw scripted to count the
 * change-password rows per user while keeping the global bucket tiny.
 *
 * Mirrors auth-change-password-limiter.test.ts (the memory-store pin)
 * so the two files together pin BOTH stores behind the same route.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AddressInfo } from 'node:net';

// Arm the DB store BEFORE the app graph imports (env.ts + rateLimit.ts
// read process.env at module load).
process.env.MADAREK_TEST_DB_RATE_LIMIT_STORE = '1';

vi.mock('../../src/lib/password.js', () => ({
  hashPassword: vi.fn(async () => 'hashed'),
  verifyPassword: vi.fn(async () => false),
}));

const rowCounts = new Map<string, number>();

vi.mock('../../src/db.js', () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    studentProfile: { findUnique: vi.fn() },
    membership: { findMany: vi.fn(async () => []) },
    loginEvent: { create: vi.fn(async () => ({})) },
    researchPaper: { findFirst: vi.fn() },
    material: { findFirst: vi.fn() },
    // The DB rate-limit store's single round trip: count rows per key,
    // keep the global bucket always-small so only the change-password
    // bucket can trip.
    $queryRaw: vi.fn(async (_tpl: TemplateStringsArray, ...values: unknown[]) => {
      const rowKey = String(values[0] ?? '');
      if (rowKey.startsWith('global:')) return [{ count: 1 }];
      const next = (rowCounts.get(rowKey) ?? 0) + 1;
      rowCounts.set(rowKey, next);
      return [{ count: next }];
    }),
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(),
  },
  withRetry: vi.fn(),
}));

const { createApp } = await import('../../src/app.js');
const { prisma } = await import('../../src/db.js');
const { verifyPassword } = await import('../../src/lib/password.js');
const verifyPasswordMock = vi.mocked(verifyPassword);
const { signAccessToken } = await import('../../src/lib/jwt.js');
const { AUTH_RATE } = await import('../../src/http/middleware/rateLimit.js');

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

const changePassword = (userId: string, extraHeaders: Record<string, string> = {}) =>
  fetch(`${baseUrl}/api/v1/auth/change-password`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${signAccessToken(userId, 'STUDENT', null)}`,
      ...extraHeaders,
    },
    body: JSON.stringify({ currentPassword: 'wrong-current-password', newPassword: 'CorrectHorse-2026!' }),
  });

describe('change-password brute force THROUGH THE POSTGRES STORE', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rowCounts.clear();
    verifyPasswordMock.mockResolvedValue(false);
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: 'user-1',
      passwordHash: 'stored-hash',
      failedLoginCount: 0,
      lockedUntil: null,
      tokenVersion: 0,
      isActive: true,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);
    vi.mocked(prisma.user.updateMany).mockResolvedValue({ count: 1 } as never);
  });

  it(`the first ${AUTH_RATE.max} wrong attempts 401, the next is a 429 counted by the DB rows`, async () => {
    for (let i = 0; i < AUTH_RATE.max; i += 1) {
      const res = await changePassword('user-1');
      expect(res.status).toBe(401);
    }
    const res = await changePassword('user-1');
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    // The counting happened in the scripted DB rows (user-keyed).
    expect(rowCounts.get(`change-password:user-1:${Math.floor(Date.now() / (15 * 60_000))}`)).toBe(AUTH_RATE.max + 1);
  });

  it('the bucket is user-keyed through the DB store too — a spoofed IP rotation does not reset it', async () => {
    for (let i = 0; i < AUTH_RATE.max; i += 1) {
      const res = await changePassword('user-2', { 'x-forwarded-for': `10.0.0.${i}` });
      expect(res.status).toBe(401);
    }
    const res = await changePassword('user-2', { 'x-forwarded-for': '10.9.9.9' });
    expect(res.status).toBe(429);
  });
});
