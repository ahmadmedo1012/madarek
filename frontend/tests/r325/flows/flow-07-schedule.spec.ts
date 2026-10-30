/**
 * flow-07-schedule.spec.ts — FLOWS.md F7 (r325 P4a).
 *
 * F7 = «schedule/calendar (conflicts) + iCal export». Against the LIVE
 * stack with real clicks: the student opens /student/schedule and sees
 * the real weekly slots (the seed pins one Sunday 08:00–09:30 slot per
 * offering, and the student is enrolled in all 8), then /student/
 * calendar renders the month grid that expands the same slots onto
 * audience-calendar days. «No conflict error» asserts the pages settle
 * in their loaded state — never an ErrorState (the slot writes are
 * natural-key-guarded server-side: tests/modules pins that contract).
 *
 * HONEST GAP (FLOWS.md note): an iCal/ICS export does NOT exist in the
 * current build — no UI link, no /api route, no text/calendar response
 * (grep-verified across frontend/src + backend/src). This spec covers
 * the shipped half; the export stays an open work item, not a skipped
 * assertion.
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot } from './fixtures/live';

test('F7 · student sees the weekly slots and the calendar grid, no error state', async ({ browser }) => {
  test.setTimeout(120_000);
  const { page, close } = await flowPage(browser, 'STUDENT');
  try {
    // 1 — the weekly timetable.
    await page.goto('/student/schedule');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('الجدول الدراسي');

    // The header's meta line carries the real counted slot load — the
    // honest data the page itself insists on (never decoration).
    await expect(page.getByText('حصص أسبوعياً').first()).toBeVisible({ timeout: 30_000 });

    // A day section with real slots: Sunday (الأحد) holds the seeded
    // 08:00 — 09:30 slot for every enrolled offering.
    const sunday = page.locator('section.schedule-day', { hasText: 'الأحد' }).first();
    await expect(sunday).toBeVisible();
    await expect(sunday.getByText('08:00 — 09:30').first()).toBeVisible();
    // Room + teacher ride the row meta (the real offering rows).
    await expect(sunday.getByText('قاعة 301').first()).toBeVisible();

    // 2 — NO conflict/error surface: the loaded state renders rows, the
    //     error states never mount.
    await expect(page.getByText('تعذَّر تحميل هذا القسم')).toHaveCount(0);
    await expect(page.getByText('لا يوجد جدول مسجّل')).toHaveCount(0);

    await flowShot(page, 'flow-07-schedule');

    // 3 — the calendar grid (the same slots expanded onto the month).
    await page.goto('/student/calendar');
    await expect(page.locator('h1').first()).toContainText('التقويم الأكاديمي');
    const grid = page.getByRole('group', { name: /^تقويم / });
    await expect(grid).toBeVisible({ timeout: 30_000 });
    // The legend names the class-event kind the grid paints.
    await expect(page.getByText('حصص ومحاضرات').first()).toBeVisible();
    await expect(page.getByText('تعذَّر تحميل')).toHaveCount(0);

    await flowShot(page, 'flow-07-calendar');
  } finally {
    await close();
  }
});
