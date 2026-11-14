/**
 * R350 E4 — deliverability & compliance: the Resend webhook + the
 * public one-click unsubscribe (RFC 8058).
 *
 *  · POST /api/v1/mail/webhook — Resend's svix-signed event stream.
 *    Signature verified with RESEND_WEBHOOK_SECRET (HMAC-SHA256 over
 *    `${svix-id}.${svix-timestamp}.${rawBody}` — node:crypto only,
 *    zero new deps; the raw body arrives via the app-level json
 *    parser's verify hook). Unset secret = the route refuses EVERYTHING
 *    (fail-closed — an unauthenticated bounce feed would be a
 *    suppression-list injection vector). Handled events:
 *      email.bounced (hard)  → MailSuppression(type: hard_bounce)
 *      email.complained      → MailSuppression(type: complaint)
 *      email.delivered       → best-effort outbox providerId link
 *    Everything else: 200 (acknowledged, ignored — Resend retries on
 *    non-2xx and we do not want retries for events we do not use).
 *  · GET/POST /api/v1/mail/unsubscribe — the signed one-click link.
 *    GET serves the Arabic RTL page (no login); POST is RFC 8058's
 *    List-Unsubscribe-Post one-click body (mail clients POST with an
 *    empty body). Both validate the HMAC token, then write
 *    MailSuppression(type: unsubscribe) idempotently and answer a calm
 *    confirmation page. Tokens: HMAC-SHA256(JWT_ACCESS_SECRET,
 *    `unsub:${email}`) — the app's existing secret, no new env var.
 */
import { Router, type Request, type Response } from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { prisma } from '../../db.js';
import { env } from '../../env.js';
// R350 E5 — the dev-only template preview: every render function, one
// registry, sample data. Gated to non-production (or MAIL_PREVIEW=1).
import { renderResetEmail, renderEmailShell } from '../../lib/mail.js';
import {
  renderVerifyEmail,
  renderWelcome,
  renderPasswordChanged,
  renderNewDeviceAlert,
  renderRoleChanged,
  renderActivationInvite,
  renderAnnouncement,
  renderAssignmentGraded,
  renderExamGraded,
  renderAssignmentDue,
  renderExamScheduled,
  renderEnrollmentConfirmed,
  renderAccountStatusChange,
  renderWeeklyDigest,
  verifyUrlFor,
  loginUrl,
  appUrl,
  formatLyDateTime,
} from '../../lib/mail-events.js';
import { logger } from '../../logger.js';

const router = Router();

/* ── svix signature verification (Resend webhooks) ─────────────── */

export function verifySvixSignature(
  rawBody: string,
  headers: Record<string, string | string[] | undefined>,
  secret: string,
): boolean {
  const id = headers['svix-id'];
  const timestamp = headers['svix-timestamp'];
  const signature = headers['svix-signature'];
  if (!id || !timestamp || !signature) return false;
  // The header carries SPACE-separated schemes, each `v1,<base64>` —
  // multiple signatures when the secret was rotated. Any v1 match wins.
  const first = Array.isArray(signature) ? signature[0] : signature;
  const candidates = (first ?? '')
    .split(/\s+/)
    .map((p) => p.trim())
    .filter((p) => p.startsWith('v1,'))
    .map((p) => Buffer.from(p.slice(3), 'base64'));
  if (candidates.length === 0) return false;
  const expected = createHmac('sha256', secret).update(`${id}.${timestamp}.${rawBody}`).digest();
  for (const provided of candidates) {
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) return true;
  }
  return false;
}

/* ── the signed unsubscribe token ───────────────────────────────── */

export function unsubscribeToken(email: string): string {
  return createHmac('sha256', env.JWT_ACCESS_SECRET).update(`unsub:${email}`).digest('base64url');
}

export function verifyUnsubscribeToken(email: string, token: string): boolean {
  const expected = Buffer.from(unsubscribeToken(email));
  const provided = Buffer.from(token);
  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

/* ── the webhook ────────────────────────────────────────────────── */

router.post('/mail/webhook', async (req, res) => {
  const secret = env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    // Fail-closed: without the secret we cannot authenticate ANY event.
    logger.warn('mail-webhook: RESEND_WEBHOOK_SECRET unset — event refused');
    res.status(503).json({ error: { code: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook secret not configured' } });
    return;
  }
  const raw = (req as Request & { rawBody?: string }).rawBody ?? '';
  if (!verifySvixSignature(raw, req.headers, secret)) {
    logger.warn('mail-webhook: signature verification failed');
    res.status(401).json({ error: { code: 'INVALID_SIGNATURE', message: 'Signature verification failed' } });
    return;
  }

  let event: { type?: string; data?: { email?: string; email_id?: string } };
  try {
    event = JSON.parse(raw);
  } catch {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Malformed event body' } });
    return;
  }
  const email = event.data?.email?.toLowerCase();
  const emailId = event.data?.email_id;

  try {
    switch (event.type) {
      case 'email.bounced': {
        if (!email) break;
        await prisma.mailSuppression.upsert({
          where: { email_type: { email, type: 'hard_bounce' } },
          create: { email, type: 'hard_bounce', reason: `Resend bounce event ${emailId ?? ''}`.trim() },
          update: { reason: `Resend bounce event ${emailId ?? ''}`.trim() },
        });
        logger.info({ email }, 'mail-webhook: hard bounce → suppressed');
        break;
      }
      case 'email.complained': {
        if (!email) break;
        await prisma.mailSuppression.upsert({
          where: { email_type: { email, type: 'complaint' } },
          create: { email, type: 'complaint', reason: `Resend complaint event ${emailId ?? ''}`.trim() },
          update: { reason: `Resend complaint event ${emailId ?? ''}`.trim() },
        });
        logger.info({ email }, 'mail-webhook: complaint → suppressed');
        break;
      }
      case 'email.delivered': {
        if (emailId) {
          // Best-effort link back to the outbox row (the provider id we
          // stored at send time) — never fails the webhook for this.
          await prisma.mailOutbox
            .updateMany({ where: { providerId: emailId, status: 'sent' }, data: { lastError: null } })
            .catch(() => undefined);
        }
        break;
      }
      default:
        // Acknowledged + ignored (see the docblock).
        break;
    }
    res.status(200).json({ data: { received: true } });
  } catch (err) {
    logger.error({ err }, 'mail-webhook: handler failure');
    res.status(500).json({ error: { code: 'INTERNAL', message: 'Webhook handler failure' } });
  }
});

/* ── the public unsubscribe (GET page + POST one-click) ────────── */

const UNSUB_PAGE = (ok: boolean, email: string | null): string => `<!DOCTYPE html>
<html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>مدارك — إلغاء الاشتراك</title></head>
<body style="margin:0;padding:0;background:#F6F6EE;font-family:Tahoma,Arial,sans-serif;">
<div style="max-width:520px;margin:0 auto;padding:32px 16px;text-align:right;">
<div style="background:#FFFFFF;border:1px solid #E4E2D8;padding:32px;border-radius:12px;">
<div style="font-size:22px;font-weight:700;color:#282828;margin-bottom:12px;">مدارك</div>
<div style="font-size:16px;color:#282828;line-height:1.9;">${
  ok
    ? `تم إلغاء اشتراك <strong>${email ?? ''}</strong> من الرسائل غير الضرورية.<br>لن تصلك رسائل ترويجية أو تنبيهات عامة بعد الآن. رسائل الحساب الأساسية (كاستعادة كلمة المرور) قد تصلك عند طلبها أنت.`
    : 'رابط الإلغاء غير صالح أو منتهي. إن أردت إلغاء الاشتراك فافتح آخر رسالة وصلتك واضغط رابط الإلغاء فيها.'
}</div>
</div></div></body></html>`;

async function handleUnsubscribe(req: Request, res: Response): Promise<void> {
  const email = String(req.query.email ?? '').toLowerCase();
  const token = String(req.query.token ?? '');
  if (!email || !token || !verifyUnsubscribeToken(email, token)) {
    res.status(400).type('html').send(UNSUB_PAGE(false, null));
    return;
  }
  try {
    await prisma.mailSuppression.upsert({
      where: { email_type: { email, type: 'unsubscribe' } },
      create: { email, type: 'unsubscribe', reason: 'one-click List-Unsubscribe (RFC 8058)' },
      update: { reason: 'one-click List-Unsubscribe (RFC 8058)' },
    });
    logger.info({ email }, 'mail-unsubscribe: suppressed (one-click)');
    res.status(200).type('html').send(UNSUB_PAGE(true, email));
  } catch (err) {
    logger.error({ err }, 'mail-unsubscribe: failure');
    res.status(500).type('html').send(UNSUB_PAGE(false, null));
  }
}

router.get('/mail/unsubscribe', (req, res) => void handleUnsubscribe(req, res));
// RFC 8058: List-Unsubscribe-Post — mail clients POST an empty body.
router.post('/mail/unsubscribe', (req, res) => void handleUnsubscribe(req, res));

/* ── R350 E5: the dev-only template preview ───────────────────── */

/**
 * An event-template sample: bodyHtml/bodyText (the sendEventMail shape)
 * wrapped through the SAME shell the outbox send path uses.
 */
function shellWrap(rendered: {
  subject: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: rendered.subject,
    html: renderEmailShell({
      title: rendered.subject.replace(/^مدارك — /, ''),
      bodyHtml: rendered.bodyHtml,
      ctaLabel: rendered.ctaLabel,
      ctaUrl: rendered.ctaUrl,
    }),
    text: rendered.bodyText,
  };
}

/** One entry per mail template: sample data for the preview route. */
export const MAIL_TEMPLATE_SAMPLES: Record<string, () => { subject: string; html: string; text: string; ctaLabel?: string }> = {
  'reset-password': () => renderResetEmail('https://madarek-nine.vercel.app/auth/reset?token=sample-token-0123456789', 30),
  'verify-email': () =>
    shellWrap({ ...renderVerifyEmail('سالم', verifyUrlFor('sample-token-0123456789abcdef')), ctaUrl: verifyUrlFor('sample-token-0123456789abcdef') }),
  welcome: () => shellWrap({ ...renderWelcome('سالم'), ctaLabel: 'الدخول إلى مدارك', ctaUrl: loginUrl() }),
  'password-changed': () => shellWrap({ ...renderPasswordChanged(), ctaLabel: 'الدخول إلى مدارك', ctaUrl: loginUrl() }),
  'new-device': () =>
    shellWrap({
      ...renderNewDeviceAlert('Chrome على ويندوز — طرابلس، ليبيا', formatLyDateTime(new Date('2026-11-14T18:30:00Z'))),
      ctaLabel: 'الدخول إلى مدارك',
      ctaUrl: loginUrl(),
    }),
  'role-changed': () =>
    shellWrap({ ...renderRoleChanged('محاضر', 'أحمد المدير'), ctaLabel: 'الدخول إلى مدارك', ctaUrl: loginUrl() }),
  'activation-invite': () =>
    shellWrap({ ...renderActivationInvite('سالم العماري', loginUrl(), 'Mad-9k2X!qL'), ctaUrl: loginUrl() }),
  announcement: () =>
    shellWrap({
      ...renderAnnouncement('محاضرة إضافية غدًا', 'نلقي محاضرة إضافية لمراجعة الفصل الثالث — القاعة الكبرى، الساعة العاشرة صباحًا.', 'د. سالم الفيتوري'),
      ctaLabel: 'الدخول إلى مدارك',
      ctaUrl: loginUrl(),
    }),
  'assignment-graded': () =>
    shellWrap({
      ...renderAssignmentGraded('بحوث الفصل الثالث', 8.5, 10, 'عمل جيد — راجع المرجع الخامس.'),
      ctaLabel: 'عرض النتيجة',
      ctaUrl: appUrl('/student/results'),
    }),
  'exam-graded': () =>
    shellWrap({ ...renderExamGraded('اختبار المنتصف', 7, 10), ctaLabel: 'الاختبارات', ctaUrl: appUrl('/student/online-exams') }),
  'assignment-due': () =>
    shellWrap({
      ...renderAssignmentDue('بحوث الفصل الثالث', new Date('2026-11-15T21:00:00Z')),
      ctaLabel: 'تكاليفي',
      ctaUrl: appUrl('/student/assignments'),
    }),
  'exam-scheduled': () =>
    shellWrap({
      ...renderExamScheduled('اختبار المنتصف', new Date('2026-11-20T08:00:00Z'), new Date('2026-11-21T20:00:00Z'), 60),
      ctaLabel: 'الاختبارات',
      ctaUrl: appUrl('/student/online-exams'),
    }),
  'enrollment-confirmed': () =>
    shellWrap({
      ...renderEnrollmentConfirmed('مقدمة إلى علوم الحاسب', 'د. سالم الفيتوري'),
      ctaLabel: 'مقرراتي',
      ctaUrl: appUrl('/student/courses'),
    }),
  'account-status': () =>
    shellWrap({ ...renderAccountStatusChange(false, 'أحمد المدير'), ctaLabel: 'الدخول إلى مدارك', ctaUrl: loginUrl() }),
  'weekly-digest': () =>
    shellWrap({
      ...renderWeeklyDigest('سالم', 'الأسبوع القادم', [
        `تكليف «بحوث الفصل الثالث» يستحق ${formatLyDateTime(new Date('2026-11-16T21:00:00Z'))}`,
        `اختبار «اختبار المنتصف» يفتح ${formatLyDateTime(new Date('2026-11-20T08:00:00Z'))}`,
      ]),
      ctaLabel: 'لوحتي',
      ctaUrl: appUrl('/student/dashboard'),
    }),
};

/** Dev-only gate: never mounted in production (unless MAIL_PREVIEW=1). */
export function mailPreviewEnabled(): boolean {
  return env.NODE_ENV !== 'production' || env.MAIL_PREVIEW === '1';
}

/**
 * GET /api/v1/mail/preview — the index (every template name, one line).
 * GET /api/v1/mail/preview/:template — the rendered HTML (dev-only).
 */
router.get('/mail/preview', (_req, res) => {
  if (!mailPreviewEnabled()) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'غير موجود' } });
    return;
  }
  res.json({ data: { templates: Object.keys(MAIL_TEMPLATE_SAMPLES) } });
});

router.get('/mail/preview/:template', (req, res) => {
  if (!mailPreviewEnabled()) {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'غير موجود' } });
    return;
  }
  const sample = MAIL_TEMPLATE_SAMPLES[req.params.template!];
  if (!sample) {
    res.status(404).json({ error: { code: 'UNKNOWN_TEMPLATE', message: 'قالب غير معروف' } });
    return;
  }
  const rendered = sample();
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(rendered.html);
});

export default router;
