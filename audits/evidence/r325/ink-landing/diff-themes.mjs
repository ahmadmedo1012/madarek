/* THEME-DIFF audit — the definitive island finder.
 * For every element in every landing section, resolve the theme-bearing
 * paints (bg / border / SVG fill) in LIGHT and in DARK. An element whose
 * resolved paint is IDENTICAL in both themes and LIGHT is a hardcoded
 * paper island. Identical + dark = pinned ink chrome (noted). Flipping =
 * token-driven (correct).
 */
import { chromium } from '/home/z/wt/ink-landing/node_modules/playwright-core/index.mjs';

const EXE = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const SECTIONS = [
  ['hero', 'section.fo-hero'],
  ['statement', '#statement'],
  ['pains', '#live'],
  ['platform', '#product'],
  ['why', '.wy-section'],
  ['roles', '#roles'],
  ['cta', '#vision'],
  ['footer', '.fo-footer'],
  ['(sanity)map', '#chapters'],
];

const browser = await chromium.launch({ executablePath: EXE, args: ['--no-sandbox'] });

async function collect(mode) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(([m]) => {
    localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: m, modeUpdatedAt: 0 }, version: 2 }));
    localStorage.setItem('madarek.consent', 'accepted');
  }, [mode]);
  await page.goto('http://localhost:5208/', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForTimeout(3000);
  const data = await page.evaluate(([secs]) => {
    const parse = (v) => {
      const m = v.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
      if (!m) return v === 'none' ? 'none' : v;
      const a = m[4] === undefined ? 1 : +m[4];
      if (a === 0) return 'transparent';
      // normalize rgb ints
      const c = [Math.round(+m[1]), Math.round(+m[2]), Math.round(+m[3])];
      return a === 1 ? `rgb(${c.join(',')})` : `rgba(${c.join(',')},${a})`;
    };
    const lum = (v) => {
      const m = String(v).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
      return m ? 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3] : -1;
    };
    const out = {};
    for (const [name, sel] of secs) {
      const root = document.querySelector(sel);
      if (!root) { out[name] = ['MISSING']; continue; }
      const rows = [];
      const els = [root, ...root.querySelectorAll('*')];
      let i = 0;
      for (const el of els) {
        if (!(el instanceof HTMLElement) && !(el instanceof SVGElement)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 10 || r.height < 10) continue;
        const cs = getComputedStyle(el);
        const tag = el.tagName.toLowerCase();
        const cls = String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 60);
        const isShape = ['rect', 'circle', 'path', 'line', 'polygon', 'ellipse'].includes(tag);
        const paints = [];
        if (isShape) {
          paints.push(['fill', parse(cs.fill)]);
        } else {
          if (cs.backgroundColor !== 'rgba(0, 0, 0, 0)') paints.push(['bg', parse(cs.backgroundColor)]);
          for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
            const w = parseFloat(cs[`border${side}Width`]);
            if (w > 0) { paints.push([`bd${side[0]}`, parse(cs[`border${side}Color`])]); break; }
          }
        }
        const key0 = `${tag}.${cls}`;
        for (const pseudo of [null, '::before', '::after']) {
          const cs2 = pseudo ? getComputedStyle(el, pseudo) : cs;
          const paints2 = [];
          if (isShape) {
            paints2.push(['fill', parse(cs2.fill)]);
          } else {
            if (cs2.content !== 'none' || !pseudo) {
              if (cs2.backgroundColor !== 'rgba(0, 0, 0, 0)') paints2.push(['bg', parse(cs2.backgroundColor)]);
              for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
                const w = parseFloat(cs2[`border${side}Width`]);
                if (w > 0) { paints2.push([`bd${side[0]}`, parse(cs2[`border${side}Color`])]); break; }
              }
            }
          }
          const key = pseudo ? `${key0}${pseudo}` : key0;
          for (const [kind, v] of paints2) {
            if (v === 'transparent' || v === 'none') continue;
            if (v.startsWith('rgb') && !v.includes('gradient')) rows.push(`${key}#${kind}=${v}`);
          }
        }
      }
      out[name] = rows;
    }
    return out;
  }, [SECTIONS]);
  await ctx.close();
  return data;
}

const light = await collect('light');
const dark = await collect('dark');

const L = (v) => {
  const m = String(v).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return m ? 0.2126 * +m[1] + 0.7152 * +m[2] + 0.0722 * +m[3] : -1;
};

console.log('=== identical-in-both-themes paints (candidate pinned chrome) ===');
const counts = { island: 0, pinnedDark: 0 };
for (const name of Object.keys(light)) {
  const lSet = new Map(light[name].map((r) => [r.slice(0, r.lastIndexOf('=') + 1), r.slice(r.lastIndexOf('=') + 1)]));
  const dSet = new Map(dark[name].map((r) => [r.slice(0, r.lastIndexOf('=') + 1), r.slice(r.lastIndexOf('=') + 1)]));
  for (const [k, lv] of lSet) {
    const dv = dSet.get(k);
    if (dv === undefined) continue;
    if (lv === dv && lv.startsWith('rgb')) {
      const kind = k.slice(k.lastIndexOf('#') + 1, k.lastIndexOf('='));
      const ll = L(lv);
      const verdict = ll > 180 ? 'ISLAND(light-pinned)' : ll < 90 ? 'pinned-dark' : 'mid-pinned';
      if (verdict === 'ISLAND(light-pinned)') counts.island++;
      if (verdict === 'pinned-dark') counts.pinnedDark++;
      console.log(`${name}  ${k}  ${lv}  → ${verdict}`);
    }
  }
}
console.log('counts', JSON.stringify(counts));
await browser.close();
