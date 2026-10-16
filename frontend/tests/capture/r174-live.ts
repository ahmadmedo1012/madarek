/**
 * r174-live.ts — FINAL production verification against the live Render
 * deployment: real login (demo student), real dashboard, DOM probe of
 * the fixed doughnut + mobile screenshot.
 */
import { chromium } from '@playwright/test';

const BASE = 'https://madarek.onrender.com';

async function main(): Promise<void> {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)));

  // 1. Real login through the real form.
  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  const emailInput = page.locator('#auth-email').first();
  const passInput = page.locator('#auth-password').first();
  if ((await emailInput.count()) > 0 && (await passInput.count()) > 0) {
    await emailInput.fill('student@zu.edu.ly');
    await passInput.fill('1234');
    await page.keyboard.press('Enter');
    const submit = page.locator('button[type="submit"]').first();
    if ((await submit.count()) > 0) await submit.click().catch(() => {});
  } else {
    // Fallback: API login, then inject the session.
    const res = await ctx.request.post(`${BASE}/api/v1/auth/login`, {
      data: { email: 'student@zu.edu.ly', password: '1234' },
    });
    const body = (await res.json()) as { data?: { accessToken?: string; user?: unknown } };
    if (body.data?.accessToken && body.data.user) {
      await page.addInitScript(
        ([u, t]) => {
          localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user: u, accessToken: t }, version: 0 }));
        },
        [body.data.user, body.data.accessToken] as const,
      );
    } else {
      console.log('login failed:', JSON.stringify(body).slice(0, 300));
    }
  }
  await page.waitForTimeout(3000);

  // 2. The real dashboard.
  await page.goto(`${BASE}/student/dashboard`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const probe = await page.evaluate(() => {
    const el = document.querySelector('.dash-doughnut') as HTMLElement | null;
    const url = location.href;
    const greeting = document.querySelector('.page-title')?.textContent?.slice(0, 40) ?? null;
    if (!el) return { url, greeting, doughnut: 'NOT FOUND' };
    const cs = getComputedStyle(el);
    return {
      url,
      greeting,
      doughnut: {
        background: cs.backgroundImage.slice(0, 60),
        opacity: cs.opacity,
        borderRadius: cs.borderRadius,
        overflow: cs.overflow,
        center: el.querySelector('.dash-doughnut-center')?.textContent ?? null,
      },
      kpiCount: document.querySelectorAll('.grid-4 .metric').length,
    };
  });
  console.log('LIVE PROBE:', JSON.stringify(probe, null, 1));
  await page.screenshot({ path: '/tmp/r174-captures/LIVE-student-dashboard-m390.png' });
  if (errors.length > 0) {
    console.log('PAGE ERRORS:', errors.slice(0, 5));
  } else {
    console.log('PAGE ERRORS: none');
  }
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
