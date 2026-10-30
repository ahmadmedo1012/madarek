/**
 * flow-09-positions.spec.ts — FLOWS.md F9, the dean/vicedean + owner
 * halves (r325 P4a).
 *
 * F9 = «positions: dean/dept-head see only their scope · quality sees
 * reports · owner sees audit + settings». The QUALITY half is pinned by
 * tests/e2e/quality-moderation.e2e.ts; THIS spec adds the two missing
 * halves against the LIVE stack:
 *
 *   · dean / vicedean — TEACHER accounts carrying an academic position.
 *     The positions ride the teacher shell: the sidebar shows the
 *     composite role label («أستاذ · عميد» / «أستاذ · وكيل العميد»),
 *     and the teaching surfaces expose ONLY their own scope — the
 *     seed gives them no offerings, so /teacher/students renders the
 *     honest empty state and NEVER leaks سالم's 30 demo students
 *     (the backend scope predicates this flow's row cites).
 *   · owner — /owner/users status toggle (a REAL audited write through
 *     the confirm dialog, toggled back to leave state unchanged) →
 *     /owner/activity (سجل النشاط والمراقبة) shows the STATUS_CHANGE
 *     event → /owner/system (النظام والتشغيل) renders the live system
 *     KPIs + the settings/flags cards (their honest empty states — the
 *     seed defines no PlatformSetting/FeatureFlag rows).
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot } from './fixtures/live';

test.describe('F9 · positions see only their scope', () => {
  for (const [role, positionWord] of [
    ['DEAN', 'عميد'],
    ['VICEDEAN', 'وكيل العميد'],
  ] as const) {
    test(`${role.toLowerCase()} rides the teacher shell with the composite label and an empty own-scope roster`, async ({ browser }) => {
      test.setTimeout(120_000);
      const { page, close } = await flowPage(browser, role);
      try {
        // 1 — the position lands on the TEACHER dashboard.
        await page.goto('/teacher/dashboard');
        await expect(page).not.toHaveURL(/\/auth/);
        await expect(page.locator('h1').first()).toContainText('لوحة الأستاذ');

        // 2 — the composite role label (the appointment IS the job).
        const roleLabel = page.locator('.sidebar-user-role');
        await expect(roleLabel).toContainText('أستاذ');
        await expect(roleLabel).toContainText(positionWord);

        // 3 — the scope: their own roster is the honest empty state —
        //     no offering of their own, and nobody else's students leak.
        await page.goto('/teacher/students');
        const picker = page.getByLabel('المقرّر');
        await expect(picker).toBeVisible({ timeout: 30_000 });
        await expect(picker).toContainText('— لا توجد مقرّرات —');
        await expect(page.getByText('اختر مقرّراً').first()).toBeVisible();
        await expect(page.getByText('الزروق')).toHaveCount(0); // teacher@test.ly's student roster stays theirs
        await flowShot(page, `flow-09-${role.toLowerCase()}-scope`);
      } finally {
        await close();
      }
    });
  }
});

test('F9 · owner writes the audit trail and reads the system settings sheet', async ({ browser }) => {
  test.setTimeout(260_000);
  const { page, close } = await flowPage(browser, 'OWNER');
  try {
    // 1 — the owner's user console: find ONE STABLE demo-cohort student
    //     through the UI search. Binding «rows.first()» is a race — the
    //     pre-search list already carries demo rows and the search's
    //     refetch reorders them under the locator (found live: the
    //     disable landed on student A while the badge was read from
    //     student B, then every later step retried against drifting
    //     rows until the test timeout). A pinned email keeps the row
    //     identity stable across every refetch.
    const TARGET_EMAIL = 'demo-student-30@demo.madarek.ly';
    await page.goto('/owner/users');
    await expect(page.locator('h1').first()).toContainText('إدارة المستخدمين');
    await page.getByPlaceholder('ابحث بالاسم أو البريد الإلكتروني…').fill(TARGET_EMAIL);
    const row = page.locator('.pf-row', { hasText: TARGET_EMAIL }).first();
    await expect(row).toBeVisible({ timeout: 30_000 });

    // 2 — the audited write: the row's actions live behind its own
    //     disclosure (إجراءات {name}); تعطيل then تفعيل ride the confirm
    //     dialog (state restored; the trail keeps both events).
    //     PRE-STATE first: an earlier rehearsal that died between its
    //     two toggles leaves the target DISABLED — then «تعطيل» never
    //     exists and every step retries into the test timeout (found
    //     live). If the badge reads «معطّل», تفعيل restores the نشط
    //     baseline before the recorded loop.
    await row.getByRole('button', { name: /إجراءات / }).click();
    if (await row.getByText('معطّل').isVisible().catch(() => false)) {
      const enable = row.getByRole('button', { name: 'تفعيل' });
      if (!(await enable.isVisible().catch(() => false))) await row.getByRole('button', { name: /إجراءات / }).click();
      await enable.click();
      const restore = page.getByRole('dialog');
      await expect(restore).toBeVisible({ timeout: 30_000 });
      await restore.getByRole('button', { name: 'تفعيل الحساب' }).click();
      await expect(restore).toBeHidden({ timeout: 30_000 });
      await expect(row.getByText('نشط')).toBeVisible({ timeout: 30_000 });
      if (!(await row.getByRole('button', { name: 'تعطيل' }).isVisible().catch(() => false)))
        await row.getByRole('button', { name: /إجراءات / }).click();
    }
    const toggled = async (verb: string, dialogLabel: string) => {
      // A refetch (post-mutation invalidation) remounts the rows and
      // collapses the expansion — re-open the disclosure when needed.
      const action = row.getByRole('button', { name: verb });
      if (!(await action.isVisible())) await row.getByRole('button', { name: /إجراءات / }).click();
      await action.click();
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible({ timeout: 30_000 });
      await dialog.getByRole('button', { name: dialogLabel }).click();
      await expect(dialog).toBeHidden({ timeout: 30_000 });
    };
    await toggled('تعطيل', 'تعطيل الحساب');
    await expect(row.getByText('معطّل')).toBeVisible({ timeout: 20_000 });
    await flowShot(page, 'flow-09-owner-audit-action');
    await toggled('تفعيل', 'تفعيل الحساب');
    await expect(row.getByText('نشط')).toBeVisible({ timeout: 20_000 });

    // 3 — the AUDIT half: the activity log reads the STATUS_CHANGE rows.
    await page.goto('/owner/activity');
    await expect(page.locator('h1').first()).toContainText('سجل النشاط والمراقبة');
    await expect(page.getByText('تعديل حالة الحساب').first()).toBeVisible({ timeout: 30_000 });
    await flowShot(page, 'flow-09-owner-audit-log');

    // 4 — the SETTINGS half: the system sheet with its real KPIs.
    await page.goto('/owner/system');
    await expect(page.locator('h1').first()).toContainText('النظام والتشغيل');
    await expect(page.getByText('إعدادات المنصّة').first()).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('حالة الخدمة').first()).toBeVisible();
    await flowShot(page, 'flow-09-owner-system');
  } finally {
    await close();
  }
});
