# Phase 1 — Data Model: Visual Uplift

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)

Composition layer; no database tables. The "data" is design data —
type-role tokens, chart-palette tokens, the `<ResponsiveTable>`
column-and-row schema, and the audit route list.

---

## 1. Type-Role Token

A named, semantic typographic role. Bundles font + size + weight +
line-height + letter-spacing. New code MUST consume roles, not raw
`--fs-*`.

### Fields

| Field          | Type               | Required | Notes |
|----------------|--------------------|----------|-------|
| `name`         | string             | yes      | `--type-<role>-*`. |
| `role`         | enum               | yes      | `display | headline | body | label | metric` |
| `size`         | CSS length         | yes      | Resolves to `--fs-*` raw token. |
| `weight`       | 400 / 500 / 600 / 700 / 800 | yes | Pinned per role. |
| `lineHeight`   | unitless           | yes      | 1.05 / 1.20 / 1.50 / 1.65. |
| `letterSpacing`| em                 | yes      | -0.032 / -0.022 / -0.012 / 0 / 0.06. |

### Required Records

**Display** — hero headlines, marketing-page titles only.

| Token                       | Value                                |
|-----------------------------|--------------------------------------|
| `--type-display-size`       | `var(--fs-display-xl)` / `--fs-display-lg` |
| `--type-display-weight`     | `800`                                |
| `--type-display-line-height`| `1.05`                               |
| `--type-display-letter-spacing` | `-0.032em` (`--ls-mega`)         |

**Headline** — page titles, section titles.

| Token                        | Value                |
|------------------------------|----------------------|
| `--type-headline-size`       | `var(--fs-h1)` / `--fs-h2` |
| `--type-headline-weight`     | `700`                |
| `--type-headline-line-height`| `1.20`               |
| `--type-headline-letter-spacing` | `-0.012em`       |

**Body** — paragraphs, descriptions, prose.

| Token                     | Value             |
|---------------------------|-------------------|
| `--type-body-size`        | `var(--fs-body)` (15 px) |
| `--type-body-weight`      | `400`             |
| `--type-body-line-height` | `1.65`            |
| `--type-body-letter-spacing` | `0`            |

**Label** — form labels, KPI labels, captions.

| Token                      | Value             |
|----------------------------|-------------------|
| `--type-label-size`        | `var(--fs-sm)` (13 px) |
| `--type-label-weight`      | `500`             |
| `--type-label-line-height` | `1.50`            |
| `--type-label-letter-spacing` | `0.02em`       |
| `--type-label-text-transform` | `none` (no caps)|

**Metric** — KPI numbers, big stats, counters.

| Token                       | Value                  |
|-----------------------------|------------------------|
| `--type-metric-size`        | `var(--fs-metric-lg)` (30 px) |
| `--type-metric-size-large`  | `var(--fs-metric-xl)` (44 px) |
| `--type-metric-weight`      | `700`                  |
| `--type-metric-line-height` | `1.10`                 |
| `--type-metric-letter-spacing` | `-0.022em`           |
| `--type-metric-feature-settings` | `'tnum' 1, 'lnum' 1` |

### Validation Rules

- A role's pinned weight MUST be the same value across every breakpoint.
- New code referencing raw `--fs-*` outside `tokens.css`/`motion.css`/
  the listed legacy stylesheets is permitted during gradual migration
  but flagged in the type-system audit.
- Renaming any role token is a breaking change.

---

## 2. Chart-Palette Token

The categorical palette consumed by `chartPalette()` in
`chartTheme.ts`. Eight colors, documented order.

### Fields

| Field        | Type   | Required | Notes |
|--------------|--------|----------|-------|
| `name`       | string | yes      | `--chart-<n>` |
| `index`      | 1..8   | yes      | Cycle order. |
| `value`      | hex    | yes      | AA-checked against `--surface`. |
| `purpose`    | string | yes      | Documented semantic intent. |

### Required Records

| Token        | Index | Value     | Purpose / Common use |
|--------------|-------|-----------|----------------------|
| `--chart-1`  | 1     | `#B57438` | Primary / amber series (existing) |
| `--chart-2`  | 2     | `#4FA66D` | Success / green series (existing) |
| `--chart-3`  | 3     | `#5C8FCE` | Info / blue series (existing) |
| `--chart-4`  | 4     | `#DD6E78` | Warning / coral series (existing) |
| `--chart-5`  | 5     | `#8A6FE0` | Tertiary / purple series (existing) |
| `--chart-6`  | 6     | `#E8B547` | Gold accent series (NEW) |
| `--chart-7`  | 7     | `#3F8B8B` | Teal series (NEW) |
| `--chart-8`  | 8     | `#A65D8A` | Mauve series (NEW) |

### Cycle Rule

Series index `i` (0-based) → palette index `(i % 8) + 1`. Documented
in `contracts/chart-theme.md` so consumers don't reorder per-chart.

### Validation Rules

- AA contrast verified for each color against `--surface` (light theme).
- Each color verified against `--surface` (dark theme) at build.
- The 8 colors are perceptually distinct at adjacent positions
  (1↔2, 2↔3, …) at 8 px swatch size.

---

## 3. ResponsiveTable Schema

Runtime configuration for the `<ResponsiveTable>` primitive.

### Fields

| Field                   | Type                         | Notes |
|-------------------------|------------------------------|-------|
| `columns`               | `ColumnDef<R>[]`             | required |
| `rows`                  | `R[]`                        | required |
| `getRowKey`             | `(row: R) => string`         | required |
| `mobileBreakpoint`      | string (CSS media query)     | default `(max-width: 767px)` |
| `mobilePrimary`         | column id                    | column rendered as the row's title in card-list mode |
| `mobileSecondary`       | column id                    | column rendered as the supporting line |

`ColumnDef`:

| Field         | Type                 | Notes |
|---------------|----------------------|-------|
| `id`          | string               | stable key |
| `header`      | string \| ReactNode  | localized header label |
| `align`       | `start` / `center` / `end` | content alignment |
| `tabularNums` | boolean              | true for digit columns |
| `cell`        | `(row: R) => ReactNode` | renderer |

### Behavior

- ≥ 768 px: renders as `<table>` with `<thead>`/`<tbody>`.
- < 768 px: renders as `role="list"` of `role="listitem"` cards. Each
  card uses `mobilePrimary` as the title and stacks remaining columns
  as label:value pairs. ARIA reading order is: row title → other
  fields top-to-bottom.
- Sticky header on desktop.
- Honors the existing `Skeleton` primitive's `list-row` variant for
  loading states.

### Validation Rules

- `mobilePrimary` and `mobileSecondary` MUST refer to existing column
  ids.
- Numeric columns SHOULD set `tabularNums: true`; the primitive applies
  the canonical `.tabular-nums` utility automatically.
- No row count cap — performance budget verified at consumption time
  (large tables can opt into pagination separately).

---

## 4. Audit Route Manifest

A static list of representative routes the Playwright audit walks.

### Fields per Route Entry

| Field        | Type             | Notes |
|--------------|------------------|-------|
| `id`         | string           | stable identifier (`student-dashboard`) |
| `path`       | string           | route path (`/student/dashboard`) |
| `auth`       | enum             | `none` \| `student` \| `teacher` \| `admin` \| `dean` \| `quality` \| `owner` |
| `description`| string           | human-readable purpose |
| `breakpoints`| number[]         | overrides (default `[360, 768, 1280, 3840]`) |
| `directions` | string[]         | overrides (default `['ltr', 'rtl']`) |

### Initial Manifest (~25 entries)

Full list lives in `frontend/tests/visual/routes.ts`. Categories:

1. **Public** (3): `/`, `/auth`, `/register`
2. **Student** (6): dashboard, courses, library, course detail, profile, exam taker
3. **Teacher** (4): intelligence, offering detail, schedule, grades
4. **Admin** (3): teachers, permissions, sync
5. **Quality** (2): dashboard, reports
6. **Owner** (3): dashboard, governance, education
7. **Colleges** (2): index, detail
8. **Cross-cutting** (2): document viewer, community

Each route ID is the audit capture's filename root.

### Validation Rules

- Every entry's `auth` value matches an existing role in the auth store.
- Every `path` resolves to a registered route in `App.tsx`.
- The manifest is the single source of truth; the audit script reads
  it; the visible-improvement HTML reads it.
