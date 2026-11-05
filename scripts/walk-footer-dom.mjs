#!/usr/bin/env node
/** walk-footer-dom.mjs — R338 T-06 helper for scripts/build-footer-mapping.py.
 * Dumps OUR footer's live walk against the dev server: every element's
 * recorded path under the same 6-segment truncation law the instrument's
 * pathOf uses ("footer" + last-6 descendant segments), plus its data-spec
 * key, tag and rounded geometry.
 *   PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/walk-footer-dom.mjs \
 *     http://localhost:5306 > /tmp/our-footer-walk.json */
import { chromium } from 'playwright';
const url = process.argv[2] || 'http://localhost:5306/';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(6000);
const out = await p.evaluate(() => {
  const root = document.querySelector('footer.fo-footer');
  const res = [];
  const walk = (el, segs) => {
    // the extractor's law: element-position index among ALL siblings (the
    // section root itself is always [1]), keep the LAST 6 descendant
    // segments, no [1] normalization on the head
    let idx = 1, sib = el;
    while (el !== root && (sib = sib.previousElementSibling)) idx++;
    const s = segs.concat(el.tagName.toLowerCase() + '[' + idx + ']');
    const p6 = s.length > 6 ? s.slice(-6) : s;
    res.push({
      p: 'footer > ' + p6.join(' > '),
      ds: el.getAttribute('data-spec'),
      tag: el.tagName.toLowerCase(),
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
    });
    for (const c of el.children) walk(c, s);
  };
  walk(root, []);
  return res;
});
console.log(JSON.stringify(out));
await b.close();
