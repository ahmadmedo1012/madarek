# R345 HANDOFF — resume here (session stopped at D-Stage-1, budget)

## State (head c7a7c891 on main, pushed; CI 1064 in flight with the ledger fix)
- Startup + CI red (plates raw literals) fixed; rename-ledger latent red fixed (plate title → «لوحة المسجل العام», plates re-rendered STABLE).
- **F mobile DONE** (exit #1): cards system + twins + gates (`cards:check`/`illus:check`), 9 illustration seats, photos deleted, VLM 36/36 ≥8/10, OTA b1e661a6 published, NEXT-BUILD.md.
- **E1 panel DONE as honest-number** (exit #2): self-test + calibration + round 1 (57.0/54.3 vs 72) + 3 verified defect fixes; residuals in PANEL-1.md.
- **D safety net DONE + validated**: vr-diff.mjs (like-for-like webp roundtrip, ≤0.1%); clean baseline at audits/evidence/r344/vr (LOCAL-ONLY — audits/ is gitignored: re-capture on a fresh box, `node scripts/r344/vr-capture.mjs --url http://localhost:<port> --bps 1920,1440,1024,768,390`, NO trailing slash on --url).

## Next steps (in order)
1. **D-Stage-1**: run `scripts/css/dead.mjs` with an extended crawl-list (the panel route set, JSON form) × {390,1440} × {light,dark}; compute the conservative dead-set (never-matched ∧ tokens absent from ALL frontend/src incl. teacher/admin/owner/quality TSX); delete via a PostCSS generator, biggest file first (patterns.css 5,144 → components.css → colleges.css → student.css); after EVERY batch: `verify.sh --fast` + `vr-diff.mjs --bps 1440` (+ 390 spot) + conformance no-drop + push.
2. **D-2/3**: merge dead.mjs's 952 duplicate-declaration + 1,111 shadowed rules; resolve 52 `!important` via @layer; fold polish.css/unified-parity.css; target tree ≤400 lines/file. Honest outcome rule applies (never regress for a number).
3. **E2**: re-baseline (post-D pixels), 3-judge final panel → PANEL-final.md.
4. **H**: Lighthouse (mobile profile) on https://madarek.onrender.com (Render deploys the final main): LCP<2.5s · CLS<0.05 · INP<200ms; axe 0 serious/critical; `scripts/r343/live-smoke.mjs` (script exists? check scripts/ — the R344 pattern) 390/1440 × light/dark.
5. **G-2**: single main (already true), REPORT.md exit table refresh, HANDOFF refresh.

## Deploy / rollback
- Render auto-deploys `main` (web+API). Rollback = `git revert` on main (Render redeploys).
- Mobile: OTA via `EXPO_TOKEN=$(source /home/z/.madarek-env) npx eas-cli update --branch production --environment production --message "…"`; native rebuild ONLY at the Dec-1 quota window (NEXT-BUILD.md list).
- Tokens live in /home/z/.madarek-env (chmod 600, outside the repo; never commit/echo).

## Dec-1 (native rebuild) list
docs/mobile/NEXT-BUILD.md — SDK patch re-pin (expo ~58.0.23 etc. + safe-area-context ~5.11.1), runtime fingerprint check, icon regen (`npm run icons`), post-build OTA.
