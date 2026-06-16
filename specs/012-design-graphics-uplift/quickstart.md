# Quickstart — Design, Theming & Graphics Uplift (012)

**Branch**: `012-design-graphics-uplift` | **Date**: 2026-06-02

This guide walks contributors through adopting the new theming, illustration, elevation, chart and onboarding/milestone systems shipped by this feature. Read it before opening a PR that touches any visible surface.

---

## Adoption rules at a glance

1. **Tokens, never literals.** Colour, shadow, glass, radius, motion → consume `var(--…)`. A hardcoded hex / rgba / `box-shadow: 0 1px 2px black` in component code is a review block.
2. **Theme-aware by construction.** Components MUST work in both `data-theme="light"` and `data-theme="dark"` without conditional code — the cascade does the work.
3. **Bespoke illustrations only.** Any visual that isn't a Lucide icon or a chart goes through `<Illustration name="…" />`. Inline `<svg>` with bespoke paths in a page file is a review block.
4. **Overlays use the elevation language.** No custom shadow, no custom z-index, no custom radius on a Modal / Sheet / Popover / Dropdown / Toast / NotificationPanel / CommandPalette / Lightbox.
5. **One-shot motion, never theatrics.** Section accents fire once. Onboarding fires once per user. Milestones fire once per scope. No infinite loops.

---

## Adding a new visible surface

### Step 1 — Use existing primitives first

Most cases are covered by:
- `Button`, `Input` (from `001-*`)
- `EmptyState`, `ErrorState` (from `002-*`, extended here to use `<Illustration>`)
- `Modal`, `Sheet`, `Popover`, `Dropdown`, `Toast` (NEW — see `contracts/elevation-language.md`)

If your surface is one of these → consume the primitive, set its props, done.

### Step 2 — If you need bespoke composition

Use the design tokens directly. Example:

```tsx
function MyTile() {
  return (
    <article className="my-tile">
      <h3 className="my-tile__title">…</h3>
      <p className="my-tile__body">…</p>
    </article>
  )
}
```

```css
.my-tile {
  background: var(--surface-card);
  border: 1px solid var(--surface-border);
  border-radius: var(--r-lg);
  box-shadow: var(--elev-1);
  padding: var(--sp-5);
  color: var(--text-primary);
  transition: box-shadow var(--dur-standard-in) var(--ease-standard);
}
.my-tile:hover {
  box-shadow: var(--elev-2);
}
.my-tile__title {
  font: var(--type-headline-md);   /* type-role from 002-* */
  color: var(--text-primary);
}
.my-tile__body {
  font: var(--type-body-md);
  color: var(--text-secondary);
}
```

This works in Light, Dark, role-tinted chrome, and `prefers-contrast: more` automatically — no `data-theme` checks in your code.

### Step 3 — Add an illustration only via the registry

Need a new empty / error / milestone scene? Add it to:

- `frontend/src/lib/illustrations/<scene-name>.tsx` — TSX returning inline SVG using `var(--ill-*)` only.
- `frontend/src/lib/illustrations/index.ts` — register under `IllustrationName`.
- `contracts/illustration-system.md` — update the registry table.

Then consume:

```tsx
<Illustration name="my-new-scene" altKey="myFeature.scene.alt" />
```

The audit fails CI if you reference an unregistered name.

---

## Toggling theme in the SPA

```tsx
import { useTheme } from '~/lib/theme'

function ThemeMenu() {
  const { choice, setChoice } = useTheme()
  return (
    <DropdownMenu value={choice} onChange={setChoice}>
      <DropdownItem value="light">Light</DropdownItem>
      <DropdownItem value="dark">Dark</DropdownItem>
      <DropdownItem value="system">Match my system</DropdownItem>
    </DropdownMenu>
  )
}
```

Persistence + sync are handled by the hook — no extra wiring required.

---

## Applying role and college accents

### Role accent

Set on the `<body>` (or app shell) via `data-role`:

```tsx
useEffect(() => {
  document.body.dataset.role = me.role.toLowerCase().replaceAll('_', '-')
}, [me.role])
```

The chrome (sidebar active, topbar accent, KPI tile rim, primary CTA outline) tints automatically.

### College accent

Set on the page-level scope via inline style — the contrast gate runs in JS once per render:

```tsx
import { gateCollegeAccent } from '~/lib/theme'

function CollegePage({ college }) {
  const accent = gateCollegeAccent(college.identityColor)
  return (
    <main style={{ '--college-accent': accent }}>
      …
    </main>
  )
}
```

`gateCollegeAccent` returns the original hex if it passes WCAG, or a safe fallback (the role accent) if it doesn't.

---

## Triggering onboarding / milestones

### Onboarding

You don't trigger onboarding manually — it auto-mounts on first authenticated dashboard render where `me.onboardingCompletedAt === null`. To expose a manual replay button:

```tsx
const { open } = useOnboardingState()
<button onClick={() => open({ replay: true })}>See product tour</button>
```

### Milestones

Backend service hooks are responsible for the trigger condition (see `contracts/onboarding-milestone.md`). The frontend automatically presents the matching scene when `me.firedMilestones` gains a new entry — no UI code is required at the call site.

To add a new milestone (post-V1 only — the V1 catalogue is fixed):
1. Add the ID to `MilestoneId` in `data-model.md` and the backend trigger location.
2. Register a scene in the illustration registry.
3. Update `contracts/onboarding-milestone.md`.

---

## Checking your work

### Local

```bash
# Vitest + RTL — fast feedback on hooks / components
npm --prefix frontend run test

# Playwright surface inventory + drift
npm --prefix frontend run test:audit
npm --prefix frontend run test:audit:drift

# Bundle / FCP / CLS budget
npm --prefix frontend run test:perf

# Backend contract tests
npm --prefix backend run test
```

### CI gates

A PR that touches any frontend visible surface MUST pass:
- Vitest unit suite.
- `surface-inventory` step (must succeed; see schema in `contracts/audit-script.md`).
- `surface-drift` step (must show no drift unless the baseline is intentionally updated).
- `axe` accessibility step (carries from earlier features).

A PR that touches the new backend endpoints MUST pass:
- Backend unit + contract tests.
- Existing audit-log assertion (every mutation logs the actor).

---

## Common pitfalls

| Pitfall | Fix |
|---------|-----|
| Hardcoded hex in a CSS file | Replace with `var(--…)`. If no token fits, propose one in `theme-tokens.md`. |
| `box-shadow: 0 4px 8px rgba(0,0,0,0.1)` | Use `box-shadow: var(--elev-2)`. |
| `<svg>…</svg>` directly in a page | Convert to a registered illustration. |
| Modal with a custom z-index | Use `var(--z-modal)`. |
| Toast that auto-dismisses on error | Don't — error toasts require manual dismiss. |
| Theming logic via `if (theme === 'dark') …` | Almost always the wrong layer. CSS variables should already handle it. The exception is the chart palette resolver. |
| New illustration as PNG | Inline SVG only. PNG is for marketing photography, not product surfaces. |
| Onboarding flow extended to 7 frames | V1 is fixed at 4 frames. New frames require a separate spec/feature. |
| Glass effect on a card | Glass is for overlapping overlays only. Use `var(--surface-card)` + `var(--elev-1)`. |

---

## Where to read more

| Topic | File |
|-------|------|
| Spec & user stories | `spec.md` |
| Phase 0 decisions | `research.md` |
| DB schema additions | `data-model.md` |
| Theme tokens | `contracts/theme-tokens.md` |
| Theme hook + persistence + endpoints | `contracts/theme-state.md` |
| Illustration system | `contracts/illustration-system.md` |
| Elevation language | `contracts/elevation-language.md` |
| Custom chart treatment | `contracts/chart-treatment.md` |
| Onboarding + milestones | `contracts/onboarding-milestone.md` |
| Surface audit | `contracts/audit-script.md` |
| Foundation (do NOT redesign) | `specs/001-*/`, `specs/002-*/`, `specs/003-*/` |

---

## Status

- Phase 0 (research) ✅
- Phase 1 (design + contracts + this guide) ✅
- Phase 2 (`/speckit-tasks`) — next
- Phase 3 (`/speckit-implement`) — after task list is generated
