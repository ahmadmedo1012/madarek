import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { AppError } from '../../lib/errors.js';

/** Allow only specific roles. Use AFTER `authMiddleware`. */
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user) return next(AppError.unauthenticated());
    if (!roles.includes(req.user.role)) return next(AppError.forbidden('Insufficient role'));
    next();
  };
