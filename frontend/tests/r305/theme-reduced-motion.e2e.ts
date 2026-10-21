/**
 * theme-reduced-motion.e2e.ts — theme flip/persistence + reduced-motion
 * honor (R305 Task 4).
 *
 * THEME — the mechanism is theme-persistence.e2e.ts's (tests/e2e): the
 * zustand persist store `madarek-theme` (v2) + `<html data-theme>`.
 * This spec rides the GUEST funnel instead of the shell: the landing
 * header ships its own ThemeToggle (LandingPage.tsx), so the flip,
 * the surface-var change and the reload persistence are pinned on a
 * public surface with a seeded light theme.
 *
 * REDUCED MOTION — emulated at the context level (reducedMotion:
 * 'reduce' → the real prefers-reduced-motion media query). The design
 * system owns TWO layers of kill (styles/motion.css + base.css):
 *   - token collapse: --motion-duration-micro…long → 0ms on :root;
 *   - the global belt: every element's animation/transition duration
 *     → 0.01ms !important.
 * Both are asserted on /auth (computed styles, not class presence), so
 * any future token drift breaks this spec instead of the user.
 */
import { test, expect } from './fixtures/qa';

test.describe('السمة — تبديل وثبات على سطح عام', () => {
  test.use({ qaThemeSeed: 'light' });

  test('تبديل فاتح ← داكن على صفحة الهبوط يقلب السمة ويصمد بعد إعادة التحميل', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const readBodyBg = () =>
      page.evaluate(() => getComputedStyle(document.body).backgroundColor);

    const lightBg = await readBodyBg();

    // The landing header's own ThemeToggle (the mobile-drawer twin is
    // hidden on desktop — scope keeps strict mode happy).
    await page.locator('.fo-header-actions button[aria-label="داكن"]').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The surface var actually flips (body paints the dark ground), not
    // just the attribute — expect.poll absorbs the themed cross-fade.
    const darkBg = await readBodyBg();
    await expect
      .poll(async () => readBodyBg(), { timeout: 5_000 })
      .not.toBe(lightBg);
    expect(darkBg.length).toBeGreaterThan(0);

    // The persisted store carries the choice.
    const stored = await page.evaluate(() => localStorage.getItem('madarek-theme'));
    expect(stored).toContain('"mode":"dark"');

    // Reload: the choice survives (one-shot seed never overwrites it).
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const storedAfterReload = await page.evaluate(() => localStorage.getItem('madarek-theme'));
    expect(storedAfterReload).toContain('"mode":"dark"');
  });
});

test.describe('الحركة المقلّصة — الاستعلام الوسائطي مُطبَّق', () => {
  // @playwright/test 1.60 exposes reduced-motion via contextOptions.
  test.use({ contextOptions: { reducedMotion: 'reduce' } });

  test('توكنات الحركة تنهار إلى الصفر والحزام العام يجمّد الانتقالات', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحباً بعودتك');

    const probe = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const submit = document.querySelector<HTMLElement>('.auth-submit');
      const submitCs = submit ? getComputedStyle(submit) : null;
      return {
        durationMicro: root.getPropertyValue('--motion-duration-micro').trim(),
        durationMedium: root.getPropertyValue('--motion-duration-medium').trim(),
        durationAmbient: root.getPropertyValue('--motion-duration-ambient').trim(),
        submitTransitionDuration: submitCs ? submitCs.transitionDuration : null,
        submitAnimationDuration: submitCs ? submitCs.animationDuration : null,
      };
    });

    // Layer 1 — the token collapse (motion.css, single source of truth).
    expect(probe.durationMicro).toBe('0ms');
    expect(probe.durationMedium).toBe('0ms');
    expect(probe.durationAmbient).toBe('0ms');

    // Layer 2 — the global belt (base.css): every element's durations
    // clamp to the 0.01ms floor — no transition/animation can run.
    // Chromium normalizes computed durations to seconds («1e-05s» ≡
    // 0.01ms), so compare numerically, not by unit string.
    const maxDurationMs = (value: string | null): number => {
      if (!value) return Number.POSITIVE_INFINITY;
      return Math.max(
        ...value
          .split(',')
          .map((token) => {
            const v = parseFloat(token.trim());
            return token.trim().endsWith('ms') ? v : v * 1000;
          })
          .filter(Number.isFinite),
        0,
      );
    };
    expect(maxDurationMs(probe.submitTransitionDuration)).toBeLessThanOrEqual(0.02);
    expect(maxDurationMs(probe.submitAnimationDuration)).toBeLessThanOrEqual(0.02);
  });
});

test.describe('الحركة الكاملة — الخط الأساسي (بدون تفضيل تقليل)', () => {
  test('التوكنات على قيمها الكاملة وزر الدخول ينتقل بمدة حقيقية', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحباً بعودتك');

    const probe = await page.evaluate(() => {
      const root = getComputedStyle(document.documentElement);
      const submit = document.querySelector<HTMLElement>('.auth-submit');
      const submitCs = submit ? getComputedStyle(submit) : null;
      return {
        durationMedium: root.getPropertyValue('--motion-duration-medium').trim(),
        submitTransitionDuration: submitCs ? submitCs.transitionDuration : null,
      };
    });

    // The r305 Heron ladder (foundation): --t-base = 400ms.
    expect(probe.durationMedium).toBe('400ms');
    // The CTA's own background transition rides --t-fast (200ms on r305).
    expect(probe.submitTransitionDuration).toBe('0.2s');
  });
});
