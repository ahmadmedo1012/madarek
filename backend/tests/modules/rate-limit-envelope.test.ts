/**
 * Backend unit test — r170c: 429 responses from `createRouteLimiter`
 * must ride the platform's error envelope, in Arabic.
 *
 * The live repro (throwaway backend, shared dev DB): the 11th request
 * against the /research/:id/scan limiter (the factory's 10/min shape)
 * answered 429 with the plain-text ENGLISH body
 * `Too many requests, please try again later.` — express-rate-limit's
 * own default, because the factory never set `message`. That breaks
 * two pinned contracts:
 *  - the error envelope `{ error: { code, message } }` — the FE's
 *    apiErrorCode support-code chip reads `error.code` and got nothing;
 *  - D17-3 — user-facing copy must be Arabic.
 *
 * DB-free: a bare express app + the factory. Also pins the factory's
 * per-USER keying (the reason AI-chat / upload / messages limiters
 * survive IP spoofing on any topology — token identity is in-band
 * unspoofable).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import express, { type Request, type Response, type NextFunction } from 'express';
import type { AddressInfo } from 'node:net';
import type { Role } from '@prisma/client';
import { createRouteLimiter } from '../../src/http/middleware/rateLimit.js';

/** Tiny stand-in for authMiddleware: reads the identity from a header. */
const fakeAuth = (req: Request, _res: Response, next: NextFunction) => {
  const id = req.header('x-test-user');
  if (id) req.user = { id, role: 'STUDENT' as Role };
  next();
};

let baseUrl: string;
let server: ReturnType<ReturnType<typeof express>['listen']>;

beforeAll(async () => {
  const app = express();
  app.use(express.json());
  const limiter = createRouteLimiter({ max: 2 });
  app.post('/limited', fakeAuth, limiter, (_req, res) => {
    res.status(200).json({ data: { ok: true } });
  });
  server = app.listen(0);
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

const post = (headers: Record<string, string>) =>
  fetch(`${baseUrl}/limited`, { method: 'POST', headers });

describe('createRouteLimiter 429 envelope (r170c)', () => {
  it('answers 429 with the JSON error envelope — code TOO_MANY_REQUESTS + Arabic message', async () => {
    const first = await post({ 'x-test-user': 'user-a' });
    const second = await post({ 'x-test-user': 'user-a' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);

    const third = await post({ 'x-test-user': 'user-a' });
    expect(third.status).toBe(429);
    expect(third.headers.get('content-type')).toContain('application/json');

    const body = (await third.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe('TOO_MANY_REQUESTS');
    // D17-3: the message is user-facing copy — Arabic, never English.
    expect(body.error.message).toMatch(/[\u0600-\u06FF]/);
    expect(body.error.message).toBe('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة');
    // The old bug, pinned dead: the library's own default body.
    expect(JSON.stringify(body)).not.toContain('Too many requests');
  });

  it('emits the standardized RateLimit headers (draft-7 family)', async () => {
    const res = await post({ 'x-test-user': 'user-b' });
    const rateLimitHeader = res.headers.get('ratelimit') ?? res.headers.get('x-ratelimit');
    const policyHeader = res.headers.get('ratelimit-policy');
    expect(rateLimitHeader ?? policyHeader).not.toBeNull();
  });

  it('keys per USER, not per IP: a fresh user sails past another user\u2019s exhausted bucket', async () => {
    // user-a already burned their 2-request bucket above.
    const blocked = await post({ 'x-test-user': 'user-a' });
    expect(blocked.status).toBe(429);

    const fresh = await post({ 'x-test-user': 'user-c' });
    expect(fresh.status).toBe(200);
  });
});
