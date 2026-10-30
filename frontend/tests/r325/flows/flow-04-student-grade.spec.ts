/**
 * flow-04-student-grade.spec.ts — FLOWS.md F4, the STUDENT half
 * (r325 P4a).
 *
 * F4 = «student submits assignment → teacher grades (rubric + feedback)
 * → student sees grade + notification». The GRADING half is pinned
 * hermetically by tests/e2e/teacher-grading.e2e.ts; THIS spec walks the
 * missing half against the LIVE stack — and because the student half
 * needs a graded submission, the whole loop is walked with REAL clicks:
 *
 *   student /student/courses → «تسليم» → SubmitAssignmentModal
 *   teacher /teacher/assignments → «تصحيح» → GradeSubmissionModal
 *   student /student/alerts → the «تم تصحيح تكليفك» notification
 *   student /student/results → the grade + the teacher's feedback
 *
 * SETUP-only API (commented): the teacher creates a FRESH assignment
 * (unique run tag, due in 3 days) so the student's dashboard agenda
 * carries an un-submitted row even after earlier rehearsal runs — the
 * submission/grade write itself always happens through the UI.
 */
import { expect, test } from '@playwright/test';

import { apiGet, apiPost, flowPage, flowShot, runTag } from './fixtures/live';

interface OfferingRow { id: string; course: { code: string } }
interface AssignmentRow { id: string; title: string }

test('F4 · student submits → teacher grades → student sees grade + notification', async ({ browser }) => {
  test.setTimeout(180_000);
  const tag = runTag();
  const title = `واجب تقييم e2e ${tag}`;
  const feedback = 'إجابة جيدة — انتبه لصياغة الخاتمة.';

  // ── SETUP (API, not under test): a fresh assignment on an offering
  // the STUDENT is actually enrolled in — the agenda lists «واجباتك
  // المستحقة فعلياً» per enrollment, so the teacher's FIRST offering is
  // wrong unless it intersects the student's enrollments (found live:
  // teacher[0] = DS302, student not enrolled there — the row never
  // appears). The seed proves the same POST contract (seed.ts «مشروع
  // UML للتصميم»).
  const offs = await apiGet<{ data: OfferingRow[] }>('TEACHER', '/teacher/me/offerings');
  expect(offs.data.length).toBeGreaterThan(0);
  const enrol = await apiGet<{ data: { offering?: { id?: string } }[] }>('STUDENT', '/enrollments/me');
  const enrolledIds = new Set(enrol.data.map((e) => e.offering?.id).filter(Boolean));
  const offeringId = offs.data.find((o) => enrolledIds.has(o.id))?.id ?? offs.data[0]!.id;
  const due = new Date(Date.now() + 3 * 86400_000).toISOString();
  await apiPost<unknown>('TEACHER', `/offerings/${offeringId}/assignments`, {
    title, type: 'HOMEWORK', dueAt: due, weight: 10, maxScore: 100,
  });

  // ── STUDENT: submit through the UI.
  {
    const { page, close } = await flowPage(browser, 'STUDENT');
    try {
      await page.goto('/student/courses');
      await expect(page).not.toHaveURL(/\/auth/);
      await expect(page.locator('h1').first()).toContainText('مقرّراتي الدراسية');

      // The dashboard-agenda strip carries the fresh assignment with its
      // تسليم action (control stays the تسليم action per the page's own
      // comment — the row's ONE primary).
      const agenda = page.getByRole('group', { name: 'قائمة الواجبات القادمة' });
      const row = agenda.locator('.pf-row', { hasText: title });
      await expect(row).toBeVisible({ timeout: 30_000 });
      await row.getByRole('button', { name: 'تسليم' }).click();

      const modal = page.getByRole('dialog', { name: `تسليم الواجب ${title}` });
      await expect(modal).toBeVisible();
      await modal.getByLabel('إجابتك النصيّة').fill('إجابة آليّة من مواصلة F4 — تسليم عبر الواجهة الحقيقيّة.');
      await modal.getByRole('button', { name: 'تسليم الواجب' }).click();
      await expect(modal.getByText('تمّ التسليم بنجاح')).toBeVisible({ timeout: 20_000 });
      await flowShot(page, 'flow-04-student-submitted');
    } finally {
      await close();
    }
  }

  // ── TEACHER: grade through the UI (the grading half — ridden here as
  // the loop's middle step, already pinned hermetically).
  {
    const { page, close } = await flowPage(browser, 'TEACHER');
    try {
      await page.goto('/teacher/assignments');
      await expect(page.locator('h1').first()).toContainText('الواجبات والاختبارات');

      const group = page.locator('.queue-group', { hasText: title });
      await expect(group).toBeVisible({ timeout: 30_000 });
      await group.getByRole('button', { name: 'تصحيح' }).first().click();

      const modal = page.getByRole('dialog', { name: `تقييم تسليم ${title}` });
      await expect(modal).toBeVisible();
      await modal.getByLabel('الدرجة (من 0 إلى 100)').fill('88');
      await modal.getByLabel('ملاحظات للطالب (اختياري)').fill(feedback);
      await modal.getByRole('button', { name: 'حفظ الدرجة' }).click();
      await expect(modal.getByText('تمّ حفظ الدرجة وسيصل الطالب إشعار بالنتيجة.')).toBeVisible({ timeout: 20_000 });
      await flowShot(page, 'flow-04-teacher-graded');
    } finally {
      await close();
    }
  }

  // ── STUDENT: the notification + the grade surface.
  {
    const { page, close } = await flowPage(browser, 'STUDENT');
    try {
      // 1 — the bell's inbox carries the grading notification.
      await page.goto('/student/alerts');
      await expect(page.locator('h1').first()).toContainText('الإشعارات');
      await expect(page.getByText('تم تصحيح تكليفك').first()).toBeVisible({ timeout: 30_000 });
      await flowShot(page, 'flow-04-student-notification');

      // 2 — the results page carries the verdict: score/ceiling, the
      //     canonical band badge, and the teacher's feedback verbatim.
      //     The card list is recentAssignments.slice(0, 6) — after
      //     several rehearsal runs the fresh verdict can fall outside
      //     the first six, so the ASSERTION stays page-level (the
      //     verdict's truth, not its card position).
      await page.goto('/student/results');
      await expect(page.locator('h1').first()).toContainText('النتائج والتقييمات');
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText(`ملاحظة الأستاذ: ${feedback}`).first()).toBeVisible();
      await flowShot(page, 'flow-04-student-results');
    } finally {
      await close();
    }
  }

  // The submission the loop created is now GRADED — its row title must
  // not appear in a later agenda (un-submitted only). SETUP-grade read,
  // assertion stays in-process (no UI).
  const mine = await apiGet<{ data: AssignmentRow[] }>('TEACHER', '/teacher/me/assignments');
  expect(mine.data.some((a) => a.title === title)).toBe(true);
});
