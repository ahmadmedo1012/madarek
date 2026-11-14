/**
 * R350 E3 — events → mail: the template registry + the preference-aware
 * dispatch.
 *
 * Every event renders through the shared shell (mail.ts) and lands in
 * the OUTBOX (E2) — idempotent per event key, capped, suppressed, and
 * retried by the worker. The preference law:
 *
 *   · `security` + `account` are ESSENTIAL categories: verification,
 *     password resets/changes, new-device alerts. The user cannot opt
 *     out of the ESSENTIALS (a password-reset mail must always arrive);
 *     the List-Unsubscribe page says exactly that.
 *   · `courses` / `announcements` / `digest` are OPTIONAL: the
 *     NotificationPreference row (or its absence = ON) gates them, and
 *     the one-click unsubscribe writes the opt-outs.
 */
import { prisma } from '../db.js';
import { logger } from '../logger.js';
import { queueMail } from './mail-outbox.js';
import { renderEmailShell } from './mail.js';

export type MailCategory = 'security' | 'account' | 'courses' | 'announcements' | 'digest';

/** Categories the user cannot switch off (transactional essentials). */
export const ESSENTIAL_CATEGORIES: ReadonlySet<MailCategory> = new Set(['security', 'account']);

async function emailEnabledFor(userId: string, category: MailCategory): Promise<boolean> {
  if (ESSENTIAL_CATEGORIES.has(category)) return true;
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId_category: { userId, category } },
    select: { emailEnabled: true },
  });
  return pref ? pref.emailEnabled : true; // absent = ON
}

/**
 * Queue one templated event mail. Resolves the recipient's address +
 * preference; a disabled category is a silent no-op (logged), never an
 * error — event triggers must never fail their surface because mail
 * is off.
 */
export async function sendEventMail(opts: {
  userId: string;
  to: string;
  category: MailCategory;
  template: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
  dedupeKey: string;
  institutionId?: string | null;
}): Promise<void> {
  const enabled = await emailEnabledFor(opts.userId, opts.category);
  if (!enabled) {
    logger.info({ userId: opts.userId, category: opts.category, template: opts.template }, 'mail-event: category off for user — skipped');
    return;
  }
  const html = renderEmailShell({
    title: opts.subject,
    bodyHtml: opts.bodyHtml,
    ctaLabel: opts.ctaLabel,
    ctaUrl: opts.ctaUrl,
  });
  const queued = await queueMail({
    to: opts.to,
    template: opts.template,
    subject: opts.subject,
    html,
    text: opts.bodyText,
    dedupeKey: opts.dedupeKey,
    institutionId: opts.institutionId,
  });
  if (!queued.ok) {
    logger.warn({ userId: opts.userId, reason: queued.reason, template: opts.template }, 'mail-event: outbox refused');
  }
}

/* ── the templates (Arabic, RTL, shared shell) ─────────────────── */

const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://madarek.onrender.com';

export function renderVerifyEmail(name: string, verifyUrl: string, minutes = 60 * 24): { subject: string; bodyHtml: string; bodyText: string; ctaLabel: string } {
  return {
    subject: 'مدارك — أكِّد بريدك الإلكتروني',
    bodyHtml: `<p style="margin:0;">مرحبًا ${name}،</p><p style="margin:12px 0 0;">رَحَّبنا بحسابك في مدارك. أكِّد بريدك الإلكتروني لتفعيل كل خصائص الحساب — الرابط يعمل مرة واحدة ولمدة ${minutes / 60} ساعة.</p>`,
    bodyText: `مرحبًا ${name}،\nأكِّد بريدك الإلكتروني لتفعيل حسابك في مدارك:\n${verifyUrl}\n(الرابط يعمل مرة واحدة، ${minutes / 60} ساعة)\n`,
    ctaLabel: 'تأكيد البريد',
  };
}

export function renderWelcome(name: string): { subject: string; bodyHtml: string; bodyText: string } {
  return {
    subject: 'مدارك — أهلًا بك 🎓',
    bodyHtml: `<p style="margin:0;">أهلًا ${name}،</p><p style="margin:12px 0 0;">رحلة تعلم واحدة من المحاضرة إلى الإتقان — محاضراتك ومقرراتك وتقدّمك في مكان واحد. ابدأ من صفحة الدخول واستكشف لوحتك.</p>`,
    bodyText: `أهلًا ${name}،\nرحلة تعلم واحدة من المحاضرة إلى الإتقان — محاضراتك ومقرراتك وتقدّمك في مكان واحد.\n`,
  };
}

export function renderPasswordChanged(): { subject: string; bodyHtml: string; bodyText: string } {
  return {
    subject: 'مدارك — تم تغيير كلمة المرور',
    bodyHtml: `<p style="margin:0;">تم تغيير كلمة مرور حسابك بنجاح.</p><p style="margin:12px 0 0;">إن لم تكن أنت من غيّرها فاستعد حسابك فورًا عبر «نسيت كلمة المرور» وتواصل مع إدارة مؤسستك.</p>`,
    bodyText: 'تم تغيير كلمة مرور حسابك بنجاح.\nإن لم تكن أنت من غيّرها فاستعد حسابك فورًا عبر «نسيت كلمة المرور».\n',
  };
}

export function renderNewDeviceAlert(device: string, when: string): { subject: string; bodyHtml: string; bodyText: string } {
  return {
    subject: 'مدارك — تسجيل دخول من جهاز جديد',
    bodyHtml: `<p style="margin:0;">سُجِّل دخول إلى حسابك من جهاز/متصفح يظهر لأول مرة:</p><p style="margin:12px 0 0;"><strong>${device}</strong> — ${when}</p><p style="margin:12px 0 0;">إن لم تكن أنت فغيّر كلمة المرور الآن.</p>`,
    bodyText: `سُجِّل دخول إلى حسابك من جهاز جديد:\n${device} — ${when}\nإن لم تكن أنت فغيّر كلمة المرور الآن.\n`,
  };
}

export function renderRoleChanged(newRoleLabel: string, by: string): { subject: string; bodyHtml: string; bodyText: string } {
  return {
    subject: 'مدارك — تحديث صلاحيات حسابك',
    bodyHtml: `<p style="margin:0;">حدَّث ${by} صلاحية حسابك لتصبح: <strong>${newRoleLabel}</strong>.</p><p style="margin:12px 0 0;">سترى الخصائص الجديدة عند دخولك القادم. تواصل مع إدارة مؤسستك إن كان ذلك غير متوقع.</p>`,
    bodyText: `حدَّث ${by} صلاحية حسابك لتصبح: ${newRoleLabel}.\nسترى الخصائص الجديدة عند دخولك القادم.\n`,
  };
}

export function renderActivationInvite(name: string, loginUrl: string, tempPassword: string): { subject: string; bodyHtml: string; bodyText: string; ctaLabel: string } {
  return {
    subject: 'مدارك — حسابك جاهز وكلمة المرور المؤقتة',
    bodyHtml: `<p style="margin:0;">مرحبًا ${name}،</p><p style="margin:12px 0 0;">أنشأ فريق مؤسستك حسابًا لك في مدارك. سجّل الدخول بكلمة المرور المؤقتة أدناه ثم غيّرها عند أول دخول:</p><p style="margin:12px 0;"><strong style="font-family:monospace;font-size:15px;letter-spacing:1px;">${tempPassword}</strong></p>`,
    bodyText: `مرحبًا ${name}،\nكلمة المرور المؤقتة: ${tempPassword}\nرابط الدخول:\n${loginUrl}\n`,
    ctaLabel: 'الدخول إلى مدارك',
  };
}

/** The verify URL builder (APP_ORIGIN + the one-time token). */
export function verifyUrlFor(token: string): string {
  return `${APP_ORIGIN.replace(/\/+$/, '')}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export function loginUrl(): string {
  return `${APP_ORIGIN.replace(/\/+$/, '')}/auth/login`;
}
