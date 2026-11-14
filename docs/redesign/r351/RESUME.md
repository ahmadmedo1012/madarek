# R351 RESUME — LANE: ALL (one session; heartbeat per commit)

Spec: R351 master prompt (supersedes R350), written against `main@869c3d55`.
Tokens in `/home/z/.madarek-env` (600). Queue (§4): X → K → R-verify → A → G → M → S5/S6 → P-rem → N → W · T · V · Q → L → Z.

## done

### §0 stop-checks (2026-11-14)
- env saved (600): GITHUB_PAT, EXPO_TOKEN, VERCEL_TOKEN, NEON_API_KEY, DATABASE_URL (Neon pooled), RESEND_API_KEY, RENDER_API_KEY.
- clone OK (`--filter=blob:none`, main@869c3d55 = the commit the spec was written against) · push test `wip/push-test` push+delete OK.
- No gh CLI (API via curl + PAT, AGENTS.md §8). Node 24 / npm 11. Sandbox: 2 CPU, 4 GB RAM, ~6.7 GB disk free.
- Re-verified §1: CI/Size/deadcode/Deploy-smoke green on main@869c3d55 · branches `wip/{all-d-ci-abi-order,p1-profiles-foundation,r349-smoke-diagnostics}` (+ pr/45 ref) · android-latest refreshed 2026-11-14T03:54Z · Render API works: 1 free web_service `madarek` (srv-d88trgm7r5hc73cri9i0), not suspended.
- keep-warm before-state (X0 evidence): cron `*/5` all day; GitHub-starved to 3 runs/24 h (2 failures, logs expired — R350 H2 already made the loop wake-aware); Render auto-deploys on main pushes (events 07:06/07:18 UTC today).

## next (in order)
1. X0: windowed keep-warm (in flight — worktree wip/x0-keepwarm-window, rewrite done, awaiting merge+dispatch-verify).
2. X1: Vercel spike (preview deploy vs Neon branch; gate = full backend tests on function entry, p95 warm ≤300 ms, cold ≤3 s ×20, SSE, cookies/CSRF/CORS, Playwright e2e; HOSTING-SPIKE.md with numbers).
3. X2→X5 per spec if GO (X6 fallback if NO-GO).
4. Then K, R-verify, A, G, M, S5/S6, P-rem, N, W, T, V, Q, L, Z (§4 order).

## box notes
- Every task: worktree `/home/z/wt/<id>`, branch `wip/<id>`, commit + push each step; verify.sh --fast before main ff.
- Render URL not reachable from this sandbox (AGENTS.md §8) — live checks run through GitHub workflows or the owner.
