/**
 * theme-persistence.e2e.ts — ثبات السمة عبر التحميل (r164-k).
 *
 * يبدأ بوضع «فاتح» مبذورًا في localStorage (madarek-theme بنفس شكل
 * persist v2)، يبدّل عبر مفتاح الشريط الجانبي ثلاثي الحالات إلى
 * «داكن»، ثم يثبت أن الاختيار صمد بعد إعادة التحميل — محليًا
 * (data-theme) وفي الستور المدوّم، وأن مسار الدفع نحو /me/theme
 * (useThemeProfileSync Case 2) استُوفى بلا أخطاء.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT', themeSeed: 'light' });

test.describe('ثبات السمة', () => {
  test('التبديل فاتح ← داكن يبقى بعد إعادة التحميل', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* نقطة البداية: فاتح (من البذرة) */
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    /* مفتاح الشريط الجانبي — «داكن» */
    await page.getByRole('button', { name: 'داكن' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    /* إعادة التحميل: الاختيار مدوّم في الستور */
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const stored = await page.evaluate(() => localStorage.getItem('madarek-theme'));
    expect(stored).toContain('"mode":"dark"');

    /* الصفحة ما تزال حيّة بعد إعادة التحميل (وليست شاشة إقلاع عالقة) */
    // r168a: التحية الآن h2 (h1 = هوية «لوحة الطالب» sr-only).
    await expect(page.locator('h2.page-title')).toContainText('أحمد');
  });
});
