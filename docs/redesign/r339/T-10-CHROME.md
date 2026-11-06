# T-10 — Chrome (header) row conformance

**Status: LANDED at 92% overall** (1295/1407, chromium, :5310, 2026-11-06).
Commit chain: 77c66e91 (specs + mapping + SheetNav grammar) + this round's
measurement-verified tweaks. ≥90% gate → measurement stopped, no fix rounds spent.

## Spec inventory (5 frozen bps)

`docs/redesign/r335/heron-spec/chrome.{390,768,1024,1440,1920}.json` — the
post-load header walk (`chrome > header[1]` tree + explicitly-bound nav/CTA
seats). Trim note in each `meta.trimmed`: page-content records removed — they
were double-measured by their own section specs and produced junk heuristic
cross-pairs (the trim is the freeze, not a re-measure).

## Bindings (mapping/chrome.json)

- **105 explicit** bindings (28/bp desktop, 10–11/bp mobile) — dataSpec
  seats `nav.brand / nav.row / nav.link.N / nav.cta(.rule/.main)` +
  heuristic (`#hm:`) and plumbing twins.
- **845 noCounterpart** (spec-side seats with no ours twin — every one carries
  a written reason; recorded, never counted as FAILs).
- **54 plumbing**. Uncovered spec paths: 0 at all 5 bps.

## Final per-bp conformance

| bp | rate | pass/n | fail | excused | skipped |
|---|---|---|---|---|---|
| 390 | 88.7% | 172/194 | 22 | 2 | 21 |
| 768 | 89.5% | 170/190 | 20 | 4 | 25 |
| 1024 | 90.6% | 309/341 | 32 | 2 | 88 |
| 1440 | 94.4% | 322/341 | 19 | 2 | 88 |
| 1920 | 94.4% | 322/341 | 19 | 2 | 88 |

## What this round changed (the uncommitted tweaks, kept — measured green)

- nav.css: chrome type root → her exact scale (vw-fluid 9.48→17.78px desktop,
  14.73/15.88px mobile ladder); label factor 0.875em moved onto the label
  spans (cells carry the root register); `is-btn-seat` 1.35 row; literal
  `ease` transitions + pointer seats per frozen spec; CTA cell = root register.
- SheetNav.tsx: seats 0+2 carry `is-btn-seat` (her button/a cell alternation).
- mapping/chrome.json: +6 documented skips (tag/color on div-vs-a/div-vs-span
  twins, UA-anchor-ink on hidden/svg seats) — box/type asserted, tag excused.

## Residuals / work-list (112 fails, by kind then seat)

- color 24 · w 22 · x-mirror 17 · h 15 · interactive 12 · y 8 · transition 8 ·
  pinRange 5 · sectionHeightVh 1.
- Top seats: her menu-inner `div[2]` ⟵ `#hm` heuristic div (22 — w/x-mirror);
  her brand `a[1]`/`a[2]` ⟵ `#hm` (28 — x-mirror/w: our brand roll-mask
  width + RTL mirror offsets); `nav.brand` w@4bps (11); CTA internals
  spans ×2 (14 — w/y/color@1920); `nav.cta.main` transition/h (7);
  `header#pin0` pinRange@5bps (5 — her pinned header y-range vs our static);
  `nav.cta(.rule)` color@3bps + h@1024 (9); mobile interactive@768/390 (2).
- 1024 is the weak bp (32): the tablet rung sits between the mobile ladder
  and the vw-fluid desktop scale — first target for any future round.

## Excusals (12/1407 = 0.85%, cap 5% — all written in mapping notes)

- `skip: tag` — her div wraps vs our semantic `<a>`/`<nav>`/`<span>` twins
  (brand, nav row, CTA rule): box/type/color asserted, tag differs by design.
- `skip: color` — her UA-default anchor ink rgb(0,0,238) on the hidden 0×0
  trigger and on the svg (visual ink rides the svg fill); geometry already
  skipped for the same hidden seat.
- Excused cells per bp (2/4/2/2/2) ride these mapping skips.

## Gates

- `bash scripts/verify.sh --fast` — **FAST PASS** (tsc ✓, vitest 3051/3051,
  bundle 764.4 KB gz ≤ 770).
- r183-B8 ceiling pin reconciled DOWN 777→770 to match the already-committed
  gate restore (c8a61806) — the test's own "re-pin DOWN, never up" policy;
  assertion is stricter, not weakened.
- No `!important` added; existing tokens only; run.mjs untouched.
