# T-02b — Conformance honesty gates + honest full-matrix numbers (r339)

Branch `r339/t02b`. run.mjs only — mappings/frontend untouched. Gates only ADD
failure modes; no existing assertion was weakened. Tests are law.

## 1. Gates landed (all verified firing on real runs)

| # | Gate | Law | Verified by |
|---|------|-----|-------------|
| a | **Per-section coverage%** | `coverage = measured / (measured + offBookEst)`, `offBookEst = suppressedChecks + excusedElements × 12` (GROUP_CHECKS; conservative — the 5 unskippable per-element checks are NOT counted, so off-book can only be understated). Printed per section beside passRate on every run. | every chunk's `summary.coverage.sections` |
| b | **Coverage floor** | section < 40% measured → `FAIL(coverage)`. No escape — lifted only by section work. | footer/hero/intro/map/problem/why flagged in all 5 chunks |
| c | **Off-book cap** | section ≥ 70% off-book → `FAIL(off-book)` unless listed in `scripts/conformance/coverage-review.json` with written reason (≥20 chars) + owner task id. Fail-closed: invalid register entries keep the cap. Register currently EMPTY — zero escapes in force. | negative+valid escape tests committed (a7a6e8d4) |
| d | **Heuristic-share cap** | ≥ 50% of a section's pairs heuristic-paired → `FAIL(heuristic)` | hero 76.9%, map 90.9% flagged every chunk |
| e | **Results provenance** | every run files `scripts/conformance/results/<engine>-<stamp>-<scope>.json`; `--ratchet` refused unless full-scope AND same-invocation fresh full `results.json` | scoped `--ratchet` refusal exit 2 (a7a6e8d4); 11 blobs in results/ |
| f | **darkInk census (--dark)** | every text-bearing node vs composited effective bg (nearest opaque ancestor, rgba/oklch compositing) at WCAG AA: ≥4.5:1 normal, ≥3:1 large (≥24px, or ≥18.66px bold). FAIL rows carry path+ratio+colors; worst-50 in `results.darkInkReport`, per-cell counts in `sections.*.*.dark.darkInk` | 357 node×bp fails across matrix (below) |
| g | **edge390 gutters** | at bp 390, each section's content-edge↔viewport gutters vs spec root x/w (8px), ±2px. Land in normal cell denominators (adds failure modes only) | 5 FAIL rows in bp-390 chunk |

Smoke evidence (previous session, commit a7a6e8d4): footer scoped FAIL(coverage+off-book) exit 1; map scoped FAIL(coverage+off-book+heuristic); usecase scoped clean PASS; scoped `--ratchet` refusal exit 2; review-escape + fail-closed register negative tests.

## 2. Regression found & fixed THIS session (reporting, not counting)

`results.failures.sort(by delta).splice(800)` was eating the new gates' rows:
edge390 deltas (±2–15px) and darkInk rows (delta 0) sort to the tail, so the
bp-390 chunk showed `summary.edge390.fails = 4` with **zero** edge390 rows in
`failures[]` (counts stayed honest; the actionable row vanished). Fix: the 800
cap now applies to unprotected rows only; every edge390 row survives (darkInk
keeps its dedicated worst-50 report + per-cell counts). Verified: re-ran bp-390
→ 5 edge390 rows present, 800 listed, totals unchanged (90.1%).

## 3. Honest full-matrix numbers (chromium, :5302, 10 sections × 5 bps, --dark)

Chunk manifest (all committed under `scripts/conformance/results/`):
`…142410-bp-1920` · `…143022-bp-1440` · `…143040-bp-1024` · `…143123-bp-768` ·
`…143406-bp-390` (canonical; `…143150-bp-390` retained as the pre-fix run).
Merged by summing per-cell counts (python3), not by averaging rates.

**Overall: 42,744 / 45,945 = 93.0% light · 37,738 / 40,604 = 92.9% dark ·
coverage 24.7% measured (off-book est. 75.3%) · heuristic share 18.0% of 4,817
pairs · darkInk 357 node×bp fails (69/72/72/78/66 per bp; 51 unique paths in
the worst-50 unions) · edge390 5 fails.**

Per-bp light rates: 1920 93.9 · 1440 93.8 · 1024 93.9 · 768 93.0 · 390 90.1.
Per-bp dark rates: 93.8 · 93.9 · 94.0 · 92.8 · 89.5.

| section | n | light% | dark% | cov% | off-book% | heur% | darkInk fails | edge390 fails | gates tripped |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| chrome | 0 | — | — | — | — | — | 0 | 0 | (page-level; no section cells) |
| footer | 4,886 | 87.9 | 87.7 | 19.4 | 80.6 | 37.4 | 90 | 0 | coverage, off-book |
| home-cta-wrap | 4,264 | 92.4 | 92.9 | 92.5 | 7.5 | 9.4 | 20 | 0 | — |
| home-hero-wrap | 1,586 | 90.1 | 90.5 | **5.2** | **94.8** | **77.0** | 5 | 2 | coverage, off-book, heuristic |
| home-intro-wrap | 9,033 | 98.3 | 98.0 | 23.4 | 76.6 | 0.8 | 0 | 1 | coverage, off-book |
| home-map-wrap | 3,057 | 91.6 | 92.9 | 12.6 | 87.4 | **90.9** | **170** | 0 | coverage, off-book, heuristic |
| home-platform-wrap | 3,498 | 91.8 | 93.4 | 43.4 | 56.6 | 21.5 | 22 | 0 | — |
| home-problem-wrap | 3,709 | 93.2 | 92.9 | 16.5 | 83.5 | 2.1 | 50 | 0 | coverage, off-book |
| home-usecase-wrap | 9,490 | 93.1 | 91.6 | 87.8 | 12.2 | 0.8 | 0 | 0 | — |
| home-why-wrap | 6,422 | 91.8 | 92.8 | 29.8 | 70.2 | 8.6 | 0 | 2 | coverage, off-book |

edge390 detail (spec 8px gutters): hero L/R = 0px (Δ−8, full-bleed vs spec);
intro L = 2.4px (Δ−5.6); why L = 1px (Δ−7); why R = 15px (Δ+7).

darkInk worst offenders: map SVG labels `rgba(40,40,40,.72)` ink on
`rgb(40,40,40)` ground = **1:1** (34 unique paths); cta/platform/problem also
carry 1:1 nodes; footer worst 2.23:1. 51 unique failing paths total.

## 4. Proposed ratchet

Committed floor: **93.6** (total 41,713, 06:35Z). Honest full matrix today:
**93.0** (45,945). The 0.6pt gap ≈ 276 checks and comes from surface growth
(+4,232 checks: 390-bp dark mass, edge390 rows counted in cells) plus real
390/768 softness (footer 83.3/84.1, hero 85.9, problem 85.3) — not from
weakened assertions.

Proposal: **hold the ratchet at 93.6 — do not re-baseline.** The monotonic law
exists so the floor never ratchets down to meet the code; the gap is the P1
work-list below. `--ratchet` was NOT run (per mission). Expectation: the
footer 390/768 + hero/problem 390 fixes alone close ~0.5pt; the floor stays
holdable without paperwork. If a future surface-growth re-baseline is ever
justified, it must be a written law change with the old floor preserved in
ratchet.json history — not a quiet rewrite.

## 5. P1 work-list (which sections fail which gate)

1. **home-hero-wrap — fails all three honesty gates.** cov 5.2% (536 excused ×12
   + 401–431 skipped/bp), heur 77.0%. Needs explicit data-spec bindings (intro/
   usecase prove ~0.8% is achievable) and un-suppression of skipped checks.
   Also edge390: 0px gutters vs spec 8px — decide full-bleed vs spec and fix.
2. **home-map-wrap — worst darkInk + worst heur.** 90.9% heuristic pairs; 170
   darkInk node×bp fails, SVG labels at 1:1 on dark. Dark ink first (user-
   visible), then bindings.
3. **footer — worst rates + off-book.** 87.9% light (83.3 @390, 84.1 @768);
   off-book 80.6%; 6 darkInk paths (worst 2.23:1).
4. **home-intro-wrap — off-book debt behind a 98.3% rate.** 870 skipped/bp +
   462 excused ×12. The rate is real but measures a fifth of the surface.
5. **home-problem-wrap — cov 16.5% + 390 softness (85.3).** 306 excused ×12.
6. **home-why-wrap — 2px from the coverage floor (29.8 vs 40).** 2,030
   skipped/bp; also both edge390 sides off (1px/15px vs 8px).
7. **edge390 (cross-section):** why-R 15px is the widest deviation; intro-L
   2.4px is run-variance-adjacent (was clean in the pre-fix run) — re-measure
   after any lazy-load settle change.

## 6. Next steps

- Land this doc + chunks; owner review of hero/map off-book mass → either
  section work or a written `coverage-review.json` entry (reason + owner task).
- P1 fixes above, then a FULL `--gate` run (not chunked) to hold 93.6.
- Optional: extend darkInk report cap beyond worst-50 once fixes land.
