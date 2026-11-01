import { chromium } from 'playwright-core';
const EXEC = '/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath: EXEC, args: ['--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const res = await fetch('http://localhost:4000/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'student@test.ly', password: '12345678' }) });
const session = (await res.json()).data;
await page.addInitScript(([s]) => { try { sessionStorage.setItem('madarek-intro-skip','1'); localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: s.user, accessToken: s.accessToken }, version: 0 })); localStorage.setItem('madarek-theme', JSON.stringify({state:{mode:'dark',modeUpdatedAt:Date.now()},version:2})); } catch {} }, [session]);
await page.goto('http://localhost:5173/student/dashboard', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const out = await page.evaluate(() => {
  const fab = document.querySelector('.fb-fab');
  const scope = document.querySelector('.topbar-scope');
  const label = document.querySelector('.ind-microlabel');
  const ruler = document.querySelector('.ind-ruler-num');
  const card = document.querySelector('.dash-resume-card');
  const mix = (el) => el ? getComputedStyle(el).color : null;
  return {
    fabFont: fab ? getComputedStyle(fab).fontSize : null,
    fabText: fab ? fab.textContent.trim().slice(0, 30) : null,
    scopeOverflow: scope ? (scope.scrollWidth > scope.clientWidth ? `STILL ${scope.scrollWidth - scope.clientWidth}px over` : 'contained') : 'no scope chip on this page',
    cardBg: card ? getComputedStyle(card).backgroundColor : null,
    labelColor: mix(label), rulerColor: mix(ruler),
  };
});
console.log(JSON.stringify(out, null, 1));
await browser.close();
process.exit(0);
