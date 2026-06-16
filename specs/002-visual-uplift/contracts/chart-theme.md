# Contract: Chart Theme

**Date**: 2026-06-02
**Owner**: `frontend/src/lib/chartTheme.ts` + `frontend/src/styles/tokens.css`

The single authoritative chart styling contract. Every Chart.js chart in
Madrak MUST consume `chartPalette()` and the option builders (`cartesianOptions`,
`radialOptions`); never override typography, grid, or tooltip styling locally.

## Categorical Palette (8 colors)

`chartPalette()` returns these in order. Series index `i` (0-based) maps to
`palette[i % 8]`.

| Index | Token         | Hex       | Purpose / Common semantic       |
|-------|---------------|-----------|---------------------------------|
| 1     | `--chart-1`   | `#B57438` | Primary / amber series          |
| 2     | `--chart-2`   | `#4FA66D` | Success / green series          |
| 3     | `--chart-3`   | `#5C8FCE` | Info / blue series              |
| 4     | `--chart-4`   | `#DD6E78` | Warning / coral series          |
| 5     | `--chart-5`   | `#8A6FE0` | Tertiary / purple series        |
| 6     | `--chart-6`   | `#E8B547` | Gold accent series              |
| 7     | `--chart-7`   | `#3F8B8B` | Teal series                     |
| 8     | `--chart-8`   | `#A65D8A` | Mauve series                    |

Indexes 1–5 are unchanged from the existing palette so existing charts
render identically. Indexes 6–8 are net-new for richer dashboards.

## Typography

All chart text uses IBM Plex Sans Arabic (resolved by `chartTheme.ts`):

| Surface          | Font role                | Source                |
|------------------|--------------------------|-----------------------|
| Axis ticks       | label-sm                 | `--type-label-size-sm` |
| Legend labels    | label                    | `--type-label-size`    |
| Tooltip title    | label, weight 700        | as built in `tooltip()` |
| Tooltip body     | label                    | as built in `tooltip()` |
| Value labels     | label, weight 600        | `valueLabels` plugin   |

## Axes & Grid

| Element           | Token              | Notes                          |
|-------------------|--------------------|--------------------------------|
| Grid color        | `--chart-grid`     | `rgba(127,127,127,0.12)` light |
| Tick color        | `--chart-text`     | `#8694AC` light                |
| Border display    | always `false`     | no axis spine                  |
| Tick padding      | `6`                |                                |

## Tooltip

Built once in `chartTheme.ts:tooltip()`. Consumers don't override.

| Property         | Value                          |
|------------------|--------------------------------|
| Background       | `var(--surface-1)`             |
| Border           | `var(--chart-grid)` 1px        |
| Border radius    | `10px`                         |
| Padding          | `12px`                         |
| RTL              | `true`                         |
| Use point style  | `true`                         |

## Animation

| Surface | Duration | Easing                     |
|---------|----------|----------------------------|
| Cartesian (Line/Bar) | `750ms` | `easeOutQuart`     |
| Radial (Doughnut/Pie) | `750ms` | `easeOutQuart`    |

Reduced-motion: cartesian and radial both honor the system preference
because Chart.js reads animation duration; consumers MUST gate via
`useReducedMotion()` and pass `animation: false` when reduced.

## Plugins

- `valueLabels` — opt-in via `plugins: [valueLabels]` on bar charts.
  Uses tabular nums; respects platform color tokens.

## Chart-Skeleton Pairing

Chart loading state MUST use `<Skeleton variant="chart" />` from the
`001-*` motion primitives — never a generic spinner inside a chart card.

## Card Padding

Charts MUST sit inside a `.card` with the canonical inner padding
(`var(--card-padding)`). Charts never bleed to the card edge.

## Cycle Rule (formal)

```ts
const seriesColor = (index: number) => chartPalette()[index % 8];
```

Documented so consumers don't reorder per-chart.

## Versioning

This contract is **v1.1.0**.

- Index 1–5 unchanged from v1.0.0 (existing).
- Indexes 6–8 added (MINOR bump).
- Removing or renaming any index: MAJOR.
- Adjusting a value: PATCH if perceived shift is minor; MINOR otherwise.
