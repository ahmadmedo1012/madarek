/**
 * student-dashboard.e2e.ts — لوحة تحكم الطالب (r164-k).
 *
 * يثبّت رحلة الهبوط الأساسية للطالب: التحية بالاسم من الجلسة،
 * صفّ KPI، بطاقة «أكمل من حيث توقفت» (PP-X2)، والأجندة المركّبة من
 * الحصص/المهام — كلها من حمولة /me/dashboard + /me/resume الوهمية
 * الملتزمة بعقد الأظرف الحقيقي.
 */
import { test, expect } from './fixtures/e2e';
import { GREETING_RE } from './fixtures/api-fixtures';

test.use({ e2eRole: 'STUDENT' });

test.describe('لوحة تحكم الطالب', () => {
  test('التحية والهوية وصفّ KPI يُعرضون ببيانات حقيقية', async ({ page }) => {
    await page.goto('/student/dashboard');

    // التحية من الساعة المجمدة (10:00 UTC → «صباح الخير») + الاسم من
    // جلسة mdrk-auth المبذورة.
    /* R189 re-pin: the masthead — h1 carries the nav-label identity
       («لوحة التحكم»، r183-B6 contract), the greeting + name + faculty
       ride the subtitle, and the KPI row is the typographic stat strip. */
    const h1 = page.locator('h1.page-title');
    await expect(h1).toHaveText('لوحة التحكم');
    const subtitle = page.locator('.page-subtitle').first();
    await expect(subtitle).toContainText(GREETING_RE);
    await expect(subtitle).toContainText('أحمد');
    await expect(subtitle).toContainText('كلية الهندسة');

    // صفّ المؤشرات — التسميات الخمس الحقيقية (الأرقام تتظاهر عبر CountIn).
    for (const label of ['المعدل التراكمي', 'نسبة الحضور', 'مهام معلّقة', 'نقاط الإنجاز', 'إنجاز المقرّرات']) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
  });

  test('بطاقة «أكمل من حيث توقفت» تعرض المحاضرة المتوقّفة و CTA مباشرًا إليها', async ({ page }) => {
    await page.goto('/student/dashboard');

    const resume = page.locator('section[aria-label="أكمل من حيث توقفت"]');
    await expect(resume).toBeVisible();
    await expect(resume).toContainText('مقدمة في الخوارزميات');
    await expect(resume).toContainText('CS-201');
    await expect(resume).toContainText('الخوارزميات الجشعة');

    // CTA الابتدائي للصفحة: رابط واحد إلى المحاضرة نفسها.
    const cta = resume.getByRole('link', { name: 'متابعة المحاضرة' });
    await expect(cta).toHaveAttribute('href', '/student/lectures/lec_e2e_greedy');
  });

  test('الأجندة تعرض حصص اليوم/الغد والمهمة القادمة مع تسمية الموعد', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* R189 re-pin: the agenda is the TODAY ledger + the week ledger.
       حصة اليوم تقود سجلّ اليوم؛ والمهمة بعد 3 أيام تسكن سجلّ الأسبوع. */
    await expect(page.getByRole('heading', { name: 'جدول اليوم' })).toBeVisible();
    await expect(page.getByText('المهام والفصول القادمة', { exact: true })).toHaveCount(0);

    // حصة اليوم — في سجلّ اليوم، التسمية الحرفية «اليوم» من DAY_LABEL.
    const todayRow = page.locator('.ledger-row', { hasText: 'مقدمة في الخوارزميات' });
    await expect(todayRow).toContainText('اليوم');
    // مهمة بعد 3 أيام — formatDue على ساعة مجمّدة، في سجلّ الأسبوع.
    const week = page.locator('.ledger', { hasText: 'أسبوعك القادم' });
    await expect(week).toBeVisible();
    const taskRow = week.locator('.week-item', { hasText: 'واجب الأسبوع الثالث' });
    await expect(taskRow).toContainText('بعد 3 أيام');
    // صف الأجندة هو نفسه الرابط (PP-X2 audit P1-8 — Link على مستوى الصف).
    await expect(todayRow).toHaveAttribute('href', '/student/courses/offr_e2e_algorithms');
  });
});
