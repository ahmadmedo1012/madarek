import { Router } from 'express';
import { env } from '../../env.js';
import { authMiddleware } from '../middleware/auth.js';
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
    const { user, accessToken, refreshToken } = await loginUser(req.body.email, req.body.password);
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

router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await logoutUser(req.user!.id);
    res.clearCookie(REFRESH_COOKIE, { path: '/api/v1/auth' });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
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
