import rateLimit, { type Options, type RateLimitRequestHandler } from 'express-rate-limit';

/*
 * Trust-topology note (r170c, probe-verified — the setting itself lives
 * in app.ts): with `trust proxy = 1`, express resolves req.ip to the
 * RIGHTMOST X-Forwarded-For entry. Direct exposure (dev / a deploy
 * without exactly-one appending proxy): that entry is fully
 * client-controlled, so every IP-keyed limiter here is bypassable by
 * varying the header (verified: 12/12 spoofed-XFF login attempts, zero
 * 429s). Render production: client-supplied XFF does NOT key the
 * limiter (verified: 12× fixed spoof → no 429; 12× headerless → 429s
 * with a shared-bucket signature) — the best-fit model is req.ip = a
 * Render edge address, honestly labeled unverified-from-sandbox. The
 * per-USER limiters (changePasswordRateLimiter, createRouteLimiter
 * behind authMiddleware) are immune to both shapes: token identity
 * cannot be spoofed in-band.
 */

/* r153l: these constants ARE the limiters' source (they were drifted
 * documentation — exported, unconsumed, while the limiters repeated the
 * literals below). The admin settings display (AdminExtraPages) and
 * any future docs quote THEM, not retyped digits. */
export const GLOBAL_RATE = { max: 1000, windowMinutes: 15 };
export const AUTH_RATE = { max: 10, windowMinutes: 15 };
const FIFTEEN_MIN = GLOBAL_RATE.windowMinutes * 60 * 1000;

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
  max: GLOBAL_RATE.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة' } },
});

/**
 * 10 req / 15 min / IP — protects /auth/login + /auth/register from
 * brute force. Only FAILED attempts count (`skipSuccessfulRequests`),
 * so honest users never edge toward the limit.
 */
export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: AUTH_RATE.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة' } },
});

/**
 * 10 FAILED attempts / 15 min / USER — the current-password brute-force
 * guard for POST /auth/change-password (r170c).
 *
 * Keyed per USER, not per IP. The route sits behind authMiddleware, so
 * the identity is a verified token claim — the one key an attacker
 * cannot rotate. The documented intent (auth.service.ts changePassword:
 * "Rate limiting (route limiter) is the brute-force guard here") was a
 * per-user route limiter, but the route had wired the IP-keyed
 * authRateLimiter — so a stolen access token escalating itself to the
 * password (verify currentPassword until it hits) was bounded only per
 * source IP: fan-out across IPs (botnet) or a topology where req.ip is
 * shared/rotated (r170c production probes behind Render) weakened the
 * cap. skipSuccessfulRequests keeps an honest user's successful change
 * free, exactly like the login limiter's posture.
 */
export const changePasswordRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: AUTH_RATE.max,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'محاولات كثيرة لتغيير كلمة المرور — انتظر قليلاً ثم أعد المحاولة',
    },
  },
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
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    // r170c: 429s from this factory used to fall back to
    // express-rate-limit's own default body — plain-text English
    // "Too many requests, please try again later." — which breaks BOTH
    // contracts the platform pins: the error envelope
    // ({ error: { code, message } } — the FE's apiErrorCode support chip
    // reads the code) and D17-3 (user-facing copy is Arabic). Verified
    // live against the scan limiter (11th request). Route-specific
    // messages keep overriding via `overrides.message`.
    message: { error: { code: 'TOO_MANY_REQUESTS', message: 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة' } },
    keyGenerator: (req) => req.user?.id ?? req.ip ?? 'anon',
    ...overrides,
  });
