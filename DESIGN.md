# Madarek Design System

> **مدارك** — منصّة تعليم ذكي مستقلّة عربية-أولًا · the design canon as it ships in code.

> **R191 «رحلة المعرفة»** (the current direction): R190 established the Turion-derived *tokens* (teal accent — light `#027380` · dark `#2FB6C6`, both AA-verified; was electric-violet until the r195 re-key; **Alexandria** display voice; near-square radius ladder 2–6px; the `--stage-*` void family; Plex Mono micro-labels). R191 adds what the operator actually demanded — the reference's **observed mechanics**: a scroll-choreography engine (`useScrollStage` — one rAF-coalesced `--sp` per stage, zero React renders per scroll tick; CSS calc derives every motion), a **pinned 700vh mega-stage** (radial knowledge map SVG + six crossfading narrative scenes + capability bar + scroll-bound rotation), a **pinned honest stat march** (numbers computed from the code), **parallax vision + quote + footer wordmark** layers, and the reference's measured **mobile/reduced-motion strategy** (no pinning — frames stack in flow, every scene readable). Copy gates: the operator-rejected wording («صُنعت في ليبيا», «ما يُشحن اليوم») is pinned OUT of every user-facing surface (`r168b`). Full measurements + mapping: `docs/design/r191-turion-fidelity-spec.md` · R190 analysis: `docs/design/r190-reference-matrix.md`.

> **R195 (egn.university re-key)**: the palette re-keys to the egn reference — light accent `#027380` / dark accent `#2FB6C6`, cool-gray ramps (light ground `#F7F7F7` · ink `#333333`; dark ground `#0A0A0A` · ink `#F2F2F2`); every violet/cream/indigo value quoted below is retired (pins + export pair re-synced in the same change).

> **R196 REDESIGN DIRECTION (locked — supersedes R190/R191/R195 reference choices for all future design work)**: the product enters a full visual redesign. **Homepage = OPTIKKA principles** (two-surface composition, chapter structure, scroll-driven state handover via sticky+IO+the existing rAF engine — never its assets, wording, colours, or heavy libs); **every other page = current Superlist principles** (single-signal hierarchy via surface steps, one-shadow-per-level, large-type sheets, flat framed product imagery — never its anti-patterns: no reduced-motion, UA-default focus, PNG heroes). **Turion Space, Evergreen Nexus University and the egn/teal «stage void» system are retired** — the r190/r191 reference mappings and the r195 egn re-key remain valid only as historical canon until re-keyed. Locked token TARGETS (contrast-verified, to be shipped by 1A): paper `#F3EEE4` / ground `#FBFAF7` / ink `#16140F` / ultramarine signal `#2E45E6` (AA 5.84–6.47 on light grounds; fills keep `#FFFFFF` labels at 6.75) / dark: paper `#16140F` · ground `#201D17` · ink `#F3EEE4` · signal-text `#8E9BFF` (7.26/6.63) / gold `#B57438` light-only decorative (3.29) with `#8F5A28` for AA text; dark gold `#D9A05B`; gold = achievements only; ultramarine = the only accent. Radius ladder 4/6/8/10/14/16/pill. Arabic type floor 13px, zero negative tracking, display lh 1.15–1.3, body 1.6–1.7. Tap targets ≥44px. Western digits everywhere (ar-LY latn, unchanged). Honest-copy gates (r168b/r177/r188) are permanent — «صُنعت في ليبيا» and «ما يُشحن اليوم» stay banned in all user-facing surfaces and identity copy. Binding plan, family ownership split, pinned-test risk table and per-prompt corrections: `docs/redesign/BLUEPRINT.md`.

This document states the canon as it **ships in code**. Every value below was extracted from `frontend/src/styles/` at the audited tree (r131/r132) — not from specs (those carry plan-time values, kept as archaeology) and not from memory. When this file and `tokens.css` disagree, `tokens.css` wins; file an issue.

---

## 0. Governance — how this system is enforced · الحوكمة

A design reference is gates, not a gallery. Madarek's canon is machine-enforced at six points:

| Gate | Command | What it asserts |
|---|---|---|
| **Parity export** | `node scripts/verify-parity-export.mjs` | **165/165 token checks** (163 before the r185 half-rung pins) — the export pair distills `tokens.css` faithfully; headline pins (r195 egn re-key: night `#0A0A0A`, teal `#027380`/`#2FB6C6`, light ground `#F7F7F7`, ink `#333333`/`#F2F2F2` — the r195 palette swap updated pins + export pair together, documented in the CHECKS table) fail loudly if the reference itself drifts. 4 gates: token parity · undefined-var audit (0 broken; 2 sanctioned opt-in hooks) · 42 retired values absent (r195: `#2A2A2A` legitimized as the canonical dark hairline) · brace balance. |
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
| Stage ground | `--stage-ink #0E0E0E` · `--stage-ink-2 #171717` | the void under the hero/chrome, BOTH themes (a media surface, not a theme rebellion — AA-verified pair below) |
| Stage text | `--stage-cream #FFFFFF` (18.9:1) · `--stage-cream-dim #B3B3B3` (8.7:1) | the stage's own ink pair (r195: the cream text values died with the cream) |
| Stage accent | `--stage-accent #2FB6C6` (8.1:1) | the dark-theme accent value, fixed on the stage (r195 rename: was `--stage-violet`) |
| Stage edges | `--stage-line` / `--stage-line-soft` | white-alpha hairlines (16%/7%) |
| Atmospheric stops | `--aura-accent` / `--aura-accent-deep` / `--aura-horizon` (per theme) | the radial-illumination vocabulary for hero/proof/CTA scenes (r195 rename: was `--aura-violet`) |
| Original art | `/brand/hero-scene.webp` (95 KB) · `/brand/orbit-ring.webp` (66 KB) | AI-art-directed abstract scenes — no text, no logos, no real-place imagery (QA-verified); the r188 photography ban's intent (no real-university imagery) holds |
| Orbit path | `components/landing/OrbitPath.tsx` | one thin trajectory line + one glowing node, drawn once on load (reduced-motion static) — the icon-gate's documented landing-scene zone |
| Telemetry strip | mono 11px + 7px teal square markers | honest counts computed from the LEDGER data (never typed) |
| Body sections | canonical `var(--bg)`/`var(--text)`/`var(--rule)` + `--accent` | stations/roles/manifesto/media/footer follow the active theme — the two-theme system, same as the product |
| Focus | ONE language, token-routed | `.fo-header/.fo-hero/.fo-mobile-menu { --state-focus-ring-color: var(--stage-accent); }` — the universal outline (base.css) consumes the re-pointed token; zero private outline rules in landing.css (the r172a contract holds, re-pinned r162 test) |
| Progress ribbon | `transform: scaleX(var(--p, 0))` + `--accent` (stage-routed) | GPU-composited; the `--accent` token resolves to its stage expression inside `.fo-progress` |
| Proof section | teal band + 22px dot matrix at 12% accent | «ما يُشحن اليوم» — the reference's «Operating today» moment, honest statuses only |

### 1b. Product theme — teal-on-gray light · teal-on-night dark (هوية المنتج، r195)

| Token | Light | Dark |
|---|---|---|
| accent `--accent` | teal `#027380` (**4.64:1**) | teal `#2FB6C6` (**8.1:1**) |
| accent ink `-ink` | `#014A52` (9.06:1) | `#2FB6C6` (8.1:1) |
| accent soft | `#E0F2F3` | `#174A52` |
| accent strong / ring | `#014A52` (9.06:1) | `#7FCED9` (11.1:1) |
| accent on-fill `-fg` | `#FFFFFF` (AA on teal) | `#061417` (7.7:1 on teal) |
| primary `--primary` | ink slab `#333333` (the reference's light-section CTA) | **white slab `#FFFFFF`** (the void CTA) |
| achievement family | `--gold` = copper/yellow inks (badges, streaks, gamification) | same — copper/gold is NO LONGER the chrome accent (r190) |

**9 pastel section families** `--c-{peach,mint,lavender,sky,yellow,rose,sand,grey,copper}-{bg,ink,deep}` — light grounded on near-white gray (r195: e.g. copper `#ECE4D2`/`#9A7438`/`#5C3416`, mint `#E0F2F3`/`#027380`/`#014A52`), dark **re-grounded on the egn night** (copper `#2A2313`/`#D8AE5C`/`#F0D89C`, mint `#0E2324`/`#2FB6C6`/`#7FCED9` …). Status **text** uses the `-ink`/`-deep` tiers (AA); **fills** keep base tokens. Chart palette `--chart-1..8` (**teal** (r195: series 1 = the accent) /mint/sky/rose/lavender + gold/teal/mauve, theme-lifted) — data points render as SQUARE markers (chart.js `pointStyle: 'rect'`, r190) and bars at 2px radius.

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

- **Mono voice:** `--font-mono = 'IBM Plex Mono' → 'IBM Plex Sans Arabic'` fallback — per character: Latin+digits render mono, Arabic continues in the brand sans (11px telemetry / 12px chrome / 0 tracking / tabular). Tracking is 0 even on the mono classes: their live runs mix Arabic (ruling #2, r133-F7) and `tabular-nums` carries the alignment role.

---

## 3. Motion canon — قانون الحركة

**Raw ladder (`--t-*`):** `micro 80 · fast 160 · base 240 · slow 380 · slower 520 · cinema 720ms`.
**Semantic:** `page 320 · reveal 360 · stat/spinner 700 · skeleton 1200ms`.
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
| Eases | standard `(0.4,0,0.2,1)` · decelerate `(0.16,1,0.3,1)` · accelerate `(0.7,0,0.84,0)` · soft/emphasized `(0.22,1,0.36,1)` |
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
| Radius `--r-*` | xs **6** · sm **8** · md **10** · lg **12** · xl **16** · 2xl **20** · 3xl **28** · full **9999px** (pill) |
| Spacing `--sp-*` | 4px base — `sp-1` 4 · `sp-4` 16 · `sp-7` 32 · `sp-8` 40 · `sp-10` 56 · `sp-16` 240 · half rungs `sp-0-5` **2** · `sp-1-5` **6** (r153h) · `sp-2-5` **10** (r185) — the floor is 2px; below it is optical territory (documented allows, not rungs) |
| Weights `--fw-*` | regular 400 · medium 500 · semibold 600 · bold 700 · `--fw-black` **resolves 700** (Plex has no 800) |

| Component | Recipe |
|---|---|
| **Button** | 40px · 13px (`--type-label-size`) · 600 · r-md 10px · press `scale(.97)` @80 · primary: ink fill (light `#333333` / fg `#FFFFFF`) + sheen `::before` + premium shadow, hover −2px + `--shadow-card-premium-h` · disabled .55 · no letter-spacing |
| **Input** | 44px · `max(16px, 15px)` iOS floor · r-md 10 · focus = accent border + **3px 22% halo** (`--state-input-focus-halo`) + AA `:focus-visible` ring · placeholder `--text-faint` · disabled .6 / not-allowed / surface-2 |
| **Dialog** | `min(560px, 100%)` · r-xl 16 · `--elev-4` · top accent-gradient hairline (3px, inset-inline 30%) · title 22/700 · pop 240ms decel · overlay .40/.62 + fade 240 |
| **Sheet** | `min(420px, 100%)` · r-2xl 20 **leading edge only (logical)** · `--elev-4` · z 300 · 240ms decel slide · scrim blur 4px · grabber |
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

*Decision history and WCAG derivations live inline in `frontend/src/styles/tokens.css` (the authored source). Process archaeology lives in `specs/`; the historical SpeckKit draft lives in `docs/archive/MASTER.md` (superseded, archived at r137).*
