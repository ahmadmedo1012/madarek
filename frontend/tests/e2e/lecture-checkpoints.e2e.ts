/**
 * lecture-checkpoints.e2e.ts — نقاط التفاعل في مشغّل المحاضرة (r165h).
 *
 * يثبّت السلوك المرئي الحالي فقط: عنوان المحاضرة + عنصر الفيديو
 * (المقطع الحقيقي المشترك) + الفصول، ثم نقطة التفاعل عند ثانية 0 —
 * يفتح المؤقّت النموذج لحظة هبوط الحمولة (لا اعتماد على تشغيل)،
 * والإجابة الصحيحة تعرض تصحيحها الفوري («إجابة صحيحة!») مع زرّ
 * «متابعة المحاضرة» (عودة المشاهدة بعد الإجابة)، والإجابة الخطأ
 * تعرض «ليست الإجابة الصحيحة.» مع الشرح وتمييز الخيار الصحيح.
 * النسب المئوية للتقدّم متروكة عمدًا (r165b المجاور يغيّر حسابها).
 */
import { test, expect } from './fixtures/e2e';
import {
  CHECKPOINT_LECTURE,
  CHECKPOINT_LECTURE_ID,
  OFFERING_LECTURES_WITH_CHECKPOINT,
} from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk, type StatefulMockRoute } from './fixtures/mock-transport';

test.use({ e2eRole: 'STUDENT' });

/**
 * نقل الصفحة للمشغّل: محاضرة نقطة التفاعل + قائمة فصول المقرّر الموسّعة،
 * وردّ الإجابة اختياريّ (بغيابه يُجيب الجدول القياسي: صحيح بالخيار 0).
 * (مسارات متعدّدة — تُقدَّم عبر installStatefulApi لا apiOverrides
 * التي يبتلع Playwright أعدادها الأكثر من واحد.)
 */
function lectureRoutes(answerEnvelope?: unknown): StatefulMockRoute[] {
  const routes: StatefulMockRoute[] = [
    {
      method: 'GET',
      pattern: '**/api/v1/lectures/*',
      fulfill: async ({ route }) => {
        await statefulOk(route, CHECKPOINT_LECTURE);
      },
    },
    {
      method: 'GET',
      pattern: '**/api/v1/offerings/*/lectures*',
      fulfill: async ({ route }) => {
        await statefulOk(route, OFFERING_LECTURES_WITH_CHECKPOINT);
      },
    },
  ];
  if (answerEnvelope !== undefined) {
    routes.push({
      method: 'POST',
      pattern: '**/api/v1/lectures/*/checkpoints/*/answer',
      fulfill: async ({ route }) => {
        await statefulOk(route, answerEnvelope);
      },
    });
  }
  return routes;
}

test.describe('نقاط التفاعل في مشغّل المحاضرة', () => {
  test('إجابة صحيحة: تصحيح فوري ثم «متابعة المحاضرة» يغلق النموذج', async ({ page }) => {
    await installStatefulApi(page, lectureRoutes());
    await page.goto(`/student/lectures/${CHECKPOINT_LECTURE_ID}`);
    await expect(page).toHaveTitle('مشغّل المحاضرة · مدارك');

    /* المشغّل: العنوان + عنصر الفيديو الحقيقي (المقطع المشترك) + الفصول. */
    await expect(page.getByText('تمارين تفاعلية على الجشع').first()).toBeVisible();
    await expect(page.locator('video').first()).toBeAttached();
    const chapters = page.locator('.chapter-row');
    await expect(chapters).toHaveCount(2);
    await expect(page.locator('.chapter-row', { hasText: 'مراجعة الخاصية' })).toBeVisible();

    /* نقطة التفاعل تفتح لحظة هبوط الحمولة (الثانية 0). */
    const modal = page.locator('.checkpoint-card');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.checkpoint-eyebrow')).toContainText('نقطة تفاعل');
    await expect(modal.locator('.checkpoint-question')).toHaveText(
      'أيّ شرط يضمن أن الاختيار المحلّي الأمثل يقود إلى حلٍّ عامٍّ أمثل؟',
    );
    await expect(modal.locator('.checkpoint-option')).toHaveCount(4);

    /* الخيار الصحيح (النقل القياسي: correctIndex 0) — تصحيح فوري. */
    await modal
      .locator('.checkpoint-option', { hasText: 'خاصية الاختيار الجشع والبنية الفرعية المثلى معًا' })
      .click();
    const result = modal.locator('.checkpoint-result.correct');
    await expect(result).toBeVisible();
    await expect(result).toContainText('إجابة صحيحة!');
    /* الخيار المُختار يُميَّز صحيحًا (فئة correct). */
    await expect(
      modal.locator('.checkpoint-option.correct', { hasText: 'خاصية الاختيار الجشع' }),
    ).toBeVisible();

    /* عودة المشاهدة — الزرّ الأساسي بعد الإجابة يغلق النموذج ويبقى
     * مغلقًا (لا إعادة فتح فورية). */
    await modal.getByRole('button', { name: 'متابعة المحاضرة' }).click();
    await expect(page.locator('.checkpoint-card')).toHaveCount(0);

    /* شريط التنقّل بين المحاضرات: السابقة هي محاضرة الجشع (الفهرس
     * 3 من قائمة فصول المقرّر الموسّعة). (المحدِّد عبر <nav> — روابط
     * «السابقة/التالية» تحمل صنف btn فقط، لا lecture-nav.) */
    await expect(page.locator('nav.lecture-nav a', { hasText: 'المحاضرة السابقة' })).toHaveAttribute(
      'href',
      '/student/lectures/lec_e2e_greedy',
    );
  });

  test('إجابة خطأ: «ليست الإجابة الصحيحة.» مع الشرح وتمييز الخيار الصحيح', async ({ page }) => {
    /* الخلفية تحكم: أجاب الطالب خطأ، والصحيح هو الخيار الأول. */
    await installStatefulApi(page, lectureRoutes({
      correct: false,
      correctIndex: 0,
      explanation: 'الشرطان معًا هما الجواب؛ ترتيب المدخلات وحده لا يكفي.',
    }));
    await page.goto(`/student/lectures/${CHECKPOINT_LECTURE_ID}`);

    /* مخرج الصدق قبل الإجابة: «تخطّي» مرئي دائمًا. */
    const modal = page.locator('.checkpoint-card');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole('button', { name: 'تخطّي' })).toBeVisible();

    /* الإجابة الخاطئة — التصحيح الفوري يشرح ويميّز الصحيح. */
    await modal.locator('.checkpoint-option', { hasText: 'ترتيب المدخلات تصاعديًا' }).click();
    const result = modal.locator('.checkpoint-result.incorrect');
    await expect(result).toBeVisible();
    await expect(result).toContainText('ليست الإجابة الصحيحة.');
    await expect(result).toContainText('الشرطان معًا هما الجواب؛ ترتيب المدخلات وحده لا يكفي.');
    await expect(
      modal.locator('.checkpoint-option.correct', { hasText: 'خاصية الاختيار الجشع' }),
    ).toBeVisible();

    /* العودة للمشاهدة متاحة بعد الإجابة الخطأ كذلك. */
    await modal.getByRole('button', { name: 'متابعة المحاضرة' }).click();
    await expect(page.locator('.checkpoint-card')).toHaveCount(0);
  });
});
