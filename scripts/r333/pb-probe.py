"""P-B R333 journey scene scale probe — geometry + progress screenshots."""
import asyncio, json, os, sys
from playwright.async_api import async_playwright

OUT = sys.argv[1] if len(sys.argv) > 1 else '/home/z/evidence-r333/p-b'
TAG = sys.argv[2] if len(sys.argv) > 2 else 'before'
os.makedirs(OUT, exist_ok=True)

JS_TARGET = """
(args) => {
  const [pct, vw] = args;
  const jt = document.querySelector('#chapters .jt');
  if (!jt) return null;
  const jtR = jt.getBoundingClientRect();
  const jtTop = jtR.top + window.scrollY;
  const vh = window.innerHeight;
  if (vw > 991) {
    const span = jtR.height - vh;
    return Math.round(Math.max(0, jtTop + span * pct));
  }
  // ≤991: the plan column is the track; the sticky window is .jt-map-in
  const col = document.querySelector('#chapters .jt-map-col');
  const mapIn = document.querySelector('#chapters .jt-map-in');
  if (!col || !mapIn) return null;
  const cR = col.getBoundingClientRect();
  const colTop = cR.top + window.scrollY;
  const stickyTop = parseFloat(getComputedStyle(mapIn).top) || 0;
  const winH = mapIn.getBoundingClientRect().height;
  const span = cR.height - winH;
  if (span <= 1) return Math.round(Math.max(0, colTop));
  return Math.round(Math.max(0, colTop - stickyTop + span * pct));
}
"""

JS_GEOM = """
() => {
  const q = (s) => document.querySelector(s);
  const jt = q('#chapters .jt');
  const col = q('#chapters .jt-map-col');
  const win = q('#chapters .jt-window');
  const svg = q('#chapters .jt-window .bp-svg');
  const close = q('#chapters .jt-close');
  const chapters = q('#chapters');
  const name = q('#chapters .jt-plan .pl-name');
  const micro = q('#chapters .jt-plan .bp-micro');
  const r = (el) => el ? { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) } : null;
  const sect = chapters ? getComputedStyle(chapters) : null;
  const parentPad = chapters && chapters.parentElement ? getComputedStyle(chapters.parentElement).paddingInline : null;
  return {
    vh: window.innerHeight,
    chaptersH: chapters ? Math.round(chapters.offsetHeight) : null,
    chaptersPadInline: sect ? sect.paddingInline : null,
    parentPadInline: parentPad,
    jt: r(jt),
    col: r(col),
    win: r(win),
    svg: r(svg),
    close: r(close),
    svgViewBox: svg ? svg.getAttribute('viewBox') : null,
    plNameUnits: name ? getComputedStyle(name).fontSize : null,
    microUnits: micro ? getComputedStyle(micro).fontSize : null,
    stage: jt ? jt.dataset.stage : null,
    wash: jt ? jt.dataset.wash : null,
    scrollY: Math.round(window.scrollY),
  };
}
"""

JS_NAME_SCREEN = """
() => {
  const name = document.querySelector('#chapters .jt-plan .pl-name');
  if (!name) return null;
  const b = name.getBoundingClientRect();
  return { h: Math.round(b.height * 10) / 10 };
}
"""

async def probe(browser, vp, points, label):
    res = {'vp': label, 'points': []}
    for pct in points:
        page = await browser.new_page(viewport={'width': vp['width'], 'height': vp['height']})
        await page.goto('http://localhost:5173/', wait_until='domcontentloaded', timeout=30000)
        await page.wait_for_selector('#chapters .jt-window .bp-svg', timeout=30000)
        await page.wait_for_timeout(1500)
        y = await page.evaluate(JS_TARGET, [pct, vp['width']])
        await page.evaluate("(y) => window.scrollTo(0, y)", y)
        await page.wait_for_timeout(800)
        geom = await page.evaluate(JS_GEOM)
        namepx = await page.evaluate(JS_NAME_SCREEN)
        shot = f"{OUT}/{TAG}-{label}-p{int(pct*100):03d}.png"
        await page.screenshot(path=shot)
        await page.close()
        geom['plNameScreenH'] = namepx and namepx['h']
        geom['seekY'] = y
        res['points'].append({'pct': pct, **geom})
        print(f"[{label}] p={pct:.2f} y={y} chaptersH={geom['chaptersH']} "
              f"svg={geom['svg'] and (geom['svg']['w'], geom['svg']['h'])} "
              f"col={geom['col'] and geom['col']['w']} close={geom['close'] and geom['close']['w']} "
              f"stage={geom['stage']} vb={geom['svgViewBox']} "
              f"name={geom['plNameUnits']}/{geom['plNameScreenH']}", flush=True)
        await page.close()
    return res

async def main():
    out = {}
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=['--no-sandbox', '--disable-dev-shm-usage'])
        out['1440'] = await probe(browser, {'width': 1440, 'height': 900}, [0.0, 0.5, 1.0], '1440')
        out['390'] = await probe(browser, {'width': 390, 'height': 844}, [0.0, 0.25, 0.5, 1.0], '390')
        await browser.close()
    with open(f'{OUT}/{TAG}-probe.json', 'w') as f:
        json.dump(out, f, indent=2)
    print('saved', f'{OUT}/{TAG}-probe.json')

asyncio.run(main())
