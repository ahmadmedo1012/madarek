/**
 * r312-guest-reveal.e2e.ts — the R312 §R D7 browser-truth belt
 * (the jsdom side lives in tests/unit/r312-guest-reveal.test.tsx).
 *
 * The guest route transition: the keyed GuestReveal plays a
 * viewport-anchored top-down clip sweep + a traveling 1px rule on
 * every guest route change (both directions); reduced motion
 * collapses to the standing page. Verified three ways: the computed
 * clip-path trajectory (instrumented), the animation registry
 * (getAnimations), and the settled end state.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/* R315 (c4-E) re-pin: the landing H1 is «رحلة تعلم واحدة / من
 * المحاضرة إلى الإتقان» (cycle-1 V1 hero, then the cycle-3 copy pass
 * de-tashkeeled the display line — «رحلةُ تعلُّمٍ واحدة» is gone too).
 * The brand «مدارك» lives in the header/footer brand cells, not the H1;
 * this sentinel is the page-ready proof, not a copy pin. */
const HERO_READY = 'رحلة تعلم واحدة';

test.describe('R312 — the guest route reveal (§R D7)', () => {
  test('landing → /colleges: the sweep plays on the colleges mount and settles', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);

    /* warm the /colleges chunk first (the D4 latency class must not
     * swallow the measurement), then measure the SECOND crossing */
    await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
    await page.locator('a[href="/colleges"]').first().click();
    await expect(page.locator('.guest-reveal-inner')).toHaveCount(1);
    await page.waitForTimeout(1000);
    await page.goBack();
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForTimeout(1000);

    /* the measured crossing */
    await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
    await page.locator('a[href="/colleges"]').first().click();

    /* the inner exists immediately and the animation is registered */
    await page.waitForFunction(
      () => {
        const inner = document.querySelector('.guest-reveal-inner');
        if (!inner) return false;
        const anims = document.getAnimations().some((a) => (a as CSSAnimation).animationName === 'guest-reveal-sweep');
        return anims;
      },
      undefined,
      { timeout: 8000 },
    );

    /* R313 override (D11): the reveal is SEQUENCED — ~900ms cover
     * (sheetExit .sx) holds the clip at inset(50% 50% 50% 50%), then
     * the ~700ms reveal opens it (the reference's 1.6s two-phase
     * sequence). Sample long enough to span both phases. */
    const seen: string[] = [];
    for (let i = 0; i < 24; i += 1) {
      const clip = await page.evaluate(() => {
        const inner = document.querySelector('.guest-reveal-inner');
        return inner ? getComputedStyle(inner).clipPath : 'none';
      });
      seen.push(clip);
      await page.waitForTimeout(110);
    }
    /* at least 4 DISTINCT computed states across the window (motion),
     * ending settled open (never stuck clipped) */
    const distinct = new Set(seen);
    expect(distinct.size).toBeGreaterThanOrEqual(4);
    const last = await page.evaluate(() => getComputedStyle(document.querySelector('.guest-reveal-inner') as Element).clipPath);
    expect(last).toMatch(/0%|none/);
    /* the colleges page stands fully rendered behind the settled clip */
    await expect(page.locator('.guest-reveal-inner')).toBeVisible();
  });

  test('browser back → the landing: the same reveal on the landing mount', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
    await page.locator('a[href="/colleges"]').first().click();
    await page.waitForTimeout(1200);

    await page.goBack();
    await page.waitForFunction(
      () => {
        const inner = document.querySelector('.guest-reveal-inner');
        if (!inner) return false;
        return document.getAnimations().some((a) => (a as CSSAnimation).animationName === 'guest-reveal-sweep');
      },
      undefined,
      { timeout: 8000 },
    );
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    /* the landing tree is inside the reveal stage */
    const inside = await page.evaluate(() => {
      const inner = document.querySelector('.guest-reveal-inner');
      return !!inner?.contains(document.querySelector('.fo-hero-title'));
    });
    expect(inside).toBe(true);
    await page.waitForTimeout(900);
    const settled = await page.evaluate(() => getComputedStyle(document.querySelector('.guest-reveal-inner') as Element).clipPath);
    expect(settled).toMatch(/0%|none/);
  });

  test('the traveling rule: fixed, 1px, on the rule token', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    const line = await page.evaluate(() => {
      const wrap = document.querySelector('.guest-reveal');
      const cs = getComputedStyle(wrap as Element, '::after');
      return {
        content: cs.content,
        position: cs.position,
        height: cs.height,
        background: cs.backgroundColor,
        display: cs.display,
      };
    });
    expect(line.display).not.toBe('none');
    expect(line.position).toBe('fixed');
    expect(line.height).toBe('1px');
    expect(line.content).toContain('""');
  });
});

test.describe('R312 — reduced motion: the standing page', () => {
  test.use({ reducedMotion: 'reduce' });
  test('no sweep, no line, no clip — the page stands', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 640 });
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.locator('a[href="/colleges"]').first().scrollIntoViewIfNeeded();
    await page.locator('a[href="/colleges"]').first().click();
    await page.waitForTimeout(1200);

    const state = await page.evaluate(() => {
      const inner = document.querySelector('.guest-reveal-inner');
      const wrap = document.querySelector('.guest-reveal');
      return {
        clip: inner ? getComputedStyle(inner).clipPath : 'none',
        anim: inner ? getComputedStyle(inner).animationName : 'none',
        lineDisplay: getComputedStyle(wrap as Element, '::after').display,
      };
    });
    expect(state.anim).toBe('none');
    expect(state.clip).toBe('none');
    expect(state.lineDisplay).toBe('none');
    /* the colleges page is fully readable instantly */
    await expect(page.locator('.guest-reveal-inner')).toBeVisible();
  });
});
