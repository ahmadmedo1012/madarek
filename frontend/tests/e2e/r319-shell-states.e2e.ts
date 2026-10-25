/**
 * r319-shell-states.e2e.ts — B1/B1b paired-state + shell grammar gate (c1-A).
 *
 * يثبّت إصلاح «الشبح الباهت» الذي رصده المالك على آيفون حقيقي:
 * نقرة على صفّ الدرج («مقرّراتي الدراسية») جعلت النص غير مرئي —
 * layout.css غسل الصف حبرًا كاملًا (خلفية فحمية + تسمية ورقية)، ثم
 * polish.css أعاد تعريف الخلفية وحدها (رمادي فاتح) — فتركّبت الحالتان
 * إلى تسمية ورقية على خلية رمادية ≈1.1:1، و`:hover` يلتصق بعد اللمسة.
 *
 * THE MATRIX: iPhone-13 context (390×844, isMobile, hasTouch) + CDP
 * hover:none/pointer:coarse emulation, STUDENT, light AND dark.
 *
 *  1. B1 — the wash guard: under (hover: none) a REAL :hover (mouse
 *     hover, and a TAP with sticky hover) must NOT paint any wash —
 *     the row keeps its at-rest pair; every .nav-item label computes
 *     ≥4.5:1 against its effective background in every probed state.
 *  2. B1b — the drawer IS the sheet: opaque paper, 100dvh, hairline
 *     rows (radius 0, ≥44px), mono [01] gutter indexes, aligned
 *     start gutters, plain-paper brand cell, ink scrim (58% light /
 *     92% paper dark), 44px square close, tour label visible, ALL
 *     groups reachable (the scroller contains them — «المصفوفة
 *     التعليمية» never clipped).
 *  3. B1b — the bottom dock: opaque paper (alpha 1), 1px structural
 *     top hairline, square cells + inter-cell hairlines, active =
 *     ink label + 2px accent TOP rule + filled ink icon (no pill),
 *     content padding reserves the dock height.
 *  4. B1b — the avatar: square ink cell (radius 0, mono initials,
 *     on-palette ground — the blue #3b82f6 the fixture user carries
 *     must NOT render).
 *
 * WHY A MANUAL CONTEXT: the shared fixture's context factory forwards
 * a fixed option set (viewport/locale/colorScheme/reducedMotion) and
 * cannot carry `hasTouch`/`isMobile`; this spec needs the device
 * descriptor + CDP media-feature emulation, so it reuses the fixture
 * CORPUS (seedSession + installMockApi + the fixed clock) at the
 * context level instead of the fixture's context wrapper. Same
 * hermetic transport, same seeded session — no backend, no network.
 */
import { test as base, expect, devices } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { FIXED_NOW_ISO, STUDENT_USER } from './fixtures/api-fixtures';
import { installMockApi, seedSession } from './fixtures/mock-transport';

const BASE_URL = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';
/* Evidence frames — the R319 board's owner-screenshot re-shoot mandate. */
const EVIDENCE_DIR = path.resolve(process.cwd(), '..', 'audits', 'evidence', 'r319-shell');
const THEMES = ['light', 'dark'] as const;
/* The theme's own paper ground (tokens.css --bg): light #F6F6EE, dark
 * #282828 — the ONLY grounds the sheet and the dock may paint. */
const PAPER: Record<(typeof THEMES)[number], string> = {
  light: 'rgb(246, 246, 238)',
  dark: 'rgb(40, 40, 40)',
};

/* ─── WCAG contrast math (real in-page functions, computed values) ─── */

async function contrast(page: Page, fg: string, bg: string): Promise<number> {
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

interface RowState {
  text: string;
  on: boolean;
  bg: string;
  fg: string;
  ratio: number;
}

/** The row's EFFECTIVE ground: its own bg if painted, else the drawer's. */
async function rowStates(page: Page): Promise<RowState[]> {
  const rows = await page.evaluate(() => {
    const drawerBg = getComputedStyle(document.querySelector('nav.sidebar')!).backgroundColor;
    return [...document.querySelectorAll('.sidebar .nav-item')].map((el) => {
      const cs = getComputedStyle(el);
      const label = el.querySelector('.nav-label');
      const fg = getComputedStyle((label ?? el) as Element).color;
      const own = cs.backgroundColor;
      const painted = own !== 'rgba(0, 0, 0, 0)';
      return {
        text: label?.textContent ?? '',
        on: el.classList.contains('on'),
        bg: painted ? own : drawerBg,
        fg,
      };
    });
  });
  const out: RowState[] = [];
  for (const r of rows) {
    out.push({ ...r, ratio: await contrast(page, r.fg, r.bg) });
  }
  return out;
}

async function drawerBg(page: Page): Promise<string> {
  return page.evaluate(() => getComputedStyle(document.querySelector('nav.sidebar')!).backgroundColor);
}

/* ─── the iPhone context builder ──────────────────────────────────── */

async function iphoneSuite(browser: Browser, theme: (typeof THEMES)[number]): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    baseURL: BASE_URL,
    locale: 'ar-LY',
    timezoneId: 'UTC',
  });
  // Skip the entrance loader + stub cores up (the shared fixture's
  // init script, same reasons — deterministic task-focused boot).
  await context.addInitScript(() => {
    try {
      sessionStorage.setItem('madarek-intro-skip', '1');
      try {
        Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
          configurable: true,
          get: () => 8,
        });
      } catch { /* non-configurable engine */ }
    } catch { /* storage denied */ }
  });
  await seedSession(context, STUDENT_USER, { theme });
  await installMockApi(context, { sessionUser: STUDENT_USER });
  const page = await context.newPage();
  await page.clock.setFixedTime(FIXED_NOW_ISO);
  // THE TOUCH GRAMMAR: the owner's device matches (hover: none) and
  // (pointer: coarse) — the media the wash guard keys on. CDP is
  // chromium-only; this spec runs the e2e (chromium) project.
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'hover', value: 'none' },
      { name: 'pointer', value: 'coarse' },
    ],
  });
  return { context, page };
}

async function openDrawer(page: Page): Promise<void> {
  await page.goto('/student/dashboard');
  await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
  await page.click('.topbar-mobile-toggle');
  await expect(page.locator('nav.sidebar.open')).toBeVisible();
  // the slide-in spring settles before geometry reads
  await page.waitForTimeout(600);
}

/** The «مقرّراتي الدراسية» row — the owner's exact ghost row. */
const GHOST_ROW_TEXT = 'مقرّراتي الدراسية';

async function ghostRowState(page: Page): Promise<{ bg: string; fg: string }> {
  return page.evaluate((needle) => {
    const el = [...document.querySelectorAll('.sidebar .nav-item')].find((n) =>
      n.textContent?.includes(needle),
    )!;
    const label = el.querySelector('.nav-label')!;
    return { bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(label).color };
  }, GHOST_ROW_TEXT);
}

/* ═══════════════════════════════════════════════════════════════
   1. B1 — the paired-state contract on the drawer rows
   ═══════════════════════════════════════════════════════════════ */
for (const theme of THEMES) {
  base.describe(`B1 drawer row states @390 ${theme}`, () => {
    base(`touch device: every row ≥4.5:1 at rest, and NO wash on :hover (the pale-ghost bug) — ${theme}`, async ({ browser }) => {
      const { context, page } = await iphoneSuite(browser, theme);
      await openDrawer(page);

      // the emulation itself is part of the contract under test
      const media = await page.evaluate(() => ({
        hoverNone: matchMedia('(hover: none)').matches,
        fine: matchMedia('(hover: hover) and (pointer: fine)').matches,
      }));
      expect(media.hoverNone, '(hover: none) emulated').toBe(true);
      expect(media.fine, 'the wash guard media must NOT match').toBe(false);

      // at-rest: every label clears AA against its effective ground
      const rest = await rowStates(page);
      expect(rest.length, 'the student drawer renders its nav rows').toBeGreaterThan(8);
      for (const r of rest) {
        expect(
          r.ratio,
          `«${r.text}» at rest: ${r.fg} on ${r.bg} = ${r.ratio}:1 (≥4.5)`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      // REAL :hover under (hover: none) — the sticky-hover mechanism:
      // the guard must keep the wash unloaded, so the hovered row
      // keeps its at-rest pair (the owner's exact ghost scenario).
      await page.locator('.sidebar .nav-item', { hasText: GHOST_ROW_TEXT }).first().hover();
      const hovered = await ghostRowState(page);
      expect(hovered.bg, 'hovered row paints NO wash under (hover: none)').toBe('rgba(0, 0, 0, 0)');
      const hoverRatio = await contrast(page, hovered.fg, await drawerBg(page));
      expect(hoverRatio, `hovered «${GHOST_ROW_TEXT}» label ≥4.5:1 (was ≈1.1:1 before the fix)`).toBeGreaterThanOrEqual(4.5);

      // TAP the row (sticky hover on touch) — the owner's exact
      // gesture. The row keeps its pair through the tap.
      await page.tap('.sidebar .nav-item', { position: { x: 100, y: 14 } });
      const tapped = await ghostRowState(page);
      expect(tapped.bg, 'tapped row paints NO wash (the B1 ghost is dead)').toBe('rgba(0, 0, 0, 0)');
      const tapRatio = await contrast(page, tapped.fg, await drawerBg(page));
      expect(tapRatio, `tapped «${GHOST_ROW_TEXT}» label ≥4.5:1 after the tap`).toBeGreaterThanOrEqual(4.5);

      await context.close();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   2. B1b — the drawer IS the sheet (Heron menu grammar)
   ═══════════════════════════════════════════════════════════════ */
for (const theme of THEMES) {
  base.describe(`B1b drawer grammar @390 ${theme}`, () => {
    base(`full-bleed paper panel, hairline rows, [01] indexes, ink scrim, no clipped groups — ${theme}`, async ({ browser }) => {
      const { context, page } = await iphoneSuite(browser, theme);
      await openDrawer(page);

      const sheet = await page.evaluate(() => {
        const sidebar = document.querySelector('nav.sidebar')!;
        const cs = getComputedStyle(sidebar);
        const groups = [...document.querySelectorAll('.sidebar .nav-group')];
        const labels = [...document.querySelectorAll('.sidebar .nav-section-label')];
        const rows = [...document.querySelectorAll('.sidebar .nav-item')];
        const brand = document.querySelector('.sidebar-brand-mark')!;
        const close = document.querySelector('.sidebar-mobile-close')!;
        const tour = document.querySelector('.sidebar-tour-trigger')!;
        const scrim = document.querySelector('.sidebar-backdrop.show')!;
        const nav = document.querySelector('.sidebar-nav')!;
        const avatar = document.querySelector('.sidebar .avatar')!;
        // start-gutter parity (RTL: the inline-START edge is the RIGHT edge).
        // Two levels: the BOX edges (brand row / heading / row share one
        // container inset) and the CONTENT edges (brand mark glyph vs the
        // row icon column — the shared 24px gutter from the sheet edge).
        const brandRow = document.querySelector('.sidebar-brand')!;
        const markR = brand.getBoundingClientRect().right;
        const brandRowR = brandRow.getBoundingClientRect().right;
        const secR = labels[0]!.getBoundingClientRect().right;
        const rowR = rows[0]!.getBoundingClientRect().right;
        const iconR = rows[0]!.querySelector('.nav-icon')!.getBoundingClientRect().right;
        const navScrollH = nav.scrollHeight;
        const navClientH = nav.clientHeight;
        nav.scrollTop = nav.scrollHeight;
        const last = groups[groups.length - 1]!;
        const dr = sidebar.getBoundingClientRect();
        const lr = last.getBoundingClientRect();
        // rendered-index probe: out-of-flow clones with/without the
        // ::before — the width delta IS the [01] glyph run. (The clones
        // must be abspos, NOT inline-block: the open drawer is a column
        // FLEX container, whose inline-block children blockify into
        // stretch-to-panel flex items — identical widths, delta 0. An
        // abspos box shrink-to-fits, so the ::before's glyph run lands
        // in the measure. Hidden: the probe never paints.)
        const probeA = labels[0]!.cloneNode(true) as HTMLElement;
        const probeB = labels[0]!.cloneNode(true) as HTMLElement;
        probeA.id = 'r319-idx-a';
        probeB.id = 'r319-idx-b';
        for (const p of [probeA, probeB]) {
          p.style.position = 'absolute';
          p.style.visibility = 'hidden';
          p.style.inlineSize = 'auto';
        }
        sidebar.appendChild(probeA);
        sidebar.appendChild(probeB);
        const probeStyle = document.createElement('style');
        probeStyle.textContent = '#r319-idx-b::before { content: none !important; }';
        document.head.appendChild(probeStyle);
        const wA = probeA.getBoundingClientRect().width;
        const wB = probeB.getBoundingClientRect().width;
        probeA.remove();
        probeB.remove();
        probeStyle.remove();
        return {
          drawerBg: cs.backgroundColor,
          drawerH: cs.height,
          viewportH: window.innerHeight,
          rowCount: rows.length,
          groupCount: groups.length,
          labelCount: labels.length,
          navScrollH,
          navClientH,
          firstRow: (() => {
            const s = getComputedStyle(rows[0]!);
            return { radius: s.borderRadius, minH: s.minHeight, h: s.height };
          })(),
          rowSep: getComputedStyle(rows[1]!).borderTopWidth,
          firstIndexContent: getComputedStyle(labels[0]!, '::before').content,
          secondIndexContent: getComputedStyle(labels[1]!, '::before').content,
          indexDeltaW: wA - wB,
          brandBg: getComputedStyle(brand).backgroundColor,
          brandBorder: getComputedStyle(brand).borderTopWidth,
          close: (() => {
            const s = getComputedStyle(close);
            return { w: s.width, h: s.height, radius: s.borderRadius, border: s.borderTopWidth };
          })(),
          tourLabel: (tour.textContent ?? '').trim(),
          scrimBg: getComputedStyle(scrim).backgroundColor,
          avatar: (() => {
            const s = getComputedStyle(avatar);
            return { radius: s.borderRadius, bg: s.backgroundColor, color: s.color, font: s.fontFamily };
          })(),
          gutter: {
            brandRowR,
            secR,
            rowR,
            markR,
            iconR,
            boxBrandVsSec: Math.abs(brandRowR - secR),
            boxBrandVsRow: Math.abs(brandRowR - rowR),
            markVsIcon: Math.abs(markR - iconR),
          },
          lastGroupLabel: (labels[labels.length - 1]!.textContent ?? '').trim(),
          lastGroupBottom: lr.bottom,
          drawerBottom: dr.bottom,
        };
      });

      // the sheet: opaque paper — the theme's own --bg ground, alpha 1
      // (never the 0.86 chrome glass, never a tint)
      expect(sheet.drawerBg, 'the drawer IS the sheet — opaque theme paper').toBe(PAPER[theme]);

      // dynamic viewport height, not the tall layout viewport
      expect(parseFloat(sheet.drawerH)).toBeLessThanOrEqual(sheet.viewportH + 0.5);

      // rows: square, ≥44px, hairline-separated
      expect(sheet.firstRow.radius).toBe('0px');
      expect(parseFloat(sheet.firstRow.minH)).toBeGreaterThanOrEqual(44);
      expect(sheet.rowSep).toBe('1px');

      // mono gutter indexes [01], [02]… — TWO pins:
      //  a) the computed `content` carries the live counter machinery
      //     (nav-section, decimal-leading-zero, brackets, bidi
      //     isolates) — before the fix this computed to the retired
      //     underline's "";
      //  b) RENDERED geometry: two inline-block clones of the first
      //     heading — one with the pseudo, one with content:none —
      //     must differ by a real glyph run (the [01] index measures
      //     wider than nothing). Cleanup leaves no DOM residue.
      expect(sheet.firstIndexContent).toContain('counter(nav-section, decimal-leading-zero)');
      expect(sheet.firstIndexContent).toContain('[');
      expect(sheet.secondIndexContent).toContain('counter(nav-section, decimal-leading-zero)');
      expect(sheet.indexDeltaW, 'the [01] index renders a real glyph run').toBeGreaterThan(10);

      // every student group present — «المصفوفة التعليمية»'s group included
      expect(sheet.groupCount).toBeGreaterThanOrEqual(6);
      expect(sheet.labelCount).toBe(sheet.groupCount);

      // the scroller contains the whole list: scrollable or shorter…
      expect(sheet.navScrollH).toBeGreaterThanOrEqual(sheet.navClientH);
      // …and after scrolling to the bottom, the LAST group sits fully
      // inside the panel (the «المصفوفة التعليمية» clip is dead)
      expect(
        sheet.lastGroupBottom,
        `last group bottom ${sheet.lastGroupBottom} ≤ drawer bottom ${sheet.drawerBottom}`,
      ).toBeLessThanOrEqual(sheet.drawerBottom + 0.5);

      // brand cell: plain paper (no pink tint), hairline frame
      expect(sheet.brandBg).toBe('rgba(0, 0, 0, 0)');
      expect(sheet.brandBorder).toBe('1px');

      // close button: 44px square on the hairline
      expect(parseFloat(sheet.close.w)).toBe(44);
      expect(parseFloat(sheet.close.h)).toBe(44);
      expect(sheet.close.radius).toBe('0px');
      expect(sheet.close.border).toBe('1px');

      // the tour trigger carries its label in the drawer (no orphan icon)
      expect(sheet.tourLabel).toContain('عرض الجولة');

      // the scrim: ink 58% over paper (light) / paper 92% (dark)
      const scrimAlpha = sheet.scrimBg.match(/([\d.]+)\)$/)?.[1];
      expect(scrimAlpha, `scrim ${sheet.scrimBg}`).toBeTruthy();
      if (theme === 'light') {
        expect(sheet.scrimBg).toContain('40, 40, 40');
        expect(parseFloat(scrimAlpha!)).toBeCloseTo(0.58, 2);
      } else {
        expect(sheet.scrimBg).toContain('246, 248, 250');
        expect(parseFloat(scrimAlpha!)).toBeCloseTo(0.92, 2);
      }

      // start-gutter parity: the brand row, every section heading and
      // every row share ONE container inset (±1px), and the brand mark
      // glyph sits on the row icon's gutter line (±1px) — the
      // «التعلم الذكي» misalignment is dead at both levels.
      expect(sheet.gutter.boxBrandVsSec).toBeLessThanOrEqual(1);
      expect(sheet.gutter.boxBrandVsRow).toBeLessThanOrEqual(1);
      expect(sheet.gutter.markVsIcon).toBeLessThanOrEqual(1);

      // the drawer avatar: square ink cell (mono face, no blue)
      expect(sheet.avatar.radius).toBe('0px');
      expect(sheet.avatar.bg).not.toContain('59, 130, 246');
      expect(sheet.avatar.font.toLowerCase()).toContain('mono');

      // evidence frame — the rendered mono indexes, hairline rows and
      // the scrim, per theme (proof for the board's re-shot mandate)
      fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, `drawer-390-${theme}.png`),
      });

      await context.close();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   3. B1b — the bottom dock + the avatar
   ═══════════════════════════════════════════════════════════════ */
for (const theme of THEMES) {
  base.describe(`B1b bottom dock + avatar @390 ${theme}`, () => {
    base(`opaque paper dock, square cells, ink+2px-rule active, square avatar — ${theme}`, async ({ browser }) => {
      const { context, page } = await iphoneSuite(browser, theme);
      await page.goto('/student/dashboard');
      await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
      await expect(page.locator('.bottom-nav')).toBeVisible();

      const dock = await page.evaluate(() => {
        const bar = document.querySelector('.bottom-nav')!;
        const bs = getComputedStyle(bar);
        const items = [...bar.querySelectorAll('.bottom-nav-item')];
        const active = bar.querySelector('.bottom-nav-item.active')!;
        const icon = active.querySelector('.bottom-nav-icon')!;
        const label = active.querySelector('.bottom-nav-label')!;
        const inner = document.querySelector('.content-inner')!;
        const avatar = document.querySelector('.topbar-user-trigger .avatar')!;
        return {
          bg: bs.backgroundColor,
          backdrop: bs.backdropFilter,
          borderTop: { w: bs.borderTopWidth, c: bs.borderTopColor },
          itemCount: items.length,
          cellW: items.map((i) => Math.round(i.getBoundingClientRect().width)),
          itemRadius: getComputedStyle(items[0]!).borderRadius,
          // logical border getter: inline-start = the separator edge in
          // BOTH directions (the app is RTL but the assertion stays
          // direction-honest)
          cellSep: getComputedStyle(items[1]!).borderInlineStartWidth,
          barH: bar.getBoundingClientRect().height,
          active: {
            color: getComputedStyle(active).color,
            rule: (() => {
              const s = getComputedStyle(active, '::before');
              return { h: s.height, bg: s.backgroundColor };
            })(),
            iconBg: getComputedStyle(icon).backgroundColor,
            iconColor: getComputedStyle(icon).color,
            iconRadius: getComputedStyle(icon).borderRadius,
            labelColor: getComputedStyle(label).color,
          },
          contentPadBottom: getComputedStyle(inner).paddingBottom,
          avatar: (() => {
            const s = getComputedStyle(avatar);
            return { radius: s.borderRadius, bg: s.backgroundColor, border: s.borderTopWidth, font: s.fontFamily };
          })(),
        };
      });

      // OPAQUE paper — alpha 1 (the translucent glass is dead)
      const m = dock.bg.match(/rgba?\(([^)]+)\)/)!;
      const parts = m[1]!.split(',').map((x) => parseFloat(x));
      const alpha = parts.length > 3 ? parts[3]! : 1;
      expect(alpha, `dock bg ${dock.bg} must be alpha 1`).toBe(1);
      expect(dock.bg, 'the dock is the opaque theme paper').toBe(PAPER[theme]);
      expect(dock.backdrop).toBe('none');

      // 1px structural top hairline
      expect(dock.borderTop.w).toBe('1px');

      // five equal square cells separated by 1px hairlines
      expect(dock.itemCount).toBe(5);
      const widths = dock.cellW;
      expect(Math.max(...widths) - Math.min(...widths)).toBeLessThanOrEqual(1);
      expect(dock.itemRadius).toBe('0px');
      expect(dock.cellSep).toBe('1px');

      // active = ink label + 2px accent TOP rule + filled ink icon.
      // The accent is theme-keyed: #FA3600 on light, the night ember
      // #FF5A1F on dark (tokens.css --accent).
      expect(dock.active.rule.h).toBe('2px');
      const ACCENT = theme === 'light' ? 'rgb(250, 54, 0)' : 'rgb(255, 90, 31)';
      expect(dock.active.rule.bg).toBe(ACCENT);
      expect(dock.active.iconBg, 'no pill wash on the icon').toBe('rgba(0, 0, 0, 0)');
      expect(dock.active.iconRadius).toBe('0px');
      const activeRatio = await contrast(page, dock.active.labelColor, dock.bg);
      expect(activeRatio, `active label ${dock.active.labelColor} on ${dock.bg}`).toBeGreaterThanOrEqual(4.5);

      // the dock never overlaps the last content row: the content
      // column reserves dock height + breathing room
      const pad = parseFloat(dock.contentPadBottom);
      expect(pad, `content padding-bottom ${pad} ≥ dock ${dock.barH} + 16`).toBeGreaterThanOrEqual(dock.barH + 16);

      // the avatar: square ink cell — radius 0, hairline, mono face,
      // on-palette ground (the fixture user's blue #3b82f6 must not
      // render: the shell stopped forwarding avatarColor)
      expect(dock.avatar.radius).toBe('0px');
      expect(dock.avatar.border).toBe('1px');
      expect(dock.avatar.bg).not.toContain('59, 130, 246');
      expect(dock.avatar.font.toLowerCase()).toContain('mono');

      await context.close();
    });
  });
}
