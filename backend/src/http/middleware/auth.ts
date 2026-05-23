import type { RequestHandler } from 'express';
import { verifyAccessToken } from '../../lib/jwt.js';
import { AppError } from '../../lib/errors.js';

/**
 * Extracts a Bearer access token, verifies it, attaches `req.user`.
 * Throws 401 with TOKEN_EXPIRED on expiry so the client can refresh.
 */
export const authMiddleware: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) {
    return next(AppError.unauthenticated('Missing bearer token'));
  }
  const token = header.slice(7).trim();
  if (!token) return next(AppError.unauthenticated('Empty bearer token'));

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TokenExpiredError') {
      next(new AppError('TOKEN_EXPIRED', 'Access token expired', 401));
      return;
    }
    next(AppError.unauthenticated('Invalid token'));
  }
};

/** Optional auth — populates req.user if a valid token is present, otherwise lets the request through. */
export const optionalAuthMiddleware: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return next();
  const token = header.slice(7).trim();
  if (!token) return next();
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, role: payload.role };
  } catch {
    /* ignore */
  }
  next();
};
