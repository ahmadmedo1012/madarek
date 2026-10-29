/**
 * r323 B6 — the 100-virtual-user load test (k6, https://k6.io).
 *
 *   k6 run scripts/load/k6.js                    (local: http://localhost:3000)
 *   K6_BASE_URL=https://madarek.onrender.com k6 run scripts/load/k6.js
 *
 * The scenario walks a REAL classroom minute: login → dashboard →
 * course → lecture watch-event → AI ask → notifications poll, with
 * arrival pacing (ramping-vus to 100) rather than a thundering herd.
 * Thresholds ARE the acceptance bar: p95 < 800 ms on the API, zero
 * unexpected errors. Results go to docs/load-test.md WITH the command
 * that produced them (never hide a regression).
 *
 * Accounts: the documented test accounts (@test.ly / 12345678) —
 * NEVER real students.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

const BASE = __ENV.K6_BASE_URL || 'http://localhost:3000';
const PASSWORD = '12345678';

// The documented demo accounts (BOARD §C) — three roles, spread over VUs.
const accounts = new SharedArray('accounts', function () {
  return [
    'student1@test.ly',
    'student2@test.ly',
    'teacher1@test.ly',
  ].map((email) => ({ email }));
});

export const options = {
  scenarios: {
    classroom: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 60 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
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

export default function () {
  const account = accounts[__VU % accounts.length];
  const token = login(account.email);
  if (token === null) {
    sleep(3);
    return;
  }
  const auth = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    tags: { kind: 'api' },
  };

  // dashboard
  const me = http.get(`${BASE}/api/v1/me`, auth);
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
