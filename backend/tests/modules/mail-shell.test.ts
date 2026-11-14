/**
 * R350 E5b — the shell-craft sweep on the CANONICAL registry:
 * every template the preview route serves (MAIL_TEMPLATE_SAMPLES) must
 * render through the full shell law, and the shell itself must carry
 * the bulletproof CTA, the anti-leak preheader filler, and the 420px
 * squeeze. A new template cannot skip the laws — the sweep fails.
 */
import { describe, expect, it } from 'vitest';
import { renderEmailShell } from '../../src/lib/mail.js';
import { MAIL_TEMPLATE_SAMPLES } from '../../src/http/routes/mail.routes.js';

describe('R350 E5b — the shell craft upgrades', () => {
  const html = renderEmailShell({
    title: 'عنوان تجريبي',
    bodyHtml: '<p>محتوى</p>',
    preheader: 'سطر المعاينة',
    ctaLabel: 'زر',
    ctaUrl: 'https://madarek.onrender.com/auth/login',
  });

  it('renders the bulletproof padded-cell CTA', () => {
    // bgcolor on the td, padding on the anchor — the Outlook-safe pair
    expect(html).toMatch(/<td align="center" bgcolor="#FA3600"[^>]*>\s*<a [^>]*style="[^"]*padding:12px 28px/);
  });

  it('carries the anti-leak preheader filler', () => {
    expect(html).toMatch(/(&#847;&zwnj;){2,}/);
  });

  it('squeezes the gutters at phone widths (390px)', () => {
    expect(html).toContain('@media screen and (max-width: 420px)');
    expect(html).toContain('.pad {');
    // every 32px gutter cell wears the class
    const gutterCells = html.match(/class="pad[^"]*"[^>]*style="padding:[^"]*32px/g) ?? [];
    expect(gutterCells.length).toBeGreaterThanOrEqual(4);
  });

  it('keeps the E5 base: color-scheme metas + dark block + RTL + 600px', () => {
    expect(html).toContain('<meta name="color-scheme" content="light dark">');
    expect(html).toContain('@media (prefers-color-scheme: dark)');
    expect(html).toContain('<html dir="rtl" lang="ar">');
    expect(html).toContain('max-width:600px');
  });
});

describe('R350 E5b — every registry sample renders through the shell law', () => {
  const names = Object.keys(MAIL_TEMPLATE_SAMPLES);
  it('the registry is the full template set (no silent drops)', () => {
    expect(names.length).toBeGreaterThanOrEqual(15);
  });

  for (const name of names) {
    it(`${name}: rtl + preheader + logo + absolute links + plain text`, () => {
      const mail = MAIL_TEMPLATE_SAMPLES[name]!();
      expect(mail.subject, `${name} subject`).toMatch(/^مدارك/);
      expect(mail.html).toContain('<html dir="rtl" lang="ar">');
      // hidden preheader with the filler in EVERY template
      expect(mail.html).toMatch(/display:none;max-height:0;overflow:hidden/);
      expect(mail.html).toMatch(/(&#847;&zwnj;){2,}/);
      // the ONE logo (or no origin — never a relative src)
      expect(mail.html).not.toMatch(/src="(?!https?:)[^"]*"/);
      // every href is absolute — mail clients never resolve relative URLs
      const rel = mail.html.match(/href="(?!https?:)[^"]*"/g);
      expect(rel, `${name} carries relative hrefs: ${rel?.join(', ')}`).toBeNull();
      // the plain-text alternative is a real alternative, not a stub
      expect(mail.text.length).toBeGreaterThan(20);
    });
  }
});
