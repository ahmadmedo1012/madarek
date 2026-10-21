/**
 * qa-checks — shared deterministic assertion helpers for the r305 QA
 * specs (Task 4). Pure Playwright + in-page evaluation; no app-source
 * coupling beyond DOM contracts the specs already pin.
 */
import type { Page, Response } from '@playwright/test';
import { expect } from './qa';

/* ── horizontal overflow (RTL) ─────────────────────────────────── */

/**
 * The QA overflow verdict for one page state. Both counters matter:
 *   - document.scrollingElement — the guest surfaces (auth/404/colleges
 *     chrome) scroll the body;
 *   - `.content` — the app shell's ONLY scroll container (body never
 *     scrolls inside the shell), so its scrollWidth is the honest
 *     overflow signal there.
 * Landmark boxes guard the "nothing pokes past the viewport's right
 * edge in RTL" contract at the element level.
 */
export interface OverflowReport {
  docScrollWidth: number;
  docClientWidth: number;
  contentScrollWidth: number | null;
  contentClientWidth: number | null;
  /** Selector → element right edge (px) / viewport innerWidth. */
  landmarks: Array<{ selector: string; right: number; visible: boolean }>;
  /** Viewport innerWidth at probe time. */
  innerWidth: number;
}

export async function readOverflowReport(page: Page, landmarkSelectors: string[]): Promise<OverflowReport> {
  return page.evaluate((selectors) => {
    const scrolling = document.scrollingElement;
    const content = document.querySelector<HTMLElement>('.content');
    const innerWidth = window.innerWidth;
    const landmarks = selectors.map((selector) => {
      const el = document.querySelector<HTMLElement>(selector);
      if (!el) return { selector, right: Number.NaN, visible: false };
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0;
      return { selector, right: rect.right, visible };
    });
    return {
      docScrollWidth: scrolling ? scrolling.scrollWidth : -1,
      docClientWidth: scrolling ? scrolling.clientWidth : -1,
      contentScrollWidth: content ? content.scrollWidth : null,
      contentClientWidth: content ? content.clientWidth : null,
      landmarks,
      innerWidth,
    };
  }, landmarkSelectors);
}

/**
 * Zero-horizontal-overflow assertion for one page state:
 *   - scrollingElement.scrollWidth <= innerWidth (body-level);
 *   - `.content` scrollWidth <= clientWidth when the shell is mounted;
 *   - every VISIBLE landmark's right edge stays within the viewport
 *     (RTL: the right edge is the physical leading edge) — a 1px
 *     tolerance absorbs sub-pixel rounding, never real overflow.
 * Hidden landmarks (display:none) are skipped, not counted.
 */
export async function expectNoHorizontalOverflow(page: Page, landmarkSelectors: string[]): Promise<void> {
  const report = await readOverflowReport(page, landmarkSelectors);
  const innerWidth = report.innerWidth;
  expect(
    report.docScrollWidth,
    `document.scrollingElement.scrollWidth (${report.docScrollWidth}) must not exceed innerWidth (${innerWidth})`,
  ).toBeLessThanOrEqual(innerWidth);
  if (report.contentScrollWidth !== null && report.contentClientWidth !== null) {
    expect(
      report.contentScrollWidth,
      `shell .content scrollWidth (${report.contentScrollWidth}) must not exceed its clientWidth (${report.contentClientWidth})`,
    ).toBeLessThanOrEqual(report.contentClientWidth);
  }
  for (const lm of report.landmarks) {
    if (!lm.visible) continue;
    expect(
      lm.right,
      `landmark «${lm.selector}» right edge (${lm.right}px) must stay within the viewport (${innerWidth}px) in RTL`,
    ).toBeLessThanOrEqual(innerWidth + 1);
    expect(
      lm.right,
      `landmark «${lm.selector}» must not be parked entirely off-viewport (right edge ${lm.right}px)`,
    ).toBeGreaterThan(0);
  }
}

/* ── page health (JS errors + failed responses) ────────────────── */

/** An intentionally-fulfilled >=400 mock the route under test expects. */
export interface ExpectedFailure {
  /** Matching HTTP status (exact). */
  status: number;
  /** Substring the URL must include (e.g. '/auth/me'). */
  urlIncludes: string;
  /** Why this is expected (included in failure messages). */
  reason: string;
}

export interface PageHealthHandle {
  /** Uncaught page errors (pageerror events). */
  jsErrors: string[];
  /** Responses with status >= 400 (documents only what was seen). */
  badResponses: Array<{ status: number; url: string; method: string }>;
  /** Assert zero JS errors and zero unexpected >=400 responses. */
  assertClean: (expected?: ExpectedFailure[]) => Promise<void>;
}

/**
 * Attaches pageerror + response collectors to the page. Create BEFORE
 * page.goto so the cold-load window is covered; call assertClean()
 * after the page's content has settled.
 */
export function collectPageHealth(page: Page): PageHealthHandle {
  const jsErrors: string[] = [];
  const badResponses: Array<{ status: number; url: string; method: string }> = [];

  page.on('pageerror', (err) => {
    jsErrors.push(`${err.name}: ${err.message}`);
  });
  page.on('response', (res: Response) => {
    if (res.status() >= 400) {
      badResponses.push({ status: res.status(), url: res.url(), method: res.request().method() });
    }
  });

  return {
    jsErrors,
    badResponses,
    assertClean: async (expected: ExpectedFailure[] = []) => {
      expect(
        jsErrors,
        'the page must run with ZERO uncaught JS errors (pageerror events)',
      ).toEqual([]);
      const unexpected = badResponses.filter(
        (bad) => !expected.some((e) => bad.status === e.status && bad.url.includes(e.urlIncludes)),
      );
      expect(
        unexpected,
        `expected only intentionally-fulfilled failures (${expected.map((e) => `${e.status} ${e.urlIncludes} — ${e.reason}`).join('; ') || 'none'})`,
      ).toEqual([]);
    },
  };
}

/* ── image audit ───────────────────────────────────────────────── */

export interface ImageAuditRow {
  src: string;
  alt: string | null;
  hasAltAttribute: boolean;
  naturalWidth: number;
}

/**
 * Every <img> must carry an alt attribute — descriptive (non-empty)
 * or explicitly decorative (alt=""). A MISSING alt attribute is the
 * violation (screen readers fall back to reading the file name).
 * A content image with a non-empty alt that failed to load
 * (naturalWidth === 0) is also flagged (broken image).
 */
export async function expectImagesAudited(page: Page): Promise<void> {
  const rows = await page.evaluate<ImageAuditRow[]>(() =>
    Array.from(document.querySelectorAll('img')).map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.getAttribute('alt'),
      hasAltAttribute: img.hasAttribute('alt'),
      naturalWidth: img.naturalWidth,
    })),
  );
  for (const row of rows) {
    expect(
      row.hasAltAttribute,
      `image «${row.src}» must declare an alt attribute (descriptive text, or alt="" when purely decorative)`,
    ).toBe(true);
    if (row.alt !== null && row.alt.length > 0) {
      expect(
        row.naturalWidth,
        `content image «${row.src}» (alt="${row.alt}") loaded but has zero natural width — broken asset`,
      ).toBeGreaterThan(0);
    }
  }
}

/* ── misc deterministic helpers ────────────────────────────────── */

/**
 * The universal :focus-visible ring (motion.css): outline uses the
 * state-focus-ring tokens. Keyboard focus must produce a VISIBLE
 * outline (style solid, width > 0). Returns the computed triple.
 */
export async function readFocusRing(page: Page, selector: string): Promise<{ style: string; width: string; color: string }> {
  return page.evaluate((sel) => {
    const el = document.querySelector<HTMLElement>(sel);
    if (!el) throw new Error(`focus-ring probe: no element for ${sel}`);
    const cs = window.getComputedStyle(el);
    return { style: cs.outlineStyle, width: cs.outlineWidth, color: cs.outlineColor };
  }, selector);
}
