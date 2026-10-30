# R324 section ledger — Heron ↔ Madarek (P1, X14 verdict)

> Heron numbers: measured by scripts/r324/heron-extract.mjs (docY/height, scroller content coords)
> at the REAL device pairs — 1440×900 · 1024×768 · 768×1024 · 390×844 (§BPS).
> Madarek numbers: post-render border-box heights (scripts/r324/probe-x14-bands.mjs — every
> content-visibility skirt scrolled + settled before reading; the pre-X14 probes read stale
> contain-intrinsic-size guesses, which is where the phantom drift came from).
> docH contract: landing docH within ±2 % of Heron at the anchors (X14), section by section.

## The X14 verdict table (post-wave, measured 2026-10-30)

| Heron section | our counterpart | h @1440 | h @1024 | h @768 | h @390 | Δ@1440 |
|---|---|---|---|---|---|---|
| `home-hero` | `.fo-hero` | 887 | 759 | 1009 | 828 | **+0.0 %** |
| `home-intro` | `.st-section` | 723 | 514 | 527 | 837 | **+1.1 %** (+8px) |
| `home-problem` | `.pm-section` | 743 | 528 | 1333 | 869 | **+0.0 %** |
| `home-map` | `.chapters` | 6300 | 5376 | 5454 | 4819 | **−0.4 %** (−28px) |
| `home-platform` | `.pr-section` | 710 | 505 | 508 | 517 | **+0.0 %** |
| `home-why` | `.wy-section` | 681 | 484 | 877 | 806 | **−0.1 %** |
| `home-usecase` | `.rl-section` | 887 | 759 | 1336 | 948 | **+0.0 %** |
| `cta` | `.fo-cta` | 698 | 496 | 541 | 500 | **+0.0 %** |
| `footer` | `.fo-footer` | 711 | 505 | 949 | 1239 | +31.8 % (+226px, the identity wordmark re-pin) |

Heron docH: **12338** @1440 · **9926** @1024 · **12535** @768 · **11363** @390.
Madarek docH (post-walk, measured): **12544** @1440 · **10115** @1024 · **12630** @768 · **11435** @390.

## Δ docH verdict (target ±2 %)

| anchor | before X14 | after X14 | verdict |
|---|---|---|---|
| @1440×900 | +4.7 % | **+1.67 %** | **PASS** |
| @1024×768 | +18.5 %* | **+1.90 %** | **PASS** |
| @768×1024 | −5.3 %* | **+0.76 %** | **PASS** |
| @390×844 | +5.2 %* | **+0.63 %** | **PASS** |

\* the pre-X14 numbers compared h=900 sweeps against Heron's real pairs AND read stale
intrinsic guesses — the two artefacts the X14 wave retired (anchor parity + post-render reads).

## The wave's re-seats (each measured, not guessed)

| rung | before | after | lands |
|---|---|---|---|
| `.st-art-cell .st-art-svg` aspect | 1:1 | **59:50** | statement 723-ish @1440 (Heron exact ±8px) |
| `.pm-section` desktop floor | none | **min-block-size 89.1rem @≥992** | 743 @1440 · 528 @1024 = Heron exact |
| `.jt` track | 649dvh | **658dvh** | chapters 6272 @1440 · 5395 @1024 (−0.44/+0.35 %) |
| `.jt-map-col` tablet | 450dvh | **466dvh** | chapters 5455 @768×1024 (+0.02 %) |
| `.jt-map-col` phone | 415dvh | **473dvh** | chapters 4821 @390×844 (+0.04 %) |
| `.fo-wordmark` cut | full-width (585px) | **41.4rem @≥1200 · 23.6rem @768–1199** | footer 937 @1440 (+226, the rider) · 951 @768 (+2px) |
| `.fo-hero` phone mat/tail | 33rem mat + sp-8 tail | **26rem mat + sp-4 tail** | hero 832 @390 (+4px) |
| `.pr-stage .pr-frame` phone | 65dvh window | **30dvh card** | pr 525 @390 (+1.5 %) |
| `.rl-row` phone pad | sp-3 | **sp-1** | rl 948 @390 = Heron exact |

Documented riders (kept consciously, inside the docH contract): the statement's Arabic
copy runs +84px @1024/+56px @390 (content honesty over px parity); the footer wordmark
identity re-pin +226px @1440/+87px @1024 (R319 §D1 re-pinned under the X14 ±2 % contract).

Evidence: `audits/evidence/r324/footer-x14-{1440,390}-{light,dark}.png` ·
`scripts/r324/probe-x14-bands.mjs` (the verdict probe) · `scripts/r324/height-gate.json`
(stability PASS, drift ≤0.009 % @5 bps) · `scripts/r324/section-intrinsic.json` (re-measured).
