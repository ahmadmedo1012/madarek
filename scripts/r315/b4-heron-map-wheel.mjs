/** B4 helper — wake Heron's Lenis with real wheel deltas and walk the
 * home-map band, screenshotting + dumping the pinned layers' opacities
 * at each 10% of the pin traversal (the GSAP state machine only runs
 * on the virtual scroll — direct scrollTop never wakes it). One load. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto('https://heronaiapp.com/', { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.waitForTimeout(11000);

const geo = await page.evaluate(() => {
  const wrap = document.querySelector('.lenis, [data-lenis-wrapper]');
  const map = document.querySelector('.home-map');
  const wrapTop = wrap.getBoundingClientRect().top;
  return {
    mapTop: map.getBoundingClientRect().top - wrapTop + wrap.scrollTop,
    max: wrap.scrollHeight - wrap.clientHeight,
  };
});
console.log('mapTop', geo.mapTop, 'max', geo.max);

/* wheel to the map band start (mapTop - 40): ~N wheel ticks */
async function wheelTo(targetY) {
  await page.evaluate(async (t) => {
    const wrap = document.querySelector('.lenis, [data-lenis-wrapper]');
    for (let k = 0; k < 90; k += 1) {
      const cur = wrap.scrollTop;
      if (Math.abs(cur - t) < 40) break;
      const dir = t > cur ? 1 : -1;
      const step = Math.min(600, Math.abs(t - cur));
      wrap.dispatchEvent(new WheelEvent('wheel', { deltaY: dir * step, bubbles: true, cancelable: true }));
      await new Promise((r) => setTimeout(r, 30));
    }
    await new Promise((r) => setTimeout(r, 700));
  }, targetY);
}

const pinLen = 6300 - 900;
const out = [];
fs.mkdirSync('_local/b4-preview/heron-map-shots', { recursive: true });
for (let p = 0; p <= 100; p += 10) {
  const y = Math.round(geo.mapTop + (pinLen * p) / 100);
  await wheelTo(y);
  const snap = await page.evaluate(() => {
    const map = document.querySelector('.home-map');
    const layer = (sel) => {
      const els = [...map.querySelectorAll(sel)];
      return els.map((el) => {
        const cs = getComputedStyle(el);
        return { op: cs.opacity, vis: cs.visibility, txt: (el.innerText || '').replace(/\s+/g, ' ').slice(0, 60) };
      });
    };
    return {
      scrollY: Math.round(document.querySelector('.lenis').scrollTop),
      intel: layer('.home-intel-inner'),
      imgs: layer('.home-map-main-img'),
      intro: layer('.home-map-intro'),
      content: layer('.home-map-content-title, .home-map-content-sub, .home-map-content-cms, .home-map-content-label'),
    };
  });
  await page.screenshot({ path: `_local/b4-preview/heron-map-shots/p${String(p).padStart(3, '0')}.png` });
  out.push({ p, ...snap });
  console.log('p=' + p, 'y=' + snap.scrollY, 'intro op=' + snap.intro[0]?.op, 'intel0 op=' + snap.intel[0]?.op, 'intel1 op=' + snap.intel[1]?.op, 'title op=' + snap.content[0]?.op);
}
fs.writeFileSync('_local/b4-preview/heron-map-wheel.json', JSON.stringify(out, null, 1));
await browser.close();
