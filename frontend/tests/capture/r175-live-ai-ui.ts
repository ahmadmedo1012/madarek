/** r175 — REAL browser check of the AI page: the badge names the configured
 * ROUTE (openrouter/free) and the per-turn mono tag names the ACTUAL model
 * that answered, fetched through the real app + real OpenRouter. */
/**
 * r175-live-ai-ui.ts — browser verification of the honest AI surfaces
 * on the LIVE deployment: the header badge names the configured ROUTE
 * (openrouter/free) and the assistant bubble's mono tag names the
 * ACTUAL model OpenRouter routed that response to. Credentials ride the
 * SMOKE_EMAIL/SMOKE_PASSWORD runtime convention (r175a) — absent creds
 * exit 2 without any request.
 */
import { chromium } from '@playwright/test';
const BASE = process.env.BASE_URL ?? 'https://madarek.onrender.com';
const EMAIL = process.env.SMOKE_EMAIL;
const PASSWORD = process.env.SMOKE_PASSWORD;
if (!EMAIL || !PASSWORD) {
  console.log('AI UI PROBE: BLOCKED — provide SMOKE_EMAIL + SMOKE_PASSWORD (no speculative login)');
  process.exit(2);
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e).slice(0, 150)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)); });

await page.goto(`${BASE}/auth`, { waitUntil: 'domcontentloaded' });
await page.locator('#auth-email').fill(EMAIL);
await page.locator('#auth-password').fill(PASSWORD);
await page.locator('button[type="submit"]').click();
await page.waitForFunction(() => {
  try { return !!JSON.parse(localStorage.getItem('mdrk-auth') ?? '{}').state?.accessToken; } catch { return false; }
}, { timeout: 20_000 });

await page.goto(`${BASE}/student/ai`, { waitUntil: 'domcontentloaded' });
// The header badge: names the configured ROUTE id (openrouter/free)
await page.waitForSelector('.page-header', { timeout: 20_000 });
await page.waitForTimeout(1500); // let /ai/config resolve (5-min cache, first fetch)
const badge = await page.evaluate(() => {
  const header = document.querySelector('.page-header');
  return header?.querySelector('[class*="badge"], .badge')?.textContent ?? null;
});
console.log('badge text:', badge);

// Send ONE real message through the UI (the real input + the real button)
const input = page.getByLabel('اكتب سؤالك للمساعد');
await input.waitFor({ state: 'visible', timeout: 20_000 });
await input.fill('اشرح لي أهمية بنية المعطيات في سطرين');
await page.getByLabel('إرسال').click();
// The assistant bubble's mono tag (per-response model attribution)
try {
  await page.waitForSelector('.chat-bubble .font-mono', { timeout: 60_000 });
  const tags = await page.evaluate(() => Array.from(document.querySelectorAll('.chat-bubble .font-mono')).map((el) => el.textContent?.trim()));
  const lastTag = tags.at(-1);
  console.log('per-turn model tag:', lastTag);
  console.log('MODEL TAG RENDERED:', !!lastTag && /:free|openrouter/.test(lastTag ?? ''));
} catch {
  console.log('per-turn model tag: NOT RENDERED (timeout — provider latency)');
}
console.log('CONSOLE ERRORS:', errors.length > 0 ? errors.slice(0, 4) : 'none');
await page.screenshot({ path: '/tmp/r174-captures/LIVE-ai-page-m390.png', fullPage: true });
await browser.close();
