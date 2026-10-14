/**
 * admin-confirm.e2e.ts — حذف مقرّر بصلاحيات إدارية وتوابع (r165h).
 *
 * يثبّت مسار الحذف الخطير على /admin/courses عبر ConfirmDialog
 * الوصوليّ (قنص التركيز + Esc + role=dialog) مع حالتين:
 *   - الإلغاء: الحوار يُغلق بلا أي نداء DELETE والصف يبقى؛
 *   - الاعتماد على مقرّر له شُعب تدريسية: الخلفية تُجيب 409 بنصّها
 *     العربي الحرفي، فتظهر رسالة التبعية في toast «فشل الحذف» ويبقى
 *     المقرّر في السجلّ (الحذف لم يحدث — صادق حتى في الفشل).
 */
import { test, expect } from './fixtures/e2e';
import { ADMIN_COURSES, COURSE_DELETE_CONFLICT } from './fixtures/api-fixtures';
import { installStatefulApi, statefulJson, type StatefulMockRoute } from './fixtures/mock-transport';

test.use({ e2eRole: 'ADMIN' });

/**
 * نقل الصفحة لاختباري الحذف: السجل ساكن (ظرفه مرقّم: meta شقيقة
 * data — يُقدَّم خامًا عبر statefulJson)، والحذف يجيب دائمًا 409
 * التبعات بنصّ الخلفية الحرفي. (مساران — عبر installStatefulApi لا
 * apiOverrides التي يبتلع Playwright أعدادها الأكثر من واحد.)
 */
const adminRoutes: StatefulMockRoute[] = [
  {
    method: 'GET',
    pattern: '**/api/v1/admin/courses*',
    fulfill: async ({ route }) => {
      await statefulJson(route, 200, ADMIN_COURSES);
    },
  },
  {
    method: 'DELETE',
    pattern: '**/api/v1/courses/*',
    fulfill: async ({ route }) => {
      await statefulJson(route, 409, COURSE_DELETE_CONFLICT);
    },
  },
];

test.describe('حذف مقرّر بصلاحيات إدارية', () => {
  test.beforeEach(async ({ page }) => {
    await installStatefulApi(page, adminRoutes);
    await page.goto('/admin/courses');
    await expect(page).toHaveTitle('إدارة المقرّرات · مدارك');
    // العدّ من meta.total: مقرّران في الجامعة.
    await expect(page.locator('.page-subtitle')).toContainText('مقرّران في الجامعة');
    const row = page.locator('tr', { hasText: 'مقدمة في الخوارزميات' });
    await expect(row).toContainText('CS-201');
    await expect(row).toContainText('كلية الهندسة');
  });

  test('الإلغاء: الحوار يُغلق بلا نداء DELETE والصف يبقى', async ({ page }) => {
    /* كل نداء DELETE يُسجَّل — الإلغاء يجب ألّا يصنع واحدًا أصلًا. */
    const deleteUrls: string[] = [];
    page.on('request', (req) => {
      if (req.method() === 'DELETE' && req.url().includes('/api/v1/courses/')) {
        deleteUrls.push(req.url());
      }
    });

    await page.getByRole('button', { name: 'حذف مقدمة في الخوارزميات' }).click();

    /* الحوار الوصوليّ: العنوان + رسالة العواقب الحرفية + الزرّان. */
    const dialog = page.getByRole('dialog', { name: 'حذف المقرّر' });
    await expect(dialog.locator('.owner-confirm-title')).toHaveText('حذف المقرّر');
    await expect(dialog.locator('.owner-confirm-message')).toContainText(
      'سيُحذف «مقدمة في الخوارزميات» نهائيًا من السجلّ الجامعي. لا يمكن التراجع عن هذا الإجراء.',
    );
    await expect(dialog.getByRole('button', { name: 'إلغاء' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'حذف نهائي' })).toBeVisible();

    /* الإلغاء — الحوار يختفي والصف كما هو بلا أي نداء حذف. */
    await dialog.getByRole('button', { name: 'إلغاء' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('tr', { hasText: 'مقدمة في الخوارزميات' })).toBeVisible();
    expect(deleteUrls).toEqual([]);
  });

  test('الاعتماد مع تبعات: 409 الشُعب يظهر في toast والصف يبقى', async ({ page }) => {
    await page.getByRole('button', { name: 'حذف مقدمة في الخوارزميات' }).click();
    const dialog = page.getByRole('dialog', { name: 'حذف المقرّر' });
    await dialog.getByRole('button', { name: 'حذف نهائي' }).click();

    /* الحوار أُغلق قبل الطفرة، والفشل يظهر في toast الخطأ (لا
     * يُخفي نفسه تلقائيًا) بنصّ الخلفية العربي الحرفي. */
    await expect(page.getByRole('dialog')).toHaveCount(0);
    const toast = page.locator('.toast-error');
    await expect(toast.locator('.toast-title')).toHaveText('فشل الحذف');
    await expect(toast.locator('.toast-desc')).toContainText(
      'لا يمكن حذف المقرر: ما زالت له شُعب تدريسية مسجّلة',
    );

    /* المقرّر لم يُحذف — الصف باقٍ والعدّ لم يتغيّر. */
    await expect(page.locator('tr', { hasText: 'مقدمة في الخوارزميات' })).toBeVisible();
    await expect(page.locator('.page-subtitle')).toContainText('مقرّران في الجامعة');
  });
});
