# R305 — Heron AI Reference Specification · مواصفة المرجع المقيسة

> **R305-A1 deliverable** — the evidence-based reverse-engineering specification of
> [heronaiapp.com](https://heronaiapp.com/) and the canonical Madarek token mapping derived from it.
> Everything marked **(measured)** was read from the live DOM via a real headless browser
> (Playwright/agent-browser) at the stated viewport; **(CSS)** comes from the site's own shipped
> bundle (`heronai.webflow.shared.9f21166e0.min.css`, 244,234 bytes, fetched and grepped);
> **(computed)** is WCAG 2.1 math from the verification engine (§9); **(approx)** is visual
> inference, flagged as such. Unknowns are listed in §10, never silently invented.

**Branch:** `redesign/r305-heron-foundation` · baseline `origin/main @ 1b766512`
**Reference pages actually inspected:** `/` (homepage, desktop + mobile + menu-open), `/heron-dashboard`, `/heron-chat-widget`, `/pricing` (desktop + mobile + billing toggle click), `/resources`, `/about-us`, `/contact-us` (incl. focus/typing states).

---

## 1. Method & evidence provenance

| Instrument | What it produced |
|---|---|
| agent-browser (headless Chromium, Playwright) — sessions at 1440×1000 and 390×844 | screenshots (43 files, §11), computed styles, interaction states (hover/focus/click/open menu), section inventories |
| `curl` of the Webflow CSS bundle | exact tokens, easings, durations, radii, breakpoints, font-faces (grep + census) |
| WCAG 2.1 engine (Python, §9) | every contrast ratio quoted here; binary searches for the AA-safe ink tiers |
| Subagent evidence passes | 2-a homepage, 2-b product pages, 2-c mobile/responsive, 2-d Madarek token/cascade audit, 2-e a11y/licensing (reports in the R305-A1 evidence set) |

**Reference site anatomy:** a Webflow build with fluid-root scaling (`html{font-size:0.578704vw}`
→ 8.333px root @1440; `1.19904vw` ≤991; `2.54453vw` ≤767), a Lenis smooth-scroll runtime, GSAP
scroll choreography, and a 6.67px inset canvas frame (`.body-inner{padding:.8rem}`) carrying
ruler strips and `+` registration marks — the whole site presents as an architect's drawing sheet.

---

## 2. The measured reference system

### 2.1 Color → role map (live-verified)

| Hex | Role on the reference | Where observed |
|---|---|---|
| `#FAFAFA` / `#FFFFFF` | page ground / surfaces | painted result (CSS+probe) |
| `#E0E0DA` / `#E0E0D7` | warm-grey edges; user-bubble fill | CSS + chat mockup |
| `#282828` | primary ink; button/nav-active/toggle/chat-header fills | `--content--primary`, measured `rgb(40,40,40)` |
| `#414140` | secondary ink (`--content--secondary`) | CSS |
| `#282828b8` | body text (charcoal @72%) | body rule (measured `rgba(40,40,40,0.72)`) |
| `#72726F` / `#626260` | surface / granite greys | CSS |
| `#B4B4B0` | disable/discreet (`--content--disable`); mono labels | CSS |
| `#B3B3AF` | ALL hairlines (`--content--border`), dashed variants | every `.line*` element (measured `rgb(179,179,175)`) |
| `#FA3600` | brand: CONTACT US nav text, scanline, orange disc, accent hairlines, error chips, ACCEPT button, resource-hover multiply overlay | `--content--brand` |
| `#F15534` | coral — secondary warm accent | CSS (3 uses) |
| `#3898EC` | **1 occurrence** — Webflow's default `.w-input:focus`/`.w-button` blue; a framework vestige, not a brand color | CSS |

**Structural finding:** the homepage is ONE light ground with charcoal + orange *block* accents —
there are **no full-width dark sections**. "Alternating light/dark" exists as charcoal filled
blocks (nav hover, buttons, billing toggle, chat header) against the light canvas, plus dark
artwork panels. Madarek keeps its genuine two-theme system; on-page alternation = surface steps +
charcoal feature panels, never a whole-page dark rebellion on the light theme.

### 2.2 Typography (measured @1440; design-px = rendered ÷ 0.8333)

| Role | Size/lh | Weight | Face | Notes |
|---|---|---|---|---|
| h1 | 46.67/46.67 px | 700 | BT Grotesk | UPPERCASE, ls −0.02em (measured −0.933px) |
| h1 (about/pricing) / h2 | 40/40 | 600 | BT Grotesk | UPPERCASE |
| h4 (step titles) | 26.67/26.67 | 600 | BT Grotesk | UPPERCASE |
| h5 (prices) | 23.33 | 600 | BT Grotesk | |
| h6 (card titles) | 20 | 700 | BT Grotesk | UPPERCASE, `.clamp-2` |
| mono label | 11.67 | 500 | Geist Mono | UPPERCASE, ls 0 — kickers, `[01]` indices, nav/footer links |
| mono micro | 10 | 500 | Geist Mono | coordinates `[0,246]`, meta rows |
| body | 13.33, lh 1.3 | 500 | BT Grotesk | color `#282828b8` |
| form value | 18.33 | 500 | BT Grotesk | contact inputs |

The type system is **proportionally scaled** (fluid root), uppercase-first, and pairs ONE grotesk
with ONE mono. For Madarek: UPPERCASE has no Arabic equivalent — the hierarchy transfers through
Alexandria 600/700 + the size ladder; the mono micro-label voice (10–12px, tracking 0, Western
digits) maps onto the existing Plex Mono telemetry/chrome grades; −0.02em display tracking stays
banned (Arabic joins).

### 2.3 Motion register (CSS forensics)

| Effect | Trigger | Initial → final | Timing | Viewport | Implementation idea | Madarek delta |
|---|---|---|---|---|---|---|
| Rolling dual labels | hover nav/buttons | two stacked labels `translateY(0→−100%)` | **0.48s `cubic-bezier(.625,.05,0,1)`** (CSS) | all | grid overflow-hidden + two spans | adopt as a documented pattern for A2 work; Arabic label height varies — block-level swap, no per-glyph |
| Arrow movement | hover CTA/link | `translateX` slide | 0.5s `cubic-bezier(.23,1,.32,1)` | all | icon transform | already canonical (`--motion-direction` handles RTL) |
| Color/filter transitions | hover | color/opacity/saturate(0→1) | **0.4s ease** (×174 census) | all | transitions | `--t-base 400ms` + `--ease (0.23,1,0.32,1)` adopted |
| Marquee ticker | continuous | `translateX(0→−100%)` | **10s linear infinite** `marqueeLeft` (inline sheet, measured) | all | duplicated track | existing marquee grammar; linear only |
| Pixel-dissolve fill | hover btn-fill | `mask-position` sweep over `pixel-mask.svg` (4800×60, 10px cells, opacity .05→1) | GSAP-driven | desktop | mask-size 2000% | **rejected** (decorative JS weight); simple wash/opacity step |
| Intro/preloader | load | blueprint line-draw + orange scanline + % counter → hero | ≈5.5s (mobile measured; desktop approx 3–6s) | all | loading overlay `loading→loaded` | **rejected** (r190 no-preloader rule stands); the *device language* (mono boot labels, metadata rows) is the adoptable part |
| Scroll reveals | IO/scroll | masked line fade-up | GSAP ScrollTrigger | all | per-line split | **block-level reveals only** (per-line split breaks Arabic shaping — standing r196 rule) |
| Pin/scrub chapters | scroll | sticky panels (`product-key` 5×100dvh; `home-map` 7000px = 500dvh) | scroll-bound | desktop; **kept on mobile at 500dvh** | Lenis + ScrollTrigger | Madarek: `useScrollStage` engine; **no mobile scrolljack**; RM kills pinning |
| Accordion | click | GSAP height + plus/minus icon morph | JS | all | SVG stroke swap | existing disclosure recipes |
| Nav dropdown | hover/click | cell fills charcoal `#282828`, white text; hairline panel below | 0.4s | ≥992 | CSS class + panel | token-routed wash + hairline |
| Hover garnish | hover images | corner `+` marks `scale(0→1)`, orange multiply overlay fade | 0.4s | hover-capable only | absolutely positioned spans | keep behind `@media (hover:hover) and (pointer:fine)` |

**Easing census:** `cubic-bezier(.23,1,.32,1)` ×11 · `(.625,.05,0,1)` ×3 · `(.59,.23,.22,.96)` ×1.
**Duration census:** .4s ×174 · .3s ×10 · .5s ×9 · .2s ×8 · .1s ×3 · .48s ×2 · .65s ×1 · .45s ×1 · .35s ×1.
**Reduced motion:** **0 `prefers-reduced-motion` rules in the bundle**; exactly 2 inline blocks
(SVG draws only). Lenis/intro/marquee are not gated — a documented reference gap; Madarek's full
kill-belt beats it.

### 2.4 Header & navigation (measured)

- Fixed bar: inset 6.67px, **56px** tall, transparent, **full-width bottom hairline `#B3B3AF`** drawn by `.line` divs; z 10000000.
- Nav cells separated by vertical hairlines; links Geist Mono 500 11.67px UPPERCASE, charcoal @72%;
  hover = **solid charcoal cell, white text**; `PRODUCT`/`RESOURCES` dropdowns = light panel,
  1px hairline frame, rows 218×37, hover → orange text.
- `CONTACT US` = **orange mono text + → arrow** (the signal lives in one nav slot only).
- Logo: isometric cube mark 32×36 + wordmark.
- Mobile: MENU button 187×50, minimal 2-line icon; open menu = **188×211px right-aligned
  clip-path dropdown**, 0.4s, 40px rows, tap-accordion submenus (measured, screenshotted).

### 2.5 Homepage section map (heights @1440)

| # | section | height | content pattern |
|---|---|---|---|
| 1 | `home-hero` | 987 (=100dvh−16px) | ruler strip + `+` marks; pencil-sketch house; bottom band: h1 caps 2 lines + paragraph + mono DISCOVER MORE link; ticker marquee below |
| 2 | `home-intro` | 723 | giant orange disc + tower sketch + construction lines; caps statement; charcoal btn-fill; CLIENTS strip (grayscale logos, hairline cells, ←/→) |
| 3 | `home-problem` | 743 | mono eyebrow `PROBLEMS` → giant caps statement → right-aligned support paragraph |
| 4 | `home-map` | **7000 (500dvh scrolljack)** | pinned full-viewport narrative frames, giant centered caps statements ("RIGHT THERE WITH YOU") |
| 5 | `home-platform` | 710 | statement system + product mockups (screenshot degraded; anatomy per product pages) |
| 6 | `home-why` | 681 | statement system (partially captured) |
| 7 | `home-usecase` | 987 | red/orange duotone collage (multiply) + accordion rows (ARCHITECTS…SMALL FIRMS, dashed separators, `+` marks) + corner coordinates |
| 8 | `cta` | 698 | coordinates row → caps h2 + CONTACT US btn-fill → sketch art (identical site-wide) |
| 9 | footer | 711 | 3-col (statement+subscribe / mono link columns / logo) + image band + copyright row |

**Decoration system:** 1px hairlines as frames/column/row separators; dashed hairlines; orange
`line-brand` accents; mono `[NN]` indices, `[x,y]` coordinates, bracketed counts; grayscale logo
strips (`saturate(0)`, hover 1); multiply-blend imagery; corner `+` registration marks; the ruler
strip. **Radius = 0 on every element checked** (buttons, cards, tags, inputs, chat bubbles).

### 2.6 Product-page patterns (measured — 2-b)

- **Pricing = a 5-column hairline TABLE, not cards:** stub + 4 plan columns 285px; head (mono name
  13.33 + desc 11.67@72%) → price (h5 23.33/600 + mono 10px period + credits 13.33) → CTA 232×40
  charcoal pixel-fill; 13 comparison rows ×51px with 14×14 squared SVG checks + per-cell vertical
  hairlines; billing toggle = 428px blocks, **active = solid charcoal, white text** (click-verified:
  prices swap `$99 /MONTH` ⇄ `$90 /YEAR`); **no popular-plan highlight** — differentiation purely
  ordinal. → Madarek "plan ledger" keeps the hairline-matrix idea, RTL-first (label column
  rightmost), Madarek button grammar, no SAVE-15% parenthetical inside labels (separate mono chip).
- **Product mockups:** flat rectangles, **no browser/device chrome**, `mix-blend-mode:multiply`
  into the paper; chat-widget mockup 270×385, 1px `#282828` frame, radius 0, **charcoal header
  bar with white caps title**, user bubble = solid `#E0E0D7`, AI bubble = transparent + `#B3B3AF`
  border (deliberate inversion), mono timestamps. → adopt flat framing; Arabic chat copy; verify
  multiply on both themes.
- **Contact form ("ledger" recipe):** 75px fields, transparent bg, **no side/top borders — the only
  rule is a bottom hairline in brand orange** (`.line-brand`, verified unchanged on focus/typing —
  the reference's focus state is effectively invisible); static caps labels inside the field;
  error chip = white on `#fa3600`; submit row 87px with `.disable` until valid. → Madarek: keep the
  orange-rule idea, ADD a visible focus ring + floating/top labels, 44px+ targets, RTL label
  alignment (the reference ships a "FISRT" typo class of issues — proofreading gate).
- **Resources:** filter bar (mono, bracketed counts `ALL [16]`), 4-col gap-0 hairline grid, cards
  (13.33px padded 4:3 image + meta `INSIGHTS | 31 JULY 2026` mono 10 + title 20/700 caps + excerpt
  11.67); hover = image scale 1.1 + **orange multiply overlay** + corner `+` marks + title→orange.
- **About:** big-statement blocks (40/600 caps), team grid 2-col gap-0 hairline cards (photo in
  padded hairline frame + caps name/role row), investors logo strip.
- **Cross-page:** fixed header everywhere; identical footer; CTA block before footer with
  `?sc=` source deep-links; the technical-device inventory of §2.5 recurs on every page.

### 2.7 Mobile 390×844 (measured — 2-c)

- Intro plays (~5.5s % counter); hero h1 **31.76px/600** (desktop 46.67/700 — the fluid root); CTA
  full-width **374×64**; `object-fit:contain` artwork; **zero horizontal overflow**; gutters
  3.2→2.4→1.6rem ladder; problem/why become swipers with pagination dots; **the 500dvh map
  scrolljack is kept on mobile** (rejected for Madarek); 131/265 hairlines survive; ruler removed ≤991.
- Breakpoints: desktop-first **991/767/479** (+ vestigial ≤479, 21 rules). **Defects not to
  inherit:** a 2.12× root-font jump at 767/768 and a tiny-root band just above 991 (5.74px @992) —
  Madarek's ladder stays clamp()-based.
- Touch targets: footer links **28px** (fail), menu items 40px, pricing CTA 43px — Madarek keeps
  the ≥44px floor everywhere. No srcset (same 2000px+ images shipped to phones) — rejected.
- Cookie banner: ACCEPT = orange fill, REJECT = hairline button — the two-button register.

---

## 3. The canonical Madarek token mapping (r305, shipped in `tokens.css`)

### 3.1 Semantic map (light / dark)

| Token (unchanged names) | Light | Dark | Contrast ledger (computed) |
|---|---|---|---|
| `--bg` | `#F6F8FA` blueprint paper | `#282828` charcoal | grounds |
| `--surface` | `#FFFFFF` | `#2E2E2E` | 1.06 / 1.09 step |
| `--text` | `#282828` | `#F6F8FA` | **13.85** / 13.85 AAA |
| `--text-secondary` | `#414140` | `#C9C9C5` | 9.60–10.22 / 7.39–10.48 |
| `--text-muted` | `#626260` | `#B4B4B0` | 5.74–6.11 / 7.09–5.90 |
| `--text-faint` | `#72726F` | `#A2A29D` | 4.53–4.83 (bg/surface only) / 5.75–5.30 |
| `--accent` | `#FA3600` | `#FF5A1F` | 3.53–3.76 UI/large / 3.93–5.58 |
| `--accent-ink` (text) | `#C72E00` | `#FF5A1F` | **5.16**/5.50 / 4.73 |
| `--accent-hover` | `#D92F00` | `#FF6B33` | 4.53+ / 5.20 |
| `--accent-soft` | `#FCE3D9` | `#432015` | tint wells |
| `--accent-strong` | `#A32400` | `#FFC5AE` | 7.02 / 9.72 |
| `--accent-fg`, `--text-on-accent`, `--danger-fg` | `--warm-ink #191918` | `--warm-ink` | **4.69** on `#FA3600` · 5.10 on coral · 5.64/7.81 dark — white (3.76) banned |
| `--primary` / `--primary-fg` | `#282828` / `#FFFFFF` (14.74) | `#FFFFFF` / `--warm-ink` | AAA |
| `--border` / `--border-strong` | `#E0E0DA` / `#C8C8C8` | `#4A4A48` / `#5C5C5A` | decorative tiers |
| `--rule` / `--rule-strong` | `#C8C8C8` / `#C8C8C8` | `#4A4A48` / `#5C5C5A` | construction-line tier |
| `--grid-line` (NEW) | `#B4B4B0` (= reference hairline family) | `#5C5C5A` | **decorative only on light** (1.95); dark muted = 7.09 TEXT |
| `--state-focus-ring-color` | `#C72E00` | `#FF6B33` | ≥3:1 vs every adjacent surface (5.16/5.50/4.48 · 5.20/6.14/4.79/4.32) |
| `--gold` / `--gold-ink` | `#B57438` / `#8F5A28` | `#E0A067` / `#F2B782` | **circular economy:** the demoted r304 copper seat = achievement gold; 3.57 large/deco; ink 5.39 |
| status families | mint `#E3EBE1/#3F8F5C/#1B5430` · yellow `#F5EBD6/#A8750F/#5E420C` · rose=coral `#F9E3DC/#F15534/#8C230A` · sky `#E1E9F0/#4A7FA8/#1F4968` | `#24372B/#84D0A0/#C4EBD2` · `#3B331F/#EFC87B/#F8E3B4` · `#43241C/#FF8E68/#FFC5AE` · `#23313F/#93C2E9/#C9E2F5` | deep-vs-bg ≥4.5 every family both themes; light icon-well deep-on-bg ≥3:1 (6.10–12.55) |
| `--c-coral-*` (NEW aliases) | = peach seat | = peach seat | additive; the coral semantic namespace |
| radius `--r-*` | **2/4/6/8/12/16/20 + pill** | same | squared ladder (reference radius 0) |
| motion `--t-*` | **80/200/400/500/650/900ms** | same | reference register |
| `--ease` / `--ease-in` | `(0.23,1,0.32,1)` / `(0.625,0.05,0,1)` | same | measured curves |
| semantic page/reveal | **400 / 480ms** | same | register-aligned |
| `--chart-1..8` | series 1 = accent; 6/7/8 unchanged ambers | theme-lifted unchanged | ≥3:1 non-text both themes |
| role accents (7) | student `#C72E00` · faculty `#3F9C5F` · dept `#DA6C46` · dean `#8A6FE0` · admin `#5C8FCE` · quality `#D9606C` · owner `#6B665E` | `#FF5A1F`/`#82CB99`/`#F2A07F`/`#B7A0F4`/`#92B4DC`/`#F09BA3`/`#B7B2A6` | all ≥3.0 vs live `--bg` (3.05→3.38 after retints) |

**Compatibility contract kept:** zero token renames/deletions; the entire r304 alias layer
(`--sp-Nx`, `--shadow-sm..2xl`, `--radius-*`, `--st-r-*`, `--fs-base/--fs-4xl`, `--brand`,
`--bg-soft`, `--surface-elevated`, `--text-strong`, headline/label pairs) survives verbatim;
`--c-copper-*` keeps its NAME as the ember family seat. The print light-lock mirrors the new
light palette. Theme-color metas + `syncThemeColor` + CSP pin + `lib/theme.ts` CHROME_BG +
`validate-college-identity` SURFACE_LIGHT re-keyed in the same change.

### 3.2 The fill/label register (the one non-obvious decision)

Raw `#FA3600` cannot carry white labels (3.76) — and the reference never asks it to: Heron's own
buttons are **charcoal-filled with white mono labels** (`rgb(40,40,40)` measured). Madarek's
register therefore mirrors the reference exactly:

- **Primary CTAs:** charcoal slab (`--primary`), white label (14.74:1) — the reference's own recipe.
- **Orange = the signal:** text accents via `--accent-ink #C72E00` (AA), fills only where labels
  are `--warm-ink` (4.69) or the fill is decorative/large (scanline-class devices, selected rings,
  active bars, error chips at ≥18px-equivalent emphasis).
- **Danger:** the coral `#F15534` fill + `--warm-ink` labels (5.10) — the reference's warm
  secondary promoted to the danger seat so the palette rhymes.

---

## 4. Typography & licensing decisions

| Face | License | Verdict |
|---|---|---|
| BT Grotesk (reference display/body) | **Proprietary** (commercial foundry face; Webflow-CDN woff2 only — no OFL file exists in the bundle; foundry attribution bot-blocked, flagged as assumed) | **NOT reusable.** Not self-hosted, not hot-linked. |
| Geist Mono (reference mono) | SIL OFL 1.1 (Vercel, LICENSE verified) | Legal to self-host, **but kept out**: no coverage/a11y gain over the shipped Plex Mono; adds preload budget for zero gain. Documented as available. |
| IBM Plex Sans Arabic 400–700 | SIL OFL 1.1 | already shipped; body incl. Latin runs |
| IBM Plex Mono 400/500 | SIL OFL 1.1 | already shipped; the technical voice (10–12px micro-labels) |
| Alexandria 600/700 | SIL OFL 1.1 | already shipped; display voice |

**Decision:** the Heron *voice* (grotesk + mono pairing, uppercase-free for Arabic, zero tracking)
is carried by the shipped OFL trio; fonts.css face set unchanged (assets.test pins hold). **Archivo**
(OFL) is the documented future addition if a distinct Latin display voice is ever required.
Arabic joining, Western digits (`ar-LY latn`), RTL logical properties: unchanged and verified.

---

## 5. What Madarek adopts vs fixes (reference deltas)

**Adopt:** blueprint-paper/charcoal neutrals; the orange signal with its AA ink/label registers;
technical-grey hairline grammar (`--grid-line`, `--rule` step-up); squared radius ladder; the
0.4s decel motion register + roll-exit curve; charcoal-slab primary CTAs; hairline-matrix pricing
("plan ledger", A2+); flat multiply-blend product framing; mono bracketed-index/coordinate metadata
devices; the two-button fill/hairline register; sticky-filter + hairline dropdown nav language.

**Fix (the reference fails these):** visible focus states (theirs is invisible on forms); ≥44px
touch targets (theirs: 28px footer links); reduced-motion coverage (theirs: 0 rules); no preloader;
no mobile scrolljack; no root-font discontinuity; srcset/responsive images; Arabic proofreading
gate; block-level reveals only; decorative JS (pixel-dissolve mask) rejected.

---

## 6. Files owned & changed by R305-A1

| File | Change |
|---|---|
| `frontend/src/styles/tokens.css` | the re-key (banner, light/dark blocks, squared radii, motion register, role accents, print lock) |
| `frontend/src/styles/fonts.css` | licensing banner (face set unchanged) |
| `frontend/src/styles/base.css` | canon banner (fully token-routed; zero structural change) |
| `frontend/src/styles/unified-parity.css` | re-distilled to r305 (v2) |
| `frontend/src/styles/shared-design-system.css` | radius/motion literals synced |
| `scripts/verify-parity-export.mjs` | 191 pins rewritten; FORBIDDEN 63→133; `#3d3d3d` legitimized |
| `frontend/src/lib/theme.ts` | CHROME_BG → `#F6F8FA`/`#282828` |
| `scripts/validate-college-identity.ts` | SURFACE_LIGHT → `#F6F8FA` |
| `frontend/index.html` | theme-color metas + syncThemeColor → `#282828`/`#F6F8FA` |
| `backend/src/app.ts` | `THEME_BOOTSTRAP_SHA256` recomputed (single hash string) |
| `frontend/tests/unit/assets.test.ts` | meta pins updated; retired pair banned |
| `DESIGN.md` / `AGENTS.md` / `CHANGELOG.md` / `docs/PARITY-EXPORT.md` | canon + contract updates |
| `docs/redesign/r305-heron-reference-spec.md` | this document |
| `docs/redesign/assets/r305-heron/` | reference evidence screenshots (§11) |

Not touched (other R305 workstreams): button/motion implementation, landing markup, AppShell,
role pages, API contracts, backend logic.

---

## 7. Gate results (actual)

| Gate | Result |
|---|---|
| `node scripts/verify-parity-export.mjs` | **PASS — 191/191** (baseline was **red 76/190**) |
| `bash scripts/check-colors.sh --strict` | PASS (22 documented allows) |
| `bash scripts/check-raw-css.sh --strict` | PASS (37 spacing allows; TSX inline 0) |
| `bash scripts/check-motion-tokens.sh` | PASS |
| `bash scripts/check-icons.sh` | PASS |
| `bash scripts/check-csp-hash.sh` | PASS (recomputed pin) |
| frontend vitest suite / typecheck / build | see the commit message for the measured numbers at ship time |

**Known gate blind spot (documented):** gate 2 (undefined-var) audits the export pair only — a
canonical token deleted while a *consumer* still references it is CI-invisible. The R305 review
caught exactly this class (the `--fs-md/--fs-lg/--fs-xl` aliases) by hand; they are restored, and
the name-set diff (origin/main vs worktree) is now empty — zero deletions, additions only
(`--grid-line`, `--c-coral-*`, `--r-3xl`).

## 8. Verification engine

The WCAG 2.1 engine used for every ratio (and the binary searches that fixed `#D92F00`/`#C72E00`
as the light ink floor) ships with the R305-A1 evidence set; its numbers self-validate against the
inline math historically documented in `tokens.css` (Δ ≤ 0.02 on every reproduced claim).

## 9. Unknowns (honest gaps)

1. `home-platform` / `home-why` exact inner anatomy (screenshots degraded mid-session; patterns
   inferred from the shared product-page components — flagged approx in the section map).
2. Intro's exact desktop duration + exit easing (mobile ≈5.5s measured; desktop 3–6s approx).
3. BT Grotesk's foundry license text (foundry site bot-blocked); the proprietary conclusion stands
   either way — no OFL file exists in the bundle.
4. `#F6F8FA` itself: **zero hits in the reference bundle** (the brief's value; the live ground is
   `#FAFAFA`/`#FFF`). All ratios were verified on BOTH — the token keeps the briefed value as
   Madarek's canonical ground, documented as such.
5. GSAP scroll-trigger timings (bundled JS, not CSS-measurable) — scroll choreography is
   Madarek-engine territory (A2+) and is specified as behavior, not ms-precision.
6. Nav dropdown active-cell persistence beyond the open state (hover-only vs sticky) unverified.

## 10. Screenshot index

See `docs/redesign/assets/r305-heron/` (§11 manifest) — intro stages, settled hero, nav dropdown,
hover/focus states, statement/manifesto sections, usecase accordion, map frame, dashboard/chat/pricing/
resources/about/contact captures, and the 390×844 mobile set incl. the open menu.
