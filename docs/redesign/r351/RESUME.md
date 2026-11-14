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
- Constraints for X2: maxDuration 60 s (Hobby) → imports off the request path; body ≈4.5 MB → client-direct uploads; per-instance rate-limit store → shared; timers → tick.

### LANE X — X2 serverless-readiness (56cd96d4·ab2c2361·366ae799·4ad4d8d1)
- entry split app/server/api; timers → ticks (CRON_SECRET + DB claim, opportunistic/post-enqueue/cron/GH-ticker triggers); rate-limit → Postgres store; uploads → Vercel Blob client-direct (upload-ticket); vercel-env-sync.mjs. Backend 2341/19; verified live on the spike deploy (LOG X2 lines).

### LANE X — X3 remote config (0bdaeeca + the gh-pages mirror)
- apiOrigins[] served by the Vercel CDN + mirrored to gh-pages (config-pages.yml); mobile remote-config + client origin failover; mobile jest 1216/1216 (+11).

### LANE X — X4 cutover (29187787 → 2d513a46) — DONE, verified live
- The flip: apiOrigins vercel-first, the residual origin flip (8c9b14e7 — every operative surface incl. canonical/OG/sitemap/robots, mobile baked defaults, backend fallbacks, CORS default + standby, the 4 pinning tests reconciled), the JSON-LD CSP pin refresh (2d513a46).
- The deploy lesson: --prebuilt bound the [SENSITIVE] pull placeholders at runtime (DB_UNAVAILABLE 12 ms; run 43595196731); the deploy goes REMOTE build (4d80e9aa) — the platform injects the stored values server-side. The buildId pin (PATCH RENDER_GIT_COMMIT per deploy) makes /status's buildId == the pushed sha.
- Verified live on https://madarek-nine.vercel.app: /health ok:true dbLatencyMs:280 env:production buildId:2d513a46d75d; Deploy Vercel + Deploy smoke green on the same sha (logins ×3, dashboard, OpenAPI, web-vitals); OTA to production+preview; Render SUSPENDED (13:15:37 UTC, the 14-day standby); keep-warm disabled_manually; #44 closed; APP_ORIGIN PATCHed to the Vercel origin.

## next (in order)
1. X5 — the Vercel usage watch (weekly table; 60 % alert thresholds in the admin ops page) + the Hobby non-commercial caveat in the owner guide with the upgrade path.
2. K (stability), then R-verify: R1 owns the 4d80e9aa Android build failure (diagnose with its run logs; android-latest last good = 03:54 pre-wave; iOS still in flight) + the /app page freshness proof.
3. Then A, G, M (the From domain + Resend-domain decision), S5/S6, P-rem, N, W, T, V, Q, L, Z (§4 order).

## box notes
- Every task: worktree `/home/z/wt/<id>`, branch `wip/<id>`, commit + push each step; verify.sh --fast before main ff.
- Render URL not reachable from this sandbox (AGENTS.md §8) — live checks run through GitHub workflows or the owner.
