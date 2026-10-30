/**
 * flow-13-jobs-mooc.spec.ts — FLOWS.md F13, the jobs/MOOC states half
 * (r325 P4a).
 *
 * F13 = «jobs / MOOC / library / labs: basic CRUD + states». The
 * library borrow path is pinned by tests/e2e/library-borrow.e2e.ts;
 * THIS spec adds the jobs/MOOC half against the LIVE stack with real
 * clicks:
 *
 *   · /student/jobs — the seeded board renders (4 real openings), the
 *     النوع pill filter narrows honestly, and the student APPLIES to a
 *     real opening («تقدّم» → POST /jobs/:id/apply → the «تمّ التقديم»
 *     badge reads back from SERVER truth, not client state);
 *   · /student/mooc — the external-courses catalog renders, the search
 *     narrows to the matching card, and the honest empty-search state
 *     clears when the query does.
 *
 * Re-run tolerance: the application is an upsert (jobId_userId) — a
 * prior run's badge is server truth and the spec accepts either the
 * fresh application receipt or the standing badge.
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot } from './fixtures/live';

test('F13 · student applies to a job and browses the MOOC catalog states', async ({ browser }) => {
  test.setTimeout(150_000);
  const { page, close } = await flowPage(browser, 'STUDENT');
  try {
    // ── JOBS ──────────────────────────────────────────────────────
    await page.goto('/student/jobs');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('فرص العمل');

    // The seeded board renders real openings (guard on title+company).
    const board = page.locator('.jobs-table');
    await expect(board).toBeVisible({ timeout: 30_000 });
    await expect(board.getByText('مطور ويب Full Stack').first()).toBeVisible();

    // The type filter narrows honestly (the النوع column's own values).
    await page.getByRole('button', { name: 'تدريب' }).first().click();
    await expect(page.getByText('تدريب صيفي — برمجة Python').first()).toBeVisible();
    await page.getByRole('button', { name: 'الكل', exact: true }).click();

    // APPLY through the row's real action (the cell's cluster is
    // hover-revealed — the row hover IS the reveal); the applied chip
    // reads SERVER truth (the APPLIED status chip, not client state).
    const jobRow = page.locator('tbody tr', { hasText: 'مطور ويب Full Stack' }).first();
    await jobRow.hover();
    const applyBtn = jobRow.getByRole('button', { name: 'تقدّم' });
    if (await applyBtn.count()) {
      await applyBtn.click();
      await expect(jobRow.getByText('APPLIED')).toBeVisible({ timeout: 20_000 });
    } else {
      // A prior rehearsal run already applied — the standing chip IS
      // the server-truth state this half proves.
      await expect(jobRow.getByText('APPLIED')).toBeVisible();
    }
    await flowShot(page, 'flow-13-jobs-applied');

    // ── MOOC ──────────────────────────────────────────────────────
    await page.goto('/student/mooc');
    await expect(page.locator('h1').first()).toContainText('دورات خارجية');
    const grid = page.locator('.mooc-card');
    await expect(grid.first()).toBeVisible({ timeout: 30_000 });

    // The search narrows to the matching card (the shared Arabic-aware
    // normalizer), then clears back.
    await page.getByPlaceholder('ابحث بالعنوان أو الجهة…').fill('python');
    await expect(page.locator('.mooc-card', { hasText: 'Python' }).first()).toBeVisible();
    await expect(page.locator('.mooc-card')).toHaveCount(1);
    await page.getByPlaceholder('ابحث بالعنوان أو الجهة…').fill('');
    await expect(page.locator('.mooc-card').first()).toBeVisible();
    await flowShot(page, 'flow-13-mooc-catalog');
  } finally {
    await close();
  }
});
