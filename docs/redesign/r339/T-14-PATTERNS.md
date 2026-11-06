# T-14 — Pattern Library (r339): census, canonical params, adoption

**Branch** `r339/t14` (base main 93613c1c) · full census: `/tmp/t14-census.md` (mirrored in this doc's tables) · conformance proof: `/tmp/t14-conf-{before,after}.json`.

## What landed

- `frontend/src/styles/landing/patterns.css` (124 ln) — the 7 canonical patterns as `lp-*` class-sets: **Numeral** `.lp-numeral` · **Hairline** `.lp-hairline(--h/--v/--border)` · **Eyebrow** `.lp-eyebrow` (+`.lp-kicker(--cta-ink)` sibling) · **CtaPair** `.lp-cta-pair` · **CardGrid** `.lp-grid` · **Marquee** `.lp-marquee(-track)` · **PinnedScene** `.lp-pin`. Existing tokens only, logical properties (RTL-first), RM-off on the marquee, `@media (inline-size <= 767px)` ladder matching the sections' own bp split.
- `frontend/src/components/landing/patterns/` — 7 TS-strict components (`Numeral`+`num()`, `Hairline`, `Eyebrow`, `CtaPair`, `CardGrid`, `Marquee`, `PinnedScene`) + barrel. Lean: props are `n`/`variant`/`children` only. **This is the P3 (inner pages) prerequisite** — inner pages import patterns, not section sheets.
- Loaded in `LandingPage.tsx` after `chrome.css`, before every section sheet → spec-locked section overrides always out-specify the bases.

## Canonical param set (derived from the Heron-conformant sections — nothing invented)

| pattern | canonical params (owner) |
|---|---|
| numeral | `font-family:var(--font-mono); font-size:var(--fs-sm); font-variant-numeric:tabular-nums` (chrome `.fo-mono`) |
| eyebrow | `inline-flex; gap:var(--sp-2-5); fs-sm; fw 600; color:var(--text-muted)` + `::before` 1px×`--sp-5` `--rule-strong` dash; index child fs-xxs/`--text-faint` (chrome `.fo-label`) |
| hairline | `background:var(--rule-strong)`; h = `position:absolute; inset-inline:0; block-size:1px; pointer-events:none`; v = `inset-block:0; inline-size:1px` (statement seats) |
| kicker | `font-mono; fw 500; letter-spacing 0` (Arabic joins forbid tracking); ink per context (cta `.fo-cta-kicker`) |
| CTA pair | container `flex; wrap; gap:var(--sp-8)`→`--sp-4` <768; children ride the global `btn accent lg` + `btn ghost lg` (cta `.fo-cta-actions`) |
| card grid | `grid; repeat(2,minmax(0,1fr)); gap:var(--sp-8)` → 1 col <768 (roles) |
| marquee | `flex; overflow:hidden; gap:var(--sp-8); border-block:1px solid` + track `min-inline-size:100%; animation:fo-ticker-rtl 36s linear infinite` + RM `animation:none` (hero `.fo-ticker`) |
| pinned scene | `position:sticky; inset-block-start:0; block-size:100dvh; padding-inline:var(--page-gutter)` (journey `.jt-pin`) |

## Census before → after (the 7 patterns × 9 sections + chrome, 44 instances)

- **Before: 39 inconsistent** (r338 panel tally).
- **After: 33 raw** — but the census reclassification is the real finding:
  - **6 killed** by computed-equal library adoption (below).
  - **28 spec-locked**: the divergent params ARE each section's measured Heron values (`pm-kicker` 1.4rem/500 · `pr-label` 1.6rem/500 · `wy-eyebrow` fs-mono-md · footer fu-scale · `st-pill`/`pr-cta` bespoke · footer ledger grids · hero `--rule` border · `hro-work-track` · `hro-alt`). The conformance instrument measures these cells — changing them regresses the section. They are the reference's own per-section variation, not drift. → **r340 lever: one spec edit per pattern converges all 28 at once.**
  - **5 free residuals** queued: crawl-cell + sheet-rule border→bg technique, `cg-strip-label` size, hero work-strip anim, crawl border seat.

## Adoption list (section → instances)

| section | converted |
|---|---|
| intro (Statement) | 5 hairline instances → `lp-hairline--v/--h` (+2 one-line inset seats kept); 4 rule bodies deleted from statement.css |
| cta (Vision) | 4 kickers → `lp-kicker lp-kicker--cta-ink fo-mono`; base rule deleted from cta.css; 4 spec size/lh overrides renamed in place |
| chapters | head kicker → `<Eyebrow n={4}>` (lp-eyebrow = fo-label grammar) |
| usecase (Roles) | numeral kept hand-rolled — **r306-landing-sheet.test.ts pins the exact template** (tests are law); lp-numeral documented as its equal |

**Conformance (before → after, 4 touched sections × 5 bps): deltas all 0.0** (intro 97.2–99.2 · cta 90–94.6 · map 91.3–92.1 · usecase 89.4–95.2 — identical). Tests: 55/55 landing-affected vitest green.

## CSS line delta

`wc -l frontend/src/styles/landing/*.css`: **13657 → 13762 (+105)** — patterns.css adds 124, section deletions claw back 19 (statement −16, cta −6, +2 seat comments). Net up because the library is new shared capability (7 components + class-sets replacing future hand-rolling); the point of "down" is realized per-adoption, not on seeding. No `!important` added; tokens only (verify fast PASS, stylelint/bundle gates green — 765.3 KB gz ≤ 770).

## Next actions

1. r340: converge the 28 spec-locked rows via one spec edit per pattern (spec owner + section owners), then re-adopt — each is then a 1-line swap.
2. Kill the 5 free residuals (technique swaps, computed-equal).
3. P3 inner pages: import `components/landing/patterns` + `styles/landing/patterns.css` only — not section sheets.
4. chrome.css `.fo-label` seat is now library-duplicated (Chapters moved to lp-eyebrow); deletion belongs to the chrome owner / T-31 dead-list pass (chrome/** is not mine to touch).
