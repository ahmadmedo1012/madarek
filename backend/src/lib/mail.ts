/**
 * r323 B3.2 — the transactional mail layer. One API (`sendMail`), two
 * HTTPS providers (Resend, Brevo — both plain JSON POSTs, no SMTP dep,
 * house style: global fetch only), and an honest OFF by default.
 *
 * Provider selection (env): MAIL_PROVIDER = none|resend|brevo.
 *   · none (default): sendMail no-ops with a logged line — the caller
 *     decides what "not configured" means for ITS surface (the forgot
 *     route keeps its generic 200; the registrar keeps the manual
 *     one-time link). NO silent pretending anywhere.
 *   · resend/brevo: MAIL_API_KEY + MAIL_FROM are REQUIRED — a
 *     half-configured provider fails boot in env.ts (same ruling as
 *     STORAGE_DRIVER=s3).
 *
 * Templates render the platform's paper/ink/orange identity as
 * email-safe tables: dir="rtl", inline styles only (Gmail strips
 * <style>), hairline borders, no images (they break in locked-down
 * inboxes), no gradients. Pure functions — pinned by unit tests.
 */
import { logger } from '../logger.js';
import { env } from '../env.js';

/** The process-wide mail config, resolved once from env (tests inject
 *  their own MailConfig into sendMail directly). */
export const mailConfig: MailConfig = resolveMailConfig({
  MAIL_PROVIDER: env.MAIL_PROVIDER,
  MAIL_API_KEY: env.MAIL_API_KEY,
  MAIL_FROM: env.MAIL_FROM,
  APP_ORIGIN: env.APP_ORIGIN,
});

export type MailProviderName = 'none' | 'resend' | 'brevo';

export interface MailConfig {
  provider: MailProviderName;
  apiKey?: string;
  from: string; // «مدارك <no-reply@domain>» or a bare address
  baseUrl?: string; // the app origin for footer links (optional)
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** The config from env (built once in index.ts / injected in tests). */
export function resolveMailConfig(source: {
  MAIL_PROVIDER?: string;
  MAIL_API_KEY?: string;
  MAIL_FROM?: string;
  APP_ORIGIN?: string;
}): MailConfig {
  const provider = (source.MAIL_PROVIDER ?? 'none') as MailProviderName;
  const valid: MailProviderName[] = ['none', 'resend', 'brevo'];
  return {
    provider: valid.includes(provider) ? provider : 'none',
    apiKey: source.MAIL_API_KEY,
    from: source.MAIL_FROM ?? 'مدارك <no-reply@madarek.example>',
    baseUrl: source.APP_ORIGIN,
  };
}

/**
 * Send one message through the configured provider. Returns true when
 * the provider accepted it (2xx), false when it refused — the CALLER
 * owns the honesty of what it tells the user (the forgot route treats
 * a provider refusal exactly like none-mode: the generic 200 + a
 * server-side warn, never a leaky error).
 */
export async function sendMail(cfg: MailConfig, message: MailMessage, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (cfg.provider === 'none' || !cfg.apiKey) {
    logger.warn({ to: message.to, subject: message.subject, provider: cfg.provider }, 'mail: provider not configured — message dropped (honest off)');
    return false;
  }
  try {
    const res =
      cfg.provider === 'resend'
        ? await fetchImpl('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from: cfg.from, to: [message.to], subject: message.subject, html: message.html, text: message.text }),
            signal: AbortSignal.timeout(15_000),
          })
        : await fetchImpl('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              sender: brevoSender(cfg.from),
              to: [{ email: message.to }],
              subject: message.subject,
              htmlContent: message.html,
              textContent: message.text,
            }),
            signal: AbortSignal.timeout(15_000),
          });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      logger.error({ provider: cfg.provider, status: res.status, detail }, 'mail: provider refused the message');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err, provider: cfg.provider }, 'mail: transport failure');
    return false;
  }
}

/** Brevo wants { name, email } — split «اسم <addr>» once, safely. */
export function brevoSender(from: string): { name?: string; email: string } {
  const m = /^([^<]+)<([^>]+)>$/.exec(from.trim());
  if (m === null) return { email: from.trim() };
  return { name: m[1]!.trim(), email: m[2]!.trim() };
}

// ─── Templates (email-safe: tables + inline styles, RTL) ───────────

const SHELL_BORDER = '1px solid #E4E2D8';

/**
 * The shared RTL shell: paper ground, hairline ink frame, the orange
 * accent on the CTA only. 600px measure, table layout, inline styles.
 */
export function renderEmailShell(opts: { title: string; bodyHtml: string; ctaLabel?: string; ctaUrl?: string; footerNote?: string; baseUrl?: string }): string {
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<tr><td style="padding:8px 32px 24px;"><a href="${opts.ctaUrl}" style="display:inline-block;background:#FA3600;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:0;">${opts.ctaLabel}</a></td></tr>`
      : '';
  const footer = `<tr><td style="padding:0 32px 28px;font-size:12px;color:#8A887C;line-height:1.8;">${
    opts.footerNote ?? 'إذا لم تكن من طلب هذه الرسالة فتجاهلها — لن يتغير شيء في حسابك.'
  }${opts.baseUrl ? `<br>مدارك — <a href="${opts.baseUrl}" style="color:#8A887C;">${opts.baseUrl.replace(/^https?:\/\//, '')}</a>` : ''}</td></tr>`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title}</title></head>
<body style="margin:0;padding:0;background:#F1EFE7;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFE7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F6F6EE;border:${SHELL_BORDER};">
<tr><td style="padding:28px 32px 4px;font-weight:700;font-size:18px;color:#282828;">مدارك</td></tr>
<tr><td style="padding:4px 32px 8px;font-size:20px;font-weight:600;color:#282828;">${opts.title}</td></tr>
<tr><td style="padding:0 32px 20px;font-size:14px;color:#4A4A44;line-height:2;">${opts.bodyHtml}</td></tr>
${cta}
${footer}
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** The reset email: one calm paragraph, ONE button, the plain link as fallback. */
export function renderResetEmail(resetUrl: string, minutes = 30): { subject: string; html: string; text: string } {
  const title = 'إعادة تعيين كلمة المرور';
  const body = `وصلك هذا الطلب لأن أحدهم طلب رابطًا جديدًا لكلمة مرور حسابه في مدارك. الرابط يعمل مرة واحدة ولمدة ${minutes} دقيقة فقط.`;
  return {
    subject: 'مدارك — رابط إعادة تعيين كلمة المرور',
    html: renderEmailShell({
      title,
      bodyHtml: `<p style="margin:0;">${body}</p><p style="margin:12px 0 0;">إن لم تطلب الرابط فتجاهل هذه الرسالة وكلمة مرورك الحالية كما هي.</p>`,
      ctaLabel: 'تعيين كلمة مرور جديدة',
      ctaUrl: resetUrl,
    }),
    text: `${body}\n\nالرابط (يعمل مرة واحدة، ${minutes} دقيقة):\n${resetUrl}\n`,
  };
}

/** The bulk-import invite: the account exists, this is how you get in. */
export function renderInviteEmail(name: string, loginUrl: string, tempPassword: string): { subject: string; html: string; text: string } {
  const title = `مرحبًا ${name} — حسابك في مدارك جاهز`;
  const body = `أنشأ فريق جامعتك حسابًا لك في منصة مدارك. سجّل الدخول بكلمة المرور المؤقتة أدناه، ثم غيّرها من إعداداتك عند أول دخول.`;
  return {
    subject: 'مدارك — حسابك الجاهز وكلمة المرور المؤقتة',
    html: renderEmailShell({
      title,
      bodyHtml: `<p style="margin:0;">${body}</p><table role="presentation" cellpadding="0" cellspacing="0" style="margin:16px 0;border:${SHELL_BORDER};"><tr><td style="padding:10px 16px;font-size:13px;color:#4A4A44;">كلمة المرور المؤقتة: <strong style="font-family:monospace;font-size:15px;letter-spacing:1px;">${tempPassword}</strong></td></tr></table>`,
      ctaLabel: 'الدخول إلى مدارك',
      ctaUrl: loginUrl,
      footerNote: 'احتفظ بكلمة المرور في مكان آمن ولا تشاركها مع أحد.',
    }),
    text: `${body}\n\nكلمة المرور المؤقتة: ${tempPassword}\n\nرابط الدخول:\n${loginUrl}\n`,
  };
}
