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
  MAIL_REPLY_TO: env.MAIL_REPLY_TO,
  APP_ORIGIN: env.APP_ORIGIN,
});

export type MailProviderName = 'none' | 'resend' | 'brevo';

export interface MailConfig {
  provider: MailProviderName;
  apiKey?: string;
  from: string; // «مدارك <no-reply@domain>» or a bare address
  baseUrl?: string; // the app origin for footer links (optional)
  /** R350 E5: optional Reply-To for every send (MAIL_REPLY_TO). */
  replyTo?: string;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** R350 E4: transport headers (List-Unsubscribe / List-Unsubscribe-Post
   * for non-transactional mail — RFC 8058 one-click). */
  headers?: Record<string, string>;
}

/** The send outcome: the provider's message id when it has one (the
 * outbox records it — E4's webhook then links delivery/bounce events). */
export interface SendOutcome {
  ok: boolean;
  providerId?: string;
}

/** The config from env (built once in index.ts / injected in tests). */
export function resolveMailConfig(source: {
  MAIL_PROVIDER?: string;
  MAIL_API_KEY?: string;
  MAIL_FROM?: string;
  MAIL_REPLY_TO?: string;
  APP_ORIGIN?: string;
}): MailConfig {
  const provider = (source.MAIL_PROVIDER ?? 'none') as MailProviderName;
  const valid: MailProviderName[] = ['none', 'resend', 'brevo'];
  return {
    provider: valid.includes(provider) ? provider : 'none',
    apiKey: source.MAIL_API_KEY,
    from: source.MAIL_FROM ?? 'مدارك <no-reply@madarek.example>',
    replyTo: source.MAIL_REPLY_TO,
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
export async function sendMail(cfg: MailConfig, message: MailMessage, fetchImpl: typeof fetch = fetch): Promise<SendOutcome> {
  if (cfg.provider === 'none' || !cfg.apiKey) {
    logger.warn({ to: message.to, subject: message.subject, provider: cfg.provider }, 'mail: provider not configured — message dropped (honest off)');
    return { ok: false };
  }
  try {
    const res =
      cfg.provider === 'resend'
        ? await fetchImpl('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: cfg.from,
              ...(cfg.replyTo ? { replyTo: cfg.replyTo } : {}),
              to: [message.to],
              subject: message.subject,
              html: message.html,
              text: message.text,
              ...(message.headers ? { headers: message.headers } : {}),
            }),
            signal: AbortSignal.timeout(15_000),
          })
        : await fetchImpl('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: { 'api-key': cfg.apiKey, 'Content-Type': 'application/json', accept: 'application/json' },
            body: JSON.stringify({
              sender: brevoSender(cfg.from),
              ...(cfg.replyTo ? { replyTo: brevoSender(cfg.replyTo) } : {}),
              to: [{ email: message.to }],
              subject: message.subject,
              htmlContent: message.html,
              textContent: message.text,
              ...(message.headers ? { headers: message.headers } : {}),
            }),
            signal: AbortSignal.timeout(15_000),
          });
    if (!res.ok) {
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      logger.error({ provider: cfg.provider, status: res.status, detail }, 'mail: provider refused the message');
      return { ok: false };
    }
    // Resend answers { id }; Brevo answers { messageId }. Record either —
    // E4's webhook links provider events back to the outbox row.
    const body = (await res.json().catch(() => ({}))) as { id?: string; messageId?: string };
    return { ok: true, providerId: body.id ?? body.messageId };
  } catch (err) {
    logger.error({ err, provider: cfg.provider }, 'mail: transport failure');
    return { ok: false };
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
 *
 * R350 E5 — the shell now carries the ONE logo (the generated
 * brand PNG, hosted on the site — never an attachment), a hidden
 * preheader, and dark-mode-safe colours: `color-scheme` metadata +
 * a <style> block with prefers-color-scheme overrides (Gmail strips
 * <style>; the inline styles stay the base, dark clients that honor
 * the query get the gentler palette). The logo is brand, never
 * information: alt text carries the name, and the shell renders
 * perfectly with images off.
 */
export function renderEmailShell(opts: {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
  baseUrl?: string;
  /** R350 E5: the inbox-list teaser line (default: the title). */
  preheader?: string;
}): string {
  // Default the origin from env so every template (reset/invite/event)
  // carries the ONE logo without each caller threading it through.
  const base = (opts.baseUrl ?? env.APP_ORIGIN ?? '').replace(/\/+$/, '');
  // The header is a two-cell row (email-safe alignment — inline-block
  // + vertical-align is flaky across clients): the brand chip, then the
  // wordmark. The logo is a deliberate paper chip (rounded, hairline
  // border) so it reads intentionally on dark backgrounds too.
  const wordmark = `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><tr>${
    base
      ? `<td style="padding:0;"><img src="${base}/brand/icon-192.png" width="36" height="36" alt="مدارك" class="logo-img" style="display:block;width:36px;height:36px;border:1px solid #E4E2D8;border-radius:8px;padding:3px;background:#FFFFFF;"></td><td style="width:10px;"></td>`
      : ''
  }<td style="padding:0;"><span style="font-size:19px;font-weight:700;color:#282828;" class="ink">مدارك</span></td></tr></table>`;
  const cta =
    opts.ctaLabel && opts.ctaUrl
      ? `<tr><td style="padding:8px 32px 24px;"><a href="${opts.ctaUrl}" style="display:inline-block;background:#FA3600;color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 28px;border-radius:0;">${opts.ctaLabel}</a></td></tr>`
      : '';
  const footer = `<tr><td style="padding:0 32px 28px;font-size:12px;color:#8A887C;line-height:1.8;">${
    opts.footerNote ?? 'إذا لم تكن من طلب هذه الرسالة فتجاهلها — لن يتغير شيء في حسابك.'
  }${base ? `<br>مدارك — <a href="${base}" style="color:#8A887C;">${base.replace(/^https?:\/\//, '')}</a>` : ''}</td></tr>`;
  const preheader = opts.preheader ?? opts.title;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>${opts.title}</title>
<style>
  @media (prefers-color-scheme: dark) {
    .shell-ground { background:#1F1E1B !important; }
    .shell-card { background:#26251F !important; }
    .ink { color:#EDEBE2 !important; }
    .ink-soft { color:#B7B4A6 !important; }
    .ink-body { color:#D6D3C6 !important; }
    .logo-img { border-color:#4A4A44 !important; background:#F6F6EE !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#F1EFE7;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
<table role="presentation" class="shell-ground" width="100%" cellpadding="0" cellspacing="0" style="background:#F1EFE7;padding:24px 12px;">
<tr><td align="center">
<table role="presentation" class="shell-card" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#F6F6EE;border:${SHELL_BORDER};">
<tr><td style="padding:24px 32px 4px;">${wordmark}</td></tr>
<tr><td class="ink" style="padding:8px 32px 8px;font-size:20px;font-weight:600;color:#282828;">${opts.title}</td></tr>
<tr><td class="ink-body" style="padding:0 32px 20px;font-size:14px;color:#4A4A44;line-height:2;">${opts.bodyHtml}</td></tr>
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
