/**
 * not-found.e2e.ts — صفحة 404 المصمّمة (r164-k).
 *
 * مساران (r143 T1-h F6): المسار الصريح /404 الذي يستخدمه جرد الأسطح،
 * وأي URL مجهول يسقط على route "*" — كلاهما يعرض NotFoundPage نفسها
 * بمشهدها المصمّمة (r280: قطعة not-found من عصبة mk-ill، خلف مشهد
 * «أطلس المعرفة» المتقادم error-404).
 */
import { test, expect } from './fixtures/e2e';

test.describe('الصفحة غير موجودة (404)', () => {
  test('مسار URL مجهول يسقط على صفحة 404 المصمّمة', async ({ page }) => {
    await page.goto('/definitely-not-a-real-route');
    await expect(page.locator('.nf-title')).toHaveText('هذه الصفحة تغيّبت عن الحضور');
    await expect(page.locator('.sr-only').filter({ hasText: 'خطأ 404.' })).toBeAttached();
  });

  test('المسار الصريح /404 يعرض الصفحة نفسها', async ({ page }) => {
    await page.goto('/404');
    await expect(page.locator('.nf-title')).toHaveText('هذه الصفحة تغيّبت عن الحضور');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });
});
