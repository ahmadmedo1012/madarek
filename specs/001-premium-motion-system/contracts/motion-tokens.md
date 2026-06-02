# Contract: Motion Tokens

**Date**: 2026-06-02
**Owner**: `frontend/src/styles/tokens.css` (extension) + `frontend/src/styles/motion.css` (new)

This contract is the **single authoritative declaration** of every motion
duration, easing, distance, and stagger value used in Madrak. Consumers
(components, pages, stylesheets) MUST consume these tokens by name and
MUST NOT introduce raw values.

## Namespace

All motion tokens live under the `--motion-*` prefix. Existing raw tokens
(`--t-fast`, `--ease-out`, etc.) remain as the implementation foundation,
but new code MUST reach for the semantic `--motion-*` names.

## Required Tokens

### Durations

| Name                            | Value     | Reduced-Motion | Use |
|---------------------------------|-----------|----------------|-----|
| `--motion-duration-micro`       | `80ms`    | `0ms`          | Pressed/active state changes |
| `--motion-duration-short`       | `160ms`   | `0ms`          | Hover, focus, color shifts |
| `--motion-duration-medium`      | `240ms`   | `0ms`          | Drawers, popovers, menus |
| `--motion-duration-long`        | `380ms`   | `0ms`          | Reserved for largest UI motion |
| `--motion-duration-page`        | `320ms`   | `80ms` fade    | Route transitions |
| `--motion-duration-reveal`      | `360ms`   | `80ms` fade    | Scroll reveals |
| `--motion-duration-stat`        | `700ms`   | `0ms` (snap)   | Counters, progress reveals |
| `--motion-duration-skeleton`    | `1200ms`  | static (no animation) | Skeleton shimmer loop |

### Easings

| Name                        | Value                                  | Use |
|-----------------------------|----------------------------------------|-----|
| `--motion-ease-standard`    | `cubic-bezier(0.4, 0, 0.2, 1)`         | Default in/out |
| `--motion-ease-decelerate`  | `cubic-bezier(0.16, 1, 0.3, 1)`        | Entering content / counter |
| `--motion-ease-accelerate`  | `cubic-bezier(0.7, 0, 0.84, 0)`        | Exiting content |
| `--motion-ease-emphasized`  | `cubic-bezier(0.22, 1, 0.36, 1)`       | High-attention moments |

### Distances

| Name                       | Value | Use |
|----------------------------|-------|-----|
| `--motion-distance-small`  | `6px` | Hover lift, micro reveal |
| `--motion-distance-medium` | `16px`| Section reveal, drawer offset |
| `--motion-distance-large`  | `48px`| Hero reveal, full-page enter |

### Stagger

| Name                       | Value  | Use |
|----------------------------|--------|-----|
| `--motion-stagger-step`    | `60ms` | Per-sibling delay |
| `--motion-stagger-cap`     | `6`    | Max children before delay caps |

### Direction

| Name                   | LTR Value | RTL Value | Use |
|------------------------|-----------|-----------|-----|
| `--motion-direction`   | `1`       | `-1`      | Multiplier for `translateX` |

The RTL variant is set automatically:
```css
:root { --motion-direction: 1; }
[dir="rtl"] { --motion-direction: -1; }
```

## Reduced-Motion Block

All decorative motion is overridden in a single block:

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --motion-duration-micro:   0ms;
    --motion-duration-short:   0ms;
    --motion-duration-medium:  0ms;
    --motion-duration-long:    0ms;
    --motion-duration-page:    80ms;   /* fade only — keeps affordance */
    --motion-duration-reveal:  80ms;
    --motion-duration-stat:    0ms;    /* snap to value */
    --motion-duration-skeleton: 0s;    /* static block */
  }
}
```

## Consumption Pattern

```css
/* good */
.card {
  transition:
    transform var(--motion-duration-short) var(--motion-ease-standard),
    box-shadow var(--motion-duration-short) var(--motion-ease-standard);
}

/* bad — raw value */
.card {
  transition: transform 200ms ease-in-out;
}
```

## Compatibility

- Existing `--t-fast`, `--t-base`, `--ease-out`, etc. remain as
  implementation foundation. They are not deleted in this PR.
- New code MUST use `--motion-*` names. Old code migrates lazily; the
  audit table in `tasks.md` (Phase 2) tracks file-by-file migration.

## Versioning

This contract is **v1.0.0**.

- Adding a new token: MINOR.
- Renaming a token: MAJOR.
- Changing a value (e.g., `--motion-duration-page` from 320 ms to 280 ms):
  MINOR if the change is within the spec's stated band; MAJOR if it
  changes the perceived feel beyond the band.
