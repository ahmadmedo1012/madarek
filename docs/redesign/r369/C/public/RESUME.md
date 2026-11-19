# C2 · Public pages + web copy — RESUME (live log)

Agent C2 · branch `agent/r369-product` · start 2026-11-19 12:07 UTC.
Instrument: `scripts/qa/overlap.mjs` (flags in header), fixture-API trick for guest-data
routes below. Raw JSONs under `/tmp/r369-public/` (mirrored at `/home/z/r369-public/`).

## 2026-11-19

- 12:07 Read CHECKLIST (C2.1–C2.4, C4.2), DESIGN-COPY-GUIDE-AR, TYPOGRAPHY, SCROLL-ARCHITECTURE,
  route inventory (r362), r366 agent4 handoff. Copy gate baseline: `node scripts/gates/copy-budget.mjs`
  → arabic words 11,917; MY public-class files all AT ceiling (headroom 0) except
  `vision/VisionPages.tsx` 39/37 (OVER by 2 — parent's in-flight edit; I own the file).
- 12:20 Route truth from `App.tsx`: guest = /auth* /about /help /contact /app /capabilities(←/features)
  /colleges{,/leaderboard,/:id} /legal/{privacy,terms,cookies,accessibility,security,data}
  /403 /404 /500 /maintenance. Any-authed = /vision(+:slug) /competitions(+:id) /settings
  /document/:filename. Student = /community /training.
- 12:26 Fixture-API server for guest-data routes (colleges surfaces fetch /api/colleges*):
  `/home/z/r369-public/fixture-api.mjs` — serves the e2e `standardRoutes()` table on :4000,
  `/auth/me` pinned 401 (true guest boot). Smoke: `/api/colleges` → 3-college list JSON,
  `/api/auth/me` → 401. Run: `npx tsx /home/z/r369-public/fixture-api.mjs`.

### 16:00-17:10 — C2.2 + C2.3 (session 2, the C2 close)
- C2.2: public class 2384→2261 words (commit 0d827161); 10 ceilings down; honest-stop analysis
  (countAr 82 structural words, legal facts, 1-3-word labels) — COPY-DIET-PUBLIC.md.
- C2.3 diagnosis + 3 levers (Lighthouse 12.8.2 mobile, prod build + gzip mirror :5310, the wave5
  protocol; full-blob → summary compaction per the 7e4df339 precedent):
  1. the lazy-chunk discovery chain: LCP render-delay 89% on /help (3526ms of 3980); the
     public-family modulepreload plugin (vite.config.ts, 22 links) — fetches the family graph at
     HTML parse. Measured LCP /app 4.2→3.8, /capabilities 4.0→2.7 in the single-run pass.
  2. the guest-reveal sweep gating cold-load LCP behind 0.7s of clip-path mask: cold-load standing
     page (1-line data-cold marker in B's GuestReveal.tsx — listed in DELIVERY + veto offered in
     REQUESTS-C-to-B; the animation:none lives in MY polish.css). Functional verification: cold
     /help = standing page (anim none, clip none); internal nav = full sweep (delay 855ms).
  3. config history (all on this box, single runs): no-plugin auth 96/cap 84/app 83 (help crashed);
     modulepreload-only features 93/cap 94/app 79/help 73; css-as-stylesheets ALL WORSE (74/70/79/73
     — 7 render-blocking sheets pushed FCP 2.1→3.0 — REVERTED); final modulepreload+cold 2-runs
     per route: PERF 72-84, LCP 3.5-4.9, a11y 100, BP 96-100, SEO 100. Run-to-run PERF variance
     measured ±8 (auth 96/79/83/76/85/77/72 across the session) — the shared box (parallel agent C
     instance + CI) makes single-run 90s unreliable evidence; the medians are the honest read.
- VERDICT C2.3: a11y/BP/SEO bars met everywhere; PERF 72-84 < 90 is the structural SPA boot
  (render-delay 3.5-4.9s simulated, the same wall the r368 T5 record hit). The real fix is
  build-time prerender/SSR of the 4 static routes — documented for the owner, out of this lane.
- C2.4: REQUESTS-C-to-B.md written (data-cold line, mobile illustrations, the css-preload lesson).
- Gates on this tree after the changes: tsc 0 errors, copy-budget CLEAN, bundle gate PASS
  (762.8KB total / entry unchanged — the plugin adds zero bytes, links only).
