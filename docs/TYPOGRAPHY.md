# TYPOGRAPHY — «مدارك» the Arabic-first type system

**Owner:** Agent 3 (design system) · **Round:** R366 · **Status:** BINDING.
The tokens live in `frontend/src/styles/tokens/tokens.css` (raw ladder +
`--type-*` roles); the faces in `frontend/src/styles/fonts.css`; the
numeral/date seats in `frontend/src/utils/numbers.ts`; the copy-length
laws in `docs/DESIGN-COPY-GUIDE-AR.md`. This document is the WHY with
the measured numbers.

---

## 1 · The families (the decision, with numbers)

| Seat | Face | Weights | Why |
|---|---|---|---|
| Body + chrome | **IBM Plex Sans Arabic** (self-hosted, OFL) | 400/500/600/700 (true cuts — no synthetic bold; the family has no 800 anywhere, `--fw-black` resolves 700) | The R322 blind 3-reviewer vote (26.5/30, `audits/evidence/r322/dsys/font-vote.md`); 2 years shipped; the landing's 93.5 % Heron conformance is measured ON it |
| Display (legacy seats) | **Alexandria** (OFL) | 600/700 | The r190 «مدار المعرفة» display voice; R322 re-seats most display onto Plex 500/600 — Alexandria stays wired for its consumers |
| Mono / instruments | **Geist Mono** 400/500 → **IBM Plex Mono** 400/500 (OFL, latin) | — | R313: the reference's own instrument voice (loader %, coordinates, LTR ticks). Arabic runs in mono contexts continue in Plex Sans Arabic per the stack |

**Alternatives evaluated this round (R366, measured — Google-Fonts
arabic subsets, fontTools on the served woff2):**

| Family | arabic woff2 | line box (asc+desc) | variable | Verdict |
|---|---|---|---|---|
| IBM Plex Sans Arabic (current) | 42.8/45.3/45.7/44.3 KB ×4 static | **150.0 %** | no | **KEPT** |
| Readex Pro | 22.3 KB (all weights) | 125.0 % | yes | documented future option (the payload escape hatch) |
| Cairo | 30.2 KB | 187.4 % | yes | rejected — reflows every line box +37 % |
| Rubik | 31.7 KB | 118.5 % | yes | rejected — tight for Arabic UI text |

The switch is rejected on three measured grounds: (1) **line-box
continuity** — every vertical rhythm in the app and the frozen landing
conformance assume Plex's 150 % box; the candidates sit at 118.5–
187.4 %, a full-app reflow; (2) **payload is inside budget already**
(critical path below); (3) the R322 evidence. A variable font would
cut critical bytes ~66 % — recorded as the option if the budget ever
tightens, at the cost of re-conformance.

**Payload (the budget ≤ 120 KB):** first paint preloads exactly TWO
files — `plex-sans-arabic-400-normal-arabic.woff2` (42.8 KB) +
`plex-sans-arabic-600-normal-arabic.woff2` (45.7 KB) = **88.5 KB**
(index.html preloads; the 700 preload is pinned DEAD by
`assets.test.ts`). All other faces load on demand via unicode-range
(arabic/latin split). Total disk 422 KB (18→16 woff2 after this
round deleted the unwired Alexandria-500 pair, 26 KB dead weight).

**The fallback belt (R366):** named LOCAL-only fallback faces carry
the webfonts' exact metrics — `IBM Plex Sans Arabic Fallback`
(ascent-override 108.5 % / descent-override 41.5 % / gap 0 = the
webfont's 150 % box) and `Alexandria Fallback` (96.8/25.1). The
phantom `'Tajawal'` rung (never self-hosted) is retired from the
stacks. Measured font-swap CLS on `/` (Slow 4G + 4× CPU, 390×844,
`scripts/gates/cls-probe.mjs`): **0.0002** (budget 0.02).

## 2 · The scale (tokens — consume the role, never the raw rung)

**Narrative ladder (story pages; fluid rem, Heron's own measured
values):** `--fs-d1` clamp(31.74px, 4.8vw, 5.6rem) = 46.7 @1440 ·
`--fs-d2` → 40 · `--fs-d3` flat 23.3 · `--fs-st` 33.3 @1440 / 22.1
phone. Display weights **400–600 only** (the 800/900 era is over).

**App-density ladder (dashboards/data):** `--fs-app-h1` 28 @1440 /
24 floor · `--fs-app-h2` 20 / 18 · `--fs-app-h3` 16 flat.

**Body:** `--fs-body` max(13px, 1.6rem) ≈ 13.3 @1440 — the **Arabic
13px floor** is a hard law (below it Arabic diacritics and joins
degrade); `--fs-body-lg` 15 (the lead step). **Small/caption:**
`--fs-sm/--fs-xs/--fs-xxs` all 13px (the floor again — nothing ships
below 13 in the sans voice). **Mono:** `--fs-mono-md/sm/xs` with an
**11px mono floor** (loader %, coordinates, button micro-labels).
**Metrics:** `--fs-metric-xl/lg/md` 48/30/24 (KPI values,
tabular-nums).

**Line heights:** `--lh-tight 1.05` (display) · `--lh-snug 1.20`
(headings) · `--lh-base 1.65` (Arabic body — the generous floor;
ascenders/descenders of Arabic script need it) · `--lh-loose 1.85`
(long-form). NEVER `line-height: normal` in new code (the fallback
belt protects the old seats; new seats pin a rung).

**Letter spacing:** `--ls-*` all resolve **0** — NO letter-spacing on
Arabic, ever (cursive joins; the r190 permanent exception). Latin
display runs may use `--ls-display-tight` (−0.02em, landing Latin
only). **Word-spacing:** none shipped (the writing systems in play
don't want it; revisit only with evidence).

**Tashkeel:** never clipped — the line-height floors (1.65 body,
1.20 headings ≥ the 150 % font box at display sizes) are the belt;
`line-gap-override: 0` on the fallback matches the webfont exactly.

## 3 · Numerals, bidi, dates (applied uniformly)

- Digits are **Latin (Western) 0–9** everywhere (`ar-LY-u-nu-latn`
  pinned; `toWestern()` sanitises). Arabic-Indic ٠–٩ never in UI.
- Numbers: comma grouping / dot decimal («2,340» · «61.8%») via
  `formatNum/formatInt/formatPct1`; **`font-variant-numeric:
  tabular-nums` on every tabular surface** (tables, KPI, ledger —
  already in components/layout/admin/colleges sheets).
- Dates «12 مارس 2025» (`formatDate`, ar-LY months); times 24-hour
  «14:30» (`formatTime`, en-GB pattern, Africa/Tripoli); IDs/codes
  mono + `dir="ltr"` + `<bdi>` in mixed runs (the §R325.d table
  register).
- **The mono gutter index (from the reference):** the
  `LedgerPanel/LedgerRow` family — a `dir="ltr"` mono lead column
  («09:00», «W07») at `--fs-mono-sm` with the Arabic title/subtitle
  beside it in the sans voice. This is the ONLY sanctioned mixed-run
  pattern; copy its grammar, don't invent wrappers.

## 4 · Wrapping and truncation

- `text-wrap: balance` on headings (base.css:64), `text-wrap: pretty`
  on paragraphs (base.css:74) — progressive, no cost where unsupported.
- Truncation: single-line ellipsis only at TRUE overflow edges (long
  names in chrome), never mid-sentence in content. Multi-line: the
  `line-clamp` recipes in the domain sheets. **The law: if the user
  needs the words to act, the words are not truncated** — helpers
  carry the full fact behind a tooltip (see the copy guide §6).
- Stress-passed (this round's matrix): long Arabic words
  («التنظيم المؤسسي»), mixed RTL/LTR («CS301 · قواعد البيانات»),
  130 % text scale, 200 % zoom — no clipping, no orphaned diacritics
  (contact sheet docs/redesign/r366/agent3-design-system/shots/CS-TYPE-1.png; numeric proof: scripts/gates/type-stress.mjs — 36 probes, 0 overflow).

## 5 · Hard-coded values (the sweep, R366)

219 `font-size` declarations across the owned sheets: **207 consume a
token (var)**, 12 raw — every one a documented `type-gate: allow`
(reviewed authored literal: the auth masthead display rungs, the
reference's measured 20px in-row form label, the iOS-zoom 16px input
floor, the icon-tile glyph ladder). The ratchet (type-gate) holds
that count; new raw literals need an allow comment in the same commit.
Line-height raws follow the same discipline.

## 6 · What changed this round (R366 changelog)

1. Fallback belt + phantom Tajawal retirement (§1) — font CLS 0.0002.
2. Dead Alexandria-500 pair deleted (−26 KB deploy weight).
3. This document (the scale/numerals/wrapping laws were living in
   code comments + DESIGN.md fragments; now one binding home).
