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
    /* R189→R287 re-pin: the masthead — the patterns PageHeader h1
       carries the nav-label identity («لوحة التحكم»، r183-B6 contract),
       the greeting + name + faculty ride pf-page-desc, and the KPI row
       is the StatLine (pf-statlabel). */
    const h1 = page.locator('h1.pf-page-title');
    await expect(h1).toHaveText('لوحة التحكم');
    const subtitle = page.locator('.pf-page-desc').first();
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

    /* R304 re-pin: the resume card left the TodayList — it is the
       dashboard's ONE hero band now (.dash-resume-card.stu-hero,
       DashResumeHero): the eyebrow carries the «أكمل من حيث توقفت»
       verb, the main column the course name + lecture ordinal/title,
       and the side note the code + lecture clock. The hero CTA is the
       a.btn.accent whose href goes straight to the paused lecture. */
    const resume = page.locator('.dash-resume-card');
    await expect(resume).toBeVisible();
    await expect(resume.locator('.dash-resume-eyebrow')).toHaveText('أكمل من حيث توقفت');
    await expect(resume).toContainText('مقدمة في الخوارزميات');
    await expect(resume).toContainText('CS-201');
    await expect(resume).toContainText('الخوارزميات الجشعة');
    await expect(
      resume.locator('a[href="/student/lectures/lec_e2e_greedy"]'),
    ).toBeVisible();
  });

  test('الأجندة تعرض حصص اليوم/الغد والمهمة القادمة مع تسمية الموعد', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* R189 re-pin: the agenda is the TODAY ledger + the week ledger.
       حصة اليوم تقود سجلّ اليوم؛ والمهمة بعد 3 أيام تسكن سجلّ الأسبوع. */
    await expect(page.getByRole('heading', { name: 'اليوم', exact: true })).toBeVisible();
    await expect(page.getByText('المهام والفصول القادمة', { exact: true })).toHaveCount(0);

    // حصة اليوم — في سجلّ «اليوم»، التسمية الحرفية «اليوم» من DAY_LABEL.
    // (R287: نحدّد بالـhref — صفّ «أكمل من حيث توقفت» يحمل نفس اسم المقرّر في عنوانه.)
    const todayRow = page.locator('li.pf-today-item', { hasText: 'قاعة A2' });
    await expect(todayRow).toContainText('مقدمة في الخوارزميات');
    await expect(todayRow).toContainText('اليوم');
    // مهمة بعد 3 أيام — formatDue على ساعة مجمّدة، في سجلّ الأسبوع.
    const week = page.locator('section[aria-label="التزامات الأسبوع القادم"]');
    await expect(week).toBeVisible();
    await expect(week).toContainText('أسبوعك القادم');
    const taskRow = week.locator('a.week-item', { hasText: 'واجب الأسبوع الثالث' });
    await expect(taskRow).toContainText('بعد 3 أيام');
    // صف الأجندة: العنوان نفسه هو الرابط (PP-X2 audit P1-8 — Link على مستوى الصف).
    await expect(
      page.locator('a.pf-today-link[href="/student/courses/offr_e2e_algorithms"]'),
    ).toBeVisible();
  });
});
