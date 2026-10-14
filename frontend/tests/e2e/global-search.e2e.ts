/**
 * global-search.e2e.ts — لوحة الأوامر والبحث الشامل ⌘K (r164-k).
 *
 * الوتر مملوك من AppShell (⌘K/Ctrl+K يفتح اللوحة على كل الأدوار).
 * الرحلة: فتح → كتابة → انتظار debounce (300ms) + GET /search/global
 * → أقسام النتائج الحقيقية → اختيار نتيجة يغلق اللوحة ويستقر في
 * وجهة href نفسها.
 */
import { test, expect } from './fixtures/e2e';
import { OFFERING_ID } from './fixtures/api-fixtures';

test.use({ e2eRole: 'STUDENT' });

test.describe('لوحة الأوامر والبحث الشامل', () => {
  test('Ctrl+K يفتح اللوحة، والبحث يعرض نتائج مقرّر، والاختيار يستقر في وجهته', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* الفتح بالوتر */
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    /* إجراءات سريعة تظهر قبل كتابة أي شيء (وجهات الدور) */
    await expect(page.getByText('إجراءات سريعة')).toBeVisible();

    /* كتابة استعلام عربي → debounce → نتائج /search/global */
    await input.fill('خوارزم');
    const coursesSection = page.locator('.search-section', { hasText: 'مقررات' });
    await expect(coursesSection).toBeVisible();

    const hit = coursesSection.getByRole('option', { name: /مقدمة في الخوارزميات/ });
    await expect(hit).toBeVisible();
    await expect(hit).toContainText('CS-201');

    /* الاختيار: يغلق اللوحة ويستقر في تفاصيل المقرّر */
    await hit.click();
    await expect(page).toHaveURL(new RegExp(`/student/courses/${OFFERING_ID}$`));
    await expect(page).toHaveTitle('تفاصيل المقرّر · مدارك');
    // اللوحة أُغلقت بالتنقّل (goTo يستدعي onClose).
    await expect(page.getByRole('combobox', { name: 'الأوامر والبحث' })).toHaveCount(0);
  });
});
