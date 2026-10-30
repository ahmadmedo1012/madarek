/* r325 Y2 probe v2 — the §05 band's geometry against the Y2 defect
 * ledger, measured on the REBUILT DOM (the v1 script's selectors
 * .pr-pin/.pr-planwrap/.pr-frame-head retired with the rebuild).
 *   node y2-probe2.mjs <tag> [outfile]
 * Checks per breakpoint (1440/768/390):
 *   · seat widths — head / stage / side against the extracted
 *     home-platform 25.3 % / 42.1 % / 32.5 % (@1440 of full-1440.json)
 *   · captionBelowArt — the caption's top edge sits at/below the art's
 *     bottom edge and does NOT intersect it (tooltip-over-art defect)
 *   · noOverlay — no element outside the art subtree paints over the
 *     art box by more than 12 % of the art area
 *   · maxGap — the largest internal vertical blank run inside each
 *     column (head / frame-art / side) ≤ 1.5× its content height
 *   · monoMin — the smallest mono font-size in the band (floor 11px)
 *   · filler — the «[05] · MADAREK · UI GRAMMAR» chrome must not exist */
import { chromium } from 'playwright-core';
import fs from 'node:fs';

const tag = process.argv[2] || 'after';
const outfile = process.argv[3] || null;
const BPS = [
  { w: 1440, h: 900, name: '1440' },
  { w: 768, h: 1024, name: '768' },
  { w: 390, h: 844, name: '390' },
];
const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage', '--no-sandbox'] });
const out = { tag, bps: {} };

for (const bp of BPS) {
  const ctx = await browser.newContext({
    viewport: { width: bp.w, height: bp.h },
    deviceScaleFactor: 1,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    try { localStorage.setItem('madarek-theme', 'light'); } catch {}
  });
  await page.goto('http://localhost:5202/', { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.waitForTimeout(1000);
  await page.evaluate(async () => { await document.fonts.ready; });
  const section = page.locator('#product.pr-section, section.pr-section').first();
  try { await section.scrollIntoViewIfNeeded({ timeout: 8000 }); } catch {}
  await page.waitForTimeout(1200);

  out.bps[bp.name] = await page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) };
    };
    const q = (s) => document.querySelector(s);
    const qa = (s) => [...document.querySelectorAll(s)];
    const sec = q('.pr-section');
    const secBox = sec.getBoundingClientRect();
    const contentW = secBox.width; // full section box

    const head = q('.pr-head');
    const stage = q('.pr-stage');
    const side = q('.pr-side');
    const art = q('.pr-frame-art');
    const cap = q('.pr-frame-cap');

    // 1 — caption below art (never overlaid)
    let captionBelowArt = null;
    if (art && cap) {
      const a = art.getBoundingClientRect();
      const c = cap.getBoundingClientRect();
      captionBelowArt = {
        artBottom: +a.bottom.toFixed(1),
        capTop: +c.top.toFixed(1),
        below: c.top >= a.bottom - 1,
        overlapsArt: c.top < a.bottom && c.bottom > a.top,
      };
    }

    // 2 — any foreign element painting over the art box?
    let overlays = [];
    if (art) {
      const a = art.getBoundingClientRect();
      const area = a.width * a.height;
      overlays = qa('.pr-section *')
        .filter((el) => !art.contains(el) && el !== art)
        .map((el) => ({ el, r: el.getBoundingClientRect(), cs: getComputedStyle(el) }))
        .filter(({ r, cs }) =>
          r.width > 0 && r.height > 0 &&
          (cs.position === 'absolute' || cs.position === 'fixed') &&
          r.top < a.bottom && r.bottom > a.top && r.left < a.right && r.right > a.left)
        .map(({ el, r }) => {
          const ix = Math.max(0, Math.min(r.right, a.right) - Math.max(r.left, a.left));
          const iy = Math.max(0, Math.min(r.bottom, a.bottom) - Math.max(r.top, a.top));
          return { cls: el.className?.toString().slice(0, 40), pct: +((ix * iy) / area * 100).toFixed(1) };
        })
        .filter((o) => o.pct > 12);
    }

    // 3 — the largest internal vertical blank run per column (gap
    //     between consecutive painted child boxes inside a cell)
    const maxGap = (rootSel) => {
      const root = q(rootSel);
      if (!root) return null;
      const rb = root.getBoundingClientRect();
      const cs = getComputedStyle(root);
      const padT = parseFloat(cs.paddingTop) || 0;
      const padB = parseFloat(cs.paddingBottom) || 0;
      const kids = [...root.children]
        .filter((k) => !/^(absolute|fixed)$/.test(getComputedStyle(k).position)) // in-flow only — abs/fixed markers overlap flow children
        .map((k) => k.getBoundingClientRect())
        .filter((r) => r.height > 0)
        .sort((a, b) => a.top - b.top);
      if (!kids.length) return +(rb.height - padT - padB).toFixed(1);
      const innerTop = rb.top + padT;
      const innerBot = rb.bottom - padB;
      let gap = Math.max(0, kids[0].top - innerTop, innerBot - kids[kids.length - 1].bottom);
      for (let i = 1; i < kids.length; i++) gap = Math.max(gap, kids[i].top - kids[i - 1].bottom);
      return +gap.toFixed(1);
    };

    // 4 — mono census
    const monoSizes = {};
    let monoMin = Infinity;
    qa('.pr-section .fo-mono').forEach((el) => {
      const fs = getComputedStyle(el).fontSize;
      monoSizes[fs] = (monoSizes[fs] || 0) + 1;
      monoMin = Math.min(monoMin, parseFloat(fs));
    });

    // 5 — filler chrome census
    const bandText = sec.textContent || '';
    const filler = {
      frameHeadEl: !!q('.pr-frame-head'),
      uiGrammarLabel: /UI GRAMMAR/.test(bandText),
      pin: !!q('.pr-pin'),
      planwrap: !!q('.pr-planwrap'),
    };

    const contentH = (sel) => {
      const root = q(sel);
      if (!root) return null;
      const sum = [...root.children].reduce((s, k) => s + k.getBoundingClientRect().height, 0);
      return +sum.toFixed(1);
    };

    return {
      section: box(sec),
      head: box(head),
      headChildrenH: contentH('.pr-head'),
      chapters: box(q('.pr-chapters')),
      stage: box(stage),
      frame: box(q('.pr-frame')),
      art: box(art),
      cap: box(cap),
      captionBelowArt,
      overlays,
      side: box(side),
      sideChildrenH: contentH('.pr-side'),
      gaps: {
        head: maxGap('.pr-head'),
        art: maxGap('.pr-frame-art'),
        side: maxGap('.pr-side'),
        screen: maxGap('.pr-screen'),
      },
      monoSizes,
      monoMin: Number.isFinite(monoMin) ? monoMin : null,
      filler,
      pct: head && stage && side ? {
        head: +((head.getBoundingClientRect().width) / contentW * 100).toFixed(1),
        stage: +((stage.getBoundingClientRect().width) / contentW * 100).toFixed(1),
        side: +((side.getBoundingClientRect().width) / contentW * 100).toFixed(1),
      } : null,
    };
  });
  await ctx.close();
}
await browser.close();
const json = JSON.stringify(out, null, 1);
if (outfile) fs.writeFileSync(outfile, json);
console.log(json);
