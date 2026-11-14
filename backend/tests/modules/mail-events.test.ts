/**
 * R350 E3 — the verification flow + the event templates, pinned.
 *
 * The law:
 *  · mintVerificationToken — one live token per user, SHA-256 stored,
 *    null for unknown/verified (equal-cost, no enumeration oracle);
 *  · claimVerificationToken — single-use CAS, generic refusal, marks
 *    emailVerifiedAt;
 *  · sendEventMail — ESSENTIAL categories ignore preferences; optional
 *    categories honour the NotificationPreference row (absent = ON);
 *  · templates render Arabic content on the shared shell.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/db.js', () => {
  const p: Record<string, unknown> = {
    user: { findUnique: vi.fn(), update: vi.fn() },
    emailVerificationToken: { findUnique: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
    notificationPreference: { findUnique: vi.fn() },
    loginEvent: { findFirst: vi.fn() },
    mailOutbox: { count: vi.fn(async () => 0), create: vi.fn(async () => ({ id: 'o1' })), findUnique: vi.fn() },
    mailSuppression: { findFirst: vi.fn() },
  };
  return { prisma: p, withRetry: vi.fn() };
});

import { prisma } from '../../src/db.js';
import { mintVerificationToken, claimVerificationToken, hashVerifyToken } from '../../src/modules/auth/email-verification.service.js';
import { sendEventMail, renderVerifyEmail, renderWelcome, renderPasswordChanged } from '../../src/lib/mail-events.js';
import { AppError } from '../../src/lib/errors.js';

const mocked = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  emailVerificationToken: { findUnique: ReturnType<typeof vi.fn>; updateMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  notificationPreference: { findUnique: ReturnType<typeof vi.fn> };
  mailOutbox: { create: ReturnType<typeof vi.fn> };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.emailVerificationToken.create.mockResolvedValue({});
  mocked.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
  mocked.user.update.mockResolvedValue({});
  mocked.mailOutbox.create.mockResolvedValue({ id: 'o1' });
});

describe('R350 E3 — the verification token service', () => {
  it('mints one live token per user (prior tokens invalidated) and returns the raw token', async () => {
    mocked.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'سالم', emailVerifiedAt: null });
    const r = await mintVerificationToken('Salem@X.LY');
    expect(r).not.toBeNull();
    expect(r!.token.length).toBeGreaterThanOrEqual(32);
    expect(mocked.emailVerificationToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', usedAt: null } }),
    );
    expect(mocked.emailVerificationToken.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1', tokenHash: hashVerifyToken(r!.token) }),
      }),
    );
  });

  it('returns null for unknown emails (equal-cost path, no oracle)', async () => {
    mocked.user.findUnique.mockResolvedValue(null);
    const r = await mintVerificationToken('nobody@x.ly');
    expect(r).toBeNull();
    expect(mocked.emailVerificationToken.create).not.toHaveBeenCalled();
  });

  it('returns null for already-verified accounts', async () => {
    mocked.user.findUnique.mockResolvedValue({ id: 'u1', firstName: 'س', emailVerifiedAt: new Date() });
    expect(await mintVerificationToken('a@b.ly')).toBeNull();
  });

  it('claims single-use and marks the email verified', async () => {
    mocked.emailVerificationToken.findUnique.mockResolvedValue({
      id: 't1', userId: 'u1', expiresAt: new Date(Date.now() + 3600_000), usedAt: null,
    });
    await claimVerificationToken('raw-token');
    expect(mocked.emailVerificationToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 't1', usedAt: null } }),
    );
    expect(mocked.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' }, data: { emailVerifiedAt: expect.any(Date) } }),
    );
  });

  it('expired/used/unknown tokens throw the SAME generic refusal', async () => {
    for (const row of [
      null,
      { id: 't1', userId: 'u1', expiresAt: new Date(Date.now() - 1000), usedAt: null },
      { id: 't1', userId: 'u1', expiresAt: new Date(Date.now() + 3600_000), usedAt: new Date() },
    ]) {
      mocked.emailVerificationToken.findUnique.mockResolvedValue(row);
      await expect(claimVerificationToken('x')).rejects.toThrow('رابط التأكيد غير صالح');
    }
  });
});

describe('R350 E3 — sendEventMail preference law', () => {
  it('ESSENTIAL (security) ignores an off preference', async () => {
    mocked.notificationPreference.findUnique.mockResolvedValue({ emailEnabled: false });
    await sendEventMail({
      userId: 'u1', to: 'a@b.ly', category: 'security', template: 'security-password-changed',
      subject: 'س', bodyHtml: '<p>س</p>', bodyText: 'س', dedupeKey: 'k1',
    });
    expect(mocked.mailOutbox.create).toHaveBeenCalledOnce();
  });

  it('an optional (announcements) category with the preference OFF never queues', async () => {
    mocked.notificationPreference.findUnique.mockResolvedValue({ emailEnabled: false });
    await sendEventMail({
      userId: 'u1', to: 'a@b.ly', category: 'announcements', template: 'announce',
      subject: 'س', bodyHtml: '<p>س</p>', bodyText: 'س', dedupeKey: 'k2',
    });
    expect(mocked.mailOutbox.create).not.toHaveBeenCalled();
  });

  it('an optional category with NO preference row defaults ON', async () => {
    mocked.notificationPreference.findUnique.mockResolvedValue(null);
    await sendEventMail({
      userId: 'u1', to: 'a@b.ly', category: 'digest', template: 'digest',
      subject: 'س', bodyHtml: '<p>س</p>', bodyText: 'س', dedupeKey: 'k3',
    });
    expect(mocked.mailOutbox.create).toHaveBeenCalledOnce();
  });
});

describe('R350 E3 — templates render Arabic on the shell', () => {
  it('verify/welcome/passwordChanged carry Arabic copy + the RTL shell', () => {
    const v = renderVerifyEmail('سالم', 'https://x.ly/verify?token=abc');
    expect(v.subject).toContain('أكِّد بريدك');
    expect(v.bodyText).toContain('https://x.ly/verify?token=abc');
    expect(v.ctaLabel).toBe('تأكيد البريد');

    const w = renderWelcome('سالم');
    expect(w.subject).toContain('أهلًا');

    const p = renderPasswordChanged();
    expect(p.bodyText).toContain('تغيير كلمة مرور');
  });
});
