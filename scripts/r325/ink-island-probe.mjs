/* P2.6 / Y5-app — INK-ISLAND verifier: for every candidate the route
 * sweep queued (ledger-findings.json, class INK-ISLAND), open the LIVE
 * page in Ink at the flagged bp and inspect the ELEMENT under each
 * flagged pixel box (elementFromPoint + caretRangeFromPoint + computed
 * backgrounds). Classifies each sample point:
 *
 *   text   — a text node sits at the point AND its ink is light
 *            (luminance ≥ .45) — the mass IS the text: verified-ok
 *   raster — IMG/CANVAS/VIDEO/SVG (or a CSS background-image) at the
 *            point — verified-ok
 *   island — an opaque LIGHT surface (luminance ≥ .45) with NO light
 *            text/raster on top — a real surface island → fix
 *
 * AFTER-shots per route × bp land in audits/evidence/r325/ink-app/.
 *
 * USAGE
 *   node scripts/r325/ink-island-probe.mjs                 # all 29
 *   node scripts/r325/ink-island-probe.mjs --only student/ai
 *   node scripts/r325/ink-island-probe.mjs --shots none    # probe only
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { sessionForEmail, ROLE_EMAIL, authStorageJson, API } from './capture-routes.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = (opt('base', 'http://localhost:5211')).replace(/\/+$/, '');
const ONLY = (opt('only', '')).split(',').map((s) => s.trim()).filter(Boolean);
const SHOTS = opt('shots', 'webp');
const ROOT = path.resolve(import.meta.dirname, '../..');
const LEDGER = path.join(ROOT, 'audits/evidence/r325/routes/ledger-findings.json');
const OUT = path.join(ROOT, 'audits/evidence/r325/ink-app');
const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');

const VP_SIZES = { 1440: { width: 1440, height: 900 }, 768: { width: 768, height: 1024 }, 390: { width: 390, height: 844 } };

/* the 29 queued candidates: 10 slugs (9 student + 1 teacher) */
const QUEUE = ['student/ai', 'student/dashboard', 'student/forbidden-owner-users', 'student/gamification',
  'student/lecture-player', 'student/profile', 'student/research', 'student/results', 'student/university', 'teacher/ai'];

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const findings = ledger.findings.filter((f) => f.class === 'INK-ISLAND' && QUEUE.includes(`${f.role}/${f.slug}`)
  && (!ONLY.length || ONLY.includes(`${f.role}/${f.slug}`)));
console.log(`ink-island-probe: base=${BASE} candidates=${findings.length} only=[${ONLY.join(',')}]`);
if (!findings.length) { console.error('no candidates matched'); process.exit(1); }

/* group by (role, slug, bp) — one page open per group, all its boxes probed */
const groups = new Map();
for (const f of findings) {
  const k = `${f.role}/${f.slug}@${f.bp}`;
  if (!groups.has(k)) groups.set(k, { role: f.role, slug: f.slug, bp: f.bp, path: f.path, boxes: [] });
  groups.get(k).boxes.push(f.desc);
}

function toWebp(pngFile) {
  const webpFile = pngFile.replace(/\.png$/, '.webp');
  const r = spawnSync('python3', ['-c',
    'import sys;from PIL import Image;Image.open(sys.argv[1]).save(sys.argv[2],"WEBP",quality=90,method=4)',
    pngFile, webpFile], { timeout: 30_000 });
  if (r.status === 0 && fs.existsSync(webpFile) && fs.statSync(webpFile).size > 0) { fs.unlinkSync(pngFile); return webpFile; }
  return pngFile;
}

/* in-page probe: sample a grid over the flagged box */
async function probeBox(page, box) {
  return page.evaluate(async (desc) => {
    const m = desc.match(/\[([\d.]+),\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)\]/);
    if (!m) return { desc, error: 'no bbox in desc' };
    const [x0, y0, x1, y1] = [+m[1], +m[2], +m[3], +m[4]];
    const lum = (r, g, b) => {
      const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const parse = (s) => {
      const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) return null;
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    };
    const pts = [];
    const nx = Math.min(4, Math.max(2, Math.round((x1 - x0) / 96)));
    const ny = Math.min(3, Math.max(2, Math.round((y1 - y0) / 96)));
    for (let i = 0; i < nx; i += 1) for (let j = 0; j < ny; j += 1) {
      const x = Math.round(x0 + ((i + 0.5) / nx) * (x1 - x0));
      const y = Math.round(y0 + ((j + 0.5) / ny) * (y1 - y0));
      pts.push({ x, y });
    }
    pts.push({ x: Math.round((x0 + x1) / 2), y: Math.round((y0 + y1) / 2) });
    const seen = new Set();
    const samples = [];
    for (const { x, y } of pts) {
      const el = document.elementFromPoint(x, y);
      if (!el) { samples.push({ x, y, hit: null }); continue; }
      const key = `${el.tagName}.${el.className && String(el.className).slice(0, 60)}@${x},${y}`;
      const rng = document.caretRangeFromPoint ? document.caretRangeFromPoint(x, y) : null;
      const textNode = rng && rng.startContainer.nodeType === Node.TEXT_NODE ? rng.startContainer : null;
      const cs = getComputedStyle(el);
      const ownBg = parse(cs.backgroundColor);
      const ownColor = parse(cs.color);
      /* resolved opaque bg: walk up to the first opaque layer */
      let walker = el; let resolved = null; let carrier = null; let depth = 0;
      while (walker && depth < 10) {
        const c = parse(getComputedStyle(walker).backgroundColor);
        if (c && c.a >= 0.85) { resolved = c; carrier = walker; break; }
        walker = walker.parentElement; depth += 1;
      }
      if (!resolved) resolved = parse(getComputedStyle(document.documentElement).backgroundColor) || { r: 0, g: 0, b: 0, a: 1 };
      const sig = `${el.tagName}|${String(el.className).slice(0, 80)}|${textNode ? 'T' : 'N'}|${resolved ? [resolved.r, resolved.g, resolved.b].join(',') : ''}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      samples.push({
        x, y,
        tag: el.tagName,
        cls: String(el.className).slice(0, 100),
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
    return { desc, box: [x0, y0, x1, y1], samples };
  }, box);
}

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
fs.mkdirSync(OUT, { recursive: true });
const report = [];

for (const g of groups.values()) {
  const email = ROLE_EMAIL[g.role];
  const ctx = await browser.newContext({
    viewport: VP_SIZES[g.bp], deviceScaleFactor: 1, locale: 'ar',
    colorScheme: 'dark', serviceWorkers: 'block',
  });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { } });
  await ctx.addInitScript(() => {
    try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch { }
  });
  if (email) {
    const session = await sessionForEmail(email);
    await ctx.addInitScript(({ auth }) => { try { localStorage.setItem('mdrk-auth', auth); } catch { } }, { auth: authStorageJson(session) });
  }
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e?.message ?? e).slice(0, 200)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
  const entry = { route: `${g.role}/${g.slug}`, bp: g.bp, path: g.path, ink: null, boxes: [], consoleErrors: errors.slice(0, 5) };
  try {
    await page.goto(BASE + g.path, { waitUntil: 'load', timeout: 30_000 });
    await page.waitForTimeout(2500);
    await page.evaluate(() => document.fonts?.ready?.catch?.(() => { }));
    await page.waitForTimeout(300);
    entry.ink = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    for (const box of g.boxes) entry.boxes.push(await probeBox(page, box));
    if (SHOTS !== 'none') {
      /* role-prefixed — student/ai and teacher/ai share the slug and
       * would otherwise overwrite each other's evidence */
      const png = path.join(OUT, `${g.role}-${g.slug}-${g.bp}-ink-after.png`);
      await page.screenshot({ path: png, type: 'png', timeout: 15_000, animations: 'disabled' });
      entry.shot = SHOTS === 'webp' ? toWebp(png) : png;
    }
  } catch (e) {
    entry.error = String(e?.message ?? e).slice(0, 300);
  }
  report.push(entry);
  const verdict = entry.boxes.flatMap((b) => b.samples ?? []).filter((s) => s && s.resolvedLum >= 0.45);
  process.stdout.write(`  ${g.role}/${g.slug}@${g.bp} theme=${entry.ink} lightSamples=${verdict.length}/${entry.boxes.flatMap((b) => b.samples ?? []).filter((s) => s).length} ${entry.error ? 'ERR ' : ''}\n`);
  await Promise.race([ctx.close(), new Promise((r) => setTimeout(r, 5000))]);
}

await Promise.race([browser.close(), new Promise((r) => setTimeout(r, 5000))]);
const out = path.join(OUT, 'ink-island-probe.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), base: BASE, report }, null, 1));
console.log(`→ ${out} (${report.length} route×bp groups)`);
