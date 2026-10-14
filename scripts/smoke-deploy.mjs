#!/usr/bin/env node
/**
 * smoke-deploy — post-deployment smoke check against a LIVE deployment
 * (r164-l, deployment reliability).
 *
 * Dependency-free: node's global fetch only (Node ≥18; the repo pins
 * >=20 <25). Verifies the deployment answers the platform's OWN
 * contracts (app.ts / auth.routes.ts / index.html):
 *
 *   1. GET  /api/v1/health   → 200 JSON { ok=true, dbLatencyMs, env }
 *      (generous 90s timeout + one retry — absorbs Render free-tier
 *      spin-up and Neon cold start).
 *   2. GET  /                → 200 text/html containing the SPA mount
 *      root (<div id="root">) AND a Content-Security-Policy header
 *      carrying the D7 sha256 pins.
 *   3. GET  /auth            → 200 (SPA fallback serves index.html).
 *   4. OPTIONAL login round-trip — runs ONLY when BOTH SMOKE_EMAIL and
 *      SMOKE_PASSWORD are provided:
 *      POST /api/v1/auth/login → access token →
 *      GET  /api/v1/auth/me with Authorization: Bearer →
 *      the /me role must ECHO the login role.
 *
 * Secrecy: the password and the token are never printed; the email is
 * printed masked (first character + @domain only).
 *
 * Usage:
 *   npm run smoke                                # default BASE_URL
 *   BASE_URL=https://x.example npm run smoke     # target via env
 *   npm run smoke -- https://x.example           # positional target
 *   npm run smoke -- --base-url https://x.example
 *   SMOKE_EMAIL=a@b.com SMOKE_PASSWORD=… npm run smoke   # + login
 *
 * Exit code 0 = every executed check passed (a skipped optional check
 * is not a failure); 1 = at least one failure or a bad BASE_URL.
 * This script is an OWNER/ops tool — it is intentionally NOT part of
 * CI (CI never touches a live deployment). Point it only at the
 * deployment you intend to verify: with credentials it performs a REAL
 * login (rate-limited by the auth limiter like any client).
 */

const DEFAULT_BASE_URL = 'https://madarek.onrender.com';
/** frontend/index.html SPA mount root — the page is dead without it. */
const MOUNT_ROOT_MARKER = 'id="root"';
/** D7: the CSP header must pin inline scripts with sha256 hashes. */
const CSP_PIN_MARKER = 'sha256-';
const HEALTH_TIMEOUT_MS = 90_000;
const DEFAULT_TIMEOUT_MS = 30_000;
const USER_AGENT = 'madarek-smoke/1.0 (post-deploy check)';

// ─── CLI / env parsing ────────────────────────────────────────────

function parseArgs(argv) {
  const out = { baseUrl: process.env.BASE_URL ?? DEFAULT_BASE_URL, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') out.help = true;
    else if (a.startsWith('--base-url=')) out.baseUrl = a.slice('--base-url='.length);
    else if (a === '--base-url') {
      if (i + 1 < argv.length) out.baseUrl = argv[++i];
      else {
        out.error = 'قيمة ناقصة لـ --base-url / --base-url requires a value';
        out.help = true;
      }
    } else if (/^https?:\/\//i.test(a)) out.baseUrl = a;
    else {
      out.error = `وسيط غير معروف / unknown argument: ${a}`;
      out.help = true;
    }
  }
  return out;
}

function helpText() {
  return [
    'الاستخدام / usage: npm run smoke -- [BASE_URL | --base-url URL]',
    'المتغيرات / env:  BASE_URL (default https://madarek.onrender.com)',
    '                  SMOKE_EMAIL + SMOKE_PASSWORD (both) → login round-trip',
  ].join('\n');
}

/** Normalize the target to an origin (scheme + host[:port]) — path is dropped. */
function normalizeBaseUrl(raw) {
  let url;
  try {
    url = new URL(raw);
  } catch {
    return { error: `BASE_URL غير صالح / invalid BASE_URL: ${raw}` };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { error: `بروتوكول غير مدعوم / unsupported protocol: ${url.protocol}` };
  }
  return { url: url.origin };
}

// ─── HTTP helper (timeout via AbortController) ────────────────────

async function request(url, opts = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: ac.signal });
  } finally {
    clearTimeout(timer);
  }
}

/** Map a fetch/undici error onto a short bilingual, non-leaky message. */
function netError(err) {
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') {
    return 'انتهت المهلة / request timed out';
  }
  const code = err?.cause?.code ?? err?.code;
  if (typeof code === 'string' && code.length > 0) {
    return `تعذر الاتصال / network error (${code})`;
  }
  return 'تعذر الاتصال / network error';
}

const fail = (detail) => ({ status: 'fail', detail });
const pass = (detail) => ({ status: 'pass', detail });

/** Mask an email: keep the first character + the @domain, hide the rest. */
function maskEmail(email) {
  const at = email.indexOf('@');
  if (at <= 0) return '***';
  return `${email.slice(0, 1)}***${email.slice(at)}`;
}

// ─── Checks (each returns { status: 'pass'|'fail'|'skip', detail }) ─

async function checkHealth(base) {
  let res;
  try {
    res = await request(`${base}/api/v1/health`, {}, HEALTH_TIMEOUT_MS);
  } catch (err) {
    // One retry: the FIRST request may pay Render free-tier spin-up
    // (the service sleeps after idle) plus Neon cold start.
    try {
      res = await request(`${base}/api/v1/health`, {}, HEALTH_TIMEOUT_MS);
    } catch (err2) {
      return fail(`${netError(err)} ثم ${netError(err2)}`);
    }
  }
  if (res.status !== 200) {
    return fail(`HTTP ${res.status} — متوقع 200 / expected 200`);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return fail('الجسم ليس JSON / body is not JSON');
  }
  const problems = [];
  if (body?.ok !== true) problems.push('ok ≠ true');
  if (typeof body?.dbLatencyMs !== 'number') problems.push('dbLatencyMs مفقود أو ليس رقمًا / missing or not a number');
  if (typeof body?.env !== 'string' || body.env.length === 0) problems.push('env مفقود / missing');
  if (problems.length > 0) {
    return fail(`استجابة ناقصة / incomplete payload: ${problems.join(' · ')}`);
  }
  const buildId = typeof body?.buildId === 'string' ? ` · buildId=${body.buildId}` : '';
  return pass(`200 · ok=true · dbLatencyMs=${body.dbLatencyMs} · env=${body.env}${buildId}`);
}

async function checkLanding(base) {
  let res;
  try {
    res = await request(`${base}/`);
  } catch (err) {
    return fail(netError(err));
  }
  const problems = [];
  if (res.status !== 200) problems.push(`HTTP ${res.status} — متوقع 200 / expected 200`);
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    problems.push(`content-type=${contentType || '(فارغ / empty)'}`);
  }
  let html = '';
  try {
    html = await res.text();
  } catch {
    problems.push('تعذر قراءة الجسم / body unreadable');
  }
  if (!html.includes(MOUNT_ROOT_MARKER)) {
    problems.push('جذر تثبيت التطبيق مفقود / SPA mount root (id="root") missing');
  }
  const csp = res.headers.get('content-security-policy') ?? '';
  if (csp.length === 0) {
    problems.push('ترويسة CSP مفقودة / CSP header missing');
  } else if (!csp.includes(CSP_PIN_MARKER)) {
    problems.push('CSP بلا بصمة sha256 / CSP header carries no sha256 pin');
  }
  if (problems.length > 0) return fail(problems.join(' · '));
  const pins = csp.match(/sha256-/g)?.length ?? 0;
  return pass(`200 text/html · جذر التطبيق موجود / mount root present · CSP مع / with ${pins} sha256 pin(s)`);
}

async function checkAuthPage(base) {
  let res;
  try {
    res = await request(`${base}/auth`);
  } catch (err) {
    return fail(netError(err));
  }
  if (res.status !== 200) {
    return fail(`HTTP ${res.status} — متوقع 200 عبر SPA fallback / expected 200 via SPA fallback`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!contentType.includes('text/html')) {
    return fail(`HTTP 200 لكن content-type=${contentType || '(فارغ / empty)'}`);
  }
  // Consume the body so the socket is released cleanly.
  await res.text().catch(() => {});
  return pass('200 text/html — SPA fallback يخدم صفحة الدخول / serves the auth page');
}

function credentialsState(envVars) {
  const email = typeof envVars.SMOKE_EMAIL === 'string' ? envVars.SMOKE_EMAIL.trim() : '';
  const password = typeof envVars.SMOKE_PASSWORD === 'string' ? envVars.SMOKE_PASSWORD : '';
  if (email.length > 0 && password.length > 0) return { kind: 'ready', email, password };
  if (email.length > 0 || password.length > 0) return { kind: 'half' };
  return { kind: 'absent' };
}

async function checkLoginRoundTrip(base, { email, password }) {
  // 1) login → access token + role
  let res;
  try {
    res = await request(`${base}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'user-agent': USER_AGENT },
      body: JSON.stringify({ email, password }),
    });
  } catch (err) {
    return fail(`login: ${netError(err)}`);
  }
  if (res.status !== 200) {
    const hint = res.status === 429 ? ' (حد المعدل — انتظر دقيقة وأعد المحاولة / rate-limited, retry in a minute)' : '';
    return fail(`login HTTP ${res.status}${hint}`);
  }
  let body;
  try {
    body = await res.json();
  } catch {
    return fail('login: الجسم ليس JSON / body is not JSON');
  }
  const token = body?.data?.accessToken;
  const role = body?.data?.user?.role;
  if (typeof token !== 'string' || token.length === 0) {
    return fail('login: accessToken مفقود / missing from response');
  }
  if (typeof role !== 'string' || role.length === 0) {
    return fail('login: user.role مفقود / missing from response');
  }

  // 2) /api/v1/auth/me with the Bearer token → role must echo
  let meRes;
  try {
    meRes = await request(`${base}/api/v1/auth/me`, {
      headers: { authorization: `Bearer ${token}`, 'user-agent': USER_AGENT },
    });
  } catch (err) {
    return fail(`/api/v1/auth/me: ${netError(err)}`);
  }
  if (meRes.status !== 200) {
    return fail(`/api/v1/auth/me HTTP ${meRes.status} — التوكن لم يُقبل / token not accepted`);
  }
  let meBody;
  try {
    meBody = await meRes.json();
  } catch {
    return fail('/api/v1/auth/me: الجسم ليس JSON / body is not JSON');
  }
  const meRole = meBody?.data?.role;
  if (typeof meRole !== 'string' || meRole.length === 0) {
    return fail('/api/v1/auth/me: data.role مفقود / missing from response');
  }
  if (meRole !== role) {
    return fail(`تضارب الدور / role mismatch: login=${role} مقابل /me=${meRole}`);
  }
  return pass(`توكن صالح / token works · role=${role} (مطابق من /me · echoed by /me) · ${maskEmail(email)}`);
}

// ─── Table rendering ──────────────────────────────────────────────

const STATUS_TAG = {
  pass: 'PASS ✓',
  fail: 'FAIL ✗',
  skip: 'SKIP —',
};

function printReport(baseUrl, checks) {
  const line = '─'.repeat(72);
  console.log(line);
  console.log('  مدارك — فحص الدخان بعد النشر · Madarek post-deploy smoke');
  console.log(`  الهدف / target: ${baseUrl}`);
  console.log(line);
  for (const check of checks) {
    const tag = STATUS_TAG[check.result.status];
    console.log(`  ${check.num}  ${check.label}  ${'.'.repeat(Math.max(2, 40 - check.label.length))}  ${tag}`);
    console.log(`      ${check.result.detail}`);
  }
  const counts = { pass: 0, fail: 0, skip: 0 };
  for (const c of checks) counts[c.result.status] += 1;
  console.log(line);
  console.log(
    `  النتيجة / result: ${counts.pass} ناجح pass · ${counts.fail} فاشل fail · ${counts.skip} متخطًا skip`,
  );
  if (counts.fail === 0) {
    console.log('  الحالة / status: سليم ✅ — النشر يستجيب لعقود المنصة / deployment answers the platform contracts');
  } else {
    console.log('  الحالة / status: معطوب ❌ — راقب تبويب Logs في Render ثم أعد المحاولة');
    console.log('  / broken — inspect the Render Logs tab, then retry.');
  }
  console.log(line);
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(helpText());
    if (args.error) console.log(args.error);
    process.exitCode = args.error ? 1 : 0;
    return;
  }

  const normalized = normalizeBaseUrl(args.baseUrl);
  if (normalized.error) {
    console.error(`خطأ / error: ${normalized.error}`);
    process.exitCode = 1;
    return;
  }
  const base = normalized.url;

  const creds = credentialsState(process.env);

  const checks = [
    { label: 'الصحة / Health', run: () => checkHealth(base) },
    { label: 'الرئيسية / Landing', run: () => checkLanding(base) },
    { label: 'صفحة الدخول / Auth page', run: () => checkAuthPage(base) },
    {
      label: 'حلقة الدخول / Login round-trip',
      run: async () => {
        if (creds.kind === 'ready') return checkLoginRoundTrip(base, creds);
        if (creds.kind === 'half') {
          return fail('يتطلب SMOKE_EMAIL و SMOKE_PASSWORD معًا / both SMOKE_EMAIL and SMOKE_PASSWORD are required together');
        }
        return {
          status: 'skip',
          detail: 'متخطاة — زوّد SMOKE_EMAIL + SMOKE_PASSWORD لتشغيل حلقة الدخول / provide both to enable the login round-trip',
        };
      },
    },
  ];

  for (const [i, check] of checks.entries()) {
    check.num = i + 1;
    check.result = await check.run();
  }

  printReport(base, checks);

  const failed = checks.some((c) => c.result.status === 'fail');
  process.exitCode = failed ? 1 : 0;
}

main().catch((err) => {
  // Never print a raw error object that could embed credentials.
  console.error(`خطأ غير متوقع / unexpected error: ${err?.message ?? String(err)}`);
  process.exitCode = 1;
});
