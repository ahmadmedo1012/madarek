# R337 — Section Rewrites (Wave 1) — Working Brief for Section Agents

## Your mission
Conform ONE landing section to its frozen Heron spec so the section's conformance
cell reaches ≥90% at every breakpoint, with ALL gates green, bundle-neutral or
diet-positive.

## The spec (frozen — never regenerate)
- Spec files: `docs/redesign/r335/heron-spec/<section>.{390,768,1024,1440,1920}.json`
- Mapping: `scripts/conformance/mapping/<section>.json` (extend it — data-spec
  bindings are the preferred mode; per-row templates `roles.row.${i+1}` allowed)
- Measure: `node scripts/conformance/run.mjs --sections <section> --url http://localhost:<port>/`
  (boot `npx vite --port <port> --strictPort` in the worktree's frontend/ first)
- ALWAYS re-measure twice; transitions (0.4s) can wobble a single reading.

## Hard rules (all are CI-gated — verify locally before committing)
1. Colors: every color through `var(--*)` tokens or
   `color-mix(in srgb, var(--x) N%, transparent)`. No raw hex/rgb/hsl.
   `bash scripts/check-colors.sh --strict`
2. Raw CSS: type/radius/spacing via tokens. `bash scripts/check-raw-css.sh --strict`
3. Icons: `bash scripts/check-icons.sh` · Motion: `bash scripts/check-motion-tokens.sh`
4. CSP: `bash scripts/check-csp-hash.sh` · Parity: `node scripts/verify-parity-export.mjs`
5. Tokens: `node scripts/tokens/build.mjs --check`
6. `npx tsc --noEmit` + `npx vitest run` (3051+ tests) must pass.
7. Bundle: `npx vite build && node ../scripts/check-bundle-size.mjs` — 3/3 PASS.
   Ceiling is 777 KB gz total (R337, documented). Your section must land
   bundle-NEUTRAL or better: if the spec adds weight, diet an equal amount
   from YOUR OWN files first (comments don't count — minifier strips them).
   LESSON (50+ measured builds): constant-extraction below ~30 call sites
   makes the gz total WORSE (per-chunk headers) — don't bother.
8. Honest copy only: no invented claims; the two truthfulness pins
   (labs = development-only, no guardian account yet) stay verbatim.
9. `data-spec` attrs bind the mapping; keep every existing one that maps.
10. Commit style: one feat commit with the before→after percentages in the
    message. Push `git push -u origin r337/<section>`.

## What NOT to do
- Never touch files outside your ownership list (see OWNERSHIP.md).
- Never raise any ceiling, never edit check-bundle-size.mjs.
- Never weaken a test to pass it; reconcile the test to the new spec-truth
  (like r306's mono-ladder: pin the VOICE, free the COUNT to the census).
- Never regenerate heron-spec files. Never edit ratchet.json (lead does it).
- strata.css/landing.css: if a retired rule of YOUR section's classes fights
  your rewrite, remove ONLY your section's selectors from group lists —
  and re-measure conformance after (geometry floors may be load-bearing).

## Definition of done
- Section cell ≥90% at every bp, measured twice, stable.
- All 10 gates green locally. vitest full suite green.
- Committed + pushed. Report: before→after %, gates table, bundle delta,
  anything you could not conform and WHY (with numbers).
