# T-02 — conformance honesty audit (r339, branch r339/t02-audit)

Scope: the conformance instrument (`scripts/conformance/run.mjs`), mappings
(`scripts/conformance/mapping/*.json`), committed artifacts (results.json,
ratchet.json 93.6%) and every ruling in `docs/redesign/r338/excusals.md`.
Question: **which parts of the ≥90% story are measured, which self-graded?**

## (a) Per-section state — last committed run per section (light matrix)

"off-book" = suppressed checks + excused elements ×12 (GROUP_CHECKS sum = 12
checks per fully-measured element) over measured+off-book — an estimate.

| section | @commit | n meas | excused | skipped | off-book % | noCtr rulings | unmatched FAILs | heur-paired % | light % | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| home-hero-wrap | b85457c0 | 1600 | 2254 | 1915 | **94.8%** | 301 | 2 | 77.3% | 90.3 | nearly self-graded |
| home-problem-wrap | 5361349d | 1535 | 1707 | 0 | **93.0%** | 275 | 5 | 2.1% | 90.5 | excuse-heavy |
| footer | def42272 | 2882 | 1738 | 144 | **87.9%** | 269 | 0 | 37.4% | 92.3 | excuse-heavy + soup |
| home-map-wrap | e30b36d4 | 3055 | 1690 | 940 | **87.4%** | 342 | 5 | **90.9%** | 90.8 | heuristic-glued |
| home-intro-wrap | 75bb6a20 | 9031 | 2130 | 3970 | 76.6% | 360 | 1 | 0.8% | 98.3 | best-bound, skip-heavy |
| home-why-wrap | 61bb1940 | 6420 | 434 | 9888 | 70.2% | 430 | 0 | 8.6% | 91.9 | skip-heavy (9.9k) |
| home-platform-wrap | 2bf62ef3 | 3496 | 62 | 3818 | 56.6% | 69 | 0 | 21.5% | 91.9 | skip-heavy (3.8k) |
| home-usecase-wrap | a2f0536d | 9488 | 110 | 0 | 12.2% | 19 | 62 | 0.8% | 94.4 | cleanest |
| home-cta-wrap | 33260dda | 4262 | 20 | 108 | 7.5% | 28 | 28 | 9.4% | 92.4 | clean |
| chrome | a4ae384e | — | — | — | — | 0 | — | — | 53.7 (r337) | stale, never re-run |

- Worst excusal: **home-hero-wrap 94.8% off-book** (2254 excused + 1915
  skipped vs 1600 measured); problem 93.0%, footer 87.9%, map 87.4%.
- Overall heuristic-paired share: **869/4821 pairs = 18%** (map 90.9%, hero
  77.3%, footer 37.4% are the fuzzy tails). Overall off-book ≈ 77% (20 783
  skipped checks + 10 145 excused elements ≈ 121 740 checks est. vs 41 769
  measured). Caveat: rows are each section's newest committed run (r338
  wave-34→36 code states); results.json at HEAD is intro-only — the 93.6
  ratchet has no committed full-matrix results blob to back it.

## (b) Anti-gaming fixes landed (run.mjs + mappings)

1. **VALID_SKIP_GROUPS startup validation** — unknown skip names exit 2 with a
   full list (valid: tag, tc, geometry, type, color; radius/opacity/border/
   interactive/transition deliberately unskippable). Dead letters were silently
   ignored = author believed checks skipped while they were measured.
2. **ar-char-split soup suppression** (T-06m prescription, never implemented):
   char-sets whose fontSize deviates >±0.5px from the line container are
   depth-6 truncation-collision soups — the 4 aggregate checks are counted
   SKIPPED with written reason; elements re-enter unmatched accounting
   (excused only via written reason, else honest no-counterpart FAIL).
3. **Exception cap enforced** — excusal rate ≥5% now flips the gate verdict to
   `FAIL(exception-cap:…≥5%)` (was a printed label only).
4. **Ratchet full-matrix-only** — `--ratchet` on a section/bp-scoped run is
   refused (exit 2); the floor may only be raised from the full matrix.
5. **Scoped gate is report-only** (new, same class as #4) — `verify.sh
   --sections X` + `--gate` compared one section's rate against the full-matrix
   ratchet (a strong section false-PASSes while the matrix may fail); the
   scoped verdict now reads `PASS(scoped-run:…report-only)` with a stderr
   warning, and the exception-cap check runs after it so scoping cannot mask
   a cap breach.
6. **Mapping dead-letter cleanup** — 438 dead skip names removed, all
   measurement no-ops (only `.skip` arrays changed, zero non-skip diffs):
   intro 271× `x-mirror`, map 47× `transition`, platform 40× `border` +
   40× `radius` + 40× `bg`. Verified: every skip array in mapping/*.json now
   contains only the five valid groups.

## (c) r338/excusals.md rulings — categorized

**Legitimate** (impossible-by-law, true plumbing, or measured-not-waived):
webkit never faked (T-03/T-06/T-08c, env); authored line-art law — never
Heron's paths (T-06d markpath, T-05g scene SVGs); authored content w/o
counterpart documented (T-06d brow rows, T-10b cg-strip/R323); refusing to
fake tween staging (T-06k offstage striptwin, T-09e ramp opacity);
spec-internal contradictions with both sides measured (T-02c lh-floor vs
3-line box); T-13b dmark hover (R332 W1 law); T-08c3/c4/c5 *rendered* hidden
marquee clones to measure crossover nodes — honest.
**Suspicious** (self-graded volume or artifact expectations): T-06m's 108
anull aggregates measured against collision-soup artifacts (the exact lie fix
#2 removes — footer's honest rate is 87.9%, not 92.3%, same code); T-11 hero's
301 vector-chrome excuses + T-04a problem's 55 excluded roots (→ 94.8%/93%
off-book); T-05l mk-marker "mass-catchall excused"; T-03e's junk rows left
glued (~41 heuristic pairs/bp) — documented, but the glue pads the denominator.
**Stale** (superseded/cruft): T-14a dark-path gap (closed by --dark); T-14a2
.rl-acc nondeterminism (resolved in instrument); T-03c charSplit attempt
(reverted, superseded by T-02a wordset); T-06c→T-06j plumbing evolution;
T-05b–f why work-lists (why reached 91.9); T-08c1/c3 pre-binding states; raw
merge-conflict markers (`||||||| 36a32694`, `||||||| 37705268`) in the doc.

## (d) Top honesty risks + concrete fixes

1. **Off-book share ~77% overall, hero 94.8%** — the pass-rate denominator
   hides more than it measures. Fix: report per-section coverage% (measured /
   measurable) beside passRate in the matrix + results summary, and add a
   coverage floor to the gate (e.g. ≥40% measured) so sections cannot trade
   coverage for rate.
2. **Mapping excuses are uncapped** — exceptions.json is capped <5%, but
   noCounterpart/plumbing excuses have no ceiling (436 noCtr rulings; 10 145
   excused elements). Fix: cap off-book per section in the gate (risk-based,
   e.g. <70%) and require listed review above a threshold, mirroring the
   exception-cap mechanism.
3. **Heuristic pairing tail** — map 90.9% / hero 77.3% of pairs are fuzzy
   (tag+tc ordinal); junk can pair arbitrarily and pass. Fix: per-section
   heuristic-share cap (like exception cap) that forces explicit data-spec
   bindings; intro (0.8%) and usecase (0.8%) prove it is achievable.
4. **results.json is last-writer-wins** — HEAD's artifact is intro-only while
   ratchet.json claims a 93.6 full matrix; per-section history lives only in
   git. Fix: commit per-section artifacts under scripts/conformance/results/
   (or refuse --ratchet unless a fresh full-matrix results.json is written in
   the same run) so the floor always has a reproducible backing blob.
5. **Ratchet provenance** — 93.6 was assembled from chunked runs ("chunked
   full matrix", b673d029). Fix #4 guards scope, not assembly; require the
   raise to come from one process (or assert chunk sums against the matrix).

## Smoke-test evidence (footer, A/B on identical code, vite :5302)
Old instrument (HEAD run.mjs+mappings): **92.3%** (2659/2882), 144 skipped,
excused 1738 — per-bp 94.3/96/94.5/90.8/85.5. New instrument (this branch):
**87.9%** (4294/4884), 728 skipped (24 soup sets ×4 = 96 with written reason),
excused 1632 — per-bp 90.8/89.9/91.6/84.1/83.3. Δn=+2002, Δfail=+367: soup
re-admission exposes real debt hidden inside aggregates (color 4→56,
lineHeight 1→47, transition 3→43, interactive 0→39, fontSize 1→36). Dead-letter
removal itself: zero measurement delta (proven semantically — only invalid
skip names left the files). Negative tests: bad skip name → exit 2 at startup;
scoped `--ratchet` → exit 2, ratchet.json untouched; scoped `--gate` → exit 0
with report-only verdict. Data: /tmp/t02-smoke{-old,}.json + per-commit blobs.
