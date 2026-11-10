# R347 REPORT-Z — Lane Z (defect-driven finish + close-out)

**Scope note:** Lane Z ran as the "complete everything" lane per the owner's
instruction — it absorbed Lane B's remaining D6/D7 scope (a parallel Lane B
session pushed `f9cb594b`+`74de0fbf` mid-round; Z rebased on top and merged
the lanes' complementary fixes), Lane C's product residuals (D8 family), and
the Z close-out work (D12–D15). Everything below was measured on the merged
tree at `d01626b6`.

## The detector (§2) — 0/0/0, ARMED in CI

| criterion | state | evidence |
|---|---|---|
| detector on `/` @1440/768/390 × light/dark | **fixed-over-text 0 · text-on-text 0 · text-on-media 0 · big-fixed 0 (2 allowlist entries) · clipped 0 · hoverflow 0** | baseline (r347-A exit): 44/400/38 → Lane B+Z round → **0**; local preview + vite dev (CI's own condition) both swept |
| CI step | **ARMED and green-fixing** | the verbatim block uncommented in ci.yml (required, never continue-on-error); first run caught a REAL transient (the preloader's «100» counter mid-exit over «والإتقان» fr 0.82 @768) — fixed by the intro-settle wait (`waitForFunction(.landing.intro-done)`, 12s bound); re-verified 0/0/0 on dev |
| detector adjustments (all under the appendix's "adjust only if it fails on a real page" clause, each with its measured failure) | clip-aware text rects (overflow/contain:paint ancestors — the drifted stack's phantom pm×plan pairs) · occlusion-awareness (opaque covers that follow the covered text in DOM — the intro card over «12.3M», the counter chip over grid letters) · viewport clipping (the parked skip link vs a half-scrolled title, both in the invisible above-fold strip) · layout-block disjointness (Arabic font-box overhang across flush line blocks, lh 1.35 < font box 1.49×fs) · the intro-settle wait | `/tmp/rz/o-fix9.json`, `o-merged2.json`, `o-dev.json` + the CI artifact overlap-results.zip (361 B) of the failure it caught |

## Defects fixed at the cause (Z's own; Lane B's in DEFECTS-B)

| id | defect | fix |
|---|---|---|
| D7-Z | why-cap page-wide paint (44 fixed-over-text; the un-gated stage rule) | `[data-wy-live="1"]` joins every stage selector (same fix Lane B shipped in parallel — merged) |
| D8-Z1 | product marquee loop clones C/D/E — 5 stacked pr-label/pr-title copies, detector frac=1 | clones DELETED (R346 §3 twin ban); 47 bindings → noHeuristic noCounterpart excusals |
| D8-Z2 | the product cross-fade painted BOTH rows ~1.1s per swap | keyframes re-sequenced (45%/95%): fade-out completes + hides BEFORE the partner fades in |
| D8-Z3 | ≤991 fixed side/cta heights overflowed the CTA onto the next row's capture + [02] tag | heights content-driven |
| D1-Z | statement line pitch @≤991 left the font box (1.49×fs) bleeding 1.5px/side — wr-i × wr-i fr 0.32 @768 | pitch 3.24→3.65rem (1.52×fs) |
| CI-1 | the armed sweep caught the preloader's «100» over the statement mid-exit (cold dev server) | intro-settle wait in the detector |

## D12 — CSS demolition: the honest state

46,559 lines (merged main) · target ≤33,000 · **not reachable this round without unverifiable risk**:

- The static proof (new instrument `scripts/css/dead-static.mjs`): a rule is
  provably dead only when every class token is absent from ALL
  ts/tsx/tests/scripts strings — measured **≈0 rules** on this tree (every
  token is source-referenced; the r343-era conformance-twin culture left no
  orphan classes — the twins themselves were the r347 deletions).
- The dynamic proof (`scripts/css/dead.mjs`, fresh crawl on the merged tree):
  1,864 never-matched selectors — but the crawl covers public+student routes
  only (the tool itself fails teacher/admin/owner/quality routes loudly —
  their fixture corpora are not importable), so deleting on it risks the
  uncrawled surfaces; the top "dead" files are owned by uncrawled routes
  (plates.css 79/79 ← `/__plates`).
- A rule-level deletion driver was built and **discarded**: its first run
  swallowed live rules (footer.css −736 lines including the live `.fo-footer`)
  — reverted; committed instead as the lesson + the measurement instrument.
- What remains for a safe demolition: the all-roles crawl (dead.mjs needs the
  per-role corpora importable), a VR baseline (vr-capture.mjs exists, ~250
  cells), and batched rule-level deletion with pixel diffs ≤0.1% — a dedicated
  session's work, honestly out of this round's scope.

## D13 — final panel (representative, hostile VLM judge)

12 shots (hero/statement/journey/product/why × 1440/390 × light/dark):
**average 7.17/10** — hero-dark 9 · journey-1440 9 · product-dark 9 ·
journey-findings 8 · hero-1440 8 · hero-390 8 · stmt 8 · journey-dark 8 ·
product-1440 8 · **product-390 5 · why-1440 3 · why-dark 3**.

Cross-check of every sub-7 claim (the r347 law: never accept a VLM claim
without a geometry probe): the why stage at the judged scroll carries **2 DOM
text nodes** and product-390 **19** — **zero text-on-text pairs** by the
detector's own probe. The reported "colliding table rows / stacked mockups /
ghost paragraphs" live INSIDE the capture images' pixels (the frozen spec's
collage anatomy — overlapping 464px capture rows are the reference's own
design) and in the mid-transition cross-fade frame. Disclosed, not argued
away: the panel number stands at 7.17 with the why-section scores capped by
kept-by-spec collage composition — the same family as Lane A's D4 6/10.

## D14 — live smoke/perf on madarek.onrender.com — ALL PASS

`scripts/qa/live-smoke.mjs`: health 200/300ms · **LCP 2248ms < 2500** ·
**CLS 0.0118 < 0.05** (held after the full-scroll settle) · **INP-proxy
(worst long task) 117ms < 200** · TTFB 224ms · 0 page errors · RTL h1
renders (3,236 chars) · /auth 200.

## D15 — close-out

- **Single `main`** on origin ✓ (`git ls-remote --heads` = main only; no
  wip/r34* branches were created this round — work landed on main directly
  per the owner's "commit and push to main اولا بأول").
- **Ratchet:** re-pinned 92.1 → **91.6** (the two lanes' seat changes
  compose; cumulative give-back 0.5 ≤ 1.5; **floor 91.6 held EXACTLY**).
  Conformance gate PASS on the merged tree.
- **Counts held:** unit 3038 · tsc 0 · bundle 760.3 ≤ 770 · stylelint
  `!important` 52 held (zero added) · 7 design gates + lint PASS · e2e
  r309/r308/r325/r312 **38/38** · audit drift clean (72 captures, CI FCP
  headroom) · size gate + deadcode green on every push.
- Evidence: local-only per the r345 law — `/tmp/rz/panel/` (12 panel PNGs),
  `/tmp/rz/o-*.json` (every detector sweep), `/tmp/rz/live.log` (D14),
  `/tmp/rz/panel-results.txt` (VLM transcripts).
