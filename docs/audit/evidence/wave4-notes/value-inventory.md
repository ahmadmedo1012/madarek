# T4 value inventory — repeated raw values in the non-generated, non-landing style sheets

**Date:** 2026-11-19 · **Branch:** `wip/r368-t8` · **Task:** heron-fidelity plan Task 4 (analysis
half) · **ANALYSIS ONLY — no style sheet was edited by T8-a** (the lead owns every sheet named
below; per the AGENTS law, tokens and shared sheets change only with lead approval).

## Scope and method

- **Surface:** every `.css` under `frontend/src/styles/` **except** `styles/landing/**` (lead-owned)
  and the token sheets `styles/tokens/tokens.css` + `styles/tokens/tokens.generated.css`
  (`motion.css` is scanned as a sheet but its values are the motion-token definitions themselves).
  52 sheets scanned.
- **Method:** comment-stripped, line-based declaration census (inventory-grade; not the r185
  structural parser). Token mapping resolves `var()` chains in the token sheets to their ultimate
  literal (e.g. `--sp-2x → --sp-2 → 8px`), then matches each raw value against that index, per axis
  (a `16px` font-size is not "mapped" by the `--sp-4` spacing token). Colors are normalized
  (hex/rgb/hsl → 6-digit hex, alpha dropped for family matching). Every count below is
  machine-counted; cross-checked against the live gates (`check-colors.sh`, `check-raw-css.sh`,
  `check-motion-tokens.sh` — all green on this tree).

## Headline finding — a scope gap hides the biggest raw cluster

`scripts/check-raw-css.sh` collects its sheets with a **top-level glob only**
(`STYLES.glob('*.css')` — "29 spacing sheets · 27 type/radius sheets" printed on every run), so the
four subdirectory families — `styles/shared/**`, `styles/student/**`, `styles/teacher/**`,
`styles/shell/**` — are **outside the type/radius/spacing gate's enforcement**. Consequence on this
tree:

- `styles/shared/heron-admin-owner.css` carries **17 raw spacing literals that map to existing
  rungs, with zero allow markers** (they would be gate findings if the sheet were in scope):
  `12px ×5`, `6px ×4`, `8px ×3`, `10px ×2`, `20px ×1`, `40px ×1` — plus raw type (`13px ×3`,
  `11px ×1`, `14px ×1`).
- Colors are NOT affected: `check-colors.sh` walks recursively (`rglob`) and the whole tree is
  clean (26 raw color literals outside landing/tokens, every one allow-marked).
- Motion is NOT affected: no repeated raw durations/easings exist outside the token files (the
  only raws are the reduced-motion kill-switch `0s`/`0.01ms` idioms, the `9999s` anti-flash trick
  at `base.css:268`, and motion.css's own RM `80ms` — all deliberate).

The gate itself is lead-owned; this inventory records the gap and the values, and the lead decides
between (a) widening the gate's glob or (b) migrating the values.

## Migration table — repeated raw values (≥3) that map to EXISTING tokens

### Spacing (the `--sp-*` ladder lives in `tokens.generated.css`, source `shared/design-tokens.json`)

| value | count | file:line refs | token | status / note |
|---|---:|---|---|---|
| `12px` | 5 | `shared/heron-admin-owner.css:827, 864, 898, 989, 1044` | `var(--sp-3)` | **UNMARKED** (subdir scope gap) — migration-ready as-is |
| `6px` | 4 | `shared/heron-admin-owner.css:827, 898, 998, 1014` | `var(--sp-1-5)` | **UNMARKED** — migration-ready |
| `8px` | 3 | `shared/heron-admin-owner.css:864, 1030, 1032` | `var(--sp-2)` | **UNMARKED** — migration-ready |
| `16px` | 7 | `shared/brand.css:30, 68, 105, 115` · `shared/design.css:11` · `student/map-live.css:158, 189` | `var(--sp-4)` | all allow-marked: brand/design are specimen sheets that **exhibit the literal rung as data** (not migration targets); map-live's are `var(--sp-4, 16px)` fallback literals ("authored, reviewed") — migrate only if the lead rules fallbacks redundant |
| `24px` | 4 | `shared/brand.css:30, 172` · `shared/design.css:11` · `student/map-live.css:159` | `var(--sp-6)` | same as 16px: specimen data + fallback literals |
| `20px` | 3 | `plates.css:180` · `shared/brand.css:92` · `shared/heron-admin-owner.css:842` | `var(--sp-5)` | plates/brand = specimen allows; the heron-admin-owner one is **UNMARKED** |
| `10px` | 2 | `shared/heron-admin-owner.css:1032, 1044` | `var(--sp-2-5)` | below the ≥3 bar alone but the same unmarked family — listed for the same migration |
| `40px` | 2 | `shared/brand.css:30` · `shared/heron-admin-owner.css:842` | `var(--sp-8)` | same |

**Unmarked-total in `heron-admin-owner.css`: 17 spacing literals → existing rungs** (12/10/8/6/20/40px).

### Color (token source `tokens.css`; `check-colors.sh` is green — every row below is allow-marked)

| value | count | file:line refs | token | status / note |
|---|---:|---|---|---|
| `#000000` | 13 | `legal.css:185, 205, 217, 222, 223, 229, 230, 237, 241` · `player.css:83` · `polish.css:1531, 1532` · `student.css:71` | `--black` (veil family: `--overlay-veil/-deep/-max`) | all 13 deliberate + marked: legal's nine are the **print contract** (PAGES-GAP §7 — white paper / black ink under `@media print`; migrating to `var()` risks unresolved vars in print UA), player's is the true letterbox matte ("the theme ramp must never tint video bars"), polish's two are `mask:` paint (alpha-only coverage), student's is a scrim. **No clean migration — listed because the value maps; the allows are load-bearing, not debt.** |
| `#ed4c1f` | 2 | `admin.css:135, 178` | `--input-focus-signal` | below the ≥3 bar; both allow-marked (the D4-measured mid-rung). Tail note. |
| `#282828` | 2 | `layout.css:474` · `shared/brand.css:144` | `--text` (light) | layout's is the precomputed `rgb(from var(--text) …)` scrim (R319, allow); brand's is specimen data. Tail note. |

### Type (font-size)

| value | count | file:line refs | token | status / note |
|---|---:|---|---|---|
| `13px` | 3 | `shared/heron-admin-owner.css:829, 854, 943` | `var(--fs-sm)` (also `--fs-xs`/`--fs-xxs` = 13px) | **UNMARKED** (subdir scope gap) — migration-ready |

### Radius

| value | count | file:line refs | token | status / note |
|---|---:|---|---|---|
| `0` | 29 | `components.css:521, 1887, 2946, 3378` · `layout.css:409, 594` · `notifications.css:310, 393` · `owner.css:960` · `patterns.css:2434, 2440, 2464, 2498, 3064` · `pdf.css:218, 882, 1013` · `plates.css:126, 214` · `player.css:95` · `polish.css:701` · `shared/research-heron.css:270` · `shell/chrome.css:229` · `shell/sheet-frame.css:191` · `student/heron-schedule.css:102, 151` · `student/lecture-player.css:68, 170` · `teacher/heron.css:786` | the R313 zero ladder (every `--r-*` rung is `0`) | **permitted by policy** — `check-raw-css.sh` RADIUS_FINE includes bare `0`; the whole ladder rides 0 by the R313 ruling. Census only — NOT debt. |
| `50%` | 3 | `components.css:941` · `notifications.css:172` · `patterns.css:1259` | — (circle primitive; `--r-full` is 9999px, not 50%) | permitted by policy (circle primitive). NOT debt. |

## Candidate list — repeated values with NO existing token (propose, do not mint)

The bar: **≥3 occurrences AND ≥3 distinct feature sheets** (specimen sheets — `plates.css`,
`shared/design.css`, `shared/brand.css` — exhibit literal rungs as data by design and are excluded
from the feature count).

1. **`14px` spacing — 15 occurrences across 8 sheets (5 feature sheets). THE candidate.**
   `components.css:553, 3315` · `notifications.css:29` · `student.css:589, 617, 1490` ·
   `student/map-live.css:188` · `shared/heron-admin-owner.css:989` (+ specimen/data:
   `plates.css:112, 144`, `shared/brand.css:57, 92`, `shared/design.css:54, 59, 217`).
   This is the **compact-control padding grade** — the authored pairs 7/14, 10/14, 14/16 — and the
   debt is already acknowledged in-source: `notifications.css:27-29` reads "(no 14px spacing rung) —
   left raw, noted as debt". **Proposal:** a `--sp-3-5: 14px` half-step rung (extends the ladder's
   existing half-step pattern `--sp-0-5` 2px / `--sp-1-5` 6px / `--sp-2-5` 10px; 14 = 3.5 × the 4px
   base). Cross-product evidence: five feature sheets independent of any single feature. The lead
   mints it (tokens live in `shared/design-tokens.json` → generated).
2. **`3px` spacing — 5 occurrences across 4 sheets.** `components.css:2079` · `layout.css:746,
   1341` · `pdf.css:779` · `student.css:396` — all allow-marked micro hairline gaps (scope-chip
   rail, theme-track inset, calendar dot trail, pdf jump-link arrow gap). **Weaker proposal:** an
   `--sp-0-75` rung would formalize it, but the ladder law ("2px is the smallest sanctioned rung;
   below is anomaly" — and 3px is off-grid between 2 and 4) may prefer per-site collapse to
   `--sp-0-5`/`--sp-1`. Recorded as candidate evidence; the lead decides rung vs collapse.
3. **`64px` spacing — 3 occurrences across 3 sheets.** `polish.css:900` · `shell/chrome.css:286`
   (both the bottom-dock clearance: "measured dock 78px at 390px; 64px + rung clears it") ·
   `shared/design.css:11` (fallback literal, specimen). Grid-aligned (16×4) with **no rung between
   `--sp-10` (56px) and `--sp-11` (72px)**; the gate's own header calls it "the 64px header
   constant". **Proposal:** this is less a scale rung than a **named semantic** (bottom-nav
   clearance) — propose a semantic token (e.g. `--dock-clearance`) over an `--sp-10-5` rung; lead
   decides.
4. **`11px` type — 4 occurrences, 1 feature sheet.** `shared/heron-admin-owner.css:1016` (+ specimen
   `shared/brand.css:40, 77, 136`). Sits between `--fs-xxs` (13px) and the mono floors
   (`--fs-mono-sm: max(11px, 1.2rem)` — a floor, not a rung). Only one feature consumer → **below
   the cross-product bar; noted, not proposed.**

**Explicitly NOT candidates** (checked and rejected): `1px` (10× across 5 sheets — the ladder's own
law sanctions 2px as the floor; the sites are deliberate optical hairlines + the `sr-only` clip
idiom at `motion.css:282`); `16px` font-size (4×: `admin.css:146, 170` · `patterns.css:986` ·
`student.css:1571` — all allow-marked **iOS-zoom floors**; Safari zooms `<16px` inputs on focus, so
the literal is the point, and no `--fs` rung equals bare 16px by design); `15px` and `18px`
type/spacing (specimen sheets exhibiting literals as data; `18px` has 0 feature sheets); `7px` (2×,
one sheet — the 7/14 compact grade rides with the 14px candidate); motion values (none repeated
outside the token files).

## What this inventory does NOT cover

- `styles/landing/**` — lead-owned by another lane (the brief excludes it; the R368 T9 CSS-byte task
  owns its consolidation).
- The token sheets themselves (raw values there ARE the tokens).
- TSX inline styles (the spacing gate's r186 axis covers them; 0 findings on this tree).

## Reproduction

The census behind this document was produced by a scratch line-based scanner (kept outside the
worktree — no new repo script); every figure above can be re-derived with:
`grep -rnP '<pattern>' frontend/src/styles --include='*.css'` per row, or by widening
`check-raw-css.sh`'s glob to `**/*.css` (lead-owned) and reading its census — the unmarked
subdirectory literals will appear as findings.
