/**
 * flow-12-training.spec.ts — FLOWS.md F12 (r325 P4a).
 *
 * F12 = «training: tracks → badges → points → leaderboard». Against the
 * LIVE stack with real clicks: the student opens /training (the
 * catalog + the real KPI band), opens a track NOT enrolled in
 * («منهجية الدراسة الجامعية» — the seed leaves it for this walk), the
 * hero CTA «ابدأ المسار» enrolls AND jumps into the first lesson, the
 * lesson page completes («أكملت — احتساب الدرس» → the reward feedback
 * «أحسنت! حصلت على …»), and /achievements shows the ECONOMY half: the
 * badge tiles (الأوسمة) and the leaderboard row (الترتيب) carrying the
 * student's points.
 *
 * No SETUP API at all — the enrollment/completion writes happen through
 * the UI and are the proof. Re-run tolerance: a completed lesson from a
 * prior run reads «تم احتساب هذا الدرس مسبقاً» and the assertions hold
 * on the standing economy rows.
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot } from './fixtures/live';

const TRACK_SLUG = 'academic-methodology';
const TRACK_TITLE = 'منهجية الدراسة الجامعية';
// The seed's model answer for the track's lesson-2 quiz
// (seed.ts TRACKS — «كم عدد خصائص سؤال البحث الجيد؟» → 3).
const QUIZ_ANSWER = '3';

test('F12 · student walks a training track and reads badge + points on the leaderboard', async ({ browser }) => {
  test.setTimeout(180_000);
  const { page, close } = await flowPage(browser, 'STUDENT');
  try {
    // 1 — the catalog opens with the real points economy band.
    await page.goto('/training');
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.locator('h1').first()).toContainText('التطوير الذاتي');
    const trackRow = page.locator('.pf-row', { hasText: TRACK_TITLE }).first();
    await expect(trackRow).toBeVisible({ timeout: 30_000 });

    // 2 — the track page → the hero CTA (enrolls + jumps to the first
    //     incomplete lesson in one click — the page's own contract).
    await trackRow.click();
    await expect(page.locator('h1')).toContainText(TRACK_TITLE, { timeout: 30_000 });
    const start = page.getByRole('button', { name: /ابدأ المسار|استكمل الدراسة|مراجعة الدروس/ });
    await expect(start).toBeVisible();
    await start.click();

    // 3 — the lesson page: answer the quiz when present, complete.
    //     «ابدأ المسار» jumps to the FIRST INCOMPLETE lesson, which
    //     advances run over run — the track carries TWO quizzes with
    //     different seed answers (lesson 2 «…عدد خصائص…» → 3; lesson 4
    //     «…IMRaD…» → Introduction Methods Results Discussion), so the
    //     answer is picked by READING the question; an unknown question
    //     fails loudly with it.
    await expect(page.locator('h1')).toBeVisible({ timeout: 30_000 });
    const quizBox = page.locator('.lesson-quiz');
    if (await quizBox.count()) {
      const question = (await quizBox.locator('.lesson-quiz-q').innerText()).trim();
      const ANSWERS: Array<[RegExp, string]> = [
        [/عدد خصائص سؤال البحث/, '3'],
        [/IMRaD/i, 'Introduction Methods Results Discussion'],
      ];
      const known = ANSWERS.find(([re]) => re.test(question));
      expect(known, `unknown training quiz in the rehearsal spec: "${question}"`).toBeTruthy();
      await quizBox.locator('input.input').fill(known![1]);
    }
    // The complete button is DISABLED on an already-completed lesson
    // (label «تم الإكمال» — found live: the all-complete track's CTA
    // «مراجعة الدروس» re-lands on lesson 1). Two honest states:
    // already-complete → assert the label, no click, no toast; fresh
    // lesson → click and read the reward/already-counted feedback.
    const done = page.getByRole('button', { name: 'تم الإكمال' });
    if (await done.isVisible().catch(() => false)) {
      await expect(done).toBeDisabled();
    } else {
      await page.getByRole('button', { name: 'أكملت — احتساب الدرس' }).click();
      await expect(
        page.getByText(/أحسنت! حصلت على|تم احتساب هذا الدرس مسبقاً/).first(),
      ).toBeVisible({ timeout: 20_000 });
    }
    await flowShot(page, 'flow-12-lesson-complete');

    // 4 — the economy: badges + points + the leaderboard row.
    await page.goto('/achievements');
    await expect(page.locator('h1').first()).toBeVisible();

    // الأوسمة: the milestone badge (badge-first-step fires on the first
    // lesson completion; earlier runs keep it standing).
    await page.getByRole('tab', { name: 'الأوسمة' }).click();
    const badges = page.getByRole('tabpanel', { name: 'الأوسمة' });
    await expect(badges.locator('.badge-tile').first()).toBeVisible({ timeout: 30_000 });

    // الترتيب: the student's row on the points leaderboard.
    await page.getByRole('tab', { name: 'الترتيب' }).click();
    const board = page.getByRole('tabpanel', { name: 'الترتيب' });
    const myRow = board.locator('.leaderboard-row', { hasText: 'أحمد الزروق' }).first();
    await expect(myRow).toBeVisible({ timeout: 30_000 });
    // The points cell is a real number > 0 (Arabic-Indic digits ride
    // the platform's numeral convention — assert the row carries a
    // non-dash value in the points slot).
    const points = await myRow.locator('.leaderboard-points').innerText();
    expect(points.trim(), 'the leaderboard row carries the earned points').not.toContain('—');
    await flowShot(page, 'flow-12-leaderboard');
  } finally {
    await close();
  }
});
