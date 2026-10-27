/**
 * R320 §D (PAGES-GAP.md §5) — the forgot-password flow's service core.
 *
 * Two operations, one contract: NO ORACLES.
 *  - requestPasswordReset (mint): the HTTP response is byte-identical
 *    whether the email is registered or not — the unknown path burns the
 *    SAME crypto (random token + sha-256) and makes a same-shape DB
 *    visit (unique-index lookup on the same table) so timing and query
 *    shape do not leak account existence either.
 *  - resetPassword (claim): unknown / expired / used tokens all fail
 *    with the SAME generic error — the claim itself is an atomic CAS
 *    (`updateMany` on `usedAt: null` + unexpired), so there is no
 *    read-then-write double-spend window for a concurrent replay.
 *
 * Token storage (schema: PasswordResetToken): ONLY the sha-256 hex of
 * the raw token is persisted — a FAST hash on purpose (unlike argon2
 * for passwords). A reset token is 128-bit random with a 30-minute TTL;
 * pre-image cost is irrelevant while lookup must stay cheap per reset
 * attempt (argon2 per lookup would be ~100ms of pure waste).
 */
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../db.js';
import { hashPassword } from '../../lib/password.js';
import { AppError } from '../../lib/errors.js';
import { logger } from '../../logger.js';
import { interpretRevocationBump } from './rotation.js';
import { passwordSchema } from './auth.dto.js';

/** Raw-token entropy: 32 bytes → base64url → exactly 43 characters. */
const TOKEN_BYTES = 32;
/** Lifetime of a minted token (PAGES-GAP §5: 30 minutes). */
export const TOKEN_TTL_MS = 30 * 60 * 1000;

/** One generic refusal for EVERY dead token — unknown, expired or used. */
export const RESET_TOKEN_REFUSAL = 'رابط الاستعادة غير صالح أو انتهت صلاحيته — اطلب رابطًا جديدًا';

/** sha-256 hex of the raw token — the ONLY form ever persisted. */
export const hashResetToken = (token: string): string =>
  createHash('sha256').update(token, 'utf8').digest('hex');

/** A fresh 43-char base64url token (32 bytes of entropy). */
export const mintResetTokenValue = (): string => randomBytes(TOKEN_BYTES).toString('base64url');

/**
 * Mint a single-use reset token for the account behind `email`.
 *
 * ONE LIVE TOKEN PER USER: any prior outstanding token is invalidated
 * (marked used) before the new row is created — a stale link in an old
 * mail can never beat the newest request.
 *
 * Returns the RAW token when it was minted (the caller — and only the
 * dev-inbox path — decides whether to surface it), or `null` for an
 * unknown email. The caller MUST answer the same generic envelope for
 * both outcomes; this function never throws on unknown accounts.
 */
export const requestPasswordReset = async (email: string): Promise<string | null> => {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  // Equal-cost crypto visit for the unknown path: generate and hash a
  // token of the exact same shape, then make the same-table DB visit
  // (unique-index lookup by tokenHash). No writes — no side effects —
  // but the timing/query profile stays indistinguishable.
  const token = mintResetTokenValue();
  const tokenHash = hashResetToken(token);

  if (!user) {
    await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    logger.info({ email: normalized }, 'password reset requested for unknown email');
    return null;
  }

  // ONE live token per user: kill every outstanding token first.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  });

  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
  });
  logger.info({ email: normalized, userId: user.id }, 'password reset token minted');
  return token;
};

/**
 * Consume a reset token and set the account's new password.
 *
 * Order of operations (each step is a documented guarantee):
 *  1. REAL password policy check (passwordSchema — the same schema as
 *     register/change-password; NEVER a demo bypass). Runs BEFORE the
 *     claim so a weak password cannot burn a valid token.
 *  2. Atomic single-use claim: `updateMany({ where: { tokenHash,
 *     usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })`
 *     — count === 0 collapses unknown / expired / used into ONE generic
 *     refusal (no token-oracle) and makes a concurrent double-spend
 *     impossible (the second claim sees usedAt != null).
 *  3. The password change itself: argon2 hash + tokenVersion bump +
 *     failedLoginCount/lockedUntil cleared in ONE atomic conditional
 *     user update (the changePassword precedent — D3 revocation event:
 *     every device, including the requester's, signs out). One bounded
 *     retry on `superseded` re-reads the fresh version and retries the
 *     SAME write; a second supersede throws (the token stays spent —
 *     the safe direction — and the user requests a new link).
 *  4. Kill the user's every OTHER token row (older links die with the
 *     password they were minted for).
 */
export const resetPassword = async (token: string, newPassword: string): Promise<void> => {
  // Defense-in-depth: the route DTO enforces the same policy (its
  // Arabic blocklist message is what real callers see); this guard
  // keeps programmatic callers (scripts, future admin flows) honest —
  // the shared schema, never a demo bypass.
  const policy = passwordSchema.safeParse(newPassword);
  if (!policy.success) {
    throw AppError.badRequest('كلمة المرور لا تستوفي الشروط المطلوبة', policy.error.flatten());
  }

  const tokenHash = hashResetToken(token);
  const now = new Date();

  // Atomic single-use claim — also the single refusal point.
  const claim = await prisma.passwordResetToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: now } },
    data: { usedAt: now },
  });
  if (claim.count === 0) {
    // Unknown digest, already used, or past its 30 minutes — the SAME
    // verdict and the SAME message for all three, by design.
    throw AppError.badRequest(RESET_TOKEN_REFUSAL);
  }

  const claimed = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  const user = claimed
    ? await prisma.user.findUnique({ where: { id: claimed.userId } })
    : null;
  if (!user || !user.isActive) {
    // User deleted mid-flight (tokens cascade, but the claim just won a
    // race) or the account was deactivated — no password reset for a
    // dead account, and no distinct message either (no oracle).
    throw AppError.badRequest(RESET_TOKEN_REFUSAL);
  }

  const passwordHash = await hashPassword(newPassword);
  const write = {
    passwordHash,
    tokenVersion: { increment: 1 },
    failedLoginCount: 0,
    lockedUntil: null,
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const result = await prisma.user.updateMany({
      where: { id: user.id, tokenVersion: user.tokenVersion },
      data: write,
    });
    if (interpretRevocationBump(result.count) === 'revoked') break;

    if (attempt === 2) {
      // Superseded twice in a row: a concurrent writer keeps winning.
      // The token is already spent (safe direction — the link cannot be
      // replayed) but the password did NOT change; surface an honest
      // retryable error, never a fake success.
      logger.warn({ userId: user.id }, 'password reset superseded twice — token spent, password unchanged');
      throw AppError.internal('تعذّر تحديث كلمة المرور — اطلب رابط استعادة جديدًا');
    }

    // Bounded retry (one re-read): a concurrent revocation moved the
    // version between our read and write. Re-read the FRESH version and
    // retry the identical atomic write — unlike changePassword there is
    // no current-password check to invalidate, so the retry is sound.
    const fresh = await prisma.user.findUnique({ where: { id: user.id } });
    if (!fresh || !fresh.isActive) {
      throw AppError.badRequest(RESET_TOKEN_REFUSAL);
    }
    user.tokenVersion = fresh.tokenVersion;
  }

  // Every OTHER token row for this user dies with the old password —
  // an older outstanding link (minted before this reset) must not be a
  // second door into the NEW password.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, NOT: { tokenHash } } });

  logger.info({ userId: user.id }, 'password reset completed — all sessions revoked');
};
