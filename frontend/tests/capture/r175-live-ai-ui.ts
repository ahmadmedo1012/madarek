/**
 * r175-live-ai-ui.ts — browser verification of the honest AI surfaces
 * on the LIVE deployment: the header badge names the configured ROUTE
 * ("openrouter/free" pre-r176i, or the r176i AI_MODELS head+N surface
 * like "nvidia/nemotron-3-super-120b-a12b:free +2"), the assistant
 * bubble's mono tag names the ACTUAL
 * model OpenRouter routed that response to, the r176c privacy
 * disclosure renders in real-LLM mode, and no console errors fire.
 *
 * r176h hardening — assert-and-exit semantics (the probe used to print
 * observations and exit 0 whatever it saw):
 *  · every assertion failure exits 1 with the failing line named;
 *  · the login identity is verified through GET /api/v1/auth/me (role
 *    echo, the r174-live convention — localStorage alone is not proof);
 *  · CAPTURE_DIR is parameterized (no hardcoded /tmp path).
 *
 * Credentials ride the SMOKE_EMAIL/SMOKE_PASSWORD runtime convention
 * (r175a) — absent creds exit 2 without any request.
 */
import { chromium } from '@playwright/test';
const BASE = process.env.BASE_URL ?? 'https://madarek.onrender.com';
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
const CAPTURE_DIR = process.env.CAPTURE_DIR ?? '/tmp/r176-captures';
const failures: string[] = [];
const fail = (msg: string) => {
  failures.push(msg);
  console.log(`FAIL: ${msg}`);
};
if (!EMAIL || !PASSWORD) {
  console.log('AI UI PROBE: BLOCKED — provide SMOKE_EMAIL + SMOKE_PASSWORD (no speculative login)');
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors: string[] = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
await page.locator('#auth-email').fill(EMAIL);
await page.locator('#auth-password').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForFunction(() => {
  try { return !!JSON.parse(localStorage.getItem('mdrk-auth') ?? '{}').state?.accessToken; } catch { return false; }
}, { timeout: 20_000 });

// r176h: identity verification — the token must satisfy /auth/me
// (role echo STUDENT; localStorage alone is not proof of a session).
const meRes = await page.request.get(`${BASE}/api/v1/auth/me`, {
  headers: { authorization: `Bearer ${JSON.parse(await page.evaluate(() => localStorage.getItem('mdrk-auth') ?? '{}')).state?.accessToken ?? ''}` },
});
if (meRes.status() !== 200) {
  fail(`identity: GET /auth/me → HTTP ${meRes.status()} (expected 200)`);
} else {
  const me = (await meRes.json()) as { data?: { role?: string } };
  if (me.data?.role !== 'STUDENT') fail(`identity: /auth/me role=${me.data?.role} (expected STUDENT)`);
}

await page.goto(`${BASE}/student/ai`, { waitUntil: 'domcontentloaded' });
// The header badge: names the configured route — the r176i AI_MODELS
// surface renders the list head +N ("vendor/model:free +2"), the
// pre-r176i surface rendered the bare route id ("openrouter/free").
await page.waitForSelector('.page-header', { timeout: 20_000 });
await page.waitForTimeout(1500); // let /ai/config resolve (5-min cache, first fetch)
const badge = await page.evaluate(() => {
  const header = document.querySelector('.page-header');
  return header?.querySelector('[class*="badge"], .badge')?.textContent ?? null;
});
console.log('badge text:', badge);
if (!badge || !/openrouter|\/free|:free|\+\d|AI/.test(badge)) {
  fail(`badge: ${badge ?? 'MISSING'} — the engine badge must name the configured route`);
}

// r176h: the privacy disclosure must render in real-LLM mode (r176c).
const disclosure = await page.evaluate(() =>
  Array.from(document.querySelectorAll('p')).some((p) => (p.textContent ?? '').includes('إشعار الخصوصيّة')),
);
if (!disclosure) fail('privacy disclosure: the r176c third-party notice line is NOT rendered in real-LLM mode');

// Send ONE real message through the UI (the real input + the real button)
const input = page.getByLabel('اكتب سؤالك للمساعد');
await input.waitFor({ state: 'visible', timeout: 20_000 });
await input.fill('اشرح لي أهمية بنية المعطيات في سطرين');
await page.getByLabel('إرسال').click();
// The assistant bubble's mono tag (per-response model attribution)
let tagRendered = false;
try {
  await page.waitForSelector('.chat-bubble .font-mono', { timeout: 60_000 });
  const tags = await page.evaluate(() => Array.from(document.querySelectorAll('.chat-bubble .font-mono')).map((el) => el.textContent?.trim()));
  const lastTag = tags.at(-1);
  console.log('per-turn model tag:', lastTag);
  tagRendered = !!lastTag && /:free|openrouter/.test(lastTag ?? '');
  if (!tagRendered) fail(`model tag: ${lastTag ?? 'none'} — the per-turn tag must name the actual model`);
} catch {
  fail('model tag: NOT RENDERED (60s timeout — provider latency or a chat failure)');
}
console.log('MODEL TAG RENDERED:', tagRendered);

if (errors.length > 0) fail(`console errors: ${errors.length} (first: ${errors[0]})`);
console.log('CONSOLE ERRORS:', errors.length > 0 ? errors.slice(0, 4) : 'none');
await page.screenshot({ path: `${CAPTURE_DIR}/LIVE-ai-page-m390.png`, fullPage: true });
await browser.close();

if (failures.length > 0) {
  console.log(`AI UI PROBE: FAIL — ${failures.length} assertion(s) failed`);
  process.exit(1);
}
console.log('AI UI PROBE: PASS');
