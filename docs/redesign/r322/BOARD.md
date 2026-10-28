# R322 BOARD — "DESIGN DIRECTOR EDITION"

Live board. The foreman updates after every merge. Head at cycle open:
`85da463b` (R321 c1 close). Brief: [`BRIEF.md`](BRIEF.md) (owner's full text).

**The method change (owner's verdict, §0):** the unit of work is a SECTION or
COMPONENT judged by a design critique — three independent reviewers, mean ≥ 9/10,
no category < 8, side-by-side Heron|Madarek screenshots at 1440/768/390 — not a
metric. Gates stay as safety nets; they never declare success. **Subtract**
before polishing. **Transplant** Heron's structure (DOM nesting, grid, cell
sizes in rem, type scale, spacing, material, motion), then fill with Madarek's
own Arabic copy and artwork. Never copy Heron's text, logo, images, artwork or
BT Grotesk.

## Cycle state

| Cycle | Packages | State |
|---|---|---|
| C1 | kill-list quick kills · design system + fonts · Heron extraction · scroll spec · desktop perf | **4/5 MERGED + reviewer DONE** (perf → C2 wave) |

## §1 KILL LIST (V1–V12) — tracked to zero

| # | Defect | Source(s) | State | Evidence |
|---|---|---|---|---|
| V1 | Debug/revision/coordinate text shown to users | LandingPage.tsx `[R313]—MADAREK·…` row + `.fo-cta-corners` runtime coords + writer · Elevation/LearningPlan `MDRK · …` + `SCALE … · UNITS M` · JourneyScene `[01–04] · LIVE` + station `meta` jargon · WhyScene labels | **FIXED c1 (WP-1a + foreman tail)** — innerText sweep zero at 1440+390; reviewer-found tails also killed (`[SECTION A-A · 1:200]`, `[CTA · RESOLVE]`); REMAINING (deferred by design): hero `[LIVE]` tag (C2) · `SHEET 05 · SCALE 1:100` / `VIEW-A/B · 1280×800` / `real-ui` ×6 (C4 platform) · `[06]` in ledger + «RTL» Latin (C2 copy pass) | audits/evidence/r322/kill-v1/ + review-c1/ |
| V2 | Map intro broken: duplicate giant headlines + orphan 12px paragraph + empty plan grid | JourneyScene.tsx `.jt-intro*` | OPEN (C3) | — |
| V3 | «مقدمة» card = black slab with void, covers plan rooms | JourneyScene.tsx intro card | OPEN (C3) | — |
| V4 | Voids/blank bands: ≈250px under role cards (1440); ≈160px bands on phone | landing.css sections | OPEN (C2+) | — |
| V5 | Type too heavy/inconsistent: 100% w700, 5–6 ad-hoc display sizes 60–85.55px; tablet-band amplification; phone one-word lines | landing.css display ladder | **FIXED c1 (WP-1d)** — the d1/d2/d3/st rungs on the measured Heron ladder: 46.67/40/33.33/23.33px @1440 · 36.86 @768 (Heron 36.83) · 31.74 @390 (Heron 31.76) · 47.57 @991 (Heron tablet) — 100% w600/500 IBM Plex Sans Arabic; the 991/767 amplification dead by construction (px floors); VLM hero 7.5→**9.0** | audits/evidence/r322/dsys/type-census-after.md |
| V6 | Platform cluttered: blurry screenshots + pasted tooltips/chips | PlatformCanvas/ProductFrame | OPEN (C4) | — |
| V7 | Edge tab clips body copy at 1440 | EdgeTab + r314-chrome.css | **FIXED c1 (WP-1a)** — slim rail at ≥992 inside frame margin, geometry-proven no intersection; ≤991 gutter marker | audits/evidence/r322/kill-v1/ |
| V8 | Orphan paragraphs & broken 12-col grid (problem section) | landing.css | OPEN (C2) | — |
| V9 | Map label contrast/collisions in transitions | JourneyScene + landing.css | OPEN (C3) | — |
| V10 | Phone hero art tiny (~160px in 330px window); map card clips «شاهد»; red marker at x=0 | HeroInkWindow + journey mobile | **PARTIAL c1** — the x=0 marker (`.et-mark`) hidden <768 (foreman fix 3f7ff14a); art-scale + «شاهد» clip OPEN (C2/C3) | review-c1/ |
| V11 | Desktop jank: 106/215 frames >33ms, p95 50ms, CLS 0.27, LCP 21s (loader-on) | A1 continuation | OPEN (WP 1-e) | audits/evidence/r321/a1-analysis.md |
| V12 | Older tickets: legal clip (FIXED R321-A4), dup ERR (FIXED A5), decor `+` (FIXED A6), «الإدارة» (FIXED A7), demo panel (A8-prod **FIXED c1 WP-1a** — dev-only open, prod collapsed chip), authed pages unfinished (sweep continues) | — | PARTIAL | R321 board |

Carried R321 tickets folded into this board: A1→V11 · A3→V10 · A9→V9 ·
A8-prod **FIXED c1** · A2-R ladder seats 320/430/600/1180 (OPEN, C2+ checks) ·
Bverify-P3-1 (competition-detail dark h1=0, OPEN C7) · B4-rem / B3-rem dedupe
remainders (OPEN C6).

## §2 HERON EXTRACTION (transplant basis) — LANDED c1 (WP-1c)

`docs/redesign/r322/heron/` — 14 JSONs + 5 plain-words .md + media inventory.
docH cross-check vs R321 board: **0% drift** (12,355 / 12,577 / 11,441). No
verbatim text captured (counts/roles only). Key transplant numbers:

| Seat | Measured (rem, @1440 unless noted) |
|---|---|
| Page frame | 0.8rem inset, 1px hairline |
| Header | fixed bar 6.76/5.6/5rem (1440/768/390); 12-col; logo ≈50% + 4 menu items 16.41rem + CTA 20.01rem; mono labels 1.4rem w500 uppercase ls −0.02em; `on-scroll` @~50–100px; `on-hide` @1440 = translateY(−own height) with hysteresis |
| Hero display | **5.6rem w700 lh1 @1440 → 4rem w600 @768 → 3.2rem w600 @390**, 47ch/2L; art band 171.27×84.03rem (img 164.81×77.6rem contain) + content band 16.01rem (H1 cols 1–7, sub+CTA+marquee cols 8–12, 1px divider); 390: 4-col, gutter 1.6rem |
| Statement | 6+6 split; square ink art left; right cell pad 6.4/15/3.2/15rem; title **4rem w600 lh1** per-char color scrub (98→718px, 4.28s — the only scrub); CTA 16.34×5rem; partner strip ≈11.2rem |
| Problem | head (kicker + **H2 4.8rem w600** 53ch/2L + sub 156ch) + 4 open columns **42.82rem** (mono keyword + ghost 2-digit index, dashed rule, centered 20×20rem SVG, item-title 2.8rem 3L, body 88–106ch); 768=2×2; 390=swiper dots 2.02×0.2rem |
| Scroll/motion | Lenis lerp ≈**0.056@1440 · 0.081@768 · 0.09@390** (literal config uncaptured — empirical); GSAP 3.12.5; ScrollTrigger 44/42/28; **ZERO pins site-wide**; reveal recipe `top+=40–65% bottom` → `autoAlpha+yPercent`, **power2.out 0.8–1.34s**; drawings add scale expo.out 1.6s; loader auto-dismiss 5.5–6.0s |
| Grid | 12-col, gutter 2rem desktop / 1.6rem @390, frame inset 0.8rem → re-pin `--grid-gutter` 1.5→2rem (dsys provisional tokens hold within 0.5rem) |

Gaps: Lenis literal options · Webflow IX2 params (rebuild from evidence shots +
§3 review) · map section not captured (C3 owns; its 2 scrub triggers
1465–2352 / 1908–7495 recorded in the global table) · 1024bp not re-run.

## §3 REVIEW RECORD (per accepted section — mean ≥ 9, no category < 8)

| Section/Page | Reviewer 1 (C1 baseline) | Notes | Mean | Defects left | Locked |
|---|---|---|---|---|---|
| Hero | 5.9 → **re-review pending post-1-d** (VLM hero 9.0 after type fix) | C1 pre-migration baseline | 5.9 | C2 owns (composition/CTA leap) | — |
| Statement | 6.1 | pre-1-d | 6.1 | C2 | — |
| Pains | 5.9 | pre-1-d | 5.9 | C2 (V8 grid) | — |
| Map | **4.2** | pre-1-d | 4.2 | C3 (V2/V3/V9 + 809px dead band) | — |
| Product | 4.9 | pre-1-d | 4.9 | C4 (V6) | — |
| Why | 5.2 | pre-1-d | 5.2 | C4 | — |
| Roles | 5.2 | pre-1-d | 5.2 | C4 (V4 231px void + ledger) | — |
| CTA | 5.4 | pre-1-d | 5.4 | C4 | — |
| Footer | 7.2 | pre-1-d | 7.2 | polish | — |

**C1 overall: 5.5/10** (nothing ≥ 9, nothing locked — the C2–C4 transplants
 carry the distance, as the brief predicts). Full record:
`audits/evidence/r322/review-c1/REPORT.md`. Reviewer-confirmations: V1 killed
families zero (but the deferred list grew — see V1-rem row below); V7
geometry-proven (8.7px clearance); V4 confirmed worse-than-ticketed (231–269px
roles void · 275px statement→pains · 260px pains→chapters · **809px map-end dead
band** · phone 194/174/153px).

## §4 DESIGN SYSTEM (R322) — LANDED c1 (WP-1b)

- Grid: 12 columns, gutter/margins in rem, logical properties only. **Tokens landed** (`--grid-cols/-margin/-gutter`, provisional); Heron measurement says gutter **2rem** desktop / 1.6rem @390, frame inset 0.8rem — re-pin pending.
- Spacing scale (rem): 0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4 · 6 · 8 · 12 — tokens landed (`--space-xs…--space-12xl`); stylelint enforcement planned.
- Type: **display face = IBM Plex Sans Arabic** (blind 3-reviewer vote 26.5/30 — typographer 8.5 · Swiss director 9.0 · RTL-a11y 9.0; Alexandria finished 4th/5th "too blunt"). Weights 400–600 ONLY: D1 600 · D2/D3 500 · body 400. Rungs `--fs-d1 clamp(2.5rem,3.25vw,5.6rem)` · `--fs-d2 clamp(2.25rem,2.78vw,5.3rem)` · `--fs-d3 clamp(1.875rem,2.3vw,4rem)` — vw mid-terms make the tablet-band root amplification **impossible by construction**. @1440 = 46.7/40/33.1px = the R313-measured Heron ladder. Body 15–17px @1.7 (`--fs-body-lg` is the rung). Mono 11–12px Latin-only. Leading 1.05/1.10/1.15 · `text-wrap: balance` · no tashkeel · no Arabic letter-spacing.
- Material: paper `#F6F6EE` · ink `#282828` · orange `#FA3600` · hairline `#B3B3AF` · guides `#E0E0DA` · radius 0 · no shadows · grain · dashed frame — confirmed against live tokens (R313 pins hold; DESIGN.md §2 stale `#F6F8FA` table noted as drift).
- Component gallery route `/__design` (dev+preview only) — planned C5.
- Evidence: `audits/evidence/r322/dsys/` (type-census, font-vote, pixel-stability proof).

## §5 SCROLL/MOTION

Target: same ScrollTrigger/Lenis table as Heron ±10 %, one rAF loop,
`gsap.matchMedia` per bp, cleanup on route change, native touch on phones,
reduced-motion = complete static page.

## §6 PERF (desktop is the failing half)

1440 targets: ≥98 % frames ≤ 20 ms · CLS ≤ 0.05 · LCP ≤ 2.5 s (loader
skipped) / ≤ 4 s first visit. Phone (390: 0/255 janky, CLS 0, LCP 1.0 s) —
protect it. Basis: `audits/evidence/r321/a1-analysis.md` (UpdateLayoutTree
4.5 s is #1; intro var-chain 10 ms/frame; 756-family hunt; loader plateau).

## Cycle log

### Cycle 1 — 3 packages MERGED (c8213f44 · 88cc6242 · e0fab65d)

| Package | Task ID | Agent | State |
|---|---|---|---|
| V1+V7+A8-prod quick kills | 1-a | kill-v1 | **MERGED** — 4 commits, lint 0/tsc 0/2735 green, docH 12,523/11,319 in band, killed-string sweep zero, edge-rail geometry proven |
| Design system + fonts | 1-b | dsys | **MERGED** — census (V5 quantified), blind font vote (IBM Plex Sans Arabic), additive tokens, DESIGN.md §R322, pixel-stability proof |
| Heron extraction ×4 + scroll spec | 1-c | heron | **MERGED** — 14 JSONs + 5 .md + media inventory, docH 0% drift, no-text-copy verified |
| Type-scale implementation (V5) | 1-d | dsys-impl + foreman | **MERGED (85560006 → fdc0394c)** — census 4 rungs exact, docH ladder 12413/10002/12499/11368/10782 all in band, 2735 green, VLM 9.0 |
| Independent reviewer (C1 visual verdict) | 1-r | reviewer | **DONE** — 5.5/10 baseline, V1/V7/V4 verdicts, 10 defects filed (REPORT.md) |
| Desktop perf trace + intro chain | 1-e | — | QUEUED (C2 wave) |

Foreman verification on merged main (e9ded0ff→e0fab65d): lint 0 errors/15
pre-existing warnings · typecheck clean · vitest 229 files/2735 tests ·
raw-css PASS · killed strings zero at 1440+390 · console clean · docH
12,523 @1440 / 11,319 @390 (both in the ±1.5% band, moving DOWN toward Heron
as intended).
