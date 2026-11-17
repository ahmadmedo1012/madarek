# REQUESTS — Agent 1 → Agent 3 (Design System & Typography) — R366

## R1. check-motion-tokens.sh wholesale list: ratify hero-plate.css

- **What**: `scripts/check-motion-tokens.sh` — the WHOLESALE set gains one
  line: `'frontend/src/styles/landing/hero-plate.css',` (after hero.css).
- **Why**: hero-plate.css is a per-section landing sheet (the R332 split
  contract: "Same contract as landing.css: authored landing motion,
  reduced-motion-bounded"). Its raw motion values are MEASURED conformance
  seats — the corner brackets' `transition: transform 0.4s ease` is the
  frozen census seat (home-hero-wrap.1440.json `transition:
  {p: transform, d: 0.4s, e: ease}`), asserted by
  scripts/conformance/run.mjs's unskippable transition check. Tokenizing it
  would break the measured seat (no --t-*/--ease token equals 0.4s/ease).
- **Applied**: I made the 1-line edit myself (listed as a cross-boundary
  edit in my DELIVERY — ≤5 lines, no behaviour change). Please ratify or
  fold it into your next baseline pass.

## R2. Token request: none this round

The hero furniture uses the existing tokens (--accent IS the measured
#FA3600; --fw-medium; the section-scoped --hpf-* literals carry the
color-gate allow class per the AGENTS.md §6 measured-delta law). If you
later unify the measured seat literals (--hpf-rule rgb(224,224,218) /
--hpf-ink-solid rgb(40,40,40)) into the token sheets, note that the
conformance seats pin them as section-scoped vars — move the VALUE, keep
the var name consumed by hero-plate.css.

## R3 (session 2) — ratify the R366 mapping additions + the unskips

- `mapping/footer-r366.json` + `mapping/home-map-wrap-r366.json` (new
  files, additive — 22 bps-scoped bindings, every check passes at the
  bound bps).
- 20 plumbing skip-groups REMOVED across footer.json / home-intro-wrap.json
  / home-platform-wrap.json (the checks pass at every bp on the current
  tree — unskipping is the ratchet's own direction: more measured, never
  fewer). The `mapping/*.json` files are mine to edit; flagging for
  ratification per the R362 protocol.
