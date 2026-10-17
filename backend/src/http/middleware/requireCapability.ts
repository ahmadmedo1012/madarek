import type { RequestHandler } from 'express';
import type { Capability } from '@prisma/client';
import { assertCapability, assertCapabilityIn } from '../../lib/permissions.js';
import { AppError } from '../../lib/errors.js';

/**
 * Allow only users that have any of the listed capabilities.
 * Use AFTER `authMiddleware`.
 *
 * r178 (multi-institution): when the caller's session carries an
 * institution context (req.user.institutionId from the token's `inst`
 * claim), the check runs WITH it — institution-scoped UserPermission
 * grants for that institution AND platform-global grants both apply.
 * Contextless sessions keep the global-only semantics.
 */
export const requireCapability =
  (...caps: Capability[]): RequestHandler =>
  async (req, _res, next) => {
    if (!req.user) return next(AppError.unauthenticated());
    try {
      const { id, role, institutionId } = req.user;
      if (institutionId) {
        await assertCapabilityIn(id, role, institutionId, ...caps);
      } else {
        await assertCapability(id, role, ...caps);
      }
      next();
    } catch (e) {
      next(e);
    }
  };
