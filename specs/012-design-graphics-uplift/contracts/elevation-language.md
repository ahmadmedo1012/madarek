# Contract — Elevation Language (Overlay Surfaces)

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

One shared elevation language applied to every overlay surface in the platform: `Modal`, `Sheet`, `Popover`, `Dropdown`, `Toast`, `NotificationPanel`, `CommandPalette`, `Lightbox`. Each consumes a fixed combination of (a) elevation token (`--elev-1`..`--elev-5`), (b) glass treatment (only when overlapping content), (c) z-order token (`--z-*`), (d) corner radius token (already shipped from `001-*`).

This contract documents the assignment table — which surface receives which tokens — and the rules every surface MUST follow.

---

## Z-order hierarchy

| Token | Level | Surfaces |
|-------|-------|----------|
| `--z-base` | 0 | page content |
| `--z-dropdown` | 100 | dropdowns, comboboxes |
| `--z-popover` | 200 | popovers, hovercards |
| `--z-tooltip` | 250 | tooltips |
| `--z-sheet` | 300 | side / bottom sheets |
| `--z-modal` | 400 | modal dialogs, command palette |
| `--z-toast` | 500 | toasts, notification stacks |
| `--z-lightbox` | 600 | lightbox / fullscreen image viewer |

Rule: a surface at level N MUST NOT be obscured by a surface at level M < N. The `Toast` rendering above modals is intentional — error / connectivity feedback must always be reachable.

---

## Surface assignment table

| Component | Elevation | Glass? | Radius | Z-order | Backdrop scrim? |
|-----------|-----------|--------|--------|---------|-----------------|
| `Modal` | `--elev-4` | yes | `--r-xl` | `--z-modal` | yes (rgba(0,0,0,0.45)) |
| `Sheet` | `--elev-4` | yes | `--r-2xl` (top corners) | `--z-sheet` | yes |
| `Popover` | `--elev-3` | yes (subtle) | `--r-lg` | `--z-popover` | no |
| `Dropdown` | `--elev-2` | no | `--r-md` | `--z-dropdown` | no |
| `Toast` | `--elev-3` | no | `--r-lg` | `--z-toast` | no |
| `NotificationPanel` | `--elev-3` | yes | `--r-xl` (top-left or top-right) | `--z-popover` | no |
| `CommandPalette` | `--elev-5` | yes (heavier blur) | `--r-2xl` | `--z-modal` | yes |
| `Lightbox` | `--elev-5` | no | none | `--z-lightbox` | yes (rgba(0,0,0,0.85)) |
| `Tooltip` | `--elev-2` | no | `--r-sm` | `--z-tooltip` | no |

---

## Glass treatment rules

A glass surface MUST:
1. Use `--glass-bg-{light|dark}` (theme-correct) as `background-color`.
2. Apply `backdrop-filter: blur(var(--glass-blur))` and `-webkit-backdrop-filter` for Safari.
3. Wrap inside `@supports (backdrop-filter: blur(0))`. The fallback branch sets `background-color` to its opaque fallback (alpha = 1).
4. Maintain WCAG AA on text directly above the glass (validated against the underlying content's representative palette in the audit).
5. NOT apply over an opaque parent surface (no glass on glass, no glass on `--surface-card`).

Under `prefers-contrast: more`, glass tokens are forced to opaque (handled by the token cascade in `theme-tokens.md`).

---

## Animation envelope

Overlay enter/exit transitions consume `001-*` motion tokens:

| Surface | Enter | Exit |
|---------|-------|------|
| Modal | `--dur-emphasized-in` (240 ms), opacity + 6 px lift | `--dur-emphasized-out` (180 ms), opacity + 6 px settle |
| Sheet | `--dur-emphasized-in`, slide from edge | `--dur-emphasized-out`, slide back |
| Popover / Dropdown | `--dur-standard-in` (160 ms), opacity + small scale | `--dur-standard-out` (120 ms) |
| Toast | `--dur-standard-in`, slide + fade in | `--dur-standard-out`, fade |
| Lightbox / CommandPalette | `--dur-emphasized-in`, opacity only | `--dur-emphasized-out` |

Reduced-motion: every surface uses an instant or ≤ 80 ms fade — handled by the `001-*` motion utilities.

---

## Co-existence rules

When multiple overlays render together:

1. The escape key dismisses the topmost surface only.
2. Click-outside dismisses the topmost surface, except when the topmost is a `Toast` (toasts are passive — clicks pass through to the layer below; toast dismiss is via its own close affordance).
3. Focus trap is owned by the topmost focus-trapping surface (Modal, Sheet, CommandPalette, Lightbox). Popovers and Dropdowns do NOT trap focus.
4. A `Toast` rendered while a `Modal` is open MUST appear above the modal (z-order rule), MUST NOT steal focus, and MUST auto-dismiss within 5 s unless the toast type is `error` (which requires manual dismiss).

---

## Surface implementation expectations

Every overlay component MUST:
- Use `var(--elev-N)` for `box-shadow` — no custom shadow.
- Use `var(--z-…)` for `z-index` — no numeric literals.
- Use `var(--r-…)` for `border-radius`.
- Render inside a portal anchored to the document body (carry from existing implementation).
- Be unit-tested for token use (see test surface below).

A PR adding a new overlay-style component without a row in this table is a review block.

---

## Test surface

| Test | What it asserts |
|------|-----------------|
| `surface-inventory.spec.ts: each overlay uses --elev-N` | Static computed-style check via Playwright. |
| `surface-inventory.spec.ts: glass surfaces meet AA above text` | Snapshot contrast of body text over each glass surface against representative content. |
| `surface-inventory.spec.ts: z-order is consistent` | Modal-with-toast scenario — toast above modal. |
| `overlays/Modal.test.tsx: focus trap activates` | Opening modal traps focus; Esc closes; focus returns. |
| `overlays/Toast.test.tsx: error toast does not auto-dismiss` | Auto-dismiss only for non-error variants. |
| `overlays/CommandPalette.test.tsx: glass falls back to opaque` | Mocked `@supports` no → opaque background. |
