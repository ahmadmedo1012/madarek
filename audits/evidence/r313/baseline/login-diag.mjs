#!/usr/bin/env node
/**
 * R313 baseline login diagnostic — one careful /auth login attempt for a role
 * with full observability: hydration wait, error text, localStorage token,
 * resulting URL. Diagnoses why the census loginOnce (1800ms post-goto) failed.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.dirname(new URL(import.meta.url).pathname);
const BASE = 'https://madarek.onrender.com';
const email = process.argv[2] || 'student@demo.madarek.ly';
const pass = process.argv[3] || 'Madarek2026!';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const log = [];
  const note = (m) => { log.push(`[${new Date().toISOString().slice(11, 23)}] ${m}`); console.log(m); };

  await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded', timeout: 90000 });
  note('goto /auth done');
  try { await page.waitForLoadState('networkidle', { timeout: 25000 }); } catch (_) { note('networkidle timeout (ok)'); }
  // wait for the form to be interactive (React hydrated)
  await page.waitForSelector('#auth-email', { timeout: 15000 });
  const btn = page.locator('button[type=submit]').first();
  await btn.waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForFunction(() => {
    const b = document.querySelector('button[type=submit]');
    return b && !b.disabled;
  }, { timeout: 15000 }).catch(() => note('button never enabled — clicking anyway'));
  note('form hydrated + submit enabled');
  await sleep(800);

  await page.locator('#auth-email').fill(email);
  await page.locator('input[type="password"]').first().fill(pass);
  note('credentials filled');

  // watch the API response
  const respPromise = page.waitForResponse(r => /\/api\/auth\/login/.test(r.url()), { timeout: 30000 }).catch(() => null);
  await btn.click();
  note('submit clicked');
  const resp = await respPromise;
  if (resp) note(`POST ${resp.url()} → ${resp.status()}`);
  else note('NO /api/auth/login response observed within 30s');

  // poll outcome
  let outcome = null;
  for (let i = 0; i < 30; i++) {
    await sleep(500);
    const st = await page.evaluate(() => ({
      url: location.pathname,
      title: document.title,
      token: !!localStorage.getItem('mdrk-auth'),
      fieldErr: document.querySelector('.auth-field-error')?.textContent?.trim() || null,
      summary: document.querySelector('.auth-form-summary')?.textContent?.trim() || null,
      toastErr: document.querySelector('[class*="toast"][class*="error"], .toast-error')?.textContent?.trim() || null,
    }));
    if (st.token && st.url !== '/auth') { outcome = { ok: true, ...st }; note(`AUTH OK → ${st.url} (token present)`); break; }
    if (st.fieldErr || st.summary) { outcome = { ok: false, ...st }; note(`FORM ERROR: ${JSON.stringify(st)}`); break; }
    if (st.url !== '/auth') { outcome = { ok: true, ...st }; note(`NAVIGATED → ${st.url} (token: ${st.token})`); break; }
  }
  if (!outcome) { outcome = await page.evaluate(() => ({ url: location.pathname, title: document.title, token: !!localStorage.getItem('mdrk-auth') })); note(`TIMEOUT outcome: ${JSON.stringify(outcome)}`); }

  await page.screenshot({ path: path.join(OUT, `login-diag-${email.split('@')[0]}.jpg`), type: 'jpeg', quality: 70 }).catch(() => {});
  fs.writeFileSync(path.join(OUT, `login-diag-${email.split('@')[0]}.json`), JSON.stringify({ email, log, outcome }, null, 1));

  // if authenticated, verify the dashboard loads in a FRESH page (what the census does)
  if (outcome.token) {
    const p2 = await ctx.newPage();
    await p2.goto(`${BASE}/student/dashboard`, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {});
    await sleep(4000);
    const m = await p2.evaluate(() => ({ url: location.pathname, title: document.title, h1: document.querySelector('h1')?.textContent?.slice(0, 40) || null })).catch(e => ({ err: String(e) }));
    note(`fresh-page /student/dashboard → ${JSON.stringify(m)}`);
    await p2.close();
  }
  await browser.close();
})().catch(e => { console.error('[login-diag] FATAL', e); process.exit(1); });
