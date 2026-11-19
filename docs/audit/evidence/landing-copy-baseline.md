# Landing copy baseline — R368 T8-a (PINNED)

**Date:** 2026-11-19 · **Branch:** `wip/r368-t8` (base `76de5a8c`, from `exec/r368-fidelity-v2`)
**Measured by:** `node scripts/gates/landing-copy-baseline.mjs` (committed with this artifact)
**Closes:** checklist gap A7 (`specs/013-heron-fidelity/checklists/analyze-r368-continuation.md`) — spec
`docs/specs/heron-fidelity.md` acceptance 7 needs "landing copy … at least 20 % below the committed
baseline"; until now no landing-only baseline artifact existed.

## The pinned numbers

| measure | value |
|---|---|
| **Total Arabic visible words (THE PINNED BASELINE)** | **1 398** |
| **−20 % target (max allowed after reduction)** | **≤ 1 118** |
| **Minimum words to remove** | **≥ 280** |
| Arithmetic | `floor(1398 × 0.8) = 1118` · `1398 − 1118 = 280` |
| Reported alongside (NOT in the total) | latin visible 1 239 · aria(ar) 189 · mounted-only view 1 349 |

THIS IS THE PRE-REDUCTION MEASUREMENT. No copy reduction has been claimed or applied on the
landing sources by any prior wave (evidence below); the first −20 % claim will be measured
against the 1 398 / ≤ 1 118 pair pinned here.

## Per-file counts

Sorted as the script walks the surface (role · file · Arabic visible · latin · aria(ar) · mounted):

| role | file | ar-visible | latin | aria(ar) | mounted |
|---|---|---:|---:|---:|---|
| landing-page | `pages/LandingPage.tsx` | 3 | 54 | 0 | yes |
| landing-component | `components/landing/ElevationDrawing.tsx` | 13 | 31 | 42 | yes |
| landing-component | `components/landing/HeroInkWindow.tsx` | 0 | 5 | 27 | yes |
| landing-component | `components/landing/LearningPlanDrawing.tsx` | 11 | 468 | 48 | yes |
| landing-component | `components/landing/PainArt.tsx` | 0 | 2 | 0 | yes |
| landing-component | `components/landing/SheetLoader.tsx` | 49 | 66 | 3 | **NO (retired)** |
| landing-component | `components/landing/WhyScene.tsx` | 63 | 115 | 6 | yes |
| landing-component | `components/landing/chrome/ConsentBanner.tsx` | 9 | 31 | 4 | yes |
| landing-component | `components/landing/chrome/Preloader.tsx` | 3 | 14 | 3 | yes |
| landing-component | `components/landing/chrome/SheetNav.tsx` | 12 | 23 | 6 | yes |
| landing-component | `components/landing/cursor/HeroInspect.tsx` | 51 | 121 | 0 | yes |
| landing-component | `components/landing/cursor/SheetCursor.tsx` | 0 | 51 | 0 | yes |
| landing-component | `components/landing/hero/Hero.tsx` | 21 | 0 | 4 | yes |
| landing-component | `components/landing/hero/HeroPlate.tsx` | 16 | 0 | 0 | yes |
| landing-component | `components/landing/journey/JourneyScene.tsx` | 178 | 70 | 0 | yes |
| landing-component | `components/landing/journey/WordReveal.tsx` | 0 | 9 | 0 | yes |
| landing-component | `components/landing/patterns/*.tsx` (7 files) | 0 | 12 | 0 | yes |
| landing-component | `components/landing/sections/Chapters.tsx` | 0 | 0 | 0 | yes |
| landing-component | `components/landing/sections/Concepts.tsx` | 212 | 26 | 8 | yes |
| landing-component | `components/landing/sections/Footer.tsx` | 103 | 71 | 18 | yes |
| landing-component | `components/landing/sections/Hero.tsx` | 0 | 1 | 0 | yes |
| landing-component | `components/landing/sections/Live.tsx` | 86 | 4 | 2 | yes |
| landing-component | `components/landing/sections/Product.tsx` | 118 | 40 | 0 | yes |
| landing-component | `components/landing/sections/Roles.tsx` | 137 | 9 | 0 | yes |
| landing-component | `components/landing/sections/Statement.tsx` | 99 | 5 | 4 | yes |
| landing-component | `components/landing/sections/Vision.tsx` | 39 | 5 | 14 | yes |
| landing-component | `components/landing/sections/Why.tsx` | 36 | 0 | 0 | yes |
| copy-module | `components/landing/copy.ts` | 25 | 5 | 0 | yes |
| landing-ledger | `data/landing-ledger.ts` | 78 | 1 | 0 | yes |
| colleges-config | `data/colleges.config.ts` (first 14 `nameAr` only) | 36 | 0 | 0 | yes |
| css-content-strings | `styles/landing/**.css` `content:` strings | 0 | 0 | — | yes |

Top concentration (mounted): Concepts 212 · JourneyScene 178 · Roles 137 · Footer 103 ·
Statement 99 · Live 86 · Product 118 · HeroInspect 51 · WhyScene 63 · landing-ledger 78.

## The inclusion law (as enforced by the script)

1. `frontend/src/pages/LandingPage.tsx` — full scan.
2. `frontend/src/components/landing/**` — every `.tsx` file (recursive, sorted).
3. `frontend/src/components/landing/copy.ts` — the landing shared-copy module. **The task brief
   names `frontend/src/data/copy.ts`; that path does not exist in this tree** — the module
   lives at `components/landing/copy.ts` (a `.ts` file, not matched by rule 2's `.tsx` glob),
   so it is included explicitly.
4. `frontend/src/data/landing-ledger.ts` — full scan.
5. `frontend/src/data/colleges.config.ts` — **landing-consumed strings only**: the landing
   (`components/landing/sections/Vision.tsx`) renders exactly
   `colleges.slice(0, 14).map(c => c.nameAr)` in the registry cloud, so the **first 14
   `nameAr` literals in file order** are counted (36 words). Everything else in the file
   (`nameEn`, `slug`, `accent`, `icon`, `cityAr`) is machine data or renders only as a count
   (`new Set(cityAr).size` → 3, `colleges.length` → 25) and is EXCLUDED.
6. `frontend/src/styles/landing` — every `.css` under it (recursive), `content:` string
   declarations only: 23 declarations across 27 files scanned, **0 Arabic words** (all are
   `''` or `'+'`).

## The counting law

The lexer is copied **verbatim** from `scripts/gates/copy-budget.mjs` (the repo's
copy-counting law since R353; the R366 style-mode harvest is the only part not carried
over — it does not affect counts). Visible total = `props + plain + jsx` buckets;
`aria` (aria-label & friends) is reported alongside but NOT in the total — the same split
the global copy-budget gate uses. Arabic word = whitespace token containing any char in
U+0600-06FF, 0750-077F, 08A0-08FF, FB50-FDFF, FE70-FEFF. Determinism: two consecutive runs
produce byte-identical stdout and byte-identical JSON (verified on this tree; no dates, no
timestamps, sorted file order).

## Evidence — the R366 diet did NOT touch landing sources (A7 precondition)

The checklist's precondition for pinning a fresh baseline (not a post-diet remeasure) is
that the R366 copy diet left the landing sources alone. Verified on this tree:

1. **The R366 web copy diet** — `3a0d881a feat(r366): L4 public copy diet — 2261→1671
   Arabic words (−26.1%)` — touched exactly 10 `frontend/` files, all under
   `frontend/src/pages/` (AppDownloadPage, PublicPages, capabilities/, colleges/,
   community/, competitions/, legal/, student/TrainingPages, vision/). **Zero files** in
   `pages/LandingPage.tsx`, `components/landing/`, `data/landing-ledger.ts`,
   `data/colleges.config.ts` (`git show --name-only 3a0d881a`).
2. **The R366 mobile diet batches** (`6977187e`, `ba4eb738`, `d95e38b6`, `21d9f0dd`,
   `8ef18b58`, `58d3f6f3`, `63f17ad2`, `0af5d7bf`, `7fa85f4a` — batches 1–17) each touch
   **0 files** under `frontend/` (apps/mobile only).
3. **R366-tagged commits that DID touch landing files** are the L1/L3 conformance lanes
   (`85558dc5` hero measured-seat rebuild, `81dca582` session-2 honest conversions,
   `7b304f04`, `b91a257e`, `a6761f09`, and the `r366-final` integration trio
   `53f21459`/`e0febc28`/`758a22f5`) — geometry/conformance work, not copy reduction. The
   single Arabic-text delta any of them makes on a landing file is `e0febc28`'s
   Arabic-Indic digit normalization in `HeroPlate.tsx` (`٠١` → `01`) — **word-count
   neutral** (digit-only tokens count as neither Arabic nor Latin words under the lexer
   law).

Conclusion: the 1 398-word measurement above is a true pre-reduction baseline; any landing
copy reduction claimed after R368 T8-bis happens against THIS artifact.

## Known caveats (visible, not absorbed)

- **`SheetLoader.tsx` (49 ar-words) is retired-from-mount** (R333 P-D; kept for rollback).
  The brief's "all .tsx" law counts it, so it is IN the pinned 1 398. The mounted-only view
  is 1 349. A reduction claim that "cuts" SheetLoader strings would reduce the number
  without changing any rendered word — the reduction proposal explicitly does NOT claim it.
- **`data/landing-ledger.ts` is counted whole** (78 ar-words) per the brief's unqualified
  file list, but only `HERO_WORK_ITEMS` (11 words) + `LIVE_COUNT` (a number) render on the
  landing itself; `LIVE_CAPABILITIES` (35 words) and `VISION_STATUS` (32 words) render on
  `/capabilities` (which has its own copy-budget ceiling, 50 words —
  `docs/QA/copy-budget.json`). Cutting those strings would move BOTH pages.
- **Arabic copy that renders on the landing but lives OUTSIDE the brief's surface** is not
  counted: `data/product-media.ts` (titleAr/captionAr/altAr via `WhyScene` — also consumed
  by other pages), `components/illustrations/interactive/ConceptField.tsx` +
  `RouteSurvey.tsx` (station names via `Concepts`). Recorded so the lead can see the
  boundary; the brief's file list is authoritative for the pinned number.
- **latinVisible (1 239) is reported for parity only and is noisy**: the R353 lexer counts
  CSS-in-JS template statics (e.g. `LearningPlanDrawing`'s `PLAN_INK_CSS`) and SVG path
  fragments as "latin words". It is not used by any target.
- `aria(ar)` = 189 across the surface — accessibility names are preservation-protected
  (never reduction targets) and are excluded from the pinned total, per the copy-budget law.

## Reproduction

```bash
node scripts/gates/landing-copy-baseline.mjs            # human table
node scripts/gates/landing-copy-baseline.mjs --json     # the JSON payload
node scripts/gates/landing-copy-baseline.mjs --write    # re-write this artifact's .json twin
```

Machine-readable twin: `docs/audit/evidence/landing-copy-baseline.json` (committed;
byte-identical on re-run against the same tree).
