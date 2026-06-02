/**
 * Theme module — `GET/PUT /api/v1/me/theme`.
 *
 * Implements T021..T022 of specs/012-design-graphics-uplift/tasks.md.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/theme-state.md.
 *
 * - GET returns the user's stored preference + tiebreak timestamp.
 * - PUT validates the enum, atomically updates both columns, writes
 *   an audit-log entry. Both columns mutate in one transaction so the
 *   sync-on-sign-in tiebreak in the SPA is always consistent.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ThemePreference } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../../http/middleware/auth.js';
import { validate } from '../../http/validate.js';
import { AppError } from '../../lib/errors.js';

export const themeRouter = Router();
themeRouter.use(authMiddleware);

const putBodySchema = z
  .object({
    themePreference: z.nativeEnum(ThemePreference),
  })
  .strict();

themeRouter.get('/', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { themePreference: true, themePreferenceUpdatedAt: true },
    });
    if (!user) throw AppError.notFound('User not found');
    res.json({ data: user });
  } catch (e) {
    next(e);
  }
});

themeRouter.put('/', validate(putBodySchema), async (req, res, next) => {
  try {
    const next_value = (req.body as z.infer<typeof putBodySchema>).themePreference;
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.user.update({
        where: { id: req.user!.id },
        data: {
          themePreference: next_value,
          themePreferenceUpdatedAt: now,
        },
        select: { themePreference: true, themePreferenceUpdatedAt: true },
      });
      await tx.auditLog.create({
        data: {
          action: 'theme.update',
          resourceType: 'User',
          resourceId: req.user!.id,
          userId: req.user!.id,
          metadata: { themePreference: next_value },
        },
      });
      return u;
    });
    res.json({ data: updated });
  } catch (e) {
    next(e);
  }
});
