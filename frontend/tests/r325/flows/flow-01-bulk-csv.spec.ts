/**
 * flow-01-bulk-csv.spec.ts — FLOWS.md F1, the BULK-CSV half (r325 P4a).
 *
 * F1 = «registrar: faculty → department → course → offering → teacher
 * assign → enroll (single + bulk CSV)». The confirm-dialog grammar
 * (single enroll) is pinned hermetically by tests/e2e/admin-confirm.e2e.ts;
 * THIS spec walks the missing half against the LIVE stack with real
 * clicks: the registrar's «استيراد طلاب من ملف» (BulkImportModal) —
 * paste CSV → REAL preview verdicts against the seeded institution →
 * commit → the temp-password sheet → the new students visible in the
 * roster search.
 *
 * The import WRITES two demo-stack rows per run (unavoidable for an
 * honest commit test) — emails are unique per run (runTag) so re-runs
 * never collide. SETUP-only API: the roster search happens through the
 * UI search field.
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot, runTag } from './fixtures/live';

const CSV_HEADER = 'الاسم الأول,اسم العائلة,البريد الإلكتروني,الرقم الجامعي,الكلية,القسم,السنة';
// Names the preview resolves against the REAL seeded institution
// (جامعة مدارك التجريبية — كلية تقنية المعلومات / علوم الحاسوب, verified
// against POST /users/bulk-import/preview).
const FACULTY = 'كلية تقنية المعلومات';
const DEPARTMENT = 'علوم الحاسوب';

test('F1 · registrar bulk-imports two students from CSV (preview → commit → roster)', async ({ browser }) => {
  test.setTimeout(120_000);
  const tag = runTag();
  const csv = [
    CSV_HEADER,
    `طالب,آلي الأول,flow01-a-${tag}@e2e.madarek.ly,90${tag.slice(-6)}1,${FACULTY},${DEPARTMENT},2`,
    `طالب,آلي الثاني,flow01-b-${tag}@e2e.madarek.ly,90${tag.slice(-6)}2,${FACULTY},${DEPARTMENT},2`,
    '', // trailing newline — the parser's real-world shape
  ].join('\n');

  const { page, close } = await flowPage(browser, 'ADMIN');
  try {
    // 1 — the registrar's student roster opens on the live stack.
    await page.goto('/admin/students');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('إدارة الطلاب');

    // 2 — open the bulk-import modal.
    await page.getByRole('button', { name: 'استيراد طلاب من ملف' }).click();
    const modal = page.getByRole('dialog', { name: 'استيراد طلاب من ملف' });
    await expect(modal).toBeVisible();

    // 3 — INPUT: paste the CSV (the textarea carries the honest
    //     aria-label; no file picker needed — paste is a first-class path).
    await modal.getByLabel('محتوى ملف CSV').fill(csv);

    // 4 — PREVIEW: real per-line verdicts from the seeded institution.
    await modal.getByRole('button', { name: 'عرض النتائج قبل التنفيذ' }).click();
    await expect(modal.getByText('2 صفاً صالحاً')).toBeVisible({ timeout: 20_000 });
    await expect(modal.getByText('0 صفاً مرفوضاً')).toBeVisible();

    // 5 — COMMIT: one transaction, the sheet is the receipt.
    await modal.getByRole('button', { name: 'إنشاء 2 حساباً' }).click();
    await expect(modal.getByText('تم إنشاء 2 حساباً')).toBeVisible({ timeout: 30_000 });
    // The temp-password sheet carries the two fresh emails.
    await expect(modal.getByText(`flow01-a-${tag}@e2e.madarek.ly`)).toBeVisible();
    await expect(modal.getByText(`flow01-b-${tag}@e2e.madarek.ly`)).toBeVisible();
    // The print hand-out stays a real button (the registrar prints the
    // sheet and distributes it) — clicked but its print dialog is a
    // native window.print() call this headless run does not wait on.
    await flowShot(page, 'flow-01-bulk-import-sheet');

    // 6 — the roster refreshes (the modal's onClose refetch) — search
    //     for the first imported student through the UI search field.
    await page.keyboard.press('Escape'); // the done stage closes via the modal's Esc contract
    await expect(modal).toBeHidden();
    await page.getByPlaceholder('ابحث بالاسم أو البريد أو رقم القيد…').fill(`flow01-a-${tag}@e2e.madarek.ly`);
    await expect(
      page.getByRole('group', { name: 'قائمة الطلاب' }).getByText(`flow01-a-${tag}@e2e.madarek.ly`),
    ).toBeVisible({ timeout: 20_000 });

    await flowShot(page, 'flow-01-bulk-import-roster');
  } finally {
    await close();
  }
});
