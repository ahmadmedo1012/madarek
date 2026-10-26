/**
 * interaction-feedback.e2e.ts — pressed/hover/disabled feedback on the
 * primary controls (R305 Task 4).
 *
 * Pinned contracts:
 *   1. SUBMITTING LOGIN BUTTON — while the (delayed) login request is
 *      in flight the submit button is honestly disabled: disabled +
 *      aria-busy + the «جارٍ الدخول…» pending label + the sr-only
 *      «جارٍ التحقق…» live mirror (AuthPage's r157 F5 contract). The
 *      delay is injected at the transport layer (page-level fallback
 *      route over the context mock transport — the same layering the
 *      e2e stateful installer uses), never a waitForTimeout.
 *   2. FILTER PILLS (/training) — the category pills carry the real
 *      aria-pressed toggle contract; clicking one filters the track
 *      list AND flips the pressed state.
 *   3. LINK HOVER (guest colleges rows) — the whole-row link shows
 *      pointer cursor and the hover background the patterns CSS owns.
 *   4. LINK FEEDBACK (auth register prompt) — pointer cursor + real
 *      navigation to /auth/register.
 */
import { test, expect } from './fixtures/qa';
import { VALID_LOGIN } from './fixtures/qa-transport';

test.describe('زر الدخول أثناء الإرسال', () => {
  test('أثناء التحقق: معطَّل + aria-busy + نصّ الانتظار، ثم نجاح يحوّل', async ({ page }) => {
    // Delay the login at the TRANSPORT layer: this page-level route
    // defers, then falls back to the context mock transport (whose
    // dynamic /auth/login answers + flips the session) — the same
    // layering installStatefulApi uses in the e2e area.
    await page.route('**/auth/login', async (route) => {
      await new Promise((r) => setTimeout(r, 1500));
      await route.fallback();
    });

    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحبا بعودتك');

    await page.locator('#auth-email').fill(VALID_LOGIN.email);
    await page.locator('#auth-password').fill(VALID_LOGIN.password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    const submit = page.locator('.auth-submit');
    await expect(submit).toBeDisabled();
    await expect(submit).toHaveAttribute('aria-busy', 'true');
    await expect(submit).toContainText('جارٍ الدخول…');
    // The sr-only polite mirror announces the flip for SR users.
    await expect(page.locator('span[role="status"]')).toHaveText('جارٍ التحقق…');

    // The delayed mock login resolves → the app navigates to the role
    // home (the button re-enables only via navigation away).
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });
});

test.describe('أزرار التصفية المضغوطة على /training', () => {
  test.use({ qaRole: 'STUDENT' });

  test('النقر على فئة يقلب aria-pressed ويصفّي القائمة فعليًا', async ({ page }) => {
    await page.goto('/training');
    await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();

    const group = page.getByRole('group', { name: 'تصفية المسارات حسب الفئة' });
    const allPill = group.getByRole('button', { name: /كل المسارات/ });
    const researchPill = group.getByRole('button', { name: /البحث العلمي/ });

    // Initial state: «كل المسارات» is the pressed pill.
    await expect(allPill).toHaveAttribute('aria-pressed', 'true');
    await expect(researchPill).toHaveAttribute('aria-pressed', 'false');

    await researchPill.click();
    await expect(researchPill).toHaveAttribute('aria-pressed', 'true');
    await expect(allPill).toHaveAttribute('aria-pressed', 'false');
    // The filter is REAL: only the research track row survives.
    await expect(page.locator('.pf-rowlist')).toContainText('إتقان البحث العلمي');
    await expect(page.locator('.pf-rowlist')).not.toContainText('مهارات الدراسة الفعّالة');

    // Back to all — pressed state returns with the full list.
    await allPill.click();
    await expect(allPill).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.pf-rowlist')).toContainText('مهارات الدراسة الفعّالة');
  });
});

test.describe('تغذية راجعة للروابط', () => {
  test('صفوف الكلّيّات للزائر: مؤشر اليد وخلفية التحويم الحقيقية', async ({ page }) => {
    await page.goto('/colleges');
    const row = page.getByRole('group', { name: 'كلّيّات حرم المعرفة' }).locator('a.pf-row-link').first();
    await expect(row).toBeVisible();

    const readHoverBg = () =>
      row.evaluate((el) => ({
        bg: getComputedStyle(el).backgroundColor,
        cursor: getComputedStyle(el).cursor,
      }));

    await row.hover();
    const states = await readHoverBg();
    expect(states.cursor, 'row links must present the pointer cursor').toBe('pointer');

    // a.pf-row-link:hover { background: var(--surface-2) } — the hover
    // background must differ from the resting surface. expect.poll
    // absorbs the themed transition; comparing against the RESTING
    // value read from the same element family (a non-hovered sibling).
    const resting = await page
      .getByRole('group', { name: 'كلّيّات حرم المعرفة' })
      .locator('a.pf-row-link')
      .nth(1)
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect
      .poll(async () => (await readHoverBg()).bg, { timeout: 5_000 })
      .not.toBe(resting);
  });

  test('رابط «أنشئ حسابك الآن»: مؤشر اليد + تنقّل فعلي إلى التسجيل', async ({ page }) => {
    await page.goto('/auth');
    const link = page.locator('.auth-register-link');
    await expect(link).toHaveText('أنشئ حسابك الآن');
    await link.hover();
    await expect
      .poll(async () => link.evaluate((el) => getComputedStyle(el).cursor), { timeout: 5_000 })
      .toBe('pointer');
    await link.click();
    await expect(page).toHaveURL(/\/auth\/register$/);
    await expect(page.locator('h1.auth-form-title')).toHaveText('من أنت؟');
  });
});
