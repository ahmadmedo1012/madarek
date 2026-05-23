import rateLimit from 'express-rate-limit';
import { env } from '../../env.js';

/** Global rate limiter — applied to the whole API. */
export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

/** Stricter limit for /auth/* — protects against brute-force. */
export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts' } },
});
