# R347 RESUME — Lanes A+B+Z(product residuals) done; Lane Z close-out pushed; CI watch

## done (cumulative)
- **Lane A** (pushed, CI green): D1–D5 at cause, detector landed, ratchet 92.1.
- **Lane B** (pushed `f9cb594b`+`74de0fbf`): D6a–f + D7b at cause; detector svg-clip; sticky window allowlisted; ratchet 92.1→91.7.
- **Lane Z — the defect round** (pushed `b8570325`, rebased over B):
  - D7-Z/D8-Z family: why-cap live-gate (same fix B shipped — merged); product marquee clones C/D/E DELETED (R346 §3 twin ban; 5 stacked copies, detector frac=1) + 47 bindings → noHeuristic noCounterpart; the cross-fade re-sequenced (45%/95% — no moment paints both rows); ≤991 side/cta heights content-driven (the CTA overflow onto the next row died)
  - D1-Z: statement pitch 3.24→3.65rem @≤991 (the Arabic font box 1.49×fs bled through the lh-1.35 pitch)
  - detector: clip-aware + occlusion-aware + viewport-clip + block-disjointness (each with its measured phantom) — **`/` = 0/0/0 at 1440/768/390 × light/dark** (B's exit had 28 product residuals — all Z-fixed)
  - conformance: platform coverage floor 20 + heuristic cap 65 (the twin deletion's arithmetic — Lane A's precedent); ratchet re-pinned 91.7→**91.6** (floor held EXACTLY; cumulative give-back 0.5 ≤ 1.5)
- **Lane Z — close-out** (pushed `6d201936` + `d01626b6`):
  - **CI overlap step ARMED** (required, never continue-on-error); first run caught the preloader's «100» counter mid-exit over «والإتقان» @768 → the intro-settle wait (waitForFunction .landing.intro-done, 12s) → re-verified 0/0/0 on vite dev (CI's own condition)
  - **D12 honest state**: static proof ≈0 dead (every token source-referenced); dynamic crawl public+student-only (1,864 unmatched but owned by uncrawled surfaces — plates.css ← /__plates); the rule-deletion driver swallowed live rules on its first run → reverted + documented; the safe demolition needs the all-roles crawl + VR baseline (a dedicated session)
  - **D13 panel** (12 shots, hostile VLM): avg **7.17** — 9/12 ≥8; the 3 sub-7 (why 3/3, product-390 5) cross-checked by geometry: the why stage carries 2 DOM texts, product-390 19, ZERO text-on-text pairs — the reported defects live inside the capture images' pixels (the frozen spec's collage anatomy) + a mid-transition frame; disclosed, kept-by-spec
  - **D14 live smoke** (`scripts/qa/live-smoke.mjs`): madarek.onrender.com ALL PASS — LCP 2248<2500 · CLS 0.0118<0.05 · INP-proxy 117<200 · 0 errors · health 200/300ms
  - **D15**: single main on origin ✓ · REPORT-Z.md written · counts held (unit 3038 · bundle 760.3 · !important 52 · e2e 38/38 · drift clean)

## next 3
1. **Recover the conformance gate to ≥91.6 (the #1 task)**: the extended matrix measures 91.2 on `b93eb383` — the banned-twin excusal (-677 passing platform seats) + 233 phase-shifted tail failures vs Lane B's 91.7 record. The recovery = fixing the 533 home-map-wrap residual failures (heuristic 377 + data-spec 156; exp/act samples: y −4835 vs 4252, h 7560 vs 1063 — the scroll-state seats + the content-visibility skirt collapsing the tall walkthrough at measure time). Every ~260 recovered checks = +0.4pp. The ratchet stays at 91.6 — never lowered.
2. **Lane C remainder (D9/D10)**: roles section hierarchy + the authenticated pages × roles detector sweep (the per-role corpora are not importable by dead.mjs/overlap today — the harness scripts need exporting).
3. **D12 the safe way**: export the per-role corpora → the all-roles crawl → VR baseline (vr-capture, ~250 cells, resumes) → batched rule-level deletion with ≤0.1% pixel diffs.

## gotchas (additions)
- The r305 scroll-restoration test («الرجوع يستعيد التمرير») is load-sensitive and flakes on BOTH Lane B's tree and Z's (measured 1/2-1/3 under worker load; single-worker single-run passes 10.3s; the test's own comments document 4.3s restoration paths + the 8s window). On CI it failed both attempts while the mobile session's Android builds loaded the runners — re-run before diagnosing.
- The extended conformance matrix (`--gate --scroll --interact`) runs interact at ALL 5 bps (625/317 baked-in interact fails exist in Lane B's 91.7 record too); the plain `--gate` matrix (what verify.sh full runs locally) measures ~0.4pp higher — always compare like with like.
- The mobile CI session (e36325aa..7084c845) builds native artifacts in CI — its Android job may stay red on quota/tooling; the CI/deadcode/size-gate jobs are the gates that matter for the web lanes.
- The armed detector waits for `.landing.intro-done` — any NEW route with its own gate needs the same contract or the sweep measures mid-exit states.
- dead-static.mjs is the D12 measurement instrument (≈0 on this tree); do NOT ship a rule-deletion driver without the VR baseline (the first attempt ate footer.css).
