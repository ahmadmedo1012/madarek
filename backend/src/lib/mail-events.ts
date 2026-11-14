
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
  /** R350 E5 — the inbox preview line (hidden from the body). */
  preheader?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  dedupeKey: string;
  institutionId?: string | null;
}): Promise<boolean> {
  const enabled = await emailEnabledFor(opts.userId, opts.category);
  if (!enabled) {
    logger.info({ userId: opts.userId, category: opts.category, template: opts.template }, 'mail-event: category off for user — skipped');
    return false;
  }
  const html = renderEmailShell({
    title: opts.subject,
    bodyHtml: opts.bodyHtml,
    preheader: opts.preheader,
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
    return false;
  }
  return true;
}

/* ── the templates (Arabic, RTL, shared shell) ─────────────────── */

const APP_ORIGIN = process.env.APP_ORIGIN ?? 'https://madarek.onrender.com';

export function renderVerifyEmail(name: string, verifyUrl: string, minutes = 60 * 24): { subject: string; bodyHtml: string; bodyText: string; preheader: string; ctaLabel: string } {
  const n = escapeHtml(name);
  return {
    preheader: `رابط التأكيد يعمل مرة واحدة ولمدة ${minutes / 60} ساعة`,
    subject: 'مدارك — أكِّد بريدك الإلكتروني',
    bodyHtml: `<p style="margin:0;">مرحبًا ${n}،</p><p style="margin:12px 0 0;">رَحَّبنا بحسابك في مدارك. أكِّد بريدك الإلكتروني لتفعيل كل خصائص الحساب — الرابط يعمل مرة واحدة ولمدة ${minutes / 60} ساعة.</p>`,
    bodyText: `مرحبًا ${name}،\nأكِّد بريدك الإلكتروني لتفعيل حسابك في مدارك:\n${verifyUrl}\n(الرابط يعمل مرة واحدة، ${minutes / 60} ساعة)\n`,
    ctaLabel: 'تأكيد البريد',
  };
}

export function renderWelcome(name: string): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const n = escapeHtml(name);
  return {
    preheader: 'محاضراتك ومقرراتك وتقدّمك في مكان واحد',
    subject: 'مدارك — أهلًا بك 🎓',
    bodyHtml: `<p style="margin:0;">أهلًا ${n}،</p><p style="margin:12px 0 0;">رحلة تعلم واحدة من المحاضرة إلى الإتقان — محاضراتك ومقرراتك وتقدّمك في مكان واحد. ابدأ من صفحة الدخول واستكشف لوحتك.</p>`,
    bodyText: `أهلًا ${name}،\nرحلة تعلم واحدة من المحاضرة إلى الإتقان — محاضراتك ومقرراتك وتقدّمك في مكان واحد.\n`,
  };
}

export function renderPasswordChanged(): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  return {
    preheader: 'إن لم تكن أنت من غيّرها فاستعد حسابك فورًا',
    subject: 'مدارك — تم تغيير كلمة المرور',
    bodyHtml: `<p style="margin:0;">تم تغيير كلمة مرور حسابك بنجاح.</p><p style="margin:12px 0 0;">إن لم تكن أنت من غيّرها فاستعد حسابك فورًا عبر «نسيت كلمة المرور» وتواصل مع إدارة مؤسستك.</p>`,
    bodyText: 'تم تغيير كلمة مرور حسابك بنجاح.\nإن لم تكن أنت من غيّرها فاستعد حسابك فورًا عبر «نسيت كلمة المرور».\n',
  };
}

export function renderNewDeviceAlert(device: string, when: string): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const d = escapeHtml(device);
  return {
    preheader: 'إن لم تكن أنت فغيّر كلمة المرور الآن',
    subject: 'مدارك — تسجيل دخول من جهاز جديد',
    bodyHtml: `<p style="margin:0;">سُجِّل دخول إلى حسابك من جهاز/متصفح يظهر لأول مرة:</p><p style="margin:12px 0 0;"><strong>${d}</strong> — ${when}</p><p style="margin:12px 0 0;">إن لم تكن أنت فغيّر كلمة المرور الآن.</p>`,
    bodyText: `سُجِّل دخول إلى حسابك من جهاز جديد:\n${device} — ${when}\nإن لم تكن أنت فغيّر كلمة المرور الآن.\n`,
  };
}

export function renderRoleChanged(newRoleLabel: string, by: string): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const r = escapeHtml(newRoleLabel);
  const b = escapeHtml(by);
  return {
    preheader: `صلاحيتك الجديدة: ${newRoleLabel}`,
    subject: 'مدارك — تحديث صلاحيات حسابك',
    bodyHtml: `<p style="margin:0;">حدَّث ${b} صلاحية حسابك لتصبح: <strong>${r}</strong>.</p><p style="margin:12px 0 0;">سترى الخصائص الجديدة عند دخولك القادم. تواصل مع إدارة مؤسستك إن كان ذلك غير متوقع.</p>`,
    bodyText: `حدَّث ${by} صلاحية حسابك لتصبح: ${newRoleLabel}.\nسترى الخصائص الجديدة عند دخولك القادم.\n`,
  };
}

export function renderActivationInvite(name: string, loginUrl: string, tempPassword: string): { subject: string; bodyHtml: string; bodyText: string; preheader: string; ctaLabel: string } {
  const n = escapeHtml(name);
  return {
    preheader: 'كلمة المرور المؤقتة بالداحل — غيّرها عند أول دخول',
    subject: 'مدارك — حسابك جاهز وكلمة المرور المؤقتة',
    bodyHtml: `<p style="margin:0;">مرحبًا ${n}،</p><p style="margin:12px 0 0;">أنشأ فريق مؤسستك حسابًا لك في مدارك. سجّل الدخول بكلمة المرور المؤقتة أدناه ثم غيّرها عند أول دخول:</p><p style="margin:12px 0;"><strong style="font-family:monospace;font-size:15px;letter-spacing:1px;">${tempPassword}</strong></p>`,
    bodyText: `مرحبًا ${name}،\nكلمة المرور المؤقتة: ${tempPassword}\nرابط الدخول:\n${loginUrl}\n`,
    ctaLabel: 'الدخول إلى مدارك',
  };
}

/* ── E3 continuation: the course-life templates ─────────────────── */

export function renderAnnouncement(
  title: string,
  bodyExcerpt: string,
  authorName: string,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const t = escapeHtml(title);
  const b = escapeHtml(bodyExcerpt);
  const a = escapeHtml(authorName);
  return {
    preheader: `إعلان جديد: ${clipText(title, 90)}`,
    subject: `مدارك — إعلان جديد: ${title}`.slice(0, 120),
    bodyHtml: `<p style="margin:0;"><strong>${t}</strong></p><p style="margin:12px 0 0;">${b}</p><p style="margin:12px 0 0;color:#6b7280;font-size:13px;">— ${a}</p>`,
    bodyText: `${title}\n\n${bodyExcerpt}\n\n— ${authorName}\n`,
  };
}

export function renderAssignmentGraded(
  assignmentTitle: string,
  grade: number,
  maxScore: number,
  feedback?: string | null,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const t = escapeHtml(assignmentTitle);
  const f = feedback ? escapeHtml(feedback) : null;
  return {
    preheader: `حصلت على ${grade} من ${maxScore} في «${assignmentTitle}»`,
    subject: 'مدارك — تم تصحيح تسليمك',
    bodyHtml:
      `<p style="margin:0;">حصلت على <strong>${grade} من ${maxScore}</strong> في «${t}».</p>` +
      (f ? `<p style="margin:12px 0 0;">ملاحظات المصحّح: ${f}</p>` : ''),
    bodyText: `حصلت على ${grade} من ${maxScore} في «${assignmentTitle}».\n${feedback ? `ملاحظات المصحّح: ${feedback}\n` : ''}`,
  };
}

export function renderExamGraded(
  examTitle: string,
  score: number,
  maxScore: number,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const t = escapeHtml(examTitle);
  return {
    preheader: `نتيجتك: ${score} من ${maxScore}`,
    subject: 'مدارك — نتيجة اختبارك جاهزة',
    bodyHtml: `<p style="margin:0;">نتيجتك في «${t}»: <strong>${score} من ${maxScore}</strong>.</p>`,
    bodyText: `نتيجتك في «${examTitle}»: ${score} من ${maxScore}.\n`,
  };
}

export function renderAssignmentDue(
  assignmentTitle: string,
  dueAt: Date,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const t = escapeHtml(assignmentTitle);
  const when = formatLyDateTime(dueAt);
  return {
    preheader: `متبقّ وقت قليل على استحقاق «${assignmentTitle}»`,
    subject: 'مدارك — تسليمك غدًا',
    bodyHtml: `<p style="margin:0;">متبقّي وقت قليل على استحقاق «<strong>${t}</strong>»:</p><p style="margin:12px 0 0;"><strong>${when}</strong></p><p style="margin:12px 0 0;">سلّم قبل الموعد لتجنّب التأخير.</p>`,
    bodyText: `متبقّي وقت قليل على استحقاق «${assignmentTitle}»:\n${when}\nسلّم قبل الموعد لتجنّب التأخير.\n`,
  };
}

export function renderExamScheduled(
  examTitle: string,
  openAt: Date | null,
  closeAt: Date | null,
  durationMin: number | null,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const t = escapeHtml(examTitle);
  const window =
    openAt && closeAt
      ? `يفتح ${formatLyDateTime(openAt)} ويغلق ${formatLyDateTime(closeAt)}`
      : 'طالع التفاصيل من صفحة الاختبارات';
  const duration = durationMin ? ` · المدة ${durationMin} دقيقة` : '';
  return {
    preheader: 'طالع نافذة الاختبار من صفحة الاختبارات',
    subject: 'مدارك — اختبار جديد متاح لك',
    bodyHtml: `<p style="margin:0;">اختبار «<strong>${t}</strong>» جاهز.${duration}</p><p style="margin:12px 0 0;">${window}.</p>`,
    bodyText: `اختبار «${examTitle}» جاهز.${duration}\n${window}.\n`,
  };
}

export function renderEnrollmentConfirmed(
  courseName: string,
  teacherName: string | null,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const c = escapeHtml(courseName);
  const t = teacherName ? escapeHtml(teacherName) : null;
  return {
    preheader: `تمّ إرفاقك بمقرر «${courseName}»`,
    subject: 'مدارك — تأكيد إرفاقك بمقرر',
    bodyHtml:
      `<p style="margin:0;">تمّ إرفاقك بمقرر «<strong>${c}</strong>».</p>` +
      (t ? `<p style="margin:12px 0 0;">المحاضر: ${t}.</p>` : ''),
    bodyText: `تمّ إرفاقك بمقرر «${courseName}».\n${teacherName ? `المحاضر: ${teacherName}.\n` : ''}`,
  };
}

export function renderAccountStatusChange(
  active: boolean,
  byLabel: string,
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const b = escapeHtml(byLabel);
  return active
    ? {
      preheader: 'تحديث على حالة حسابك في مدارك',
        subject: 'مدارك — تم تنشيط حسابك',
        bodyHtml: `<p style="margin:0;">فعّل ${b} حسابك — يمكنك الدخول من جديد.</p>`,
        bodyText: `فعّل ${byLabel} حسابك — يمكنك الدخول من جديد.\n`,
      }
    : {
      preheader: 'تحديث على حالة حسابك في مدارك',
        subject: 'مدارك — تم إيقاف حسابك',
        bodyHtml: `<p style="margin:0;">أوقف ${b} حسابك. تواصل مع إدارة مؤسستك إن كان ذلك غير متوقع.</p>`,
        bodyText: `أوقف ${byLabel} حسابك. تواصل مع إدارة مؤسستك إن كان ذلك غير متوقع.\n`,
      };
}

export function renderWeeklyDigest(
  name: string,
  weekLabel: string,
  items: string[],
): { subject: string; bodyHtml: string; bodyText: string; preheader: string } {
  const n = escapeHtml(name);
  if (items.length === 0) {
    return {
      preheader: 'مستحقّات أسبوعك في مدارك — لا شيء مستحق هذا الأسبوع',
      subject: 'مدارك — موجز الأسبوع',
      bodyHtml: `<p style="margin:0;">أهلًا ${n}،</p><p style="margin:12px 0 0;">لا شيء مستحق في ${escapeHtml(weekLabel)} — أسبوع هادئ. استفد من مراجعة محاضراتك السابقة.</p>`,
      bodyText: `أهلًا ${name}،\nلا شيء مستحق في ${weekLabel} — أسبوع هادئ.\n`,
    };
  }
  const list = items.map((i) => `<li style="margin:4px 0;">${escapeHtml(i)}</li>`).join('');
  const textList = items.map((i) => `· ${i}`).join('\n');
  return {
    preheader: `مستحقّات ${weekLabel}: ${items.length} عناصر`,
    subject: 'مدارك — موجز الأسبوع',
    bodyHtml: `<p style="margin:0;">أهلًا ${n}،</p><p style="margin:12px 0 0;">مستحقّات ${escapeHtml(weekLabel)}:</p><ul style="margin:8px 0;padding-inline-start:20px;">${list}</ul>`,
    bodyText: `أهلًا ${name}،\nمستحقّات ${weekLabel}:\n${textList}\n`,
  };
}

/* ── the fan-out (MANY-recipient seats) ─────────────────────────── */

/** Non-deliverable placeholder suffix (F1 import rows without emails). */
const PLACEHOLDER_EMAIL_SUFFIX = '.import.madarek.local';

/** A deliverable address: present, @-shaped, not an import placeholder. */
export function isDeliverableEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.indexOf('@');
  if (at < 1 || at === email.length - 1) return false;
  return !email.endsWith(PLACEHOLDER_EMAIL_SUFFIX);
}

/**
 * Hydrate recipient ids → emails (paged) and queue one event mail per
 * deliverable, active recipient. Placeholder/import-domain addresses
 * and inactive users are skipped silently — the call never throws into
 * a surface whose primary write already landed.
 */
export async function fanOutEventMail(
  userIds: string[],
  build: (recipient: { userId: string; email: string; firstName: string }) => {
    category: MailCategory;
    template: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    ctaLabel?: string;
    ctaUrl?: string;
    dedupeKey: string;
  },
  opts: { institutionId?: string | null } = {},
): Promise<number> {
  let queued = 0;
  const PAGE = 100;
  for (let i = 0; i < userIds.length; i += PAGE) {
    const page = userIds.slice(i, i + PAGE);
    const users = await prisma.user.findMany({
      where: { id: { in: page }, isActive: true },
      select: { id: true, email: true, firstName: true },
    });
    for (const u of users) {
      if (!isDeliverableEmail(u.email)) continue;
      const spec = build({ userId: u.id, email: u.email, firstName: u.firstName });
      const did = await sendEventMail({
        userId: u.id,
        to: u.email,
        institutionId: opts.institutionId ?? null,
        ...spec,
      });
      if (did) queued += 1;
    }
  }
  return queued;
}

/* ── shared URL/date helpers ────────────────────────────────────── */

/** The verify URL builder (APP_ORIGIN + the one-time token). */
export function verifyUrlFor(token: string): string {
  return `${APP_ORIGIN.replace(/\/+$/, '')}/auth/verify-email?token=${encodeURIComponent(token)}`;
}

export function loginUrl(): string {
  return `${APP_ORIGIN.replace(/\/+$/, '')}/auth/login`;
}

/** An absolute in-app URL (mail CTAs never carry relative hrefs). */
export function appUrl(path: string): string {
  return `${APP_ORIGIN.replace(/\/+$/, '')}${path}`;
}

/** Libya-facing date/time (the platform's home timezone). */
export function formatLyDateTime(d: Date): string {
  return new Intl.DateTimeFormat('ar-LY', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'Africa/Tripoli',
  }).format(d);
}

/** Minimal HTML escaping for interpolated mail content. */
export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

/** Clip free text to a mail-friendly excerpt (word boundary, no mid-word cut). */
export function clipText(s: string, max = 300): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * 0.6 ? lastSpace : max)}…`;
}
