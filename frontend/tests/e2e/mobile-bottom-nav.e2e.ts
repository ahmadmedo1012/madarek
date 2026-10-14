/**
 * mobile-bottom-nav.e2e.ts — إطار الجوال 390×844 (r164-k).
 *
 * شريط التنقّل السفلي (BottomNav — 5 وجهات لكل دور) يظهر في النطاق
 * الضيق فقط؛ النقر على «مقرراتي» يستقر في القائمة ويعرض عنوانها.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT', viewport: { width: 390, height: 844 } });

test.describe('التنقّل السفلي على الجوال', () => {
  test('شريط 390×844: «مقرراتي» ينقل إلى قائمة المقرّرات بعنوانها', async ({ page }) => {
    await page.goto('/student/dashboard');

    const nav = page.getByRole('navigation', { name: 'التنقّل السريع' });
    await expect(nav).toBeVisible();
    // خمس وجهات الطالب: الرئيسية · مقرراتي · المساعد · الإشعارات · حسابي
    for (const label of ['الرئيسية', 'مقرراتي', 'المساعد', 'الإشعارات', 'حسابي']) {
      await expect(nav.getByRole('link', { name: label, exact: true })).toBeVisible();
    }

    await nav.getByRole('link', { name: 'مقرراتي', exact: true }).click();
    await expect(page).toHaveURL(/\/student\/courses$/);
    await expect(page.locator('h1.page-title')).toHaveText('مقرّراتي الدراسية');
  });
});
