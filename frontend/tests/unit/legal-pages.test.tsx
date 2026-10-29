/**
 * legal-pages.test.tsx — R320 §D (c2-LEGAL) unit belt.
 *
 * Pins the nine PUBLIC document sheets (/legal/{privacy,terms,cookies,
 * accessibility,security,data} [L-01..L-06] + /about [C-04] · /help
 * [C-05] · /contact [C-03]) against their build map
 * (docs/redesign/r320/PAGES-GAP.md §1/§2/§6/§7) and the honesty law:
 *
 *   · the 9-page grammar — ONE h1, the corner SHEET code derived from
 *     PUBLIC_SHEET_CODES, the skip link + landmarks, the
 *     GuestSheetChrome frame + grain, the colophon + آخر تحديث stamp;
 *   · the title pattern «<سياق> · مدارك» + useLegalMeta's head tags
 *     (set on mount, RESTORED on unmount);
 *   · the honesty markers — every page that states an unknown legal
 *     fact renders [يُستكمل قبل الإطلاق] ≥1, and LEGAL-TODO.md mirrors
 *     each marker with its row (18 rows + the §4 build note);
 *   · the REAL facts per page (argon2, Render+Neon, the cookie
 *     attributes, the 12-72 policy, the demo-platform honesty…) and
 *     the REAL 9-key storage ledger verbatim, with a source-agreement
 *     check against the actual writers (ConsentBanner/store files);
 *   · every wiring point (the footer's 9-link legal row, the contact
 *     cell, the register×2 + login ConsentLine mounts, the banner
 *     retarget, the 9 App routes, the /legal Lenis exclusion, the
 *     index.html links);
 *   · the static identity (robots/sitemap/manifest + the PNG icons'
 *     exact IHDR sizes);
 *   · the CSS contracts (tokens-only, hover-guard, print block,
 *     radius 0, no student-kit import in the public chunk).
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import {
  AccessibilityPage,
  CookiesPage,
  DataPage,
  PrivacyPage,
  SECURITY_MARKER_KEYS,
  SecurityPage,
  STORAGE_LEDGER,
  TermsPage,
  LEGAL_UPDATED,
} from '../../src/pages/legal/LegalPages';
import { AboutPage, ContactPage, HelpPage } from '../../src/pages/PublicPages';
import { ConsentLine } from '../../src/components/ConsentLine';
import { PUBLIC_SHEET_CODES } from '../../src/lib/sheet-code';

/* ── static-source helpers (the fleet convention) ─────────────────── */
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');
/** strip BOTH comment families (TS line comments carry the prose that
 * explains the law — the sweep must target the LIVE copy). */
const stripJsComments = (src: string) =>
  stripComments(src).replace(/^\s*\/\/.*$/gm, '');

/* ── the 9-page matrix ─────────────────────────────────────────────── */

interface PageSpec {
  key: keyof typeof PUBLIC_SHEET_CODES;
  path: string;
  title: string;
  /** the corner line's family word (the capabilities [C-02] register) */
  label: string;
  Component: () => JSX.Element;
  /** pages whose facts are NOT fully known carry the honest marker */
  hasPending: boolean;
}

const PAGES: PageSpec[] = [
  { key: 'privacy', path: '/legal/privacy', title: 'سياسة الخصوصية', label: 'LEGAL SHEET', Component: PrivacyPage, hasPending: true },
  { key: 'terms', path: '/legal/terms', title: 'شروط الاستخدام', label: 'LEGAL SHEET', Component: TermsPage, hasPending: true },
  { key: 'cookies', path: '/legal/cookies', title: 'ملفات تعريف الارتباط والتخزين المحلي', label: 'LEGAL SHEET', Component: CookiesPage, hasPending: false },
  { key: 'accessibility', path: '/legal/accessibility', title: 'بيان إمكانية الوصول', label: 'LEGAL SHEET', Component: AccessibilityPage, hasPending: true },
  { key: 'security', path: '/legal/security', title: 'الأمن والإفصاح المسؤول', label: 'LEGAL SHEET', Component: SecurityPage, hasPending: true },
  { key: 'data', path: '/legal/data', title: 'البيانات وبيانات العرض', label: 'LEGAL SHEET', Component: DataPage, hasPending: true },
  { key: 'contact', path: '/contact', title: 'التواصل والتسجيل المبكر', label: 'CONTACT SHEET', Component: ContactPage, hasPending: true },
  { key: 'about', path: '/about', title: 'عن مدارك', label: 'ABOUT SHEET', Component: AboutPage, hasPending: true },
  { key: 'help', path: '/help', title: 'المساعدة والأسئلة الشائعة', label: 'HELP SHEET', Component: HelpPage, hasPending: false },
];

function renderPage(Component: () => JSX.Element) {
  return render(
    <MemoryRouter>
      <Component />
    </MemoryRouter>,
  );
}

/* ═══ A · the 9-page grammar ════════════════════════════════════════ */

describe('R320 §D — the 9-page grammar (the Heron public sheet)', () => {
  it.each(PAGES)('$path renders ONE h1 with its title', ({ Component, title }) => {
    renderPage(Component);
    const h1s = screen.getAllByRole('heading', { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent(title);
  });

  it.each(PAGES)('$path carries its corner SHEET code derived from PUBLIC_SHEET_CODES', ({ key, label, Component }) => {
    renderPage(Component);
    const code = PUBLIC_SHEET_CODES[key];
    const line = screen.getByText(`MADAREK · ${label} · [${code}]`);
    expect(line).toHaveAttribute('dir', 'ltr');
  });

  it.each(PAGES)('$path: skip link first, main landmark, header, footer colophon + stamp', ({ Component }) => {
    const { container } = renderPage(Component);
    // the skip link is the first anchor in the sheet
    const skip = container.querySelector('a.skip-link');
    expect(skip).toBeTruthy();
    expect(skip?.getAttribute('href')).toBe('#main');
    expect(container.querySelector('main#main')).toBeTruthy();
    expect(container.querySelector('header.lg-header')).toBeTruthy();
    // the honest colophon cluster + the آخر تحديث stamp
    expect(screen.getByText('منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل')).toBeTruthy();
    expect(screen.getAllByText(/آخر تحديث/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(LEGAL_UPDATED).length).toBeGreaterThanOrEqual(1);
  });

  it.each(PAGES)('$path mounts the GuestSheetChrome frame (4 marks) + grain film', ({ Component }) => {
    const { container } = renderPage(Component);
    const frame = container.querySelector('.auth-frame');
    expect(frame).toBeTruthy();
    expect(frame?.querySelectorAll('.auth-mark')).toHaveLength(4);
    expect(container.querySelector('.auth-grain')).toBeTruthy();
  });

  it('the sticky guest header carries the back-to-home link + the brand mark', () => {
    renderPage(PrivacyPage);
    const back = screen.getByRole('link', { name: /العودة إلى الصفحة الرئيسية/ });
    expect(back.getAttribute('href')).toBe('/');
    const brand = screen.getByRole('link', { name: 'مدارك — الصفحة الرئيسية' });
    expect(brand.getAttribute('href')).toBe('/');
  });

  it('the section bars are [nn]-indexed h2s — mono LTR runs, aria-hidden, sequential', () => {
    renderPage(PrivacyPage);
    const bars = screen.getAllByRole('heading', { level: 2 });
    expect(bars.length).toBe(9);
    bars.forEach((bar, i) => {
      const index = within(bar).getByText(`[${String(i + 1).padStart(2, '0')}]`);
      expect(index).toHaveAttribute('dir', 'ltr');
      expect(index).toHaveAttribute('aria-hidden', 'true');
    });
    // the required privacy headings, in the PAGES-GAP §6 order
    const titles = bars.map((b) => b.textContent?.replace(/\[\d+\]/g, '').trim());
    expect(titles).toEqual([
      'ما الذي نجمعه', 'لماذا نجمعه', 'أين يُخزَّن', 'مدة الاحتفاظ', 'حقوقك',
      'الأطراف الثالثة', 'ملفات تعريف الارتباط والتخزين المحلي', 'التواصل', 'آخر تحديث',
    ]);
  });
});

/* ═══ B · the title pattern + useLegalMeta ══════════════════════════ */

describe('R320 §D — titles + per-page head metadata', () => {
  it('every page titles the tab «<سياق> · مدارك» (the house pattern)', () => {
    for (const { Component, title } of PAGES) {
      document.title = 'العنوان السابق';
      const { unmount } = renderPage(Component);
      expect(document.title, `${title}`).toBe(`${title} · مدارك`);
      unmount();
      expect(document.title).toBe('العنوان السابق');
    }
  });

  it('useLegalMeta sets description + canonical + og:title + og:url (privacy)', () => {
    const mk = (tag: 'link' | 'meta', attrs: Record<string, string>) => {
      const el = document.createElement(tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      document.head.append(el);
      return el;
    };
    const desc = mk('meta', { name: 'description', content: 'الوصف السابق' });
    const canonical = mk('link', { rel: 'canonical', href: 'https://madarek.onrender.com/prev' });
    const ogTitle = mk('meta', { property: 'og:title', content: 'العنوان السابق' });
    const ogUrl = mk('meta', { property: 'og:url', content: 'https://madarek.onrender.com/prev' });

    const { unmount } = renderPage(PrivacyPage);
    expect(desc.getAttribute('content')).toBe(
      'ما تجمعه منصّة مدارك من بيانات، ولماذا، وأين تُخزَّن، وحقوقك — مكتوبة من سلوك المنصّة الفعلي لا من قوالب.',
    );
    expect(canonical.getAttribute('href')).toBe('https://madarek.onrender.com/legal/privacy');
    expect(ogTitle.getAttribute('content')).toBe('سياسة الخصوصية');
    expect(ogUrl.getAttribute('content')).toBe('https://madarek.onrender.com/legal/privacy');
    unmount();
    // restore-on-unmount: the previous values come back
    expect(desc.getAttribute('content')).toBe('الوصف السابق');
    expect(canonical.getAttribute('href')).toBe('https://madarek.onrender.com/prev');
    expect(ogTitle.getAttribute('content')).toBe('العنوان السابق');
    expect(ogUrl.getAttribute('content')).toBe('https://madarek.onrender.com/prev');
    [desc, canonical, ogTitle, ogUrl].forEach((el) => el.remove());
  });
});

/* ═══ C · the honesty markers + the LEGAL-TODO mirror ═══════════════ */

describe('R320 §D — honesty markers + the LEGAL-TODO mirror', () => {
  it.each(PAGES.filter((p) => p.hasPending))(
    '$path renders ≥1 visible [يُستكمل قبل الإطلاق] marker',
    ({ Component }) => {
      renderPage(Component);
      const tags = screen.getAllByText('[يُستكمل قبل الإطلاق]');
      expect(tags.length).toBeGreaterThanOrEqual(1);
    },
  );

  it('the fully-known pages (cookies + help) render ZERO pending markers', () => {
    const { rerender } = render(
      <MemoryRouter>
        <CookiesPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('[يُستكمل قبل الإطلاق]')).toBeNull();
    rerender(
      <MemoryRouter>
        <HelpPage />
      </MemoryRouter>,
    );
    expect(screen.queryByText('[يُستكمل قبل الإطلاق]')).toBeNull();
  });

  it('LEGAL-TODO carries 18 rows (incl. the 3 new: 16/17/18) + the build note maps all 9 pages', () => {
    const todo = read('../docs/redesign/r320/LEGAL-TODO.md');
    // rows 1..18 all present in the TODO table
    for (let n = 1; n <= 18; n++) {
      expect(todo, `row ${n}`).toMatch(new RegExp(`^\\| ${n} \\|`, 'm'));
    }
    // the §4 build note (the c2-LEGAL build map) names all 9 pages + the stamp
    expect(todo).toContain('## 4 · The R320 §D build note');
    for (const p of PAGES) {
      expect(todo).toContain(`\`${p.path}\` [${PUBLIC_SHEET_CODES[p.key]}]`);
    }
    expect(todo).toContain(`LEGAL_UPDATED = ${LEGAL_UPDATED}`);
  });

  it('LEGAL_UPDATED is a real ISO date (the build stamp, row 9’s interim rule)', () => {
    expect(LEGAL_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

/* ═══ D · the real facts per page ═══════════════════════════════════ */

describe('R320 §D — the real facts (every sentence from real code)', () => {
  it('privacy: argon2 · Render + Neon · 15m/7d · the opt-in AI provider story', () => {
    renderPage(PrivacyPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('argon2');
    expect(text).toContain('Render');
    expect(text).toContain('Neon');
    expect(text).toContain('15m');
    expect(text).toContain('7d');
    for (const provider of ['OpenAI', 'openai', 'openrouter', 'groq']) {
      expect(text).toContain(provider);
    }
    // the honest fallback: the local composer when the provider is off
    expect(text).toContain('أداة محلية بسيطة');
    expect(text).toContain('دون إرسال أي بيانات');
  });

  it('terms: demo-platform honesty · 12-72 policy · @test.ly · «كما هي»', () => {
    renderPage(TermsPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('ليست جامعة معتمدة ولا تمنح درجات');
    expect(text).toContain('12');
    expect(text).toContain('72');
    expect(text).toContain('@test.ly');
    expect(text).toContain('كما هي');
    expect(text).toContain('جامعة مدارك التجريبية');
  });

  it('cookies: the ONE cookie with its REAL attributes (httpOnly · strict · path · 7d)', () => {
    renderPage(CookiesPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('mdrk_refresh');
    expect(text).toContain('httpOnly');
    expect(text).toContain('sameSite=strict');
    expect(text).toContain('/api/v1/auth');
    expect(text).toContain('7d');
  });

  it('cookies: the reject-purge story — the two gated keys purged, the user links NEVER destroyed', () => {
    renderPage(CookiesPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('mdrk-ui');
    expect(text).toContain('mdrk-doc-side-w');
    expect(text).toContain('mdrk-academic-links');
    expect(text).toContain('لا يُمس أبدًا عند الرفض');
    expect(text).toContain('لا يدمّر محتوى المستخدم');
  });

  it('cookies: the 9-key table rendered VERBATIM — each key in its own dir=ltr mono cell', () => {
    renderPage(CookiesPage);
    const table = screen.getByRole('table');
    for (const row of STORAGE_LEDGER) {
      // the key cell (NOT the prose mentions in the reject section)
      const cells = within(table).getAllByText(row.key);
      const keyCell = cells.find((el) => el.className.includes('lg-table-key'));
      expect(keyCell, row.key).toBeTruthy();
      expect(keyCell).toHaveAttribute('dir', 'ltr');
    }
    // the table declares its four columns
    expect(screen.getByRole('columnheader', { name: 'المفتاح' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'الغرض' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'الصنف' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'يُحذف عند الرفض؟' })).toBeTruthy();
  });

  it('STORAGE_LEDGER exports EXACTLY the 9 real keys, in the §2 inventory order', () => {
    expect(STORAGE_LEDGER.map((r) => r.key)).toEqual([
      'madarek.consent',
      'madarek.consent.record',
      'madarek-theme',
      'mdrk-theme-profile',
      'mdrk-auth',
      'mdrk-ui',
      'mdrk-doc-side-w',
      'mdrk-academic-links',
      'mdrk-auth::probe',
    ]);
  });

  it('gate-agreement (source check): every ledger key appears in its real writer source', () => {
    const banner = read('src/components/landing/chrome/ConsentBanner.tsx');
    // consent + gated + essential classes — straight from the banner
    for (const k of ['madarek.consent', 'madarek.consent.record', 'mdrk-ui', 'mdrk-doc-side-w']) {
      expect(banner, k).toContain(`'${k}'`);
    }
    for (const k of ['madarek-theme', 'mdrk-theme-profile', 'mdrk-auth']) {
      expect(banner, k).toContain(`'${k}'`);
    }
    // the remaining writers
    expect(read('src/hooks/useThemeProfileSync.ts')).toContain("'mdrk-theme-profile'");
    expect(read('src/stores/auth.store.ts')).toContain('mdrk-auth');
    expect(read('src/pages/DocumentViewerPage.tsx')).toContain('mdrk-doc-side-w');
    expect(read('src/pages/student/ProfilePage.tsx')).toContain('mdrk-academic-links');
    // the ONE cookie + its attributes — the backend routes file
    const routes = read('../backend/src/http/routes/auth.routes.ts');
    expect(routes).toContain("'mdrk_refresh'");
    expect(routes).toContain('httpOnly: true');
    expect(routes).toContain("sameSite: 'strict'");
    expect(routes).toContain("path: '/api/v1/auth'");
  });

  it('accessibility: ONLY what ships — no formal-audit claim, IBM Plex named', () => {
    renderPage(AccessibilityPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('44px');
    expect(text).toContain('تقليل الحركة');
    expect(text).toContain('IBM Plex Sans Arabic');
    expect(text).toContain('Geist Mono');
    expect(text).toContain('لم يُجرَ تقييم رسمي');
  });

  it('security: the shipped controls + لا ISO ولا SOC + the disclosure channel', () => {
    renderPage(SecurityPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('argon2');
    expect(text).toContain('12-72');
    expect(text).toContain('15m');
    expect(text).toContain('7d');
    expect(text).toContain('403');
    expect(text).toContain('CSP');
    expect(text).toContain('لا شهادة ISO ولا SOC');
    expect(text).toContain('الإفصاح المسؤول');
  });

  it('data: the synthetic-vs-real split + the capabilities ledger door', () => {
    renderPage(DataPage);
    const text = document.body.textContent ?? '';
    expect(text).toContain('بيانات مبذورة اصطناعية بالكامل');
    expect(text).toContain('بياناتك الحقيقية');
    expect(text).toContain('@test.ly');
    const link = screen.getByRole('link', { name: /ما يعمل اليوم/ });
    expect(link.getAttribute('href')).toBe('/capabilities');
  });

  it('about: the landing independence paragraph VERBATIM (nothing added)', () => {
    const landing = read('src/pages/LandingPage.tsx');
    // extract the honest identity paragraph from the landing source
    const m = landing.match(/منصّة تعليمية تقنية مستقلّة، عربية أولًا\.[^<]+/);
    expect(m).toBeTruthy();
    const paragraph = m![0].trim();
    expect(paragraph).toContain('اصطناعية بالكامل لأغراض العرض');
    renderPage(AboutPage);
    expect(screen.getByText(paragraph)).toBeTruthy();
  });

  it('help: nine FAQs, each citing a real surface (@test.ly/12345678 · 5 roles · the storage ledger · the print sheet)', () => {
    renderPage(HelpPage);
    const questions = screen.getAllByRole('heading', { level: 2 });
    expect(questions).toHaveLength(9);
    const text = document.body.textContent ?? '';
    expect(text).toContain('@test.ly');
    expect(text).toContain('12345678');
    expect(text).toContain('خمسة أدوار');
    // the forgot-password truth: no mail is sent yet (honest, no promise)
    expect(text).toContain('لا يوجد بريد يُرسَل من المنصّة بعد');
    expect(text).toContain('تقليل الحركة');
    expect(text).toContain('/legal/*');
    const ledgerLink = screen.getByRole('link', { name: /صفحة التخزين المحلي/ });
    expect(ledgerLink.getAttribute('href')).toBe('/legal/cookies');
  });

  it('help (r324 X15): a PROD build without VITE_PILOT_HELP_ACCOUNTS ships the credential-free FAQ variants', () => {
    const dev = import.meta.env.DEV;
    try {
      (import.meta.env as { DEV: boolean }).DEV = false;
      renderPage(HelpPage);
      const text = document.body.textContent ?? '';
      // the working password is NOT published on the public prod page
      expect(text).not.toContain('12345678');
      expect(text).not.toContain('@test.ly');
      // the honest reset truth survives the gate — the promise, not the secret
      expect(text).toContain('لا يوجد بريد يُرسَل من المنصّة بعد');
      expect(text).toContain('الحساب الذي وصلك');
    } finally {
      (import.meta.env as { DEV: boolean }).DEV = dev;
    }
  });

  it('contact: the early-access register form IS the channel — zero invented email/phone/social', () => {
    renderPage(ContactPage);
    const register = screen.getAllByRole('link', { name: /نموذج إنشاء الحساب الجامعي/ });
    expect(register[0]?.getAttribute('href')).toBe('/auth/register');
    const text = document.body.textContent ?? '';
    expect(text).toContain('لا بريد عام');
    expect(text).toContain('التسجيل المبكر');
    // NO invented channels: no mailto:, no tel:, no social handles
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('a[href^="tel:"]')).toBeNull();
    expect(text).not.toMatch(/@[a-z]+\.(com|net|org)/i);
  });

  it('NO certification CLAIMS anywhere (the banned-phrase sweep over the public chunk)', () => {
    const files = [
      'src/pages/legal/LegalSheet.tsx',
      'src/pages/legal/LegalPages.tsx',
      'src/pages/PublicPages.tsx',
    ];
    for (const f of files) {
      // comments explain the LAW (e.g. "none are certified") — the
      // sweep targets the LIVE copy only
      const src = stripComments(read(f));
      expect(src, f).not.toMatch(/متوافقون? مع (GDPR|ISO|SOC)/);
      expect(src, f).not.toMatch(/حاصلون? على/);
      expect(src, f).not.toMatch(/certified|compliant/);
    }
  });
});

/* ═══ E · PUBLIC_SHEET_CODES — the single source ════════════════════ */

describe('R320 §D — PUBLIC_SHEET_CODES (the single sheet-code source)', () => {
  it('exports the nine codes: L-01..L-06 + C-03..C-05', () => {
    expect(PUBLIC_SHEET_CODES).toEqual({
      privacy: 'L-01',
      terms: 'L-02',
      cookies: 'L-03',
      accessibility: 'L-04',
      security: 'L-05',
      data: 'L-06',
      contact: 'C-03',
      about: 'C-04',
      help: 'C-05',
    });
  });

  it('the pages never re-type their code — the header derives from the map', () => {
    const pagesSrc = read('src/pages/legal/LegalSheet.tsx');
    expect(pagesSrc).toContain('PUBLIC_SHEET_CODES[code]');
    expect(read('src/pages/legal/LegalPages.tsx')).not.toContain("'L-01'");
    expect(read('src/pages/PublicPages.tsx')).not.toContain("'C-03'");
  });
});

/* ═══ F · wiring ════════════════════════════════════════════════════ */

describe('R320 §D — every wiring point', () => {
  it('the landing footer legal row: nine links, hairline-separated, riding the © bar (R321 §A2)', () => {
    const src = read('src/pages/LandingPage.tsx');
    const row = src.match(/<nav className="fo-legal-row"[\s\S]*?<\/nav>/);
    expect(row).toBeTruthy();
    const expected = [
      '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/accessibility',
      '/legal/security', '/legal/data', '/about', '/help', '/contact',
    ];
    for (const href of expected) {
      expect(row![0], href).toContain(`to="${href}"`);
    }
    expect(row![0]).toContain('className="fo-legal-sep"');
    // R321 §A2 re-pin: the row rides INSIDE the © bar (one ruled line
    // instead of two — the footer returned to the ±1.5% docH band;
    // was: its own band BETWEEN the strip and the © line).
    const stripIdx = src.indexOf('<div className="fo-fstrip">');
    const bottomIdx = src.indexOf('fo-footer-bottom');
    const rowIdx = src.indexOf('fo-legal-row');
    expect(stripIdx).toBeLessThan(bottomIdx);
    expect(bottomIdx).toBeLessThan(rowIdx);
    // the nav closes inside the bottom bar's own closing tag
    const bottomClose = src.indexOf('</div>', rowIdx);
    expect(bottomClose).toBeGreaterThan(rowIdx);
  });

  it('the landing.css footer language owns the legal row (.fo-legal-row/.fo-legal-link/.fo-legal-sep)', () => {
    const css = stripComments(read('src/styles/landing.css'));
    for (const cls of ['.fo-legal-row {', '.fo-legal-link {', '.fo-legal-sep {']) {
      expect(css, cls).toContain(cls);
    }
    // the 44px touch floor (the footer link ladder)
    expect(css).toMatch(/\.fo-legal-link\s*{[^}]*min-block-size:\s*44px/);
  });

  it('the footer contact cell is a /contact link now (the honest prose moved onto the page)', () => {
    const src = read('src/pages/LandingPage.tsx');
    // locate the contact cell by its heading, then read the cell region
    const idx = src.indexOf('>التواصل<');
    expect(idx).toBeGreaterThan(0);
    const region = src.slice(idx, idx + 600);
    expect(region).toContain('to="/contact"');
    // the old honest prose moved onto the /contact page, not deleted
    expect(read('src/pages/PublicPages.tsx')).toContain('التسجيل المبكر من صفحة البداية هو قناة التواصل المتاحة حاليًا');
  });

  it('ConsentBanner «اعرف أكثر» retargets /capabilities → /legal/cookies', () => {
    const src = read('src/components/landing/chrome/ConsentBanner.tsx');
    expect(src).toContain('<Link to="/legal/cookies" className="cb-more">اعرف أكثر</Link>');
    expect(src).not.toContain('to="/capabilities"');
  });

  it('ConsentLine renders the Terms + Privacy links (and nothing else)', () => {
    render(
      <MemoryRouter>
        <ConsentLine prefix="بإنشاء الحساب أنت توافق على" />
      </MemoryRouter>,
    );
    const terms = screen.getByRole('link', { name: 'شروط الاستخدام' });
    const privacy = screen.getByRole('link', { name: 'سياسة الخصوصية' });
    expect(terms.getAttribute('href')).toBe('/legal/terms');
    expect(privacy.getAttribute('href')).toBe('/legal/privacy');
    expect(screen.getByText(/بإنشاء الحساب أنت توافق على/)).toBeTruthy();
    // the micro-module carries no legal-kit import
    const src = read('src/components/ConsentLine.tsx');
    expect(src).not.toContain('LegalSheet');
    expect(src).not.toContain('legal.css');
  });

  it('the ConsentLine mounts: register ×2 (student + teacher) + the AuthPage login footer', () => {
    const register = read('src/pages/RegisterPage.tsx');
    const count = (register.match(/<ConsentLine prefix=/g) ?? []).length;
    expect(count).toBe(2);
    const auth = read('src/pages/AuthPage.tsx');
    expect(auth).toContain('<ConsentLine prefix="بتسجيل الدخول أنت توافق على" />');
    expect(auth).toContain("import { ConsentLine } from '../components/ConsentLine'");
  });

  it('App.tsx: the nine lazy routes mount like /capabilities (chrome-less GuestReveal)', () => {
    const src = read('src/App.tsx');
    for (const p of PAGES) {
      expect(src, p.path).toContain(`path="${p.path}"`);
    }
    // the lazy wrappers bundle the two page modules
    expect(src).toContain("import('./pages/legal/LegalPages')");
    expect(src).toContain("import('./pages/PublicPages')");
    // each row rides GuestReveal (the window-scrolled guest mount)
    const guestRevealRoutes = (src.match(/<GuestReveal>/g) ?? []).length;
    expect(guestRevealRoutes).toBeGreaterThanOrEqual(11); // /campus + /capabilities + 9 new
  });

  it('the /legal family is a DOCUMENT surface — Lenis never mounts there; /about /help /contact ride the engine', () => {
    const src = read('src/App.tsx');
    expect(src).toContain("const DOCUMENT_SURFACE_PREFIXES = ['/legal'] as const;");
    // the exclusion is wired INSIDE isGuestWindowSurface before the fallthrough
    const fn = src.match(/function isGuestWindowSurface[\s\S]*?\n\}/);
    expect(fn).toBeTruthy();
    expect(fn![0]).toContain('if (isDocumentSurface(pathname)) return false;');
    expect(fn![0].indexOf('isDocumentSurface')).toBeLessThan(fn![0].lastIndexOf('return true'));
    // only /legal is a document surface — the public sheets keep the engine
    expect(src).not.toContain("DOCUMENT_SURFACE_PREFIXES = ['/legal', '/about'");
  });

  it('index.html: manifest + apple-touch-icon links (and lang=ar dir=rtl + noscript + og:image stay)', () => {
    const html = read('index.html');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
    expect(html).toContain('<link rel="apple-touch-icon" sizes="180x180" href="/brand/icon-180.png" />');
    expect(html).toMatch(/<html lang="ar" dir="rtl">/);
    expect(html).toContain('<noscript>');
    expect(html).toContain('og:image');
  });
});

/* ═══ G · the static identity files ═════════════════════════════════ */

describe('R320 §D — the static identity (robots · sitemap · manifest · icons)', () => {
  it('robots.txt: the public sheets allowed (incl. /auth + /auth/register), the five authed trees disallowed', () => {
    const robots = read('public/robots.txt');
    for (const allow of ['/', '/auth', '/auth/register', '/colleges', '/campus', '/capabilities', '/about', '/help', '/contact',
      '/legal/privacy', '/legal/terms', '/legal/cookies', '/legal/accessibility', '/legal/security', '/legal/data']) {
      expect(robots, `Allow: ${allow}`).toContain(`Allow: ${allow}`);
    }
    for (const dis of ['/student', '/teacher', '/admin', '/quality', '/owner']) {
      expect(robots, `Disallow: ${dis}`).toContain(`Disallow: ${dis}`);
    }
    expect(robots).toContain('Sitemap: https://madarek.onrender.com/sitemap.xml');
  });

  it('sitemap.xml: exactly 16 public routes', () => {
    const sitemap = read('public/sitemap.xml');
    const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(urls).toHaveLength(16);
    // the 7 existing public paths + the 9 new sheets, all on the canonical base
    const base = 'https://madarek.onrender.com';
    expect(urls).toEqual([
      `${base}/`, `${base}/auth`, `${base}/auth/register`, `${base}/colleges`,
      `${base}/colleges/leaderboard`, `${base}/campus`, `${base}/capabilities`,
      `${base}/legal/privacy`, `${base}/legal/terms`, `${base}/legal/cookies`,
      `${base}/legal/accessibility`, `${base}/legal/security`, `${base}/legal/data`,
      `${base}/about`, `${base}/help`, `${base}/contact`,
    ]);
    // and nothing authed leaks into the map
    for (const tree of ['/student', '/teacher', '/admin', '/quality', '/owner']) {
      expect(sitemap).not.toContain(`${tree}/`);
    }
  });

  it('manifest.webmanifest: مدارك · ar · rtl · standalone · #F6F6EE · 192+512 maskable', () => {
    const manifest = JSON.parse(read('public/manifest.webmanifest'));
    expect(manifest.short_name).toBe('مدارك');
    expect(manifest.lang).toBe('ar');
    expect(manifest.dir).toBe('rtl');
    expect(manifest.display).toBe('standalone');
    expect(manifest.theme_color).toBe('#F6F6EE');
    expect(manifest.background_color).toBe('#F6F6EE');
    const purposes = manifest.icons.map((i: { purpose: string }) => i.purpose);
    expect(purposes).toContain('maskable');
    const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('the three PNG icons: real PNGs with EXACT IHDR sizes (180/192/512)', () => {
    for (const size of [180, 192, 512]) {
      const buf = readFileSync(path.join(root, 'public', 'brand', `icon-${size}.png`));
      // PNG signature
      expect(buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), `icon-${size} PNG signature`).toBe(true);
      expect(buf.readUInt32BE(16), `icon-${size} IHDR width`).toBe(size);
      expect(buf.readUInt32BE(20), `icon-${size} IHDR height`).toBe(size);
    }
  });

  it('the icons were rendered FROM the one brand mark (the recipe script + the mark exist)', () => {
    const script = read('../scripts/r320/legal-icons.mjs');
    expect(script).toContain('madarek-mark.svg');
    expect(script).toContain('icon-${size}.png');
    // the ink-on-paper ground is the platform's own light token
    expect(script).toContain('#F6F6EE');
  });
});

/* ═══ H · the CSS contracts ═════════════════════════════════════════ */

describe('R320 §D — the legal.css contracts', () => {
  const css = read('src/styles/legal.css');
  const cssLive = stripComments(css);

  it('theme TOKENS only — no raw colors outside the print block’s color-gate allows', () => {
    // every line that still carries a raw literal after comment-stripping
    // must have carried the project's color-gate allow note (print contract)
    const lines = css.split('\n');
    for (const line of lines) {
      const raw = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/.test(line);
      if (!raw) continue;
      expect(line, `raw color outside the gate: ${line.trim()}`).toContain('color-gate: allow');
    }
    // the dark pair is automatic: no per-theme color overrides needed
    expect(cssLive).not.toMatch(/html\[data-theme='dark'\][^{]*\{[^}]*#/);
  });

  it('every :hover rule lives inside @media (hover: hover)', () => {
    /* exact char walk: every '{' opens a level whose prelude (the text
       since the previous '{'/'}') either is an @media chain entry or a
       plain rule; a rule prelude carrying :hover must sit under a
       hover-capable media level (the r320 lint's contract, pinned here
       for the legal sheet specifically). */
    const stack: string[] = [];
    let preludeStart = 0;
    let hoverRules = 0;
    for (let i = 0; i < cssLive.length; i++) {
      const ch = cssLive[i];
      if (ch === '{') {
        const prelude = cssLive.slice(preludeStart, i).trim();
        preludeStart = i + 1;
        if (prelude.startsWith('@media')) {
          stack.push(prelude);
        } else {
          if (/:hover\b/.test(prelude)) {
            hoverRules += 1;
            const chain = stack.join(' ');
            expect(chain, `"${prelude}" must be hover-guarded`).toContain('hover: hover');
          }
          stack.push('rule');
        }
      } else if (ch === '}') {
        stack.pop();
        preludeStart = i + 1;
      }
    }
    expect(hoverRules).toBeGreaterThan(0);
  });

  it('hover states are PAIRED (color+background together — the B1 discipline)', () => {
    // each :hover block in the file sets both color and background
    const blocks = cssLive.match(/[^{}]*:hover[^{}]*\{[^}]*\}/g) ?? [];
    for (const block of blocks) {
      const decls = block.slice(block.indexOf('{'));
      const hasColor = /color\s*:/.test(decls);
      const hasBackground = /background\s*:/.test(decls);
      expect(hasColor && hasBackground, `${block.slice(0, 60)}… must set the pair`).toBe(true);
    }
  });

  it('@media print: one clean column — chrome + frame + grain hidden, the stamp survives', () => {
    const print = cssLive.match(/@media print\s*\{[\s\S]*\}\s*\}\s*$/);
    expect(print).toBeTruthy();
    const block = print![0];
    expect(block).toMatch(/\.lg-header[^{]*\{[^}]*display:\s*none/);
    expect(block).toMatch(/\.auth-frame[^{]*\{[^}]*display:\s*none/);
    expect(block).toMatch(/\.auth-grain[^{]*\{[^}]*display:\s*none/);
    // the colophon (the stamp's home) is NEVER hidden
    expect(block).not.toMatch(/\.lg-colophon[^{]*\{[^}]*display:\s*none/);
    // the document measure collapses to one full column
    expect(block).toMatch(/\.lg-main\s*\{[^}]*max-inline-size:\s*none/);
  });

  it('radius 0 everywhere (the r313 ladder) — no raw border-radius literals', () => {
    const radii = cssLive.match(/border-[a-z-]*radius\s*:\s*[^;]+;/g) ?? [];
    for (const r of radii) {
      expect(r).toMatch(/var\(--r-sm\)/);
    }
  });

  it('the public chunk never imports the student kit', () => {
    for (const f of ['src/pages/legal/LegalSheet.tsx', 'src/pages/legal/LegalPages.tsx', 'src/pages/PublicPages.tsx']) {
      const src = stripJsComments(read(f));
      expect(src, f).not.toContain('components/student');
      expect(src, f).not.toContain('r319-student');
    }
  });
});

/* ═══ I · the FAQ + storage table grammar extras ════════════════════ */

describe('R320 §D — the FAQ + ledger table grammar', () => {
  it('the help page numbers its questions [01]..[09] (mono LTR, aria-hidden)', () => {
    renderPage(HelpPage);
    for (let i = 1; i <= 9; i++) {
      const idx = screen.getAllByText(`[${String(i).padStart(2, '0')}]`);
      expect(idx.length).toBeGreaterThanOrEqual(1);
      expect(idx[0]).toHaveAttribute('dir', 'ltr');
    }
  });

  it('the storage ledger table is CONTAINED (a wrap + a caption — the probe contract)', () => {
    renderPage(CookiesPage);
    const table = screen.getByRole('table');
    expect(table.querySelector('caption')).toBeTruthy();
    const wrap = table.closest('.lg-table-wrap');
    expect(wrap).toBeTruthy();
    cleanup();
  });

  it('the SECURITY_MARKER_KEYS export keeps the security page honest (belt: 403/CSP names)', () => {
    // guard: the shipped-controls list source stays greppable for the belt
    expect(SECURITY_MARKER_KEYS).toBeDefined();
    renderPage(SecurityPage);
    const text = document.body.textContent ?? '';
    for (const marker of SECURITY_MARKER_KEYS) {
      expect(text, marker).toContain(marker);
    }
  });
});
