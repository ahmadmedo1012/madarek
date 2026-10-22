/** R312 — the invariant probe: at every scroll position in the journey
 * section (mobile), the card AT the reading band (the one the user is
 * reading) must sit fully below the camera frame's bottom edge, and
 * the side column must never be covered while on-screen. Cards that
 * were already read may pass behind the frame on their way up — that
 * is standard sticky-header geometry and is NOT a defect; this probe
 * asserts the reading invariant, not the tail behavior. */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('.fo-hero'), { timeout: 15_000 });
await page.waitForTimeout(400);
await page.waitForFunction(() => !document.querySelector('.sl'), { timeout: 22_000 });
await page.waitForTimeout(600);

const report = await page.evaluate(async () => {
  const jt = document.querySelector('.jt');
  jt.scrollIntoView();
  await new Promise((r) => setTimeout(r, 800));
  const jtTop = jt.getBoundingClientRect().top + window.scrollY;
  const h = jt.getBoundingClientRect().height;
  const rows = [];
  for (let step = 0; step <= 48; step += 1) {
    const y = jtTop - 40 + ((h + 80) * step) / 48;
    window.scrollTo({ top: y, behavior: 'instant' });
    await new Promise((r) => setTimeout(r, 110));
    const cam = document.querySelector('.jt-cam').getBoundingClientRect();
    const cards = [...document.querySelectorAll('.jt-station')].map((c) => c.getBoundingClientRect());
    const side = document.querySelector('.jt-side').getBoundingClientRect();
    const stations = document.querySelector('.jt-stations').getBoundingClientRect();
    /* the driver's band: below the cam's live bottom edge */
    const band = cam.bottom + (window.innerHeight - cam.bottom) * 0.45;
    /* the card at the band: centre nearest the band, and on-screen */
    const atBand = cards
      .map((c, i) => ({ i, d: Math.abs((c.top + c.bottom) / 2 - band), top: c.top, bottom: c.bottom }))
      .filter((c) => c.bottom > 40 && c.top < window.innerHeight)
      .sort((a, b) => a.d - b.d)[0];
    const violations = [];
    if (atBand) {
      /* only cards IN the reading zone (centre within band ± half a
       * card) are being read — a card whose centre is well above the
       * band has already been read and is riding out behind the frame
       * (standard sticky-tail geometry, not a defect). */
      const centre = (atBand.top + atBand.bottom) / 2;
      const inReadingZone = centre > band - 90 && centre < band + 90;
      if (inReadingZone && atBand.top < cam.bottom - 8) {
        violations.push(`card${atBand.i} READING at ${Math.round(atBand.top)}..${Math.round(atBand.bottom)} vs cam bottom ${Math.round(cam.bottom)} (band ${Math.round(band)})`);
      }
    }
    /* the side covered while on-screen? */
    const sideVisible = side.bottom > 40 && side.top < window.innerHeight;
    const sideOv = Math.max(0, Math.min(cam.bottom, side.bottom) - Math.max(cam.top, side.top));
    if (sideVisible && sideOv > 8) violations.push(`side covered +${Math.round(sideOv)}px while on-screen (${Math.round(side.top)}..${Math.round(side.bottom)} vs cam ${Math.round(cam.top)}..${Math.round(cam.bottom)})`);
    rows.push({
      y: Math.round(y - jtTop),
      cam: [Math.round(cam.top), Math.round(cam.bottom)],
      bandCard: atBand ? atBand.i : null,
      bandCardTop: atBand ? Math.round(atBand.top) : null,
      stage: jt.dataset.stage,
      sideOv: Math.round(sideOv),
      sideVisible,
      violations,
    });
  }
  return rows;
});

let bad = 0;
for (const r of report) {
  if (r.violations.length) {
    bad += 1;
    console.log(`y=+${r.y} stage=${r.stage}: ${r.violations.join(' ; ')}`);
  }
}
const withBandCard = report.filter((r) => r.bandCard !== null);
console.log('states:', report.length, '| violations:', bad, '| states with an on-screen band card:', withBandCard.length);
/* the stage↔band-card alignment: the card at the band should match the stage */
const misaligned = report.filter((r) => r.bandCard !== null && r.bandCard !== Number(r.stage)).map((r) => `y+${r.y}: card${r.bandCard} vs stage${r.stage}`);
console.log('stage↔card mismatches:', misaligned.length, misaligned.slice(0, 6));
await browser.close();
