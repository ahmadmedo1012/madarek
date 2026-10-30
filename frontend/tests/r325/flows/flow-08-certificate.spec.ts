/**
 * flow-08-certificate.spec.ts — FLOWS.md F8 (r325 P4a).
 *
 * F8 = «certificate on completion → verifiable URL → branded PDF».
 * Against the LIVE stack with REAL clicks: the student completes an
 * un-completed training track lesson-by-lesson through the UI
 * («ابدأ المسار» enrolls → each lesson's «أكملت — احتساب الدرس» → the
 * lesson's quiz answered from the seed's own model answer), the final
 * completion ISSUES the certificate (POST /training/lessons/:id/
 * complete — the backend's single writer of Certificate rows with a
 * trackId), and /achievements → «الشهادات» renders it: track title,
 * issuer «منصّة مدارك التعليميّة», مكتملة badge, hours.
 *
 * HONEST GAPS (kept in the FLOWS.md matrix): a PUBLIC verifiable URL
 * and a branded PDF/print view do NOT exist in the current build (no
 * /verify route, no certificate PDF renderer — grep-verified). This
 * spec covers the shipped half: completion → issued → visible.
 *
 * Re-run tolerance: the chosen track (الصف المعكوس, 4 lessons) may be
 * already complete from an earlier rehearsal run — the loop treats a
 * «تم الإكمال» lesson as done and the certificate assertion holds on
 * the pre-issued row.
 */
import { expect, test, type Page } from '@playwright/test';

import { flowPage, flowShot } from './fixtures/live';

const TRACK_SLUG = 'flipped-classroom';
const TRACK_TITLE = 'استراتيجية الصف المعكوس';
// The seed's model answer for the track's ONE quiz lesson
// (seed.ts TRACKS — «من مبتكر استراتيجية الصف المعكوس؟» → إريك مازور).
const QUIZ_ANSWER = 'إريك مازور';

/** Complete the not-yet-done lessons of the track through the UI,
 * walking next-rows and back-links. Returns after every lesson reads
 * done (or the lesson list is exhausted). */
async function completeTrack(page: Page): Promise<void> {
  for (let pass = 0; pass < 8; pass++) {
    await page.goto(`/training/${TRACK_SLUG}`);
    await expect(page.locator('h1')).toContainText(TRACK_TITLE);

    // Not enrolled yet → the hero CTA enrolls AND jumps to the first
    // incomplete lesson (the onEnroll contract).
    const start = page.getByRole('button', { name: 'ابدأ المسار' });
    if (await start.count()) {
      await start.click();
      break; // navigated straight into the lesson flow
    }

    // Enrolled: walk into the first not-done lesson row (a real link),
    // or stop when every row is done.
    const anyRow = page.locator('a.lesson-row');
    const doneRows = page.locator('a.lesson-row.done');
    if ((await anyRow.count()) > 0 && (await doneRows.count()) === (await anyRow.count())) {
      return; // every lesson reads done
    }
    const target = page.locator('a.lesson-row:not(.done)').first();
    if ((await target.count()) === 0) return;
    await target.click();
    await expect(page.locator('h1')).toBeVisible();

    // The lesson page: answer the quiz when present, complete, and take
    // the reward (or the honest already-counted receipt on re-runs).
    const quizBox = page.locator('.lesson-quiz');
    if (await quizBox.count()) {
      const answer = quizBox.locator('input.input');
      if (await answer.isEnabled()) await answer.fill(QUIZ_ANSWER);
    }
    const completeBtn = page.getByRole('button', { name: 'أكملت — احتساب الدرس' });
    if (await completeBtn.isEnabled()) {
      await completeBtn.click();
      await expect(
        page.getByText(/أحسنت! حصلت على|تم احتساب هذا الدرس مسبقاً/).first(),
      ).toBeVisible({ timeout: 20_000 });
    }
    // Next lesson through the page's own control; the last lesson has
    // none — the loop returns to the track page instead.
    const next = page.getByRole('button', { name: 'الدرس التالي' });
    if (await next.count()) {
      await next.click();
    }
  }
}

test('F8 · student completes a training track → the certificate renders', async ({ browser }) => {
  test.setTimeout(240_000);
  const { page, close } = await flowPage(browser, 'STUDENT');
  try {
    // 1 — the training catalog opens with its real KPI band.
    await page.goto('/training');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('التطوير الذاتي');
    await expect(page.locator('.track-card, .pf-row', { hasText: TRACK_TITLE }).first()).toBeVisible({ timeout: 30_000 });

    // 2 — complete the track lesson-by-lesson with real clicks.
    await completeTrack(page);

    // 3 — the track page reads COMPLETE (the progress bar's own copy).
    await page.goto(`/training/${TRACK_SLUG}`);
    await expect(page.getByText('هذا المسار مكتمل — شهادة جاهزة')).toBeVisible({ timeout: 30_000 });
    await flowShot(page, 'flow-08-track-complete');

    // 4 — the certificate renders on the achievements sheet.
    await page.goto('/achievements');
    await expect(page.locator('h1').first()).toBeVisible();
    await page.getByRole('tab', { name: 'الشهادات' }).click();
    const panel = page.getByRole('tabpanel', { name: 'الشهادات' });
    await expect(panel.getByText('شهادة إتمام مسار').first()).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByText(TRACK_TITLE).first()).toBeVisible();
    await expect(panel.getByText('منصّة مدارك التعليميّة').first()).toBeVisible();
    await expect(panel.getByText('مكتملة').first()).toBeVisible();
    await flowShot(page, 'flow-08-certificate');
  } finally {
    await close();
  }
});
