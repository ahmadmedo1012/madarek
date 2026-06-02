# Phase 1 — Data Model: Premium Experience & Motion System

**Date**: 2026-06-02
**Plan**: [plan.md](./plan.md)

This feature is presentation-layer; it introduces no new database tables.
The "data" here is **design data** — token records, interaction-state
records, and the College Identity Profile — surfaced through TypeScript
types and CSS custom properties.

Three logical entities:

1. **Motion Token**
2. **Interaction State Token**
3. **College Identity Profile**
4. **Reveal Trigger** (transient — describes a runtime configuration on a
   `<Reveal>` element, not a stored record)

---

## 1. Motion Token

A named, semantic unit of motion. Motion Tokens are the only authoritative
source for durations, easings, distances, and stagger across the platform.

### Fields

| Field        | Type                                | Required | Notes |
|--------------|-------------------------------------|----------|-------|
| `name`       | string (kebab-case, `--motion-*`)   | yes      | Stable contract; renaming is a MAJOR change. |
| `category`   | `"duration" \| "ease" \| "distance" \| "stagger" \| "direction"` | yes | Drives consumption pattern. |
| `value`      | string (CSS value)                  | yes      | Resolved CSS value, e.g., `320ms`, `cubic-bezier(...)`, `12px`. |
| `purpose`    | string (free-form, ≤ 80 chars)      | yes      | Human-readable purpose, e.g., "page transition entrance". |
| `reducedMotionFallback` | string                    | yes      | Value when `prefers-reduced-motion: reduce`. Always `0ms` or `≤ 80ms` for durations. |
| `deprecated` | boolean                             | no       | When true, consumers MUST migrate. Linted at build. |

### Required Records (this PR)

**Durations**

| Token                          | Value | Reduced-Motion | Purpose |
|--------------------------------|-------|----------------|---------|
| `--motion-duration-micro`      | 80ms  | 0ms            | Pressed states, micro toggles |
| `--motion-duration-short`      | 160ms | 0ms            | Hover, focus, color shifts |
| `--motion-duration-medium`     | 240ms | 0ms            | Drawer/menu/popover |
| `--motion-duration-long`       | 380ms | 0ms            | Reserved (slowest UI motion) |
| `--motion-duration-page`       | 320ms | 0ms (cross-fade keeps 80ms) | Route transitions |
| `--motion-duration-reveal`     | 360ms | 80ms (fade only) | Scroll reveals |
| `--motion-duration-stat`       | 700ms | 0ms (snap to value) | Counter/progress reveals |
| `--motion-duration-skeleton`   | 1200ms (loop) | 0ms (static) | Skeleton shimmer |

**Easings**

| Token                       | Value                                | Purpose |
|-----------------------------|--------------------------------------|---------|
| `--motion-ease-standard`    | `cubic-bezier(0.4, 0, 0.2, 1)`       | Default in/out |
| `--motion-ease-decelerate`  | `cubic-bezier(0.16, 1, 0.3, 1)`      | Entering content |
| `--motion-ease-accelerate`  | `cubic-bezier(0.7, 0, 0.84, 0)`      | Exiting content |
| `--motion-ease-emphasized`  | `cubic-bezier(0.22, 1, 0.36, 1)`     | High-attention moments |

**Distances**

| Token                      | Value | Purpose |
|----------------------------|-------|---------|
| `--motion-distance-small`  | 6px   | Hover lift, micro reveals |
| `--motion-distance-medium` | 16px  | Section reveals, drawer |
| `--motion-distance-large`  | 48px  | Hero reveal, full-page enter |

**Stagger**

| Token                       | Value | Purpose |
|-----------------------------|-------|---------|
| `--motion-stagger-step`     | 60ms  | Sibling reveal cascade unit |
| `--motion-stagger-cap`      | 6     | Max children before delay caps |

**Direction**

| Token                  | Value (LTR) | Value (RTL) | Purpose |
|------------------------|-------------|-------------|---------|
| `--motion-direction`   | `1`         | `-1`        | Multiplier for `translateX` |

### Validation Rules

- Every duration token MUST have a paired `reducedMotionFallback`.
- Adding a hardcoded duration/easing in CSS or JSX is a review-blocking
  violation (enforced via lint rule, deferred to tasks phase).
- Renaming any token in the table above is a breaking change that requires
  a migration commit updating all consumers.

---

## 2. Interaction State Token

A named, semantic unit of visual feedback per primitive. Each primitive
has its own well-known set of state tokens.

### Fields

| Field        | Type                                | Required | Notes |
|--------------|-------------------------------------|----------|-------|
| `name`       | string (kebab-case, `--state-*`)    | yes      | Stable contract. |
| `primitive`  | `"button" \| "card" \| "input" \| "row" \| "tab" \| "link"` | yes | Which primitive this token serves. |
| `state`      | `"hover" \| "focus" \| "pressed" \| "selected" \| "disabled" \| "loading"` | yes | Which state. |
| `properties` | object (CSS property → value)        | yes      | The visual treatment. |
| `notes`      | string                              | no       | Constraints (e.g., "no layout shift"). |

### Required Records (this PR)

**Universal focus ring** (used by every primitive):

| Token                          | Value |
|--------------------------------|-------|
| `--state-focus-ring-color`     | `var(--accent, #2563eb)` |
| `--state-focus-ring-width`     | `2px` |
| `--state-focus-ring-offset`    | `2px` |
| `--state-focus-ring`           | `0 0 0 var(--state-focus-ring-width) var(--state-focus-ring-color)` (box-shadow) |

**Button states**

| Token                            | Value |
|----------------------------------|-------|
| `--state-button-hover-bg-shift`  | `4%` (HSL lightness delta toward darker) |
| `--state-button-pressed-scale`   | `0.98` |
| `--state-button-disabled-opacity`| `0.5` |

**Card / row / tile states**

| Token                          | Value |
|--------------------------------|-------|
| `--state-card-hover-elevation` | `0 4px 12px rgb(0 0 0 / 0.06)` |
| `--state-card-hover-translate` | `-1px` (Y) |
| `--state-card-pressed-scale`   | `0.99` |
| `--state-card-selected-ring`   | `inset 0 0 0 2px var(--accent)` |

**Input states**

| Token                           | Value |
|---------------------------------|-------|
| `--state-input-focus-ring`      | `var(--state-focus-ring)` |
| `--state-input-error-border`    | `var(--danger)` |
| `--state-input-loading-cursor`  | `progress` |

### Validation Rules

- `--state-focus-ring` MUST appear on every focusable element with a 4.5:1
  minimum contrast ratio against the surrounding background.
- Hover states MUST NOT produce layout shift (no width/height/margin
  changes; only `transform` and `box-shadow` permitted).
- Disabled states MUST suppress hover and pressed feedback.

---

## 3. College Identity Profile

A per-college record that drives a college page's accent layer without
bespoke styling.

### Fields

| Field                | Type             | Required | Validation |
|----------------------|------------------|----------|------------|
| `slug`               | string           | yes      | Matches one University of Zawia college slug; primary key. |
| `nameAr`             | string           | yes      | Arabic display name (already exists in colleges data). |
| `nameEn`             | string           | yes      | English display name. |
| `accent`             | string (hex)     | yes      | Primary accent. AA contrast checked at build. |
| `accentAccessible`   | string (hex)     | no       | Fallback when `accent` fails contrast on the platform background. |
| `heroImage.src`      | string (URL)     | yes      | Path under `frontend/public/colleges/<slug>/hero.{jpg,webp}`. |
| `heroImage.alt`      | string           | yes      | Localized alt text (Arabic + English via i18n key). |
| `icon`               | string           | yes      | Lucide icon name (must exist in `lucide-react`). |
| `motif.src`          | string (URL)     | no       | Optional decorative motif. |
| `motif.alt`          | string           | no       | Required if `motif.src` present. |
| `namedTokens`        | object           | no       | Optional per-college token overrides; keys MUST be in an allowlist. |

### TypeScript Type (frontend contract)

```ts
export type CollegeIdentityProfile = {
  slug: string;
  nameAr: string;
  nameEn: string;
  accent: `#${string}`;
  accentAccessible?: `#${string}`;
  heroImage: { src: string; alt: string };
  icon: string;
  motif?: { src: string; alt: string };
  namedTokens?: Partial<{
    'college-accent-soft': string;
    'college-accent-fg': string;
  }>;
};
```

### Validation Rules

- `accent` MUST resolve to AA contrast against `var(--surface)` for body
  text use; if not, `accentAccessible` MUST be provided.
- `heroImage.src` MUST exist on disk at build time (build script verifies).
- `icon` MUST be a valid `lucide-react` export name (build script verifies).
- `slug` MUST match an existing college record; orphan profiles fail build.
- All twelve real University of Zawia colleges MUST have a profile (Principle III).

### State Transitions

Identity Profiles are immutable design data; no runtime state transitions.
Updates ship through PR review.

---

## 4. Reveal Trigger (transient runtime configuration)

A configuration object passed to a `<Reveal>` instance. Not persisted; not
a data record per se — documented here for completeness.

### Fields

| Field        | Type                  | Default                | Notes |
|--------------|-----------------------|------------------------|-------|
| `as`         | React element type    | `"div"`                | Wrapper element. |
| `staggerIndex`| number               | `0`                    | Position within a `<RevealGroup>` (0-based). |
| `distance`   | `"small" \| "medium" \| "large"` | `"medium"` | Maps to motion distance token. |
| `direction`  | `"up" \| "down" \| "logical-start" \| "logical-end"` | `"up"` | Motion vector. |
| `once`       | boolean               | `true`                 | One-shot behavior; FR-021 requires `true` in shipped surfaces. |
| `threshold`  | number (0–1)          | `0`                    | IntersectionObserver threshold. |

### Validation Rules

- `staggerIndex` is automatically derived inside `<RevealGroup>`; manual
  override only for advanced layouts.
- When `prefers-reduced-motion: reduce` is active, the Reveal Trigger is
  ignored — content renders immediately.
