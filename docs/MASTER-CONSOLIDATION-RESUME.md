# MASTER CONSOLIDATION RESUME — living state

Update after every substantial commit/integration. Format: done / next / gotchas.

## done

- **M0 complete** (session 1): baseline verified `main@86c9d615`, CI green, release
  audited (verify.json gap found), three inventories landed. Board =
  `MASTER-CONSOLIDATION-PLAN.md`. Root + mobile deps installed.
- **M2 complete — MERGED `5f7c9878`**: /app rebuilt on the rolling android-latest
  release (direct APK CTA, live build-info.json, iOS «قريبًا»), build-android.yml
  triggers now cover apps/mobile/app+src JS changes, verify.json joined the release
  assets (LIVE-VERIFIED: all 5 assets on android-latest), CI-BUILDS/RELEASE docs
  synced. Fast gates PASS (bundle 760.0).
- **M1 complete — MERGED `5601fe79`** (waves df808036 + c7970f7c + 2504b5f4):
  university showcase retired everywhere (13 files deleted, ~120 modified —
  /campus route+page, MediaFrame/VideoCard/InkSketch, card system + mobile twins
  + sync script, patterns.css families −462 lines, manifest/robots/sitemap/
  index.html, CSP frame-src self-only, r307 rewritten as the retirement
  contract); Statement crawl re-themed to OUR capability register (svg canvas,
  same census box grammar); synthetic tenant re-keyed to «مؤسسة مدارك
  النموذجية» across ~50 files; footer MARK_PATHS re-sourced from brand/mark
  (Option A, 8-path contract kept, anti-rot pins in r323); mobile BrandMark
  un-skewed (viewBox units + X11 ramp, 21 tests). Fast gates PASS (bundle
  753.4). Conformance: intro ≥R347 baseline at EVERY bp (390: 87.2→88 · 768:
  89.4→90 · 1024: 96.9→98 · 1440/1920: ~98), footer stable 89-90, full-matrix
  coverage 37.6% ≥ 37 floor (union math from scoped runs), no-counterpart 0.

## next (in order)

1. **Watch CI on `5601fe79`** (conform-gate is the risk point; local evidence says
   PASS — intro/footer ≥ baselines, other sections untouched).
2. **E1 academic schema** (wip/academic-profiles, agent-E): institution kind +
   school-mode fields + contacts/guardians/documents + custom-field system +
   phone normalization. ADDITIVE migrations only.
3. F1 import engine (needs E1's field contract), G1 search (needs E1's
   normalized columns), then C1/H1/Z1.

## gotchas

- `inst-zawia-showcase` / `madarek-demo` ids are FK anchors — display names only.
- home-intro-wrap conformance mapping binds the crawl cells — regen WITH the removal
  or the gate fails; footer.json binds `footer.markpath.1-8` — Option A keeps them.
- legal-pages test pins sitemap at exactly 16 public routes → 15 after /campus.
- r307-landing-media test is the showcase contract — rework in lockstep with D3.
- CSP frame-src youtube exists solely for showcase videos — tighten only in D7.
- Background processes may die between tool calls: vite + instrument in ONE call.
- `docs/releases.json` referenced by RELEASE.md does not exist (phantom) — fix text.
