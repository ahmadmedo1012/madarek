/**
 * auth-login.e2e.ts — رحلة تسجيل الدخول بنتائجه الثلاثة (r164-k).
 *
 * النقل الوهمي يجيب على POST /auth/login ديناميكيًا من جسم الطلب:
 *   - بيانات صحيحة     → 200 { data: { user, accessToken } }
 *   - كلمة مرور خاطئة  → 401 INVALID_CREDENTIALS برسالة عربية من الخلفية
 *   - بريد مقفل        → 429 TOO_MANY_REQUESTS (قفل المحاولات، A13 P2-1)
 * الصفحة تعرض رسالة الخلفية حرفيًا (authErrorView — D17-3).
 */
import { test, expect } from './fixtures/e2e';
import {
  LOCKED_EMAIL,
  LOGIN_FAILED_MESSAGE,
  LOGIN_LOCKED_MESSAGE,
  VALID_LOGIN,
  WRONG_LOGIN,
} from './fixtures/api-fixtures';

test.describe('تسجيل الدخول', () => {
  test('النجاح يحوّل إلى الصفحة الرئيسية للدور ويعرض لوحة ببيانات حقيقية', async ({ page }) => {
    await page.goto('/auth');

    await page.locator('#auth-email').fill(VALID_LOGIN.email);
    await page.locator('#auth-password').fill(VALID_LOGIN.password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    // ROLE_HOME.STUDENT — lib/nav.ts هو المصدر الوحيد للتحويل.
    await expect(page).toHaveURL(/\/student\/dashboard$/);

    // الجلسة حقيقية داخل الواجهة: التحية بالاسم الأول من جلسة الستور
    // + بيانات لوحة الطالب من النقل الوهمي (ليست صفحة هيكلية).
    // r168a: التحية الآن h2 (h1 = هوية «لوحة الطالب» sr-only).
    await expect(page.locator('h2.page-title')).toContainText('أحمد');
    await expect(page.getByText('مقررات نشطة')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'المهام والفصول القادمة' })).toBeVisible();
  });

  test('الفشل يعرض رسالة الخلفية العربية الصريحة ويبقى في البوابة', async ({ page }) => {
    await page.goto('/auth');

    await page.locator('#auth-email').fill(WRONG_LOGIN.email);
    await page.locator('#auth-password').fill(WRONG_LOGIN.password);
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    const error = page.locator('.auth-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveText(LOGIN_FAILED_MESSAGE);
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('القفل (429) يعرض رسالة القفل لا رسالة بيانات الدخول', async ({ page }) => {
    await page.goto('/auth');

    await page.locator('#auth-email').fill(LOCKED_EMAIL);
    await page.locator('#auth-password').fill('أي-كلمة-مرور');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();

    // A13 P2-1: القفل ليس مشكلة بيانات دخول — الرسالة تسمّي القفل.
    const error = page.locator('.auth-error');
    await expect(error).toBeVisible();
    await expect(error).toHaveText(LOGIN_LOCKED_MESSAGE);
  });
});
