# Load test — 100 virtual students (r323 B6)

**Command** (the numbers below are only ever valid WITH it):

```bash
K6_BASE_URL=https://madarek.onrender.com k6 run scripts/load/k6.js
```

Scenario: ramping 0 → 20 → 60 → 100 VUs over ~4.5 min, each VU walking
login → /me → course list → AI ask → sleep pacing (the real classroom
shape). Accounts: the documented @test.ly demo accounts only.

**Acceptance bar (thresholds in the script):**
- `http_req_duration{kind:api}` p95 < **800 ms**
- checks rate > **0.99**
- `http_req_failed` < **0.01** (an honest 429 from a rate limiter counts as a pass)

## Results ledger (fill per run — never hide a regression)

| Date | Commit (buildId) | Target | p95 (ms) | checks | failures | Verdict |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | (run pending — the first pilot rehearsal fills this row) |

## Keep-warm (Render free plan sleeps after ~15 min idle)

First request after idle takes 30–60 s. Mitigations, in order:
1. **Keep-warm ping** — cron-job.org / UptimeRobot hitting
   `GET /api/v1/status` every 5 min (the route is mounted BEFORE the
   rate limiter, secret-free, and answers even under pressure).
2. The frontend's cold-start card (A2 `SlowServerCard`) explains the
   wait in Arabic with a retry — the user never sees a dead page.
3. **Owner decision for the pilot: upgrade to Render Starter ($7/mo)**
   — no sleep, no cold start. The keep-warm ping stays as belt-and-braces.
