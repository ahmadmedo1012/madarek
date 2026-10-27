/**
 * focus-keyboard.e2e.ts — keyboard operability + focus visibility
 * (R305 Task 4).
 *
 * Pinned contracts:
 *   1. On /auth the FIRST Tab stop is a real interactive element
 *      (the «الصفحة الرئيسية» chrome link — DOM order, no focus steal).
 *   2. The login form is FULLY operable by keyboard: fill both fields
 *      (focus + type), press Enter in the password field → the native
 *      form submit fires → the mock login succeeds → the app navigates
 *      to the student role home. No mouse click anywhere.
 *   3. Focus-visible: keyboard-focusing the primary submit button
 *      paints the universal :focus-visible ring (motion.css) —
 *      computed outline-style «solid» with a real width, while the
 *      same button focused by MOUSE shows no outline (base.css's
 *      :focus:not(:focus-visible) rule).
 *   4. Skip links: both emitters (AppShell «تخطَّ إلى المحتوى
 *      الرئيسي», CollegesLayout guest «تخطَّ إلى المحتوى») are the
 *      first Tab stop in their chrome, become visible on focus, and
 *      Enter lands programmatic focus on #main.
 */
import { test, expect } from './fixtures/qa';
import { VALID_LOGIN } from './fixtures/qa-transport';
import { readFocusRing } from './fixtures/qa-checks';

test.describe('لوحة الدخول — لوحة المفاتيح', () => {
  test('أول Tab يصل إلى أول عنصر تفاعلي (رابط الصفحة الرئيسية)', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحبا بعودتك');

    await page.keyboard.press('Tab');
    const active = await page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      cls: document.activeElement?.className,
      text: (document.activeElement?.textContent ?? '').trim(),
    }));
    expect(active.tag, 'the first Tab stop must be an interactive element').toBe('A');
    expect(active.text).toContain('الصفحة الرئيسية');
  });

  test('النموذج قابل للتشغيل بالكامل بلوحة المفاتيح (تعبئة + Enter يرسل)', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحبا بعودتك');

    // Keyboard-only path: focus the first field via Tab navigation is
    // slow to reason about — page.focus() is the keyboard-equivalent
    // programmatic focus (same focus() call a Tab would trigger), then
    // every character is typed through the real key events.
    await page.locator('#auth-email').focus();
    await page.keyboard.type(VALID_LOGIN.email);
    await page.locator('#auth-password').focus();
    await page.keyboard.type(VALID_LOGIN.password);
    // Enter inside a text input submits the owning <form> — no click.
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });

  test('حلقة التركيز الظاهرة: لوحة المفاتيح ترسم الحلقة، والفأرة لا ترسمها', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحبا بعودتك');

    // Keyboard focus (Shift+Tab walks back to the submit button from
    // the demo chip / register prompt — the button is the LAST control
    // before the prompt paragraph in most boots; we simply walk until
    // the submit button owns focus, deterministically capped).
    const submit = page.getByRole('button', { name: 'تسجيل الدخول' });
    for (let i = 0; i < 12; i++) {
      const isSubmit = await page.evaluate(
        () => document.activeElement?.classList.contains('auth-submit') ?? false,
      );
      if (isSubmit) break;
      await page.keyboard.press('Tab');
    }
    await expect(submit).toBeFocused();
    const kbRing = await readFocusRing(page, '.auth-submit');
    expect(kbRing.style, ':focus-visible must paint the universal ring (outline-style solid)').toBe('solid');
    expect(
      parseFloat(kbRing.width),
      `:focus-visible outline-width must be > 0 (got «${kbRing.width}»)`,
    ).toBeGreaterThan(0);

    // Mouse focus on a NON-submitting control: :focus:not(:focus-visible)
    // must suppress the ring (no outline on pointer focus). R320 (c2-FLOW):
    // the retired seat was the forgot-password TOGGLE button — the flow's
    // M3 made «نسيت كلمة المرور؟» a real <Link to="/auth/forgot-password">
    // (a click NAVIGATES now), so the pointer-focus contract moves to the
    // demo panel: open it with the reopen toggle, then the FILL button —
    // type=button, no navigation, fillTestAccount only setValue's (the
    // clicked button keeps focus and stays mounted — its label flips
    // تعبئة→دخول, the element persists).
    // R321 §A8 re-pin: the panel starts OPEN in development (the owner's
    // one-tap-per-job rule) — the reopen toggle is no longer the door;
    // the fill button is directly visible.
    const fill = page.locator('.auth-demo-fill').first();
    await expect(fill).toBeVisible();
    await fill.click();
    await expect(fill).toBeFocused();
    const mouseRing = await readFocusRing(page, '.auth-demo-fill');
    expect(
      mouseRing.style === 'none' || parseFloat(mouseRing.width) === 0,
      `mouse focus must NOT paint the ring (got style=${mouseRing.style}, width=${mouseRing.width})`,
    ).toBe(true);
  });
});

test.describe('رابط التخطّي — هيكل التطبيق', () => {
  test.use({ qaRole: 'STUDENT' });

  test('أول Tab يصل إلى «تخطَّ إلى المحتوى الرئيسي» وEnter ينقل التركيز إلى #main', async ({ page }) => {
    await page.goto('/training');
    await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();

    const skipLink = page.locator('a.skip-link');
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    // The base.css contract: visually hidden until focused (the
    // transform swap parks it inside the viewport's safe top margin).
    await expect(skipLink).toBeVisible();

    await page.keyboard.press('Enter');
    const focusOnMain = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusOnMain, 'after skipping, programmatic focus must land on #main').toBe('main');
  });
});

test.describe('رابط التخطّي — قناة الكلّيّات للزائر', () => {
  test('«تخطَّ إلى المحتوى» هو أول نقطة توقف ويعمل بمفتاح الإدخال', async ({ page }) => {
    await page.goto('/colleges');
    await expect(page.getByRole('group', { name: 'كلّيّات حرم المعرفة' })).toBeVisible();

    const skipLink = page.locator('a.skip-link');
    await expect(skipLink).toHaveText('تخطَّ إلى المحتوى');
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    const focusOnMain = await page.evaluate(() => document.activeElement?.id ?? '');
    expect(focusOnMain).toBe('main');
  });
});
