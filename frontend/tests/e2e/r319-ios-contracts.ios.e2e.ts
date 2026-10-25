/**
 * r319-ios-contracts.ios.e2e.ts — the §C6 iOS verification suite
 * (c2-G3 / §H-3 "WebKit-iPhone run included").
 *
 * THE TWO OWNER SCREENSHOTS, RE-SHOT AND ASSERTED at 390 on an iPhone-13
 * class context, light AND dark:
 *
 *   • B1 — THE DRAWER. The owner tapped «مقرّراتي الدراسية» on a real
 *     iPhone and the label turned into a pale ghost (≈1.1:1). This
 *     suite TAPS the row (tap, not click — the sticky-hover mechanism),
 *     then asserts every drawer label computes ≥4.5:1 against its
 *     effective ground at rest AND after the tap, and that no wash is
 *     painted under (hover: none) — at rest, after a real programmatic
 *     :hover, and after the tap.
 *
 *   • B2 — THE DASHBOARD SHELL. Opaque bottom dock (computed alpha === 1
 *     — page text never reads through), content padding reserve
 *     (≥ dock height + 8), the drawer list fully reachable (real
 *     scroller, overscroll contained, last group label inside after
 *     scrollIntoView), safe-area padding RULE present (env() resolves to
 *     0 in emulation, so the contract reads the stylesheet), and the
 *     fixed bars do not jump across a drawer open/close round-trip.
 *
 *   • iOS STATIC CONTRACTS (engine-agnostic stylesheet + computed reads):
 *       (a) the drawer rides the DYNAMIC viewport — a dvh height rule
 *           and NO bare vh unit on any .sidebar rule;
 *       (b) Safari zoom-on-focus guard — every form field on the student
 *           dashboard computes ≥16px;
 *       (c) `-webkit-tap-highlight-color` is set (the doc-level html
 *           rule from base.css counts) — no grey tap flash on iOS;
 *       (d) `overscroll-behavior: contain` on the drawer scroller;
 *       (e) position:fixed bars don't jump across the drawer round-trip.
 *
 * RUNS ON TWO ENGINES, ONE CODE PATH (helpers in tests/ios/
 * ios-contracts.ts):
 *
 *   • `webkit-iphone` (real WebKit) — GitHub CI job `ios-webkit`. This
 *     dev sandbox CANNOT launch WebKit (missing libgtk/libgraphene/
 *     gstreamer; no root to install), so the `ios` fixture below skips
 *     the suite cleanly here: `MADAREK_IOS_SKIP_UNSUPPORTED=1` opts out
 *     explicitly, and ANY WebKit launch failure converts to a skip with
 *     the reason in the test title — the suite stays green on hosts
 *     without WebKit and runs for real where WebKit exists.
 *
 *   • `chromium-iphone` (Chromium, SAME iPhone-13 device context) — the
 *     local-truth layer: every contract the engines share (all of the
 *     above; the Chromium context gets (hover:none)/(pointer:coarse)
 *     via CDP media emulation, WebKit derives them natively). What ONLY
 *     real WebKit adds: Safari's own dvh/toolbar resize behavior, its
 *     sticky-hover quirks and its font hinting — which is exactly why
 *     the CI job exists.
 *
 * File naming: `*.ios.e2e.ts` — matched ONLY by the two `*-iphone`
 * projects (testMatch /\.ios\.e2e\.ts$/). The `e2e` project's broader
 * /\.e2e\.ts$/ pattern also matches this file, so the `ios` fixture
 * skips on any non-iphone project (a no-op instead of a duplicate run).
 * The suffix keeps vitest out as always (never *.spec|test).
 *
 * Evidence: viewport PNGs (fullPage false, never pinned — cross-engine
 * font hinting makes pixel pins lie) land in
 * tests/e2e/__screenshots__/r319-ios/ (runtime artifacts) and
 * audits/evidence/r319/ios/ (committed, the board's re-shot mandate).
 */
import { test as base, expect } from '@playwright/test';
import type { Browser } from '@playwright/test';

import {
  GHOST_ROW_TEXT,
  IPHONE_PROJECTS,
  PAPER,
  bottomBarMetrics,
  closeDrawer,
  contrastRatio,
  createIphoneContext,
  drawerRowContracts,
  drawerScrollerContracts,
  fieldContracts,
  navRowPair,
  openDrawer,
  openStudentDashboard,
  scanIosCss,
  shootIos,
  touchMedia,
  unitTokens,
} from '../ios/ios-contracts';

const THEMES = ['light', 'dark'] as const;

/**
 * `ios` — a browser launched from THIS test's own project engine
 * (webkit-iphone → WebKit, chromium-iphone → Chromium), with the two
 * skip guards that keep hosts without WebKit green:
 *
 *   GUARD A (project selection) — the suite runs ONLY on the
 *   `*-iphone` projects; any other project (the desktop `e2e` project
 *   matches this file by its broader testMatch) skips with a reason.
 *
 *   GUARD B (WebKit availability) — MADAREK_IOS_SKIP_UNSUPPORTED=1
 *   opts out explicitly (the dev sandbox), and a WebKit LAUNCH FAILURE
 *   converts to a skip too (missing system libs / browser not
 *   installed). Chromium launch failures stay loud — that engine is
 *   the local truth layer and must never skip silently.
 */
const test = base.extend<{ ios: Browser }>({
  ios: async ({ playwright, launchOptions }, use, testInfo) => {
    if (!IPHONE_PROJECTS.has(testInfo.project.name)) {
      testInfo.skip(
        true,
        `iOS contracts run only on webkit-iphone / chromium-iphone (got project "${testInfo.project.name}")`,
      );
      return;
    }
    const declared = (testInfo.project.use as { browserName?: unknown }).browserName;
    const engineName = declared === 'webkit' ? 'webkit' : 'chromium';

    if (engineName === 'webkit' && process.env.MADAREK_IOS_SKIP_UNSUPPORTED === '1') {
      testInfo.skip(true, 'WebKit unavailable on this host (MADAREK_IOS_SKIP_UNSUPPORTED=1)');
      return;
    }
    let browser: Browser;
    try {
      browser =
        engineName === 'webkit'
          ? await playwright.webkit.launch(launchOptions)
          : await playwright.chromium.launch(launchOptions);
    } catch (err) {
      if (engineName === 'webkit') {
        testInfo.skip(
          true,
          `WebKit unavailable on this host (launch failed: ${String(err).split('\n')[0]!.slice(0, 160)})`,
        );
        return;
      }
      throw err;
    }
    await use(browser);
    await browser.close();
  },
});

/* ═══════════════════════════════════════════════════════════════
   B1 — the drawer: the owner's tap must never ghost the label
   ═══════════════════════════════════════════════════════════════ */
for (const theme of THEMES) {
  test.describe(`B1 drawer tap-ghost @390 ${theme}`, () => {
    test(`tap «${GHOST_ROW_TEXT}»: every label ≥4.5:1 at rest and after the tap, no wash under (hover: none) — ${theme}`, async ({
      ios,
    }) => {
      const { context, page } = await createIphoneContext(ios, theme);
      await openStudentDashboard(page);
      await openDrawer(page);

      // the engine's own touch-media truth (annotated for the report;
      // Chromium gets (hover:none)/(pointer:coarse) via CDP media
      // emulation, WebKit reports them natively for the touch device)
      const media = await touchMedia(page);
      test.info().annotations.push({
        type: 'engine-media',
        description: `engine=${ios.browserType().name()} (hover:none)=${media.hoverNone} (pointer:coarse)=${media.coarse}`,
      });

      // at-rest: EVERY row label clears AA against its effective ground
      // (own paint if painted, else the drawer sheet)
      const rows = await drawerRowContracts(page);
      expect(rows.length, 'the student drawer renders its nav rows').toBeGreaterThan(8);
      for (const r of rows) {
        expect(
          r.ratio,
          `«${r.text}» at rest: ${r.fg} on ${r.bg} = ${r.ratio.toFixed(2)}:1 (≥4.5)`,
        ).toBeGreaterThanOrEqual(4.5);
      }

      // the owner's exact row, at rest, before any gesture
      const rest = await navRowPair(page, GHOST_ROW_TEXT);
      expect(rest.drawerBg, 'the drawer IS the opaque theme sheet').toBe(PAPER[theme]);
      expect(rest.bg, 'at-rest row paints NO wash (transparent ground)').toBe(
        'rgba(0, 0, 0, 0)',
      );
      const restRatio = await contrastRatio(page, rest.fg, rest.drawerBg);
      expect(
        restRatio,
        `«${GHOST_ROW_TEXT}» at rest: ${rest.fg} on ${rest.drawerBg} = ${restRatio.toFixed(2)}:1 (≥4.5; was ≈1.1:1 before C1-A)`,
      ).toBeGreaterThanOrEqual(4.5);

      // evidence frame — the owner's first screenshot, re-shot (drawer
      // open, at-rest state, both artifact roots)
      await shootIos(page, `drawer-${theme}.png`);

      // a REAL programmatic :hover must not paint a wash on a touch
      // device — only meaningful where the engine matches (hover: none)
      // (the guard media; Chromium via CDP, WebKit natively)
      if (media.hoverNone) {
        await page.locator('.sidebar .nav-item', { hasText: GHOST_ROW_TEXT }).first().hover();
        const hovered = await navRowPair(page, GHOST_ROW_TEXT);
        expect(hovered.bg, 'hovered row paints NO wash under (hover: none)').toBe(
          'rgba(0, 0, 0, 0)',
        );
        const hoverRatio = await contrastRatio(page, hovered.fg, hovered.drawerBg);
        expect(hoverRatio, `hovered «${GHOST_ROW_TEXT}» ≥4.5:1`).toBeGreaterThanOrEqual(4.5);
      }

      // THE OWNER'S GESTURE — a TAP (touch events, sticky hover), not a
      // click. The drawer closes on nav; the row stays in the DOM, its
      // computed pair still readable — and still no wash.
      await page.locator('.sidebar .nav-item', { hasText: GHOST_ROW_TEXT }).first().tap();
      const tapped = await navRowPair(page, GHOST_ROW_TEXT);
      expect(tapped.bg, 'tapped row paints NO ghost wash — B1 is dead').toBe(
        'rgba(0, 0, 0, 0)',
      );
      const tapRatio = await contrastRatio(page, tapped.fg, tapped.drawerBg);
      expect(
        tapRatio,
        `tapped «${GHOST_ROW_TEXT}»: ${tapped.fg} on ${tapped.drawerBg} = ${tapRatio.toFixed(2)}:1 (≥4.5)`,
      ).toBeGreaterThanOrEqual(4.5);

      await context.close();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   B2 — the dashboard shell: opaque dock, reserve, reachability
   ═══════════════════════════════════════════════════════════════ */
for (const theme of THEMES) {
  test.describe(`B2 dashboard shell @390 ${theme}`, () => {
    test(`opaque dock (α=1), padding reserve ≥ bar+8, safe-area rule, no bar jump across the drawer round-trip — ${theme}`, async ({
      ios,
    }) => {
      const { context, page } = await createIphoneContext(ios, theme);
      await openStudentDashboard(page);

      const before = await bottomBarMetrics(page);
      // OPAQUE paper — alpha 1, the theme's own ground: page text never
      // reads through the dock (the owner's second screenshot defect)
      expect(before.alpha, `dock bg ${before.bg} — alpha must be 1`).toBe(1);
      expect(before.bg, 'the dock paints the opaque theme paper').toBe(PAPER[theme]);
      // the content column reserves the dock height + breathing room
      expect(
        before.contentPadBottom,
        `content padding-bottom ${before.contentPadBottom}px ≥ dock ${before.height}px + 8`,
      ).toBeGreaterThanOrEqual(before.height + 8);

      // (e) the fixed bars don't jump: identical bbox y across a full
      // drawer open + close round-trip
      await openDrawer(page);
      await closeDrawer(page);
      const after = await bottomBarMetrics(page);
      expect(
        after.y,
        `bottom bar y identical after drawer open+close (${before.y} → ${after.y})`,
      ).toBe(before.y);

      // safe-area: env() resolves to 0 in emulation, so the contract is
      // the RULE — the bar's own CSS must carry the home-indicator
      // reserve (env(safe-area-inset-bottom) in a .bottom-nav rule).
      // Searched on the rule's cssText: CSSOM item iteration empties
      // var()/env()-pending shorthand longhands, the specified text
      // keeps them verbatim (engine-agnostic).
      const css = await scanIosCss(page);
      const barSafeArea = css.barRules.filter(
        (r) => r.text.includes('safe-area-inset-bottom'),
      );
      expect(
        barSafeArea.length,
        `a .bottom-nav rule carries env(safe-area-inset-bottom) padding — found [${barSafeArray(
          css,
        )}]`,
      ).toBeGreaterThan(0);

      // evidence frame — the owner's second screenshot, re-shot (light)
      if (theme === 'light') {
        await shootIos(page, 'dashboard-390.png');
      }
      await context.close();
    });

    test(`drawer list fully reachable — real scroller, overscroll contained, last group inside after scroll — ${theme}`, async ({
      ios,
    }) => {
      const { context, page } = await createIphoneContext(ios, theme);
      await openStudentDashboard(page);
      await openDrawer(page);

      const scroller = await drawerScrollerContracts(page);
      // a real scroller with the gesture contained (iOS scroll-chaining
      // guard: the drawer never rubber-bands the page behind it)
      expect(scroller.overflowY, 'the drawer scroller scrolls (overflow-y: auto)').toBe('auto');
      expect(
        scroller.overscroll,
        'overscroll-behavior: contain on the drawer scroller',
      ).toBe('contain');
      // every group present, all of them reachable inside the scroller
      expect(scroller.groupCount, 'all student nav groups render').toBeGreaterThanOrEqual(6);
      expect(scroller.scrollH, 'the list is contained by the scroller').toBeGreaterThanOrEqual(
        scroller.clientH,
      );
      expect(
        scroller.lastLabelInside,
        `last group label «${scroller.lastLabel}» fully inside the scroller after scrollIntoView (bottom ${scroller.lastLabelBottom} ≤ ${scroller.scrollerBottom}) — the «المصفوفة التعليمية» clip is dead`,
      ).toBe(true);

      await context.close();
    });
  });
}

/* ═══════════════════════════════════════════════════════════════
   iOS static contracts — stylesheet scans + computed reads
   ═══════════════════════════════════════════════════════════════ */
test('static contracts: 100dvh drawer (no bare vh), doc-level -webkit-tap-highlight-color', async ({
  ios,
}) => {
  const { context, page } = await createIphoneContext(ios, 'light');
  await openStudentDashboard(page);

  const css = await scanIosCss(page);
  expect(css.ruleCount, 'the CSSOM walk saw the app stylesheets').toBeGreaterThan(100);

  // (a) the drawer rides the DYNAMIC viewport: a dvh height rule
  const heightProps = new Set([
    'height',
    'block-size',
    'max-height',
    'max-block-size',
    'min-height',
    'min-block-size',
  ]);
  const heightValues = css.drawerRules.flatMap((r) =>
    r.decls.filter((d) => heightProps.has(d.p)).map((d) => d.v),
  );
  expect(
    heightValues.some((v) => v.includes('dvh')),
    `the drawer declares a dvh height (100dvh — the dynamic viewport; got [${heightValues.join(' | ')}])`,
  ).toBe(true);

  // …and NO bare vh unit on any .sidebar rule (the tall layout viewport
  // hides the last rows under iPhone Safari's collapsing toolbar).
  // Searched on each rule's specified cssText — the substrate that
  // always carries the declarations verbatim on both engines.
  const bareVh = css.drawerRules
    .filter((r) => unitTokens(r.text).includes('vh'))
    .map((r) => `${r.selector} → ${r.text}`);
  expect(bareVh, `no bare vh on the drawer rules (${bareVh.join('; ')})`).toEqual([]);

  // (c) the grey tap flash is killed doc-level (base.css html rule
  // counts — engine-agnostic: read from the stylesheet, not computed)
  expect(
    css.tapHighlightRuleCount,
    '-webkit-tap-highlight-color is set (the doc-level rule from base.css counts)',
  ).toBeGreaterThan(0);

  await context.close();
});

test('Safari zoom-on-focus guard: every field on the student dashboard computes ≥16px', async ({
  ios,
}) => {
  const { context, page } = await createIphoneContext(ios, 'light');
  await openStudentDashboard(page);

  const fields = await fieldContracts(page);
  test.info().annotations.push({
    type: 'fields',
    description: fields.map((f) => `${f.tag}[${f.placeholder}] ${f.fontSizePx}px${f.visible ? '' : ' (hidden)'}`).join(', '),
  });
  expect(
    fields.length,
    'the dashboard route carries at least one field (the topbar search combobox)',
  ).toBeGreaterThanOrEqual(1);
  for (const f of fields) {
    expect(
      f.fontSizePx,
      `<${f.tag}> (placeholder «${f.placeholder}», ${f.visible ? 'visible' : 'display:none'}) computes ${f.fontSizePx}px — iOS Safari never zooms on focus below 16px`,
    ).toBeGreaterThanOrEqual(16);
  }

  await context.close();
});

/** Human-readable list of the bar rules that carry the safe-area token. */
function barSafeArray(css: Awaited<ReturnType<typeof scanIosCss>>): string {
  return css.barRules
    .filter((r) => r.text.includes('safe-area-inset-bottom'))
    .map((r) => r.selector.trim())
    .join(', ');
}
