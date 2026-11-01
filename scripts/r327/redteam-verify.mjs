import { chromium } from 'playwright-core';
const EXEC = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const lum = (r,g,b)=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
const ratio=(a,b)=>{const m=s=>s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);const x=m(a),y=m(b);const l1=lum(+x[1],+x[2],+x[3]),l2=lum(+y[1],+y[2],+y[3]);return Math.round(((Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05))*100)/100};

/* 1 — landing footer contrast on DARK */
await page.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip','1'); localStorage.setItem('madarek-theme', JSON.stringify({state:{mode:'dark',modeUpdatedAt:Date.now()},version:2})); } catch {} });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const footer = await page.evaluate(() => {
  const f = document.querySelector('footer') || document.querySelector('[class*="fo-footer"]');
  if (!f) return null;
  const links = Array.from(f.querySelectorAll('a')).slice(0, 6).map(a => {
    const cs = getComputedStyle(a);
    let bgEl = a, bg = 'rgb(40, 40, 40)';
    while (bgEl && bgEl !== document.documentElement) { const c = getComputedStyle(bgEl).backgroundColor; if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; } bgEl = bgEl.parentElement; }
    return { text: a.textContent.trim().slice(0, 20), color: cs.color, bg, size: cs.fontSize };
  });
  return links;
});
console.log('1) LANDING FOOTER (dark):', JSON.stringify(footer?.map(l => ({...l, ratio: ratio(l.color, l.bg)})), null, 1));

/* 2 — about footer alignment */
await page.goto('http://localhost:5173/about', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const aboutFoot = await page.evaluate(() => {
  const el = document.querySelector('footer p, footer div, footer span');
  const f = document.querySelector('footer');
  return { footerTextAlign: f ? getComputedStyle(f).textAlign : '?', firstEl: el ? getComputedStyle(el).textAlign : '?' };
});
console.log('2) ABOUT FOOTER align:', JSON.stringify(aboutFoot));

/* 3 — privacy footer date font */
await page.goto('http://localhost:5173/legal/privacy', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2000);
const priv = await page.evaluate(() => {
  const f = document.querySelector('footer') || document.body;
  const el = Array.from(f.querySelectorAll('*')).find(e => /20\d\d-\d\d-\d\d|آخر تحديث/.test(e.textContent || ''));
  return el ? { text: el.textContent.trim().slice(0, 40), font: getComputedStyle(el).fontFamily.slice(0, 60) } : null;
});
console.log('3) PRIVACY footer date:', JSON.stringify(priv));

/* 4 — colleges search icon side */
await page.goto('http://localhost:5173/colleges', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const search = await page.evaluate(() => {
  const input = document.querySelector('input[type="search"], input[placeholder*="بحث"], input[placeholder*="ابحث"]');
  if (!input) return null;
  const box = input.closest('div') || input.parentElement;
  const br = box.getBoundingClientRect(), ir = input.getBoundingClientRect();
  return { inputRight: Math.round(ir.right), boxRight: Math.round(br.right), boxLeft: Math.round(br.left), inputLeft: Math.round(ir.left), rtl: getComputedStyle(document.documentElement).direction, dirOfInput: input.dir, textAlign: getComputedStyle(input).textAlign };
});
console.log('4) COLLEGES search geometry:', JSON.stringify(search));

/* 5 — auth primary button */
await page.goto('http://localhost:5173/auth', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const btn = await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find(x => /تسجيل الدخول|دخول/.test(x.textContent) && x.closest('form'));
  if (!b) return null;
  const cs = getComputedStyle(b);
  return { text: b.textContent.trim().slice(0, 20), bg: cs.backgroundColor, color: cs.color, border: cs.border.slice(0, 60), cls: b.className.slice(0, 60) };
});
console.log('5) AUTH primary button:', JSON.stringify(btn));
await browser.close();

/* 6 — admin home + sync as registrar */
const b2 = await chromium.launch({ executablePath: EXEC, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const c2 = await b2.newContext({ viewport: { width: 1440, height: 900 } });
const p2 = await c2.newPage();
const res = await fetch('http://localhost:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'registrar@test.ly', password: '12345678' }) });
const session = (await res.json()).data;
await p2.addInitScript(([s]) => { try { localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: s.user, accessToken: s.accessToken }, version: 0 })); localStorage.setItem('madarek-theme', JSON.stringify({state:{mode:'light',modeUpdatedAt:Date.now()},version:2})); } catch {} }, [session]);
await p2.goto('http://localhost:5173/admin', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(5000);
const homeRed = await p2.evaluate(() => {
  const walk = (el) => {
    for (const n of el.querySelectorAll('*')) {
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = n.getBoundingClientRect();
      if (r.width > 0 && r.width < 14 && r.height > 0 && r.height < 14) {
        const c = cs.backgroundColor;
        const m = c.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
        if (m && +m[1] > 180 && +m[2] < 120 && +m[3] < 120) return { tag: n.tagName, cls: (n.className||'').toString().slice(0,60), c, size: `${Math.round(r.width)}x${Math.round(r.height)}`, x: Math.round(r.x), y: Math.round(r.y) };
      }
    }
    return null;
  };
  return walk(document.body);
});
console.log('6) ADMIN HOME red speck:', JSON.stringify(homeRed));
await p2.goto('http://localhost:5173/admin/sync', { waitUntil: 'domcontentloaded' });
await p2.waitForTimeout(3500);
const syncCol = await p2.evaluate(() => {
  const cells = Array.from(document.querySelectorAll('td, [role="cell"]')).map(td => (td.textContent || '').trim()).filter(t => t.length > 0 && t.length < 40);
  const uniq = [...new Set(cells)];
  return { sampleCells: uniq.slice(0, 25) };
});
console.log('7) SYNC table cells:', JSON.stringify(syncCol));
await b2.close();
process.exit(0);
