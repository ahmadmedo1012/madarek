/**
 * r312-mobile-camera.e2e.ts — the R312 §R R1 browser-truth belt
 * (the jsdom side lives in tests/unit/r312-mobile-camera.test.tsx).
 *
 * The camera of the learning plan at ≤991px: the sticky `.jt-cam`
 * frame over the station cards, the viewBox cropped to the active
 * zone, the side column never covered (the flow-block architecture),
 * the twin discipline across the ≥992px crossing, and the R310
 * desktop contract fully intact at 1440.
 */
import { test, expect } from './fixtures/e2e';
import type { Page } from '@playwright/test';

const VW = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

/* R314-cycle2 override: the page-ready sentinel — the V1 hero rebuild
 * (cycle 1, 45f8c32) replaced the H1 copy; the old 'مدارك' sentinel
 * has been stale since (the brand name lives in the header/footer,
 * not the H1). The sentinel now waits on the current H1's first line.
 * Not a camera pin — the camera expectations below carry their own
 * R314-cycle2 override notes. */
const HERO_READY = 'رحلةُ تعلُّمٍ واحدة';

test.use({ e2eRole: 'guest', reducedMotion: 'no-preference' });

/** engage the camera deterministically (its flow slot's document top
 * at the viewport top → the CSS sticky holds it at 69px), then place
 * card i's centre on the reading band. Both scrolls RETRY: on first
 * entry the lazy tail keeps growing the page, so an unreached target
 * clamps at the page bottom (measured: the first scrollTo landed
 * 4.3kpx short until the tail mounted). */
async function readAtBand(page: Page, i: number) {
  await page.evaluate(async (idx: number) => {
    const flow = document.querySelector('.jt-flow') as HTMLElement;
    for (let k = 0; k < 6; k += 1) {
      const t = flow.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
    const card = document.querySelectorAll('.jt-station')[idx] as HTMLElement;
    for (let k = 0; k < 4; k += 1) {
      const cam = (document.querySelector('.jt-cam') as HTMLElement).getBoundingClientRect();
      const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
      const r = card.getBoundingClientRect();
      const t = window.scrollY + r.top + r.height / 2 - band;
      window.scrollTo({ top: t, behavior: 'instant' });
      await new Promise((res) => setTimeout(res, 110));
      if (Math.abs(window.scrollY - t) < 2) break;
    }
  }, i);
  await page.waitForTimeout(900);
}

async function camSheet(page: Page) {
  return page.evaluate(() => {
    const svg = document.querySelector('.jt-cam .bp-svg') as SVGSVGElement | null;
    const pinSvg = document.querySelector('.jt-pin .bp-svg') as SVGSVGElement | null;
    const cam = document.querySelector('.jt-cam') as HTMLElement;
    const pinWin = document.querySelector('.jt-pin .jt-window') as HTMLElement;
    const camRect = cam.getBoundingClientRect();
    const track = document.querySelector('.jt') as HTMLElement;
    return {
      stage: track.dataset.stage ?? null,
      cam: svg
        ? {
            viewBox: svg.getAttribute('viewBox'),
            par: svg.getAttribute('preserveAspectRatio'),
            flag: svg.dataset.cam ?? null,
            display: getComputedStyle(cam).display,
            position: getComputedStyle(cam).position,
            top: Math.round(camRect.top),
            bottom: Math.round(camRect.bottom),
          }
        : null,
      pinWindow: getComputedStyle(pinWin).display,
      pinSvg: pinSvg ? { viewBox: pinSvg.getAttribute('viewBox'), par: pinSvg.getAttribute('preserveAspectRatio') } : null,
    };
  });
}

test.describe('R312 — the mobile camera (§R R1)', () => {
  test('390px: the twin discipline — cam sticky + cropped, pin window hidden, full sheet on the pin', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);

    /* the driver's prime frame (rAF on mount) — wait for it, then
     * assert the twin discipline */
    await page.waitForFunction(
      () => (document.querySelector('.jt-cam .bp-svg') as SVGSVGElement | null)?.dataset.cam === 'cropped',
      undefined,
      { timeout: 5000 },
    );
    const s = await camSheet(page);
    /* the cam is the one on screen: sticky, display block, cropped */
    expect(s.cam?.display).toBe('block');
    expect(s.cam?.position).toBe('sticky');
    expect(s.cam?.flag).toBe('cropped');
    expect(s.cam?.par).toBe('xMidYMid slice');
    /* the crop is inside the sheet and zoomed (≤ 600×420 of 1200×760;
     * R314-cycle2 override: the windows are 480×500) */
    const vb = (s.cam?.viewBox ?? '').split(' ').map(Number);
    expect(vb.length).toBe(4);
    expect(vb[0]!).toBeGreaterThanOrEqual(0);
    expect(vb[1]!).toBeGreaterThanOrEqual(0);
    expect(vb[0]! + vb[2]!).toBeLessThanOrEqual(1200);
    expect(vb[1]! + vb[3]!).toBeLessThanOrEqual(760);
    expect(vb[2]!).toBeLessThanOrEqual(600);
    /* the pin's window is display:none and its sheet stays FULL (meet) */
    expect(s.pinWindow).toBe('none');
    expect(s.pinSvg?.viewBox).toBe('0 0 1200 760');
    expect(s.pinSvg?.par).toBe('xMidYMid meet');
  });

  test('390px: the reading band — the card at the band matches the zone on the sheet', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await page.waitForFunction(
      () => (document.querySelector('.jt-cam .bp-svg') as SVGSVGElement | null)?.dataset.cam === 'cropped',
      undefined,
      { timeout: 5000 },
    );

    /* card 2 at the band → stage 2 (the exam hall), the camera at the
     * exam crop node (interpolated around it — never the full sheet).
     * R314-cycle2 override (§7 map share): the nodes are the widened
     * 480×500 windows — exam (348, 60); the equal 64svh centred
     * station bands put the card centre at the band exactly at the
     * CAM_BANDS node. */
    await readAtBand(page, 2);
    const s2 = await camSheet(page);
    expect(s2.stage).toBe('2');
    const vb2 = (s2.cam?.viewBox ?? '').split(' ').map(Number);
    /* the exam node is (348, 60) — the interpolation is within a
     * half-segment of it on either side */
    expect(Math.abs(vb2[0]! - 348)).toBeLessThanOrEqual(160);
    expect(vb2[2]!).toBe(480);

    /* card 3 at the band → stage 3, the exact mastery node */
    await readAtBand(page, 3);
    const s3 = await camSheet(page);
    expect(s3.stage).toBe('3');
    expect(s3.cam?.viewBox).toBe('12 60 480 500');

    /* card 0 at the band → stage 0, around the lecture node */
    await readAtBand(page, 0);
    const s0 = await camSheet(page);
    expect(s0.stage).toBe('0');
    const vb0 = (s0.cam?.viewBox ?? '').split(' ').map(Number);
    expect(Math.abs(vb0[0]! - 680)).toBeLessThanOrEqual(160);
  });

  test('390px: the invariant — the card being read is never behind the frame; the side is never covered', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);

    const violations = await page.evaluate(async () => {
      const jt = document.querySelector('.jt') as HTMLElement;
      jt.scrollIntoView();
      await new Promise((r) => setTimeout(r, 700));
      const jtTop = jt.getBoundingClientRect().top + window.scrollY;
      const h = jt.getBoundingClientRect().height;
      const bad = [];
      for (let step = 0; step <= 24; step += 1) {
        window.scrollTo({ top: jtTop - 40 + ((h + 80) * step) / 24, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 90));
        const cam = (document.querySelector('.jt-cam') as HTMLElement).getBoundingClientRect();
        const cards = [...document.querySelectorAll('.jt-station')].map((c) => (c as HTMLElement).getBoundingClientRect());
        const side = (document.querySelector('.jt-side') as HTMLElement).getBoundingClientRect();
        const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
        const atBand = cards
          .map((c, i) => ({ i, d: Math.abs((c.top + c.bottom) / 2 - band), top: c.top, bottom: c.bottom }))
          .filter((c) => c.bottom > 40 && c.top < window.innerHeight)
          .sort((a, b) => a.d - b.d)[0];
        if (atBand) {
          const centre = (atBand.top + atBand.bottom) / 2;
          const inReadingZone = centre > band - 90 && centre < band + 90;
          if (inReadingZone && atBand.top < cam.bottom - 8) {
            bad.push(`card${atBand.i} reading at ${Math.round(atBand.top)} behind cam bottom ${Math.round(cam.bottom)}`);
          }
        }
        const sideVisible = side.bottom > 40 && side.top < window.innerHeight;
        const sideOv = Math.max(0, Math.min(cam.bottom, side.bottom) - Math.max(cam.top, side.top));
        if (sideVisible && sideOv > 8) {
          bad.push(`side covered +${Math.round(sideOv)}px while on-screen`);
        }
        /* NOTE: the stage↔card alignment is asserted by the discrete
         * readAtBand checks in the sibling spec; a continuous sweep
         * hits the flip boundaries (cards are not equal heights), so
         * this sweep owns only the COVERING invariants. */
      }
      return bad;
    });
    expect(violations).toEqual([]);
  });

  test('the ≥992px crossing restores the full sheet; crossing back re-crops', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await readAtBand(page, 2);
    expect((await camSheet(page)).cam?.flag).toBe('cropped');

    /* up to desktop: restored exactly */
    await page.setViewportSize(VW.desktop);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await page.waitForTimeout(600);
    const up = await camSheet(page);
    expect(up.cam?.viewBox).toBe('0 0 1200 760');
    expect(up.cam?.par).toBe('xMidYMid meet');
    expect(up.cam?.flag).toBeNull();
    expect(up.pinWindow).toBe('block');

    /* back down to mobile: re-enter, re-crop */
    await page.setViewportSize(VW.mobile);
    await page.evaluate(() => {
      const jt = document.querySelector('.jt') as HTMLElement;
      window.scrollTo({ top: jt.getBoundingClientRect().top + window.scrollY - 60, behavior: 'instant' });
    });
    await page.waitForTimeout(600);
    await readAtBand(page, 2);
    const down = await camSheet(page);
    expect(down.cam?.flag).toBe('cropped');
    expect(down.cam?.par).toBe('xMidYMid slice');
    expect(down.pinWindow).toBe('none');
  });
});

test.describe('R312 — reduced motion at mobile: the discrete node crop', () => {
  test.use({ reducedMotion: 'reduce' });
  test('the camera holds the exact node rect — never a mid-pan', async ({ page }) => {
    await page.setViewportSize(VW.mobile);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);
    await readAtBand(page, 1);
    const s = await camSheet(page);
    /* the exact node rect for stage 1 (the checkpoint crop —
     * R314-cycle2 override: the widened window) */
    expect(s.cam?.viewBox).toBe('680 260 480 500');
    await readAtBand(page, 3);
    expect((await camSheet(page)).cam?.viewBox).toBe('12 60 480 500');
  });
});

test.describe('R312 — the desktop contract is intact (the R310 pin)', () => {
  test('1440px: the pin window shows the FULL sheet; the stations ride absolute; the stage advances with the pin', async ({ page }) => {
    await page.setViewportSize(VW.desktop);
    await page.goto('/');
    await expect(page.locator('.fo-hero-title')).toContainText(HERO_READY);

    /* the R310 desktop geometry: stations absolute against the track */
    const geo = await page.evaluate(() => {
      const s = document.querySelector('.jt-stations') as HTMLElement;
      const pinWin = document.querySelector('.jt-pin .jt-window') as HTMLElement;
      const cam = document.querySelector('.jt-cam') as HTMLElement;
      return {
        stations: getComputedStyle(s).position,
        pinWin: getComputedStyle(pinWin).display,
        cam: getComputedStyle(cam).display,
        pinSvg: (document.querySelector('.jt-pin .bp-svg') as SVGSVGElement)?.getAttribute('viewBox'),
      };
    });
    expect(geo.stations).toBe('absolute');
    expect(geo.pinWin).toBe('block');
    expect(geo.cam).toBe('none');
    expect(geo.pinSvg).toBe('0 0 1200 760');

    /* the stage advances with the pin (the R310 contract) — place the
     * scroll at pin = 0.55 exactly: stage = floor(0.55*4 + 0.5) = 2 */
    await page.evaluate(() => {
      const jt = document.querySelector('.jt') as HTMLElement;
      const r = jt.getBoundingClientRect();
      const jtDocTop = r.top + window.scrollY;
      const p = 0.55;
      window.scrollTo({ top: jtDocTop + p * (r.height - window.innerHeight), behavior: 'instant' });
    });
    await page.waitForTimeout(1400);
    const s2 = await camSheet(page);
    expect(s2.stage).toBe('2');
    expect(s2.pinSvg?.viewBox).toBe('0 0 1200 760');
    expect(s2.cam?.flag).toBeNull();
  });
});
