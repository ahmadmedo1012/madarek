# Contract — Theme Tokens (CSS Custom Properties)

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

`tokens.css` is extended with theme-bearing tokens scoped under `[data-theme="…"]` blocks. Light is the default; Dark is opt-in via `data-theme="dark"` on `<html>`. Both blocks layer a `@media (prefers-contrast: more)` adaptation. Role accent and college accent are scoped tokens that compose with — they do NOT override — the active theme.

This contract documents the token names and their intended consumers. **Component code MUST consume these tokens via `var(...)`; a hardcoded hex in a component file is a review block.**

---

## 1. Theme tokens

### Surface tokens (per theme)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--surface-canvas` | warm cream `#F8F4EE` | rich black `#0E0F12` | Page background |
| `--surface-card` | `#FFFFFF` | `#16181D` | Card / tile |
| `--surface-card-raised` | `#FFFFFF` | `#1B1E24` | Elevated card (overlay below modal) |
| `--surface-overlay` | `rgba(255,255,255,0.92)` | `rgba(22,24,29,0.92)` | Modal / sheet body |
| `--surface-inset` | `#F1ECE3` | `#0B0C0F` | Code blocks, inset wells |
| `--surface-border` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.10)` | Soft borders |
| `--surface-divider` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.06)` | Dividers |

### Text tokens (per theme)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--text-primary` | `#1A1B1F` | `#F2EFE9` | Body / heading default |
| `--text-secondary` | `#4B4D55` | `#A9ADB7` | Supporting text |
| `--text-muted` | `#7A7C84` | `#7C808A` | Tertiary, captions |
| `--text-inverse` | `#FFFFFF` | `#0E0F12` | Text on solid accent |
| `--text-disabled` | `#A9ABB1` | `#5A5C63` | Disabled labels |

Contrast: every Light text-on-surface pair MUST clear WCAG AA on body and AAA on numeric KPI values. Same for Dark.

### Accent / chrome tokens (per theme)

| Token | Light | Dark | Purpose |
|-------|-------|------|---------|
| `--accent-base` | `#3B5BDB` | `#7C9BFF` | Default accent (overridden by `--role-accent` and `--college-accent`) |
| `--accent-base-hover` | `#2F4DBE` | `#A1B7FF` | Hover variant |
| `--ring-focus` | `rgba(59,91,219,0.45)` | `rgba(124,155,255,0.55)` | Focus ring (carries from `001-*`) |

---

## 2. Role-accent tokens

A separate variable `--role-accent` is set by `[data-role="…"]` at the body level. The role-accent applies to chrome only — it never colours body text.

| `data-role` | Light hex | Dark hex |
|-------------|-----------|----------|
| `student`         | `#3B5BDB` | `#7C9BFF` |
| `faculty`         | `#1F8A7C` | `#3CC2B0` |
| `department-head` | `#BF6A2A` | `#E89456` |
| `dean`            | `#7B3FB1` | `#B58EE6` |
| `admin`           | `#264653` | `#5C8A9C` |
| `quality`         | `#A33A4F` | `#E47186` |
| `owner`           | `#6B7280` | `#A0A6B0` |

All values are pre-vetted for AA contrast on Light + Dark surfaces. PRs adding a new role MUST add corresponding values and re-run the audit.

---

## 3. College-accent token

`--college-accent` is set on the page-level scope of every college-tinted page. The token's value is the college's identity colour from `001-*` profiles — but only after the runtime contrast gate (R-004) approves it. If the gate rejects, the token receives the role-accent value as a fallback.

| Token | Source | Fallback |
|-------|--------|----------|
| `--college-accent` | College identity colour (gated) | `--role-accent` |
| `--college-accent-soft` | `color-mix(in srgb, --college-accent 18%, transparent)` | derived |

---

## 4. Elevation tokens

| Token | Light | Dark | Use |
|-------|-------|------|-----|
| `--elev-1` | `0 1px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.06)` | `0 1px 2px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.04)` | Card resting |
| `--elev-2` | `0 4px 8px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)` | `0 4px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)` | Card hover, dropdown |
| `--elev-3` | `0 8px 16px rgba(0,0,0,0.08), 0 4px 8px rgba(0,0,0,0.05)` | `0 8px 16px rgba(0,0,0,0.40), inset 0 1px 0 rgba(255,255,255,0.06)` | Popover |
| `--elev-4` | `0 16px 32px rgba(0,0,0,0.10), 0 8px 16px rgba(0,0,0,0.06)` | `0 16px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)` | Modal, sheet |
| `--elev-5` | `0 32px 64px rgba(0,0,0,0.12), 0 16px 32px rgba(0,0,0,0.08)` | `0 32px 64px rgba(0,0,0,0.50), inset 0 1px 0 rgba(255,255,255,0.08)` | Lightbox / command palette |

In Dark, the inset highlight conveys elevation; the drop shadow is dialled back to keep the surface from looking muddy.

---

## 5. Glass tokens

```css
--glass-bg-light: rgba(255,255,255,0.72);
--glass-bg-dark:  rgba(22,24,29,0.72);
--glass-blur:     12px;
```

Used only on overlapping overlays (modal, sheet, popover, command-palette). When `@supports not (backdrop-filter: blur(0))` matches, surfaces fall back to an opaque variant (alpha → 1).

---

## 6. Illustration palette tokens

Six named hues drive the bespoke illustration family. Each has a Light and Dark variant.

| Token | Purpose |
|-------|---------|
| `--ill-hue-1` … `--ill-hue-6` | Six rotating accent fills used inside SVG scenes |
| `--ill-stroke` | Stroke colour (1.5 device-independent units) |
| `--ill-paper` | Off-canvas surface inside an illustration (light variant differs from dark) |
| `--ill-shadow` | Soft shadow used inside illustrations (suppressed under `prefers-contrast: more`) |

---

## 7. Chart palette tokens

Eight categorical colours for chart series, theme-tuned.

```css
--chart-1 … --chart-8           /* light variant */
--chart-1-dark … --chart-8-dark /* dark variant — chartTheme.ts picks these when [data-theme="dark"] */
```

`chartTheme.ts` reads these at chart-render time via `getComputedStyle(document.documentElement)`.

---

## 8. `prefers-contrast: more` adaptations

Inside each `[data-theme]` block:

```css
@media (prefers-contrast: more) {
  --surface-border:    rgba(0,0,0,0.32);          /* light */
  --surface-divider:   rgba(0,0,0,0.20);
  --elev-1: 0 1px 0 rgba(0,0,0,0.12);             /* shadows replaced with single hard line */
  --elev-2: 0 2px 0 rgba(0,0,0,0.16);
  /* … and so on; glass tokens are forced to opaque */
  --glass-bg-light: #FFFFFF;
  --glass-bg-dark:  #16181D;
  --ill-shadow:     transparent;
}
```

Components do NOT switch logic for this preference; the cascading variables do the work.

---

## 9. Consumer rules

- A component MUST consume tokens via `color: var(--text-primary)`, `background: var(--surface-card)`, `box-shadow: var(--elev-1)`, etc. **Hardcoded hex / rgba in a component file is a review block.**
- `--role-accent` and `--college-accent` MUST only tint chrome (sidebar active state, topbar, KPI tile rim, breadcrumb, primary-CTA outline). They MUST NOT colour body text.
- Hover / focus / pressed states MUST consume the existing `001-*` motion + state tokens — this contract does not redefine them.
- Adding a new theme-bearing token requires updating this contract AND the audit baseline.

---

## 10. Pre-paint script (in `index.html`)

```html
<script>
  (function() {
    var stored = localStorage.getItem('madarek.theme');
    var choice = stored || 'system';
    var resolved = choice === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : choice;
    document.documentElement.setAttribute('data-theme', resolved);
  })();
</script>
```

Runs synchronously before stylesheet parse → eliminates flash-of-wrong-theme. The full hook (`useTheme()`) takes over after hydration and may update the attribute if the profile-stored value differs.
