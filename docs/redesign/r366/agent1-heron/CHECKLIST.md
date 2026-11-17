# R366 · Agent 1 · Heron Experience & Graphics — CHECKLIST

Branch: `agent/r366-heron-graphics` (from `origin/main` @ `7a097457`).
Records: this dir. Evidence: `evidence/`. Law: every box ticks ONLY with proof on its line
(command + real output / metric before→after / artifact path). "Written/pushed" ≠ done.

## L1 — Reference deep-measure (raise honest coverage)

- [ ] L1.1 Re-measure the live reference (Playwright on heronaiapp.com) for hero, intro,
      map, platform, footer at 390/768/1024/1440/1920 — DOM geometry, typography, colours,
      spacing, motion timings/easings, scroll-linked behaviour, cursor rules, loader and
      page-transition behaviour; committed specs extended ONLY additively.
      PROOF: `evidence/l1-reference-remeasure/` (harvest outputs + diff summary vs committed specs).
- [ ] L1.2 Extend `scripts/conformance/mapping/*.json` so previously off-book/skipped
      elements are MEASURED (no new exception rules, no weakening; partition guard intact).
      PROOF: mapping diffs + scoped `run.mjs` outputs per section.
- [ ] L1.3 Targets hit, measured from the current tree (`node scripts/conformance/run.mjs`,
      full matrix, table before→after in `evidence/l1-conformance-table.md`):
      hero coverage ≥ 60 % and heuristic share ≤ 30 %; footer, intro, map, platform each
      ≥ 60 %; overall coverage ≥ 65 %; pass rate ≥ 93.5 % (never below floor 91.6);
      scroll-feel 30/30; exception cap < 5 %.
- [ ] L1.4 Every newly-visible mismatch fixed at the root in landing CSS/components;
      frozen/measured seat values stay as measured.
      PROOF: fixed-pair list in `evidence/l1-fixes.md` (pair → root change → scoped re-run).

## L2 — Graphics & 3D construction pipeline

- [ ] L2.1 `docs/GRAPHICS-PIPELINE.md` written: how Heron builds its visuals (from specs),
      how ours are built today, the per-visual decision (a) SVG+CSS3D / (b) pre-rendered
      AVIF/WebP / (c) lazy WebGL — chosen with numbers (LCP ≤ 2.5 s mobile 4G, CLS ≤ 0.05,
      no long tasks > 50 ms, DPR cap, off-screen pause, hidden-tab pause, reduced-motion +
      Save-Data + low-end fallbacks, SSR-safe, a11y rules).
- [ ] L2.2 Construction rules (one system): projection/camera, light direction & colour
      temperature (dark-mode-correct), materials (paper/ember/ink from tokens), edge
      weights, grid/ruler annotations, RTL mirroring, safe areas — as checklist +
      verifier script under `scripts/graphics/` (palette, size budget, alpha/halo,
      dark-variant presence).
      PROOF: `scripts/graphics/verify-graphics.mjs` run output in evidence.
- [ ] L2.3 Key visuals rebuilt/upgraded under that system within budgets: entry JS ≤ +2 KB
      gz net, heavy chunks lazy ≤ 120 KB gz, each image ≤ 60 KB (AVIF/WebP), width/height
      set, `fetchpriority` on the LCP image only.
      PROOF: `evidence/l2-asset-budget.md` (before→after per file, KB).
- [ ] L2.4 Cross-browser sanity for the hero scene: Chromium + WebKit(if installable) +
      Firefox; WebGL context-loss path handled IF any WebGL ships (else recorded N/A);
      each fallback path force-verified.
      PROOF: `evidence/l2-crossbrowser.md`.

## L3 — Public pages to the same craft

- [ ] L3.1 Secondary Heron pages measured (about/contact/case-study style, if they exist)
      → `docs/redesign/r366/agent1-heron/PUBLIC-SURFACE-SPEC.md` derived from measured
      rhythm/type/hairlines/motion (not taste).
- [ ] L3.2 Owned public pages brought to that spec: /about /help /contact /app
      /capabilities /colleges /community /competitions /training /vision /legal/*
      (auth/404/500/403/maintenance are Agent 4 files → REQUESTS file, not edits).
      PROOF: per-page before→after captures in `evidence/l3-public-pages/`.
- [ ] L3.3 Page-transition + loader behaviour on public routes consumes Agent 2 motion
      primitives; changes requested via REQUESTS file (no edits to their files).
      PROOF: REQUESTS file(s) + implementation notes.

## L4 — Less text on public pages

- [ ] L4.1 Copy diet on MY gated pages (`frontend/src/pages/`: PublicPages, CapabilityPages,
      CollegePages, CommunityPages, CompetitionsPages, TrainingPages, VisionPages,
      LegalPages, LegalSheet, AppDownloadPage, LandingPage): titles ≤ 4 words where
      possible, 1 supporting line per block, no repeated explanations; legal pages
      bulletised with substance intact (9 sheets stay 9 — tests are law).
- [ ] L4.2 Word total ≥ 25 % lower, measured: `node scripts/gates/copy-budget.mjs`
      before→after table in `evidence/l4-copy-budget.md`; ceilings ratcheted DOWN in the
      same commits (docs/QA/copy-budget.json entries for owned pages only).
- [ ] L4.3 Arabic-correct, Libyan-education terms, no information removed that is needed
      to act; identity-guard clean; pinned test counts intact (landing-funnel 5+5, legal
      9/9/9, r183 funnel, route titles).

## L5 — Mobile-first proof of the landing

- [ ] L5.1 320/360/390/412/600 captures per landing section as contact sheets; overflow,
      tap targets ≥ 44 px, type scale, image sizing fixed; landscape phone (640×360,
      844×390); 200 % zoom; reduced motion.
      PROOF: `evidence/l5-mobile/` contact sheets + fix list.
- [ ] L5.2 Lighthouse CI mobile on `/`, `/features`, `/app`, `/auth`: performance ≥ 90,
      accessibility ≥ 95, best-practices ≥ 95, SEO ≥ 95, CLS ≤ 0.05; before→after table
      in `evidence/l5-lighthouse.md`.

## L6 — Closing

- [ ] L6.1 Gates green (except listed baseline shifts): copy-budget, copy-budget-mobile,
      check-icons/colors/raw-css/motion-tokens, identity-guard, stylelint-gate axes,
      bundle total/entry, overlap public stress crawl, tokens:check, unit tests (frontend),
      landing E2E owned specs.
- [ ] L6.2 Conformance table, Lighthouse table, word table, contact-sheet paths recorded
      in `evidence/`; DELIVERY.md written; branch pushed; completeness audit re-ran
      (5 random ticked boxes re-proven).

## Rules I work under (from the R366 program + AGENTS.md)

- run.mjs is lead-controlled — extend ONLY via mapping/*.json + data-spec hooks + generators.
- Never weaken thresholds/exception rules/coverage floors; only exception rule stays
  `ar-text-length-class` (< 5 %). Ratchets move one way (coverage up, words down).
- `scripts/conformance/results.json` + dated results are NOT committed by me (integrator
  regenerates); my runs are recorded under `evidence/`.
- No Heron text/images/source — measured parameters only. One logo everywhere. No real
  university names, no "showcase". Commits: `type(r366): subject`, push after every
  verified step. Section rewrite commits carry `conformance <section>: a% → b%`.
