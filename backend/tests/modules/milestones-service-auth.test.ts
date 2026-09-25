/**
 * Backend unit test — `serviceAuthMiddleware` from
 * `backend/src/modules/milestones/router.ts` (11-a Batch E test
 * backfill: the service-token gate of POST /me/milestones/:id/fire
 * had zero coverage).
 *
 * DB-free: the middleware is driven directly with fake req/next —
 * no server boot. Pins the fail-closed contract:
 *   - INTERNAL_SERVICE_TOKEN unset → EVERY request is rejected, even
 *     one carrying the would-be-correct token
 *   - missing / wrong / different-length tokens → 403, with a uniform
 *     message (no oracle for which check failed)
 *   - the correct token passes
 *   - comparisons are length-independent (SHA-256 digests — an
 *     attacker-controlled header length can never crash or short-circuit)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// env is module-evaluated once; the factory gives the test a mutable
// object so each case controls INTERNAL_SERVICE_TOKEN without touching
// process.env.
vi.mock('../../src/env.js', () => ({
  env: { INTERNAL_SERVICE_TOKEN: undefined as string | undefined },
}));

// service.ts pulls the prisma client at import time; the middleware
// path never touches it — an empty mock keeps the graph hermetic.
vi.mock('../../src/db.js', () => ({
  prisma: {},
}));

import { env } from '../../src/env.js';
import { serviceAuthMiddleware } from '../../src/modules/milestones/router';
import { AppError } from '../../src/lib/errors';

const SERVICE_TOKEN = 'internal-service-token-32-chars-min';

const makeReq = (token?: string) => ({
  header: (name: string) => (name === 'x-internal-service-token' ? token : undefined),
});

const next = vi.fn();

const expectForbidden = () => {
  expect(next).toHaveBeenCalledTimes(1);
  const err = next.mock.calls[0]![0];
  expect(err).toBeInstanceOf(AppError);
  expect((err as AppError).status).toBe(403);
  expect((err as AppError).code).toBe('FORBIDDEN');
};

const expectPassed = () => {
  expect(next).toHaveBeenCalledTimes(1);
  expect(next.mock.calls[0]![0]).toBeUndefined();
};

beforeEach(() => {
  next.mockReset();
});

afterEach(() => {
  env.INTERNAL_SERVICE_TOKEN = undefined;
});

describe('serviceAuthMiddleware — fail-closed', () => {
  it('rejects every request when INTERNAL_SERVICE_TOKEN is unset', () => {
    env.INTERNAL_SERVICE_TOKEN = undefined;

    serviceAuthMiddleware(makeReq(SERVICE_TOKEN), undefined, next);
    expectForbidden();

    next.mockReset();
    serviceAuthMiddleware(makeReq(), undefined, next);
    expectForbidden();
  });
});

describe('serviceAuthMiddleware — token checks', () => {
  beforeEach(() => {
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
  });

  it('passes the correct token through with no error', () => {
    serviceAuthMiddleware(makeReq(SERVICE_TOKEN), undefined, next);
    expectPassed();
  });

  it('rejects a missing header', () => {
    serviceAuthMiddleware(makeReq(), undefined, next);
    expectForbidden();
  });

  it('rejects a wrong token of the same length (one char differs)', () => {
    const wrong = `${SERVICE_TOKEN.slice(0, -1)}X`;
    expect(wrong).toHaveLength(SERVICE_TOKEN.length);

    serviceAuthMiddleware(makeReq(wrong), undefined, next);
    expectForbidden();
  });

  it('rejects shorter and longer tokens without throwing', () => {
    // Length independence: digests are fixed-size, so neither a
    // 1-char nor a 10k-char header can crash timingSafeEqual.
    serviceAuthMiddleware(makeReq('x'), undefined, next);
    expectForbidden();

    next.mockReset();
    serviceAuthMiddleware(makeReq('x'.repeat(10_000)), undefined, next);
    expectForbidden();
  });

  it('uses a uniform rejection message (no oracle for which check failed)', () => {
    env.INTERNAL_SERVICE_TOKEN = undefined;
    serviceAuthMiddleware(makeReq(SERVICE_TOKEN), undefined, next);
    const unsetMsg = (next.mock.calls[0]![0] as AppError).message;

    next.mockReset();
    env.INTERNAL_SERVICE_TOKEN = SERVICE_TOKEN;
    serviceAuthMiddleware(makeReq('wrong-token'), undefined, next);
    const wrongMsg = (next.mock.calls[0]![0] as AppError).message;

    expect(wrongMsg).toBe(unsetMsg);
    expect(wrongMsg).toBe('Service token required');
  });

  it('ignores other headers — only x-internal-service-token is read', () => {
    const req = {
      header: (name: string) =>
        name === 'authorization' ? 'Bearer admin-jwt' : undefined,
    };
    serviceAuthMiddleware(req, undefined, next);
    expectForbidden();
  });
});
