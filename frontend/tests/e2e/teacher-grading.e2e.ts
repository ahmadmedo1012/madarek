/**
 * teacher-grading.e2e.ts — حلقة تصحيح الأستاذ (r165h).
 *
 * يثبّت فعل التصحيح نفسه على /teacher/assignments: طابور التسليمات
 * بانتظار التقييم (مجموعات بالسقف والموعد، شارة «متأخر»، الزمن النسبي)،
 * فتح نموذج التقييم بإجابة الطالب، سقف الدرجة (رفض 25 من 20 محليًا)،
 * ثم الحفظ: حالة «تمّ» داخل النموذج + إشعار toast + سقوط الصف المصحّح
 * من الطابور (نقل وهمي STATEFUL يُسقط الصف بعد درجةٍ فعلًا — الإبطال
 * وإعادة الجلب هما ما يُرسّخه الاختبار، وهو جار إصلاح r165a المجاور)،
 * وزر «تقييم التالي» يقود للطالب التالي بمسوّدة فارغة.
 */
import { test, expect } from './fixtures/e2e';
import {
  PENDING_SUBMISSIONS,
  TEACHER_ASSIGNMENTS,
  gradedSubmission,
} from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk, type StatefulMockRoute } from './fixtures/mock-transport';

test.use({ e2eRole: 'TEACHER' });

/**
 * نقل وهمي STATEFUL مشترك للاختبارين: قائمة الواجبات ساكنة، وطابور
 * التصحيح يُسقط الصفوف المصحّحة عند إعادة الجلب (إبطال النموذج هو
 * المسار المرسّخ)، والدرجة المُرسلة تُلتقط لتثبيت الشكل الحرفي على
 * السلك. (مساران هنا — فيتقدّمان عبر installStatefulApi لا
 * apiOverrides: أعداد الصفوف الأكثر من واحد يبتلعها Playwright.)
 */
function teacherRoutes(
  graded: Set<string>,
  gradeBodies: Array<{ grade: number; feedback?: string }>,
): StatefulMockRoute[] {
  return [
    {
      method: 'GET',
      pattern: '**/api/v1/teacher/me/assignments',
      fulfill: async ({ route }) => {
        await statefulOk(route, TEACHER_ASSIGNMENTS);
      },
    },
    {
      method: 'GET',
      pattern: '**/api/v1/teacher/me/pending-submissions',
      fulfill: async ({ route }) => {
        await statefulOk(route, PENDING_SUBMISSIONS.filter((s) => !graded.has(s.id)));
      },
    },
    {
      method: 'POST',
      pattern: '**/api/v1/submissions/*/grade',
      fulfill: async ({ route, url }) => {
        const id = url.pathname.match(/submissions\/([^/]+)\/grade$/)?.[1] ?? '';
        graded.add(id);
        gradeBodies.push(route.request().postDataJSON() as { grade: number; feedback?: string });
        await statefulOk(route, gradedSubmission(id, 17));
      },
    },
  ];
}

test.describe('حلقة تصحيح الأستاذ', () => {
  test('الطابور يُعرض بالمجموعات والسقف والشارات النسبية', async ({ page }) => {
    /* الطابور من النقل الوهمي STATEFUL — بلا أي درجة هنا، صفوان. */
    await installStatefulApi(page, teacherRoutes(new Set(), []));
    await page.goto('/teacher/assignments');
    await expect(page).toHaveTitle('الواجبات والاختبارات · مدارك');
    await expect(page.locator('h1.page-title')).toHaveText('الواجبات والاختبارات');

    /* بطاقة الطابور — العدّ العربي المزدوج + رأس المجموعة (العنوان،
     * الكود، سقف الدرجة، موعد الاستحقاق النسبي على الساعة المجمّدة). */
    const queueCard = page.locator('.card', { hasText: 'تسليمات بانتظار التقييم' });
    await expect(queueCard).toContainText('تسليمان بانتظار درجتك');
    const group = page.locator('.queue-group', { hasText: 'واجب الأسبوع الثالث' });
    await expect(group).toContainText('CS-201');
    await expect(group).toContainText('يستحقّ بعد يومين');
    await expect(group).toContainText('الدرجة من 20');
    await expect(group).toContainText('تسليمان');

    /* الصفوف — الطالبة الأولى بلا شارة، والثاني «متأخر» مع زمن وصوله. */
    const onTimeRow = page.locator('.list-row', { hasText: 'مروة البراني' });
    await expect(onTimeRow).toContainText('وصل منذ ساعتين');
    await expect(onTimeRow).not.toContainText('متأخر');
    const lateRow = page.locator('.list-row', { hasText: 'سالم قدّور' });
    await expect(lateRow).toContainText('متأخر');
    await expect(lateRow).toContainText('وصل منذ يوم');
    await expect(onTimeRow.getByRole('button', { name: 'تقييم' })).toBeVisible();

    /* قائمة «جميع الواجبات» ساكنة بجانب الطابور. */
    await expect(page.locator('.card', { hasText: 'جميع الواجبات' })).toContainText('مقدمة في الخوارزميات');
  });

  test('تقييم تسليم: السقف يرفض 25، ثم 17 + ملاحظة تُحفظ والصف يخرج من الطابور', async ({ page }) => {
    /* الدرجة تُسقِط صفّها من الطابور عند إعادة الجلب، والجسم
     * المُرسل يُلتقط ليُثبّت الشكل الحرفي على السلك. */
    const graded = new Set<string>();
    const gradeBodies: Array<{ grade: number; feedback?: string }> = [];
    await installStatefulApi(page, teacherRoutes(graded, gradeBodies));

    await page.goto('/teacher/assignments');

    /* فتح نموذج التقييم من صف الطالبة الأولى. */
    await page.locator('.list-row', { hasText: 'مروة البراني' }).getByRole('button', { name: 'تقييم' }).click();
    const dialog = page.getByRole('dialog', { name: 'تقييم تسليم واجب الأسبوع الثالث' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.modal-title')).toHaveText('تقييم التسليم');
    await expect(dialog).toContainText('مروة البراني · CS-201 · وصل منذ ساعتين');
    /* إجابة الطالب داخل النموذج — ما يُصحّحه الأستاذ فعليًا. */
    await expect(dialog.locator('.grade-answer')).toContainText('إجابة الطالب');
    await expect(dialog.locator('.grade-answer')).toContainText('برهان البنية الفرعية المثلى');

    const score = dialog.getByLabel('الدرجة (من 0 إلى 20)');
    /* السقف المحلي: 25 من 20 تُرفض بلا أي نداء شبكي. */
    await score.fill('25');
    await dialog.getByRole('button', { name: 'حفظ الدرجة' }).click();
    await expect(dialog.getByText('الدرجة يجب ألّا تتجاوز 20.')).toBeVisible();

    /* الحفظ الصحيح: درجة + ملاحظة. */
    await score.fill('17');
    await dialog.getByLabel('ملاحظات للطالب (اختياري)').fill('برهان سليم؛ أضف مثال جدول الأنشطة.');
    await dialog.getByRole('button', { name: 'حفظ الدرجة' }).click();

    /* حالة «تمّ» داخل النموذج + toast بالعنوان الحرفي. */
    await expect(dialog.locator('.form-feedback.ok')).toHaveText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.');
    const toast = page.locator('.toast-success');
    await expect(toast.locator('.toast-title')).toHaveText('تمّ التقييم');

    /* الصف المصحّح خرج من الطابور والعدّ تراجع — إعادة الجلب بعد
     * الإبطال هي المسار المرسّخ. */
    const queueCard = page.locator('.card', { hasText: 'تسليمات بانتظار التقييم' });
    await expect(queueCard).toContainText('تسليم واحد بانتظار درجتك');
    await expect(page.locator('.list-row', { hasText: 'مروة البراني' })).toHaveCount(0);
    await expect(page.locator('.list-row', { hasText: 'سالم قدّور' })).toBeVisible();

    /* «تقييم التالي» — الطالب التالي بمسوّدة درجة فارغة (إعادة تركيب
     * keyed بالنموذج لا تُورّث درجة الصف السابق). */
    await dialog.getByRole('button', { name: 'تقييم التالي' }).click();
    const nextDialog = page.getByRole('dialog', { name: 'تقييم تسليم واجب الأسبوع الثالث' });
    await expect(nextDialog).toContainText('سالم قدّور');
    await expect(nextDialog.getByLabel('الدرجة (من 0 إلى 20)')).toHaveValue('');

    /* الشكل على السلك حرفيًا: درجة رقمية + ملاحظة نصية. */
    expect(gradeBodies).toEqual([
      { grade: 17, feedback: 'برهان سليم؛ أضف مثال جدول الأنشطة.' },
    ]);
  });
});
