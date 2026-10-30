/**
 * flow-02-assignment-authoring.spec.ts — FLOWS.md F2, the AUTHORING half
 * (r325 P4a).
 *
 * F2 = «teacher builds a course: weeks, material, lecture, assignment,
 * quiz». The material/lecture halves are pinned hermetically by
 * tests/e2e/r319-dashboard-material.e2e.ts + the r305 teacher suites;
 * THIS spec walks the missing half against the LIVE stack with real
 * clicks: /teacher/assignments → «واجب جديد» → the AssignmentFormModal
 * (offering, title, type, dueAt, weight, maxScore) → POST
 * /offerings/:id/assignments through the UI → the assignment appears in
 * the teacher's list.
 *
 * No SETUP API at all — the write itself IS the proof. Titles carry a
 * run tag so re-runs never collide with their own past rows.
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot, localDateTimeInput, runTag } from './fixtures/live';

test('F2 · teacher authors an assignment through the UI and sees it listed', async ({ browser }) => {
  test.setTimeout(120_000);
  const tag = runTag();
  const title = `واجب e2e ${tag}`;

  const { page, close } = await flowPage(browser, 'TEACHER');
  try {
    // 1 — the assignments page opens on the live stack.
    await page.goto('/teacher/assignments');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('الواجبات والاختبارات');

    // 2 — the authoring modal.
    await page.getByRole('button', { name: 'واجب جديد' }).click();
    const modal = page.getByRole('dialog', { name: 'إنشاء واجب جديد' });
    await expect(modal).toBeVisible();
    // The offering select is pre-filled with the teacher's first real
    // offering (the seed pins all 8 zawia offerings to this teacher) —
    // a real option, never the empty placeholder.
    const offering = modal.getByLabel('المقرّر');
    await expect(offering).toBeVisible();
    await expect(offering.locator('option')).not.toHaveCount(0);

    // 3 — fill the form (title / type / dueAt / weight / maxScore / description).
    await modal.getByLabel('العنوان').fill(title);
    await modal.getByLabel('النوع').selectOption({ label: 'مشروع' });
    await modal.getByLabel('الموعد النهائي للتسليم').fill(localDateTimeInput(new Date(Date.now() + 5 * 86400_000)));
    await modal.getByLabel('الوزن (% من الدرجات)').fill('10');
    await modal.getByLabel('الدرجة العظمى').fill('100');
    await modal.getByLabel('الوصف (اختياري)').fill('وصف آلي للتأكيد على وصول النموذج كاملًا.');

    // 4 — submit; the toast + the inline success confirm the write.
    await modal.getByRole('button', { name: 'إنشاء الواجب' }).click();
    await expect(page.getByText('تمّ الإنشاء')).toBeVisible({ timeout: 20_000 });
    await expect(modal).toBeHidden();

    // 5 — the assignment appears in the teacher's own list.
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });

    await flowShot(page, 'flow-02-assignment-authored');
  } finally {
    await close();
  }
});
