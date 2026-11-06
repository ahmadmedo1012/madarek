import { chromium } from '/home/z/wt-t31/node_modules/playwright-core/index.mjs';
const ROUTES = ['/', '/auth', '/auth/register', '/help', '/about', '/app/download', '/legal/privacy', '/legal/terms', '/notfound-xyz'];
const CLASSES = ['fo-col3rule','bp-hotspot-num','st-partner','st-partner-label','wy-stack','st-body-col',
  'fl-head','fl-svg','fl-sketch','fl-resolved','fl-render','fl-signal','fl-labels','fl-pulse','fl-coord',
  'pr-lede','pr-stage','wy-tag','wy-tag-in','wy-tag-title','wy-tag-sub','wy-tag-dot','wy-rrule'];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
let live = {};
for (const r of ROUTES) {
  try { await pg.goto('http://localhost:5321' + r, { waitUntil: 'networkidle', timeout: 20000 }); } catch { try { await pg.goto('http://localhost:5321' + r, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch { console.log('SKIP', r); continue; } }
  await pg.waitForTimeout(400);
  for (const c of CLASSES) {
    const n = await pg.locator('.' + c.replace(/([:/])/g, '\\$1')).count().catch(() => 0);
    if (n > 0) live[c] = (live[c] || 0) + n;
  }
  // data-pt attribute check
  const dpt = await pg.locator('[data-pt]').count().catch(() => 0);
  if (dpt > 0) live['[data-pt]'] = dpt;
}
console.log('LIVE MATCHES:', JSON.stringify(live));
await b.close();
