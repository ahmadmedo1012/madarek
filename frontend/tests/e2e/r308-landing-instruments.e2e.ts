/**
 * r308-landing-instruments.e2e.ts — the R308 interaction-grammar
 * journeys on the real SPA (hermetic: mock transport + Vite dev
 * server; the shared fixture pre-seeds the intro-seen flag — these
 * specs clear it when they need the entrance to play).
 *
 * Covers the parity-matrix §Verification browser rows that the unit
 * belt cannot: the entrance (plays once, exits by itself, does not
 * replay), the hero inspection stations as the universal control
 * path, the walkthrough's readable ladder on a narrow viewport, and
 * the continuous instruments collapsing under reduced motion.
 */
import { test, expect } from './fixtures/e2e';

test.describe('R308 — لوحة البدء (the entrance)', () => {
  test('plays on a fresh session, exits by itself, and never replays', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-seen');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await expect(page.locator('.sl')).toBeVisible();
    /* it must exit by itself (honest progress + hard cap) */
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 10000 });
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
    /* the session flag means the next visit boots straight in */
    await page.reload();
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
    await expect(page.locator('.sl')).toHaveCount(0);
  });

  test('the skip control ends the entrance immediately', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-seen');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await page.locator('.sl-skip').click();
    await expect(page.locator('.sl')).toHaveCount(0, { timeout: 3000 });
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
  });
});

test.describe('R308 — محطات الفحص (the inspection stations)', () => {
  test('the stations are real controls: open, read, reset — without any pointer', async ({ page }) => {
    await page.goto('/');
    const station = page.locator('.hi-marker[data-marker="cp"]');
    await expect(station).toHaveCount(1);
    await expect(station).toHaveAttribute('aria-pressed', 'false');
    await station.click();
    await expect(station).toHaveAttribute('aria-pressed', 'true');
    /* the label is real content, not a tooltip */
    await expect(page.locator('.hi-marker[data-marker="cp"] .hi-marker-label')).toContainText('نقطة فحص');
    /* the reset control appears once a station is open */
    const reset = page.locator('.hi-reset');
    await expect(reset).toBeVisible();
    await reset.click();
    await expect(station).toHaveAttribute('aria-pressed', 'false');
  });
});

test.describe('R308 — رحلة التعلّم (the walkthrough ladder)', () => {
  test('a narrow viewport gets the readable stacked sequence (no pin, no hidden content)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    /* all four stations present as stacked readable cards */
    await expect(page.locator('.jt-station')).toHaveCount(4);
    const first = page.locator('.jt-station').first();
    await first.scrollIntoViewIfNeeded();
    await expect(first).toBeVisible();
    await expect(first).toContainText('المحاضرة التفاعلية');
    /* the capability checklist stands open on the flow sheet */
    await expect(page.locator('.jt-checklist li')).toHaveCount(4);
  });
});

test.describe('R308 — the static belt', () => {
  test.use({ reducedMotion: 'reduce' });
  test('reduced motion: the complete sheet stands — no loader, no cursor, stations readable', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        sessionStorage.removeItem('madarek-intro-seen');
      } catch {
        /* ignore */
      }
    });
    await page.goto('/');
    await expect(page.locator('.sl')).toHaveCount(0);
    await expect(page.locator('.sc-canvas')).toHaveCount(0);
    await expect(page.locator('.fo-hero-title')).toContainText('مدارك');
    /* the drawing is complete, not dash-hidden */
    await expect(page.locator('.hi-marker')).toHaveCount(3);
  });
});
