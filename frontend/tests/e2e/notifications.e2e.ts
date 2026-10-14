/**
 * notifications.e2e.ts — جرس الإشعارات ولوحته (r164-k).
 *
 * يثبّت: عدّاد غير المقروء من meta.unread (استطلاع limit=1)، فتح
 * اللوحة، صفوف الإشعارات مع الزمن النسبي على الساعة المجمّدة
 * («منذ ساعتين» — timeAgoAr)، وواجهة «تعليم الكل كمقروء»، ثم النقر
 * على صف يقود إلى صفحة /alerts للدور.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT' });

test.describe('الإشعارات', () => {
  test('الجرس يعرض عدّاد غير المقروء واللوحة تعرض الصفوف وتستقر في /alerts', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* العدّاد قبل الفتح — arUnit(2, …) → «إشعاران غير مقروءان» */
    const bell = page.getByRole('button', { name: 'إشعاران غير مقروءان' });
    await expect(bell).toBeVisible();
    await expect(page.locator('.topbar-notif-badge')).toHaveText('2');

    /* الفتح — اللوحة نفسها سطح 012-spec (portal .notification-panel) */
    await bell.click();
    const panel = page.locator('.notification-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.notif-panel-title')).toHaveText('الإشعارات');

    /* الصفوف — عنوان أول إشعار + زمنه النسبي من الساعة المجمّدة */
    const item = page.locator('.notif-item', { hasText: 'تم نشر درجة الواجب الثاني' });
    await expect(item).toBeVisible();
    await expect(item).toContainText('منذ ساعتين');

    /* واجهة الإجراء الجماعي (bulk) */
    await expect(page.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeVisible();

    /* النقر على الصف يقود إلى صفحة التنبيهات الكاملة للدور */
    await item.click();
    await expect(page).toHaveURL(/\/student\/alerts$/);
    await expect(page.locator('h1.page-title')).toBeVisible();
  });
});
