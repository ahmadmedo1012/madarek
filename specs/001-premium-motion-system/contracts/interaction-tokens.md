# Contract: Interaction State Tokens

**Date**: 2026-06-02
**Owner**: `frontend/src/styles/tokens.css` (extension) + `frontend/src/styles/motion.css`

This contract specifies the canonical visual treatment for each interactive
state on each interactive primitive. Components MUST consume these tokens
rather than defining ad-hoc hover/focus/pressed/disabled treatments.

## Namespace

All interaction-state tokens live under the `--state-*` prefix.

## Universal Focus Ring

Every focusable element MUST render this ring on `:focus-visible`:

| Token                          | Value                                                |
|--------------------------------|------------------------------------------------------|
| `--state-focus-ring-color`     | `var(--accent, #2563eb)`                             |
| `--state-focus-ring-width`     | `2px`                                                |
| `--state-focus-ring-offset`    | `2px`                                                |
| `--state-focus-ring`           | `0 0 0 var(--state-focus-ring-width) var(--state-focus-ring-color)` |

Applied via `box-shadow` or `outline: var(--state-focus-ring)`. MUST NOT
shift surrounding layout. MUST meet 4.5:1 contrast against the underlying
background.

## Per-Primitive Tokens

### Button

| Token                              | Value | Use |
|------------------------------------|-------|-----|
| `--state-button-hover-bg-shift`    | `4%`  | HSL lightness delta toward darker (positive variants) or lighter (dark variants) |
| `--state-button-hover-translate`   | `-1px`| Y translation; MAY be `0` on touch devices |
| `--state-button-pressed-scale`     | `0.98`| Apply on `:active` |
| `--state-button-pressed-duration`  | `var(--motion-duration-micro)` | Snap to pressed |
| `--state-button-disabled-opacity`  | `0.5` | Combined with `pointer-events: none` and `cursor: not-allowed` |

### Card / Tile / Row

| Token                              | Value                                  |
|------------------------------------|----------------------------------------|
| `--state-card-hover-elevation`     | `0 4px 12px rgb(0 0 0 / 0.06)`         |
| `--state-card-hover-translate`     | `-1px`                                 |
| `--state-card-hover-border`        | `var(--rule-strong, var(--rule))`      |
| `--state-card-pressed-scale`       | `0.99`                                 |
| `--state-card-selected-ring`       | `inset 0 0 0 2px var(--accent)`        |
| `--state-card-disabled-opacity`    | `0.5`                                  |

### Input

| Token                                | Value                       |
|--------------------------------------|-----------------------------|
| `--state-input-focus-ring`           | `var(--state-focus-ring)`   |
| `--state-input-focus-border`         | `var(--accent)`             |
| `--state-input-error-border`         | `var(--danger)`             |
| `--state-input-error-ring`           | `0 0 0 2px color-mix(in srgb, var(--danger) 40%, transparent)` |
| `--state-input-disabled-opacity`     | `0.6`                       |
| `--state-input-loading-cursor`       | `progress`                  |

### Tab

| Token                              | Value                                    |
|------------------------------------|------------------------------------------|
| `--state-tab-active-indicator`     | `2px solid var(--accent)` (under, or inline-start in vertical tabs) |
| `--state-tab-indicator-duration`   | `var(--motion-duration-medium)`          |
| `--state-tab-indicator-ease`       | `var(--motion-ease-emphasized)`          |

### Link

| Token                              | Value                                |
|------------------------------------|--------------------------------------|
| `--state-link-hover-underline`     | `1.5px solid currentColor`           |
| `--state-link-hover-color-shift`   | `8%` (HSL lightness toward accent)   |

## Loading State

| Token                              | Value                                |
|------------------------------------|--------------------------------------|
| `--state-loading-spinner-size`     | `1em`                                |
| `--state-loading-spinner-stroke`   | `2px`                                |
| `--state-loading-spinner-color`    | `currentColor`                       |
| `--state-loading-overlay-bg`       | `color-mix(in srgb, var(--surface) 70%, transparent)` |
| `--state-loading-overlay-blur`     | `4px`                                |

## Composition Rules

1. Hover states MUST NOT cause layout shift. Allowed properties: `transform`,
   `box-shadow`, `border-color`, `background-color`, `color`, `opacity`.
2. Pressed scale MUST NOT exceed `0.95` (anything stronger feels "twitchy").
3. Disabled state MUST suppress hover and pressed feedback —
   apply `pointer-events: none` and `cursor: not-allowed`.
4. Focus ring MUST be visible on every primitive in both LTR and RTL.
5. Loading state in a button MUST replace the button content, not stack
   on top of it (prevents layout shift when in-button spinner mounts).

## Accessibility Compliance

- Every state token MUST be verified against WCAG 2.1 AA contrast (4.5:1
  for text, 3:1 for large text and UI graphics).
- Focus state MUST be perceivable independent of color (the ring's box-
  shadow geometry is the primary cue; color is reinforcement).
- Hover-only feedback MUST always be paired with a focus equivalent.

## Versioning

This contract is **v1.0.0**.

- Adding a primitive's state token: MINOR.
- Adjusting a value: PATCH.
- Removing a token: MAJOR.
