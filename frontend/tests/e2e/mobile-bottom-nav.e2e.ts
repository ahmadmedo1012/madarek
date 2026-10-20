/**
 * mobile-bottom-nav.e2e.ts — إطار الجوال 390×844 (r164-k).
 *
 * شريط التنقّل السفلي يظهر في النطاق الضيق فقط. r211 (Agent S):
 * أربع وجهات مُقدَّمة + زر «المزيد» يفتح الدرج الكامل — الوجهة الخامسة
 * (حسابي) باقية في الدرج، وهذا الملف يثبّت العقد الجديد.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT', viewport: { width: 390, height: 844 } });

test.describe('التنقّل السفلي على الجوال', () => {
  test('شريط 390×844: «مقرراتي» ينقل إلى قائمة المقرّرات بعنوانها', async ({ page }) => {
    await page.goto('/student/dashboard');

    const nav = page.getByRole('navigation', { name: 'التنقّل السريع' });
    await expect(nav).toBeVisible();
    // r211: أربع وجهات مُقدَّمة + زر «المزيد» (الحساب في الدرق عبر المزيد).
    for (const label of ['الرئيسية', 'مقرراتي', 'المساعد', 'الإشعارات']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }
    await expect(nav.getByRole('button', { name: 'المزيد — فتح القائمة الكاملة' })).toBeVisible();

    await nav.getByRole('link', { name: 'مقرراتي', exact: true }).click();
    await expect(page).toHaveURL(/\/student\/courses$/);
    await expect(page.locator('h1.page-title')).toHaveText('مقرّراتي الدراسية');
  });
});
