# R362 · Agent 3 — Heron Experience · delivery notes

Branch: `agent/r362-heron-experience` (from `integration/r362-final-unification` @ `e98d6a0`).
Scope: the geometric drawing language — interactive plates, the scroll-draw engine,
the public landing's concepts band.

## What landed

### 1. The interactive drawing family (`frontend/src/components/illustrations/interactive/`)

- **`drawKit.tsx`** — the shared utensils: `win(a, b)` (a scroll window as inline
  `--a`/`--b` on an element or wrapper group) + `TiNode` — the ONE interactive
  station seat on the r331 HeroInspect model: **hover** is transient
  (enter sets, leave clears — guarded by the live `hovered` prop so the
  enter-before-leave race between neighbours never steals the highlight), **tap**
  persists (click / Enter / Space toggles, Escape dismisses, focus mirrors hover).
  `aria-pressed` rides only the tap channel.
- **`ConceptField.tsx`** — the triangulation net (landing seat of the r360
  knowledge plate's grammar): bench marks A/B, hub stations C1–C4, weak dashed
  leg to the isolate (GAP-02 = the ONE signal). Pointer instrument (fine
  pointers): crosshair guides + live mono coordinate readout `X nnn · Y nnn` in
  the drawing's own top margin, rAF-throttled, imperative, zero renders per move.
  Activation: legs re-ink (stroke 1.8px), a measurement chain draws from the
  datum to the station with its honest sheet-unit distance (`d nnn u` — the
  drawing's own geometry, never fabricated academic numbers), the ring lifts.
- **`RouteSurvey.tsx`** — the gated learning route: bench mark BM, gates G1–G4
  (قراءة موجّهة · نقطة فحص · تمرين مقيس · مشروع تطبيقي), terminus mast T
  (الإتقان = the ONE signal), gradient ticks (surveyor slope hatching computed
  from the segment geometry), level ladder L0–L4, dimension chains (chord 636 ·
  rise 188). Fully CONTROLLED two-channel from the section.

All three share the r359 ink ladder (`technical-sheet.css` imported read-only —
ZERO ink of their own in the components) + the new interactive sheet.

### 2. The scroll-draw engine (`frontend/src/styles/technical-interactive.css`)

One progress var per drawing (`--cf-p` / `--cr-p`, default 1 = the complete
sheet — JS-off and reduced-motion both ship the finished drawing):
- solid strokes draw through windowed `stroke-dashoffset`;
- dashed guides fade (their own dasharray forbids the draw technique).
- **The px-typed-bounds law** (measured live): Chrome silently drops `clamp()`
  over `var()` tokens when the bounds stay unitless — the value coerces to px,
  the bounds stay numbers, the types mismatch, and the clamp falls away
  (`calc(1 - clamp(...))` computed to `-3.92px` instead of `0`). The `* 1px`
  middle term types the whole comparison; the bounds hold. The fade lane drops
  clamp entirely — opacity's used value bounds itself at [0,1] by spec.
- The pointer law: every chrome layer (`ti-meas`, `tp-note`, `tp-mark`, the
  readout, all text) is `pointer-events: none` — they render ABOVE the stations
  and `opacity:0` does NOT remove hit-testing, so without this they steal the
  hover right off the stations (measured live).
- The family's missing rungs added (scoped, the r359 sheet untouched):
  `.tp-envelope path` + `.ti-station` (the r359 CSS only styled rect/line —
  paths and circles painted SOLID BLACK by default fill).
- Reduced-motion belt: dash lifted, every layer at full, transitions frozen —
  interactions stay live.

### 3. The concepts band (`sections/Concepts.tsx` + `styles/landing/concepts.css`)

[05·ب] between product and why — the drawing language made explicit. Two acts:
the net that constructs under scroll + answers the pointer, then the gated route
whose stages the Arabic ledger drives. Self-contained (the driver lives inside,
like Chapters/Why): ONE `useSheetScroll` subscription on the section root, the
field draws across the first third of traversal, the route across the last
third, imperatively, idempotently, zero renders per tick. The stage rows are the
44px touch seats (rows drive the drawing's gates through the same two channels
— the drawing answers the list, the list answers the drawing). No auth links
(the funnel contract stays 5+5). Honest disclosure line present (رسم توضيحي).

Composed into `LandingPage.tsx` (one import + one JSX seat, the composer's
cascade untouched — the band's sheets ride its own modules).

### 4. The e2e belt (appended to `r308-landing-instruments.e2e.ts` — my file)

Six tests: construction (driver writes; envelope drawn mid-band; route legs
complete at the band's end), interaction (hover re-ink + measurement + readout;
tap persists after leave; ledger row mirrors into the drawing; live coordinate
readout), the never-hide law under `reducedMotion: 'reduce'` (driver never
writes; belt completes every layer; interactions live), mobile recomposition at
360/390/430 (full drawing in-flow, 44px rows, zero horizontal overflow).

## Verification actually executed (all against my own dev server, port 5303)

| gate | command | result |
|---|---|---|
| typecheck | `npx tsc -b --noEmit` + `tsc -p tsconfig.test.json` | 0 errors |
| lint | `npm run lint` (root) | 0 errors (16 pre-existing warnings, none in my files) |
| unit | `TZ=UTC npx vitest run` | **3113/3113** |
| e2e (mine) | `npx playwright test tests/e2e/r308-landing-instruments.e2e.ts` | **11/11** (5 prior + 6 new) |
| e2e (regression) | guest-landing, r312-guest-reveal, r312-mobile-camera, r325-map-clip, r311-cursor-ownership, r323-loader-overlap | **31/31** |
| bundle | `npm run build -w frontend` + `node scripts/check-bundle-size.mjs` | **759.1 KB gz total** (baseline 754.0 → +5.1; ceiling 774.0 → 14.9 headroom; entry 66.0; pdf 95.7) |
| colors | `check-colors.sh --strict` | PASS |
| raw-css | `check-raw-css.sh --strict` | PASS (type/radius/spacing 0) |
| motion | `check-motion-tokens.sh` | PASS |
| icons | `check-icons.sh` | PASS |
| stylelint | `stylelint-gate.sh` | ratchet green (my two sheets: 0 findings) |
| deadcode | `deadcode/check.sh` | ratchet green (knip 64/64 held — the new spec lives inside an already-counted e2e file; jscpd 196/196 held after one dedup reorder) |
| conformance | `run.mjs --url :5303 --gate` | **PASS — 93.5% ≥ 91.6% floor** |
| overlap | `qa/overlap.mjs --routes / --bps 1440,768,390 --themes light,dark` | **0 defects** (fixed-over-text, text-on-text, text-on-media, big-fixed, clipped, hoverflow all 0) |
| visual (VLM) | desktop light/dark + 360/390/430 | drawing renders as outline (not filled), stations ring, dark contrast per family register, mobile readable, no overflow |
| browser truth | agent-browser live session | driver writes verified at 4 scroll depths; hover/click/persist/escape/mirror/keyboard (Enter, Escape, focus) all verified |

## The Heron study (from the live site, not screenshots)

Confirmed on heronaiapp.com (measured live): `home-hero-img-coordi` (the
coordinate readout), `home-hero-curor-line` (pointer-following lines), rulers
(`home-hero-ruler`), plus marks, 5s reveal cadence, 800ms dash movement — the
language this deliverable reproduces in Madarek's own grammar (tokens, tp-*
ink ladder, Arabic-first). No Heron source/text/images/fonts copied.

## Remaining gaps / requests to the integrator

- The band is ORIGINAL content (not in the frozen Heron spec) — it sits BETWEEN
  `home-platform-wrap` and `home-why-wrap` without a conformance mapping of its
  own (by design: an original Madarek band has no spec counterpart). The 10
  mapped sections' pass-rate held (93.5% ≥ 91.6%).
- No knip/deadcode re-pin needed from this branch (the ratchet held by
  construction). If the integrator prefers a dedicated spec file over the
  appendix, that split needs the baseline re-pin in the same commit.
- Cross-agent request (Agent 4): the family's rungs now extend the r359 ladder
  in `technical-interactive.css` (scoped to `.cf-svg`). If the design system
  later unifies the missing `.tp-envelope path` / fixture-circle rungs into
  `technical-sheet.css` itself, my scoped extensions retire cleanly.
- GSAP/ScrollTrigger: NOT added — the existing stack (useSheetScroll +
  conductor + CSS dash engine) measured sufficient; the +5.1 KB gz includes
  everything.
