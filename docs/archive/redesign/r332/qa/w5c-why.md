# W5c — why band (height + rhythm) @1440 · R332

Agent: W5c · Scope: why only (`why.css` + `.wy-` tiers in `strata.css`) · Defect of record: twin run-002 — why height 633.6 vs Heron 698.1 (Δ10.18% FAIL) and rhythm median gap 24px over the ≤8px gate, unchanged since run-001.

## Diagnosis (data first)

**Records** (`twin/run-002/1440/{heron,madarek}-records.jsonl`):
- heron why: height 698.1, rhythm 0 (gutters `[0]` at depth 3 — head band butts the content strip at 0).
- madarek why: height 633.6 (−64.5), rhythm 24 (gutters `[24]` at depth 1). The harness's gutter walker filters boxes h<24, so the measured gutter is exactly the **`.wy-head` → `.wy`** gap; the note gap is invisible to the metric.

**Live probe @1440 (rem 8.33333px), before** (`/home/z/evidence-r332/w5c/before.json`):

| seat | computed | owner that won |
|---|---|---|
| `.wy-section` padding-block | 66.67px = 8rem | strata.css R328 ladder ≥992 (`.pr-section, .wy-section`) — line ~1908 |
| `.wy-head` margin-block-end | 24px = 2.88rem | strata.css R315 W3 ≥992 group — line 750 |
| `.wy-note` margin-block-start | 20px = 2.4rem | strata.css same group — line 751 |

**Where it lived:** the W5a ≥1025 parity seats were ALREADY in `why.css` (`padding-block: var(--space-12xl)` = 100px, head margin 0, note `var(--space-4xl)` = 33.33px) — but `why.css` imports BEFORE `strata.css`, so the strata ≥992 `.wy-` tiers (same specificity, later file) killed all three at 1440. The whole ≥1025 block rendered dead:
- 24px rhythm gutter = strata's 2.88rem `.wy-head` seat (Heron's why gutter is 0).
- height shortfall ≈ 66.7px missing padding (8rem vs 12xl rung) − 24px head seat + 13.3px note rung (net −64.5 measured).

## Fix (owning rules only)

Three targeted ops in `strata.css`, `.wy-` selectors only (platform `.pr-section` / closer `.fo-cta` / roles `.rl-*` seats untouched):

1. **R315 W3 ≥992 group (line ~728):** `.wy-section` LEFT the `.pr-section` 3.84rem padding selector — platform keeps its compact seat.
2. **Same group (lines 750-752):** the `.wy-head { margin-block-end: 2.88rem }` / `.wy-note { margin-block-start: 2.4rem }` / `.wy-stage-text { line-height: 1.55 }` tiers RETIRED (duplicates of why.css's own ≥992/992-1024/≥1025 seats; the 2.88rem head seat was the twin-visible gutter).
3. **R328 rhythm ladder (line ~1908):** `.wy-section` LEFT the `.pr-section` 8rem quiet-rung selector — platform keeps the 8rem rung verbatim; why's ≥992 padding now lives in why.css (992-1024 frozen 8rem slice · ≥1025 `--space-12xl`).

No `!important`, no ID selectors, no TSX, no git.

## After (twin/w5c @1440 — `report.md`: why **PASS**)

| metric | heron | madarek | Δ | gate | verdict |
|---|---|---|---|---|---|
| height | 698.1 | 700.3 | **0.31%** | ≤3% | ✓ |
| heading fs | 40 | 40 | 0.0% | ≤4% | ✓ |
| rhythm median gap | 0 | 0 | **0px** | ≤8px | ✓ |
| trigger start | 8468.4 | 8503.9 | 35.5px | ≤40px | ✓ |

Computed after probe (`final.json`): padding 100/100px, head margin 0 (gutter `[0]`), note margin 33.33px.

## Side-effects (geometric probe — report covers why only)

- **roles** top 10037.4 → **10104.1** (heron 10066.5 → Δ37.6, was 29.1; inside the ≤40 gate). Its own height (886.8 vs 886.7) / fs / rhythm untouched → PARTIAL shape unchanged. The shift is the cumulative consequence of why matching the twin's height: Heron's roles top sits flush at Heron why's bottom, and Madarek's why top rides a pre-existing +35.5 offset from the sections ABOVE why (not W5c scope).
- **cta** top 10924.2 → **10990.9** → trigger Δ37.7 (was 29.0; still ≤40). Height/fs/rhythm untouched (699.7 / 40 / 0) → **stays PASS**.
- **footer** trigger Δ39.3 (was 27.4) — footer's FAIL is its own heading fs, untouched.

## Gates

- `tsc --noEmit`: clean.
- `stylelint why.css strata.css`: 0 errors; 1 PRE-EXISTING unrelated warning (`.fo-meta-row` specificity, line 524 — untouched) — no new issues.
- `vitest run tests/unit/r306-landing-sheet.test.ts tests/unit/landing-funnel.test.tsx`: **32/32 green**.
- Evidence: `/home/z/evidence-r332/w5c/` (before/after/final probes + probe.py) · `/home/z/evidence-r332/twin/w5c/` (51+51 frames + report).
