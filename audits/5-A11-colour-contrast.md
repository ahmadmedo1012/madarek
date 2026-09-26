# 5-A11 — Colour & Contrast System Audit #2 (Campaign 5 «الحرفة الختامية»)

**Scope:** colour & contrast across the whole app — tokens.css architecture, both themes,
pastel banding rhythm (landing + app bands), chips/badges/status colours, role-accent
surfaces, charts palette, browser surfaces, raw-hex drift.
**Method:** live at http://localhost:5173, playwright (global 1.63, chromium-1243) with a
DOM contrast collector that walks ancestors compositing alpha backgrounds + opacity chains;
reveal protocol (pre-scroll) + reducedMotion reduce + explicit `data-theme` flip per the
A6/A8 lessons. Pixel-truth (PIL) for text-over-photo. CVD math: **Machado et al. 2009
severity-1.0 matrices** (replaces the prior interrupted run's rough LMS approximation —
both run, Machado cited) + ΔE76 pairwise. VLM ×3 (band junctions light/dark, campus
caption) — every VLM claim re-measured; one overstated (see §2).
**Prior-run artifacts:** an interrupted 5-A11 run left 20 probe scripts + 8 data files in
`/tmp/a11-probes/` — all data audited, load-bearing claims re-verified live; its sweep1
landing rows were poisoned by pre-reveal opacity-0 clusters (ratio 1.00 artifacts) — its
own sweep3 protocol fixed that; sweep3 + my v-series are the numbers cited here.
**Probes (mine):** `/home/z/my-project/.agents/tmp/a11-probes/v1-v6` (live verify, CVD,
dark extension, campus pixel ×2, supplementary, notif icons) → data in `/tmp/a11-probes/data-v{1,2,3,5,6}.json` + `campus-*.png`.
**AUDIT ONLY** — zero source edits, zero git ops.

---

## 1. Contrast measurement table (worst 30, current HEAD)

52 surface×theme rows (27 unique surfaces: landing, auth, student ×10, teacher ×4,
admin ×4, quality ×2, owner ×3, colleges/leaderboard/vision/training/community) +
4 mobile rows = **1,445 unique text clusters measured; 7 real sub-AA text rows
(99.5% pass) + the non-text failures below.** Placeholders: **0 fails** (–-text-faint
4.72:1 light / 5.10:1 dark, `opacity:1` undoes Firefox's 0.54 fade — base.css:146).

| # | Ratio | Where (selector @ file:line) | Size/weight | fg → bg | Theme | Verdict |
|---|-------|------------------------------|-------------|---------|-------|---------|
| 1 | **1.09:1** | focus ring on `.landing-final-cta-btn.ghost` (motion.css:52-54 ring + landing.css:1227-1244) | ring 2px | `#F8DDBC` → band `#F2EAD8` | dark | **P1 — invisible ring** |
| 2 | **1.64:1** | focus ring on ghost + primary final-CTA buttons, outside edge = ink band `#191918` | ring 2px | `#5C3416` → `#191918` | light | **P1 — invisible ring** |
| 3 | 1.71:1 | same primary CTA ring vs copper fill inside edge (dark) | ring 2px | `#F8DDBC` → `#E0A067` | dark | P1 (same finding) |
| 4 | 2.82:1 | primary CTA ring vs copper fill inside edge (light) | ring 2px | `#5C3416` → `#B57438` | light | P1 (same finding) |
| 5 | **2.03:1** | `PermissionDeniedState` icon (States.tsx:206) `--warning` on `--warning-soft` | icon 20px | `#D6A330` → `#FCF1CD` | light | **P2-3** |
| 6 | **2.30:1** | chart gold/warning series on white cards — `chartColors().gold` (chartTheme.ts:250) consumed at AdminPages.tsx:202, QualityPages.tsx:387, OwnerGovernancePage.tsx:121 | line 2px / donut slice | `#D6A330` → `#FFFFFF` | light | **P2-4** |
| 7 | 2.30:1 | `.alert.amber .alert-dot` (components.css:632) on surface | dot 6px | `#D6A330` → `#FFFFFF` | light | P2-4 (same root) |
| 8 | **2.53:1** | notif `tone-success` icon well (notifications.css:124) | icon 16px | `#4FA66D` → `#DCF1E2` | light | **P2-3** |
| 9 | **2.57:1** | notif `tone-danger` icon well (notifications.css:123) | icon 16px | `#DD6E78` → `#FCE0E2` | light | **P2-3** |
| 10 | 2.59:1 | `ErrorState` icon (States.tsx:165 inline + polish.css:2119-2122) `--danger` on `--danger-soft` | icon 20px | `#DD6E78` → `#FCE0E2` | light | **P2-3** |
| 11 | 2.69:1 | campus-caption eyebrow worst-case bright photo patch (polish.css:3050-3060, white @ .85 over vignette) — pixel-measured | 12px/600 | white×.85 → photo+vignette | light | **P2-1** |
| 12 | 3.06:1 | notif `tone-accent` icon well (notifications.css:122) | icon 16px | `#B57438` → `#F4E4D2` | light | P2-3 (hair-pass) |
| 13 | 3.19:1 | chart-4 rose series vs white (tokens.css `--chart-4`) | series | `#DD6E78` → `#FFFFFF` | light | P3-3 borderline |
| 14 | 3.35:1 | chart-3 sky series vs white (tokens.css `--chart-3`) | series | `#5C8FCE` → `#FFFFFF` | light | P3-3 note |
| 15 | **3.80:1** | profile completeness % (ProfilePage.tsx:210) `var(--accent)` as text | 12px/600 mono | `#B57438` → `#FFFFFF` | light | **P2-2** |
| 16 | **3.82:1** | `.courses-filter-count` idle pill (student.css:724-730, `opacity:.7` inherit) | 12px/600 | `#84827F` → `#FFFFFF` | light | **P2-1** |
| 17 | 3.89:1 | campus eyebrow average ground (pixel, @1440) | 12px/600 | white×.85 → (84,79,47) | light | P2-1 |
| 18 | 3.92:1 | disabled pagination «السابق» (admin students) | 12px/600 | `#818180` → `#FFFFFF` | light | exempt (1.4.3 inactive) — ≥3 ✓ |
| 19 | **3.52:1** | profile support email (ProfilePage.tsx:307) `var(--accent)` as text | 11px mono | `#B57438` → `#F7F6F3` | light | **P2-2** |
| 20 | **4.28:1** | `.courses-filter-count` on active copper pill (dark) | 12px/600 | `#554230` → `#E0A067` | dark | **P2-1** |
| 21 | 4.48:1 | campus eyebrow @390 (pixel) | 12px/600 | white×.85 → (99,96,37) | light | P2-1 (borderline) |
| 22 | 4.55–4.64:1 | role-accent icons on sidebar cream — student `#3B5BDB` 5.44, owner `#6B7280` 4.64 (light) | icons | — | light | pass (≥3 non-text) |
| 23 | 4.77:1 | owner avatar white initials on `#6B7280` (ink-gated) | 12px/600 | — | both | pass (tightest avatar) |
| 24 | 4.83–4.86:1 | `.notif-item-time` / `.badge` neutral on surface-2 | 11-12px | — | light | pass |
| 25 | 4.86:1 | landing worst chip — `.landing-ai-typing-label` «يكتب…» | 12px | — | light | pass |
| 26 | 5.03–5.44:1 | role-accent icons on active copper pill (worst: faculty dark 3.5→ light 3.39; table shows range) | icons | — | both | pass |
| 27 | 5.04–5.26:1 | chart tick labels `--chart-text` vs bg/surface (both themes 5.04-5.95) | 12px canvas | — | both | pass |
| 28 | 6.98–9.24:1 | all 7 pastel badge pairs (green/amber/red/purple/gold/peach/sky) light; 10.01-10.44 dark | 11px/600 | `-deep` on `-bg` | both | pass (WCAG-pinned) |
| 29 | 8.62–13.46:1 | focus rings on app surfaces (sidebar idle/active, gallery-chip, both themes) | ring | — | both | pass |
| 30 | 9.78–15.02:1 | campus caption main line «منذ 1988 — …» (pixel) | 22-34px/700 | white → vignette | light | pass |

Dark-theme text: **0 fails across all 27 dark rows** (the app's dark remap is
contrast-clean; the only dark failure is the focus-ring P1 + the 4.28 filter-count).

---

## 2. Pastel banding rhythm verdict

**Landing sequence (DOM order, LandingPage.tsx:351-890):** cream hero → cream logos →
cream facts → cream campus → cream features → **band-peach** (#FFE9DC) → **band-lavender**
(#ECE6FA) → cream bento → cream roles → **band-sand** (#F1ECDF) → cream proof →
**band-dark** (flips: `--neutral-900` = ink in light / cream `#F2EAD8` in dark).

- **Rhythm reads as designed in BOTH themes and at 390** (identical DOM order; heights
  change only). VLM ×2 (junction screenshots): "deliberate rhythm", "clean crisp seam,
  no artifacts". Pixel row-profile confirms zero seam gaps/hairlines (hard edge, flush).
- **BUT the peach→lavender pair is adjacent with near-identical lightness**: ΔL = 1%
  (HSL 93% vs 94%) light, 2% (19% vs 21%) dark. The break is carried **entirely by
  hue** (22° → 300°). VLM's claim that the peach is "noticeably lighter" is
  **false** — pixel math: peach lum 0.847 vs lavender 0.813 (Δ 0.034). The junction
  still works (hue flip is strong), but the lightness channel contributes nothing —
  and these are the page's only two adjacent tinted bands (every other band is
  separated by ≥1 cream section).
- **band-dark theme-flip works**: light = ink band + cream text, dark = cream band +
  ink text (the 20-a P0 fix holds); the final-CTA ghost border (55% neutral-50 mix)
  measures 5.87:1 on the ink band. Its *focus ring* does not — see P1.
- **App-wide bands:** no section-band surfaces on app dashboards (SectionAccent /
  `-bg` families are consumed on landing + as icon wells/badges only — census found 0
  band elements on the 5 role dashboards). Wells/badges all pass (§1 rows 24-28).
- **Accent discipline (confetti census):** every app dashboard renders **exactly ONE
  saturated accent hue** (copper 30°) — zero confetti. Landing carries 13 saturated
  colors = the sanctioned 9-family pastel inks (sticker peach/lavender/mint/sky/
  yellow/rose + copper-deep + sand-deep) + the documented macOS traffic dots — all
  inside the design world; copper remains the CTA accent everywhere (hero CTAs, band
  CTAs, final CTA). The one off-palette page is `/vision` (P3-5).

**Verdict: banding rhythm PASSES** (designed rhythm, clean seams, both themes, 390),
with one design note (P3-8): the peach-lavender adjacency leans 100% on hue — a cream
separator (or a lightness step between the two bands) would make the rhythm read as
banding rather than a hue swap.

---

## 3. Status colours verdict

- **Chips/badges:** one consistent grammar app-wide — `-bg` soft ground + `-deep` ink
  (`.badge.green/amber/red/purple/gold/peach/sky`, components.css:485-491): measured
  6.98–9.24:1 light, 10.01–10.44:1 dark. Gallery chips/pills on copper-soft: 8.62
  light / 10.1 dark (C4 21-c chip-contrast fix **verified live**). Active filter pill
  = ink ground + cream text (16.9:1 light) / copper ground + ink (7.9:1 dark).
- **Icon+colour redundancy:** all badges carry text (no colour-only chips found);
  toasts carry icon + title + desc (Toast.tsx:246-247, `VARIANT_ICON` map);
  alerts carry a 6px dot + title (colour redundant with text). **No colour-only
  status anywhere.** ✓
- **BUT the status-ICON ink grammar is split** (P2-3): toasts + `.state-icon-success`
  use `-ink` tokens (correct); `States.tsx` error/permission icons, polish.css
  `.state-error .state-icon`, and all four notif-panel tone wells use the BASE tokens
  → 2.03–2.59:1 in light theme (dark passes 5.9–8.2:1).
- **Notif badge** (notifications.css:472-479, unlayered override): light `#6B2128` +
  white = **11.21:1**, dark `#F09BA3` + `#3D2126` = **6.87:1** — the 21-a both-theme
  ink fix holds. Toasts (CSS contract, no live trigger in seed): `-ink` icon wells +
  `--text`/`--text-muted` copy (notifications.css:375-392) — token-pinned ✓.

---

## 4. Charts palette verdict (chartTheme.ts + tokens.css `--chart-1..8`)

- **Axis/grid:** tick labels `--chart-text` = 5.04:1 (bg) / 5.26:1 (surface) light,
  5.95/5.32 dark — pass. Fading-axis plugin fades gridlines only (decorative). ✓
- **Series vs plot surface (WCAG 1.4.11 3:1):** light — chart-1 copper 3.80 ✓,
  chart-2 mint **3.00 (zero margin)**, chart-3 sky 3.35, chart-4 rose 3.19, but
  **gold/warning `#D6A330` = 2.30 ✗** (P2-4). Dark — all series 7.38-10.38 ✓.
- **Real consumers:** only ONE chart uses the 8-color categorical palette
  (owner AI donut, `chartPalette().slice(0,4)` — OwnerDashboardPage.tsx:115). All
  other charts are semantic (accent/success/gold/warning/danger pairs) or
  single-series accent. chart-5..8 have zero consumers (latent).
- **Colour-blind safety (Machado 2009, severity 1.0):**
  - *Deuteranopia:* **mint~rose ΔE=2.7-2.8** — collapses the owner AI donut's slice
    pair 2/4 AND the quality donut's success/danger pair (QualityPages.tsx:387).
    Full-8 latent: dark chart2~chart4 2.7, chart7~chart8 2.8, light chart1~chart6 7.2.
  - *Protanopia:* milder — worst in-slice pair accent~success ΔE 17-18 ( borderline
    distinguishable); latent full-8: chart4~chart7 6.7-9.4.
  - *Mitigations present:* every ChartFrame ships an sr-only data table + the donuts
    carry legends/percentages — the failure mode is "slices look same-ish", not
    "data unreadable". Severity P3.
- **Dark-theme charts:** palette lifts correctly (all ≥7.38 vs surface), themeKey
  remount verified by the prior run's data (tokens flip with the attribute).

---

## 5. Role accents (5 roles × 2 themes)

- **Pinned values still compute exactly** (live, `--role-accent` on body): student
  `#3B5BDB`/`#7C9BFF`, faculty `#1F8A7C`/`#3CC2B0`, admin `#264653`/`#5C8A9C`,
  quality `#A33A4F`/`#E47186`, owner `#6B7280`/`#A0A6B0` — 10/10 match
  tokens.css:675-690; `token-snapshot.test.ts` **31/31 PASS** (re-run this audit).
- **Role-accented surfaces measured:** sidebar active icon (role-accent) on cream
  4.64–9.67 light / 4.67–7.99 dark; on the copper-soft active pill 3.39–8.1 light /
  3.5–6.0 dark — **all clear the 3:1 non-text floor** (tightest: faculty light
  3.39, admin dark 3.5). Active label text = copper-deep (8.62 light / 10.1 dark) —
  the icon/label two-hue pairing is the designed FR-004 grammar.
- **Avatar ink gating (C4 21-c): VERIFIED** — `avatarInk()` luminance gate
  (primitives/index.tsx:239-290) picks white/#191918; all 5 seeded avatars ≥4.83:1
  both themes (owner 4.83 is the design's documented worst case; admin 4.89).
- **themeColor mapping (C4 21-c): VERIFIED** — course tint rides ONLY as
  `--course-tint` (courseMeta.ts courseTint), consumed exclusively as color-mix
  washes over `var(--surface)` (student.css:761-772 course-hero 7%/12% + border
  22%/35%); course-detail full sweep = **0 fails both themes** (34 clusters each).
  ProgressBar `color` = bar fill on track (decorative; CoursesPage.tsx:205-207).
- **Cross-ref (not re-filed):** A4 P2 — bottom-nav active chrome hard-codes
  `--accent` (polish.css:3714) ignoring role-accent; re-measured: active label is
  `--accent-ink` ✓ but the icon gradient is copper-mixed for student (consistent
  with A4's finding).

---

## 6. Raw-hex drift & flat greys

- **No new debt since C4:** hex-bearing lines outside tokens.css = **118 at HEAD ==
  118 at the C4 close-out commit `985c9cc`** (working tree has zero modified CSS
  files). Occurrence count 156 incl. multi-hex lines; ~22 are live declarations, the
  rest comment-documented WCAG math. 4-A12's count (198) has shrunk via the 21-c
  dead-alias sweep + later waves.
- **Live raw hexes are all documented exceptions:** macOS traffic dots
  (landing.css:531-533), `#fff` on lightbox-close hover (components.css:1570-1572),
  band-scoped `#191918` inks (student.css:1530-1594, "documented raw hex" comments),
  prefers-contrast overrides (polish.css:5327-5329), vision data gradients (P3-5).
- **Flat #888-family greys: ZERO.** No `#888/#999/#777/#aaa` anywhere in styles or
  TSX; no `rgba(0,0,0,*)`-as-text. The neutral ramp is warm-tinted (hue ≈ 60°) per
  taste.md ("secondary text tinted, never flat gray"). ✓
- **Opacity-as-secondary-text:** exactly TWO live cases — `.courses-filter-count`
  `opacity:.7` (P2-1) and the campus eyebrow `.85` (P2-1 pixel). Everything else
  opacity-dims only disabled controls (WCAG-exempt) or authored states
  (`.matrix-cell.is-dim` 0.38 = the filter signal itself).
- **Focus-ring spellings:** canonical `--state-focus-ring-color` everywhere measured
  (the 4-A12 `--focus-ring` legacy spelling survives only as the raw rgba token
  definition + `--focus-ring` consumers in colleges.css were already normalized).

---

## 7. Browser surfaces (both themes)

| Surface | Light | Dark | Verdict |
|---|---|---|---|
| `::selection` | copper 28% + ink `#191918` | copper 28% + sand `#F2EAD8` | ✓ themed (polish.css:5446; live-measured on main + input) |
| `caret-color` | `#5C3416` copper-deep | sand | ✓ themed (inputs measured live) |
| `accent-color` | `auto` (body) | `auto` | inert — every checkbox/radio in the app is `appearance:none` custom-painted (polish.css:1078-1112); the exam radio adds `accent-color: var(--accent)` (components.css:2489). No native control renders. Note only. |
| Scrollbar | `rgba(25,25,24,.16)` thumb, thin | sand-tinted | ✓ global `scrollbar-color` + thin; sidebar has custom 4px webkit thumb; notif list thin ✓ |
| `::placeholder` | `--text-faint` 4.72:1, `opacity:1` | 5.10:1 | ✓ 0 fails in 52-row sweep |
| PDF text-layer selection | copper-bg/copper-deep 8.62:1 | copper-ink/ink 7.87:1 | ✓ (pdf.css:565-583 unlayered pair, code-verified — C4 P2-10 fix holds) |
| Tabular numerals | global `tnum` | ✓ | (A3's canvas-verified tnum still holds — cross-ref) |

---

## 8. C4 hand-off verifications (mandated by this task)

1. **Avatar ink gating (wave 21): VERIFIED** — §5. All 5 seeded avatars ≥4.83:1 both
   themes; gate implementation + contract comment intact (primitives/index.tsx:239+).
2. **themeColor mapping (wave 21): VERIFIED** — §5. Raw hex only as `--course-tint`
   via color-mix washes; course-detail sweep clean both themes.
3. **Chip contrasts (wave 21): VERIFIED** — gallery-chip/pill actives 8.62/10.1:1;
   badge family 6.98-10.44:1. Residual: `.courses-filter-count` (P2-1) is a
   different, unfixed chip family.
4. **4-A12 P2-10 hand-off "notifications.css half-pixel + 10px sizes snapped to
   scale": NOT LANDED (half-done).**
   - The half-pixels `.notif-item-title 13.5px` (notifications.css:135) and
     `.notif-item-desc 12.5px` (:144) are **DEAD** — polish.css:1422-1431
     (overrides layer) re-declares 13px/12px, and live measurement confirms
     rendered 13/12/11px. Cleanup debt remains (misleading dead declarations).
   - `.bottom-nav-item font-size: 10.5px` (:234) is live-but-inert (labels override).
   - **`.bottom-nav-label { font-size: 10px }` at ≤360px (:304) is LIVE and
     sub-floor** — measured 10px rendered at 350px viewport (11px at 390). The
     "snapped to scale" promise did not land for the ≤360 rule.
   - `.notif-panel-title` renders 14px (polish.css:1392) — raw px, off the type
     scale (no 14px step between --fs-body 15 and --fs-sm 13) — P3-6.

---

## 9. Findings register

### P0 — none.

### P1 ×1

**P1-1 — Focus ring is invisible on the landing final-CTA band (both themes).**
- Evidence (live, `el.focus()` computed outline + composited band ground):
  light ghost `#5C3416` on ink band `#191918` = **1.64:1**; light primary CTA
  ring outside-edge 1.64:1 / inside-vs-copper 2.82:1; dark ghost `#F8DDBC` on
  cream band `#F2EAD8` = **1.09:1**, dark primary inside 1.71:1. All < 3:1
  (WCAG 2.4.7 focus-visible / 1.4.11). The ring token is theme-global
  (motion.css:52-54, `--state-focus-ring-color` = copper-deep light / copper-cream
  dark) while the band inverts its ground — exactly the taste.md inverted-ground
  trap ("restate color wherever you restate the token"): the band restates bg +
  text + ghost-border but NOT the focus ring.
- Files: `frontend/src/styles/landing.css:1199-1244` (band + buttons, no
  band-scoped focus rule); ring from `frontend/src/styles/motion.css:52-54`.
- Fix sketch (2 rules in landing.css):
  ```css
  :root:not([data-theme="dark"]) .band-dark :focus-visible { outline-color: var(--neutral-50); }        /* ink band → cream ring */
  [data-theme="dark"] .band-dark :focus-visible { outline-color: var(--neutral-900); }                  /* cream band → ink ring */
  ```
  (or a single color-mix from the ghost-border recipe for a softer take).

### P2 ×5

**P2-1 — `.courses-filter-count`: opacity-dimmed secondary text on chips, fails both
themes.** `student.css:724-730` — `color: inherit; opacity: 0.7` → idle light
`#84827F`-on-white **3.82:1**; active dark composite **4.28:1** on copper. The
taste.md anti-pattern (opacity instead of a tinted ink token) and the exact class
the task predicted ("secondary text on tinted chips"). Fix: drop `opacity`, set
`color: var(--text-muted)` for idle and full-opacity inherit (or
`var(--accent-soft)`) on `.pill.on`. Same family: the campus eyebrow
`opacity:.85` (polish.css:3058) leaves the 12px eyebrow at **3.89:1** @1440 /
4.48 @390 against bright photo patches (pixel-measured; VLM's "comfortably
readable" does not survive the math) — fix: `opacity: 1` (white already sits on
the vignette; ≈ +0.8:1) or bump to `--fs-sm`.

**P2-2 — Accent-as-text on the student profile (light theme).**
`ProfilePage.tsx:210` completeness % `var(--accent)` = **3.80:1** (12px mono) and
`:307` support email `var(--accent)` = **3.52:1** (11px mono on surface-2).
`--accent-ink` exists for exactly this (10.29:1) — the platform's own tokens.css
comment says so. A6 filed the email (still open); the completeness % improved from
A6's 2.3:1 but remains sub-AA. Fix: both `var(--accent-ink)` (dark theme already
passes either way).

**P2-3 — Status-icon ink inconsistency: base tokens where `-ink` is required
(light theme fails 2.03-2.59:1 non-text).** The correct grammar exists in-repo
(toast wells `notifications.css:375-378`, `.state-icon-success`
`components.css:2515-2518`) but: `States.tsx:165` ErrorState icon
(`--danger` on `--danger-soft` = **2.59:1**), `States.tsx:206` PermissionDenied
(`--warning` on `--warning-soft` = **2.03:1**), `polish.css:2119-2122`
`.state-error .state-icon` (2.59:1), and `notifications.css:122-125` notif tone
wells (danger **2.57**, success **2.53**, accent 3.06 hair). Dark passes
(5.9-8.2:1). Fix: swap the four to `-ink` tokens (`--danger-ink`, `--warning-ink`,
`--success-ink`, `--accent-ink`) — 6 one-line changes, mirrors the toast recipe.

**P2-4 — `--warning`/`--gold` as chart series on white plot cards: 2.30:1
(WCAG 1.4.11 fail).** Root: the T3-F4 wave fixed warning/gold *text* via `-ink`
but the base fill/stroke tokens stay `#D6A330` (2.30:1 on `#FFFFFF`); every
light-theme non-text use on a white/surface ground fails. Consumers: the
`/admin/analysis` 3-line chart "مقيَّم" series (`AdminPages.tsx:202`,
`chartColors().gold` — chartTheme.ts:250), the quality-donut warning slice
(`QualityPages.tsx:387`), the governance donut (`OwnerGovernancePage.tsx:121`),
and `.alert.amber .alert-dot` (`components.css:632`, decorative-redundant but
same root). Note tokens.css already solved this exact problem for `--chart-6`
("#A67A22 = 3.71:1", 15-g P2-1) — the fix was never extended to
`chartColors().gold/.warning`. Fix sketch: in `chartTheme.ts` chartColors(),
resolve gold/warning through `--chart-6` (`cssVar('--chart-6')`), and use
`--warning-ink`-tier for the alert dot (or leave dot as documented-decorative).

**P2-5 — Bottom-nav 10px label at ≤360px (4-A12 P2-10 hand-off residue) + dead
half-pixel declarations.** notifications.css:304 renders **10px** (measured at
350px viewport) — below the 11px `--fs-xxs` floor the hand-off promised to snap;
:234's 10.5px base is inert; :135/:144's 13.5/12.5px are dead (superseded by
polish.css:1422-1431 — rendered 13/12 verified live). Fix: `font-size:
var(--fs-xxs)` at :304 (10→11px), delete or snap the dead declarations (cleanup
opportunity 4-A12 already flagged: "half its declarations are dead").

### P3 ×8

**P3-1 — chart-2 mint exactly 3.00:1 on white (zero margin) + chart-4 3.19 /
chart-3 3.35.** tokens.css `--chart-2` `#4FA66D`. Today only donut slices consume
it (slices sit on the card surface); any future line/bar use inherits a
zero-margin 1.4.11. Fix: darken a step (`#4A9A65` ≈ 3.3:1) or document the
boundary like chart-6's comment.

**P3-2 — CVD distinguishability: deuteranopia collapses mint~rose (ΔE 2.7-2.8)**
on the owner AI donut (active 4-slice palette) and the quality donut
(success/danger). Protanopia worst in-slice pair ΔE 17-18 (borderline OK).
Latent full-8 collapses: dark deutan chart2~chart4 2.7 + chart7~chart8 2.8.
Mitigated by legends + sr tables + percentages. Fix sketch: stagger lightness in
the categorical palette (all 8 sit mid-lightness) and/or dash patterns on
multi-line charts (admin analysis).

**P3-3 — Vision ConceptChips: off-palette raw-hex gradients, theme-blind.**
`lib/vision.ts:30-340` (9 gradient pairs `#3DD68C→#3D6BD6`, `#F5A623→#F55353`,
…) + `VisionPages.tsx:30-47` (white glyph, documented literal). Identical in
both themes; white glyph on the green end = 1.88:1 (aria-hidden + adjacent text
labels → 1.4.11-exempt, but weak craft); the neon-gradient family is the
closest thing the app has to taste.md's "AI-purple trap". Documented as
deliberate marketing one-off. Fix sketch (optional): derive stops from the
9-family `-ink` tokens.

**P3-4 — `.notif-panel-title` 14px raw px, off the type scale.**
polish.css:1392 (+ dead copy notifications.css:30). No 14px step exists between
`--fs-body` 15 and `--fs-sm` 13. Fix: `var(--fs-body)` or a label-role size.

**P3-5 — Campus caption eyebrow marginal (see P2-1 second half) — worst-case
bright photo patches 2.69:1 @1440.** Filed under P2-1; listed here for the
count only if the fix wave prefers treating the landing photo case as its own
item (fix belongs to landing.css/polish.css, not student.css).

**P3-6 — Landing banding: peach→lavender adjacency leans entirely on hue
(ΔL 1% light / 2% dark).** §2. Design note, not a defect — VLM reads it as
deliberate, seam is clean. Opportunity: a cream separator or a lightness step
would restore lightness as a rhythm channel (the sand band already differs from
peach/lavender by being 2-3% darker + warmer).

**P3-7 — `accent-color: auto` globally.** Inert today (all controls custom
`appearance:none`), but any future native checkbox/radio/range/`<progress>`
renders browser-blue off-palette. One line in base.css
(`accent-color: var(--accent)`) future-proofs it.

**P3-8 — Admin disabled pagination label 3.92:1 (light).** WCAG-exempt
(inactive control) and ≥3:1; at the 9+ bar a `--text-faint`-tier disabled
recipe (4.7:1) would read better. Lowest priority.

### Cross-refs (filed by siblings, re-verified, not re-filed)
- A4 P2 — bottom-nav active chrome ignores role-accent (polish.css:3714);
  re-measured: label `--accent-ink` ✓, icon gradient copper (student role) ✗.
- A13 P2-5 — bottom-nav-label `line-height: 1` (measured 10px/10px @350 — clips
  Arabic ascenders at the sub-floor size, compounding P2-5).
- A6 P2 — profile email 3.52:1 (= my P2-2, still open).
- A8 — vision page statistics honesty (copy, not colour — mine is only the chip
  palette, P3-3).

---

## 10. Verified-good (do not regress)

1. **Token architecture is exemplary**: dual-theme remap of all 9 pastel families
   + neutrals + status inks, inline WCAG math at every fixed value; the -deep
   on -bg contract holds everywhere measured (badges 6.98-10.44:1).
2. **1,445 text clusters across 52 surface×theme rows: 99.5% pass** — zero
   dark-theme text fails; the C4 waves (text-muted/faint lifts, accent-fg,
   danger-fg, band-dark inversion, chip fixes) all survive.
3. **Avatar ink gating + themeColor mapping + chip contrasts + notif badge +
   PDF selection** — all C4 hand-offs verified live except the 10px residue (P2-5).
4. **Role accents**: 10/10 pinned values compute; icons 3.39-9.67:1 on every
   measured ground; token-snapshot 31/31.
5. **Accent discipline**: 1 accent hue per app page (copper); landing strictly
   the 9-family system; zero confetti, zero flat greys, zero raw-hex growth.
6. **Browser surfaces**: selection/caret/scrollbar/placeholder/tnum all themed
   both themes.
7. **Chart chrome**: tooltip plugin, fading axis, tick ink 5.04-5.95:1, dark
   palette fully lifted, sr-tables + legends mitigate the CVD pairs.
8. **Toast grammar** (CSS contract): -ink wells + text tokens; notif badge
   11.21/6.87:1 both themes.

## 11. Quick wins (ordered)

1. **P1-1** — 2 lines in landing.css (band-scoped focus ring) — keyboard a11y on
   the page's conversion CTA.
2. **P2-3** — 6 one-liners swapping 4 surfaces to `-ink` status icons.
3. **P2-4** — 1 line in chartTheme.ts (gold/warning → `--chart-6`) + alert dot.
4. **P2-2** — 2 lines in ProfilePage.tsx (`--accent-ink`).
5. **P2-1** — 1 line in student.css (drop opacity) + 1 in polish.css (eyebrow
   opacity 1).
6. **P2-5** — 1 line (10→11px @≤360) + dead-declaration cleanup.
7. P3-1/P3-2 — one chart-palette pass (lightness stagger) when charts are next
   touched.

— audit agent 5-A11, Campaign 5. Data: `/tmp/a11-probes/` (data-sweep3, data-v1..v6,
campus-*.png, bands-junction-*.png). Probes: `/home/z/my-project/.agents/tmp/a11-probes/`.
