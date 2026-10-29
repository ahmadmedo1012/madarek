# R323 §A1 — BRAND AUDIT (grep-driven, pre-integration)

> Scope: every site that renders a Madarek logo / brand mark / brand asset,
> enumerated by grep over `frontend/src`, `frontend/public`, `frontend/index.html`,
> `backend`, `scripts`, `README*`. Method: literal greps for
> `StarMark`, `BrandMark`, `madarek-mark`, `madarek-og`, `favicon`, `icon-180|192|512`,
> `manifest.webmanifest`, `WORDMARK_SHEET`, `FooterMarkArt`, `WordmarkArt`,
> `ElevationDrawing`, `B57438`, `E9B44C`.
> Line numbers verified against the tree at audit time (pre-integration HEAD).

## 0. The competing variants (the «3+ logos» defect)

| # | Variant | Geometry | Colour voice | Where it lives |
|---|---------|----------|--------------|----------------|
| V-α | **StarMark khatam** (r188) | 64-grid, two congruent 30u squares rotated 45°, round joins, strokeWidth 4, solid core diamond + gold NE point | `var(--accent)` strokes + `var(--gold)` point (copper/gold ramp) | `frontend/src/components/StarMark.tsx` (component), favicon + madarek-mark.svg derive from it |
| V-β | **Copper→gold gradient star** | same khatam idea as V-α but with a `linearGradient #B57438→#E9B44C` | copper/gold gradient | `frontend/public/brand/madarek-mark.svg`, `frontend/public/favicon.svg`, rendered by `BrandMark.tsx` (`<img>`) |
| V-γ | **Footer ink square-star + outlined wordmark** | 230-grid construction drawing: hairline circles + crosshairs, two ink squares (miter joins, w5), accent beacon square on the NE circle; separate full-cell outlined «مدارك» path (Alexandria 700, 10-kashida sheet) | ink `var(--text)` + `var(--accent)` beacon; wordmark stroke-only `currentColor` | `frontend/src/components/landing/FooterArt.tsx` + `frontend/src/components/landing/footer/wordmark-art.generated.ts` |
| V-δ | **Loader line-drawn plate** | the elevation «entrance» construction (staged ink-in of the learning-building drawing) + text-only identity block | ink hairlines, mono meta | `frontend/src/components/landing/SheetLoader.tsx` (renders `ElevationDrawing variant="entrance"`) |
| V-ε | **EdgeTab white 4-point star** | 24-grid 4-pointed star path, round joins, w1.5, white stroke on orange square | `var(--accent-fg)` on `--accent` | `frontend/src/components/landing/chrome/EdgeTab.tsx` (inline svg, does NOT import StarMark) |
| V-ζ | **Boot plate text wordmark** | plain `system-ui` 700 text «مدارك» on paper | literal `#F6F6EE`/`#282828` | `frontend/index.html` `.mdrk-boot-plate` |

Verdict: **six** coexisting identities, three colour systems (orange+gold, copper gradient,
ink+accent), two join grammars (round vs miter). This audit is the shrink list; the R323
system (frontend/src/brand `Logo`, 32-grid hairline khatam + orange point) is the single
replacement. Call-site swaps belong to the foreman's integration pass — this task owns the
system + assets + frozen gates only.

## 1. Live render sites (file:line, pre-integration)

### 1.1 Product chrome
| Site | file:line | Renders | Variant |
|---|---|---|---|
| HydrationSplash | `frontend/src/components/HydrationSplash.tsx:1,13` | `<BrandMark size={48}/>` → `<img src="/brand/madarek-mark.svg">` | V-β |
| Sidebar brand row | `frontend/src/components/layout/Sidebar.tsx:5,254` | `<BrandMark size={24}/>` next to text «مدارك / منصّة التعليم الذكي» | V-β |
| Landing header brand | `frontend/src/pages/LandingPage.tsx:7,781` | `<StarMark size={30} className="fo-brand-mark"/>` + «مدارك» | V-α |
| Landing footer brand | `frontend/src/pages/LandingPage.tsx:1455` | `<StarMark size={30}/>` + name + sub | V-α |
| Landing footer drawn mark | `frontend/src/pages/LandingPage.tsx:29,1558` | `<FooterMarkArt/>` — 230-grid ink khatam construction | V-γ |
| Landing footer wordmark | `frontend/src/pages/LandingPage.tsx:1599` | `<WordmarkArt/>` — full-cell outlined «مدارك» (kashida sheet) | V-γ |
| EdgeTab rail badge | `frontend/src/components/landing/chrome/EdgeTab.tsx:66-88` | inline 4-point star svg on orange square | V-ε |
| SheetLoader identity plate | `frontend/src/components/landing/SheetLoader.tsx:89-97,438` (+ `ElevationDrawing.tsx:597`) | staged line-drawn entrance sheet; meta block «مدارك — منصّة التعليم الذكي» at :462 | V-δ |
| Boot plate (pre-React) | `frontend/index.html:169-197` | `.mdrk-boot-plate` text wordmark | V-ζ |

V-ζ defect note (integration checklist): the boot plate sets
`letter-spacing: 0.02em` on the Arabic «مدارك» — Arabic is NEVER
letter-spaced (BRAND.md §do/don't); the swap to `<Logo>` must land at
`letter-spacing: 0` (or replace the text with the mark).

### 1.2 Auth / legal / campus / capability pages
| Site | file:line | Renders | Variant |
|---|---|---|---|
| AuthPage header | `frontend/src/pages/AuthPage.tsx:12,274` | `<StarMark size={14}/> مدارك` | V-α |
| ForgotPasswordPage | `frontend/src/pages/auth/ForgotPasswordPage.tsx:8,90` | `<StarMark size={14}/> مدارك` | V-α |
| ResetPasswordPage | `frontend/src/pages/auth/ResetPasswordPage.tsx:8,122` | `<StarMark size={14}/> مدارك` | V-α |
| LegalSheet | `frontend/src/pages/legal/LegalSheet.tsx:6,138` | `<StarMark size={22}/>` | V-α |
| CampusPages | `frontend/src/pages/campus/CampusPages.tsx:4,55` | `<StarMark size={22}/>` | V-α |
| CapabilityPages | `frontend/src/pages/capabilities/CapabilityPages.tsx:4,50` | `<StarMark size={22}/>` | V-α |

### 1.3 Primitives (do-not-modify this task)
| file:line | Note |
|---|---|
| `frontend/src/components/StarMark.tsx:15-46,54-81` | V-α primitive + `StarFigure` plate variant (round joins, gold point, halo) |
| `frontend/src/components/BrandMark.tsx:9-21` | V-β `<img>` wrapper for `/brand/madarek-mark.svg` |

### 1.4 Static brand assets (`frontend/public/`)
| file | Pre-integration state | R323 action |
|---|---|---|
| `frontend/public/favicon.svg` | V-β: copper→gold `linearGradient`, round joins, gold point | **regenerated**: ink hairline khatam + orange point, thicker 16 px ratios, no gradient |
| `frontend/public/brand/madarek-mark.svg` | V-β: same gradient star (64-grid) | **regenerated**: new 32-grid geometry, no gradient, no copper |
| `frontend/public/brand/icon-180.png` / `-192.png` / `-512.png` | rasterized from the gradient star (`scripts/r320/legal-icons.mjs`) | **regenerated** from the new favicon geometry (`scripts/r323/brand-assets.mjs`) |
| `frontend/public/brand/madarek-og.jpg` | 1280×698 folio sheet, khatam mark | **regenerated**: 1200×630 paper card, hairline frame, new lockup, one orange accent, tagline |
| `frontend/public/manifest.webmanifest` | icons → `/brand/icon-{192,512}.png`, theme/background `#F6F6EE` | **verified** — icon paths unchanged, paper theme already matches the new system |
| `frontend/public/brand/mark.svg`, `wordmark.svg`, `lockup.svg`, `lockup-stacked.svg` | did not exist | **created** — static twins of the component geometry (og/pdf/e-mail) |

### 1.5 Head / meta (`frontend/index.html`)
| Line | What | Note |
|---|---|---|
| :22 | `<link rel="icon" href="/favicon.svg">` | path unchanged by R323 |
| :29-30 | manifest + `apple-touch-icon` 180 | unchanged |
| :31-32 | `theme-color` `#282828`/`#F6F6EE` | already the ink/paper pair — valid in the new system |
| :47,:55 | `og:image`/`twitter:image` → `madarek-og.jpg` | file regenerated in place |
| :48-49 | `og:image:width/height` `1280`/`698` | **stale after R323** (new card is 1200×630) — foreman integration updates (index.html is outside A1 ownership) |
| :68 | schema.org `logo` → `/brand/madarek-mark.svg` | filename kept, geometry replaced |

### 1.6 CSS / seed / tests that pin the OLD brand (integration checklist)
| file:line | Pin |
|---|---|
| `frontend/src/styles/student.css:154` | comment: square poster `/brand/madarek-mark.svg` viewBox 64×64 → new file is 32-grid; comment refresh at integration |
| `backend/prisma/seed.ts:1050,1066` | `posterUrl: '/brand/madarek-mark.svg'` — path kept valid |
| `backend/src/lib/curriculum-logic.test.ts:143` | `isSanctionedMediaUrl('/brand/madarek-mark.svg')` — path kept valid |
| `frontend/tests/unit/r177-brand-neutrality.test.ts:236-249` | **expects the favicon to contain `#B57438`/`#E9B44C`** — inverts after R323; foreman re-pins to the new palette at integration |
| `frontend/tests/unit/assets.test.ts:188-192` | requires `madarek-og.jpg` + `madarek-mark.svg` to exist — satisfied (names kept) |
| `frontend/tests/unit/legal-pages.test.tsx:573,641` | apple-touch-icon 180 + schema.org logo path — satisfied (names kept) |
| `frontend/tests/e2e/lecture-poster-geometry.e2e.ts:30,41` | poster geometry fixture — new mark stays square (32×32) so the pin holds |
| `scripts/r320/legal-icons.mjs` | old icon generator (superseded by `scripts/r323/brand-assets.mjs`; left intact for provenance) |
| `frontend/src/vite-env.d.ts:26` | comment only |

## 2. Copper/gold census (`#B57438`, `#E9B44C`) — what remains after A1 and why

A1 regenerates every **brand** occurrence (favicon + madarek-mark). The survivors are
non-brand seats owned by other work packages; they are frozen, with reasons, in the
R323-PENDING allowlist inside `frontend/tests/unit/r323-brand-system.test.ts` (gate a):

| file:line | Kind | Owner / reason |
|---|---|---|
| `frontend/src/styles/tokens.css:685,1236` | live `--gold: #B57438` (achievements token, light+dark) | A5 design-system pass (achievement colour, not brand) |
| `frontend/src/styles/unified-parity.css:476` | live `--gold` parity mirror (value-pinned by verify-parity-export) | moves with the tokens |
| `frontend/src/components/pdf/AnnotationsPanel.tsx:50` | live user-facing PDF annotation ink swatch «نحاسي» | product feature colour, not logo |
| `frontend/src/styles/tokens.css:79,681`, `components.css:206,208,322`, `base.css:93`, `polish.css:294`, `frontend/src/pages/owner/OwnerContentPage.tsx:59` | historical comments only | copy edits at integration |
| `frontend/src/components/landing/footer/wordmark-art.generated.ts` | **none** (0 hexes — verified; the footer wordmark is stroke-only `currentColor`) | no allowlist entry needed |

`frontend/public/` + `frontend/index.html` are copper-clean after A1 (verified by gate a).

## 3. Frozen import graph (gate b)

Files still allowed to `import StarMark` / `BrandMark` (the future `<Logo>` call-sites;
the list lives frozen in the test and must shrink to zero at integration):

`HydrationSplash.tsx`, `EdgeTab.tsx`*, `Sidebar.tsx`, `AuthPage.tsx`, `LandingPage.tsx`,
`ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`, `CampusPages.tsx`, `CapabilityPages.tsx`,
`LegalSheet.tsx` — `frontend/src/styles/student.css` refs excluded per brief.

\* EdgeTab currently draws its own inline star (V-ε) without importing the primitive; it
is listed because its badge is a brand render site the integration pass must swap.

Actual importers at audit time: CampusPages, AuthPage, LegalSheet, CapabilityPages,
ForgotPasswordPage, ResetPasswordPage, LandingPage (StarMark) + HydrationSplash, Sidebar
(BrandMark). Gate b asserts actual ⊆ frozen, so the graph can only shrink.
