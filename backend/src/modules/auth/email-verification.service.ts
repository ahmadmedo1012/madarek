/**
 * R350 E3 — the email-verification token flow.
 *
 * Mirrors the password-reset service's security shape exactly:
 *   · randomBytes(32) → base64url raw token, SHA-256 hash stored
 *     (a DB leak never yields usable tokens);
 *   · ONE live token per user (prior tokens invalidated on mint);
 *   · single-use claim via conditional update (no race window);
 *   · equal-cost unknown-user path (no enumeration oracle);
 *   · TTL 24h.
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../db.js';
import { logger } from '../../logger.js';
import { AppError } from '../../lib/errors.js';

const TOKEN_BYTES = 32;
export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export const hashVerifyToken = (token: string): string => createHash('sha256').update(token).digest('hex');
export const mintVerifyTokenValue = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

/**
 * Mint a verification token for the user behind `email` (raw token
 * returned; null for unknown email — the caller keeps the response
 * generic). Also used by the authenticated resend-verification route.
 */
export const mintVerificationToken = async (email: string): Promise<{ token: string; userId: string; name: string } | null> => {
  const normalized = email.trim().toLowerCase();
  // Equal-cost unknown path: mint + hash + a same-shape indexed lookup.
  const token = mintVerifyTokenValue();
  const tokenHash = hashVerifyToken(token);

  const user = await prisma.user.findUnique({
    where: { email: normalized },
    select: { id: true, firstName: true, emailVerifiedAt: true },
  });
  if (!user || user.emailVerifiedAt) {
    await prisma.emailVerificationToken.findUnique({ where: { tokenHash } });
    return null;
  }

  // ONE live verification token per user.
  await prisma.emailVerificationToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  await prisma.emailVerificationToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + VERIFY_TOKEN_TTL_MS) },
  });
  logger.info({ userId: user.id }, 'email verification token minted');
  return { token, userId: user.id, name: user.firstName };
};

/**
 * Claim a verification token (single-use) and mark the email verified.
 * Unknown/expired/used tokens all throw the SAME generic Arabic refusal
 * (the reset flow's no-oracle rule).
 */
export const claimVerificationToken = async (rawToken: string): Promise<void> => {
  const tokenHash = hashVerifyToken(rawToken);
  const row = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw AppError.badRequest('رابط التأكيد غير صالح أو منتهي — اطلب رسالة جديدة');
  }
  const claimed = await prisma.emailVerificationToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw AppError.badRequest('رابط التأكيد غير صالح أو منتهي — اطلب رسالة جديدة');
  }
  await prisma.user.update({
    where: { id: row.userId },
    data: { emailVerifiedAt: new Date() },
  });
  logger.info({ userId: row.userId }, 'email verified');
};
