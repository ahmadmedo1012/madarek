# R306 evidence set — مرجع وقبل/بعد

Captured 2026-10-21/22 UTC during the R306 audit + acceptance sweep.

## Reference (heronaiapp.com — re-verified live, CSS bundle hash identical to the R305 analysis `9f21166e0`)

- `reference-hero-1440.png` — desktop hero (the drafting-sheet grammar: inset frame, ruler, registration marks, line-art object, caps headline band, metadata grid)
- `reference-hero-390.png` — mobile hero

## Madarek BEFORE (production `d9f74004c8eb` — the R304 OPTIKKA poster still live)

- `madarek-before-hero-1440.png` — the 3D knot + giant type + orbit decorations
- `madarek-before-chapters-1440.png` — the alternating editorial spreads

## Madarek AFTER (the r306 drawing sheet — local dev server, real renders)

Desktop 1440×1000:
- `landing-hero-1440-light-v2.png` / `landing-hero-1440-dark.png` — the blueprint hero (both themes)
- `landing-statement-1440-light.png` — the framed statement
- `landing-chapters-1440-light.png` — the six capability ledger rows + flat fragments
- `landing-live-1440-light.png` / `landing-live-1440-dark.png` — the hairline capability matrix (no slab)
- `landing-colleges-1440-light.png` — the interactive registry + title-block metadata
- `landing-cta-footer-1440-light.png` — the coordinates-row CTA + colophon footer
- `landing-hotspot-05-active.png` — the [05] hotspot pressed: the panel reads مصفوفة الإتقان

Mobile 390×844:
- `landing-hero-390-light.png` — text-first flow, compact drawing
- `landing-mobile-mid-390.png` — the chapters in flow mode
- `landing-mobile-menu-390.png` — the burger menu (funnel: «ابدأ الآن» → /auth/register verified)

Responsive matrix (hero, light): `landing-hero-{320,360,768,1024}-light.png` — zero horizontal
overflow at every width (probed in-browser, both the scrollWidth check and the visual reads).

## Interaction/a11y probes (in-browser, logged in the release report)

- Hotspot click [05] → panel updates (polite live region) ✓
- Theme toggle light→dark → `--bg` flips to `rgb(40,40,40)` ✓
- Header 56px, `dir=rtl`, 5 hotspots, no `--poster-*` consumers ✓
- axe dev scan: transient contrast findings investigated → the nav-link resting ink
  hardened to the solid `--text-secondary` tier (the alpha-over-backdrop composite
  fragility documented in landing.css)
