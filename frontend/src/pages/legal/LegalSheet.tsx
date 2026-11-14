import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Icon } from '../../components/Icon';
import { Logo } from '../../brand';
import { useThemeSync } from '../../components/layout/ThemeToggle';
import { GuestSheetChrome } from '../../components/layout/GuestSheetChrome';
import { usePageTitle } from '../../hooks/usePageTitle';
// R341 D5 — the sheet rebuilt on the PATTERN LIBRARY (the r340 T-D1a
// recipe proved on /auth, the D2 about precedent): pf-page carries the
// reading measure, pf-page-header/pf-eyebrow the title block,
// pf-page-actions the CTA pair; legal.css keeps only what the library
// does not own — the sticky guest header, the [nn] section bars, the
// hairline cells, the ledger table, the FAQ cells, the colophon — all
// still in the lg-* names /help · /contact · /app seat from THIS
// module's exports (their D-tasks re-key them). The public chunk never
// imports the student kit (components/student).
import '../../styles/legal.css';

/** The canonical public URL every page's canonical/OG:url derives from
 * (index.html:33 — the one absolute base the site declares). */
const CANONICAL_BASE = 'https://madarek-nine.vercel.app';

/* ═══ useLegalMeta — per-page head metadata ══════════════════════════
 *
 * The guest document sheets own their head tags the way the auth pages
 * own their tab title (usePageTitle): on mount, the page's description
 * lands on <meta name="description">, its path on the canonical link
 * and og:url, its title on og:title and the tab — and EVERY previous
 * value is restored on unmount, so route changes chain cleanly exactly
 * like the title does (the landing's platform description must come
 * back when a visitor leaves a policy sheet). SSR/jsdom-safe: every
 * access is guarded. */

function setMeta(selector: string, attr: string, value: string): string | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const previous = el.getAttribute(attr);
  el.setAttribute(attr, value);
  return previous;
}

export function useLegalMeta(opts: {
  /** The page's Arabic title (the tab context, usePageTitle's contract). */
  title: string;
  /** The page's own path — canonical + og:url derive the absolute URL. */
  path: string;
  /** The honest one-line description (its own words, never the landing's). */
  description: string;
}): void {
  const { title, path, description } = opts;
  usePageTitle(title);
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const canonical = `${CANONICAL_BASE}${path}`;
    const prevDescription = setMeta('meta[name="description"]', 'content', description);
    const prevCanonical = setMeta('link[rel="canonical"]', 'href', canonical);
    const prevOgTitle = setMeta('meta[property="og:title"]', 'content', title);
    const prevOgUrl = setMeta('meta[property="og:url"]', 'content', canonical);
    return () => {
      if (typeof document === 'undefined') return;
      if (prevDescription !== null) {
        setMeta('meta[name="description"]', 'content', prevDescription);
      }
      if (prevCanonical !== null) {
        setMeta('link[rel="canonical"]', 'href', prevCanonical);
      }
      if (prevOgTitle !== null) {
        setMeta('meta[property="og:title"]', 'content', prevOgTitle);
      }
      if (prevOgUrl !== null) {
        setMeta('meta[property="og:url"]', 'content', prevOgUrl);
      }
    };
  }, [title, path, description]);
}

/* ═══ The shell ══════════════════════════════════════════════════════ */

/**
 * LegalSheet — the R320 §D public document shell (R341 D5 rebuild):
 * the /capabilities chrome-less guest grammar (GuestSheetChrome frame
 * + grain, sticky guest header with the back-to-home funnel + the
 * brand mark) wrapped around a POLICY DOCUMENT on the pattern library
 * — pf-page[data-width=reading] carries the measure, pf-page-header /
 * pf-eyebrow / pf-page-desc the title block, pf-page-actions the CTA
 * pair (the escalation channel + the way home) — then the numbered
 * section bars, hairline cells, and the honest colophon with the آخر
 * تحديث stamp. Everything the nine public pages share; the page
 * components own only their words.
 */
export function LegalSheet({
  title,
  lede,
  updated,
  children,
}: {
  /** The page's ONE h1 (Arabic, no tashkeel). */
  title: ReactNode;
  /** The one-paragraph lede under the h1. */
  lede: ReactNode;
  /** The آخر تحديث date (LEGAL_UPDATED — one stamp for the whole suite). */
  updated: string;
  children: ReactNode;
}) {
  useThemeSync();

  return (
    <div className="lg">
      <a href="#main" className="skip-link">تخطَّ إلى المحتوى</a>
      <GuestSheetChrome />

      <header className="lg-header">
        <div className="lg-header-inner">
          <Link to="/" className="btn ghost sm">
            <Icon icon={ArrowRight} size={14} />
            العودة إلى الصفحة الرئيسية
          </Link>
          <Link to="/" className="lg-header-brand" aria-label="مدارك — الصفحة الرئيسية">
            <Logo variant="mark" size={22} />
            مدارك
          </Link>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="lg-main">
        <div className="pf-page" data-width="reading">
          <div className="pf-page-header">
            <div className="pf-page-header-text">
              <p className="pf-eyebrow">وثيقة سياسة</p>
              <h1 className="pf-page-title">{title}</h1>
              <p className="pf-page-desc">{lede}</p>
            </div>
            <div className="pf-page-actions">
              <Link to="/contact" className="lg-cta-primary">قناة التواصل</Link>
              <Link to="/" className="lg-cta-ghost">الصفحة الرئيسية</Link>
            </div>
          </div>

          {children}

          <footer className="lg-colophon">
            <p className="lg-colophon-line">منصّة مستقلّة · عربية أولًا · بيانات العرض اصطناعية بالكامل</p>
            <p className="lg-colophon-stamp">
              آخر تحديث: <span className="lg-mono" dir="ltr">{updated}</span>
            </p>
          </footer>
        </div>
      </main>
    </div>
  );
}

/**
 * LegalSectionBar — the policy sheet's numbered heading on the pattern
 * library's section seat (pf-section-header): a strong opening hairline
 * + the mono `[nn]` index (LTR, decorative — the Arabic title carries
 * the meaning) + the section title. The §B2 student SectionBar's
 * register in the PUBLIC sheet's own classes — the public chunk must
 * never import the student kit.
 */
export function LegalSectionBar({
  index,
  title,
  id,
}: {
  /** 1-based — rendered zero-padded [01], [02]… */
  index: number;
  title: string;
  /** Optional anchor id (aria-labelledby wiring). */
  id?: string;
}) {
  return (
    <div className="pf-section-header">
      <h2 className="lg-bar" id={id}>
        <span className="lg-bar-index lg-mono" dir="ltr" aria-hidden="true">
          [{String(index).padStart(2, '0')}]
        </span>
        <span className="lg-bar-title">{title}</span>
      </h2>
    </div>
  );
}

/**
 * LegalCell — one hairline-ruled block: the document's basic container
 * (radius 0, 1px rule, no shadow — the r313 ladder). Sections compose
 * their paragraphs, lists and tables inside cells.
 */
export function LegalCell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className ? `lg-cell ${className}` : 'lg-cell'}>
      {children}
    </div>
  );
}

/**
 * PendingTag — the honest `[يُستكمل قبل الإطلاق]` marker: every legal
 * fact the owner hasn't decided yet is VISIBLE but tasteful (mono,
 * muted ink, never hidden and never guessed) and mirrored as a row in
 * docs/redesign/r320/LEGAL-TODO.md — the audit trail the pages and the
 * TODO file can never drift apart (LEGAL-TODO §3 rules 1 + 5).
 */
export function PendingTag() {
  return <span className="lg-pending">[يُستكمل قبل الإطلاق]</span>;
}

/**
 * CodeRun — a Latin/technical run inside Arabic prose (storage keys,
 * cookie names, routes, TTL values): dir=ltr mono, wrapped in <bdi> so
 * the surrounding sentence's bidi flow is never punctured (the R319
 * mono-run contract).
 */
export function CodeRun({ children }: { children: string }) {
  return (
    <bdi className="lg-code lg-mono" dir="ltr">
      {children}
    </bdi>
  );
}
