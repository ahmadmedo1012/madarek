/**
 * courses-journey.e2e.ts — رحلة المقرّرات (r164-k).
 *
 * مسار ثلاثي حقيقي: قائمة «مقرّراتي الدراسية» → بطاقة المقرّر →
 * تفاصيل العرض (offering full) → مشغّل المحاضرة. كل خطوة عبر روابط
 * DOM حقيقية وبيانات من النقل الوهمي (enrollments/me + offerings/full
 * + lectures/:id)، مع عناوين التبويب من resolveTitle (AppShell).
 */
import { test, expect } from './fixtures/e2e';
import { LECTURE_ID, OFFERING_ID } from './fixtures/api-fixtures';

test.use({ e2eRole: 'STUDENT' });

test.describe('رحلة المقرّرات', () => {
  test('القائمة → تفاصيل المقرّر → مشغّل المحاضرة', async ({ page }) => {
    /* 1 — قائمة المقرّرات */
    await page.goto('/student/courses');
    // usePageTitle: «<السياق> · مدارك».
    await expect(page).toHaveTitle('مقرّراتي الدراسية · مدارك');
    // r173a: شريط المؤشرات الأربعة (MetricCard) صار سطر ملخّص واحدًا
    // خفيفًا — نفس الأعداد (تسجيلتان في التثبيت الوهمي → «مقرّران
    // مسجّلان»)، re-pin صادق لواجهة الصفحة الجديدة.
    await expect(page.getByText('مقرّران مسجّلان', { exact: false })).toBeVisible();

    /* R287 re-pin (r222 reskin): the course card is a RowItem — the
       title Link carries the name; the code badge + teacher ride the
       row meta. Scope the row, pin the anchor, click through it. */
    const card = page.locator(`a[href="/student/courses/${OFFERING_ID}"]`);
    const cardRow = page.locator('[aria-label="قائمة المقرّرات المسجّلة"] .pf-row', { hasText: 'مقدمة في الخوارزميات' });
    await expect(card).toContainText('مقدمة في الخوارزميات');
    await expect(cardRow).toContainText('CS-201');
    await expect(cardRow).toContainText('د. ليلى الفيتوري');

    /* 2 — تفاصيل المقرّر */
    await card.click();
    await expect(page).toHaveURL(new RegExp(`/student/courses/${OFFERING_ID}$`));
    await expect(page).toHaveTitle('تفاصيل المقرّر · مدارك');
    // هيكل البطل: اسم المقرّر + الأستاذ (من offerings/full).
    await expect(page.getByText('مقدمة في الخوارزميات').first()).toBeVisible();
    await expect(page.getByText('ليلى الفيتوري').first()).toBeVisible();

    /* 3 — صف المحاضرة «التالية» ثم المشغّل */
    // r164-d: زرّ «التالي: المحاضرة» الرئيسيّ يقود للدرس غير المكتمل
    // نفسه — وجوده دليل دمج r164d؛ نثبّته ثم ندخل من صف القائمة.
    const nextCta = page.getByRole('link', { name: 'التالي: المحاضرة' });
    await expect(nextCta).toHaveAttribute('href', `/student/lectures/${LECTURE_ID}`);
    const lecRow = page.locator(`a.course-lec-row[href="/student/lectures/${LECTURE_ID}"]`);
    await expect(lecRow).toContainText('الخوارزميات الجشعة');
    await expect(lecRow).toContainText('المحاضرة');
    await lecRow.click();

    await expect(page).toHaveURL(new RegExp(`/student/lectures/${LECTURE_ID}$`));
    await expect(page).toHaveTitle('مشغّل المحاضرة · مدارك');
    // المشغّل يعرض عنوان المحاضرة + عنصر الفيديو + فصول المشاهدة.
    await expect(page.getByText('الخوارزميات الجشعة').first()).toBeVisible();
    await expect(page.locator('video').first()).toBeAttached();
    await expect(page.getByText('أمثلة وتطبيقات').first()).toBeVisible();
  });
});
