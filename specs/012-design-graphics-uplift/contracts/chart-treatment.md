# Contract — Custom Chart Treatment

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

`frontend/src/lib/chartTheme.ts` is extended with three Chart.js plugins and a tokens-driven palette resolver, so every chart in the platform reads as designed (rounded caps, gradient area fills, designed tooltips, fading-edge axis) and themes correctly in Light + Dark + `prefers-contrast: more`. **No new runtime dependencies** — every plugin uses Chart.js's built-in extension hooks.

---

## Plugin set

### 1. `madarekTooltipPlugin`

Replaces Chart.js's default tooltip with a designed surface.

**Spec**:
- Surface: rounded radius `var(--r-md)`, padding `12px 14px`, `box-shadow: var(--elev-3)`, theme-correct background `var(--surface-card-raised)`, border `1px solid var(--surface-border)`.
- Typography: `font-family: var(--font-sans)`, label is `font-weight: 600`, value is `font-family: var(--font-mono)` with `tabular-num`.
- Animation: opacity fade `--dur-standard-in` on enter, `--dur-standard-out` on leave. Position interpolates with `transform: translate3d(...)` for GPU-friendly tracking.
- Pointer-following: tracks the cursor smoothly (≤ 16 ms response).
- Multi-series: shows colour swatches matching the dataset palette tokens.

**Hook**: `Chart.register({ id: 'madarekTooltip', beforeInit, afterDraw })`.

### 2. `madarekFadingAxisPlugin`

Paints axis labels and gridlines with a fade towards chart edges.

**Spec**:
- Calculates a horizontal (X-axis) or vertical (Y-axis) gradient mask in `afterDraw`.
- Edge fade extent: 8 % of the axis dimension on each end.
- Axis labels at ≥ 60 % alpha in centre, ≤ 5 % alpha at the edge.
- Gridlines use a similar fade; major lines remain at full alpha to preserve readability.

### 3. `madarekGradientFillPlugin`

Converts area fills under line charts into vertical gradients.

**Spec**:
- For datasets with `fill: true` and a registered series colour token, replaces the flat fill with a `CanvasGradient` from `--chart-{idx}` at 35 % alpha at top to 0 % alpha at bottom.
- Honours the dark-mode palette: when `[data-theme="dark"]` is set on `<html>`, the plugin reads `--chart-{idx}-dark` instead.
- Recomputes on `chart.update()` and on `data-theme` mutation (via a `MutationObserver` on the document element registered once at module init).

---

## Palette resolver

```ts
function chartPalette(): string[] {
  const root = getComputedStyle(document.documentElement)
  const isDark = document.documentElement.dataset.theme === 'dark'
  const suffix = isDark ? '-dark' : ''
  return [1, 2, 3, 4, 5, 6, 7, 8].map(i =>
    root.getPropertyValue(`--chart-${i}${suffix}`).trim()
  )
}
```

Called by every chart factory and by the gradient-fill plugin.

---

## Dataset configuration defaults

`createChartConfig()` (existing) now applies these defaults to every chart:

| Dataset prop | Value |
|--------------|-------|
| `borderCapStyle` | `'round'` |
| `borderJoinStyle` | `'round'` |
| `borderWidth` | `2` |
| `pointRadius` | `0` (resting); `4` on hover |
| `pointHoverRadius` | `4` |
| `tension` | `0.32` (gentle smoothing — not theatrical) |

For bar charts: `borderRadius: 4`, `borderSkipped: false`.

---

## Theme-change behaviour

When `<html data-theme>` flips, every active chart re-paints its colour-bound surfaces:

1. `MutationObserver` registered once at module init triggers a `chart.update('none')` for every Chart instance tracked in a WeakSet.
2. The palette resolver runs; gradient fills regenerate; tooltip palette updates.
3. CLS during this update is 0 (no layout change — only canvas re-paint).

Under `prefers-contrast: more`, the palette resolver picks variants with stronger lightness contrast (one extra step in the token cascade); axis fade is reduced to 2 % (edges remain readable).

---

## Reduced-motion behaviour

When `prefers-reduced-motion: reduce` is active:
- Tooltip enter/exit transitions become instant.
- `chart.update()` uses `'none'` mode (no animation).
- Gradient fills still render — they are static, not motion.

---

## Test surface

| Test | What it asserts |
|------|-----------------|
| `chartTheme.test.ts: palette resolver picks dark variant when data-theme=dark` | Mocked DOM, asserts colour set. |
| `chartTheme.test.ts: tooltip plugin uses surface tokens` | Spy on `getComputedStyle`, asserts the right keys are read. |
| `chartTheme.test.ts: gradient plugin recomputes on theme change` | Mutation triggers `chart.update`. |
| `surface-inventory.spec.ts: chart axis labels meet AA in both themes` | Computed-colour check against representative chart container. |
| `surface-inventory.spec.ts: every chart instance has rounded caps` | Snapshot dataset config. |
