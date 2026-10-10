# Madarek Design System

> **مدارك** — منصة التعليم الذكي لجامعة الزاوية · the design canon as it ships in code.

This document states the canon as it **ships in code**. Every value below was extracted from `frontend/src/styles/` at the audited tree (r131/r132) — not from specs (those carry plan-time values, kept as archaeology) and not from memory. When this file and `tokens.css` disagree, `tokens.css` wins; file an issue.

---

## 0. Governance — how this system is enforced · الحوكمة

A design reference is gates, not a gallery. Madarek's canon is machine-enforced at five points:

| Gate | Command | What it asserts |
|---|---|---|
| **Parity export** | `node scripts/verify-parity-export.mjs` | **163/163 token checks** — the export pair distills `tokens.css` faithfully; headline pins (night `#070B16`, gold `#E9B44C`, copper `#B57438`, cream `#FBFAF9`, sand `#F2EFE6`) fail loudly if the reference itself drifts. 4 gates: token parity · undefined-var audit (0 broken; 2 sanctioned opt-in hooks) · 43 retired values absent · brace balance. |
| **Motion tokens** | `npm run check:motion-tokens` | No raw motion values outside the canonical token files. |
| **Icon discipline** | `npm run check:icons` | Lucide-only — no other icon source. |
| **Token snapshots** | `frontend` vitest suite | Role-accent hexes pinned per theme (7 roles × 2), drift + route-title + a11y nets. |
| **CI** | `.github/workflows/ci.yml` | 7 jobs: lint · typecheck · build · frontend tests · backend tests · design gates (icons + motion tokens + CSP pins + parity export) · surface drift. |

**What the export pair distills vs what stays outside it:**

| Distilled in the export pair | Stays outside the export |
|---|---|
| Product theme (copper/gold), pastel families, elevation, motion ladder, z-scale, structural recipes — distilled in `frontend/src/styles/unified-parity.css` (canonical export) + `shared-design-system.css` (structural skeleton) | Orbit Ink landing world (`--ln-*`, grain, 42s marquee) — landing-only vocabulary |
| The export pair is a **reference artifact** — not imported by madarek's app; the parity gate diffs it against `tokens.css` so silent drift fails loudly | Role/college accent slots (`body[data-role]`) — madarek-app identity slots, outside the export |
| | Illustration palette (`--ill-*`) — illustration-layer vocabulary |

Full export contract: [`docs/PARITY-EXPORT.md`](docs/PARITY-EXPORT.md). Tokens live in one place: `frontend/src/styles/tokens.css` (values + inline WCAG math + decision history).

**Where the canon lives (style file map):**

| File | Owns |
|---|---|
| `tokens.css` | ALL tokens — primitives, light/dark theme blocks, Orbit Ink `--ln-*`, pastel families, elevation, z, state tokens |
| `fonts.css` | self-hosted Plex subsets (woff2) + `@font-face` declarations |
| `motion.css` | reveal / skeleton / spinner motion grammar, semantic durations |
| `base.css` | element reset, heading styles, reduced-motion belt, autofill/caret polish |
| `components.css` | the component recipes (§5) — buttons, inputs, cards, tables, sheets, dialogs, toasts' kin |
| `layout.css` | sidebar / nav recipes |
| `auth.css` · `notifications.css` · `student.css` | eager remainder — auth-page recipes, toasts/bottom-nav, student-surface patches |
| `polish.css` | overrides layer — the last word on layered surfaces |
| `landing.css` | Orbit Ink world (§1a) — the only place `--ln-*` is consumed at scale |
| `colleges.css` · `owner.css` · `training.css` · `pdf.css` · `player.css` | page-scoped sheets, imported by their lazy pages |
| `unified-parity.css` + `shared-design-system.css` | the **export pair** — reference distillate, not imported by the app (§0, §8) |

(10 eager via `main.tsx` + 6 page-scoped = the 16 in-app sheets; the export pair makes 18 on disk.)

---

## 1. Two worlds — عالمان

Madarek paints **two deliberate worlds**: the Orbit Ink marketing surface and the Notion-flavored product surface. They never mix vocabulary.

### 1a. Orbit Ink — the landing world (الواجهة التعريفية)

Painted identically in **both** `data-theme`s; landing-scoped `--ln-*` tokens. Ink ground, cream type, one lime accent.

| Token | Value | Notes |
|---|---|---|
| `--ln-ink` | `#252A3E` | primary flat ground |
| `--ln-ink-2` | `#1C2032` | darker scene step |
| `--ln-cream` | `#F5F3E7` | primary text — **12.75:1 AAA** |
| `--ln-cream-dim` | `#C9C6B4` | secondary text — **8.26:1 AAA** |
| `--ln-lime` / `--ln-lime-deep` | `#DFEDB2` / `#B9D778` | **the ONE accent** (11.42:1 / 8.82:1) — roster-limited: hero accent word, chapter labels, primary CTA, marquee separators |
| `--ln-violet` / `--ln-violet-deep` | `#7A6BF2` / `#4E2FB8` | accent-2 large-text only / decorative depth only |
| `--ln-line` / `--ln-line-soft` | `rgba(245,243,231,0.14)` / `0.07` | 1px hairlines |
| Landing cards | `rgba(245,243,231,0.03)` fill + 1px line-soft + 20px radius | border-shift hovers, **no lift** |
| Hero headline | `--ln-h1: clamp(44px, 8.2vw, 108px)` · lh **1.04** (mobile 1.12) | the only display-size surface in the family |
| Primary CTA | `min-block-size 46px` **pill** (xl variant 48px) — lime fill, the one lime-filled surface | ghost + text variants stay cream |
| Marquee | `--ln-dur-marquee: 42s` linear, one slow pass (college ring) | spelled only via the token |
| Grain veil | `--ln-grain-op: 0.075` | see §4 |

**Hard rules:** no glass/blur · flat ground + ONE radial (α ≤ 0.12) hero-sky only · pills everywhere · no gradient text, no glows on type.

### 1b. Product theme — copper-on-cream light · gold-on-night dark (هوية المنتج)

| Role | Light | Dark |
|---|---|---|
| ground `--bg` | `#FBFAF9` (neutral-50) | `#070B16` (night indigo) |
| `--surface` / `--surface-2` / `--surface-3` | `#FFFFFF` / `#F7F6F3` / `#F1EFEC` | `#0D1428` / `#121A36` / `#182142` |
| ink `--text` | `#191918` | `#F2EFE6` (warm sand) |
| `--text-muted` / `--text-faint` | `#6E6C65` (**5.04:1**) / `#74706A` | `#8E97B8` (**6.80:1**) / `#7A83A0` |
| accent `--accent` | copper `#B57438` | gold `#E9B44C` (**10.39:1**) |
| accent hover / `--accent-strong` / accent fg | `#9A5F25` / `#5C3416` / `#1A0F06` | `#F5D48A` / `#C9962F` / `#05070F` |
| focus-ring color | `--accent-strong #5C3416` (AA rule) | `--accent #E9B44C` |
| borders `--rule` / `--rule-strong` | `#E9E7E2` / `#D9D6D0` | `#1B2444` / `#263052` |

**9 pastel section families** `--c-{peach,mint,lavender,sky,yellow,rose,sand,grey,copper}-{bg,ink,deep}` — light grounded on cream (e.g. copper `#F4E4D2`/`#B57438`/`#5C3416`, mint `#DCF1E2`/`#4FA66D`/`#1F4F30`), dark **re-grounded on night** (copper `#2C2312`/`#E9B44C`/`#F5D48A`, mint `#0F241C`/`#7FD39A`/`#C9EAD3` …). Status **text** uses the `-ink`/`-deep` tiers (AA); **fills** keep base tokens. Chart palette `--chart-1..8` (copper/mint/sky/rose/lavender + gold/teal/mauve, theme-lifted).

---

## 2. Typography — سلم الحروف

Self-hosted **IBM Plex Sans Arabic 400–700** (no external CDN) · Plex Mono for numerals · Plex Serif italic **sanctioned Latin runs only** (the serif-italic accent was ruled a phantom on Arabic — the platform accent is upright weight + ink).

**Ladder (`--fs-*`):**

| xxs | xs | sm | body | body-lg | h3 | h2 | h1 |
|---|---|---|---|---|---|---|---|
| 11 | 12 | 13 | 15 | 17 | 18 | 22 | 30 |

| Companion scale | Values |
|---|---|
| Metric rungs | **22 / 30 / 44** — `tnum lnum` (tabular + lining numerals) on all three |
| Landing hero | `--ln-h1: clamp(44px, 8.2vw, 108px)` · lh 1.04 — the exception, §1a |
| Display clamps | `--fs-display-md 28–40 … --fs-mega 48–104` — rungs exist; only `-md` has live consumers |
| Line heights | `--lh-tight 1.05` · `--lh-snug 1.20` · `--lh-base 1.65` · `--lh-loose 1.85` |
| Font stack | `--font-sans: 'ibm plex sans arabic', 'tajawal', system-ui, …` — self-hosted woff2 subsets, no external CDN |

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

- **Mono voice:** `--ln-mono = 'IBM Plex Mono' → 'IBM Plex Sans Arabic'` fallback — per character: Latin+digits render mono, Arabic continues in the brand sans (12px / 0 tracking / tabular). Tracking is 0 even on the mono classes: their live runs mix Arabic (ruling #2, r133-F7) and `tabular-nums` carries the alignment role.

---

## 3. Motion canon — قانون الحركة

**Raw ladder (`--t-*`):** `micro 80 · fast 160 · base 240 · slow 380 · slower 520 · cinema 720ms`.
**Semantic:** `page 320 · reveal 360 · stat/spinner 700 · skeleton 1200ms`.
**Ambient loop bands:** `1.6 / 2.4 / 3.6 / 6 / 9 / 22s` — rhythm only, **never** for hover/press.

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

**Grain (Orbit Ink only):** `.ln-grain` — a fixed veil over the whole landing: SVG `feTurbulence fractalNoise` (baseFrequency 0.9, 2 octaves, stitchTiles), white noise α .55, 200×200px repeatable tile, `opacity: var(--ln-grain-op) = 0.075` (single source in `tokens.css` — the old landing-local override was lifted in r132). Sits below native dialog top-layer; `pointer-events: none`. The product surface is **clean** — no grain past `landing.css`.

**Elevation (`--elev-1..5`):**

| Theme | Recipe |
|---|---|
| Light | 2-layer black shadows — `1px 2px 4%` (elev-1) → `32px 64px 12%` (elev-5) |
| Dark | fill-led `0.30 → 0.50` + `inset 0 1px 0` white 4–8% top light |

`--shadow-card ≡ --elev-1`; premium 3-layer variants reserved for primary CTA / KPI hover.

**Z-scale (fixed, never improvised):** `dropdown 100 < popover 200 < tooltip 250 < sheet 300 < modal 400 < toast 500 < lightbox 600`.

**Glass:** `--glass-blur 16px` (surfaces) · `--scrim-blur 4px` (dimming scrims) — **the landing bans glass entirely.**

---

## 5. Component recipes — وصفات المكوّنات (the clone canon, exact)

**Shared primitives every recipe consumes:**

| Ladder | Values |
|---|---|
| Radius `--r-*` | xs **6** · sm **8** · md **10** · lg **12** · xl **16** · 2xl **20** · 3xl **28** · full **9999px** (pill) |
| Spacing `--sp-*` | 4px base — `sp-1` 4 · `sp-4` 16 · `sp-7` 32 · `sp-8` 40 · `sp-10` 56 · `sp-16` 240 |
| Weights `--fw-*` | regular 400 · medium 500 · semibold 600 · bold 700 · `--fw-black` **resolves 700** (Plex has no 800) |

| Component | Recipe |
|---|---|
| **Button** | 40px · 13px (`--type-label-size`) · 600 · r-md 10px · press `scale(.97)` @80 · primary: ink fill (light `#191918` / fg `#FBFAF9`) + sheen `::before` + premium shadow, hover −2px + `--shadow-card-premium-h` · disabled .55 · no letter-spacing |
| **Input** | 44px · `max(16px, 15px)` iOS floor · r-md 10 · focus = accent border + **3px 22% halo** (`--state-input-focus-halo`) + AA `:focus-visible` ring · placeholder `--text-faint` · disabled .6 / not-allowed / surface-2 |
| **Dialog** | `min(560px, 100%)` · r-xl 16 · `--elev-4` · top accent-gradient hairline (3px, inset-inline 30%) · title 22/700 · pop 240ms decel · overlay .40/.62 + fade 240 |
| **Sheet** | `min(420px, 100%)` · r-2xl 20 **leading edge only (logical)** · `--elev-4` · z 300 · 240ms decel slide · scrim blur 4px · grabber |
| **Toast** | **bottom-end** stack (20px inset) · max `min(420px, 100vw − 24px)` · 28px tone-icon well (soft bg + `-ink` icon) · in 240 decel / out 160 accel · swipe-dismiss · z 500 · **error toasts dismiss manually** |
| **Empty state** | `.state-icon` **56×56 grey well** (`--c-grey-bg`/`-deep`, r-xl) · icon 20 · title **18px / 700** · desc 13 muted 42ch · actionable default copy · opt-in 160px illustration |
| **Sidebar** | 256px (64 collapsed) · item min-30px · r-sm 8 · active = wash bg + **3×16px role-accent bar at inline-start −3px** + 240ms pop · night: gold wash + constellation gradients |
| **KPI card** | min-block **132px** · value **30px / 700 `tnum lnum`** lh 1.10 · label 12/600 muted · icon well **44px** r-lg + 1.5px role-accent rim (30%) · hover −2px |
| **Table** | wrap r-xl + rule border · thead **11px** / 600 / muted / UPPERCASE on **surface-2** · body 13px · **zebra-on-hover** (`tr:hover → surface-2`) — hover shift, *not* static stripes · last row borderless · pagination 44px targets |
| **Spinner** | 22px · 2px · accent top arc · **700ms linear** (sm 14px) |
| **Skeleton** | `--motion-duration-skeleton 1200ms` · `--ease-linear` · RTL-aware shimmer · r-sm |
| **Badge/status** | solid pastel · 11 / 600 · `tnum` (`-bg` ground + `-deep`/`-ink` text) |

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

- **Themes:** light default + `[data-theme="dark"]` — both fully specified (§1b); no "auto-only" surface.
- **Role accents:** `body[data-role]` — 7 roles × 2 themes, hexes **pinned by token-snapshot tests**; college accent slot carries a runtime contrast gate.
- **Contrast tiers:** status/badge text always uses the `-ink`/`-deep` tier of its pastel family (AA); fills keep base tokens. Light-mode icon wells use the **`-ink` tier** (r131 hardening: 6.98–9.02:1; dark untouched).
- **`prefers-contrast: more`:** elevations become rings, borders strengthened, glass de-blurred, illustration strokes 1.5 → 2.
- **Focus rings — two worlds:** product = universal `:where()` 2px/2px ring in `--accent-strong` (light) / gold (dark); **Orbit Ink landing = 2px `--ln-cream` outline, offset 3px** on every `.landing :focus-visible`, with the primary CTA swapping its ring to `--ln-ink` (deliberate sub-language, never mixes with the product ring).
- **Reduced motion:** full kill-belt in `base.css` + token zeroing (§3) — motion never survives RM; direction mirroring does.

---

## 8. Rules for evolving the system — قواعد تطوير النظام

1. **Consume tokens and roles, never literals** — `var(--accent)`, `--type-body-*`, `--elev-1`, `--t-base`; hex/px literals belong only in `tokens.css`.
2. **Extend at the composition layer only** — new surfaces compose existing tokens/primitives; the token files are closed for casual edits (gate-protected).
3. **The export pair (`unified-parity.css` + `shared-design-system.css`) is the verification surface, not a file to import** — the app consumes `tokens.css` / `motion.css` / `components.css` directly. See [`docs/PARITY-EXPORT.md`](docs/PARITY-EXPORT.md).
4. **What the export covers:** §1b product theme, §2 typography, §3 motion, §4 elevation, §5 recipes, §6 RTL, §7 a11y. **What it excludes:** Orbit Ink (`--ln-*`), role/college accent slots, `--ill-*`.
5. **Drift is a bug** — the parity gate fails loudly on any divergence between `tokens.css` and the export pair; fix the canonical source first, never hand-patch the export.

---

*Decision history and WCAG derivations live inline in `frontend/src/styles/tokens.css` (the authored source). Process archaeology lives in `specs/`; the historical SpeckKit draft lives in `docs/archive/MASTER.md` (superseded, archived at r137).*
