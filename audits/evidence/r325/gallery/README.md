# /__design gallery — §R325 P2.2 evidence

Route: `/__design` (`frontend/src/pages/DesignPage.tsx` + `frontend/src/styles/r323-design.css`).
Captured from the dev server (`npx vite --port 5210`) with the REAL theme store
(`localStorage['madarek-theme']`), full-page, one file per breakpoint × theme.

| File | Viewport | Theme |
|---|---|---|
| `design-1440-light.png` | 1440×900 | Paper (light) |
| `design-1440-dark.png` | 1440×900 | Ink (dark) |
| `design-768-light.png` | 768×900 | Paper |
| `design-768-dark.png` | 768×900 | Ink |
| `design-390-light.png` | 390×844 | Paper |
| `design-390-dark.png` | 390×844 | Ink |

## Component × state coverage (17 sections, 60 interactive elements swept)

| # | Component / register | States shown |
|---|---|---|
| 01 | Button (primitives/Form) | 8 variants (default·primary·accent·gold·ghost·outline·danger·success) × default; **hover/active/focus-visible forced by the contrast gate**; disabled ×2; loading (aria-busy + spinner); sizes sm/md/lg; leadingIcon; aria-pressed selected toggle |
| 02 | Input · FormField (primitives/Form) | default/placeholder; hint (helper 13px); validation error (signal rule + signal-ink, aria-describedby); disabled; focus-visible forced by gate; select; checkbox; radio (checked state) |
| 03 | Badge × 6 tones (+icon) · Pill | static tones; Pill on/off; interactive Pill (aria-pressed); trailing count; **StatusChip** (r319s register): live/due/done/new/quiet + dueChip(3); **§R325.f chip-dot axis**: hollow/ink/signal (6px `--app-chip-dot`) |
| 04 | Card · MetricCard | Card default/compact (title/subtitle/icon/actions); MetricCard static ×2, navigable onClick (chevron affordance), pressed; **§R325.c hatch-hover target** (`.pat-hatch` at own ink, 120ms register) |
| 05 | Table (§R325.d) | REAL `.table-wrap.sticky` + `.table`: sticky mono uppercase header (dir=ltr), hairline rows, hover row-action reveal, numeric cells (mono/tabular/dir=ltr/end-aligned), `<bdi>` name clip, StatusChip cells; empty register = `.pat-hatch` field + honest line + primary action |
| 06 | ProgressBar · ProgressRing · StatStrip · LedgerPanel/LedgerRow | ProgressBar 72/38 + **zero mark**; ProgressRing ×2 with center; StatStrip 3 cells; ledger panel head (title+tag) + 3 row anatomies (mono lead / leadLabel / tail chips) |
| 07 | Tabs | 3 tabs, roving tabstop, selected (`aria-selected` + `.on`); keyboard contract (arrows/Home/End) is the primitive's own |
| 08 | States family | LoadingState inline (BrandLoader) + minimal (spinner); EmptyState default (+action) + hatch variant; ErrorState (signal rule + 44px retry); **PermissionDeniedState (403 forbidden)**; Skeleton + Kpi/Table/Card/List/Chart/Strip skeletons; raw `.pat-skeleton` |
| 09 | UserAvatar | sizes 44/36/28; neutral ink cell + 2 DB colors through the luminance-gate (#4F8EF7 white ink, #3DD68C flips to dark ink) |
| 10 | PageHeader (§R325.b) | patterns/PageHeader FULL anatomy: breadcrumbs (ChevronLeft, aria-current last) → eyebrow → `[02]` mono index → H1 → description → meta → actions row; SectionHeader (title/description/actions) |
| 11 | AlertRow | 6 tones (brand/amber/red/green/purple/gold) + `unread` modifier |
| 12 | Overlays | Modal (aria-labelledby + aria-describedby, focus trap, Esc); Sheet side=end (drawer register, footer docked); Sheet side=bottom (≤920 dialog register); Dropdown (items + disabled item + separator, aria-expanded/haspopup); Popover (anchored, Esc/outside); Tooltip (hover/focus, 300ms delay) |
| 13 | Toast | the REAL `lib/toast` store × 4 variants (success/info/warning/error — error manual-dismiss) rendered by the app-root ToastStack |
| 14 | Charts (§R325.i) | Sparkline ×2 tones; hairline-axis exhibit (`--app-line-soft` axes, mono dir=ltr ticks, square signal marker); ChartSkeleton |
| 15 | Patterns (§R325.g) | `.pat-hatch` · `.pat-dots` · `.pat-cross` · `.pat-skeleton` + muted-ink variant (currentColor inheritance) + locked-cell `.pat-cross` |
| 16 | Role identity (§R325.m) | 7 seats: pattern swatch (`--app-role-pat-*`) + mono code STU/FAC/DPT/DEA/ADM/QUA/OWN dir=ltr — owner alone carries the signal hatch |
| 17 | Bottom stack (§R325/Y6) | REAL `lib/bottomStack` manager: demo consent banner (base seat, offset 0) + demo FAB (rises above) + real toast layer joining the pile; live `--app-bottom-stack` readout |

## Gates over this surface

- `gate:contrast` (scripts/r323/contrast-gate.mjs): **PASS** — 0 findings;
  `/__design` swept at 1440+390 × light+dark, every interactive in
  default/hover/active/focus-visible, text ≥4.5:1 vs effective background,
  non-empty glyph check.
- `check:colors`, `check:raw-css`, `check:motion-tokens`: PASS.
- Full vitest: 3015/3015 green (239 files).

Known dev-only note: the gallery page keeps 2 H1s (the wordmark + the
PageHeader specimen) — it is a specimen sheet, not an app route; the
app grammar's one-H1-per-route rule applies to app pages.
