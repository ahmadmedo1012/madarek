# R344 RESUME
State: main=4b6a423c. CI green on fe9201fd (conformance 93.218 PASS); ratchet re-pinned 93.1 (authorized, evidence in DECISIONS.md); size-gate green; docs 22.5MB (VR baseline lives at audits/evidence/r344/vr, webp, 500 shots).
DONE:
- G-1: origin has ONLY main (195 archive tags); D1 tool+reports cherry-picked; l2d/sec-map documented.
- Item 0: +90 real checks (platform/why/cta static census fixes + binding wave r344-item0.json); CI 93.090→93.218; ratchet 93.1 (rises only).
- VR baseline: audits/evidence/r344/vr (webp q92, 25 routes × 5bp × 2 themes, deterministic encoder; vr-capture.mjs emits webp to audits/ by default).
- C-6: grain + micro-grid = inline feTurbulence data-URIs (tuned to r314 record via scripts/r344/grain-uri.mjs); media/textures + make-grain.mjs + grain-measure.json DELETED; r162 test re-keyed (feColorMatrix ban was the folio-era guard); verify --fast PASS.
NEXT (queue order):
1. C-4 product plates: scripts/art/render-plates.mjs (Playwright, real components, seeded, byte-stable --check; method docs/archive/redesign/r333/media-capture.md) → regenerate 16 public/media/product + 3 src/assets/product; delete old; manifest products[] re-key; ≤80KB each.
2. C-5: wire the 18 unwired r342 illustrations per ASSET-CONTRACT §3 (WhyScene.tsx:257 model); data-spec + mapping (new files).
3. C-sheet: imagery-sheet.png + VLM ≥8/10 per asset; CLS 0 + LCP<2.5s.
4. D: CSS 47,5xx → ≤33,000 (vr diff ≤0.1% per batch; dead.mjs + css-dead report on main now).
5. E panel (fix capture dark-boot per live-smoke.mjs; Heron calibration ≥80/84; 3 judges ≥72/84).
6. F mobile (campus.tsx→cards; doctor/tsc/jest/lint; OTA).
7. G-2 + REPORT.md + HANDOFF.md.
GOTCHAS: kill stale vites (pkill -f "vite --port 517") — they survive calls sometimes and eat ports + inotify; this box ≈ CI (93.09 clean-main baseline vs r343-box 93.24); never pipe verify.sh; scoped probes write blobs (clean before commit); feColorMatrix is legal again (R344 grain).
