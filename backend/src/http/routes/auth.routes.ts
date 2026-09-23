import { Router } from 'express';
import { env } from '../../env.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimit.js';
import { validate } from '../validate.js';
import { loginSchema, registerSchema } from '../../modules/auth/auth.dto.js';
import {
  getCurrentUser,
  loginUser,
  logoutUser,
  refreshTokens,
  registerUser,
} from '../../modules/auth/auth.service.js';
import { verifyRefreshToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';

const router = Router();
const REFRESH_COOKIE = 'mdrk_refresh';

const setRefreshCookie = (res: import('express').Response, token: string) => {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'strict',
    path: '/api/v1/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
};

router.post('/register', authRateLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { user, accessToken, refreshToken } = await registerUser(req.body);
    setRefreshCookie(res, refreshToken);
    res.status(201).json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

router.post('/login', authRateLimiter, validate(loginSchema), async (req, res, next) => {
  try {
<<<<<<< HEAD
    const { user, accessToken, refreshToken } = await loginUser(req.body.email, req.body.password, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
=======
    // IP + UA feed the LoginEvent telemetry rows (/owner/login-analytics).
    const { user, accessToken, refreshToken } = await loginUser(
      req.body.email,
      req.body.password,
      { ip: req.ip, userAgent: req.header('user-agent') },
    );
>>>>>>> 75e9ee6 (feat(backend): submissions API, write-path correctness, auth hardening, telemetry)
    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? '';
    if (!token) throw AppError.unauthenticated('No refresh token');
    const { user, accessToken, refreshToken } = await refreshTokens(token);
    setRefreshCookie(res, refreshToken);
    res.json({ data: { user, accessToken } });
  } catch (e) {
    next(e);
  }
});

/**
 * Logout must work with EITHER credential:
 *  - a valid access token (normal case), or
 *  - just the refresh cookie (access token expired — the exact moment a
 *    user is most likely to click "logout"). The old hard authMiddleware
 *    401'd them and left the refresh cookie live for up to 7 more days.
 *
 * We clear the cookie unconditionally and revoke the refresh token
 * whenever it is parseable; unparseable tokens are ignored (the cookie
 * is being cleared anyway).
 */
router.post('/logout', optionalAuthMiddleware, async (req, res, _next) => {
  // Revoke via access-token identity if present...
  if (req.user) {
    try {
      await logoutUser(req.user.id);
    } catch {
      // Revoke is best-effort — the cookie clear below is the guarantee.
    }
  } else {
    // ...otherwise try to revoke via the refresh cookie.
    const token = (req.cookies?.[REFRESH_COOKIE] as string | undefined) ?? '';
    if (token) {
      try {
        const payload = verifyRefreshToken(token);
        await logoutUser(payload.sub);
      } catch {
        // Expired / tampered / rotated refresh token — nothing to revoke.
      }
    }
  }
  res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
  res.status(204).end();
});

router.get('/me', authMiddleware, async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user!.id);
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

export default router;
