# Madarek Design System

> **مدارك** — منصّة تعليم ذكي مستقلّة عربية-أولًا · the design canon as it ships in code.

> **R305 — THE HERON FOUNDATION (CURRENT CANON — supersedes the OPTIKKA/Superlist/Notion/ultramarine directions below; the era banners that follow remain as history)**: the visual system re-keys to the Heron AI reference (reverse-engineered LIVE at heronaiapp.com — every value measured from the DOM/computed styles + the 244 KB Webflow CSS bundle, never from screenshots alone; full evidence, effect sheets and licensing decisions in [`docs/redesign/r305-heron-reference-spec.md`](docs/redesign/r305-heron-reference-spec.md)). **Neutrals:** light page ground `#F6F8FA` (blueprint paper; the reference paints `#FAFAFA`/`#fff` — same family, every ratio verified on both), surface `#FFFFFF`, charcoal ink `#282828` (the reference's own `--content--primary`, 13.85:1 paper AAA); dark theme = the charcoal itself as ground `#282828` with cool raised surfaces and the paper twin `#F6F8FA` as ink. **Signal:** the vivid orange `#FA3600` (the reference's `--content--brand`) — raw orange is a LARGE-TEXT/UI tone (3.53:1 paper); TEXT routes through `--accent-ink #C72E00` (5.16 ground / 5.50 surface, binary-searched with margin), labels ON orange fills stay `--warm-ink` (4.69:1 — white 3.76 is banned), links carry the ink tier. Coral `#F15534` = the warm secondary (danger rhymes with it; `--c-coral-*` alias namespace added). **Technical greys straight from the bundle:** `#B4B4B0` grid/disable (dark TEXT tier at 7.09:1 — the redeemed grey), `#B3B3AF` hairlines (decorative on light, exposed as `--grid-line`), `#72726F`/`#626260`/`#414140` mid steps. **Squared corners:** radius ladder 2/4/6/8/12/16/20 + pill (the reference renders radius 0 everywhere; Madarek keeps hairline-crisp rungs). **Motion:** the measured register — 0.4s-dominant (×174 in the bundle) on `cubic-bezier(.23,1,.32,1)`, the `.48s` roll/exit curve `cubic-bezier(.625,.05,0,1)` → raw ladder 80/200/400/500/650/900, semantic page 400 / reveal 480; springs + the press register untouched. **Fonts:** BT Grotesk is PROPRIETARY and NOT reused — the shipped OFL faces carry the voice (Alexandria display / Plex Sans Arabic body / Plex Mono micro-labels); the reference's Geist Mono is OFL but adds no gain over Plex Mono (decision in the spec §fonts); zero letter-spacing on Arabic holds (the reference's −0.02em is a Latin-only device and stays banned). **The parity gate was RED at the r305 baseline (76/190** — r303/r304 re-keyed tokens without re-pinning) and is repaired in the same change: export pair re-distilled + every pin rewritten → **191/191 PASS**; the retired ultramarine/warm-paper/copper-era spellings joined the FORBIDDEN needle list (63 → 133); `#3d3d3d` legitimized as the night inset well (the r195 `#2a2a2a` precedent). **Circular economy:** the demoted copper hexes return as the ACHIEVEMENT GOLD pair (`#B57438`/`#8F5A28` light, `#E0A067`/`#F2B782` dark) — the old signal IS the new gold, distinct from the orange signal again. **Also re-keyed:** theme-color metas + `syncThemeColor` (dark `#282828` / light `#F6F8FA`) + the CSP bootstrap pin, `lib/theme.ts` CHROME_BG, `validate-college-identity` SURFACE_LIGHT, the role-accent table (quality retinted off the exact-3.00 floor; all 14 re-verified ≥3.0), status triads (computed, engine in the spec), elevation tints (charcoal-based), `--t-*` ladder. What did NOT change: token NAMES (zero renames — the full r304 alias layer survives verbatim), the type ladder as shipped, all 10 font faces, motion.css/base.css structure, component recipes, landing markup, AppShell, routes, backend contracts.

> **R191 «رحلة المعرفة»** (the current direction): R190 established the Turion-derived *tokens* (teal accent — light `#027380` · dark `#2FB6C6`, both AA-verified; was electric-violet until the r195 re-key; **Alexandria** display voice; near-square radius ladder 2–6px; the `--stage-*` void family; Plex Mono micro-labels). R191 adds what the operator actually demanded — the reference's **observed mechanics**: a scroll-choreography engine (`useScrollStage` — one rAF-coalesced `--sp` per stage, zero React renders per scroll tick; CSS calc derives every motion), a **pinned 700vh mega-stage** (radial knowledge map SVG + six crossfading narrative scenes + capability bar + scroll-bound rotation), a **pinned honest stat march** (numbers computed from the code), **parallax vision + quote + footer wordmark** layers, and the reference's measured **mobile/reduced-motion strategy** (no pinning — frames stack in flow, every scene readable). Copy gates: the operator-rejected wording («صُنعت في ليبيا», «ما يُشحن اليوم») is pinned OUT of every user-facing surface (`r168b`). Full measurements + mapping: `docs/design/r191-turion-fidelity-spec.md` · R190 analysis: `docs/design/r190-reference-matrix.md`.

> **R195 (egn.university re-key)**: the palette re-keys to the egn reference — light accent `#027380` / dark accent `#2FB6C6`, cool-gray ramps (light ground `#F7F7F7` · ink `#333333`; dark ground `#0A0A0A` · ink `#F2F2F2`); every violet/cream/indigo value quoted below is retired (pins + export pair re-synced in the same change).

> **R196 REDESIGN DIRECTION (locked — supersedes R190/R191/R195 reference choices for all future design work)**: the product enters a full visual redesign. **Homepage = OPTIKKA principles** (two-surface composition, chapter structure, scroll-driven state handover via sticky+IO+the existing rAF engine — never its assets, wording, colours, or heavy libs); **every other page = current Superlist principles** (single-signal hierarchy via surface steps, one-shadow-per-level, large-type sheets, flat framed product imagery — never its anti-patterns: no reduced-motion, UA-default focus, PNG heroes). **Turion Space, Evergreen Nexus University and the egn/teal «stage void» system are retired** — the r190/r191 reference mappings and the r195 egn re-key remain valid only as historical canon until re-keyed. Locked token TARGETS (contrast-verified, to be shipped by 1A): paper `#F3EEE4` / ground `#FBFAF7` / ink `#16140F` / ultramarine signal `#2E45E6` (AA 5.84–6.47 on light grounds; fills keep `#FFFFFF` labels at 6.75) / dark: paper `#16140F` · ground `#201D17` · ink `#F3EEE4` · signal-text `#8E9BFF` (7.26/6.63) / gold `#B57438` light-only decorative (3.29) with `#8F5A28` for AA text; dark gold `#D9A05B`; gold = achievements only; ultramarine = the only accent. Radius ladder 4/6/8/10/14/16/pill. Arabic type floor 13px, zero negative tracking, display lh 1.15–1.3, body 1.6–1.7. Tap targets ≥44px. Western digits everywhere (ar-LY latn, unchanged). Honest-copy gates (r168b/r177/r188) are permanent — «صُنعت في ليبيا» and «ما يُشحن اليوم» stay banned in all user-facing surfaces and identity copy. Binding plan, family ownership split, pinned-test risk table and per-prompt corrections: `docs/redesign/BLUEPRINT.md`.

> **R197 (1A SHIPPED — the §4 targets are now the live tokens)**: `tokens.css` re-keyed end-to-end and every gate re-pinned in the same change. **Palette live:** light paper `#F3EEE4` / ground `#FBFAF7` / ink `#16140F` (15.92/17.63 AAA) · muted `#6B675C` (5.41 ground) · faint `#726C5E` (5.00 ground, 4.28 on accent-soft — the r183 «<4.5» tripwire holds) · signal `#2E45E6` (5.84 paper / 6.47 ground; `--accent-ink` = the fill — AA as text) · dark paper `#16140F` / ground `#201D17` / ink `#F3EEE4` · signal fills stay `#2E45E6` with white labels (6.75), `--accent-strong`/`--accent-ink` = `#8E9BFF` (7.26) · gold `#B57438`/`#D9A05B` achievements only, `--gold-ink` `#8F5A28`/`#E3B273`. All ratios machine-verified (97 constraints: `scratch/palette-check.mjs` methodology, mirrored in the tokens comments). **Retired & deleted:** `--stage-*`, `--aura-*`, `--glow-*`, `--ln-*` (zero consumers), `--shell-aurora-azure`, the egn/teal accent family, `--r-3xl`, negative tracking (`--ls-tight/snug` = 0 — Arabic joins + tnum columns), multi-layer shadow recipes. Consumers re-pointed mechanically (landing.css ×130 → the `--poster-*` theme-reactive aliases / canonical tokens; KnowledgeMap, components.css glow, layout.css aurora). **Added:** the homepage poster namespace `--poster-paper/ink/signal` (stage-2 hook). **Radius ladder live:** 4/6/8/10/14/16/pill. **Type live:** scale 13/14/16/18/20/24/30/38/48/64 (display clamps cap at 64; h1 30; body 16), 13px Arabic floor (`--fs-xs`/`--fs-xxs` = 13), display lh 1.28/1.30, metric tracking 0. **Elevation:** one shadow per level (`--elev-2` = `0 10px 15px` ink/8%); dark = surface step + hairline, shadows de-emphasized. **Role accents retuned** (all ≥3.0 vs the paper, theme.test thresholds): student = the signal `#2E45E6`/`#8E9BFF`; faculty teal→green `#217A50`/`#6FCB93`; admin `#44546E`/`#8CA0C4`; owner `#6B7280` (a FORBIDDEN value) → warm gray `#5F5B52`/`#A89F8D`; dept-head/dean/quality keep their hue anchors. **Numerals (§7):** `formatNum` now emits the Western separator convention — comma grouping, dot decimal, Latin digits (`2,340` / `3.4`) — through the `ar-LY-u-nu-latn` chain; the ar-LY CLDR punctuation («2.340»/«3,40») read as 2.34/340 to the Libyan audience (the §11 measured defects). `formatInt`/`formatPct1` added; ~50 call sites migrated off direct `toLocaleString('ar-LY')`; the «61.818…%» root (ProgressBar's unrounded render) fixed at the primitive; dates stay ar-LY (Arabic month names, no ambiguity). **Typography bake-off (§5):** Champion A (incumbent Alexandria display + Plex Sans Arabic body + Plex Mono metrics) VERIFIED on real Madarek strings — joining, tashkeel stacks at 64/48px, 13px labels, mixed bidi, tabular Δ 0.00px; Readex Pro challenger not adopted (no decisive win, +60–90 KB). Zero font-file changes — the 14 @font-face + 2-preload pins hold. **Gate counts:** parity 190/190 (165 → 190 rows; the retired egn/teal/landing spellings are now FORBIDDEN needles); colleges 25/25 (`dentistry-maarifa` gained `accentAccessible #1F5F73` on the darker paper); bundle 635.8/650 KB gz; index.html theme-colors re-keyed + CSP bootstrap pin refreshed; audit surface baseline re-promoted (72 captures, clean under the CI drift profile).

> **R198 (STAGE 2 SHIPPED — the public homepage is the OPTIKKA-direction poster)**: `LandingPage.tsx` + `landing.css` + `components/landing/` rebuilt as «ملصق مدارك». **Chapter plan (BLUEPRINT §6, all code-verified):** poster hero (h1 «مدارك» at a fluid display allow `clamp(56px, 11vw, 96px)`, triad «تعلّم · أتقن · ابحث» with the signal on «أتقن», two CTAs, honest meta chips) → statement (student/teacher/admin, block-revealed) → numbered chapters 01–06 (الفصول المقلوبة / مصفوفة الإتقان / دورة البحوث / الاختبارات الإلكترونية / المجتمع والتدريب / الجودة والحاكمية), alternating split/bleed/offset layouts, each pairing the accent numeral (Western digits, bidi-isolated, mono) with an honest miniature composed from app tokens + demo data and captioned «عرض توضيحي» → «ما يعمل اليوم» honest ledger (the 6 capabilities) → 5-role strip → interactive 25-college constellation (chips + details panel replace the never-rendered CollegesPopover; accessible buttons, no floating popover) → vision status pairs → CTA → slide-up footer with the giant wordmark. **ONE graphic object:** `Constellation.tsx` — flat two-tone SVG generated from the real 25-college registry (3 campus rings, golden-spread deterministic layout, no text in the graphic). **Motion:** the rAF `useScrollStage --sp` engine only (hero drift + footer slide-up/wordmark rush) + IO block reveals; the 700vh pinned mega-stage, telemetry strip, preloader, canvas, video and every r191 choreography are retired. **Deleted:** `TestimonialSection.tsx` (dead since r188), `KnowledgeMap.tsx`, `OrbitPath.tsx`, and 20 raster assets (hero-scene*, orbit-ring*, vision-bg*, card-*, journey-*) — the page ships zero raster imagery; only `madarek-mark.svg` + `madarek-og.jpg` remain in `public/brand/`. **Dark theme = the inversion:** `[data-theme="dark"] .landing` re-points `--poster-signal` → `--accent-strong` #8E9BFF (7.26:1) for text/numerals/nodes — the stage-2 divergence the namespace was designed for; CTA fills stay #2E45E6 with white labels. **Gates re-pinned in the same change:** landing.css moved OUT of the raw-css census into full enforcement (zero raw spacing literals — the census path retired with its fixture); scrollspy/assets/r162/r170d pins rewritten to the poster contract; `landing.css` poster display sizes ship exactly two `type-gate: allow` records (hero + footer wordmark). **Numbers:** every homepage figure computes from data (`colleges.length`, campus count, `LIVE_COUNT`) or code-verified constants (11 tracks / 6 boards / 2 institutions) through `utils/numbers.ts` — Western digits, no CountUp, no invented adoption. **Measured:** 8.5 viewport-heights at 1440×900 desktop (the six-chapter content floor; the ≈5 aspiration and the old 15.8 both rejected), LCP 2.63s under slow-4G + 4× CPU at 390, homepage transfer ≈288 KB incl. fonts, bundle 635.0/650 KB gz. Signed-in users still never see the page (HomeRedirect + in-component defense-in-depth, re-verified).


> **R285 (SUPERLIST-ERA INTEGRATION SHIPPED — the redesign is the product)**: the family branches merged (`redesign/integration`, rounds r210–r285) and the OPTIKKA/Superlist direction is now the only system. **Shell & patterns:** the chrome re-skinned quiet (r211–r214: sidebar/topbar/bottom-nav — night smears, constellations, auras and mono labels retired; bottom-nav = 4 destinations + «المزيد» drawer; 44px rows) and the shared **patterns contract** (`components/patterns/` + `styles/patterns.css`, r210) carries the page grammar every family consumes — `PageFrame · PageHeader · SectionHeader · RowList/RowItem · SplitView · StatLine · FilterBar · TodayList` (the normative signatures live in `components/patterns/CONTRACT.md`). **Families recomposed on the contract** (r220–r269): student learning (TodayList-first dashboard, row-list courses, legible matrix + mobile concept list, video-first player), research & library (RowItem journey rail, search-first library, quiet reader + notes sheet), teacher/quality (grading queue with 44px «تصحيح», sticky tabular attendance ledger, quality oversight rows with severity edges — read-only badges everywhere), admin/owner (SplitView teachers, inline-expansion users/students, the 25× empty-card wall collapsed to an honest rollup, governance matrix groups), community/shared (community tabs on PageHeader, FilterBar indexes for competitions/colleges/training, quiet `.np-*` notification rows, focused assistant surface). **Illustration kit (mk-ill, r270–r280):** 16 original two-colour SVG pieces (ink `--ill-stroke` + signal, one tint max, dotted-ghost vocabulary, gold in `achievement` only, direction-neutral for RTL, lazy one-chunk-per-piece ≈0.5 KB gz each) + **BrandLoader** (the accessible loading mark); wired per its §5 mapping — EmptyState/ErrorState carry the kit contract (branch pieces `offline`/`error-generic`/`not-found`/`forbidden`), 113 call-site names remapped 1:1 (empty-list/empty-search/empty-courses/empty-research/empty-library/empty-community/empty-notifications/achievement…), the palette's no-results and the 404/not-found moment, onboarding frame 0 = `welcome-first-run`, the exam result screen = `exam-complete`, and the **«الخادم يستيقظ…» wake pill** (`lib/serverWake` — 4s slow-pending tracker + AppShell pill pairing `server-waking` with a decorative BrandLoader) for cold-start honesty; the legacy 012 scenes that lost every consumer retired (registry keeps milestone-section + onboarding frames 2–3 + role-intro). **r283–r285 refinement:** dark ink-muted re-keyed `#8F887A`→`#948D7E` (axe caught 4.41:1 composed washes; now ≥4.81:1 on every dark surface), 17 `:hover` rules in the new sheets guarded behind `@media (hover:hover) and (pointer:fine)`, the primitives PageHeader meta line retired from mono (r197's mono-for-IDs-only contract closes its last pocket), the landing colophon reveal is geometry-only (the 0.35-opacity fade rode muted copy below AA mid-scroll), `/student/*` deep-link aliases land on the live top-level routes (BLUEPRINT §7's deferred rows), and provably-dead polish waves deleted (old-landing footer/progress-bar, `.vision-card:hover`, `.gradient-text`). **polish.css status:** the overrides-only layer REMAINS LIVE for the shared component library (~4,400 L; a block-level liveness audit found 443/455 rules consumed) — its full fold into the owner sheets stays a baseline-slice campaign (see §9), documented here rather than pretended done. **Gates at ship:** lint 0/19 · typecheck ×4 · 1981 frontend + 1783 backend tests · parity 190/190 · colleges 25/25 · colors/icons/motion/raw-css/CSP green · bundle 648.7/650 KB gz (entry 71.2/80). 86 routes browser-verified at 1440 + the tight widths {360,390,430,768,1024} in both themes — zero horizontal overflow, ≥44px targets, Latin digits, RTL arrows; reduced-motion verified in Chromium (`reducedMotion: 'reduce'`): 0 running animations, complete static results on landing/shell/families.

> **R304 (SHARED PRODUCT SHELL — the cascade speaks in layers again)**: the unlayered r301/r302 «final-visual-system.css» bolt-on is DELETED and its declarations folded back into their canonical homes (`layout.css` for the sidebar/nav chrome — `background: color-mix(in srgb, var(--surface) 96%, var(--bg))` rail, `.nav-item` at the r-md workspace corner; `components.css` for buttons/tables/states — flat resting buttons via `--_btn-shadow: none`, the accent-tinted CTA pool `0 var(--sp-1) var(--sp-3) color-mix(in srgb, var(--accent) 16%, transparent)` on filled actions, `.table-wrap` at r-lg, `.table thead th` on `--text-secondary`, `.state`/skeleton radii). Two bolt-on regressions reverted by the fold: the collapsed-rail topbar gradient (polish overrides layer) resumes, and the ≤640 `.table-wrap` horizontal-scroll rung is restored (the bolt-on's `overflow: clip` truncated wide tables on phones). **Shell:** the rail's brand mark sits on its accent tile (30px, `--accent-soft`); the active nav row honors A4's «كل مسار له علامة جانبية واحدة» again — the bolt-on's `.nav-item[aria-current]` twin (a SECOND 2px start border) is retired, leaving one bar + one surface step + one icon tint; nav-badge/scope-chip/⌘K-chip ink lifts `--text-muted → --text-secondary` (muted measured 3.1–3.35:1 on the surface-2/3 chips at 13px — axe, browser check). **Product type register (patterns):** `.pf-page-title` 24px display (was 30), `.pf-section-title` 18px (was 24) with `h3` at body size — the scan ladder is page 24 → section 18 → body 16; `.pf-page-desc` stays 16. Link rows lift their whole line on hover (`a.pf-row-link:hover` surface-2 wash); the pinned `.pf-filterbar.sticky` frosts over scroll (`--bg` 86% + blur + hairline). Detail heroes join the register: `.comp-hero-title` 24px display. Vision detail metrics ride StatLine (the `.metric` tile vocabulary leaves the last shared surface). Auth/Register/NotFound recipes untouched (r299 polish holds). **Gates at ship:** lint 0 errors · typecheck ×4 · frontend suite 2055 passing (7 failures pre-existing at base e3caf8d — r303 palette/asset pins outside this round's ownership: parity export re-sync, landing copy/assets, badge/token contrast pins) · icons/motion/raw-css strict green · 22 mock-transport browser surfaces at 1440/390 × light/dark: zero horizontal overflow, zero page errors.

This document states the canon as it **ships in code**. Every value below was extracted from `frontend/src/styles/` at the audited tree (r131/r132) — not from specs (those carry plan-time values, kept as archaeology) and not from memory. When this file and `tokens.css` disagree, `tokens.css` wins; file an issue.



---

## 0. Governance — how this system is enforced · الحوكمة

A design reference is gates, not a gallery. Madarek's canon is machine-enforced at six points:

| Gate | Command | What it asserts |
|---|---|---|
| **Parity export** | `node scripts/verify-parity-export.mjs` | **191/191 token checks** (r305: the export pair re-distilled + every pin rewritten to the Heron foundation — the gate ran RED at the r305 baseline, 76/190, because r303/r304 moved tokens without re-pinning; repaired in the same change). Headline pins (r305: paper `#F6F8FA`, ink `#282828`, signal `#FA3600`, accent-ink `#C72E00`, night ground `#282828`, night ember `#FF5A1F`, gold `#B57438`/`#E0A067` — the demoted copper seat) fail loudly if the reference itself drifts. 4 gates: token parity · undefined-var audit (0 broken; 2 sanctioned opt-in hooks) · **133** retired spellings absent (r305 adds the ultramarine + warm-paper + copper-accent-era needles; `#3d3d3d` legitimized as the night inset well — the r195 `#2A2A2A` precedent) · brace balance. |
| **Motion tokens** | `npm run check:motion-tokens` | No raw motion values outside the canonical token files. |
| **Icon discipline** | `npm run check:icons` | Lucide-only — no other icon source. |
| **Color tokens** | `npm run check:colors` (`--strict` in CI) | No raw hex/rgb()/hsl() outside the sanctioned zones (tokens.css · fonts.css · the export pair · documented `color-gate: allow` lines). r150a sorted the last 269 literals into tokens / `color-mix()` derivations / documented allows — the census is zero and the gate is strict. |
| **Type, radius & spacing tokens** | `bash scripts/check-raw-css.sh` (`--strict` in CI; type/radius r184, spacing r185, **TSX inline spacing r186**; mutation-tested by `scripts/test-raw-css-gate.sh` — 49 fixture cases incl. every r185 blind-spot class) | A declaration-level structural scan (comments/strings/parens/multiline-aware, exact line pins): no raw `font-size`/`border-radius`/`padding`-`margin`-`gap` px literals outside the sanctioned zones. **Spacing scope (r185, deliberately different from the type scope):** 17 sheets — the 14 app sheets **plus** colleges.css and the parity pair (their spacing is ladder-shaped and the export mirrors the ladder internally); landing.css alone stays a **visible census** (its authored «مدار المعرفة» editorial rhythm — 30+ rhythm values — is world design, not ladder debt; the count prints every run so drift never hides). Zero/`env()`/relative units are permitted without tokens; everything else is a ladder `var(--sp-*)` or a per-declaration `spacing-gate: allow — <reasoned>` line (bare/vague markers fail). Grid compliance ≠ token compliance — `28px` on the grid is still a finding without a rung. **TSX inline spacing (r186):** the r184/r185 audit seam became a strict axis — React style objects turn bare numbers into px at runtime, so quoted `…Npx…` values AND whole-value bare numbers are findings; the walk is quote- and comment-aware (prose in strings/templates/JSX comments never flags), property accesses and type members never flag, and the same reasoned-marker grammar exempts on the line above. The r185 audit line said «2 sites» — the blind regex had hidden 60. |
| **Token snapshots** | `frontend` vitest suite | Role-accent hexes read LIVE from tokens.css (r184 RA1: a tampered role table or retuned theme fails here first — the old hand-copied hexes had silently rotted), drift + route-title + a11y nets. |
| **CI** | `.github/workflows/ci.yml` | 9 jobs: lint · typecheck · build · frontend tests · backend tests · db-integration · e2e · design gates (icons + motion tokens + CSP pins + parity export + **color gate, strict** + **raw-css type/radius/spacing gate, strict** — CSS sheets + TSX inline styles — + its mutation harness) · surface drift. |

**What the export pair distills vs what stays outside it:**

| Distilled in the export pair | Stays outside the export |
|---|---|
| Product theme (copper/gold), pastel families, elevation, motion ladder, z-scale, structural recipes — distilled in `frontend/src/styles/unified-parity.css` (canonical export) + `shared-design-system.css` (structural skeleton) | Landing world r190: the `--stage-*` media-stage family + `--aura-*` atmospheric stops — landing-only vocabulary (the retired Orbit-Ink `--ln-*` rungs stay defined in tokens.css as documented archaeology; zero live consumers) |
| The export pair is a **reference artifact** — not imported by madarek's app; the parity gate diffs it against `tokens.css` so silent drift fails loudly | Role/college accent slots (`body[data-role]`) — madarek-app identity slots, outside the export |
| | Illustration palette (`--ill-*`) — illustration-layer vocabulary |

Full export contract: [`docs/PARITY-EXPORT.md`](docs/PARITY-EXPORT.md). Tokens live in one place: `frontend/src/styles/tokens.css` (values + inline WCAG math + decision history).

**Where the canon lives (style file map):**

| File | Owns |
|---|---|
| `tokens.css` | ALL tokens — primitives, light/dark theme blocks, the r190 stage/aura families, retired Orbit-Ink `--ln-*` (archaeology), pastel families, elevation, z, state tokens, the r150a basis constants (`--black`/`--white`/`--warm-ink`, theme-fixed), the overlay-veil ramp (`--overlay-veil[-deep/-max]`, per theme) and the print light-lock remap |
| `fonts.css` | self-hosted Plex subsets (woff2) + `@font-face` declarations |
| `motion.css` | reveal / skeleton / spinner motion grammar, semantic durations |
| `base.css` | element reset, heading styles, reduced-motion belt, autofill/caret polish |
| `components.css` | the component recipes (§5) — buttons, inputs, cards, tables, sheets, dialogs, toasts' kin |
| `layout.css` | sidebar / nav recipes |
| `auth.css` · `notifications.css` · `student.css` | eager remainder — auth-page recipes, toasts/bottom-nav, student-surface patches |
| `polish.css` | overrides layer — the last word on layered surfaces (legacy sections v6–v8 remain `@layer pages` by design — census pinned in the file's «Polish Bundle (consolidated v6 → v21)» header banner, polish.css:1-9; v9+ are overrides) |
| `landing.css` | «رحلة المعرفة» world (r191) — the pinned mega-stage + scene crossfades + stat march + parallax layers on the r190 stage chrome and token families (the only place `--stage-*` is consumed) |
| `colleges.css` · `colleges-popover.css` · `admin.css` · `owner.css` · `training.css` · `pdf.css` · `player.css` | page-scoped sheets, imported by their lazy pages (admin.css born r150e — the colleges.css split; colleges-popover.css born r151h — the popover split, rides the LandingPage chunk; 10 eager via `main.tsx` + 8 page-scoped = the 18 in-app sheets) |
| r152 ownership wave | the search family (v21) → `layout.css`; the megamino stagger (v18) → `landing.css`; the auth-card entrance + pdf-toolbar fade (v19) → `auth.css` / `pdf.css`; the whole `.state` family (v8+v11+v21) → `components.css` §STATE; the a11y utilities core (sr-only / skip-link / :target / tap-highlight / img-lazy) → `base.css` — polish.css keeps ONLY true overrides, belts and pins (5446 → ~4680 lines over r151–r152); r152j retired the dead Plex Serif italic pair (12 → 10 faces, zero live consumers) |
| r153 ownership wave | the welcome-card family (v8 premium · v9 stack · v11 surface · v13 isolation · v17 photo overlay · v22 dots — 7 waves consolidated) → `student.css` §WELCOME-CARD, with the generic `.page-header` rules scoped off via `:not(.welcome-card)` so the pages-layer rule needs no pin; the owner realtime pulse (v17 heartbeat + ring + alert glow) → `owner.css` (restoring the frozen-dot honesty contract for is-pending/is-degraded); the colleges hero bar-draw + card emoji motion → `colleges.css` — polish shrinks to ~4470 lines; the last 68 raw `6px` literals migrated to `--sp-1-5` / `--motion-distance-small` (r153h — zero spacing/motion raw violations remain; 16 intentional raw uses documented as geometry/shadow) |
| `unified-parity.css` + `shared-design-system.css` | the **export pair** — reference distillate, not imported by the app (§0, §8) |

(10 eager via `main.tsx` + 8 page-scoped = the 18 in-app sheets; the export pair makes 20 on disk.)

---

## 1. Two worlds — عالمان

**r190: ONE identity across the public + product surfaces.** The marketing surface and the product speak the same grammar — teal accent (r195), Alexandria display, near-square geometry, telemetry markers — with the landing alone painting the theme-FIXED stage family (`--stage-*`, the void media surface: hero + mission-control chrome), while the landing's BODY sections and the whole product follow the canonical two-theme grounds (white/gray light / near-black dark), driven by the one shared ThemeToggle/theme store (no second theme state anywhere).

### 1a. «مدار المعرفة» — the landing world (الواجهة التعريفية, r190)

The landing paints a **theme-fixed media stage** + theme-following body:

| Layer | Tokens | Notes |
|---|---|---|
| **r305 HISTORY — the stage/aura vocabulary is retired** (zero live consumers; the names are FORBIDDEN needles in the parity gate). The rows below describe the r190/r195 landing era and are kept as archaeology only: stage ground `--stage-ink #0E0E0E`/`#171717`, stage text `#FFFFFF`/`#B3B3B3`, stage accent `#2FB6C6`, white-alpha edges, `--aura-*` radial stops. The r305 landing consumes the canonical theme tokens + the `--poster-*` aliases (which now resolve to the Heron blueprint pair / the orange signal). |
| Original art | `/brand/hero-scene.webp` (95 KB) · `/brand/orbit-ring.webp` (66 KB) | AI-art-directed abstract scenes — no text, no logos, no real-place imagery (QA-verified); the r188 photography ban's intent (no real-university imagery) holds |
| Orbit path | `components/landing/OrbitPath.tsx` | one thin trajectory line + one glowing node, drawn once on load (reduced-motion static) — the icon-gate's documented landing-scene zone |
| Telemetry strip | mono 11px + 7px teal square markers | honest counts computed from the LEDGER data (never typed) |
| Body sections | canonical `var(--bg)`/`var(--text)`/`var(--rule)` + `--accent` | stations/roles/manifesto/media/footer follow the active theme — the two-theme system, same as the product |
| Focus | ONE language, token-routed | `.fo-header/.fo-hero/.fo-mobile-menu { --state-focus-ring-color: var(--stage-accent); }` — the universal outline (base.css) consumes the re-pointed token; zero private outline rules in landing.css (the r172a contract holds, re-pinned r162 test) |
| Progress ribbon | `transform: scaleX(var(--p, 0))` + `--accent` (stage-routed) | GPU-composited; the `--accent` token resolves to its stage expression inside `.fo-progress` |
| Proof section | teal band + 22px dot matrix at 12% accent | «ما يُشحن اليوم» — the reference's «Operating today» moment, honest statuses only |

### 1b. Product theme — ultramarine on warm paper light · ultramarine on night dark (هوية المنتج، r197/r283)

| Token | Light | Dark |
|---|---|---|
| ground `--bg` | blueprint paper `#F6F8FA` (r305) | **charcoal `#282828`** (the reference ink promoted to ground) |
| accent `--accent` | vivid orange `#FA3600` (**3.53:1** paper — UI/large tier; the reference's own register) | luminous ember `#FF5A1F` (**4.73:1** bg, AA-large/UI) |
| accent text `--accent-ink` | `#C72E00` (**5.16:1** ground / 5.50 surface — AA as text) | `#FF5A1F` (**4.73:1** bg — AA text on dark) |
| labels on the fill `--accent-fg`/`--text-on-accent` | `--warm-ink #191918` (**4.69:1** — white 3.76 banned) | `--warm-ink` (**5.64:1** on the ember) |
| accent soft / strong | `#FCE3D9` / `#A32400` (deep 7.02) | `#432015` / `#FFC5AE` (tier 9.72) |
| primary `--primary` | charcoal slab `#282828` (white label **14.74:1**) | **white slab `#FFFFFF`** (the night CTA, warm-ink label) |
| muted `--text-muted` | `#626260` (5.74 ground / 6.11 surface / 5.16 s3) | `#B4B4B0` (r305 — the reference disable grey redeemed: 7.09 bg / 6.53 surface / 5.90 s2) |
| faint `--text-faint` | `#72726F` (4.53 ground, under AA on soft/wells — deliberate) | `#A2A29D` (5.75 bg / 5.30 surface) |
| focus ring | `#C72E00` (5.16/5.50 — ≥3:1 every adjacent surface) | `#FF6B33` (5.20/6.14/4.32) |
| achievement family | `--gold #B57438` / `--gold-ink #8F5A28` — the demoted r304 copper seat, achievements ONLY | `--gold #E0A067` / `--gold-ink #F2B782` |

**Section families** `--c-{mint,rose,sky,yellow,lavender,copper,peach/coral,grey,sand…}-{bg,ink,deep}` — re-grounded on the r305 blueprint paper/charcoal night (computed triads, engine in the spec §verification: badge deep-vs-bg ≥4.5 and light icon-well deep-on-bg ≥3:1 re-verified every family). Danger rhymes with the coral `#F15534`; peach carries the same coral seat with `--c-coral-*` added as the semantic alias namespace. Status **text** uses the `-deep` tiers (AA); **fills** keep the `-ink` tones (danger fill labels stay `--warm-ink` — 5.10 light / 7.81 dark). Chart palette `--chart-1..8` (series 1 = the orange signal — 3.53 light / 4.73 dark, clearing the 3:1 non-text bar; gold reserved for the achievement series) — data points render as SQUARE markers (chart.js `pointStyle: 'rect'`, r190) and bars at 2px radius.

---

## 2. Typography — سلم الحروف

Self-hosted **IBM Plex Sans Arabic 400–700** (no external CDN) · Plex Mono for numerals · Plex Serif italic **retired r152j** — it shipped as a sanctioned Latin-runs-only accent but the audit found zero live font-family consumers, so both woff2 files and @font-face rules were deleted (the serif-italic accent was ruled a phantom on Arabic anyway — the platform accent is upright weight + ink).

**حزمة الأسطولة = 10 وجوه (بلا Serif italic)** — حذف موثق r132 في SM/SL (وجود الـSerif في الاستنساخ بلا قرار)؛ **الـSerif مُحال للتقاعد في مدارك أيضًا (r152j)** — صفر مستهلكين أحياء للعائلة، فحُذف الوجهان المائلان وملفا woff2 معًا؛ مدارك نفسها تشحن **عشرة وجوه** كاملة (fonts.css — تحقّق ls+du).

**Ladder (`--fs-*`):**

| xxs | xs | sm | chrome | body | body-lg | h3 | h2 | h1 |
|---|---|---|---|---|---|---|---|---|
| 11 | 12 | 13 | **14** | 15 | 17 | 18 | 22 | 30 |

**`--fs-chrome` (14px / `0.875rem`)** — درجة الكروم: اتفاق أسطولة r133 (SL R16) شرعنها الكنون في r140 — SL/SO/SB كانت تستخدم 14px خامًا لمقاطع كروم الواجهة (روابط التنقل، أعمدة التذييل، تسميات النماذج، صناديق الحالة، الطوابع الزمنية)؛ نثر المتن يبقى على `--fs-body` 15px.

| Companion scale | Values |
|---|---|
| Metric rungs | **22 / 30 / 44** — fixed-width figures by design (600/1000 UPM in the shipped woff2s; `tnum`/`lnum`/`ss01` features do not exist in the shipped faces — r149 fontTools audit). `tabular-nums` declarations remain as harmless insurance |
| Landing hero | `--fs-display-xl: clamp(48px, 7vw, 96px)` · lh `calc(1.14 − 0.02)` — Alexandria, the stage's display voice (r190; the old `--ln-h1` rung retired with the Orbit Ink world) |
| Display clamps | `--fs-display-md 28–40 · --fs-display-lg 34–56 · --fs-display-xl 40–72` — rungs exist; only `-md` has live consumers (top rungs stay: the parity-export scale pins the full ladder; the phantom `--fs-mega 48–104` listed here before was retired with r132-F5) |
| Line heights | `--lh-tight 1.05` · `--lh-snug 1.20` · `--lh-base 1.65` · `--lh-loose 1.85` |
| Font stack | `--font-sans: 'ibm plex sans arabic', 'tajawal', system-ui, …` + `--font-display: 'alexandria', 'ibm plex sans arabic', …` (r190) — self-hosted woff2 subsets (arabic+latin), no external CDN · `font-display: swap` on all 16 faces |

- **Leading:** body **1.65** · headline **1.20** · metric **1.10** · display role **1.15 light / 1.20 dark** (dark adds a step).
- **Weights: 400 / 500 / 600 / 700 — real.** Plex Sans Arabic ships no 800: `--fw-black` resolves to 700. Never ask for 800/900.
- **No letter-spacing on Arabic** (cursive joins break). Roles pin `--ls-normal: 0`; metric `−0.022em` is the **one** sanctioned tracking — Latin/numerals only.
- **Type roles (consumers must use roles, never raw sizes):**

| Role | Recipe |
|---|---|
| `--type-display-*` | ≤1 per page · 700 |
| `--type-headline-*` | 700 · 1.20 |
| `--type-body-*` | 400 · 1.65 · measure 72ch |
| `--type-label-*` | 500 · 1.50 |
| `--type-metric-*` | 700 · 1.10 · `tnum lnum` |

- **Latin voices & licensing (r305 audit):** the design reference's grotesk (**BT Grotesk**) is proprietary — NOT reused; its mono (**Geist Mono**) is OFL but adds no coverage/a11y gain over the shipped Plex Mono, so the face set is unchanged. The Heron voice rides the shipped OFL trio: **Alexandria** (display) + **IBM Plex Sans Arabic** (body incl. Latin runs) + **IBM Plex Mono** (technical micro-labels — the reference's mono 10–11.67px uppercase voice maps onto the existing 11–12px telemetry/chrome grades). **Archivo** (OFL) is the documented future addition if a distinct Latin display voice is ever required (spec §fonts). The reference's UPPERCASE display style has no Arabic equivalent — hierarchy transfers via Alexandria 600/700 + the size ladder; its −0.02em display tracking stays banned (Latin-only device, Arabic joins).
- **Mono voice:** `--font-mono = 'IBM Plex Mono' → 'IBM Plex Sans Arabic'` fallback — per character: Latin+digits render mono, Arabic continues in the brand sans (11px telemetry / 12px chrome / 0 tracking / tabular). Tracking is 0 even on the mono classes: their live runs mix Arabic (ruling #2, r133-F7) and `tabular-nums` carries the alignment role.

---

## 3. Motion canon — قانون الحركة

**Raw ladder (`--t-*`, r305 — the measured Heron register):** `micro 80 · fast 200 · base 400 · slow 500 · slower 650 · cinema 900ms` — the reference's transition census is 0.4s-dominant (×174 in the bundle) on `cubic-bezier(.23,1,.32,1)`; the `.48s` rolling-label device uses `cubic-bezier(.625,.05,0,1)`, adopted as `--ease-in`'s exit curve.
**Semantic:** `page 400 · reveal 480 · stat/spinner 700 · skeleton 1200ms` (page/reveal re-keyed to the register; stat/skeleton keep their rhythm — independent of the reference).
**Ambient loop bands:** `1.6 / 2.4 / 3.6 / 6 / 22s` — rhythm only, **never** for hover/press. (r176f: the long-documented 9s band never existed in `tokens.css` — five bands, tokens win per AGENTS.md §2.)

| Semantic | Pattern it owns |
|---|---|
| `--motion-duration-page` 320ms | route / page transitions |
| `--motion-duration-reveal` 360ms | scroll reveals (14px, one-shot IntersectionObserver) |
| `--motion-duration-stat` 700ms | stat counters · sheen sweeps · the spinner arc |
| `--motion-duration-skeleton` 1200ms | shimmer loops (`--ease-linear`) |
| `--motion-stagger-step/cap` 60ms / 6 | staggered grids — step 60ms, never more than 6 deep |

| Family | Values |
|---|---|
| Eases | standard `(--ease)` **`(0.23,1,0.32,1)`** (r305 — the reference's decel standard) · decelerate `(0.16,1,0.3,1)` · accelerate/exit **`(0.625,0.05,0,1)`** (r305 — the roll curve) · soft/emphasized `(0.22,1,0.36,1)` |
| Springs | soft `1.18` · spring `1.36` · bounce `1.56` · snappy `(0.5,1.6,0.4,1)` |
| Linear | **only via `--ease-linear`** — continuous loops only (spinner, skeleton, marquee) |
| Press registers | controls `0.97` @80ms (`--press-scale`) · cards `0.99` · bottom-nav thumb `0.93` |
| Hover lift | primary **−2px** · accent **−1px** (both hover-capable-gated — `@media (hover:hover) and (pointer: fine)`, iOS never pins) · cards −1px · KPI −2px · ghost buttons lift **never** (border-shift only)
| Entrances | modal pop 240ms decel (8px + 0.98) · sheet slide 240ms decel · toast in 240 decel / out 160 accel · reveal 360 (14px, one-shot IO) · stagger step 60ms, cap 6 |

**Reduced motion (`prefers-reduced-motion`):** raw `--t-*` all zeroed (including `--t-micro`), semantic family zeroed in `motion.css`, per-pattern kills (marquee, presses). `--motion-direction` is unaffected — RTL mirroring survives RM.

---

## 4. Grain & elevation — الحبيبات والارتفاع

**Grain — RETIRED (r188, pinned by landing-scrollspy-grain.test):** the film-grain veil is gone; the landing's texture is the proof section's 22px dot matrix (12% accent) — a data-section treatment, never a whole-page veil. The product surface stays **clean**.

**Elevation (`--elev-1..5`):**

| Theme | Recipe |
|---|---|
| Light | 2-layer black shadows — `1px 2px 4%` (elev-1) → `32px 64px 12%` (elev-5) |
| Dark | fill-led `0.30 → 0.50` + `inset 0 1px 0` white 4–8% top light |

`--shadow-card ≡ --elev-1`; premium 3-layer variants reserved for primary CTA / KPI hover.

**Z-scale (fixed, never improvised):** `dropdown 100 < popover 200 < tooltip 250 < sheet 300 < modal 400 < toast 500 < lightbox 600`.

**Glass:** `--glass-blur 16px` (surfaces) · **strong tier:** `--glass-bg-strong` opacity **0.92** + `--glass-blur-strong 16px` (r140 — توحيد الطبقة القوية التي استخدمتها ثلاثة منتجات بقيم متباعدة 0.90/0.92/0.94؛ الضباب يبقى 16px — لا ضباب أقوى من 16) · `--scrim-blur 4px` (dimming scrims) — **the landing bans glass entirely.**

---

## 5. Component recipes — وصفات المكوّنات (the clone canon, exact)

**Shared primitives every recipe consumes:**

| Ladder | Values |
|---|---|
| Radius `--r-*` | xs **2** · sm **4** · md **6** · lg **8** · xl **12** · 2xl **16** · 3xl **20** · full **9999px** (pill) — the r305 SQUARED ladder (the reference renders radius 0 on every marketing surface; hairline-crisp rungs keep chips/inputs legible; pill survives for the primary CTA + search) |
| Spacing `--sp-*` | 4px base — `sp-1` 4 · `sp-4` 16 · `sp-7` 32 · `sp-8` 40 · `sp-10` 56 · `sp-16` 240 · half rungs `sp-0-5` **2** · `sp-1-5` **6** (r153h) · `sp-2-5` **10** (r185) — the floor is 2px; below it is optical territory (documented allows, not rungs) |
| Weights `--fw-*` | regular 400 · medium 500 · semibold 600 · bold 700 · `--fw-black` **resolves 700** (Plex has no 800) |

| Component | Recipe |
|---|---|
| **Button** | 40px · 13px (`--type-label-size`) · 600 · r-md 6px (r305 squared ladder) · press `scale(.97)` @80 · primary: charcoal slab fill (light `--primary #282828` / fg `#FFFFFF`, 14.74:1) + sheen `::before` + premium shadow, hover −2px + `--shadow-card-premium-h` · disabled .55 · no letter-spacing — the reference's own button register is charcoal-filled with white mono labels (measured `.btn-fill` bg `rgb(40,40,40)`); orange fills carry `--warm-ink` labels only (4.69:1) |
| **Input** | 44px · `max(16px, 15px)` iOS floor · r-md **6** (r305 squared ladder) · focus = accent border + **3px 22% halo** (`--state-input-focus-halo`) + AA `:focus-visible` ring · placeholder `--text-faint` · disabled .6 / not-allowed / surface-2 |
| **Dialog** | `min(560px, 100%)` · r-xl **12** (r305) · `--elev-4` · top accent-gradient hairline (3px, inset-inline 30%) · title 22/700 · pop 240ms decel · overlay .40/.62 + fade 240 |
| **Sheet** | `min(420px, 100%)` · r-2xl **16** (r305) **leading edge only (logical)** · `--elev-4` · z 300 · 240ms decel slide · scrim blur 4px · grabber |
| **Toast** | **bottom-end** stack (20px inset) · max `min(420px, 100vw − 24px)` · 28px tone-icon well (soft bg + `-ink` icon) · in 240 decel / out 160 accel · swipe-dismiss · z 500 · **error toasts dismiss manually** |
| **Empty state** | `.state-icon` **56×56 grey well** (`--c-grey-bg`/`-deep`, r-xl) · icon 20 · title **18px / 700** · desc 13 muted 42ch · actionable default copy · opt-in 160px illustration · **≤640px** (r166b): padding sp-6/sp-4, well 44px, illustration 120px |
| **Sidebar** | 256px (64 collapsed) · item min-30px · r-sm 8 · active = wash bg + **3×16px role-accent bar at inline-start −3px** + 240ms pop · night: **teal wash** `rgb(47 182 198 / 0.16)` (r195 — was violet, gold before that) |
| **KPI card** | min-block **132px** · value **30px / 700 `tnum lnum`** lh 1.10 · label 12/600 muted · icon well **44px** r-lg + 1.5px role-accent rim (30%) · hover −2px · **semantic `color` prop** (r166b): `green/amber/red/purple/gold` override the icon well + leading edge via the pastel families (badge grammar — `--c-*-bg` well + both-theme-safe `*-ink` glyph, 3:1+ both themes); value/label text never change color |
| **Table** | wrap r-xl + rule border · thead **12px** / 600 / muted (no tracking, no transform — Arabic) on **surface-2** · body 13px · **zebra-on-hover** (`tr:hover → surface-2`) — hover shift, *not* static stripes · last row borderless · pagination 44px targets · **≤640px ladder** (r151b): `tbl-stack` + per-td `data-label` → row-cards (label at inline-start, first-read RTL); a plain `.table` keeps its layout and self-scrolls — never squishes, never drags the page; pagination cluster wraps |
| **Spinner** | 22px · 2px · top arc neutral-900 (light) / accent (dark) · **700ms linear** (sm 14px) |
| **Skeleton** | `--motion-duration-skeleton 1200ms` · `--ease-linear` · RTL-aware shimmer · r-sm |
| **Badge/status** | solid pastel · 11 / 600 · `tnum` (`-bg` ground + `-deep`/`-ink` text) |
| **Page header** | `PageHeader` primitive (r164-a) — `header.page-header > .page-title-block > h1.page-title (+ p.page-subtitle)`; actions are DIRECT flex children (no wrapper) · title = the route's one `--type-display-*` h1 · subtitle 13 `--text-secondary`, measure ≤72ch · **R189 masthead: the 2px INK rule** (`--sp-0-5` solid `--text`) + optional mono `meta` fact line (date/week — data only, never a decorative eyebrow; polish §page-header) · status tone ladders come from the shared maps (grade bands: `lib/courseMeta` GRADE_BANDS — never a page-private threshold) |
| **Ledger panel** | R189 «سجلّ مدارك» — `LedgerPanel` + `LedgerRow` (`components.css` §R189): `.ledger` bordered surface + `.ledger-head` (h2 `.ledger-title` + optional pastel **zone tint** `.zone-{sky,rose,mint,copper,lavender}` from the `--c-*` families, both-theme-safe `-bg/-deep` pair) + rows on the `[lead | body | tail]` grid — mono-`--font-mono` lead (time/count), Arabic body (strong + muted small), badge tail; `to` renders the whole row as the link (the agenda-row contract) |
| **Stat strip** | R189 — the typographic KPI replacement (`StatStrip`): `.stat-strip` bordered strip of `.stat-cell`s, each a `dl` (mono `.stat-label` / metric-role `.stat-value` / `.stat-trend` note, `up`=mint `down`=rose inks); hairline cell separators; 2×2 container-query reflow ≤640px. NO icon wells, NO accent boxes — the printed stat line. Kills the icon-box KPI grid on every dashboard |
| **Momentum ring** | R189 — `ProgressRing`: SVG `stroke-dasharray` circle (track `--surface-3` / fill `--accent`, `rotate(-90)` start-at-12 in both directions), `role="progressbar"` + aria-valuenow; the `.momentum` row (ring + info + chips + actions) is the continue-learning hero |
| **Sparkline** | R189 — pure SVG polyline in `Ledger.tsx` (the icon gate's documented data-viz allowlist class): `role="img"` + text alternative, stroke from `--accent`/`--c-*-ink`; data-bearing only (never decorative) |

---

## 6. RTL rules — قواعد الاتجاه

Arabic is the first-class direction; LTR is the port.

- **Logical properties throughout** — `inline/block`, `inset-inline-*`; no physical left/right in app CSS.
- `--motion-direction: 1 → -1` under `[dir=rtl]` — switch thumb `translateX(calc(var(--motion-direction) * 18px))`, icon hovers flip.
- **Sheet radius on the leading edge** via logical corners (`border-start-end-radius` etc.) — radius travels with direction automatically.
- Marquee direction mirrors; `.ln-mono` uses `unicode-bidi: plaintext` for per-run direction.
- Landing guard: `overflow-x: clip`.

---

## 7. Theming & accessibility — الوصولية

- **Themes:** light default + `[data-theme="dark"]` — both fully specified (§1b); no "auto-only" surface. **r172a/r190: the landing is a first-class two-theme surface** — the shared `ThemeToggle` (فاتح · داكن · تلقائي) mounts in the landing header (labeled mobile-menu row ≤640px); the hero + chrome paint the theme-FIXED `--stage-*` family (a media surface), the body sections follow `var(--bg)`/`var(--text)`, and no second theme state exists anywhere.
- **Role accents:** `body[data-role]` — 7 roles × 2 themes, hexes **pinned by token-snapshot tests**; college accent slot carries a runtime contrast gate.
- **Contrast tiers:** status/badge text always uses the `-ink`/`-deep` tier of its pastel family (AA); fills keep base tokens. Light-mode icon wells use the **`-ink` tier** (r131 hardening: 6.98–9.02:1; dark untouched). Landing stage text (`--stage-cream-dim #B3B3B3`) clears **8.7:1** on the stage ink (r195 values; axe-verified live at r190).
- **`prefers-contrast: more`:** elevations become rings, borders strengthened, glass de-blurred, illustration strokes 1.5 → 2.
- **Focus rings — ONE language (r172a → r195):** the universal `:where()` 2px/2px ring owns EVERY control — it consumes `--state-focus-ring-color` (light `#014A52` / dark `#7FCED9`, both AA); the landing's stage chrome TOKEN-ROUTES the same token to `--stage-accent` inside `.fo-header/.fo-hero/.fo-mobile-menu` (no private outline rule anywhere — r162 pin).
- **Reduced motion:** full kill-belt in `base.css` + token zeroing (§3) — motion never survives RM; direction mirroring does.

---

## 8. Rules for evolving the system — قواعد تطوير النظام

1. **Consume tokens and roles, never literals** — `var(--accent)`, `--type-body-*`, `--elev-1`, `--t-base`; hex/px literals belong only in `tokens.css`.
1a. **Alpha variants are derivations, not new colors (r150a)** — `rgb(C / 0.04)`-style translucency of an existing token C is written `color-mix(in srgb, var(--token) 4%, transparent)` (mathematically exact in srgb). Achromatic extremes route through the fixed basis `--black` / `--white`; the theme-flip-immune warm ink is `--warm-ink`. The only raw literals downstream of `tokens.css` are documented `/* color-gate: allow — reason */` lines (statutory flag colours, video mattes, mask paints, the player's sealed island).
1s. **Spacing runs through `--sp-*` (r185)** — every `padding`/`margin`/`gap` family value in the 17 strict sheets is a ladder rung, a permitted zero/relative unit, or a documented `/* spacing-gate: allow — reason */` line. A 4px-grid value is **not** automatically a token (`28px` has no rung); new rungs require a repeated coherent design need (the r153h `--sp-1-5` ×64 / r185 `--sp-0-5` ×54 / `--sp-2-5` ×28 standard) and must be mirrored in the parity export; never round a literal to the nearest rung silently — verify the visual change or keep the exception.
2. **Extend at the composition layer only** — new surfaces compose existing tokens/primitives; the token files are closed for casual edits (gate-protected).
3. **The export pair (`unified-parity.css` + `shared-design-system.css`) is the verification surface, not a file to import** — the app consumes `tokens.css` / `motion.css` / `components.css` directly. See [`docs/PARITY-EXPORT.md`](docs/PARITY-EXPORT.md).
4. **What the export covers:** §1b product theme, §2 typography, §3 motion, §4 elevation, §5 recipes, §6 RTL, §7 a11y. **What it excludes:** the r190 stage/aura families + retired Orbit-Ink (`--ln-*`) archaeology, role/college accent slots, `--ill-*`.
5. **Drift is a bug** — the parity gate fails loudly on any divergence between `tokens.css` and the export pair; fix the canonical source first, never hand-patch the export.

---

## 9. Redesign-era architecture — معمارية ما بعد إعادة التصميم (r285, as it ships)

**الصفحة الواحدة تُركَّب من ثلاث طبقات فقط: توكنات → قواعد → نمط صفحة.**

### 9a. Stylesheet architecture · طبقات الأوراق

| Sheet (import order) | Role | Owner |
|---|---|---|
| `tokens.css` | كل القيم: ألوان/نوع/مسافات/نصف قطر/ارتفاع/أدوار (562+ متغيرًا) — المصدر الوحيد، تفوز عند التعارض | منسّق النظام فقط (بوابة parity تحرسها) |
| `base.css` + `motion.css` | تصفير + `:focus-visible` + حزام الحركة المخفضة (كل حركة عبر `--t-*`/`--motion-*`) + أساس الطباعة | منسّق النظام |
| `fonts.css` | Alexandria (عرض) + IBM Plex Sans Arabic (نص) + Plex Mono (**معرّفات/شيفرة/مقاييس جدولية فقط** — عقد r197، آخر جيب أُقفل r284) | منسّق النظام |
| `components.css` | مكتبة المكوّنات المشتركة (بطاقات/أزرار/جداول/تنبيهات…) | سطح مشترك — تغييراته كاسرة، يديرها المنسّق |
| `layout.css` | هيكل التطبيق: sidebar/topbar/bottom-nav/درج/⌘K/بحث + **`.wake-pill`** (لحظة إيقاظ الخادم r280) | عائلة الهيكل |
| `patterns.css` | عقد الأنماط الثمانية (`pf-*`) — قواعد الصفحة/الصفوف/الأشرطة لكل العائلات (r210) | عقد مجمّد: `components/patterns/CONTRACT.md` |
| `illustrations.css` | عصبة الرسوم mk-ill (أحجام القطع + حركة BrandLoader فقط) | عصبة الرسوم |
| Family sheets (page-scoped, lazy): `student.css`, `research.css`, `teacher-quality.css`, `teacher-pages.css`, `exam-author.css`, `online-exams.css`, `quality-pages.css`, `admin.css`, `owner.css`, `training.css`, `colleges.css`, `community` §CP rows in `components.css`, `ai.css`, `notifications.css`, `pdf.css`, `player.css`, `auth.css`, `landing.css` | أنماط عائلة واحدة، بادئة أصناف خاصة، داخل `@layer pages`، تستوردها وحدات الصفحات الكسولة | العائلة المالكة فقط |
| `polish.css` | موجة التجاوزات التاريخية على المكوّنات المشتركة (آخر استيراد يفوز) — **لا تزال حيّة بمعظمها** (تدقيق r285: 443/455 قاعدة مستهلكة)؛ حذفها النهائي = حملة شرائح أساس سطح-بحساب (انظر §9c) | المنسّق (لا عائلة تحررها) |
| `unified-parity.css` + `shared-design-system.css` | سطح التحقق فقط (لا استيراد تطبيقي) — بوابة parity ترفض أي انحراف | منسّق النظام |

**قواعد الطبقات:** كل قيمة عبر توكن (بوابات colors/motion/raw-css صارمة على الأوراق كلها عدا المسموح الموثق)؛ الأيقونات Lucide فقط عبر `<Icon>` (عصبة الرسوم والخامات البيانية استثناءات موثقة)؛ الأرقام عبر `utils/numbers.ts` حصرًا (لاتينية، فواصل موحّدة).

### 9b. The patterns · عقد الأنماط (r210)

`PageFrame` (عرض القراءة/الافتراضي/العريض/الكامل) · `PageHeader` (عنوان/وصف/سطر حقائق/تبويبات/فتات/أزرار) · `SectionHeader` · `RowList/RowItem` (صف هادئ بتفصيل ملتصق، كثافة مريحة/مضغوطة، هياكل تحميل) · `SplitView` (قائمة/تفصيل، ≤920px يصبح Sheet) · `StatLine` (شريط أرقام مطبعي — لا صناديق أيقونات) · `FilterBar` (بحث+فلاتر+ترتيب، لاصق اختياري) · `TodayList` (أجندة بأولوية عاجل/الآن/لاحقًا). الأرقام تصل مُنسَّقة (لا تنسَّق داخل value). العقود النormative في `frontend/src/components/patterns/CONTRACT.md`؛ الدروس المتقادمة (primitives/PageHeader/Card/MetricCard) باقية خلف عقدها حتى تُسبك الموجة القادمة.

### 9c. The illustration kit · عصبة الرسوم mk-ill (r270–r280)

16 قطعة SVG أصلية بلونين (حبر `--ill-stroke` 1.5/2 + إشارة، ظل لوني واحد على الأكثر، معجم النقاط-الشبح «ليس بعد»، الذهب لقطعة `achievement` حصرًا، محايدة اتجاهيًا فلا انعكاس RTL)، عبر المُرسِل `<Illustration>` (كسول: قطعة=chunk ≈0.5KB gz) + `BrandLoader` (علامة التحميل النظامية، وضع `decorative` r280). الخريطة الحيّة: القوائم `empty-list` · البحث `empty-search` · المقرّرات `empty-courses` · البحوث `empty-research` · المكتبة `empty-library` · المجتمع `empty-community` · الإشعارات `empty-notifications` · الإنجاز `achievement` · أخطاء `offline`/`error-generic`/`forbidden`/`not-found` · النجاح `success-submitted` (متاح؛ لحظات النجاح اليوم toasts نصية أولًا — انحراف موثق) · `exam-complete` في شاشة نتيجة الاختبار · `welcome-first-run` إطار التهيئة الأول · `server-waking` + BrandLoader في `.wake-pill`. مشاهد 012 الوارثة الناجية: `milestone-section` + إطارا التهيئة 2-3 + مقدمة الدور (بقية العائلة تقاعدت r280).

### 9d. polish.css fold — the remaining campaign · حملة السبك المتبقية

الأمان الوحيد لسبك موجة `polish.css` إلى أوراق أصحابها: شريحة أساس (16 مسارًا) قبل/بعد كل دفعة، بوابة drift في CI هي الشاهد الوحيد (لا اختبارات مباشرة على polish). البروتوكول: (1) حصر القواعد المستهدفة لأسطح شريحة، (2) نقل القواعد الحيّة للورقة المالكة بصيغة متوافقة مع التوكنات، (3) حذف الموجة من polish، (4) `AUDIT_BASELINE=1` slice re-capture + promote + drift. دفعة/شريحة حتى اكتمال الملف.

---

*Decision history and WCAG derivations live inline in `frontend/src/styles/tokens.css` (the authored source). Process archaeology lives in `specs/`; the historical SpeckKit draft lives in `docs/archive/MASTER.md` (superseded, archived at r137).*
