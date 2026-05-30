// Empirical visual audit: capture every critical path across 3 themes × 2 breakpoints.
// Output: PNG screenshots + a JSON report of measured layout issues per shot.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(__dirname, '../audit-out');
fs.mkdirSync(OUT, { recursive: true });

const BASE = 'http://localhost:5173';
const THEMES = ['light', 'dark', 'cinematic'];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile',  width: 375,  height: 812  },
];

// Public-facing routes only — the dashboards need auth which we'll handle later.
const ROUTES = [
  { path: '/',            label: 'landing' },
  { path: '/auth',        label: 'auth'    },
];

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t }, version: 0 }));
    document.documentElement.setAttribute('data-theme', t === 'system' ? 'light' : t);
  }, theme);
  // Force a reload so the no-flash bootstrap re-applies the theme cleanly.
  await page.reload({ waitUntil: 'networkidle' });
}

async function measureLayout(page) {
  return await page.evaluate(() => {
    const out = {
      docWidth:    document.documentElement.scrollWidth,
      viewWidth:   window.innerWidth,
      hasOverflowX: document.documentElement.scrollWidth > window.innerWidth + 1,
      blockedClicks: [],
      lowContrast:   [],
      clippedText:   [],
      offscreenInRTL: [],
    };

    // 1. Detect any element whose right edge exceeds viewport (RTL overflow).
    const all = document.body.querySelectorAll('*');
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.right > window.innerWidth + 2 && r.width < window.innerWidth) {
        out.offscreenInRTL.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 80),
          right: Math.round(r.right),
        });
        if (out.offscreenInRTL.length > 8) break;
      }
    }

    // 2. Detect text clipping: scrollHeight > offsetHeight on tight LH headings.
    const headings = document.querySelectorAll('h1, h2, h3, .page-title, .landing-title, .metric-value, .kpi-value');
    for (const el of headings) {
      if (el.scrollHeight > el.offsetHeight + 1 && el.offsetHeight > 0) {
        out.clippedText.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 60),
          scroll: el.scrollHeight, offset: el.offsetHeight,
          text: (el.textContent || '').trim().slice(0, 50),
        });
      }
    }

    return out;
  });
}

async function shot(page, route, theme, vp) {
  const filename = `${route.label}__${theme}__${vp.name}.png`;
  const filepath = path.join(OUT, filename);
  await page.screenshot({ path: filepath, fullPage: false });
  const m = await measureLayout(page);
  return { route: route.label, theme, viewport: vp.name, file: filename, metrics: m };
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: '/home/ahmed/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome',
  });
  const ctx = await browser.newContext({ locale: 'ar-LY', deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const report = [];

  for (const vp of VIEWPORTS) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    for (const route of ROUTES) {
      await page.goto(BASE + route.path, { waitUntil: 'networkidle', timeout: 30000 });
      for (const theme of THEMES) {
        await setTheme(page, theme);
        await page.waitForTimeout(600); // let entrance animations settle
        const r = await shot(page, route, theme, vp);
        report.push(r);
        console.log(`[ok] ${r.file}  overflow=${r.metrics.hasOverflowX}  clipped=${r.metrics.clippedText.length}  rtl-off=${r.metrics.offscreenInRTL.length}`);
      }
    }
  }

  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\n--- summary ---');
  for (const r of report) {
    if (r.metrics.hasOverflowX || r.metrics.clippedText.length || r.metrics.offscreenInRTL.length) {
      console.log(`${r.file}: overflow=${r.metrics.hasOverflowX} clipped=${r.metrics.clippedText.length} rtl=${r.metrics.offscreenInRTL.length}`);
    }
  }

  await browser.close();
})();
