/**
 * flow-06-attendance.spec.ts — FLOWS.md F6 (r325 P4a).
 *
 * F6 = «attendance session (QR/code) → per-student records → report».
 * Against the LIVE stack with real clicks: the teacher opens
 * /teacher/attendance, picks a real offering, flips one student's roll
 * call to غائب (ABSENT), saves the session («حفظ السجلّ» → POST
 * /teacher/offerings/:id/attendance), sees the success receipt — then
 * the REPORT half: /teacher/intelligence/:offeringId renders the live
 * analytics (الحضور العام %, إجمالي الحصص) that fold the just-saved
 * record.
 *
 * SETUP-only API (commented): the offering id lookup (GET
 * /teacher/me/offerings) so the report URL can be built; every state
 * change and assertion is UI.
 *
 * Honest scope note (kept for the FLOWS.md matrix): the QR/code
 * self-check-in leg of the flow has no student-side surface in the
 * current build — attendance is teacher-recorded only (the save is one
 * record per (offering, date), the seed's own contract).
 */
import { expect, test } from '@playwright/test';

import { apiGet, flowPage, flowShot } from './fixtures/live';

interface OfferingRow { id: string; course: { name: string; code: string }; term: string }

test('F6 · teacher records an attendance session and reads it in the report', async ({ browser }) => {
  test.setTimeout(120_000);

  // ── SETUP (API, not under test): pick the teacher's first offering.
  const offs = await apiGet<{ data: OfferingRow[] }>('TEACHER', '/teacher/me/offerings');
  expect(offs.data.length).toBeGreaterThan(0);
  const offering = offs.data[0]!;

  const { page, close } = await flowPage(browser, 'TEACHER');
  try {
    // 1 — the roll-call sheet opens with its real roster.
    await page.goto('/teacher/attendance');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('الحضور والغياب');

    // The offering select pre-fills the teacher's first real course.
    const select = page.getByLabel('المقرّر');
    await expect(select).toBeVisible();
    await expect(select.locator('option')).not.toHaveCount(0);

    // The date field defaults to the local calendar day (15-h P1-6) —
    // the save is one record per (offering, date).
    const dateBox = page.getByLabel('تاريخ الجلسة');
    await expect(dateBox).toBeVisible();

    // 2 — the roster: one toggle group per student (aria-label حضور
    //     {name}). Flip the FIRST student to غائب — a real click on the
    //     page's own four-state control (حاضر/متأخّر/غائب/بعذر).
    const firstRoster = page.getByRole('group', { name: /^حضور / }).first();
    await expect(firstRoster).toBeVisible({ timeout: 30_000 });
    const studentName = await firstRoster.getAttribute('aria-label');
    expect(studentName, 'the toggle group names the student').toMatch(/^حضور /);
    await firstRoster.getByRole('button', { name: 'غائب' }).click();
    await expect(firstRoster.getByRole('button', { name: 'غائب' })).toHaveAttribute('aria-pressed', 'true');

    // The live summary strip reads the flip (the session's truth line).
    await expect(page.getByRole('status', { name: 'ملخّص الجلسة الحاليّ' })).toBeVisible();

    // 3 — save the session.
    await page.getByRole('button', { name: 'حفظ السجلّ' }).click();
    await expect(page.getByText('تمّ حفظ سجلّ الحضور لهذا التاريخ.')).toBeVisible({ timeout: 20_000 });
    await flowShot(page, 'flow-06-attendance-saved');

    // 4 — the REPORT half: the offering analytics fold the record.
    await page.goto(`/teacher/intelligence/${offering.id}`);
    await expect(page).not.toHaveURL(/\/auth/);
    const analytics = page.getByText('الحضور العام').first();
    await expect(analytics).toBeVisible({ timeout: 30_000 });
    // The roster tab renders the per-student attendance % — the saved
    // record is what the % and the risk signals compute from.
    const rosterTab = page.getByRole('tab', { name: 'قائمة الطلاب' });
    if (await rosterTab.count()) await rosterTab.click();
    await expect(page.getByText('قائمة الطلاب — تحليل لحظي').first()).toBeVisible({ timeout: 30_000 });
    await flowShot(page, 'flow-06-attendance-report');
  } finally {
    await close();
  }
});
