# R322 font vote — the blind display-face election (task 1-b)

Generated: 2026-10-28 · method: the brief §4 mandate (same real headline in each
candidate at 3 sizes × 3 weights, screenshot, pick by reviewer vote).

## Setup

- Test page: `frontend/public/r322-font-test.html` (dev-only scratch, Google
  Fonts CDN **for the test only** — the shipped stack stays self-hosted).
- Specimen: the landing's own `pm-title` copy — «أربعة أوجاع من
  **التعليم العالي الليبي**» (orange `em` on the accent-ink `#C72E00`) — plus
  the real `pm-lede` + one `st-line` sentence for the paragraph/small-size
  legibility rows. Paper `#F6F6EE`, ink `#282828`, hairline `#B3B3AF`.
- Panels **[A]–[E], blind** (no face name in any frame), each at 32/48/72px ×
  400/500/600, leading 1.15/1.10/1.05 (the brief's 1.0–1.15 band), zero
  letter-spacing, no tashkeel.
- Shots: `font-test-1440.png` (full height, 4865px) + `font-test-panel-[A-E].png`
  (per-panel crops so the 32px rows stay legible to the reviewers).
- The mapping (revealed here, AFTER the vote):
  `[A] Readex Pro · [B] Alexandria · [C] IBM Plex Sans Arabic · [D] Noto Kufi Arabic · [E] Tajawal`

## The three independent blind reviews (verbatim; raw JSON alongside)

1. **Arabic typographer** (`review-arabic-typographer.json`) — verdict **[D] > [C]**:
   [D] 9.5 «masterclass in Neo-Kufic/Geometric Naskh engineering… it is the
   architectural drawing itself» · [C] 8.5 «the Artisan — elegant, fluid Naskh…
   premium editorial feel» · [E] 6.0 · [A] 5.5 · **[B] 4.0** «too blunt/heavy
   (lacks finesse)».
2. **Swiss-minimalist design director** (`review-swiss-director.json`) — verdict **[C] > [A]**:
   [C] 9.0 «structural logic is absolute… reads as a technical instrument, not a
   decorative script… will lock into its geometric terminals like a dimension
   line on vellum» · [A] 8.2 · [D] 7.5 · [B] 7.0 «600 already crowds the counter
   space; risky for tight leading» · [E] 6.5.
3. **RTL accessibility specialist** (`review-rtl-a11y.json`) — verdict **[C] > [A]**:
   [C] 9.0 «dot clarity exceptional even at 32px (ح/خ/ج, ر/ز); kashida
   discipline strict… engineered rather than calligraphic» · [A] 8.0 ·
   [B]/[D]/[E] rejected in notes («[B] too bold/heavy — the 400 weight reads
   like a 500»; [D] «too wide/extended»; [E] «legibility risk — dots too small
   and fine»).

## Tally

| Panel (face) | R1 typographer | R2 director | R3 a11y | Sum | Avg | Ranks (#1/#2) |
|---|---|---|---|---|---|---|
| **[C] IBM Plex Sans Arabic** | 8.5 | **9.0** | **9.0** | **26.5** | **8.83** | 2×#1, 1×#2 |
| [D] Noto Kufi Arabic | **9.5** | 7.5 | unranked (rejected: too wide) | 17.0+ | ~5.7 | 1×#1 |
| [A] Readex Pro | 5.5 | 8.2 | 8.0 | 21.7 | 7.23 | 2×#2 |
| [B] Alexandria *(current display)* | 4.0 | 7.0 | rejected (400 reads like 500) | 11.0+ | ~3.7 | none |
| [E] Tajawal | 6.0 | 6.5 | rejected (legibility risk) | 12.5+ | ~4.2 | none |

## Verdict

**The R322 display face is IBM Plex Sans Arabic — the current BODY face wins
the display election.** The round **re-weights, and re-seats the display voice
onto Plex**: two of three reviewers ranked it #1, the third ranked it #2, and
two independently named «IBM Plex Mono» as its ideal Latin partner without
knowing the panel WAS a Plex face (the superfamily harmony is real and
measurable — same skeleton as our self-hosted mono voice).

**Winning display weights: 400 / 500 / 600 ONLY** (the brief ends the 800/900
era; 700 stays available for body emphasis, not display). Hierarchy transfers
through SIZE + the 500/600 rungs:
- D1 (one per page, the H1): **600**
- D2 (section statements): **500** (600 where a section is THE focal moment)
- D3 (card titles): **500**
- body: 400 (500 for lead paragraphs), emphasis 700

**Fonts to ship: NONE — the winner is already self-hosted.** IBM Plex Sans
Arabic 400/500/600 (arabic + latin subsets) ships today in
`frontend/public/fonts/` and is wired in `fonts.css` (16-face pin untouched).
Alexandria (600/700) stays exactly as is — legacy consumers keep it until the
type-scale implementation (task 1-d) migrates display seats onto the R322
rungs; nothing is removed in this package.

## Caveats (honesty ledger)

- **Tajawal has no true 600 cut** — its «600» row rendered the 700 file via CSS
  font matching (the css2 request itself pins 400;500;700 to stay valid). A
  real strike against it for a 400–600-weight system, disclosed post-vote.
- VLM reviews are **advisory** by repo convention — but here they follow the
  brief's mandated method (blind panel vote) and agree across three distinct
  personas; the arithmetic is unambiguous (no geometry to re-confirm).
- The current display face (Alexandria 700) scored **last-but-one**: every
  reviewer read it as «blunt / heavy / 400-reads-like-500» at exactly the
  restrained weights the R322 brief mandates — evidence for V5's «type too
  heavy», now quantified by the type census (`type-census.md`: every display
  combo today rides weight 700).
