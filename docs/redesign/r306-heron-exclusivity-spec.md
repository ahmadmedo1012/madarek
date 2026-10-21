# R306 — Heron Exclusivity Specification · مواصفة «هيرون فقط» — المخطّط التنفيذي

> **R306 deliverable** — the implementation-grade specification for purifying Madarek to a
> single Heron-inspired design language and the prioritized repair matrix derived from the
> live audit. This document supersedes nothing measured — it **consumes**
> [`r305-heron-reference-spec.md`](r305-heron-reference-spec.md) (the measured reference
> evidence) and adds the R306 exclusivity decisions + the concrete rebuild plan.

**Branch:** `fix/r306-heron-only-purification` · baseline `origin/main @ d9f74004`
**Audit date:** 2026-10-21/22 UTC · production build verified `d9f74004c8eb`

---

## 1. Reference re-verification (R306 live audit)

The reference was re-inspected at execution time — not assumed from R305:

| Check | Result |
|---|---|
| `https://heronaiapp.com/` reachability | HTTP 200, 262 KB HTML |
| CSS bundle hash | `heronai.webflow.shared.9f21166e0.min.css` — **identical hash to the R305 analysis** (244,234 bytes) |
| `--content--brand` | `#fa3600` (unchanged) |
| `--content--primary` | `#282828` (unchanged) |
| `--content--border` | `#b3b3af` (unchanged) |
| Header height | 56 px (unchanged) |
| `.line` hairlines on `/` | 265 (unchanged) |
| Button radius | `0px` (unchanged) |
| h2 register | `40px / 600` (unchanged) |
| 390×844 overflow | none |

**Conclusion:** the reference is byte-identical to the R305 measurement set. The R305 spec
(§2 effect sheets, §3 token map, §5 adopt/fix deltas, §4 licensing) remains the canonical
reference authority. R306 adds nothing to the reference measurements — it executes what
R305 left unfinished.

Fresh R306 evidence captures: `docs/redesign/assets/r306/` (reference hero/mid @1440,
reference hero @390; Madarek "before" hero/statement/chapters @1440).

### VLM cross-check (independent visual reading)

An independent vision-model reading of the fresh reference captures confirmed the grammar:
technical drafting-sheet aesthetic, inset frame, registration marks + ruler strips, paper
ground, charcoal line-art with one orange signal, mono key/value metadata blocks (title-block
pattern), bold grotesk caps headlines, numbered process lists (001–010), dashed separators,
significant negative space, no full-width dark sections, radius 0.

The same reading of the current Madarek production landing confirmed the defect: it reads
as an **editorial poster** (giant display type + heavy 3D sculpture + orbit decorations +
competing CTA colors), NOT a drawing sheet. This is the R304 composition, still live.

---

## 2. The defect census (what still speaks OPTIKKA at `main @ d9f74004`)

### 2.1 The landing page IS the R304 poster (root defect)

`frontend/src/pages/LandingPage.tsx` (783 L) + `frontend/src/styles/landing.css` (1,772 L) +
`frontend/src/components/landing/` implement «ملصق مدارك» — the OPTIKKA editorial
reconstruction. The R305 release re-keyed the tokens but left this composition intact, so
the product's front door contradicts its canon. Concrete poster devices still live:

- **The persistent 3D world** — `MadarekWorld.tsx` + `lib/scroll-conductor.ts` +
  `lib/landing-story/*` (choreography, story-dom, ribbon-bridge, chapters) +
  `components/landing/world/` (the procedural «MERIDIAN» knowledge ribbon, three.js):
  a fixed WebGL canvas behind the whole page, GSAP-scrubbed camera chapters (`data-cam`),
  copper emissive peaks.
- **The editorial chapter system** — `data-cam`/`data-story-*` hooks, alternating
  split/bleed/offset spreads, the dotted drafting grid hero, the paper-veil radial masks.
- **THE COPPER CLIMAX** — `.lv-slab` inverted ledger (`--neutral-900` ground) with the
  `--poster-signal: var(--c-copper-ink)` re-point.
- **The `--poster-*` divergence namespace** — declared in `tokens.css` (3 aliases) +
  `unified-parity.css` (3 mirrors), consumed 73× in `landing.css`, 5× in `MadarekWorld.tsx`,
  pinned 3× in `scripts/verify-parity-export.mjs`.
- **The giant footer wordmark rush** (`useScrollStage --sp` device).

### 2.2 The gold/copper semantic inversion

`--c-copper-*` is (per the R305 canon) the documented **ember/orange alias seat** — but
several **achievement-gold consumers** still ride it, painting gold semantics in the
orange signal:

- `.badge.brand, .badge.gold` share one copper recipe (`components.css`) → GRADED research
  status, WATCH risk chips, OFFERING scope chips render as brand orange, though the canon
  holds `--gold #B57438` / `--gold-ink #8F5A28` as a deliberately separate role.
- `.feed-item-avatar.gold` — same inversion.
- `.pdf-textLayer ::selection` + default `.avatar` + `.ledger.zone-copper` — brand uses
  that reach the accent through the copper back-door instead of the `--accent-*` semantic
  aliases (intent-obscuring, though visually the accent seat).

### 2.3 Active instruction debt

- `DESIGN.md` R305 banner declares the Heron canon but the body keeps R196/R197/R198 era
  banners describing OPTIKKA as "the current direction" for the homepage + historical
  sections that still read as active instructions (§1a «مدار المعرفة», §1b "ultramarine
  on warm paper" product theme headers).
- Test contracts encode the poster: `landing-poster-refinement.test.ts` (the full r304
  geometry: world layer, drafting grid, copper slab, bleed geometry), `assets.test.ts`
  (pins `MadarekWorld` as the hero's one graphic object), `landing-scrollspy-grain.test.ts`
  header ("the OPTIKKA-direction poster").

### 2.4 What is NOT defective (verified, keep)

- The R305 token keys, parity export (191/191), radius/motion ladders, status triads,
  role accents, print lock — the whole `tokens.css` contract ships green.
- The r305-*.css family sheets + their heron test belts (student/teacher-quality/
  research-pdf-ai/admin-owner/shell) — the app families already speak Heron.
- The funnel/a11y/truth contracts: `landing-funnel.test.tsx` (register/login split),
  r188 brand-integrity strings, r168b banned wording, r177 brand neutrality.
- Architecture: React 18 + Vite + Express + Prisma + npm workspaces + Render — untouched.

---

## 3. The R306 design decision — «لوحة مدارك» (the Madarek drawing sheet)

The landing page is recomposed as an **architect's drawing sheet** in the measured Heron
grammar — original Madarek educational artwork, Arabic-first, RTL-native. Not a repaint:
the poster composition (3D world, editorial spreads, copper climax, giant wordmark) is
retired; a new sheet composition takes its place.

### 3.1 Composition (the section plan)

| # | Section (id) | Heron pattern consumed | Madarek content |
|---|---|---|---|
| 0 | sheet frame | the inset canvas frame + `+` registration marks + ruler strips | a fixed hairline frame with corner marks + mono coordinates; decorative, `pointer-events: none`, desktop only (≤991 dropped, like the reference) |
| 1 | header | 56 px bar, full-width bottom hairline, mono nav, charcoal hover-cell wash | existing header contract (skip link, theme toggle, funnel CTAs) restyled to the bar grammar |
| 2 | hero (`#hero`) | hero = line-art object + bottom band (h1 + paragraph + mono link) | mono eyebrow `[01]`, Arabic display headline, sub, ONE charcoal-slab CTA + hairline ghost, **the Madarek blueprint illustration** (§3.2), mono metadata row (bracketed counts) |
| 3 | statement (`#statement`) | problem section: mono eyebrow → giant statement → support paragraph | «منصّة واحدة تخدم الرحلة كلّها» + the three role lines |
| 4 | chapters (`#chapters`) | use-case accordion rows: numbered rows, hairline/dashed separators | the six capabilities as hairline ledger rows; the existing honest `Mini` fragments restyled **flat** (hairline frame, no elevation, no chrome dots) |
| 5 | live (`#live`) | the pricing hairline TABLE | the honest capability ledger as a hairline matrix — numbered rows + checks + bracketed count; **no inverted slab** |
| 6 | roles (`#roles`) | accordion/index rows | the five roles as index rows (role → line) |
| 7 | colleges (`#colleges`) | resources grid + title-block metadata | the interactive 25-college registry (chips + panel preserved), ghost numeral → mono title-block metadata |
| 8 | vision (`#vision`) | statement + mono tags | the honest status pairs with live/sim/soon mono state tags |
| 9 | cta (`#cta`) | coordinates row → caps h2 → charcoal btn-fill | «جاهزٌ لبدء رحلتك؟» + charcoal slab + ghost |
| 10 | footer | 3/4-col hairline footer, mono links, copyright row | existing link columns; the giant wordmark retired |

### 3.2 The hero illustration — «مخطط مدارك» (original artwork)

A **flat SVG technical sectional drawing** of the learning system as a drafted structure —
original Madarek artwork, no reference assets: lecture halls (المحاضرات), a checkpoint
marker (نقطة الفحص), the exam gate (الاختبار), the research library wing (المكتبة والبحوث),
and the mastery tower (الإتقان) — drawn in 1 px charcoal hairlines with dashed construction
lines and ONE orange signal annotation, in the reference's pencil-sketch register.

**Interaction contract (accessible, honest):**
- Five numbered hotspots `[01]–[05]` — real `<button>`s, keyboard-operable, `aria-pressed`,
  focus-visible rings, 44 px targets, announced through a polite live region.
- Selecting a hotspot explains that stage of the workflow in a details panel
  (title-block style) — same information with or without pointer.
- Pointer hover (fine pointers only) adds the orange multiply wash + corner `+` marks —
  the reference's hover garnish, guarded.
- No dead hotspots, no fake features — the five stages are the documented live capabilities.
- Pure CSS/SVG — no WebGL, no canvas, no new dependency. Failure mode = static drawing +
  the full list (nothing hidden behind the interaction).

### 3.3 What carries forward unchanged (the non-negotiables)

- The funnel: 5 register CTAs → `/auth/register`, 5 login affordances → `/auth`
  (`landing-funnel.test.tsx`).
- Signed-in redirect defense, skip link, RTL, theme toggle, `.scrolled` imperative header,
  `--p` progress ribbon (transform-based), RevealCssClass block reveals, hover guards,
  the RM belt, one dark block.
- All honest numbers computed from data (`colleges.length`, `LIVE_COUNT`, …) and the r188
  integrity strings («جامعة مدارك التجريبية», «اصطناعية بالكامل» contiguous).
- Section ids `chapters/live/roles/colleges` (nav anchors keep resolving).

### 3.4 The token/namespace cleanup

| Item | Action |
|---|---|
| `--poster-paper/ink/signal` (tokens.css, unified-parity.css) | **delete** after the landing migration (consumers → canonical `--bg/--text/--accent-*`) |
| `landing.css` `--poster-*` consumers (73) | migrate to canonical semantic tokens |
| `verify-parity-export.mjs` poster pins (3) | remove in the same change |
| `MadarekWorld.tsx` + `lib/landing-story/*` + `lib/scroll-conductor.ts` + `hooks/useScrollStage.ts` | **delete** (single-consumer, landing-only — audited) |
| `components/landing/world/` | **delete** with the world |
| `three` + `@types/three` + `gsap` deps | **remove** from `frontend/package.json` (only consumers deleted; tests import none) — three.module chunk (171.9 KB gz) leaves the bundle; pin re-baselined with the documented reason |
| `.badge.gold`, `.feed-item-avatar.gold` | migrate to the true gold role (`--gold-soft`/`--gold-ink`) — gold stops masquerading as orange |
| `.pdf-textLayer ::selection`, `.avatar`, `.ledger.zone-copper` | re-route to `--accent-*` semantic aliases (same rendered seat, clear intent) |
| `--c-copper-*` tokens | **keep** as the documented ember/orange compat seat (R305 canon decision) |

### 3.5 The gate hardening (design-drift)

The raw-css/parity gates stay the authority. Additions in the same change:

- `verify-parity-export.mjs`: poster spellings join the FORBIDDEN needle list
  (scoped to the export pair + active stylesheets, not docs/history).
- The new landing contract test pins: no `--poster-*`, no `data-cam`, no world layer,
  no `three` import in the landing chunk; hairline ledger/table grammar present;
  hotspot a11y present; the funnel intact.

### 3.6 Test plan (rewrite, don't weaken)

| Test | Disposition |
|---|---|
| `landing-poster-refinement.test.ts` | **retire** (pins r304 geometry) → replaced by `r306-landing-sheet.test.ts` (the new contract: sheet frame, ledger rows, hotspot semantics, hygiene) |
| `assets.test.ts` MadarekWorld pin | rewrite to pin the SVG blueprint + registry import (raster ban keeps) |
| `landing-scrollspy-grain.test.ts` | keep the retired-vocabulary + chrome pins; retitle the r198 header prose (OPTIKKA no longer "ships") |
| `landing-funnel.test.tsx` | unchanged target — the new page must satisfy it verbatim |
| `guest-landing.e2e.ts` | selectors `.fo-hero-title`/`.fo-header-actions` kept by design; copy assertions verified |
| bundle-size pin | total ceiling re-baselined down after the three.module removal (documented) |
| everything else | green at baseline, must stay green |

### 3.7 Documentation

- `DESIGN.md` — rewritten as the clean Heron-only canon (single active authority); era
  banners move to `docs/archive/DESIGN-history.md` (clearly historical).
- `AGENTS.md` §design — the canon paragraph re-points to R306 (Heron-only, landing
  included).
- `CHANGELOG.md` — honest R306 entry.

---

## 4. Prioritized repair matrix

| # | Severity | Repair | Owner | Verification |
|---|---|---|---|---|
| P0 | release-blocking | Rebuild `LandingPage.tsx` + `landing.css` as the drawing sheet (§3.1) | integration owner (principal) | new unit contract + e2e + browser captures × viewports × themes |
| P0 | release-blocking | Delete the 3D world stack + `--poster-*` namespace + deps (§3.4) | integration owner | grep census zero (active scope), bundle −171.9 KB gz, gates green |
| P0 | release-blocking | Rewrite the landing test belt (§3.6) | integration owner | full suite green |
| P1 | high | Gold/copper semantic repair (§2.2) | integration owner | contrast ledger + badge/avatar renders |
| P1 | high | DESIGN.md canon rewrite + AGENTS.md + CHANGELOG + this spec | integration owner | doc review |
| P2 | medium | Gate hardening: FORBIDDEN poster needles (§3.5) | integration owner | gate self-test |
| P2 | medium | Browser acceptance sweep (§viewports × themes, landing + family spot-checks) | reviewer agents | screenshot evidence set |
| P3 | low | Full CI belt on the PR head; production deploy verify; branch cleanup; final report | integration owner | CI green + health buildId = release SHA |

---

## 5. Open uncertainties (honest gaps)

1. **Render deployment latency** — Render free-tier deploys queue; the production verify
   step must poll the health endpoint's `buildId`, and the mission reports `MERGED —
   DEPLOYMENT NOT VERIFIED` if the queue outlives the session (documented, not faked).
2. **Render build environment parity** — the deploy runs the root `npm run build`
   (with `db:deploy`/`db:seed` against the production `DATABASE_URL`); the R306 diff
   touches no backend/prisma surface, so the deploy path is unchanged — but the production
   build itself executes on Render, outside this environment's control.
3. **The `.fo-*` class vocabulary** — kept where the tests/contracts pin it
   (`.fo-header`, `.fo-hero-title`, `.fo-progress-bar`); new sheet classes get their own
   vocabulary (`sheet-*`). Renaming everything would churn contracts for no behavioral gain.
