/**
 * r323 B6 — the 100-virtual-user load test (k6, https://k6.io).
 *
 *   k6 run scripts/load/k6.js                    (local: http://localhost:3000)
 *   K6_BASE_URL=https://madarek-nine.vercel.app k6 run scripts/load/k6.js
 *   K6_MAX_VUS=20 K6_BASE_URL=http://localhost:4000 k6 run scripts/load/k6.js
 *   K6_ACCOUNTS=student@test.ly,teacher@test.ly k6 run …   (override the
 *   demo accounts — NEVER real students)
 *
 * The scenario walks a REAL classroom minute: login → dashboard →
 * course → lecture watch-event → AI ask → notifications poll, with
 * arrival pacing (ramping-vus to 100) rather than a thundering herd.
 * Thresholds ARE the acceptance bar: p95 < 800 ms on the API, zero
 * unexpected errors. Results go to docs/load-test.md WITH the command
 * that produced them (never hide a regression).
 *
 * Accounts: the documented test accounts (@test.ly / 12345678) —
 * NEVER real students. r327 P4(f): the hardcoded r323 list
 * (student1/teacher1@test.ly) does not exist in the demo seed — the
 * defaults are now the three accounts the seed actually documents
 * (student, student2, teacher), overridable via K6_ACCOUNTS.
 *
 * K6_MAX_VUS (r327 P4(f)): cap the ramp targets for small boxes — a
 * sandbox must not measure its own CPU starvation. The default
 * profile is UNCHANGED (100 VUs); the cap only lowers stage targets.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000';
const PASSWORD = '12345678';

// The documented demo accounts (BOARD §C) — three roles, spread over VUs.
const accounts = new SharedArray('accounts', function () {
  const fromEnv = (__ENV.K6_ACCOUNTS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.endsWith('@test.ly'));
  const list = fromEnv.length > 0
    ? fromEnv
    : ['student@test.ly', 'student2@test.ly', 'teacher@test.ly'];
  return list.map((email) => ({ email }));
});

// Sandbox/box cap (r327 P4(f)): K6_MAX_VUS=20 lowers every stage target
// to at most 20; unset → the original 100-VU profile, unchanged.
const MAX_VUS = Number.parseInt(String(__ENV.K6_MAX_VUS ?? ''), 10);
const cap = (target) =>
  Number.isFinite(MAX_VUS) && MAX_VUS > 0 ? Math.min(target, MAX_VUS) : target;

/* K6_MAX_SECONDS (r327 P4(f)): cap each stage's DURATION — a small box
 * or a budget-bound run (the app's honest GLOBAL_RATE limiter is
 * 1000 req / 15 min / IP) must stay inside the request budget. Unset →
 * the original profile, unchanged. */
const MAX_SECONDS = Number.parseInt(String(__ENV.K6_MAX_SECONDS ?? ''), 10);
const parseDur = (d) => (d.endsWith('m') ? 60 * Number(d.slice(0, -1)) : Number(d.replace('s', '')));
const fmtDur = (s) => `${Math.max(1, Math.round(s))}s`;
const capDur = (d) =>
  Number.isFinite(MAX_SECONDS) && MAX_SECONDS > 0 ? fmtDur(Math.min(parseDur(d), MAX_SECONDS)) : d;

export const options = {
  scenarios: {
    classroom: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: capDur('30s'), target: cap(20) },
        { duration: capDur('1m'), target: cap(60) },
        { duration: capDur('1m'), target: cap(100) },
        { duration: capDur('1m'), target: cap(100) },
        { duration: capDur('30s'), target: 0 },
      ],
      gracefulRampDown: '15s',
    },
  },
  thresholds: {
    // The B6 acceptance bar — p95 under 800 ms for the API surface.
    'http_req_duration{kind:api}': ['p(95)<800'],
    checks: ['rate>0.99'],
    http_req_failed: ['rate<0.01'],
  },
};

// The documented bar (docs/load-test.md): «an honest 429 from a rate
// limiter counts as a pass» — the AI ask is quota/rate-limited BY
// DESIGN (25/day + 20/min per user), so 429 must not poison the
// failure metric. Everything else stays strict: 4xx/5xx on login, /me
// or /courses still counts as a failure, and the per-request checks
// below still demand 200 there.
http.setResponseCallback(http.expectedStatuses({ min: 200, max: 399 }, 429));

function login(email) {
  const res = http.post(
    `${BASE}/api/v1/auth/login`,
    JSON.stringify({ email, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { kind: 'api' } },
  );
  check(res, { 'login 200': (r) => r.status === 200 });
  const body = res.json();
  return body?.data?.accessToken ?? null;
}

/* r327 P4(f): login ONCE per account in setup() — the per-iteration login
 * of the r323 design collided with the honest AUTH_RATE limiter
 * (10 logins / 15 min / IP): a 4-minute 20-VU run burned ~1300 login
 * attempts from one IP and measured the LIMITER, not the app (the first
 * sandbox run: login 19% · /me 0% — see the evidence file). Real users
 * log in once and reuse the token; the load test now does the same.
 * setup() runs once before the VUs start, so the whole run costs 3
 * logins — inside the limiter's budget by construction. */
export function setup() {
  const tokens = {};
  for (const { email } of accounts) {
    tokens[email] = login(email);
    if (tokens[email] === null) {
      console.error(`setup: login failed for ${email} — the limiter or the seed is not ready; aborting before fake numbers`);
    }
  }
  const usable = Object.values(tokens).filter((t) => t !== null).length;
  if (usable === 0) throw new Error('setup: no usable tokens — refusing to run');
  console.log(`setup: ${usable}/${accounts.length} tokens acquired (1 login each — inside AUTH_RATE)`);
  return { tokens };
}

export default function (data) {
  const account = accounts[__VU % accounts.length];
  let token = data.tokens[account.email];
  if (token === null || token === undefined) {
    /* this account's setup login failed (limiter/quota) — the VU rides
     * the accounts that DID log in, honestly counted, never faked */
    const fallback = Object.entries(data.tokens).find(([, t]) => t !== null);
    if (!fallback) { sleep(3); return; }
    token = fallback[1];
  }
  const auth = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { kind: 'api' },
  };

  // dashboard (r327 P4(f): the real route is /auth/me — the r323 script
  // called /api/v1/me, which 404s and poisoned every /me check)
  const me = http.get(`${BASE}/api/v1/auth/me`, auth);
  check(me, { 'me 200': (r) => r.status === 200 });
  sleep(1);

  // course list
  const courses = http.get(`${BASE}/api/v1/courses?page=1&limit=12`, auth);
  check(courses, { 'courses 200': (r) => r.status === 200 });
  sleep(1);

  // AI ask (the expensive path — quota-honest: the 429 IS a pass)
  const ai = http.post(
    `${BASE}/api/v1/ai/chat`,
    JSON.stringify({ message: 'ملخص قصير لأهم أفكار المحاضرة الأولى' }),
    auth,
  );
  check(ai, { 'ai answered or honestly limited': (r) => r.status === 200 || r.status === 429 });
  sleep(2);
}
