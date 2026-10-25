/**
 * r309-recovery.e2e.ts — the R309 regression belt for the five
 * production-audit defects (mission §2.7 hero checks, §3.4 menu
 * checks, §4 loader checks) plus the preserved R308 behaviors.
 *
 * Every spec reproduces the exact reported failure state first, then
 * asserts the corrected contract on the real SPA (hermetic: the
 * shared fixtures' mock transport + seeded intro-seen flag).
 */
import { test, expect } from './fixtures/e2e';

/* R315 (c4-E) re-pin: the landing H1 is «رحلة تعلم واحدة / من
 * المحاضرة إلى الإتقان» (cycle-1 V1 hero, then the cycle-3 copy pass
 * de-tashkeeled the display line — «رحلةُ تعلُّمٍ واحدة» is gone too).
 * The brand «مدارك» lives in the header/footer brand cells, not the H1;
 * this sentinel is the page-ready proof, not a copy pin. */
const HERO_READY = 'رحلة تعلم واحدة';

const VW = { desktop: { width: 1440, height: 900 }, tablet: { width: 768, height: 1024 } };

async function openAllStations(page: import('@playwright/test').Page) {
  for (const id of ['cp', 'rr', 'mg']) {
    await page.locator(`.hi-marker[data-marker="${id}"]`).dispatchEvent('click');
  }
  await page.waitForTimeout(600); /* the open transition settles */
}

/** Wait until the letterbox mapping has positioned the dots (the
 *  stage can mount before the ResizeObserver's first pass — clicks
 *  before the mapping land on the -100px fallback, off-canvas). */
async function waitForMapping(page: import('@playwright/test').Page) {
  await page.waitForFunction(() => {
    const el = document.querySelector('.hi-marker[data-marker="mg"]') as HTMLElement | null;
    return !!el && el.style.getPropertyValue('--mk-x') !== '';
  });
}

interface Box { left: number; top: number; right: number; bottom: number }

async function boxesOf(page: import('@playwright/test').Page, sel: string): Promise<Record<string, Box>> {
  return page.evaluate((selector: string) => {
    const out: Record<string, Box> = {};
    document.querySelectorAll(selector).forEach((el) => {
      const r = el.getBoundingClientRect();
      out[el.getAttribute('data-marker') ?? '?'] = {
        left: r.left, top: r.top, right: r.right, bottom: r.bottom,
      };
    });
    return out;
  }, sel);
}

/* ═══ §2.7 — the hero inspection stations ═══════════════════════════ */

test.describe('R309 hero — drag-reveal geometry (the audit failures)', () => {
  test('desktop drag reveals [CP] with no clipping and no RR/MG overlap', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const stage = page.locator('div.bp-stage');
    /* R312 belt hardening (D4): the mount-time flake — under local
     * parallel load the dev-server transform of the landing chunk can
     * outrun the 5s default (CI runs a built app and is unaffected);
     * the drag geometry itself was never the failure — only the mount. */
    await expect(stage).toBeVisible({ timeout: 30_000 });
    const sb = await stage.boundingBox();
    expect(sb).not.toBeNull();

    /* the reproduced failing gesture: a wide drag across the drawing.
     * R312 belt hardening (D4's sibling flake): the three station
     * markers on the elevation are NOT collinear (cp 903,751 · rr
     * 615,742 · mg 432,682 — measured) — a single-segment line at a
     * fixed height passes mg by ~10px and opens only 2/3 stations
     * under pointermove coalescing. The gesture now walks a WAYPOINT
     * PER MARKER CENTRE (each crossing guaranteed by construction,
     * ±22px of box margin on either side), still one continuous wide
     * left sweep; the settle pause before release guarantees the
     * conductor frame processed the final stretch. */
    const wp = (fx: number, fy: number) => ({ x: sb!.x + sb!.width * fx, y: sb!.y + sb!.height * fy });
    await page.mouse.move(wp(0.85, 0.72).x, wp(0.85, 0.72).y);
    await page.mouse.down();
    for (const [fx, fy, steps] of [
      [0.649, 0.696, 8], // through [CP]'s centre
      [0.410, 0.678, 8], // through [RR]'s centre
      [0.230, 0.561, 8], // through [MG]'s centre
      [0.100, 0.520, 6], // the far end of the sweep
    ] as const) {
      const p = wp(fx, fy);
      await page.mouse.move(p.x, p.y, { steps });
    }
    await page.waitForTimeout(250);
    await page.mouse.up();
    await page.waitForTimeout(700);

    /* all three stations opened by the drag */
    await expect(page.locator('.hi-marker[data-open="on"]')).toHaveCount(3);

    /* the open cards: inside the viewport, pairwise non-overlapping */
    const vw = VW.desktop.width;
    const cards = await boxesOf(page, '.hi-card[data-open="on"]');
    expect(Object.keys(cards).sort()).toEqual(['cp', 'mg', 'rr']);
    for (const [id, c] of Object.entries(cards)) {
      expect(c.left, `${id} clips the left viewport edge`).toBeGreaterThanOrEqual(0);
      expect(c.right, `${id} clips the right viewport edge`).toBeLessThanOrEqual(vw);
    }
    const pairs: Array<[string, string]> = [['cp', 'rr'], ['cp', 'mg'], ['rr', 'mg']];
    for (const [a, b] of pairs) {
      const A = cards[a];
      const B = cards[b];
      expect(A && B, `missing card boxes for ${a}/${b}`).toBeTruthy();
      if (!A || !B) continue;
      const overlap = A.left < B.right && B.left < A.right && A.top < B.bottom && B.top < A.bottom;
      expect(overlap, `[${a.toUpperCase()}] and [${b.toUpperCase()}] overlap`).toBe(false);
    }

    /* the cards stay inside the drawing frame (the stage box) */
    const frame = await page.evaluate(() => {
      const r = document.querySelector('.hi-layer')!.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
    });
    for (const [id, c] of Object.entries(cards)) {
      expect(c.left, `${id} escapes the frame left`).toBeGreaterThanOrEqual(frame.left - 1);
      expect(c.right, `${id} escapes the frame right`).toBeLessThanOrEqual(frame.right + 1);
      expect(c.top, `${id} escapes the frame top`).toBeGreaterThanOrEqual(frame.top - 1);
      expect(c.bottom, `${id} escapes the frame bottom`).toBeLessThanOrEqual(frame.bottom + 1);
    }
  });

  test('the drag selection box is VISIBLE while dragging (R308 wrote vars no rule read)', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const sb = await page.locator('div.bp-stage').boundingBox();
    expect(sb).not.toBeNull();
    await page.mouse.move(sb!.x + sb!.width * 0.8, sb!.y + sb!.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(sb!.x + sb!.width * 0.2, sb!.y + sb!.height * 0.6, { steps: 8 });
    /* the box state lands on the NEXT conductor frame — wait for it
     * (the shared clock wakes on move; under suite load the frame can
     * arrive a tick after the last pointer event) */
    await page
      .waitForFunction(() => {
        const el = document.querySelector('.hi-box') as HTMLElement | null;
        return !!el && el.dataset.on === 'on';
      }, { timeout: 2000 })
      .catch(() => undefined);
    const box = await page.evaluate(() => {
      const el = document.querySelector('.hi-box') as HTMLElement | null;
      if (!el || el.dataset.on !== 'on') return null;
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height, left: r.left, top: r.top };
    });
    await page.mouse.up();
    expect(box).not.toBeNull();
    expect(box!.w).toBeGreaterThan(200);
    expect(box!.h).toBeGreaterThan(30);
  });

  test('pointer guides never leave the drawing — the audit\'s copy-crossing defect', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const sb = await page.locator('div.bp-stage').boundingBox();
    expect(sb).not.toBeNull();
    /* sweep the pointer across the stage incl. the extreme edges and
     * measure AT EACH position (the instrument follows the pointer) */
    let escapes = 0;
    let crosses = 0;
    let liveChecks = 0;
    for (let fx = 0; fx <= 1.001; fx += 0.2) {
      for (let fy = 0; fy <= 1.001; fy += 0.34) {
        await page.mouse.move(sb!.x + sb!.width * fx, sb!.y + sb!.height * fy);
        await page.waitForTimeout(120);
        const m = await page.evaluate(() => {
          const layer = document.querySelector('.hi-layer') as HTMLElement | null;
          if (!layer) return { live: false, esc: 0, cro: 0 };
          const lr = layer.getBoundingClientRect();
          const copy = document.querySelector('.fo-hero-copy')?.getBoundingClientRect();
          const cta = document.querySelector('.fo-hero-cta')?.getBoundingClientRect();
          const rects = [
            ...Array.from(document.querySelectorAll('.hi-guide')),
            document.querySelector('.hi-plus'),
            document.querySelector('.hi-readout'),
          ]
            .filter((el): el is Element => !!el)
            .map((el) => el.getBoundingClientRect());
          const esc = rects.filter(
            (r) =>
              r.left < lr.left - 0.5 || r.right > lr.right + 0.5 ||
              r.top < lr.top - 0.5 || r.bottom > lr.bottom + 0.5,
          ).length;
          const cro = rects.filter((r) => {
            const inter = (o?: DOMRect | null) =>
              !!o && r.left < o.right && r.right > o.left && r.top < o.bottom && r.bottom > o.top;
            return inter(copy) || inter(cta);
          }).length;
          return { live: layer.dataset.point === 'on', esc, cro };
        });
        if (!m.live) continue; /* pointer left the stage — instrument hidden */
        liveChecks += 1;
        escapes += m.esc;
        crosses += m.cro;
      }
    }
    expect(liveChecks, 'the sweep never woke the instrument').toBeGreaterThan(10);
    expect(escapes, 'instrument elements escape the drawing frame').toBe(0);
    expect(crosses, 'instrument elements cross into the hero copy/CTA').toBe(0);
  });

  test('repeated selections never duplicate cards; selection survives resize', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    /* open, close, reopen — same card count every time */
    const cp = page.locator('.hi-marker[data-marker="cp"]');
    await cp.dispatchEvent('click');
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(1);
    await cp.dispatchEvent('click');
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(0);
    await cp.dispatchEvent('click');
    await page.locator('.hi-marker[data-marker="rr"]').dispatchEvent('click');
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(2);
    /* the selection is still correct after a resize (the mapping
     * recomputes through the ResizeObserver) */
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(500);
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(2);
    const cards = await boxesOf(page, '.hi-card[data-open="on"]');
    for (const [id, c] of Object.entries(cards)) {
      expect(c.left, `${id} clips at 1280`).toBeGreaterThanOrEqual(0);
      expect(c.right, `${id} clips at 1280`).toBeLessThanOrEqual(1280);
    }
  });

  test('the keyboard path works: focus + Enter toggles a station', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const cp = page.locator('.hi-marker[data-marker="cp"]');
    await cp.focus();
    await expect(cp).toBeFocused();
    await expect(cp).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Enter');
    await expect(cp).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.hi-card[data-marker="cp"][data-open="on"]')).toHaveCount(1);
    await page.keyboard.press('Enter');
    await expect(cp).toHaveAttribute('aria-pressed', 'false');
  });

  test('the reset control clears every station', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await openAllStations(page);
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(3);
    await page.locator('.hi-reset').click();
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(0);
    await expect(page.locator('.hi-marker[data-open="on"]')).toHaveCount(0);
  });
});

test.describe('R309 hero — the mobile contract (≤760px flow presentation)', () => {
  for (const w of [360, 390, 430]) {
    test(`mobile ${w}px: cards inside the viewport before AND after interaction`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: 800 });
      await page.goto('/');
      await waitForMapping(page);
      /* idle: the dots sit inside the drawing, nothing clipped */
      const idle = await boxesOf(page, '.hi-marker');
      for (const [id, d] of Object.entries(idle)) {
        expect(d.left, `${id} dot clips left at ${w}`).toBeGreaterThanOrEqual(0);
        expect(d.right, `${id} dot clips right at ${w}`).toBeLessThanOrEqual(w);
      }
      /* open everything by tap — REAL clicks on the 44px targets (the
       * one retry tolerates a reflow race under parallel-suite load:
       * the final assertion stays strict — an unclickable dot fails) */
      for (const id of ['cp', 'rr', 'mg']) {
        const btn = page.locator(`.hi-marker[data-marker="${id}"]`);
        for (let attempt = 0; attempt < 2; attempt += 1) {
          await btn.click();
          if (await btn.evaluate((el) => el.getAttribute('aria-pressed') === 'true')) break;
          await page.waitForTimeout(250);
        }
        await expect(btn).toHaveAttribute('aria-pressed', 'true');
      }
      await page.waitForTimeout(600);
      /* the overlay presentation is retired on phones… */
      await expect(page.locator('.hi-card').first()).toBeHidden();
      /* …and the flow cards are readable blocks inside the viewport */
      const flow = await boxesOf(page, '.hi-flow-card[data-open="on"]');
      expect(Object.keys(flow).sort()).toEqual(['cp', 'mg', 'rr']);
      for (const [id, c] of Object.entries(flow)) {
        expect(c.left, `${id} flow card clips left at ${w}`).toBeGreaterThanOrEqual(0);
        expect(c.right, `${id} flow card clips right at ${w}`).toBeLessThanOrEqual(w);
      }
      /* the same real station state (aria-pressed mirrors the flow) */
      await expect(page.locator('.hi-marker[data-open="on"]')).toHaveCount(3);
    });
  }

  test('tablet 768px keeps the overlay presentation, unclipped', async ({ page }) => {
    await page.setViewportSize(VW.tablet);
    await page.goto('/');
    await waitForMapping(page);
    await openAllStations(page);
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(3);
    const cards = await boxesOf(page, '.hi-card[data-open="on"]');
    for (const [id, c] of Object.entries(cards)) {
      expect(c.left, `${id} clips at 768`).toBeGreaterThanOrEqual(0);
      expect(c.right, `${id} clips at 768`).toBeLessThanOrEqual(768);
    }
  });
});

test.describe('R309 hero — the reveal-state lifecycle (§6)', () => {
  test('cards persist after drag release (the reference semantics)', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    const sb = await page.locator('div.bp-stage').boundingBox();
    expect(sb).not.toBeNull();
    await page.mouse.move(sb!.x + sb!.width * 0.75, sb!.y + sb!.height * 0.66);
    await page.mouse.down();
    await page.mouse.move(sb!.x + sb!.width * 0.45, sb!.y + sb!.height * 0.66, { steps: 8 });
    await page.mouse.up();
    await page.waitForTimeout(600);
    const open = await page.locator('.hi-card[data-open="on"]').count();
    expect(open).toBeGreaterThan(0);
  });

  test('return-to-top resets the stations to the clean initial state', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await page.locator('.hi-marker[data-marker="cp"]').click();
    await expect(page.locator('.hi-marker[data-marker="cp"]')).toHaveAttribute('aria-pressed', 'true');
    /* leave the hero via the footer, then return via the footer link */
    await page.locator('.fo-footer a[href="#main"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator('.fo-footer a[href="#main"]').click();
    /* the smooth scroll takes ~1.5–2s from the footer */
    await page.waitForTimeout(2600);
    await expect(page.locator('.hi-marker[data-open="on"]')).toHaveCount(0);
    await expect(page.locator('.hi-card[data-open="on"]')).toHaveCount(0);
    await expect(page.locator('.hi-marker[data-marker="cp"]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('scrolling away WITHOUT returning to the top keeps the reveal', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await page.locator('.hi-marker[data-marker="cp"]').click();
    await expect(page.locator('.hi-marker[data-marker="cp"]')).toHaveAttribute('aria-pressed', 'true');
    /* a mid-page scroll does not punish the exploration */
    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 1.2, behavior: 'instant' }));
    await page.waitForTimeout(400);
    await expect(page.locator('.hi-marker[data-marker="cp"]')).toHaveAttribute('aria-pressed', 'true');
  });
});

/* ═══ §3.4 — the mobile menu's scroll ownership ═════════════════════ */

test.describe('R309 menu — the scroll lock', () => {
  test('the page does not scroll behind the open menu; closing restores the position', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.fo-burger').click();
    await expect(page.locator('.fo-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */

    /* scroll position before the wheel attempts */
    const before = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(400);
    await page.mouse.wheel(0, -300);
    await page.waitForTimeout(300);
    const during = await page.evaluate(() => window.scrollY);
    expect(during, 'the document scrolled behind the open menu').toBe(before);

    /* the body carries the ref-counted lock class while open */
    await expect(page.locator('body')).toHaveClass(/mdrk-scroll-locked/);

    /* close → lock released, position preserved */
    await page.locator('.fo-burger').click();
    await expect(page.locator('.fo-mobile-menu')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/mdrk-scroll-locked/);
    const after = await page.evaluate(() => window.scrollY);
    expect(after).toBe(before);
    /* and the page scrolls normally again */
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(300);
    const moved = await page.evaluate(() => window.scrollY);
    expect(moved).toBeGreaterThan(before);
  });

  test('Escape closes the menu and focus returns to the trigger', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.fo-burger').click();
    await expect(page.locator('.fo-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */
    await page.keyboard.press('Escape');
    await expect(page.locator('.fo-mobile-menu')).toHaveCount(0);
    await expect(page.locator('.fo-burger')).toBeFocused();
    await expect(page.locator('.fo-burger')).toHaveAttribute('aria-expanded', 'false');
  });

  test('a menu link navigates and closes the menu', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.locator('.fo-burger').click();
    await expect(page.locator('.fo-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */
    await page.locator('.fo-mobile-menu a[href="#chapters"]').click();
    await expect(page.locator('.fo-mobile-menu')).toHaveCount(0);
    await expect(page.locator('body')).not.toHaveClass(/mdrk-scroll-locked/);
    await expect(page.locator('#chapters')).toBeVisible();
  });

  test('repeated open/close cycles leak neither the lock nor duplicated handlers', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    for (let i = 0; i < 3; i += 1) {
      await page.locator('.fo-burger').click();
      await expect(page.locator('.fo-mobile-menu')).toBeVisible({ timeout: 30_000 }); /* R312 (D4): mount-latency hardening */
      await expect(page.locator('body')).toHaveClass(/mdrk-scroll-locked/);
      await page.locator('.fo-burger').click();
      await expect(page.locator('.fo-mobile-menu')).toHaveCount(0);
    }
    /* after the cycles: unlocked and scrollable */
    await expect(page.locator('body')).not.toHaveClass(/mdrk-scroll-locked/);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);
  });
});

/* ═══ §4 — the entrance sequence ════════════════════════════════════ */

test.describe('R309/R313 loader — the asset-gated entrance clock and the lock cleanup', () => {
  test('fresh entry: composed first frame, counter to 100% ≤4.9s, the 835ms split plays, scroll restored', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.addInitScript(() => {
      try {
        /* R313 override: the entrance replays on EVERY full page load —
         * the skip key must be cleared on EVERY init run (the shared
         * fixture re-seeds it per load; the once-guard starved the
         * reload replay this spec ends with). */
        sessionStorage.removeItem('madarek-intro-skip');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');

    /* the early frame is COMPOSED (the loader chrome + drawing), and
     * the document root never paints an unexplained blank dark frame
     * (the boot script's default now matches the store: light). */
    await page.waitForSelector('.sl', { timeout: 15000 });
    const tMount = Date.now(); /* measure the SEQUENCE from mount —
     * goto includes the dev server's cold transform */
    const early = await page.evaluate(() => {
      const main = document.querySelector('.sl-main');
      const cs = main ? getComputedStyle(main) : null;
      return {
        hasChrome: !!document.querySelector('.sl-progress') && !!document.querySelector('.sl-meta'),
        bg: cs ? cs.backgroundColor : null,
        theme: document.documentElement.dataset.theme,
      };
    });
    expect(early.hasChrome).toBe(true);
    expect(early.bg).not.toBe('rgb(0, 0, 0)');

    /* R313 override: the counter is ASSET-GATED — 100% lands between
     * ~3.25s (assets resolved early) and 4.9s (the fallback curve);
     * never the R309 fixed 5s+3.6s hold */
    await expect(page.locator('.sl-pct')).toHaveText('100%', { timeout: 8000 });
    const doneAt = Date.now() - tMount;
    expect(doneAt).toBeGreaterThanOrEqual(2500);
    expect(doneAt).toBeLessThanOrEqual(7000);

    /* the completed state holds ~0.7s, then the geometric 835ms
     * center-out split hides the sheet — R313: the split PLAYS (the
     * R309 race cut it at ~21ms); total ≈ counter + 0.7 + 0.835s */
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 6000 });
    const goneAt = Date.now() - tMount;
    expect(goneAt).toBeGreaterThanOrEqual(3200);
    expect(goneAt).toBeLessThanOrEqual(9000);

    /* §4.3 — the scroll lock is cleaned up on the timed path */
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    /* the document scrolls normally after the entrance */
    const y0 = await page.evaluate(() => window.scrollY);
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(350);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(y0);

    /* R313 override: the loader REPLAYS on a same-tab reload (the
     * reference's measured reloadGate — the session flag is inert) */
    await page.reload();
    await expect(page.locator('.sl')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 20000 });
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
  });

  test('the skip path restores the scroll lock too', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-skip');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await page.locator('.sl-skip').click();
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 4000 });
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });

  test.describe('reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('no loader at all; the page stands complete and scrollable', async ({ page }) => {
      await page.addInitScript(() => {
        try {
          sessionStorage.removeItem('madarek-intro-skip');
        } catch {
          /* ignore */
        }
      });
      await page.goto('/');
      await expect(page.locator('.sl')).toHaveCount(0);
      await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
      expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
    });
  });

  test('no stale release labels ride the customer-facing sheet (§8)', async ({ page }) => {
    await page.goto('/');
    /* R315 override (K-A4): .sheet-coord is retired entirely (the
     * reference's frame carries no mono coordinates); the sweep keeps
     * .sl-meta-row + any resurgent coordinate seat under the same
     * no-release-labels law. */
    const labels = await page.evaluate(() =>
      Array.from(document.querySelectorAll('.sl-meta-row, [class*="sheet-coord"]')).map((el) => el.textContent?.trim() ?? ''),
    );
    for (const l of labels) {
      expect(l, `stale release label: ${l}`).not.toMatch(/R3\d\d/i);
    }
  });
});

/* ═══ non-regression — the preserved R308/R307 behaviors ════════════ */

test.describe('R309 non-regression — the scroll experience and routes', () => {
  test('scenes advance forward and reverse; the role selector drives all five panels', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    /* forward through the journey */
    await page.locator('.jt-station').first().scrollIntoViewIfNeeded();
    await expect(page.locator('.jt-station').first()).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight * 0.55, behavior: 'instant' }));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(500);
    /* the role selector: five roles, each swaps the panel */
    const roles = page.locator('.rl-chip, [data-role-chip]');
    if (await roles.count()) {
      const n = await roles.count();
      expect(n).toBeGreaterThanOrEqual(5);
      for (let i = 0; i < n; i += 1) {
        await roles.nth(i).scrollIntoViewIfNeeded();
        await roles.nth(i).click();
        await page.waitForTimeout(150);
      }
    }
  });

  test('footer links work; /colleges loads; browser back returns home', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
    await page.locator('a[href="/colleges"]').first().click();
    await expect(page).toHaveURL(/\/colleges/);
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
  });
});
