/**
 * quality-moderation.e2e.ts — مراجعة الجودة لقوالب الاختبارات (r165h).
 *
 * يثبّت رحلة مكتب الجودة على /quality/exam-moderation: الطابور
 * بمؤشّراته (بانتظار المراجعة / أسئلة بانتظار الفحص)، فتح المعاينة
 * (أسئلة القالب بشارات نوعها وصعوبتها ومفتاح الإجابة وشارة «موقوف»)،
 * ثم القرار: اعتماد بملاحظة، ورفض عبر ConfirmDialog الحرفيّ — والقالب
 * المقضيّ عليه يخرج من الطابور عند إعادة الجلب (نقل وهمي STATEFUL)
 * والجسم المُرسل (approve/note) يُلتقط ويُثبّت حرفيًا.
 */
import { test, expect } from './fixtures/e2e';
import { MODERATION_QUEUE, MODERATION_TEMPLATES } from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk, type StatefulMockRoute } from './fixtures/mock-transport';

test.use({ e2eRole: 'QUALITY' });

/**
 * نقل الصفحة لاختباري الجودة: الطابور يُسقط القوالب المقضيّ عليها
 * عند إعادة الجلب (إبطال ['exams'] من الطفرة هو المسار المرسّخ)،
 * ومعاينة القالب ساكنة من المفتاح، والقرار المُرسل يُلتقط لتثبيت
 * الشكل الحرفي على السلك.
 */
function qualityRoutes(
  decided: Set<string>,
  moderateBodies: Array<{ approve: boolean; note?: string }>,
): StatefulMockRoute[] {
  return [
    {
      method: 'GET',
      pattern: '**/api/v1/exams/moderation-queue',
      fulfill: async ({ route }) => {
        await statefulOk(route, MODERATION_QUEUE.filter((t) => !decided.has(t.id)));
      },
    },
    {
      method: 'GET',
      pattern: '**/api/v1/exams/templates/*',
      fulfill: async ({ route, url }) => {
        const id = url.pathname.split('/').pop() ?? '';
        await statefulOk(route, MODERATION_TEMPLATES[id]);
      },
    },
    {
      method: 'POST',
      pattern: '**/api/v1/exams/templates/*/moderate',
      fulfill: async ({ route, url }) => {
        const id = url.pathname.match(/templates\/([^/]+)\/moderate$/)?.[1] ?? '';
        const body = route.request().postDataJSON() as { approve: boolean; note?: string };
        decided.add(id);
        moderateBodies.push(body);
        await statefulOk(route, { id, status: body.approve ? 'APPROVED' : 'REJECTED' });
      },
    },
  ];
}

test.describe('مراجعة قوالب الاختبارات', () => {
  test('المعاينة ثم الاعتماد: القالب يخرج من الطابور والملاحظة تُرسل', async ({ page }) => {
    const decided = new Set<string>();
    const moderateBodies: Array<{ approve: boolean; note?: string }> = [];
    await installStatefulApi(page, qualityRoutes(decided, moderateBodies));

    await page.goto('/quality/exam-moderation');
    await expect(page).toHaveTitle('مراجعة الاختبارات · مدارك');
    await expect(page.locator('h1.page-title')).toHaveText('مراجعة الاختبارات');
    await expect(page.locator('.page-subtitle')).toContainText('صلاحية حصرية لمكتب الجودة');

    /* المؤشّرات مشتقّة من الطابور نفسه: قالبان + 3 أسئلة بانتظار الفحص
     * (شريط المؤشّرات الطباعي — StatStrip بدل بطاقات الأيقونات). */
    const pendingCell = page.locator('.stat-cell', { hasText: 'بانتظار المراجعة' });
    await expect(pendingCell.locator('.stat-value')).toHaveText('2');
    await expect(
      page.locator('.stat-cell', { hasText: 'أسئلة بانتظار الفحص' }).locator('.stat-value'),
    ).toHaveText('3');

    /* صفّ القالب: العنوان + شارة النوع + المقرّر + العدّ + مقدّمه.
     * العدّ بصيغة الأسماء المعدودة (سؤالان · 20 دقيقة — 22-c). */
    const quizRow = page.locator('.oex-mod-row', { hasText: 'اختبار قصير — الوحدة الرابعة' });
    await expect(quizRow).toContainText('اختبار قصير');
    await expect(quizRow).toContainText('مقدمة في الخوارزميات');
    await expect(quizRow).toContainText('سؤالان · 20 دقيقة');
    await expect(quizRow).toContainText('قدّمه: ليلى الفيتوري');

    /* عمر الانتظار (createdAt يُعرض أخيرًا — الساعة مجمّدة على
     * FIXED_NOW: القالب قدِّم قبل 30 ساعة → «منذ يوم»، والنهائي قبل
     * 70 ساعة → «منذ 3 أيام») وإفصاح ترتيب الطابور بالأقدم أولًا. */
    await expect(quizRow).toContainText('بانتظار المراجعة منذ يوم');
    await expect(
      page.locator('.oex-mod-row', { hasText: 'اختبار نهائي — الشبكات' }),
    ).toContainText('بانتظار المراجعة منذ 3 أيام');
    await expect(page.getByText('الطابور بالأقدم أولًا')).toBeVisible();

    /* فتح المعاينة — لوحة الأسئلة قبل القرار (r155b). */
    await quizRow.getByRole('button', { name: 'مراجعة' }).click();
    const panel = page.getByRole('region', { name: 'مراجعة اختبار قصير — الوحدة الرابعة' });
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('أسئلة القالب — سؤالان');
    /* السؤال الأول: نصّ + نوع + صعوبة + مفتاح الإجابة (يظهر لمراجع
     * الجودة من الخلفية — canSeeAnswers). */
    const mcq = panel.locator('.list-row', { hasText: 'ما التعقيد الزمني للبحث الثنائي' });
    await expect(mcq).toContainText('اختيار من متعدد');
    await expect(mcq).toContainText('سهل');
    await expect(mcq).toContainText('الإجابة الصحيحة: O(log n)');
    /* الثاني: سؤال قصير بشارة «موقوف» وسقف نقاط معدَّلة. */
    const short = panel.locator('.list-row', { hasText: 'عرّف خاصية البنية الفرعية المثلى' });
    await expect(short).toContainText('إجابة قصيرة');
    await expect(short).toContainText('موقوف');

    /* ملاحظة الراجع تُرسل مع الاعتماد حرفيًا. */
    const note = 'الأسئلة سليمة؛ أضف مثالًا أدقّ للسؤال الثاني قبل النشر.';
    await page.getByLabel('ملاحظات المراجعة للمؤلف').fill(note);
    await panel.getByRole('button', { name: 'اعتماد' }).click();

    /* القرار: اللوحة تُغلق، والقالب يخرج من الطابور عند إعادة الجلب —
     * المؤشّر يتراجع إلى 1 والصفّ الآخر باقٍ. */
    await expect(page.getByRole('region', { name: 'مراجعة اختبار قصير — الوحدة الرابعة' })).toHaveCount(0);
    await expect(page.locator('.oex-mod-row', { hasText: 'اختبار قصير — الوحدة الرابعة' })).toHaveCount(0);
    await expect(pendingCell.locator('.stat-value')).toHaveText('1');
    await expect(page.locator('.oex-mod-row', { hasText: 'اختبار نهائي — الشبكات' })).toBeVisible();

    expect(moderateBodies).toEqual([{ approve: true, note }]);
  });

  test('الرفض عبر حوار التأكيد: نصّ العواقب والقالب يخرج أيضًا', async ({ page }) => {
    const decided = new Set<string>();
    const moderateBodies: Array<{ approve: boolean; note?: string }> = [];
    await installStatefulApi(page, qualityRoutes(decided, moderateBodies));

    await page.goto('/quality/exam-moderation');

    /* فتح مراجعة القالب الموحّد (بلا مقرّر — «موحد» على السلك). */
    const finalRow = page.locator('.oex-mod-row', { hasText: 'اختبار نهائي — الشبكات' });
    await finalRow.getByRole('button', { name: 'مراجعة' }).click();
    const panel = page.getByRole('region', { name: 'مراجعة اختبار نهائي — الشبكات' });
    await expect(panel).toContainText('أسئلة القالب — سؤال واحد');
    await expect(panel.locator('.list-row', { hasText: 'بروتوكول TCP' })).toContainText('صح أم خطأ');

    const note = 'تغطية نصف المنهج فقط — أعِد بناء النطاق.';
    await page.getByLabel('ملاحظات المراجعة للمؤلف').fill(note);

    /* الرفض قرار لا رجعة فيه — حوار تأكيد بنصّ العواقب. */
    await panel.getByRole('button', { name: 'رفض' }).click();
    const dialog = page.getByRole('dialog', { name: 'رفض قالب الاختبار' });
    await expect(dialog.locator('.owner-confirm-message')).toContainText(
      'سيُرفض القالب ويُعاد إلى مؤلفه مع ملاحظاتك، ويخرج من قائمة الانتظار. لا يمكن التراجع عن هذا القرار.',
    );
    await expect(dialog.getByRole('button', { name: 'مراجعة القالب' })).toBeVisible();
    await dialog.getByRole('button', { name: 'رفض القالب' }).click();

    /* القرار وقع: الحوار أُغلق، القالب المرفوض خرج، والآخر بانتظار. */
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('.oex-mod-row', { hasText: 'اختبار نهائي — الشبكات' })).toHaveCount(0);
    await expect(page.locator('.oex-mod-row', { hasText: 'اختبار قصير — الوحدة الرابعة' })).toBeVisible();

    expect(moderateBodies).toEqual([{ approve: false, note }]);
  });
});
