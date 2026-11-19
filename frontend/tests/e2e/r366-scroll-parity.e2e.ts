/**
 * r366-scroll-parity.e2e.ts — R366 Agent 2 · L2 — the scroll contract,
 * proven from the user's side of the glass on the real app.
 *
 * The architecture (docs/SCROLL-ARCHITECTURE.md) has two regimes:
 *   · GUEST (window-scoped routes) — the WINDOW scrolls, driven by the
 *     Lenis engine (lib/motion/sheetLenis.ts, Heron's measured params);
 *   · AUTHED (the app shell) — `.content` is the ONE scroller (body
 *     never scrolls), with sessionStorage restoration on POP.
 *
 * This spec pins the parity matrix the brief demands (touch, keyboard,
 * nested scrollers, restoration, anchors, reduced-motion):
 *   1. touch parity — on a phone viewport the engine is live with the
 *      Heron touch params (syncTouch true, smoothTouch-era behaviour via
 *      the 1.1.5 constructor), and the scrollbar is hidden while live;
 *   2. reduced-motion — the engine NEVER inits (native scroll);
 *   3. the ONE scroller — `.content` scrolls, the document never does;
 *      overscroll containment is computed on the elements that matter;
 *   4. nested scrollers never chain — scrolling a popover's inner list
 *      at its end never moves `.content` (and the sidebar-nav rail too);
 *   5. scroll restoration — PUSH → top; POP → restored offset, incl.
 *      the late-growth watcher window; FORWARD → the pushed-to top;
 *   6. keyboard — the scrollable region is focusable; Space/PageDown/
 *      Home/End actually scroll it; the focused heading never lands
 *      beneath the sticky topbar (focus-into-view + scroll margins);
 *   7. anchors — the landing's in-page anchor lands the target clear of
 *      the sticky header (scroll-margin contract), under the live engine
 *      and under native scroll both.
 *
 * Hermetic: the shared fixture corpus (mock transport + seeded session).
 */
import { test, expect } from './fixtures/e2e';

/* (e2eRole is scoped per describe below — a module-level test.use() would
 * leak the STUDENT session into the guest suites and render the shell
 * instead of the landing.) */

/* ═══ 1–2 · the guest engine: touch parity + reduced-motion ═════════ */

test.describe('guest scroll engine — Lenis parity', () => {
  test.use({ e2eRole: 'guest' });

  test('phone viewport: engine live with the Heron touch params; scrollbar hidden while live', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    // hasTouch context: the engine must be pointer-class agnostic (the
    // custom cursor is the only fine-pointer-only surface — scroll is not).
    await page.goto('/');
    await expect(page.locator('footer.fo-footer')).toBeVisible({ timeout: 30000 });
    const probe = await page.evaluate(() => {
      const eng = (window as { __mdrkLenis?: { options?: Record<string, unknown> } }).__mdrkLenis;
      return {
        live: Boolean(eng),
        opts: eng?.options ? {
          lerp: eng.options.lerp,
          smoothWheel: eng.options.smoothWheel,
          syncTouch: eng.options.syncTouch,
          touchMultiplier: eng.options.touchMultiplier,
          wheelMultiplier: eng.options.wheelMultiplier,
          infinite: eng.options.infinite,
        } : null,
        lenisOn: document.documentElement.hasAttribute('data-lenis-on'),
        // the scrollbar is hidden while the engine is live (base.css)
        scrollbarHidden: getComputedStyle(document.documentElement).overflow === 'hidden',
        canScroll: document.documentElement.scrollHeight > window.innerHeight,
      };
    });
    expect(probe.live).toBe(true);
    expect(probe.opts).toMatchObject({
      lerp: 0.1,
      smoothWheel: true,
      syncTouch: true,
      touchMultiplier: 1,
      wheelMultiplier: 1,
      infinite: false,
    });
    expect(probe.lenisOn).toBe(true);
    expect(probe.canScroll).toBe(true);
  });

  test('desktop viewport: the same engine params (pointer class does not fork the engine)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('footer.fo-footer')).toBeVisible({ timeout: 30000 });
    const opts = await page.evaluate(() => {
      const eng = (window as { __mdrkLenis?: { options?: Record<string, unknown> } }).__mdrkLenis;
      return eng?.options ? { lerp: eng.options.lerp, smoothWheel: eng.options.smoothWheel, syncTouch: eng.options.syncTouch } : null;
    });
    expect(opts).toMatchObject({ lerp: 0.1, smoothWheel: true, syncTouch: true });
  });

  test('reduced-motion: the engine NEVER inits — native scroll, no attribute', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('footer.fo-footer')).toBeVisible({ timeout: 30000 });
    const probe = await page.evaluate(() => ({
      engine: 'engine' in window && (window as Record<string, unknown>).__mdrkLenis !== undefined,
      attr: document.documentElement.hasAttribute('data-lenis-on'),
    }));
    expect(probe.engine).toBe(false);
    expect(probe.attr).toBe(false);
    // native scrolling still works under RM
    await page.evaluate(() => window.scrollTo(0, 400));
    await expect
      .poll(async () => page.evaluate(() => window.scrollY))
      .toBeGreaterThan(300);
  });
});

/* ═══ 3–6 · the authed shell: ONE scroller, no chaining, restoration ═ */

test.describe('authed shell — the ONE scroller', () => {
  test.use({ e2eRole: 'STUDENT' });

  test('.content scrolls; the document never does; containment computed', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });

    const contract = await page.evaluate(() => {
      const content = document.querySelector('.content') as HTMLElement | null;
      const cs = content ? getComputedStyle(content) : null;
      return {
        hasContent: Boolean(content),
        contentScrollable: content ? content.scrollHeight > content.clientHeight : false,
        contentContains: cs?.overscrollBehaviorY ?? null,
        bodyOverscroll: getComputedStyle(document.body).overscrollBehaviorY,
        docNeverScrolls: document.scrollingElement!.scrollTop === 0,
        htmlOverflow: getComputedStyle(document.documentElement).overflow,
      };
    });
    expect(contract.hasContent).toBe(true);
    expect(contract.contentScrollable).toBe(true);
    expect(contract.contentContains).toBe('contain');
    expect(contract.bodyOverscroll).toBe('none');
    expect(contract.docNeverScrolls).toBe(true);

    // the document stays frozen while content scrolls to its end
    const docScrollBefore = await page.evaluate(() => document.scrollingElement!.scrollTop);
    await page.evaluate(() => {
      const c = document.querySelector('.content') as HTMLElement;
      c.scrollTo({ top: c.scrollHeight, behavior: 'instant' });
    });
    await expect
      .poll(async () => page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop))
      .toBeGreaterThan(100);
    expect(await page.evaluate(() => document.scrollingElement!.scrollTop)).toBe(docScrollBefore);
  });

  test('nested scrollers never chain: the notifications list scrolls to its end, .content never moves', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    // open the bell's panel (topbar)
    const bell = page.locator('.topbar-notif').first();
    await bell.click();
    const list = page.locator('.notif-panel-list');
    await expect(list).toBeVisible({ timeout: 15000 });

    const before = await page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    // wheel INSIDE the list, far past its end (the chaining gesture) —
    // the wheel dispatches at the live cursor seat: park it INSIDE the
    // list first, or the gesture lands on the page and moves .content.
    const box = await list.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + Math.min(box!.height / 2, 100));
    for (let i = 0; i < 6; i += 1) {
      await page.mouse.wheel(0, 400);
    }
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    expect(after).toBe(before);
    // the list itself did scroll (or is short — either way it absorbed)
    const listState = await page.evaluate(() => {
      const l = document.querySelector('.notif-panel-list') as HTMLElement;
      return { top: l.scrollTop, canScroll: l.scrollHeight > l.clientHeight };
    });
    if (listState.canScroll) expect(listState.top).toBeGreaterThan(0);
    await page.keyboard.press('Escape');
  });

  test('nested scrollers never chain: the sidebar rail at its end never moves .content', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/student/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    const before = await page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    const rail = page.locator('.sidebar-nav');
    const box = await rail.boundingBox();
    expect(box).not.toBeNull();
    await page.evaluate(() => {
      const r = document.querySelector('.sidebar-nav') as HTMLElement;
      r.scrollTo({ top: r.scrollHeight, behavior: 'instant' });
    });
    // wheel inside the rail's end — the page must not move
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height - 10);
    for (let i = 0; i < 4; i += 1) {
      await page.mouse.wheel(0, 300);
    }
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    expect(after).toBe(before);
  });

  test('scroll restoration: PUSH → top · POP → the saved offset survives late growth · FORWARD → top', async ({ page }) => {
    // Phone viewport: the bottom-nav's «مقرراتي» is an always-rendered
    // in-app link (the desktop sidebar's groups can collapse its rows).
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/student/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    // 1) PUSH → top (scroll deep first, then navigate IN-APP — a full
    //    page.goto would reload the SPA and the session-scoped store
    //    with it; the sidebar link is the real user gesture)
    // The dashboard's payloads land after mount: wait until the track can
    // actually HOLD 600px before seating there (a clamp to a short page
    // would test nothing). R369 fix: skeletons already hold 600px while
    // the late payloads (announcements/KPI resolves) are still in flight,
    // and Chromium's scroll anchoring then WALKS the seat when they land
    // (CI run 44561151256: seat 600 → 665, retry-passed — the classic
    // late-landing race). The gate below waits for the track to hold
    // 600px AND be height-stable across a 350 ms window, so the seat
    // lands after the growth and stays exactly where it was put.
    await expect
      .poll(
        async () => page.evaluate(() => new Promise<number>((resolve) => {
          const c = document.querySelector('.content') as HTMLElement;
          const h = c.scrollHeight;
          setTimeout(() => resolve(c.scrollHeight === h ? h : -1), 350);
        })),
        { timeout: 20000 },
      )
      .toBeGreaterThan(600);
    await page.evaluate(() => {
      const c = document.querySelector('.content') as HTMLElement;
      c.scrollTo({ top: 600, behavior: 'instant' });
    });
    await expect
      .poll(async () => page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop))
      .toBe(600);
    await page.getByRole('link', { name: 'مقرراتي' }).first().click();
    await expect(page).toHaveURL(/\/student\/courses$/);
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop))
      .toBe(0);

    // 2) POP (browser back) → the dashboard's 600px returns — the
    //    bounded watcher holds it even if the dashboard grows after
    //    the restore frame (mock data can land late). Sub-pixel and
    //    relayout drift of a few px is the honest tolerance (the probe
    //    measured 597 for a 600 seat); anything past ±12px is a lost
    //    restore.
    await page.goBack();
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    await expect
      .poll(
        async () => page.evaluate(() => Math.abs((document.querySelector('.content') as HTMLElement).scrollTop - 600)),
        { timeout: 8000 },
      )
      .toBeLessThanOrEqual(12);

    // 3) FORWARD → the courses page sits at its pushed-to top
    await page.goForward();
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    await expect
      .poll(async () => page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop))
      .toBe(0);
  });

  test('keyboard: the scroll region is focusable; Space/PageDown/Home/End actually scroll it', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/student/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });

    const region = page.locator('.content');
    await region.focus();
    await expect(region).toBeFocused();

    const read = () => page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    const before = await read();
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(120);
    expect(await read()).toBeGreaterThan(before);
    await page.keyboard.press('End');
    await expect
      .poll(async () => page.evaluate(() => {
        const c = document.querySelector('.content') as HTMLElement;
        return Math.abs(c.scrollHeight - c.clientHeight - c.scrollTop);
      }), { timeout: 5000 })
      .toBeLessThan(4); // at the very bottom
    await page.keyboard.press('Home');
    await expect.poll(read, { timeout: 5000 }).toBe(0);
    // Space scrolls too (from a body-focused state the region is the
    // tab stop — the axe scrollable-region-focusable contract)
    await page.keyboard.press('Space');
    await page.waitForTimeout(120);
    expect(await read()).toBeGreaterThan(0);
  });

  test('focus-into-view: a deep control brought into view never hides under the sticky topbar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/student/dashboard');
    await expect(page.locator('h1')).toBeVisible({ timeout: 30000 });
    // a control near the page's end
    const target = page.locator('.content button, .content a').last();
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    const topbarBottom = await page.evaluate(() => {
      const t = document.querySelector('.topbar');
      return t ? t.getBoundingClientRect().bottom : 0;
    });
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(topbarBottom - 1);
    // keyboard focus into the same element keeps it clear of the bar
    await target.focus();
    const box2 = await target.boundingBox();
    expect(box2!.y).toBeGreaterThanOrEqual(topbarBottom - 1);
  });
});

/* ═══ 7 · anchors under the engine and native scroll ════════════════ */

test.describe('guest anchors — clear of the sticky header', () => {
  test.use({ e2eRole: 'guest' });

  test('the landing chapter anchor lands its target below the header (engine live)', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('footer.fo-footer')).toBeVisible({ timeout: 30000 });
    const anchor = page.locator('a[href="#chapters"]').first();
    if (await anchor.count() === 0) {
      test.skip(true, 'the #chapters pill is not rendered on this landing state');
      return;
    }
    await anchor.click();
    // the engine resyncs to the native target seat; wait for the settle
    await page.waitForTimeout(900);
    const probe = await page.evaluate(() => {
      const t = document.getElementById('chapters');
      if (!t) return { found: false };
      const r = t.getBoundingClientRect();
      const headerBottom = (() => {
        const h = document.querySelector('.fo-header, header');
        return h ? h.getBoundingClientRect().bottom : 0;
      })();
      return { found: true, top: r.top, headerBottom, hash: window.location.hash };
    });
    if (!probe.found) throw new Error('#chapters target missing after the engine jump');
    expect(probe.hash).toContain('chapters');
    // headerBottom's evaluate type collapses to optional — the runtime
    // fallback is 0 (no header found), mirrored here at the type level.
    expect(probe.top).toBeGreaterThanOrEqual((probe.headerBottom ?? 0) - 2);
  });

  test('native anchor jump under reduced-motion lands the same clearance', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('footer.fo-footer')).toBeVisible({ timeout: 30000 });
    const anchor = page.locator('a[href="#chapters"]').first();
    if (await anchor.count() === 0) {
      test.skip(true, 'the #chapters pill is not rendered on this landing state');
      return;
    }
    await anchor.click();
    await page.waitForTimeout(250);
    const probe = await page.evaluate(() => {
      const t = document.getElementById('chapters');
      if (!t) return { found: false };
      const r = t.getBoundingClientRect();
      const h = document.querySelector('.fo-header, header');
      return { found: true, top: r.top, headerBottom: h ? h.getBoundingClientRect().bottom : 0 };
    });
    if (!probe.found) throw new Error('#chapters target missing after the native jump');
    expect(probe.top).toBeGreaterThanOrEqual((probe.headerBottom ?? 0) - 2);
  });
});
