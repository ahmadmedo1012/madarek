#!/usr/bin/env node
/**
 * r325/y3-probe.mjs — the Y3 defect probe (§06 «لماذا مدارك»).
 *
 * For each pinned breakpoint (1440/768/390) × theme (paper/ink):
 *   1. the overlay tooltip is GONE — .wy .prf-cards resolves display:none
 *      and zero «عرض توضيحي» fragments render inside the section;
 *   2. the void under the capture ≤ 1.5× the section's own block padding
 *      (both gaps: frame→note and note→section end);
 *   3. ONE grid — the .wy-lede column's inline box equals the capture
 *      stack's (same x, same width, the shared minmax(0,58rem) track);
 *   4. exactly ONE demo-data disclosure line renders in the section.
 *
 * Prints a JSON block; `--shots` also saves why-<bp>-<theme>.png +
 * zoom crops next to this script's evidence dir.
 *
 * Usage: node scripts/r325/y3-probe.mjs [--shots]
 * Env:   VITE_URL (default http://localhost:5203/)
 *        CHROME_BIN (default the repo's pinned chromium)
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VITE_URL || 'http://localhost:5203/';
const EXEC = process.env.CHROME_BIN
  || '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const BPS = [
  { w: 1440, h: 900 },
  { w: 768, h: 1024 },
  { w: 390, h: 844 },
];
const THEMES = ['light', 'dark']; // paper · ink
const shots = process.argv.includes('--shots');
/* evidence bucket: `--dir before|after` (default after) — the before
   pass runs against the STASHED (HEAD) tree, the after pass against
   the fixed tree, so the two sheets are probe-identical. */
const dirIdx = process.argv.indexOf('--dir');
const BUCKET = dirIdx > -1 ? process.argv[dirIdx + 1] : 'after';
const OUT = path.join(path.resolve(HERE, '..', '..'), 'audits', 'evidence', 'r325', 'y3');
if (shots) fs.mkdirSync(path.join(OUT, BUCKET), { recursive: true });

const browser = await chromium.launch({ executablePath: EXEC });
const results = [];

for (const { w, h } of BPS) {
  for (const theme of THEMES) {
    const page = await browser.newPage({ viewport: { width: w, height: h } });
    await page.addInitScript(
      ([t]) => {
        localStorage.setItem(
          'madarek-theme',
          JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 }),
        );
      },
      [theme],
    );
    await page.goto(BASE, { waitUntil: 'load' });
    await page.waitForTimeout(3000); // loader + reveals settle

    // scroll the why section into view and let the engine render it
    await page.evaluate(() => {
      document.querySelector('.wy-section')?.scrollIntoView({ block: 'center' });
    });
    await page.waitForTimeout(900);

    const m = await page.evaluate(() => {
      const px = (n) => Math.round(n * 10) / 10;
      const section = document.querySelector('.wy-section');
      const cs = section ? getComputedStyle(section) : null;
      const sec = section?.getBoundingClientRect();
      const stack = document.querySelector('.wy-stack')?.getBoundingClientRect();
      const rail = document.querySelector('.wy-rail')?.getBoundingClientRect();
      const lede = document.querySelector('.wy-lede')?.getBoundingClientRect();
      const head = document.querySelector('.wy-head')?.getBoundingClientRect();
      const note = document.querySelector('.wy-note')?.getBoundingClientRect();
      const cap = document.querySelector('.wy-capture[data-i="0"] .prf')?.getBoundingClientRect();
      const capStage = document.querySelector('.wy-capture[data-i="0"] .prf-stage')?.getBoundingClientRect();
      const cards = document.querySelector('.wy .prf-cards');
      const cardsDisplay = cards ? getComputedStyle(cards).display : 'absent';

      // every visible demo-disclosure string inside the section
      // («بيانات العرض التجريبية» = the per-frame caption demo;
      //  «جامعة مدارك التجريبية» = the section's own .wy-note wording)
      const texts = [];
      section?.querySelectorAll('*').forEach((el) => {
        if (el.children.length > 0) return;
        const t = (el.textContent ?? '').trim();
        if (t.includes('التجريبية') || t.includes('عرض توضيحي')) {
          const r = el.getBoundingClientRect();
          const st = getComputedStyle(el);
          if (r.width > 0 && r.height > 0 && st.display !== 'none' && st.visibility !== 'hidden') {
            texts.push({ cls: String(el.className), text: t, y: Math.round(r.y) });
          }
        }
      });

      const padTop = cs ? parseFloat(cs.paddingTop) : NaN;
      const padBottom = cs ? parseFloat(cs.paddingBottom) : NaN;
      const sectionBottom = sec ? sec.bottom : NaN;
      // the frame (figure) bottom vs the section's inner end
      const gapFrameToNote = note && cap ? px(note.top - cap.bottom) : null;
      const gapNoteToSectionEnd = note && sec ? px(sectionBottom - note.bottom) : null;
      const gapStageToCaption = cap && capStage ? px(cap.bottom - capStage.bottom) : null;
      const voidUnderFrame = cap && sec ? px(sectionBottom - cap.bottom) : null;

      return {
        viewport: { w: innerWidth, h: innerHeight },
        theme: document.documentElement.getAttribute('data-theme'),
        sectionH: sec ? px(sec.height) : null,
        sectionPad: { top: padTop, bottom: padBottom },
        overlayCards: cardsDisplay,
        disclosures: texts,
        grid: {
          head: head ? { x: px(head.x), w: px(head.width) } : null,
          rail: rail ? { x: px(rail.x), w: px(rail.width) } : null,
          stack: stack ? { x: px(stack.x), w: px(stack.width) } : null,
          lede: lede ? { x: px(lede.x), w: px(lede.width) } : null,
          /* RTL: the description hugs its cell's inline-start (the gutter
             edge) — the mirrored reference seat; the CELL is what must
             equal the capture column (hence the right-edge match). */
          ledeCellMatchesStack:
            lede && stack && stack.width > 0
              ? Math.abs(lede.right - stack.right) <= 1
              : 'n/a (stack folded)',
        },
        voids: {
          stageToCaptionBottom: gapStageToCaption,
          frameToNote: gapFrameToNote,
          noteToSectionEnd: gapNoteToSectionEnd,
          underFrameTotal: voidUnderFrame,
        },
      };
    });
    m.bp = w;
    results.push(m);

    if (shots) {
      const tag = `${w}-${theme === 'light' ? 'paper' : 'ink'}`;
      const secEl = page.locator('.wy-section');
      await secEl.screenshot({ path: path.join(OUT, BUCKET, `why-${tag}.png`) });
      const stage = page.locator('.wy-capture[data-i="0"] .prf').first();
      await stage
        .screenshot({ path: path.join(OUT, BUCKET, `zoom-${tag}.png`) })
        .catch(() => {});
      await page.screenshot({ path: path.join(OUT, BUCKET, `full-${tag}.png`), fullPage: true });
    }
    await page.close();
  }
}
await browser.close();
console.log(JSON.stringify(results, null, 1));
