# R323 BOARD — reviewer evidence & scores

> Method: transplant Heron's measured structure, subtract clutter, judge by eyes.
> Gates are safety nets, never the verdict. Evidence PNGs live in `evidence/`.

## Wave 1 evidence sweep (2026-10-29, `main` @ R323 wave 1)

| Surface | Viewports | Light | Dark | Foreman verdict (eyes) | Evidence |
|---|---|---|---|---|---|
| Landing hero (drawing + type + CTA row) | 1440 / 390 | ✓ | ✓ | ONE logo system; consent = one compact line (48 px phone bar, never over H1 — probe `coversH1:false`); no debug text; ticker edges fade, no mid-glyph cuts | `landing-1440-light-hero.png` · `landing-390-light-hero.png` · `landing-1440-dark-hero.png` |
| Phone header row | 390 | ✓ | — | `[hamburger 44px | القائمة | lockup]` one 56-px row; no stray rule, no clipped label; menu = full-height staggered sheet, Escape closes | `landing-390-light-menu.png` |
| Map (six-state story) | 1440 | ✓ | — | Walls = constant solid ink (discrete envelope write — tone jump dead); headline rides a paper plate (≥24 px clear zone); «مقدمة» card's corner dissolves into paper (mask) — no hard label cut | `landing-1440-light-map.png` · `map-card-era-1440.png` |
| Platform §05 product frame | 1440 | ✓ | — | ONE designed vector frame (sheet-05, hairline cells, orange accent), mono index rows, single disclosure; no blurry screenshot / tooltip / real-ui chip | `landing-1440-light-platform-roles.png` |
| CTA + footer | 1440 | ✓ | ✓ | Footer wordmark = the new Plex 600 letterforms full-cell-width; ink strip = 5 hairline cells on the row, captions on baseline; no filler newsletter; CTA statement + real buttons | `landing-1440-light-cta-footer.png` · `landing-1440-dark-footer.png` |
| `/__brand` specimen | 1440 | ✓ | ✓ | Construction grid + 4 variants + 4 tones + clear-space + min sizes + do/don't + animated mark (point last) | `brand-1440-light.png` · `brand-1440-dark.png` |

## Loader contract probes (scripts/r323/qa-sweep.mjs)

- Ready state @1440: `data-fullscreen-layer` visible count = **0**; `[data-logo]` = 4 (header
  mark + footer wordmark + footer mark + edge-tab — all in chrome seats, none stacked).
- First visit (fresh storage): splash visible at t0 (`splash:1`), exits cleanly, **no second
  logo**, sheet loader skipped per orchestrator contract (dev-server fast path).
- Phone consent: `barHeight:48`, `bottomBar:true`, `coversH1:false`.

## Reviewer scores

Pending — the independent reviewer pass runs against this evidence at the end of wave 1
(the foreman's own eyes are recorded above; reviewer reports append below).

| Reviewer | Landing 1440 | Landing 390 | Brand sheet | Notes |
|---|---|---|---|---|
| (round 1 pending) | — | — | — | — |

## Known remaining (honest ledger)

- Authenticated app screens (A5) not yet raised to the landing standard.
- A4 perf remainder: desktop jank 22 %→≤2 % target, bundle caps, gate:clean.
- B2 storage/player, B3 mail/import, B4 flows E2E, B5 ops, B6 load, B7 pilot — all pending.
- The paper tone-swatch chip on `/__brand` is paper-on-paper — add a hairline frame (minor).
- OG image (`madarek-og.jpg`) regenerated with the new lockup; verify in a social debugger
  before the pilot announcement.
