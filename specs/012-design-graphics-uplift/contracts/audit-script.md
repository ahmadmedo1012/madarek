# Contract — Surface Inventory & Drift Audit

**Phase**: 1 | **Branch**: `012-design-graphics-uplift`

## Surface

Two Playwright tests under `frontend/tests/audit/` that together govern post-feature design discipline:

1. **`surface-inventory.spec.ts`** — visits every route in a curated route table across (Light + Dark) × (LTR + RTL) at three viewports, captures DOM + screenshots, writes a structured JSON inventory. Used to baseline the platform's design state.
2. **`surface-drift.spec.ts`** — diffs the latest inventory against the committed baseline; failure modes (off-token colour, off-family illustration, ad-hoc shadow, ad-hoc motion duration) become CI failures.

Outputs:
- `frontend/tests/audit/surface-inventory.json` — current sweep result.
- `frontend/tests/audit/surface-baseline.json` — committed reference.
- `frontend/tests/audit/screenshots/` — PNG outputs (gitignored; regenerated each run).

---

## Route table

The audit covers ~25 representative routes spanning every primary surface type. The exact list lives in `tests/audit/routes.ts`:

```ts
export const AUDIT_ROUTES = [
  // public
  '/',                          // homepage
  '/login',
  '/colleges',                  // gallery
  '/colleges/:knownSlug',       // tinted college page

  // student
  '/dashboard',
  '/dashboard/courses',
  '/dashboard/courses/:id',
  '/dashboard/assignments',
  '/dashboard/notifications',
  '/dashboard/settings',

  // faculty
  '/faculty',
  '/faculty/courses/:id',

  // dean / admin / quality / owner
  '/dean',
  '/admin',
  '/quality',
  '/owner',

  // utility
  '/404',
  '/error',
  '/onboarding-replay',         // forces flow open via query
] as const

export const VIEWPORTS = [360, 768, 1280] as const
export const THEMES   = ['light', 'dark'] as const
export const DIRS     = ['ltr', 'rtl'] as const
```

Total: ≈ 19 routes × 3 viewports × 2 themes × 2 dirs = ~228 captures per run.

---

## Inventory record shape

Per (route, viewport, theme, dir):

```ts
interface SurfaceCapture {
  route: string
  viewport: number
  theme: 'light' | 'dark'
  dir: 'ltr' | 'rtl'

  // captured from rendered DOM
  illustrations: Array<{
    name: string                  // matched to registry; '<unknown>' if not registered
    decorative: boolean
    altResolved: string | null
    sizeBytesGz: number
  }>

  overlays: Array<{
    type: 'modal' | 'sheet' | 'popover' | 'dropdown' | 'toast' | 'tooltip' | 'lightbox' | 'commandPalette' | 'notificationPanel'
    elevToken: string             // resolved value of --elev-N
    glass: boolean
    zIndex: number
  }>

  roleAccent: string | null       // resolved --role-accent
  collegeAccent: string | null    // resolved --college-accent
  collegeAccentFallback: boolean

  motionTreatments: Array<{
    selector: string
    durationMs: number
    easing: string
  }>

  computedColors: Array<{
    selector: string              // sampled key surfaces (header, sidebar active, KPI tile, body text)
    background: string
    color: string
    contrastRatio: number
  }>

  cls: number                     // observed during initial paint
  fcpMs: number
  bytesTransferred: number
}
```

---

## Drift detection rules

`surface-drift.spec.ts` fails CI if any of:

1. **Off-token colour** — `computedColors[i].background` or `.color` does not match a known token-derived value (allowing for `color-mix` variants). Threshold: any single mismatch is a failure.
2. **Off-family illustration** — `illustrations[i].name === '<unknown>'`.
3. **Illustration size** — `illustrations[i].sizeBytesGz > 8192`.
4. **Ad-hoc shadow** — overlay's `elevToken` is not one of `--elev-1`..`--elev-5`.
5. **Ad-hoc motion duration** — `motionTreatments[i].durationMs` is not one of the documented `--dur-*` values.
6. **Contrast regression** — body text contrast < 4.5 OR numeric KPI contrast < 7.0 in any captured pair.
7. **CLS regression** — `cls > 0.05` on any route.
8. **FCP regression** — current `fcpMs > baseline.fcpMs * 1.05` on any route.
9. **Bundle regression** — `bytesTransferred > budget` (per-route budget table maintained alongside the baseline).

---

## CI integration

```bash
# Runs on every PR
npm --prefix frontend run test:audit -- --update-screenshots=false

# Drift step (depends on inventory step succeeding)
npm --prefix frontend run test:audit:drift
```

The `surface-baseline.json` is regenerated and committed when intentionally accepting a design change — through a one-off `npm run audit:baseline` task, gated behind a PR review.

---

## Out of scope

- Visual screenshot diffing per pixel (Storybook / Chromatic territory) — too noisy for CSS-driven theming. Drift is asserted on **structured data** instead.
- A11y audit beyond contrast — the existing axe Playwright integration covers a11y violations independently.
