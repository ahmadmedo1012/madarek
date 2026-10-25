/**
 * ios-contracts.ts — the shared, ENGINE-AGNOSTIC iOS verification
 * contracts for the r319-c2-g3 iPhone suite (§C6 / §H-3).
 *
 * Everything here runs identically on BOTH engines:
 *
 *   • `webkit-iphone`   — real WebKit, iPhone 13 device context
 *                         (GitHub CI: job `ios-webkit`)
 *   • `chromium-iphone` — Chromium with the SAME iPhone 13 device
 *                         context (local truth in the dev sandbox)
 *
 * Engine notes baked into the helpers:
 *
 *   - Contexts are built by hand (`browser.newContext` + the iPhone 13
 *     device descriptor) — never via the project's automatic context —
 *     so the two engines share ONE code path. The hermetic substrate is
 *     engine-agnostic by construction: the mock transport rides
 *     `context.route` (page-level interception) and the auth/theme state
 *     rides `context.addInitScript` (localStorage seeding before any app
 *     script). There is no CDP in the shared path.
 *   - The ONE engine branch: Chromium's device descriptors do NOT
 *     emulate the (hover: none)/(pointer: coarse) media features the
 *     B1 wash guard keys on, so the Chromium context gets them via a
 *     CDP `Emulation.setEmulatedMedia` call. WebKit derives them from
 *     the touch device itself (real iPhone-class behavior) — CDP does
 *     not exist there and is not needed.
 *   - Contract reads are computed styles, bounding boxes, CSSOM rule
 *     text (document.styleSheets — Vite serves styles same-origin, so
 *     `cssRules` is readable on both engines) and in-page WCAG
 *     luminance math. No visual pinning: cross-engine font hinting
 *     makes pixel pins lie; geometry + contract assertions do not.
 *
 * Consumers: tests/e2e/r319-ios-contracts.ios.e2e.ts (the only spec —
 * matched by the two `*-iphone` Playwright projects). Not collected by
 * vitest (no *.test|spec suffix) and not a Playwright spec itself.
 */
import { devices, expect } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

import { FIXED_NOW_ISO, STUDENT_USER } from '../e2e/fixtures/api-fixtures';
import { installMockApi, seedSession } from '../e2e/fixtures/mock-transport';

/** The only Playwright projects allowed to run the iOS suite. */
export const IPHONE_PROJECTS: ReadonlySet<string> = new Set(['webkit-iphone', 'chromium-iphone']);

/** The owner's exact ghost row («مقرّراتي الدراسية») from the B1 screenshot. */
export const GHOST_ROW_TEXT = 'مقرّراتي الدراسية';

/** The theme's own paper ground (tokens.css --bg) — the only ground the sheet may paint. */
export const PAPER: Record<'light' | 'dark', string> = {
  light: 'rgb(246, 246, 238)',
  dark: 'rgb(40, 40, 40)',
};

/** Runtime artifacts (gitignored) — plain screenshots, never pinned. */
export const IOS_SHOTS_DIR = path.resolve(
  process.cwd(),
  'tests',
  'e2e',
  '__screenshots__',
  'r319-ios',
);
/** Committed evidence (the board's "owner screenshots, re-shot" mandate). */
export const IOS_EVIDENCE_DIR = path.resolve(
  process.cwd(),
  '..',
  'audits',
  'evidence',
  'r319',
  'ios',
);

const BASE_URL = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

/* ─── the iPhone context ─────────────────────────────────────────── */

export interface IphoneSuite {
  context: BrowserContext;
  page: Page;
}

/**
 * A fresh iPhone-13 context per test (own storage), seeded STUDENT with
 * the requested persisted theme, hermetic mock transport installed, wall
 * clock frozen — the same substrate tests/e2e/fixtures/e2e.ts builds,
 * re-assembled at the context level because the device descriptor
 * (isMobile/hasTouch) must travel with the context on BOTH engines.
 */
export async function createIphoneContext(
  browser: Browser,
  theme: 'light' | 'dark',
): Promise<IphoneSuite> {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    baseURL: BASE_URL,
    locale: 'ar-LY',
    timezoneId: 'UTC',
  });
  // Skip the entrance loader + stub the core count up — the shared
  // fixture's init script, same reasons (deterministic task-focused
  // boot; CI hosts can be 2-core).
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('madarek-intro-skip', '1');
      try {
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
          configurable: true,
          get: () => 8,
        });
      } catch {
        /* non-configurable engine — the env guard degrades to the host's truth */
      }
    } catch {
      /* storage denied — the page stands complete anyway */
    }
  });
  await seedSession(context, STUDENT_USER, { theme });
  await installMockApi(context, { sessionUser: STUDENT_USER });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW_ISO);

  // THE engine branch (the only one): Chromium device descriptors do
  // not emulate hover/pointer media, and the B1 wash guard keys on
  // (hover: hover) and (pointer: fine). The owner's device matches
  // (hover: none)/(pointer: coarse). WebKit reports those natively for
  // a touch device — no CDP exists there.
  if (browser.browserType().name() === 'chromium') {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'hover', value: 'none' },
        { name: 'pointer', value: 'coarse' },
      ],
    });
  }
  return { context, page };
}

export async function openStudentDashboard(page: Page): Promise<void> {
  await page.goto('/student/dashboard');
  await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20_000 });
}

export async function openDrawer(page: Page): Promise<void> {
  await page.click('.topbar-mobile-toggle');
  await expect(page.locator('nav.sidebar.open')).toBeVisible();
  // the slide-in spring settles before geometry reads
  await page.waitForTimeout(600);
}

export async function closeDrawer(page: Page): Promise<void> {
  await page.tap('.sidebar-mobile-close');
  await expect(page.locator('nav.sidebar.open')).toBeHidden();
  // the slide-out spring settles before geometry reads
  await page.waitForTimeout(600);
}

/* ─── in-page WCAG contrast math (computed values) ───────────────── */

/** WCAG 2.x contrast ratio of two css color strings, computed in-page. */
export async function contrastRatio(page: Page, fg: string, bg: string): Promise<number> {
  return page.evaluate(
    (pair) => {
      const parse = (s: string) => {
        const m = /rgba?\(([^)]+)\)/.exec(s);
        if (!m) return null;
        const p = m[1]!.split(',').map((x) => parseFloat(x));
        return { r: p[0]!, g: p[1]!, b: p[2]! };
      };
      const lum = (c: { r: number; g: number; b: number }) => {
        const n = [c.r, c.g, c.b].map((v) => {
          const cs = v / 255;
          return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * n[0]! + 0.7152 * n[1]! + 0.0722 * n[2]!;
      };
      const f = parse(pair.fg);
      const b = parse(pair.bg);
      if (!f || !b) return -1;
      const l1 = lum(f);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    },
    { fg, bg },
  );
}

export interface IosRowContract {
  text: string;
  on: boolean;
  fg: string;
  bg: string;
  ratio: number;
}

/** Every drawer row's label, effective ground and contrast ratio in one read. */
export async function drawerRowContracts(page: Page): Promise<IosRowContract[]> {
  return page.evaluate(() => {
    const parse = (s: string) => {
      const m = /rgba?\(([^)]+)\)/.exec(s);
      if (!m) return null;
      const p = m[1]!.split(',').map((x) => parseFloat(x));
      return { r: p[0]!, g: p[1]!, b: p[2]! };
    };
    const lum = (c: { r: number; g: number; b: number }) => {
      const n = [c.r, c.g, c.b].map((v) => {
        const cs = v / 255;
        return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * n[0]! + 0.7152 * n[1]! + 0.0722 * n[2]!;
    };
    const ratio = (fg: string, bg: string) => {
      const f = parse(fg);
      const b = parse(bg);
      if (!f || !b) return -1;
      const l1 = lum(f);
      const l2 = lum(b);
      return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    };
    const drawerBg = getComputedStyle(document.querySelector('nav.sidebar')!).backgroundColor;
    return [...document.querySelectorAll('.sidebar .nav-item')].map((el) => {
      const cs = getComputedStyle(el);
      const label = el.querySelector('.nav-label');
      const fg = getComputedStyle((label ?? el) as Element).color;
      const own = cs.backgroundColor;
      const painted = own !== 'rgba(0, 0, 0, 0)';
      const bg = painted ? own : drawerBg;
      return {
        text: (label?.textContent ?? '').trim(),
        on: el.classList.contains('on'),
        fg,
        bg,
        ratio: ratio(fg, bg),
      };
    });
  });
}

/** One row's paint pair (own background + label color + the drawer ground). */
export async function navRowPair(
  page: Page,
  text: string,
): Promise<{ bg: string; fg: string; drawerBg: string }> {
  return page.evaluate(
    (needle) => {
      const el = [...document.querySelectorAll('.sidebar .nav-item')].find((n) =>
        n.textContent?.includes(needle),
      )!;
      const label = el.querySelector('.nav-label')!;
      return {
        bg: getComputedStyle(el).backgroundColor,
        fg: getComputedStyle(label).color,
        drawerBg: getComputedStyle(document.querySelector('nav.sidebar')!).backgroundColor,
      };
    },
    text,
  );
}

/** The engine's own hover/pointer media truth (annotated per test). */
export async function touchMedia(page: Page): Promise<{ hoverNone: boolean; coarse: boolean }> {
  return page.evaluate(() => ({
    hoverNone: matchMedia('(hover: none)').matches,
    coarse: matchMedia('(pointer: coarse)').matches,
  }));
}

/* ─── shell geometry ─────────────────────────────────────────────── */

export interface BarMetrics {
  bg: string;
  alpha: number;
  height: number;
  y: number;
  contentPadBottom: number;
}

/** The bottom dock's computed paint + geometry, and the content reserve. */
export async function bottomBarMetrics(page: Page): Promise<BarMetrics> {
  return page.evaluate(() => {
    const bar = document.querySelector('.bottom-nav')!;
    const inner = document.querySelector('.content-inner');
    const cs = getComputedStyle(bar);
    const bg = cs.backgroundColor;
    const m = /rgba?\(([^)]+)\)/.exec(bg);
    const parts = m ? m[1]!.split(',').map((x) => parseFloat(x)) : [];
    const rect = bar.getBoundingClientRect();
    return {
      bg,
      alpha: parts.length > 3 ? parts[3]! : 1,
      height: rect.height,
      y: rect.y,
      contentPadBottom: inner ? parseFloat(getComputedStyle(inner).paddingBottom) : 0,
    };
  });
}

export interface DrawerScrollerContracts {
  overflowY: string;
  overscroll: string;
  scrollH: number;
  clientH: number;
  groupCount: number;
  lastLabel: string;
  lastLabelBottom: number;
  scrollerBottom: number;
  lastLabelInside: boolean;
}

/**
 * The drawer list's reachability contract: the scroller must be a real
 * scroller (overflow auto, overscroll contained) that contains every
 * group, and the LAST group label must sit fully inside it after
 * scrollIntoView (the «المصفوفة التعليمية» clip is dead).
 */
export async function drawerScrollerContracts(page: Page): Promise<DrawerScrollerContracts> {
  return page.evaluate(() => {
    const nav = document.querySelector('.sidebar-nav')!;
    const cs = getComputedStyle(nav);
    const groups = document.querySelectorAll('.sidebar .nav-group');
    const labels = document.querySelectorAll('.sidebar .nav-section-label');
    const last = labels[labels.length - 1]!;
    last.scrollIntoView({ block: 'end' });
    const nr = nav.getBoundingClientRect();
    const lr = last.getBoundingClientRect();
    return {
      overflowY: cs.overflowY,
      overscroll: cs.getPropertyValue('overscroll-behavior'),
      scrollH: nav.scrollHeight,
      clientH: nav.clientHeight,
      groupCount: groups.length,
      lastLabel: (last.textContent ?? '').trim(),
      lastLabelBottom: lr.bottom,
      scrollerBottom: nr.bottom,
      lastLabelInside: lr.bottom <= nr.bottom + 0.5 && lr.top >= nr.top - 0.5,
    };
  });
}

/* ─── stylesheet (CSSOM) scans — engine-agnostic contract reads ──── */

export interface IosDecl {
  p: string;
  v: string;
}

export interface IosCssRule {
  selector: string;
  media: string;
  /** The rule's full specified cssText — the search substrate that
   *  ALWAYS carries shorthands verbatim (CSSOM item iteration hides
   *  var()/env()-pending shorthands and empties their longhands on
   *  Chromium; cssText keeps `padding: … env(safe-area-inset-bottom)`
   *  intact on every engine). */
  text: string;
  decls: IosDecl[];
}

export interface IosCssScan {
  sheetCount: number;
  ruleCount: number;
  drawerRules: IosCssRule[];
  barRules: IosCssRule[];
  tapHighlightRuleCount: number;
}

/**
 * Walks document.styleSheets (recursing through @media / @layer /
 * @supports / @container grouping rules) and returns every style rule
 * whose selector carries the standalone `.sidebar` / `.bottom-nav`
 * class tokens, plus a count of rules that set
 * `-webkit-tap-highlight-color`. Specified values are read via CSSOM —
 * `env()` stays literal there (it only resolves at computed-value time),
 * which is exactly why the safe-area contract reads the RULE, not the
 * computed padding (emulation resolves env() to 0).
 */
export async function scanIosCss(page: Page): Promise<IosCssScan> {
  return page.evaluate(
    (classes) => {
      const drawerRules: { selector: string; media: string; text: string; decls: { p: string; v: string }[] }[] =
        [];
      const barRules: { selector: string; media: string; text: string; decls: { p: string; v: string }[] }[] = [];
      const out = {
        sheetCount: 0,
        ruleCount: 0,
        drawerRules,
        barRules,
        tapHighlightRuleCount: 0,
      };
      // `.sidebar` must be a standalone class token — `.sidebar-nav`
      // and `.sidebar-brand` must NOT match (hyphen lookahead).
      const selHasClass = (selector: string, cls: string) =>
        selector
          .split(',')
          .some((part) => part.trim().match(new RegExp(cls.replace('.', '\\.') + '(?![\\w-])')));
      const collect = (ruleList: CSSRuleList | null, media: string): void => {
        if (!ruleList) return;
        for (let i = 0; i < ruleList.length; i++) {
          const r = ruleList.item(i) as unknown as {
            selectorText?: string;
            style?: CSSStyleDeclaration;
            cssRules?: CSSRuleList | null;
            conditionText?: string;
          } | null;
          if (!r) continue;
          if (typeof r.selectorText === 'string' && r.style) {
            out.ruleCount += 1;
            const decls: { p: string; v: string }[] = [];
            const style = r.style;
            for (let j = 0; j < style.length; j++) {
              const p = style.item(j);
              if (p) decls.push({ p, v: style.getPropertyValue(p) });
            }
            if (decls.some((d) => d.p === '-webkit-tap-highlight-color')) {
              out.tapHighlightRuleCount += 1;
            }
            if (selHasClass(r.selectorText, classes.drawer)) {
              out.drawerRules.push({ selector: r.selectorText, media, text: r.style.cssText, decls });
            }
            if (selHasClass(r.selectorText, classes.bar)) {
              out.barRules.push({ selector: r.selectorText, media, text: r.style.cssText, decls });
            }
          }
          // grouping rules (@media, @layer, @supports, @container — and
          // nested style rules where an engine keeps them)
          if (r.cssRules) {
            collect(r.cssRules, media + ' ' + (r.conditionText ?? ''));
          }
        }
      };
      for (let s = 0; s < document.styleSheets.length; s++) {
        const sheet = document.styleSheets.item(s)!;
        out.sheetCount += 1;
        try {
          collect(sheet.cssRules, '');
        } catch {
          /* foreign-origin sheet — cssRules unreadable; skipped on both engines */
        }
      }
      return out;
    },
    { drawer: '.sidebar', bar: '.bottom-nav' },
  );
}

/** Unit tokens attached to numbers in a css value ('100dvh' → 'dvh'). */
export function unitTokens(value: string): string[] {
  return [...value.matchAll(/[-\d.]+([a-z%]+)/gi)].map((m) => m[1]!.toLowerCase());
}

/* ─── the Safari zoom-on-focus guard (inputs ≥ 16px) ─────────────── */

export interface IosFieldContract {
  tag: string;
  placeholder: string;
  fontSizePx: number;
  visible: boolean;
}

/** Every form field on the page with its computed font size. */
export async function fieldContracts(page: Page): Promise<IosFieldContract[]> {
  return page.evaluate(() => {
    return [...document.querySelectorAll('input, select, textarea')].map((el) => {
      const cs = getComputedStyle(el);
      const input = el as HTMLInputElement;
      return {
        tag: el.tagName.toLowerCase(),
        placeholder: typeof input.placeholder === 'string' ? input.placeholder : '',
        fontSizePx: parseFloat(cs.fontSize) || 0,
        visible: el.getClientRects().length > 0,
      };
    });
  });
}

/** Saves a viewport screenshot to BOTH artifact roots (shots + evidence). */
export async function shootIos(page: Page, name: string): Promise<void> {
  fs.mkdirSync(IOS_SHOTS_DIR, { recursive: true });
  const shot = path.join(IOS_SHOTS_DIR, name);
  await page.screenshot({ path: shot, fullPage: false });
  fs.mkdirSync(IOS_EVIDENCE_DIR, { recursive: true });
  fs.copyFileSync(shot, path.join(IOS_EVIDENCE_DIR, name));
}
