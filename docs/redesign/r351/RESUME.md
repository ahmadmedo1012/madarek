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

## done (cont.)

### LANE X — X0 (35ce8f2a on main)
- keep-warm windowed `*/10 6-20 * * *` (06:00–21:00 UTC = 08:00–23:00 Tripoli ≈ 450–465 h/month worst-case vs 744 all-day); R350 H2 wake loop kept verbatim; RELEASE.md §Keep-warm + owner pinger guidance follow the window; dispatch run 43577558796 green.

### LANE X — X1 the hosting spike: GO (this commit)
- Project `madarek` (team Tadmora, Hobby) · region fra1 (project setting, NOT vercel.json regions) · entry `api/index.mjs` → prebuilt `backend/dist/app.js` (the .ts→src attempt failed: @vercel/node CJS-default vs ESM NodeNext — TS1479 + FUNCTION_INVOCATION_FAILED, evidence in HOSTING-SPIKE.md) · DB `spike_r351` (SQL-created; Neon API branch creation blocked — org-scoped API, account has no org; same-isolation substitute, documented).
- Gate (HOSTING-SPIKE.md, all numbers): backend 2304/19 green · authed /me p95 253 ms (worst-case vantage, ≈210 ms of it = hkg1→fra1 hop) · colds: fresh-deploy first request 1.31 s (Neon 640 ms), scale-out 0.53–0.56 s, 20/20 burst ≤1.31 s, warm >8 min idle · SSE 10 token events + done · 5/5 role browser logins + SameSite=Strict Secure cookie flags · live-smoke ALL PASS (LCP 1236 vs Render 1660) · journey e2e 157/0/27 vs deployed origin · function 142.55 MiB/5 GiB · build 1m52s+34s.
- Constraints for X2: maxDuration 60 s (Hobby) → imports off the request path; body ≈4.5 MB → client-direct uploads; per-instance rate-limit store → shared; timers → tick. Preview URLs SSO-protected by default; production alias public.

## next (in order)
1. X2 serverless-readiness refactor a→h (the .mjs+dist entry is the X2a shape; buildCommand compiles backend).
2. X3 remote config apiOrigins; X4 cutover (Render suspended 14 d); X5 usage watch.
3. Then K, R-verify, A, G, M, S5/S6, P-rem, N, W, T, V, Q, L, Z (§4 order).

## box notes
- Every task: worktree `/home/z/wt/<id>`, branch `wip/<id>`, commit + push each step; verify.sh --fast before main ff.
- Render URL not reachable from this sandbox (AGENTS.md §8) — live checks run through GitHub workflows or the owner.
