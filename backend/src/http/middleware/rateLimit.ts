import rateLimit, { type Options, type RateLimitRequestHandler } from 'express-rate-limit';

const FIFTEEN_MIN = 15 * 60 * 1000;

/**
 * 1000 req / 15 min / IP — global API limit.
 *
 * Was 300, which campus users behind shared NAT (one egress IP for a
 * whole lab / dorm network) exhaust within a few dashboard loads: a
 * single dashboard page fires 5-8 parallel queries, so ~35 page loads
 * per 15 min across all NAT'd students tripped 429s. 1000 keeps
 * brute-force economics bad (with the strict auth limiter still in
 * front of credential endpoints) while letting shared-IP cohorts work.
 */
export const globalRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 1000,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

/**
 * 10 req / 15 min / IP — protects /auth/login + /auth/register from
 * brute force. Only FAILED attempts count (`skipSuccessfulRequests`),
 * so honest users never edge toward the limit.
 */
export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts' } },
});

/**
 * Factory for stricter per-route limiters (expensive / abuse-prone
 * endpoints like AI chat, file upload, bulk exports). Defaults: 20 req /
 * 60 s, keyed per-user when authenticated, per-IP otherwise (mirroring
 * the AI endpoint pattern).
 *
 * Usage: `router.post('/heavy', createRouteLimiter({ max: 5 }), handler)`
 */
export const createRouteLimiter = (overrides: Partial<Options> = {}): RateLimitRequestHandler =>
  rateLimit({
    windowMs: 60_000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
    ...overrides,
  });
