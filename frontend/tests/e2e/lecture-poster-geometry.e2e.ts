/**
 * r166a — lecture player video-stage geometry (E1's square-poster
 * defect, pinned at the transport-mocked journey level).
 *
 * E1 measured the defect LIVE: a paused <video> sizes itself by its
 * POSTER's intrinsic ratio (the seeded /brand/madarek-mark.svg is
 * square, viewBox 0 0 64 64) — as in-flow content that stretched the
 * aspect-ratio'd .lecture-video-wrap to 818×818 (ratio 1.0) instead of
 * 820×462. The fix makes the WRAP own the geometry (the video is
 * absolutely pinned inside it, player.css .vpc > video + student.css
 * .lecture-video) so any poster ratio letterboxes instead of sizing
 * the stage.
 *
 * The base corpus serves posterUrl: null (the defect never reproduced
 * there — which is exactly how it survived every earlier journey);
 * this spec overrides the lecture detail with the REAL seeded square
 * poster and asserts the geometry contract end-to-end: the wrap stays
 * 16:9, the video fills it, the poster attribute survives (the brand
 * mark letterboxes on the matte — accepted), and the chrome layers
 * above the video.
 */
import { test, expect } from './fixtures/e2e';
import { LECTURE_DETAIL, LECTURE_ID } from './fixtures/api-fixtures';

test.use({
  e2eRole: 'STUDENT',
  apiOverrides: [{
    method: 'GET',
    path: '/lectures/:lectureId',
    json: { data: { ...LECTURE_DETAIL, posterUrl: '/brand/madarek-mark.svg' } },
  }],
});

test('ساحة الفيديو تحافظ على 16:9 مع بوستر مربّع', async ({ page }) => {
  await page.goto(`/student/lectures/${LECTURE_ID}`);

  const wrap = page.locator('.lecture-video-wrap');
  const video = page.locator('video.lecture-video');
  await expect(wrap).toBeVisible();
  // The brand poster stays (it letterboxes on the matte now).
  await expect(video).toHaveAttribute('poster', '/brand/madarek-mark.svg');

  const box = (await wrap.boundingBox())!;
  const vBox = (await video.boundingBox())!;
  expect(box).toBeTruthy();
  expect(vBox).toBeTruthy();

  // 16:9 = 1.778 — the square-poster defect measured 1.0 (818×818).
  const ratio = box.width / box.height;
  expect(ratio).toBeGreaterThan(1.7);
  expect(ratio).toBeLessThan(1.85);

  // The video fills the wrap exactly (absolute inset: 0; the wrap's
  // 1px border explains the ±2px between the border-box and the
  // video's content box).
  expect(Math.abs(vBox.width - box.width)).toBeLessThanOrEqual(3);
  expect(Math.abs(vBox.height - box.height)).toBeLessThanOrEqual(3);

  // The pinned video takes no layout space: the wrap's computed height
  // comes from its own aspect-ratio, never from the video's poster.
  const videoPosition = await video.evaluate(
    (el) => getComputedStyle(el).position,
  );
  expect(videoPosition).toBe('absolute');

  // The chrome still overlays the stage (the play gate above the
  // video — the pre-fix DOM order relied on it).
  const overlayZ = await page
    .locator('.vpc-overlay')
    .evaluate((el) => getComputedStyle(el).zIndex);
  expect(Number(overlayZ)).toBeGreaterThanOrEqual(1);
});
