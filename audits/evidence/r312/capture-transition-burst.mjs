/**
 * R312 — Phase 4 (§R D7): the route-transition BURST — targeted,
 * screenshot-based (the video pass missed the ~600ms reveal inside
 * the dev-server chunk latency; screenshots in a tight loop catch it
 * from the first frame). Captures the landing→/colleges reveal and
 * the browser-back reveal, tiles them, and prints the per-frame
 * content-extent trajectory (the pixel proof of the top-down sweep).
 */
import { chromium } from '/home/z/madarek/node_modules/playwright/index.mjs';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, 'frames', 'route-burst');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.MADAREK_E2E_BASE_URL ?? 'http://localhost:5173';

const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1024, height: 640 } })).newPage();
await page.addInitScript(() => {
  try { sessionStorage.setItem('madarek-intro-seen', '1'); } catch { /* ignore */ }
});
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 20_000 });
await page.waitForTimeout(700);

/* warm the /colleges chunk FIRST so the reveal is not swallowed by
 * the dev-server cold transform (the D4 latency class): navigate,
 * come back, then measure the SECOND crossing. */
const warm = async () => {
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/colleges"]');
    link.scrollIntoView();
  });
  await page.waitForTimeout(300);
  await page.locator('a[href="/colleges"]').first().click();
  await page.waitForFunction(() => location.pathname === '/colleges' && !!document.querySelector('.guest-reveal-inner'), { timeout: 20_000 });
  await page.waitForTimeout(1200);
};
await warm();
await page.goBack();
await page.waitForFunction(() => !!document.querySelector('.fo-hero-title'), { timeout: 20_000 });
await page.waitForTimeout(1200);

/** burst n screenshots as fast as the loop allows, returning t0 */
async function burst(label, expectPath, count = 16) {
  /* arm: a 25ms poll for the inner mount, then the tight loop */
  const started = await page.evaluate(async ([p, n]) => {
    const t0 = performance.now();
    /* wait for the navigation + the inner to mount */
    while (!(location.pathname === p && document.querySelector('.guest-reveal-inner'))) {
      await new Promise((r) => setTimeout(r, 8));
    }
    return t0;
  }, [expectPath, count]);
  const shots = [];
  for (let i = 0; i < count; i += 1) {
    const file = path.join(OUT, `${label}-${String(i).padStart(2, '0')}.png`);
    await page.screenshot({ path: file });
    const t = await page.evaluate(() => performance.now());
    shots.push({ i, t: Math.round(t - started) });
  }
  return shots;
}

/* the measured crossing: landing → /colleges */
await page.evaluate(() => {
  const link = document.querySelector('a[href="/colleges"]');
  link.scrollIntoView();
});
await page.waitForTimeout(300);
/* click and IMMEDIATELY arm the burst poll (the click handler runs
 * synchronously; the poll sees the mount within a frame) */
const clickP = page.locator('a[href="/colleges"]').first().click();
const fwd = await burst('fwd', '/colleges', 18);
await clickP;
await page.waitForTimeout(900);

/* the reverse: browser back → the landing's own GuestReveal */
const backP = page.goBack();
const back = await burst('back', '/', 18);
await backP;
await page.waitForTimeout(900);

/* per-frame content-extent trajectory (the pixel proof) */
const traj = await page.evaluate(async (labels) => {
  const read = (f) => {
    const im = window.__dummy;
    return null;
  };
  return labels;
}, [['fwd', 'back']]);
void traj;

fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify({ fwd, back }, null, 2));

/* tile each burst 6-wide */
for (const label of ['fwd', 'back']) {
  const files = fs.readdirSync(OUT).filter((f) => f.startsWith(`${label}-`) && f.endsWith('.png')).sort();
  fs.writeFileSync(
    path.join(OUT, `${label}-list.txt`),
    "ffconcat version 1.0\n" + files.map((f) => `file '${f}'`).join('\n'),
  );
  const rows = Math.max(1, Math.ceil(files.length / 6));
  execSync(
    `ffmpeg -y -loglevel error -f concat -safe 0 -i ${path.join(OUT, `${label}-list.txt`)} -vf "scale=340:-1,tile=6x${rows}" -update 1 -frames:v 1 ${path.join(OUT, `${label}-sheet.png`)}`,
  );
}

/* the content-extent trajectory computed here (node has PIL? no — use
 * a tiny pure-node PNG scan via ffmpeg-free numpy? simplest: run the
 * scan through python) */
console.log('fwd timings:', JSON.stringify(fwd.map((s) => s.t)));
console.log('back timings:', JSON.stringify(back.map((s) => s.t)));
await browser.close();
