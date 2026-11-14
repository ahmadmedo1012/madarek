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
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
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

const mocked = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
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

/* ══════════════════════════════════════════════════════════════════
 * R350 E3 continuation — the course-life templates, escaping, the
 * fan-out, and the scheduler mail sweeps (due reminders + digest).
 * ══════════════════════════════════════════════════════════════════ */

import {
  renderAnnouncement,
  renderAssignmentGraded,
  renderExamGraded,
  renderAssignmentDue,
  renderExamScheduled,
  renderEnrollmentConfirmed,
  renderAccountStatusChange,
  renderWeeklyDigest,
  renderActivationInvite,
  isDeliverableEmail,
  escapeHtml,
  clipText,
  fanOutEventMail,
} from '../../src/lib/mail-events.js';

describe('R350 E3 — the course-life templates render Arabic + escaped', () => {
  it('announcement carries the title/excerpt/author and escapes HTML', () => {
    const a = renderAnnouncement('محاضرة إضافية <غدًا>', 'نلقي محاضرة إضافية & نراجع', 'د. سالم');
    expect(a.subject).toContain('إعلان جديد');
    expect(a.subject).toContain('محاضرة إضافية');
    expect(a.bodyHtml).toContain('&lt;غدًا&gt;');
    expect(a.bodyHtml).toContain('&amp;');
    expect(a.bodyHtml).toContain('د. سالم');
  });

  it('assignment-graded carries the grade out of max + feedback', () => {
    const g = renderAssignmentGraded('بحوث الفصل', 8.5, 10, 'عمل جيد');
    expect(g.subject).toContain('تم تصحيح');
    expect(g.bodyHtml).toContain('8.5');
    expect(g.bodyHtml).toContain('10');
    expect(g.bodyHtml).toContain('ملاحظات المصحّح');
  });

  it('exam-graded / exam-scheduled / assignment-due / enrollment render', () => {
    const eg = renderExamGraded('اختبار الفصل', 7, 10);
    expect(eg.bodyHtml).toContain('7');
    const es = renderExamScheduled('اختبار الفصل', new Date('2026-11-20T09:00:00Z'), new Date('2026-11-21T09:00:00Z'), 60);
    expect(es.subject).toContain('اختبار جديد');
    expect(es.bodyHtml).toContain('60 دقيقة');
    const d = renderAssignmentDue('بحوث الفصل', new Date('2026-11-20T09:00:00Z'));
    expect(d.subject).toContain('تسليمك');
    const en = renderEnrollmentConfirmed('مقدمة في الحاسب', 'د. سالم');
    expect(en.subject).toContain('إرفاقك بمقرر');
    expect(en.bodyHtml).toContain('مقدمة في الحاسب');
    expect(en.bodyHtml).toContain('د. سالم');
  });

  it('account status change renders both directions', () => {
    expect(renderAccountStatusChange(true, 'د. المدير').subject).toContain('تنشيط');
    expect(renderAccountStatusChange(false, 'د. المدير').subject).toContain('إيقاف');
  });

  it('weekly digest renders items and the quiet week', () => {
    const d = renderWeeklyDigest('سالم', 'الأسبوع القادم', ['تكليف «X» يستحق الجمعة']);
    expect(d.bodyHtml).toContain('مستحقّات');
    expect(d.bodyHtml).toContain('تكليف «X»');
    const q = renderWeeklyDigest('سالم', 'الأسبوع القادم', []);
    expect(q.bodyHtml).toContain('أسبوع هادئ');
  });

  it('escapeHtml + clipText behave', () => {
    expect(escapeHtml('<script>"x"&\'y\'</script>')).toBe(
      '&lt;script&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/script&gt;',
    );
    expect(clipText('a '.repeat(200), 50).length).toBeLessThanOrEqual(52);
    expect(clipText('قصير').length).toBeLessThanOrEqual(50);
  });

  it('isDeliverableEmail rejects placeholders/malformed, accepts real', () => {
    expect(isDeliverableEmail('salem@students.import.madarek.local')).toBe(false);
    expect(isDeliverableEmail('salem@teachers.import.madarek.local')).toBe(false);
    expect(isDeliverableEmail(null)).toBe(false);
    expect(isDeliverableEmail('nope@')).toBe(false);
    expect(isDeliverableEmail('@nope.ly')).toBe(false);
    expect(isDeliverableEmail('salem@madarek.ly')).toBe(true);
  });
});

describe('R350 E3 — fanOutEventMail skips placeholders and queues the rest', () => {
  it('hydrates users, skips placeholder emails, queues per recipient with dedupe keys', async () => {
    mocked.user.findMany = vi.fn(async () => [
      { id: 'u1', email: 'salem@madarek.ly', firstName: 'سالم' },
      { id: 'u2', email: '99001122@students.import.madarek.local', firstName: 'طالب' },
      { id: 'u3', email: 'huda@madarek.ly', firstName: 'هدى' },
    ]);
    const n = await fanOutEventMail(['u1', 'u2', 'u3'], (r) => ({
      category: 'announcements' as const,
      template: 'announcement',
      subject: 'س',
      bodyHtml: '<p>س</p>',
      bodyText: 'س',
      dedupeKey: `announce:a1:${r.userId}`,
    }));
    expect(n).toBe(2);
    expect(mocked.mailOutbox.create).toHaveBeenCalledTimes(2);
    const keys = mocked.mailOutbox.create.mock.calls.map(
      (c: unknown[]) => (c[0] as { data: { dedupeKey: string } }).data.dedupeKey,
    );
    expect(keys).toContain('announce:a1:u1');
    expect(keys).toContain('announce:a1:u3');
    expect(keys).not.toContain('announce:a1:u2');
  });

  it('honours per-user preferences inside the fan-out', async () => {
    mocked.user.findMany = vi.fn(async () => [
      { id: 'u1', email: 'salem@madarek.ly', firstName: 'سالم' },
    ]);
    mocked.notificationPreference.findUnique.mockResolvedValue({ emailEnabled: false });
    const n = await fanOutEventMail(['u1'], (r) => ({
      category: 'announcements' as const,
      template: 'announcement',
      subject: 'س',
      bodyHtml: '<p>س</p>',
      bodyText: 'س',
      dedupeKey: `announce:a2:${r.userId}`,
    }));
    expect(n).toBe(0);
    expect(mocked.mailOutbox.create).not.toHaveBeenCalled();
  });
});

describe('R350 E3 — the activation invite (import accounts)', () => {
  it('renders the temp password + login CTA in Arabic', () => {
    const t = renderActivationInvite('سالم', 'https://madarek.onrender.com/auth/login', 'Abc123!xyz');
    expect(t.subject).toContain('كلمة المرور المؤقتة');
    expect(t.bodyHtml).toContain('Abc123!xyz');
    expect(t.ctaLabel).toBe('الدخول إلى مدارك');
  });
});

describe('R350 E5 — the shell carries the logo, preheader, and dark-mode metadata', () => {
  it('renders the ONE logo (hosted PNG, alt text) + the hidden preheader + color-scheme', async () => {
    const { renderEmailShell } = await import('../../src/lib/mail.js');
    const html = renderEmailShell({
      title: 'عنوان تجريبي',
      bodyHtml: '<p>نص</p>',
      baseUrl: 'https://madarek.onrender.com',
      preheader: 'سطر المعاينة',
    });
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('prefers-color-scheme');
    expect(html).toContain('display:none;max-height:0;overflow:hidden;opacity:0;">سطر المعاينة');
    expect(html).toContain('src="https://madarek.onrender.com/brand/icon-192.png"');
    expect(html).toContain('alt="مدارك"');
    expect(html).toContain('width="36" height="36"');
    // the wordmark text survives with images off (the logo is never essential)
    expect(html).toContain('>مدارك</span>');
  });

  it('event mail (sendEventMail) rides the shell with the site origin logo', async () => {
    await sendEventMail({
      userId: 'u1', to: 'a@b.ly', category: 'security', template: 'security-x',
      subject: 'س', bodyHtml: '<p>س</p>', bodyText: 'س', dedupeKey: 'k-e5',
    });
    const create = mocked.mailOutbox.create.mock.calls[0]![0] as { data: { html: string } };
    expect(create.data.html).toContain('dir="rtl"');
    expect(create.data.html).toContain('color-scheme');
  });
});

describe('R350 E5 — the dev-only preview registry', () => {
  it('every sample renders HTML through the shell (15 templates)', async () => {
    const { MAIL_TEMPLATE_SAMPLES, mailPreviewEnabled } = await import('../../src/http/routes/mail.routes.js');
    expect(Object.keys(MAIL_TEMPLATE_SAMPLES).length).toBe(15);
    for (const [name, sample] of Object.entries(MAIL_TEMPLATE_SAMPLES)) {
      const rendered = sample();
      expect(rendered.subject.length, name).toBeGreaterThan(0);
      expect(rendered.html, name).toContain('dir="rtl"');
      expect(rendered.html, name).toContain('مدارك');
      expect(rendered.text.length, name).toBeGreaterThan(0);
    }
    expect(typeof mailPreviewEnabled()).toBe('boolean');
  });
});
