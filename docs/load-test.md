# Load test — 100 virtual students (r323 B6)

**Command** (the numbers below are only ever valid WITH it):

```bash
K6_BASE_URL=https://madarek-nine.vercel.app k6 run scripts/load/k6.js
```

Scenario: ramping 0 → 20 → 60 → 100 VUs over ~4.5 min, each VU walking
login → /me → course list → AI ask → sleep pacing (the real classroom
shape). Accounts: the documented @test.ly demo accounts only.

**Acceptance bar (thresholds in the script):**
- `http_req_duration{kind:api}` p95 < **800 ms**
- checks rate > **0.99**
- `http_req_failed` < **0.01** (an honest 429 from a rate limiter counts as a pass)

## Results ledger (fill per run — never hide a regression)

| Date | Commit (buildId) | Target | Profile | p95 (ms) | checks | failures | Verdict |
|---|---|---|---|---|---|---|---|
| 2026-10-31 | `cc899330` (local dev) | localhost:4000 | 20 VUs · 4 min (the r323 shape) | 28.8 | 36.4% | 12.2% | **measured the LIMITER, not the app** — the r323 script logged in every iteration (~1300 logins from one IP) and called the dead `/api/v1/me` path; the honest AUTH_RATE (10/15 min/IP) and the 404 poisoned it. Evidence: `audits/evidence/r327/p4/load/k6-run-sandbox20.txt` |
| 2026-11-01 | `cc899330` (local dev) | localhost:4000 | 20 VUs · 4 min (setup-fixed) | 5.3 | 54.4% | 0.0% | **the script fixed, the global limiter engaged**: login once in `setup()` (real-user shape) and `/auth/me` fixed — then the run's 3183 requests crossed GLOBAL_RATE (1000/15 min/IP): the first ~1000 served (p95 5.3 ms), the rest honestly 429'd, zero 5xx. The app's protection works. Evidence: `k6-run-sandbox20-v2.txt` |
| 2026-11-01 | `cc899330` (local dev) | localhost:4000 | **10 VUs · ≤20 s stages (inside the 1000-req budget)** | **13.5** | **100%** | **0.0%** | **all thresholds green** — `K6_MAX_VUS=10 K6_MAX_SECONDS=20 K6_BASE_URL=http://localhost:4000 k6 run scripts/load/k6.js` — 618/618 checks, p95 13.45 ms vs the 800 ms bar, honest 429s never needed. Evidence: `k6-run-sandbox-budget.txt` |

**Sandbox-scale honesty:** these rows validate the script and the local
stack's sub-limiter behavior. The full 100-VU profile (the r323 bar) is
**owner-runnable against production**:
`K6_BASE_URL=https://madarek-nine.vercel.app k6 run scripts/load/k6.js` —
expect the global limiter (1000/15 min/IP) to engage after the first
~1000 requests from the runner IP: within-budget requests carry the
performance signal; the 429 tail is the app protecting itself (counted
as passes by the script's response callback, per the bar above).

**r327 P4(f) script fixes** (`scripts/load/k6.js`, evidence in the rows):
login moved to `setup()` (1 login per account — inside AUTH_RATE by
construction; the per-iteration login of the r323 design collided with
the honest limiter), `/api/v1/me` → `/api/v1/auth/me` (the old path
404s), the account list uses the seeded demo accounts
(student/student2/teacher — the r323-era `student1@/teacher1@` do not
exist), and `K6_MAX_VUS`/`K6_MAX_SECONDS`/`K6_ACCOUNTS` let small boxes
run bounded profiles without touching the default 100-VU shape. Sandbox
note: this box's loopback is split-stack (Go/k6 binds 127.0.0.1, curl
binds ::1) — the limiter counts them as two identities; a
window-exhausted run needs its `reset` seconds, not a restart.

## Keep-warm (Render free plan sleeps after ~15 min idle)

First request after idle takes 30–60 s. Mitigations, in order:
1. **Keep-warm ping** — cron-job.org / UptimeRobot hitting
   `GET /api/v1/status` every 5 min (the route is mounted BEFORE the
   rate limiter, secret-free, and answers even under pressure).
2. The frontend's cold-start card (A2 `SlowServerCard`) explains the
   wait in Arabic with a retry — the user never sees a dead page.
3. **Owner decision for the pilot: upgrade to Render Starter ($7/mo)**
   — no sleep, no cold start. The keep-warm ping stays as belt-and-braces.
