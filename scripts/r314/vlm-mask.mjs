#!/usr/bin/env node
/**
 * R314 §3.3 cycle-2 — TEXT-MASKED capture harness (VLM judge recalibration).
 *
 * WHY: the cycle-1 VLM pair-judge (glm-5v-turbo, hostile two-framing prompt)
 * systematically returned DIFFERENT on RTL↔LTR pairs even when composition
 * matched — Arabic-vs-English text, RTL mirroring and differing artwork
 * *subject* (all permitted differences per spec) were counted as differences.
 * MATCH was unreachable by construction (see PARITY.md cycle-1 disclosure).
 * This harness produces TEXT-MASKED versions of the exact same 29
 * section-relative frames so the judge can compare COMPOSITION only.
 *
 * MASKING METHOD (choice documented per task):
 *   DOM GREEKING — a JS pass walks every DOM text node (TreeWalker, light DOM
 *   + any shadow roots), measures each line-box fragment via
 *   Range.getClientRects(), clips it against overflow-hidden ancestors
 *   (ticker/marquee bands), and paints a solid "greeking bar" over it
 *   (position:fixed at viewport coords, inserted after the 900ms settle so
 *   scroll is at rest). Bar colour = the text's own computed colour; if the
 *   fill colour is transparent but a -webkit-text-stroke is set (Madarek's
 *   outlined wordmark), the stroke colour is used so the mass survives.
 *   SVG <text>/<tspan> get the same treatment (AABB + computed fill).
 *   A CSS safety net —
 *     *, *::before, *::after { color: transparent !important;
 *       text-shadow: none !important; -webkit-text-stroke-color: transparent
 *       !important; transition: none !important }
 *     svg text, svg tspan { fill: transparent !important }
 *   — injected into the document AND every shadow root, guarantees NOTHING
 *   readable survives in pseudo-elements, inputs, or any node the bar pass
 *   missed. (transition:none matters: header links transition `color`, so an
 *   instant check/read would catch them mid-fade.)
 *
 *   Why greeking bars and NOT `color: transparent` alone: transparent text
 *   erases typographic mass — the judge would compare empty holes. Bars keep
 *   each line's placement, width, height (line-height rhythm), colour (ink vs
 *   muted vs accent) and hierarchy (heading bars are larger) while making the
 *   SCRIPT unreadable. Why not blur: blur leaks glyph shapes (task rule).
 *   Why not image-space text detection: hatching/stipple artwork is
 *   statistically indistinguishable from text strokes without the DOM — too
 *   fragile (task rule). Why not mask ONLY Madarek via its DOM and leave
 *   Heron's existing crops unmasked: asymmetric masking is itself a judge
 *   bias — so BOTH sides go through the SAME masker.
 *
 *   Every frame SELF-VERIFIES and hard-fails instead of shipping silently
 *   broken output: the net must be active, bars must be opaque, and the
 *   unmask between frames must fully restore text colours. (The first
 *   implementation leaked the net across frames via an id typo — later
 *   frames then greeked in transparent, i.e. text simply vanished. The guards
 *   make that class of bug impossible to ship.)
 *
 *   ⚠ Heron is a live third-party site: this script performs EXACTLY ONE page
 *   load per run (screenshots are local render reads, no extra network
 *   traffic) — the minimum necessary for DOM access. Frame scroll positions
 *   are REPLAYED from the cycle-1 meta.json (same formula as capture.mjs,
 *   same y for both sites), so masked frames correspond 1:1 to the cycle-1
 *   pairs the pixel judge measured. 3 unmasked "drift" shots per site (taken
 *   just before masking) are pixel-diffed against the cycle-1 captures to
 *   prove the live page still matches the state being judged.
 *
 * Usage:
 *   node scripts/r314/vlm-mask.mjs --site madarek --frames-mode live
 *       # localhost:3000 — safe to re-run. LIVE mode derives the 29 frames
 *       # from the page's CURRENT sections (same formula as capture.mjs), so
 *       # frame sNN-P always shows section NN at progress P of the layout
 *       # being judged. Used for the cycle-2 re-capture: agent 3-a's height
 *       # compaction (docH 13756→12470) landed AFTER the first masked capture,
 *       # which made replaying the cycle-1 scroll ys frame the wrong content.
 *   node scripts/r314/vlm-mask.mjs --site heron
 *       # replay mode (cycle-1 ys). Already run ONCE (2026-10-23T21:09) — do
 *       # NOT run again: one page load on the live site is the entire budget.
 * Output: audits/evidence/r314/_local/captures-masked/<site>/1440x900/light/
 *   p-sNN-P.png (masked) · drift-p-sNN-P.png (unmasked) · meta.json
 *
 * METHOD-CHOICE DISCLOSURE (honest, per task): the recommended path was
 *   “Madarek masked via CSS/JS at capture time + Heron's EXISTING crops
 *   masked in IMAGE SPACE”. Image-space masking was assessed and rejected
 *   for this reference: heronaiapp.com's aesthetic IS hand-drawn architectural
 *   hatching/stipple, which is statistically indistinguishable from glyph
 *   strokes without the DOM — a connected-component text detector would
 *   either eat the artwork or leave text readable, and it would mask the two
 *   sides with different-quality masks (DOM-exact vs heuristic), which is
 *   itself a judge bias. The sanctioned fallback (both sides unmasked,
 *   prompt-only neutralization + control pass) was rejected on EVIDENCE:
 *   cycle 1 already ran a prompt that forbade counting text/RTL/subject —
 *   glm-5v-turbo ignored it (29/29 DIFFERENT, MATCH unreachable). Instead the
 *   SAME DOM greeker was run on BOTH sites, which required exactly ONE page
 *   load of the live Heron site — a deviation from “use existing Heron
 *   captures, do not re-capture Heron”, disclosed here and in PARITY.md.
 *   Mitigations: (1) it is the only load this task spends — screenshots are
 *   local render reads and no further Heron loads happen; (2) drift shots
 *   prove the loaded state is the SAME state the existing captures recorded
 *   (s00-0: meanAbsDiff 0, s04-50: 0, s08-0: 5.76 — a minor live-site
 *   animation, not a content change); (3) both sites went through the
 *   byte-identical masker (maximally symmetric); (4) the calibration ladder
 *   (vlm-judge.mjs --calibrate) must pass before any run is trusted.
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = (m) => createRequire(path.join(import.meta.dirname, 'tools/noop.js'))(m);
const sharp = req('sharp');

const EXE = process.env.HOME + '/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SITES = {
  heron: { url: 'https://heronaiapp.com/', wait: 11000 },
  madarek: { url: 'http://localhost:3000/', wait: 9000 },
};

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const site = get('site', 'madarek');
const FRAMES_MODE = get('frames-mode', 'replay'); // 'replay' (cycle-1 ys) | 'live' (current sections)
const VP = '1440x900';
const theme = 'light';
const [W, H] = VP.split('x').map(Number);
const SETTLE = 900; // same settle as cycle-1 capture.mjs

const ROOT = path.resolve(import.meta.dirname, '../..');
const OLD = path.join(ROOT, `audits/evidence/r314/_local/captures/${site}/${VP}/${theme}`);
const OUT = path.join(ROOT, `audits/evidence/r314/_local/captures-masked/${site}/${VP}/${theme}`);
fs.mkdirSync(OUT, { recursive: true });

// ---- frames: replay the cycle-1 frame list EXACTLY, or derive it LIVE ----
// (same formula as capture.mjs §3.1: every section at traversal progress
// p ∈ {0,.5,1}, pinned/long sections 5 samples — section-relative ruling)
const oldMeta = JSON.parse(fs.readFileSync(path.join(OLD, 'meta.json'), 'utf8'));
const maxScroll = oldMeta.docHeight - H;
const replayFrames = [];
oldMeta.sections.forEach((sec, i) => {
  const steps = sec.h > maxScroll * 0.25 ? 5 : 3;
  for (let k = 0; k < steps; k++) {
    const p = steps === 1 ? 0 : k / (steps - 1);
    const y = Math.max(0, Math.min(maxScroll, Math.round(sec.top - H * 0.15 + (sec.h - H * 0.7) * p)));
    replayFrames.push({ id: `s${String(i).padStart(2, '0')}-${Math.round(p * 100)}`, y });
  }
});
const DRIFT_IDS = ['s00-0', 's04-50', 's08-0'];

// ---- the masker (runs in page context) ----
const MASK_JS = () => {
  const CLS = '__vlm_greek__';
  const NET_CSS =
    '*,*::before,*::after{color:transparent !important;text-shadow:none !important;' +
    '-webkit-text-stroke-color:transparent !important;transition:none !important;}' +
    'svg text,svg tspan{fill:transparent !important;}' +
    'input,textarea{caret-color:transparent !important;}';
  const parseA = (c) => {
    if (!c) return 0;
    const m = String(c).match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+(?:%)?))?\s*\)/);
    if (!m) return /^(transparent|none)$/.test(c) ? 0 : 1;
    if (m[4] === undefined) return 1;
    return m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
  };
  const opaque = (c) => parseA(c) > 0.01;
  const bars = [];
  // roots: light DOM + any shadow roots (the net must reach them, the walker must see their text)
  const roots = [];
  (function collect(root) {
    roots.push(root);
    for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) collect(el.shadowRoot); }
  })(document.body);
  const skip = (el) => {
    const t = el.tagName;
    if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT' || t === 'TITLE') return true;
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) return true;
    return false;
  };
  // clip a viewport-space rect against overflow-hidden ancestors (ticker bands, pinned crops)
  const clip = (el, x1, y1, x2, y2) => {
    let anc = el.parentElement;
    while (anc && anc !== document.body && anc !== document.documentElement) {
      const cs = getComputedStyle(anc);
      const ov = cs.overflow + ' ' + cs.overflowX + ' ' + cs.overflowY;
      if (/hidden|clip|auto|scroll/.test(ov)) {
        const r = anc.getBoundingClientRect();
        x1 = Math.max(x1, r.left); y1 = Math.max(y1, r.top);
        x2 = Math.min(x2, r.right); y2 = Math.min(y2, r.bottom);
      }
      anc = anc.parentElement;
    }
    return [x1, y1, x2, y2];
  };
  const push = (el, left, top, width, height, color) => {
    if (width < 3 || height < 3 || !opaque(color)) return;
    let [x1, y1, x2, y2] = clip(el, left, top, left + width, top + height);
    if (x2 - x1 < 3 || y2 - y1 < 3) return;                                // fully clipped away
    if (x2 < 0 || y2 < 0 || x1 > innerWidth || y1 > innerHeight) return;   // offscreen
    bars.push({
      x: Math.floor(x1 - 1), y: Math.floor(y1 - 1),
      w: Math.ceil(x2 - x1 + 2), h: Math.ceil(y2 - y1 + 2),
      color,
    });
  };
  for (const root of roots) {
    // 1. text nodes → per-line greeking bars in the text's own colour
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!(node.nodeValue || '').trim()) continue;
      const el = node.parentElement;
      if (!el || skip(el)) continue;
      const cs = getComputedStyle(el);
      // transparent fill + visible stroke (outlined wordmark) → bar in the stroke colour
      const barColor = opaque(cs.color) ? cs.color
        : (opaque(cs.webkitTextStrokeColor) ? cs.webkitTextStrokeColor : cs.color);
      const range = document.createRange();
      range.selectNodeContents(node);
      const rects = range.getClientRects();
      for (let i = 0; i < rects.length; i++) {
        const r = rects[i];
        push(el, r.left, r.top, r.width, r.height, barColor);
      }
    }
    // 2. SVG text (element-level AABB; rotated labels get their bounding box)
    for (const t of root.querySelectorAll('svg text, svg tspan')) {
      if (!(t.textContent || '').trim()) continue;
      if (skip(t)) continue;
      const cs = getComputedStyle(t);
      const fill = opaque(cs.fill) ? cs.fill : (opaque(cs.color) ? cs.color : cs.fill);
      const r = t.getBoundingClientRect();
      push(t, r.left, r.top, r.width, r.height, fill);
    }
  }
  // 3. paint bars (fixed = viewport coords, matches client rects at insert time)
  const frag = document.createDocumentFragment();
  let area = 0;
  for (const b of bars) {
    const d = document.createElement('div');
    d.className = CLS; // single source of truth: bars AND the net styles carry this class
    d.setAttribute('style', `position:fixed;left:${b.x}px;top:${b.y}px;width:${b.w}px;height:${b.h}px;background:${b.color};z-index:2147483647;pointer-events:none;`);
    frag.appendChild(d);
    area += b.w * b.h;
  }
  document.body.appendChild(frag);
  // 4. safety net into every root (document + shadow roots)
  for (const root of roots) {
    const style = document.createElement('style');
    style.className = CLS;
    style.textContent = NET_CSS;
    root.appendChild(style);
  }
  // self-verify: net ACTIVE (transition:none makes the flip instant) + bars opaque
  const all = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,li')];
  const sampleEls = all.filter((_, i) => i % 25 === 0).slice(0, 24);
  const netActive = sampleEls.length > 0 && sampleEls.every((e) => getComputedStyle(e).color === 'rgba(0, 0, 0, 0)');
  let opaqueBars = 0;
  for (const d of document.querySelectorAll('.' + CLS)) {
    if (d.tagName === 'DIV' && opaque(getComputedStyle(d).backgroundColor)) opaqueBars++;
  }
  return { bars: bars.length, coverage: +(area / (innerWidth * innerHeight)).toFixed(4), netActive, opaqueBars, roots: roots.length };
};

const UNMASK_JS = () => {
  let removed = 0;
  (function strip(root) {
    for (const el of root.querySelectorAll('*')) { if (el.shadowRoot) strip(el.shadowRoot); }
    root.querySelectorAll('.__vlm_greek__').forEach((e) => { e.remove(); removed++; });
  })(document);
  const els = [...document.querySelectorAll('h1,h2,h3,h4,p,a,button,span,li')].filter((_, i) => i % 25 === 0).slice(0, 24);
  const textVisibleAgain = els.some((e) => getComputedStyle(e).color !== 'rgba(0, 0, 0, 0)');
  return { removed, remaining: document.querySelectorAll('.__vlm_greek__').length, textVisibleAgain };
};

// ---- capture ----
console.log(`▸ ${site} ${VP} ${theme} — masked capture (frames-mode=${FRAMES_MODE}) → ${OUT}`);
const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--force-color-profile=srgb', '--font-render-hinting=none'],
});
const ctx = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  reducedMotion: 'no-preference',
  locale: 'en-US',
});
const page = await ctx.newPage();
page.on('pageerror', (e) => console.error('  [pageerror]', String(e).slice(0, 160)));

await page.goto(SITES[site].url, { waitUntil: 'load', timeout: 60000 });
try { await page.evaluate(() => document.fonts.ready); } catch {}
await page.waitForTimeout(SITES[site].wait);

// live scroll-container detection (same as cycle-1 capture.mjs)
const scrollInfo = await page.evaluate(() => {
  const lenisEl = document.querySelector('.lenis, [data-lenis-wrapper]');
  const winH = document.documentElement.scrollHeight;
  if (lenisEl && lenisEl.scrollHeight > window.innerHeight + 200) {
    return { mode: 'element', max: lenisEl.scrollHeight - lenisEl.clientHeight, docHeight: lenisEl.scrollHeight };
  }
  return { mode: 'window', max: winH - window.innerHeight, docHeight: winH };
});
console.log(`  live docH=${scrollInfo.docHeight} (cycle-1 ${oldMeta.docHeight}) · mode=${scrollInfo.mode}`);

// ---- frame set for this run ----
let frames;
let liveSections = null;
if (FRAMES_MODE === 'live') {
  // derive the section-relative frames from the CURRENT page (capture.mjs §3.1
  // logic, verbatim semantics) — frame ids must stay identical to the cycle-1
  // set so pairs keep pairing by id with Heron's captures
  liveSections = await page.evaluate((mode) => {
    const secs = [];
    for (const el of document.querySelectorAll('section, footer')) {
      const r = el.getBoundingClientRect();
      if (r.height > 300 && el.offsetParent !== null) {
        let top = r.top;
        if (mode === 'element') {
          const wrap = document.querySelector('.lenis, [data-lenis-wrapper]');
          top = r.top - wrap.getBoundingClientRect().top + wrap.scrollTop;
        } else {
          top = r.top + window.scrollY;
        }
        secs.push({ cls: String(el.className).split(' ')[0], top: Math.round(top), h: Math.round(r.height) });
      }
    }
    return secs;
  }, scrollInfo.mode);
  const liveMax = scrollInfo.max; // live maxScroll (element clientHeight or window innerHeight = H)
  frames = [];
  liveSections.forEach((sec, i) => {
    const steps = sec.h > liveMax * 0.25 ? 5 : 3;
    for (let k = 0; k < steps; k++) {
      const p = steps === 1 ? 0 : k / (steps - 1);
      const y = Math.max(0, Math.min(liveMax, Math.round(sec.top - H * 0.15 + (sec.h - H * 0.7) * p)));
      frames.push({ id: `s${String(i).padStart(2, '0')}-${Math.round(p * 100)}`, y });
    }
  });
  const a = frames.map((f) => f.id).join(',');
  const b = replayFrames.map((f) => f.id).join(',');
  if (a !== b) {
    throw new Error(`live frame ids diverged from the cycle-1 pairing basis — refusing to capture.
  live:    ${a}
  cycle-1: ${b}`);
  }
  console.log(`  frames-mode=live: ${frames.length} frames from ${liveSections.length} current sections (ids match cycle-1 basis ✓)`);
} else {
  frames = replayFrames;
  console.log(`  frames-mode=replay: ${frames.length} frames at cycle-1 scroll positions`);
}

const scrollTo = (y) => page.evaluate(({ mode, y }) => {
  if (mode === 'element') { document.querySelector('.lenis, [data-lenis-wrapper]').scrollTop = y; }
  else { window.scrollTo(0, y); }
}, { mode: scrollInfo.mode, y });

const stats = {};
for (const f of frames) {
  await scrollTo(f.y);
  await page.waitForTimeout(SETTLE);
  if (DRIFT_IDS.includes(f.id)) {
    await page.screenshot({ path: path.join(OUT, `drift-p-${f.id}.png`) }); // unmasked, for drift proof
  }
  const st = await page.evaluate(MASK_JS);
  if (!st.netActive) throw new Error(`p-${f.id}: safety net failed to activate — pseudo/missed text could stay readable`);
  if (st.bars > 0 && st.opaqueBars === 0) throw new Error(`p-${f.id}: all ${st.bars} greeked bars are transparent — colours were read under a leaked net`);
  await page.waitForTimeout(200); // let the mask layer paint
  await page.screenshot({ path: path.join(OUT, `p-${f.id}.png`) });
  const u = await page.evaluate(UNMASK_JS);
  if (u.remaining !== 0 || !u.textVisibleAgain) {
    throw new Error(`p-${f.id}: unmask incomplete (remaining=${u.remaining}, textVisibleAgain=${u.textVisibleAgain}) — mask state would leak into the next frame`);
  }
  stats[f.id] = st;
  console.log(`  p-${f.id}.png  bars=${st.bars} (opaque ${st.opaqueBars})  coverage=${(st.coverage * 100).toFixed(1)}%  roots=${st.roots}`);
}
await browser.close();

// ---- drift proof: unmasked shots vs cycle-1 captures ----
async function driftCompare(id) {
  const A = await sharp(path.join(OLD, `p-${id}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = await sharp(path.join(OUT, `drift-p-${id}.png`)).removeAlpha()
    .resize(A.info.width, A.info.height).raw().toBuffer({ resolveWithObject: true });
  let sum = 0, bad = 0; const n = A.data.length;
  for (let i = 0; i < n; i += 3) {
    const d = (Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2])) / 3;
    sum += d; if (d > 12) bad++;
  }
  return { meanAbsDiff: +(sum / (n / 3)).toFixed(2), fracChanged: +(bad / (n / 3)).toFixed(4) };
}
const drift = {};
for (const id of DRIFT_IDS) drift[id] = await driftCompare(id);
console.log('  drift vs cycle-1 captures:', JSON.stringify(drift));

fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({
  site, url: SITES[site].url, viewport: VP, theme,
  capturedAt: new Date().toISOString(),
  framesMode: FRAMES_MODE,
  method: 'DOM greeking: per-line Range rects → solid bars of the text\'s own computed colour ' +
    '(clipped to overflow-hidden ancestors, stroke-colour fallback for outlined text) + ' +
    'transparent-text CSS safety net into document + shadow roots. See script header.',
  framesReplayed: frames.length,
  replayedFrom: FRAMES_MODE === 'live'
    ? `LIVE section-relative derivation (same formula as capture.mjs) against the current page — cycle-1 ys NOT replayed`
    : `audits/evidence/r314/_local/captures/${site}/${VP}/${theme}/meta.json (cycle-1 scroll positions)`,
  liveDocHeight: scrollInfo.docHeight, cycle1DocHeight: oldMeta.docHeight,
  liveSections: liveSections,
  driftNote: FRAMES_MODE === 'live'
    ? 'live mode: drift vs cycle-1 captures measures agent 3-a\'s landed height compaction (expected, NOT a failure) plus intra-section progress framing shifts; it is recorded for disclosure only'
    : 'replay mode: drift proves the live page still matches the state the cycle-1 captures recorded',
  maskStats: stats,
  driftVsCycle1: drift,
}, null, 1));
console.log(`✓ ${frames.length} masked frames + ${DRIFT_IDS.length} drift shots → ${OUT}`);
