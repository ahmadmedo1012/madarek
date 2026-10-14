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
    const title = page.locator('h1.page-title');
    await expect(title).toContainText(GREETING_RE);
    await expect(title).toContainText('أحمد');

    // سطر الكلية/القسم من profile الوهمي.
    await expect(page.locator('.page-subtitle').first()).toContainText('كلية الهندسة');

    // صفّ KPI — التسميات الأربع الحقيقية (الأرقام تتظاهر عبر CountIn).
    for (const label of ['مقررات نشطة', 'نسبة الحضور', 'مهام معلّقة', 'نقاط الإنجاز']) {
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

    await expect(page.getByRole('heading', { name: 'المهام والفصول القادمة' })).toBeVisible();

    const agenda = page.locator('.dash-agenda-list');
    // حصة اليوم — التسمية الحرفية «اليوم» من DAY_LABEL.
    const todayRow = agenda.locator('.dash-agenda-item', { hasText: 'مقدمة في الخوارزميات' });
    await expect(todayRow).toContainText('اليوم');
    // مهمة بعد 3 أيام — formatDue على ساعة مجمّدة.
    const taskRow = agenda.locator('.dash-agenda-item', { hasText: 'واجب الأسبوع الثالث' });
    await expect(taskRow).toContainText('بعد 3 أيام');
    // صف الأجندة هو نفسه الرابط (PP-X2 audit P1-8 — Link على مستوى الصف).
    await expect(todayRow).toHaveAttribute('href', '/student/courses/offr_e2e_algorithms');
  });
});
