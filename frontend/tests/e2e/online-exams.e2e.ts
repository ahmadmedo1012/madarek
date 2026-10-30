/**
 * online-exams.e2e.ts — قائمة الاختبارات الإلكترونية (r164-k).
 *
 * الحالتان الجوهريتان للقائمة (صفحة /student/online-exams):
 *   - محمّلة: قسم «متاح الآن» ببطاقة اختبار مفتوح (نافذة مفتوحة) +
 *     قسم «اختبارات أجريتها» بمحاولة مصحّحة (شارة النتيجة)؛
 *   - فارغة: الحالة الفارغة الصادقة عبر override لـ GET /exams/me.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT' });

test.describe('الاختبارات الإلكترونية — القائمة', () => {
  test('المحمّلة: اختبار متاح بنافذته + محاولة مصحّحة في السجل', async ({ page }) => {
    await page.goto('/student/online-exams');
    // (R321 re-pin — R287 precedent: the online-exams LIST joined the
    // patterns contract (PageFrame + patterns/PageHeader), so the h1
    // carries the family's pf-page-title class now, not page-title —
    // and toContainText: the decorative aria-hidden [01] page-index
    // span rides inside the h1.)
    await expect(page.locator('h1.pf-page-title')).toContainText('الاختبارات الإلكترونية');

    /* القسم المتاح — بطاقة الاختبار القصير */
    const quizCard = page.locator('.oex-row', { hasText: 'اختبار قصير — الوحدة الثالثة' });
    await expect(quizCard).toContainText('اختبار قصير · مقدمة في الخوارزميات');
    await expect(quizCard).toContainText('15 دقيقة');
    // 22-c counted nouns — 3–10 takes the plural form «أسئلة».
    await expect(quizCard).toContainText('8 أسئلة');
    await expect(quizCard).toContainText('درجة النجاح');
    // نافذة مفتوحة (examWindowState على ساعة مجمّدة) → يعرض موعد الإغلاق.
    await expect(quizCard).toContainText('يغلق');

    /* السجل — المحاولة المصحّحة بشارة النتيجة */
    const historyCard = page.locator('.oex-row', { hasText: 'اختبار نصفي — الخوارزميات' });
    await expect(historyCard).toContainText('82 / 100');
    await expect(historyCard).toContainText('ناجح');
    // نافذة منتهية → الشارة الصادقة «أغلق باب التسليم».
    await expect(historyCard).toContainText('أغلق باب التسليم');
  });

  test.describe('بحوض فارغ', () => {
    // override خاص بهذا الاختبار فقط: قائمة فارغة من «الخلفية».
    test.use({
      apiOverrides: [
        { method: 'GET', path: '/exams/me', json: { data: [] } },
      ],
    });

    test('الحالة الفارغة الصادقة — لا تُقرأ النتيجة الفارغة كخطأ', async ({ page }) => {
      await page.goto('/student/online-exams');
      await expect(
        page.getByText('لا توجد اختبارات متاحة حالياً'),
      ).toBeVisible();
    });
  });
});
