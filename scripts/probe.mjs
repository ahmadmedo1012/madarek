import { chromium } from 'playwright';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ar-LY' });
const page = await ctx.newPage();
await page.goto('http://localhost:5173/auth', { waitUntil: 'networkidle' });
await page.fill('#auth-email', 'student@zu.edu.ly');
await page.fill('#auth-password', '1234');
await Promise.all([
  page.waitForURL((url) => !url.pathname.includes('/auth')),
  page.click('button.auth-submit'),
]);
await page.waitForLoadState('networkidle');
const info = await page.evaluate(() => {
  const shell = document.querySelector('.has-shell');
  const sidebar = document.querySelector('.sidebar');
  const main = document.querySelector('.main');
  const c = (el) => el ? getComputedStyle(el) : null;
  return {
    url: location.pathname,
    hasShell: !!shell,
    shellDisplay: c(shell)?.display,
    shellTpl: c(shell)?.gridTemplateColumns,
    sidebarPos: c(sidebar)?.position,
    sidebarCol: c(sidebar)?.gridColumn,
    sidebarRect: sidebar?.getBoundingClientRect(),
    mainCol: c(main)?.gridColumn,
    mainRect: main?.getBoundingClientRect(),
    bodyDisplay: getComputedStyle(document.body).display,
    bodyTpl: getComputedStyle(document.body).gridTemplateColumns,
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
