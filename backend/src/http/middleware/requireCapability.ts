import type { RequestHandler } from 'express';
import type { Capability } from '@prisma/client';
import { assertCapability } from '../../lib/permissions.js';
import { AppError } from '../../lib/errors.js';

/**
 * Allow only users that have any of the listed capabilities.
 * Use AFTER `authMiddleware`.
 */
export const requireCapability =
  (...caps: Capability[]): RequestHandler =>
  async (req, _res, next) => {
    if (!req.user) return next(AppError.unauthenticated());
    try {
      await assertCapability(req.user.id, req.user.role, ...caps);
      next();
    } catch (e) {
      next(e);
    }
  };
