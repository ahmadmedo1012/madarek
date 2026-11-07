# R338 REPORT (final, round-2 continuation) — Madarek×Heron conformance + repo hygiene

Round range: `main 37705268 → b673d029` (round-1: →71e5a4c5; round-2: →b673d029). Every landing gated by local `verify.sh --fast` (tsc + vitest 3051 + bundle ≤777) — all green at every push.

## §6 exit table — final state

| Item | Target | Actual |
|---|---|---|
| Main CI | green; ceilings unchanged | **Owner-blocked**: GitHub Actions incident all round (every run `completed/failure`, jobs `steps:0` never start, logs 404 — quota/spending-limit pattern on the private repo; runner pins didn't clear it). Pushes fine; landing evidence = local verify green on EVERY landing. Ceilings never raised in R338: total 777 KB gz (r337's documented 776→777 predates this round), entry 92, pdf 110. Final bundle **764.1 KB gz** (axios→fetch −17.9 KB). |
| Conformance 9 sections × 5 bps | ≥95% overall, each ≥90; ratchet raised | **≥90/section DONE**: full-matrix **93.6%** (39,031/41,713), every section ≥90 light AND dark: intro 98.3 · usecase 93.1 · problem 92.8 · cta 92.5 · footer 92.3 · why 91.9 · platform 91.8 · map 91.6 · hero 90.2. Ratchet **53.7 → 93.6**. Scroll cells **5/5** + feel **30/30**; scrollRestoration fixed. Interactions: hero 41→**98.8%**, footer/cta/usecase fails→0; overall ≈**95%+**. Pattern census (T-12) **not done** — honest RED. Overall 93.6 < 95: the gap = chrome-spec assertions (T-15, not done) + pattern census + documented per-section residuals (excusals.md). |
| Dark + WebKit on every landed section | same thresholds | **Dark DONE**: all 9 sections ≥90 dark (intro 98.0 · usecase 93.2 · problem 92.9 · map 92.9 · why 92.8 · cta 92.8 · platform 92.3 · footer 91.3 · hero 90.6); contrast 0 fails in measured cells; instrument composites rgba/oklch alpha + deterministic settle. **WebKit host-blocked**: browser installed but launch needs libgtk-4/libGLESv2/libwoff2dec — no root in sandbox; documented, never faked. Blind panel found ≥6 out-of-cell dark invisible inks (problem/platform/login surfaces) — flagged, unowned fix. |
| CSS lines / `!important` | ≤33,000 / 0 | **Not done** — Track C unstarted; ~43k lines standing. |
| Inner pages grammar assertions | ≥90% | **Not done** — Track D unstarted. |
| Authed role shells + top screens | 5 roles | **Not done** — unstarted. |
| Mobile review / APK / iOS / OTA | ≥9 / built / built / recorded | **Not done** — Track E unstarted. EXPO_TOKEN verified last round. |
| Repo hygiene | AGENTS.md, verify.sh, docs index/archive, knip/jscpd/depcruise gates, CODEOWNERS, ponytail applied | **Mostly**: AGENTS.md ✓ (207 lines) · verify.sh ✓ · docs archive (161 files) + INDEX ✓ · knip+jscpd+depcruise ratcheted gates ✓ + cuts applied (circular deps 1→0, dupes 289→286) · CODEOWNERS/PR-template/commitlint/husky (T-23) **not done** · single-source (T-25) **not done** (scoped-var rulings recorded for it). |
| Blind panel | run once, honest | **Run twice**: 12-criterion R333 rubric — **58 → 66/84** (+8): composition 6 · typography 5 · spacing 5 · imagery 6 · storytelling 6 · motion 4 (capped, no sequences) · scroll 5 · micro-interactions 6 · density 4 · consistency 7 · arabic-rtl 6 · polish 6. Weakest: out-of-cell dark inks, motion cap, 390 edge 7-8px. → BLIND-PANEL.md + BLIND-PANEL-R2.md. |

## Round-2 highlights (this continuation)
- Sections closed to ≥90 light+dark: why 63.5→**91.9/92.8** (wrapper-mass per-bp bindings + vw/lh laws), footer 69.4→**92.3/91.3** (vw-linear scale law + strip restructure + anull unblock), cta 67.1→**92.5/92.8** (390 Vision restructure + per-bp grammar), platform 80→**91.8/92.3** (marquee clones C/D/E + crossover rect-signature bindings), intro 77.0→**98.3/98.0** (pill/type laws + plumbing), hero interact 41→**98.8**.
- Instrument (lead + agents): per-bp heron-path grammar ({bp:path} objects + bps-scoped records), ar-char-split aggregate null-skip (counted), multi-ease parseEase fix, rgba/oklch contrast compositing, deterministic dark settle — all A/B no-op verified on existing mappings.
- Ratchet 53.7→93.6 via chunked full-matrix (5×bp runs; the single-process run exceeded every deadline).
- Contract reconciliations en route (tests are law): r172a §3 zero focus-visible rules, r321 sketch-mark '+' glyph, r306 bp-dmark literal form, funnel register-phrase innerText, r312 map rung.

## Remaining, with reasons
1. Overall 95% (now 93.6): needs T-15 chrome specs + T-12 pattern census + per-section residuals (excusals.md has every written reason).
2. Tracks C (CSS 43k→33k, !important→0), D (inner/authed pages), E (mobile) — unstarted; each is a multi-day scope for R339+.
3. T-23 CODEOWNERS/husky/commitlint, T-25 single-source — queued.
4. Out-of-cell dark inks (panel finding) + motion sequence evidence — small, queued.
5. **Owner-side**: Actions quota (CI cannot run; branch-name `r338/t13*` rejected by a ruleset), WebKit system libs (no root).

## Owner decisions requested
- Restore Actions billing → then run the deadcode + conform-gate workflows (the gates exist and are green locally).
- Confirm the 777 KB gz ceiling stays (not raised in R338).
- WebKit measurement needs a host with libgtk-4 or a container runner.
