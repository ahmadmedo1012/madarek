import rateLimit from 'express-rate-limit';

const FIFTEEN_MIN = 15 * 60 * 1000;

/** 300 req / 15 min / IP — global API limit. */
export const globalRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many requests' } },
});

/** 10 req / 15 min / IP — protects /auth/login from brute force. */
export const authRateLimiter = rateLimit({
  windowMs: FIFTEEN_MIN,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Too many auth attempts' } },
});
