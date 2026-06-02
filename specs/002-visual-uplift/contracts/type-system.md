# Contract: Type System

**Date**: 2026-06-02
**Owner**: `frontend/src/styles/tokens.css` (extension)

The role-locked typographic contract. Every new typography decision MUST
reach for a role token, never raw `--fs-*`. The raw scale remains as the
implementation foundation but is implementation detail.

## Namespace

`--type-<role>-<property>` where `role ∈ {display, headline, body, label, metric}`
and `property ∈ {size, weight, line-height, letter-spacing}`.

## Roles

### Display
Hero headlines, marketing-page titles. One per page max.

| Token                                 | Value                          |
|---------------------------------------|--------------------------------|
| `--type-display-size-md`              | `var(--fs-display-md)` (28..40 px) |
| `--type-display-size-lg`              | `var(--fs-display-lg)` (34..56 px) |
| `--type-display-size-xl`              | `var(--fs-display-xl)` (40..72 px) |
| `--type-display-size-mega`            | `var(--fs-mega)` (48..104 px)   |
| `--type-display-weight`               | `800`                          |
| `--type-display-line-height`          | `1.05`                         |
| `--type-display-letter-spacing`       | `-0.032em`                     |

### Headline
Page titles, section titles, modal headers.

| Token                                  | Value                  |
|----------------------------------------|------------------------|
| `--type-headline-size-lg`              | `var(--fs-h1)` (30 px) |
| `--type-headline-size-md`              | `var(--fs-h2)` (22 px) |
| `--type-headline-size-sm`              | `var(--fs-h3)` (18 px) |
| `--type-headline-weight`               | `700`                  |
| `--type-headline-line-height`          | `1.20`                 |
| `--type-headline-letter-spacing`       | `-0.012em`             |

### Body
Paragraphs, descriptions, prose.

| Token                              | Value                      |
|------------------------------------|----------------------------|
| `--type-body-size`                 | `var(--fs-body)` (15 px)   |
| `--type-body-size-lg`              | `var(--fs-body-lg)` (17 px) |
| `--type-body-weight`               | `400`                      |
| `--type-body-line-height`          | `1.65`                     |
| `--type-body-letter-spacing`       | `0`                        |
| `--type-body-max-measure`          | `72ch`                     |

### Label
Form labels, KPI labels, captions, helper text.

| Token                              | Value             |
|------------------------------------|-------------------|
| `--type-label-size`                | `var(--fs-sm)` (13 px) |
| `--type-label-size-sm`             | `var(--fs-xs)` (12 px) |
| `--type-label-weight`              | `500`             |
| `--type-label-line-height`         | `1.50`            |
| `--type-label-letter-spacing`      | `0.02em`          |

### Metric
KPI numbers, big stats, counters. Always tabular.

| Token                              | Value                      |
|------------------------------------|----------------------------|
| `--type-metric-size`               | `var(--fs-metric-md)` (22 px) |
| `--type-metric-size-lg`            | `var(--fs-metric-lg)` (30 px) |
| `--type-metric-size-xl`            | `var(--fs-metric-xl)` (44 px) |
| `--type-metric-weight`             | `700`                      |
| `--type-metric-line-height`        | `1.10`                     |
| `--type-metric-letter-spacing`     | `-0.022em`                 |
| `--type-metric-feature-settings`   | `'tnum' 1, 'lnum' 1`       |

## Helper Class

```css
.tabular-nums {
  font-variant-numeric: tabular-nums lining-nums;
  font-feature-settings: 'tnum' 1, 'lnum' 1;
}
```

Apply to KPI tiles, table number columns, counters, percentages.

## Body Measure Cap

```css
.prose-cap, .body-cap {
  max-inline-size: var(--type-body-max-measure);
}
```

Prevents edge-to-edge body lines on wide screens.

## Consumption Pattern

```css
/* good */
.kpi-value {
  font-size: var(--type-metric-size-lg);
  font-weight: var(--type-metric-weight);
  line-height: var(--type-metric-line-height);
  letter-spacing: var(--type-metric-letter-spacing);
  font-feature-settings: var(--type-metric-feature-settings);
}

/* bad — raw size, missing weight/line-height/letter-spacing */
.kpi-value {
  font-size: var(--fs-metric-lg);
}
```

## Compatibility

- Existing CSS using raw `--fs-*` is allowed during gradual migration.
- New code MUST consume role tokens. PR reviewers verify.

## Versioning

This contract is **v1.0.0**.

- Adding a new role: MINOR.
- Renaming a role token: MAJOR.
- Adjusting weight/line-height for a role: MINOR (consumers re-render but contract names unchanged).
