import { Router } from 'express';
import { Role } from '@prisma/client';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../validate.js';
import { consumeInvite, createInvite, listInvites, revokeInvite, validateInvitePublic } from '../../modules/invites/service.js';

/**
 * r323 B3.1 — invite codes (the B3.1 bulk-import remainder).
 *
 *   POST   /invites        — teacher (own offering) / admin / owner
 *   GET    /invites        — the caller's codes + live counts
 *   DELETE /invites/:id    — the creator (owner bypasses)
 *   GET    /invites/:code  — PUBLIC pre-submit validation for the
 *                            register page (scope label + honest verdict)
 *   POST   /invites/redeem — post-registration consume (enroll + count)
 *
 * Mounted at /api/v1. The register route consumes the code AFTER
 * registerUser; this redeem endpoint is the honest seam the auth
 * router calls so the consume logic lives in ONE place.
 */

const router = Router();

const createBody = z.object({
  role: z.enum(['STUDENT', 'TEACHER']),
  offeringId: z.string().min(6).optional(),
  departmentId: z.string().min(6).optional(),
  facultyId: z.string().min(6).optional(),
  expiresInDays: z.coerce.number().int().min(1).max(90),
  maxUses: z.coerce.number().int().min(1).max(500),
});

router.post(
  '/invites',
  authMiddleware,
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(createBody),
  async (req, res, next) => {
    try {
      const invite = await createInvite(req.user!.id, req.body as never);
      res.status(201).json({ data: invite });
    } catch (e) { next(e); }
  },
);

router.get('/invites', authMiddleware, async (req, res, next) => {
  try {
    const invites = await listInvites(req.user!.id);
    res.json({ data: invites });
  } catch (e) { next(e); }
});

router.delete('/invites/:id', authMiddleware, async (req, res, next) => {
  try {
    await revokeInvite(req.params.id!, req.user!.id, req.user!.role);
    res.status(204).end();
  } catch (e) { next(e); }
});

router.get('/invites/:code/validate', async (req, res, next) => {
  try {
    const roleQ = req.query.role;
    const role = typeof roleQ === 'string' && roleQ === 'TEACHER' ? 'TEACHER' : 'STUDENT';
    const data = await validateInvitePublic(req.params.code!, role);
    res.json({ data });
  } catch (e) { next(e); }
});

/** The redeem — the register flow calls it right after account creation
 * (the auth router's register handler with an inviteCode in the body).
 * Authenticated because the account must exist to be enrolled. */
router.post('/invites/redeem', authMiddleware, validate(z.object({ code: z.string().min(4).max(16) })), async (req, res, next) => {
  try {
    const { code } = req.body as { code: string };
    const result = await consumeInvite(code, req.user!.id);
    res.json({ data: result });
  } catch (e) { next(e); }
});

export default router;
