/**
 * r323 B3.2 — the mail layer. Template rendering (the RTL brand shell,
 * the reset + invite bodies), the Brevo sender split, provider request
 * SHAPES against a stubbed fetch (Resend + Brevo), the honest none-mode
 * (logged drop, never a fake send), and the provider-refusal path.
 */
import { describe, expect, it, vi } from 'vitest';
import {
  brevoSender,
  renderEmailShell,
  renderInviteEmail,
  renderResetEmail,
  resolveMailConfig,
  sendMail,
  type MailConfig,
} from '../../src/lib/mail.js';

const S3: MailConfig = {
  provider: 'resend',
  apiKey: 're_test_key',
  from: 'مدارك <no-reply@madarek.ly>',
};

describe('resolveMailConfig', () => {
  it('defaults to the honest none-mode', () => {
    expect(resolveMailConfig({}).provider).toBe('none');
  });
  it('keeps a known provider and coerces an unknown one to none', () => {
    expect(resolveMailConfig({ MAIL_PROVIDER: 'brevo' }).provider).toBe('brevo');
    expect(resolveMailConfig({ MAIL_PROVIDER: 'smtp-gateway' }).provider).toBe('none');
  });
});

describe('brevoSender', () => {
  it('splits «اسم <addr>» and passes a bare address through', () => {
    expect(brevoSender('مدارك <no-reply@madarek.ly>')).toEqual({ name: 'مدارك', email: 'no-reply@madarek.ly' });
    expect(brevoSender('no-reply@madarek.ly')).toEqual({ email: 'no-reply@madarek.ly' });
  });
});

describe('renderEmailShell (the brand RTL shell)', () => {
  it('is RTL, table-based, inline-styled, image-free, gradient-free', () => {
    const html = renderEmailShell({ title: 'عنوان', bodyHtml: '<p>نص</p>', ctaLabel: 'زر', ctaUrl: 'https://x.ly' });
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('#F6F6EE');
    expect(html).toContain('#FA3600');
    expect(html).not.toContain('<style');
    expect(html).not.toContain('<img');
    expect(html.toLowerCase()).not.toContain('linear-gradient');
  });

  it('omits the CTA row when no url is given', () => {
    const html = renderEmailShell({ title: 'عنوان', bodyHtml: 'نص' });
    expect(html).not.toContain('href');
  });
});

describe('renderResetEmail / renderInviteEmail', () => {
  it('carries the one-use + TTL honesty in text and html', () => {
    const mail = renderResetEmail('https://madarek.ly/auth/reset-password?token=t1', 30);
    expect(mail.text).toContain('مرة واحدة');
    expect(mail.text).toContain('30 دقيقة');
    expect(mail.text).toContain('https://madarek.ly/auth/reset-password?token=t1');
    expect(mail.html).toContain('تعيين كلمة مرور جديدة');
  });

  it('carries the temp password exactly once, clearly labeled', () => {
    const mail = renderInviteEmail('أحمد', 'https://madarek.ly/auth', 'TempPass123');
    expect(mail.html).toContain('TempPass123');
    expect(mail.text).toContain('TempPass123');
    expect(mail.subject).toContain('مدارك');
  });
});

describe('sendMail — provider shapes and honest modes', () => {
  it('none-mode drops with NO fetch (logged, false)', async () => {
    const fetchMock = vi.fn();
    const ok = await sendMail(
      { provider: 'none', from: 'a@b.ly' },
      { to: 's@x.ly', subject: 's', html: '<p/>', text: 't' },
      fetchMock as unknown as typeof fetch,
    );
    expect(ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('resend: POST to the JSON API with bearer + from/to/subject/html/text', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    const ok = await sendMail(
      S3,
      { to: 's@x.ly', subject: 'مرحبا', html: '<p>ن</p>', text: 'ن' },
      fetchMock as unknown as typeof fetch,
    );
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer re_test_key');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ from: 'مدارك <no-reply@madarek.ly>', to: ['s@x.ly'], subject: 'مرحبا' });
  });

  it('brevo: POST with the api-key header and the sender split', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }));
    const ok = await sendMail(
      { ...S3, provider: 'brevo' },
      { to: 's@x.ly', subject: 's', html: '<p/>', text: 't' },
      fetchMock as unknown as typeof fetch,
    );
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect((init.headers as Record<string, string>)['api-key']).toBe('re_test_key');
    const body = JSON.parse(String(init.body));
    expect(body.sender).toEqual({ name: 'مدارك', email: 'no-reply@madarek.ly' });
    expect(body.to).toEqual([{ email: 's@x.ly' }]);
  });

  it('a provider refusal returns false (caller keeps the generic envelope)', async () => {
    const fetchMock = vi.fn(async () => new Response('{"message":"quota"}', { status: 402 }));
    const ok = await sendMail(S3, { to: 's@x.ly', subject: 's', html: '<p/>', text: 't' }, fetchMock as unknown as typeof fetch);
    expect(ok).toBe(false);
  });
});
