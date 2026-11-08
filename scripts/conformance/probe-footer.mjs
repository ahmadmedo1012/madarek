/* R343 footer wave — geometry probe: walks our rendered footer at a bp and
 * dumps every data-spec seat's rect + type (the geometry-anchored pairing
 * input; the r338 seat's own method, applied to the footer). */
import { chromium } from 'playwright';

const URL_ = process.argv[2] || 'http://localhost:5173/';
const BP = parseInt(process.argv[3] || '390', 10);
const OUT = process.argv[4] || '/tmp/footer-probe.json';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: BP, height: 900 } });
await page.goto(URL_, { waitUntil: 'networkidle' });
await page.evaluate(() => new Promise((r) => setTimeout(r, 1200)));
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.evaluate(() => new Promise((r) => setTimeout(r, 800)));
const seats = await page.evaluate(() => {
  const root = document.querySelector('footer.fo-footer');
  const out = [];
  const walk = (el) => {
    const ds = el.getAttribute('data-spec');
    if (ds) {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      out.push({
        ds,
        tag: el.tagName.toLowerCase(),
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
        x: Math.round(r.x * 10) / 10,
        y: Math.round((r.y + window.scrollY) * 10) / 10,
        fs: cs.fontSize,
        lh: cs.lineHeight,
        color: cs.color,
      });
    }
    for (const c of el.children) walk(c);
  };
  if (root) walk(root);
  return out;
});
await browser.close();
const fs = await import('node:fs');
fs.writeFileSync(OUT, JSON.stringify({ bp: BP, seats }, null, 1));
console.log(`probed ${seats.length} seats @${BP} → ${OUT}`);
