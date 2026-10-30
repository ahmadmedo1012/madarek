/**
 * flow-11-research.spec.ts — FLOWS.md F11 (r325 P4a).
 *
 * F11 = «research: PDF upload → annotation → teacher review». Against
 * the LIVE stack with real clicks:
 *
 *   student /student/research → «رفع بحث جديد» → the modal (title +
 *   abstract + linked offering + a REAL small PDF through the file
 *   input — the %PDF- magic both the client sniff and files.routes
 *   gate require) → «رفع البحث» → the row lands بانتظار الفحص →
 *   «ابدأ الفحص الآن» (the simulated scan) → بانتظار تقييم الأستاذ;
 *
 *   teacher /teacher/research → the queue («بانتظار تقييمك») → select
 *   the paper → grade /20 + «ملاحظات للطالب» → «تأكيد التقييم» → GRADED
 *   (the margin-notes thread renders under ملاحظات على البحث);
 *
 *   student re-opens the row → «مُقيَّم» + the grade X / 20 + the
 *   teacher's feedback verbatim + the reviewer's name.
 *
 * SETUP-only API (commented): the offering lookup to link the paper to
 * the grading teacher's own offering (RESEARCH_GRADE_OWN), and the
 * quota reset — the per-user paper quota (files.routes.ts) charges
 * every stored paper at the 20 MB worst-case cap → max 10 papers per
 * student, ResearchPaper has NO delete route, so every rehearsal run
 * after the third hits «تجاوزت حصة التخزين الخاصة بك» (413) forever
 * (found live). backend/scripts/reset-paper-quota.ts deletes the
 * student's paper rows (bytes become inert orphans) and is invoked
 * here via child_process — SETUP tooling, never product code. The PDF
 * is generated in-process (fixtures/live.ts minimalPdf) — no external
 * fixture file.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, test } from '@playwright/test';

import { apiGet, flowPage, flowShot, minimalPdf, runTag } from './fixtures/live';

/** ESM-safe dirname (Playwright transpiles specs as ESM — __dirname is
 * not defined). …/frontend/tests/r325/flows → …/wt/flows (the worktree
 * root, 4 levels up). */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..', '..', '..', '..');

interface OfferingRow { id: string; course: { name: string; code: string } }

test('F11 · student uploads a PDF → the teacher grades it → the student reads the verdict', async ({ browser }) => {
  test.setTimeout(300_000);
  const tag = runTag();
  const title = `بحث e2e ${tag}`;
  const feedback = 'منهجية واضحة — وسّع قسم النتائج ثم أعد الرفع.';

  // ── SETUP: quota headroom (see header — the 413 wall found live).
  execFileSync(
    process.env.TSX_BIN ?? 'node_modules/.bin/tsx',
    ['backend/scripts/reset-paper-quota.ts', 'student@test.ly'],
    // The rehearsal targets THE LOCAL STACK by definition — the repo's
    // tracked .env template (postgresql://USER:PASS@HOST/DB) must never
    // leak into the child (found live: a template URL survives both ??
    // and || and Prisma dies validating it).
    { cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: 'postgresql://postgres@localhost:5433/madarek_dev' }, stdio: 'pipe', timeout: 60_000 },
  );

  // ── SETUP (API, not under test): link the paper to the grading
  // teacher's own offering — RESEARCH_GRADE_OWN scopes the verdict —
  // AND one the STUDENT is enrolled in: the upload modal's course
  // select lists the student's ENROLLMENTS only, so a teacher-only
  // offering (teacher[0] = DS302, student not enrolled) makes
  // selectOption retry forever (found live — same trap as F4).
  const offs = await apiGet<{ data: OfferingRow[] }>('TEACHER', '/teacher/me/offerings');
  expect(offs.data.length).toBeGreaterThan(0);
  const enrol = await apiGet<{ data: { offering?: { id?: string } }[] }>('STUDENT', '/enrollments/me');
  const enrolledIds = new Set(enrol.data.map((e) => e.offering?.id).filter(Boolean));
  const offeringId = offs.data.find((o) => enrolledIds.has(o.id))?.id ?? offs.data[0]!.id;

  // ── STUDENT: upload + scan through the UI.
  {
    const { page, close } = await flowPage(browser, 'STUDENT');
    try {
      await page.goto('/student/research');
      await expect(page).not.toHaveURL(/\/auth/);
      await expect(page.locator('h1').first()).toContainText('بحوثي');

      await page.getByRole('button', { name: 'رفع بحث جديد' }).click();
      const modal = page.getByRole('dialog', { name: 'رفع بحث جديد' });
      await expect(modal).toBeVisible();
      await modal.getByLabel('عنوان البحث (مطلوب)').fill(title);
      await modal.getByLabel('الملخّص (اختياري)').fill('ملخّص آلي من مواصلة F11 — رفع بحث حقيقي عبر الواجهة.');
      // Link to the grading teacher's offering (the select lists the
      // student's real enrollments; the teacher owns them all).
      await modal.getByLabel('المقرّر الأكاديمي المرتبط (اختياري)').selectOption({ value: offeringId });
      // The REAL PDF: a small in-process one-page document.
      await modal.locator('input[type="file"]').setInputFiles({
        name: `flow11-${tag}.pdf`,
        mimeType: 'application/pdf',
        buffer: minimalPdf(title),
      });
      await modal.getByRole('button', { name: 'رفع البحث' }).click();
      await expect(page.getByText('تمّ رفع البحث').first()).toBeVisible({ timeout: 30_000 });
      await expect(modal).toBeHidden();

      // The row lands بانتظار الفحص (UPLOADED) — expand it (mustAct
      // rows open pre-expanded) and start the simulated scan.
      const row = page.locator('.pf-row', { hasText: title }).first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      const scanBtn = row.getByRole('button', { name: 'ابدأ الفحص الآن' });
      if (!(await scanBtn.isVisible())) await row.getByRole('button', { name: /تفاصيل البحث/ }).click();
      await scanBtn.click();
      await expect(row.getByText('بانتظار تقييم الأستاذ')).toBeVisible({ timeout: 30_000 });
      await flowShot(page, 'flow-11-student-scanned');
    } finally {
      await close();
    }
  }

  // ── TEACHER: open the queue, grade, leave feedback.
  {
    const { page, close } = await flowPage(browser, 'TEACHER');
    try {
      await page.goto('/teacher/research');
      await expect(page).not.toHaveURL(/\/auth/);
      await expect(page.locator('h1').first()).toContainText('البحث العلمي');

      // Select the paper in the بانتظار تقييمك queue (the row IS a button).
      const item = page.getByRole('button', { name: new RegExp(`${title} — `) });
      await expect(item).toBeVisible({ timeout: 30_000 });
      await item.click();

      // The workspace: score + notes + the margin-notes thread.
      const workspace = page.locator('form');
      await expect(workspace.getByText('نتائج الفحص الأوتوماتيكي').first()).toBeVisible();
      // The annotation thread lives OUTSIDE the <form> (r157 keeps the
      // form to the fields Enter submits) and is aria-labelled, not
      // text-bearing — read it by its accessible name at page level.
      await expect(page.getByLabel('ملاحظات على البحث')).toBeVisible();
      await workspace.getByLabel('الدرجة (من 20)').fill('17.5');
      await workspace.getByLabel('ملاحظات للطالب').fill(feedback);
      await workspace.getByRole('button', { name: 'تأكيد التقييم' }).click();
      await expect(page.getByText('تمّ حفظ التقييم').first()).toBeVisible({ timeout: 20_000 });
      await flowShot(page, 'flow-11-teacher-graded');
    } finally {
      await close();
    }
  }

  // ── STUDENT: the verdict lands on the row.
  {
    const { page, close } = await flowPage(browser, 'STUDENT');
    try {
      await page.goto('/student/research');
      const row = page.locator('.pf-row', { hasText: title }).first();
      await expect(row).toBeVisible({ timeout: 30_000 });
      // The verdict (grade + feedback) lives in the row's EXPANDED body;
      // the status chip «مُقيَّم» rides the collapsed head — so the
      // expansion trigger is the MISSING grade text, not the missing
      // chip (found live: the graded row arrives collapsed and the
      // chip-visible branch skipped the expand, hiding 17.5/20 forever).
      if (!(await row.getByText('17.5 / 20').isVisible())) {
        await row.getByRole('button', { name: /تفاصيل البحث/ }).click();
      }
      await expect(row.getByText('مُقيَّم')).toBeVisible();
      await expect(row.getByText('17.5 / 20')).toBeVisible({ timeout: 30_000 });
      await expect(row.getByText(feedback)).toBeVisible();
      await flowShot(page, 'flow-11-student-result');
    } finally {
      await close();
    }
  }
});
