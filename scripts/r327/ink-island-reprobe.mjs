/* R327 E5 (P2.6) — targeted re-probe for the three candidates the
 * batch ink-island-probe.mjs could NOT settle on the live stack:
 *
 *   · student/dashboard + student/forbidden-owner-users — the fresh
 *     seed reset the student's onboardingCompletedAt, so the 4-frame
 *     onboarding modal now auto-opens and covers the flagged boxes
 *     (the r325 captures predate the reset). The modal itself is
 *     ink-themed (proven by the batch run: modal-card lum .013–.027,
 *     light text, orange CTA) — this probe skips it, then samples the
 *     ORIGINAL flagged boxes on the dashboard beneath.
 *   · student/lecture-player — the ledger's recorded :lectureId is a
 *     cuid from the pre-reseed database, so the recorded path now
 *     lands on the honest «العنصر غير موجود» state. This probe
 *     re-resolves the CURRENT first lecture live, then samples the
 *     original flagged boxes on the real player.
 *
 * Same sampling contract as ink-island-probe.mjs (elementFromPoint
 * grid + computed backgrounds + luminance). Output:
 *   audits/evidence/r327/p2p6/ink-app/ink-island-reprobe.json
 *   + role-slug-bp-ink-reprobe.webp evidence shots.
 *
 * USAGE
 *   node scripts/r327/ink-island-reprobe.mjs --base http://localhost:5173
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sessionForEmail, authStorageJson, API } from '../r325/capture-routes.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = (opt('base', 'http://localhost:5173')).replace(/\/+$/, '');
const ROOT = path.resolve(import.meta.dirname, '../..');
const LEDGER = path.join(ROOT, 'audits/evidence/r325/routes/ledger-findings.json');
const OUT = path.join(ROOT, 'audits/evidence/r327/p2p6/ink-app');
const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');

const VP_SIZES = { 1440: { width: 1440, height: 900 }, 768: { width: 768, height: 1024 }, 390: { width: 390, height: 844 } };

/* the ledger findings for the three candidate routes (boxes stay the
 * ORIGINAL r325 capture boxes — the point is to judge the surface the
 * sweep flagged, wherever the live seed now puts it) */
const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const wanted = (r, s) => ledger.findings.filter((f) => f.class === 'INK-ISLAND' && f.role === r && f.slug === s);

/* live resolver — the CURRENT first lecture of the first enrollment
 * (capture-routes.mjs RESOLVERS.lectureId, but fresh against :4000) */
async function currentLecturePath() {
  const s = await sessionForEmail('student@test.ly');
  const en = await fetch(`${API}/api/v1/enrollments/me`, { headers: { authorization: `Bearer ${s.accessToken}` } })
    .then((r) => r.json()).then((j) => j?.data ?? []);
  const offeringId = en?.[0]?.offering?.id;
  if (!offeringId) return null;
  const lec = await fetch(`${API}/api/v1/offerings/${offeringId}/lectures`, { headers: { authorization: `Bearer ${s.accessToken}` } })
    .then((r) => r.json()).then((j) => j?.data ?? []);
  return lec?.[0]?.id ? `/student/lectures/${lec[0].id}` : null;
}

function toWebp(pngFile) {
  const webpFile = pngFile.replace(/\.png$/, '.webp');
  const r = spawnSync('python3', ['-c',
    'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=90,method=4)',
    pngFile, webpFile], { timeout: 30_000 });
  if (r.status === 0 && fs.existsSync(webpFile) && fs.statSync(webpFile).size > 0) { fs.unlinkSync(pngFile); return webpFile; }
  return pngFile;
}

/* the SAME in-page sampler as ink-island-probe.mjs (verdict-comparable) */
async function probeBox(page, desc) {
  return page.evaluate(async (d) => {
    const m = d.match(/\[([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\]/);
    if (!m) return { desc: d, error: 'no bbox in desc' };
    const [x0, y0, x1, y1] = [+m[1], +m[2], +m[3], +m[4]];
    const lum = (r, g, b) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const parse = (s) => {
      const mm = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!mm) return null;
      return { r: +mm[1], g: +mm[2], b: +mm[3], a: mm[4] === undefined ? 1 : +mm[4] };
    };
    const pts = [];
    const nx = Math.min(4, Math.max(2, Math.round((x1 - x0) / 96)));
    const ny = Math.min(3, Math.max(2, Math.round((y1 - y0) / 96)));
    for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) {
      pts.push({ x: Math.round(x0 + ((i + 0.5) / nx) * (x1 - x0)), y: Math.round(y0 + ((j + 0.5) / ny) * (y1 - y0)) });
    }
    pts.push({ x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2) });
    const seen = new Set();
    const samples = [];
    for (const { x, y } of pts) {
      const el = document.elementFromPoint(x, y);
      if (!el) { samples.push({ x, y, hit: null }); continue; }
      const rng = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
      const textNode = rng && rng.startContainer.nodeType === Node.TEXT_NODE ? rng.startContainer : null;
      const cs = getComputedStyle(el);
      const ownBg = parse(cs.backgroundColor);
      const ownColor = parse(cs.color);
      let walker = el; let resolved = null; let carrier = null; let depth = 0;
      while (walker && depth < 10) {
        const c = parse(getComputedStyle(walker).backgroundColor);
        if (c && c.a >= 0.85) { resolved = c; carrier = walker; break; }
        walker = walker.parentElement; depth += 1;
      }
      if (!resolved) resolved = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      const sig = `${el.tagName}|${String(el.className).slice(0, 80)}|${textNode ? 'T' : 'N'}|${[resolved.r, resolved.g, resolved.b].join(',')}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      samples.push({
        x, y, tag: el.tagName, cls: String(el.className).slice(0, 100),
        text: textNode ? (textNode.textContent || '').trim().slice(0, 48) : '',
        textLum: textNode && ownColor ? +lum(ownColor.r, ownColor.g, ownColor.b).toFixed(3) : null,
        ownBg: ownBg ? `${ownBg.r},${ownBg.g},${ownBg.b},${ownBg.a}` : cs.backgroundColor,
        hasBgImage: cs.backgroundImage !== 'none',
        raster: ['IMG', 'CANVAS', 'VIDEO', 'SVG', 'PICTURE'].includes(el.tagName),
        resolvedBg: `${resolved.r},${resolved.g},${resolved.b},${resolved.a}`,
        resolvedLum: +lum(resolved.r, resolved.g, resolved.b).toFixed(3),
        carrier: carrier ? `${carrier.tagName}.${String(carrier.className).slice(0, 80)}` : 'html',
      });
    }
    return { desc: d, box: [x0, y0, x1, y1], samples };
  }, desc);
}

const lecturePath = await currentLecturePath();
console.log(`ink-island-reprobe: base=${BASE} lecturePath=${lecturePath ?? 'UNRESOLVED'}`);

const TARGETS = [
  { key: 'student/dashboard', path: '/student/dashboard', findings: wanted('student', 'dashboard'), skipOnboarding: true },
  { key: 'student/forbidden-owner-users', path: '/owner/users', findings: wanted('student', 'forbidden-owner-users'), skipOnboarding: true },
  { key: 'student/lecture-player', path: lecturePath, findings: wanted('student', 'lecture-player'), skipOnboarding: false },
];

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
fs.mkdirSync(OUT, { recursive: true });
const report = [];

for (const t of TARGETS) {
  if (!t.path || !t.findings.length) continue;
  for (const bp of [1440, 768, 390]) {
    const boxes = t.findings.filter((f) => String(f.bp) === String(bp)).map((f) => f.desc);
    if (!boxes.length) continue;
    const ctx = await browser.newContext({
      viewport: VP_SIZES[bp], deviceScaleFactor: 1, locale: 'ar',
      colorScheme: 'dark', serviceWorkers: 'block',
    });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { } });
    await ctx.addInitScript(() => {
      try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch { }
    });
    const session = await sessionForEmail('student@test.ly');
    await ctx.addInitScript(({ auth }) => { try { localStorage.setItem('mdrk-auth', auth); } catch { } }, { auth: authStorageJson(session) });
    const page = await ctx.newPage();
    const entry = { route: t.key, bp, path: t.path, ink: null, boxes: [] };
    try {
      await page.goto(BASE + t.path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(2500);
      if (t.skipOnboarding) {
        /* the fresh seed re-arms the 4-frame onboarding modal — skip it
         * so the ORIGINAL flagged surfaces (the dashboard beneath) are
         * the ones sampled. The modal itself was judged in the batch
         * run (ink-themed, no island). */
        const skip = page.locator('.onboarding-flow-skip').first();
        if (await skip.count()) {
          await skip.click({ timeout: 5000 }).catch(() => { });
          await page.waitForTimeout(800);
        }
        entry.onboardingDismissed = !(await page.locator('.onboarding-flow').count());
      }
      await page.evaluate(() => document.fonts?.ready?.catch?.(() => { }));
      await page.waitForTimeout(300);
      entry.ink = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
      for (const box of boxes) entry.boxes.push(await probeBox(page, box));
      const png = path.join(OUT, `${t.key.replace('/', '-')}-${bp}-ink-reprobe.png`);
      await page.screenshot({ path: png, type: 'png', timeout: 15_000, animations: 'disabled' });
      entry.shot = toWebp(png);
    } catch (e) {
      entry.error = String(e?.message ?? e).slice(0, 300);
    }
    report.push(entry);
    const light = entry.boxes.flatMap((b) => b.samples ?? []).filter((s) => s && s.resolvedLum >= 0.45).length;
    const total = entry.boxes.flatMap((b) => b.samples ?? []).filter(Boolean).length;
    process.stdout.write(`  ${t.key}@${bp} theme=${entry.ink} dismissed=${entry.onboardingDismissed ?? '—'} lightSamples=${light}/${total}${entry.error ? ' ERR:' + entry.error.slice(0, 60) : ''}\n`);
    await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 5000))]);
  }
}

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
const out = path.join(OUT, 'ink-island-reprobe.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, lecturePath, report }, null, 1));
console.log(`→ ${out} (${report.length} entries)`);
