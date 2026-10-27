#!/usr/bin/env node
/** r321-title-scale.mjs — measure the app's INNER-PAGE title scale
 *  (pf-page-title on /student/dashboard with the e2e mock transport)
 *  against the auth door's .auth-form-title, at 390 + 1440, so the A8
 *  reseat uses the real measured rung, not a guess. */
import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addInitScript(() => {
  // seed the auth store exactly like fixtures/mock-transport.ts seedSession
  localStorage.setItem('mdrk-auth', JSON.stringify({
    state: {
      user: { id: 'u-student', email: 'student@test.ly', role: 'STUDENT', firstName: 'أحمد', lastName: 'الزروق', memberships: [], currentInstitution: null, membershipRole: null },
      accessToken: 'e2e-token-student',
      memberships: [],
      currentInstitution: null,
      membershipRole: null,
    },
    version: 1,
  }));
  sessionStorage.setItem('madarek-intro-skip', '1');
});
const page = await ctx.newPage();
await page.goto(`${BASE}/student/dashboard`, { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(1200);
const scale = await page.evaluate(() => {
  const probe = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const cs = getComputedStyle(el);
    return { sel, font: cs.fontSize, lh: cs.lineHeight, text: (el.textContent || '').slice(0, 30) };
  };
  return {
    url: location.pathname,
    pf: probe('.pf-page-title'),
    pageTitle: probe('h1.page-title'),
    authTitle: probe('.auth-form-title'),
    root: getComputedStyle(document.documentElement).fontSize,
  };
});
console.log(JSON.stringify(scale, null, 1));
await browser.close();
