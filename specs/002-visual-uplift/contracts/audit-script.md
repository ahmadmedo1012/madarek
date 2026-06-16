# Contract: Visual Audit Script

**Date**: 2026-06-02
**Owner**: `frontend/tests/visual/audit.spec.ts` + `frontend/tests/visual/routes.ts`

A reproducible Playwright audit that walks every primary route at four
breakpoints in both directions, captures full-page screenshots, and
asserts mobile-overflow + focus-ring invariants.

## Inputs

### Route Manifest

`frontend/tests/visual/routes.ts` exports `routes: AuditRoute[]` where:

```ts
type AuditRoute = {
  id: string;          // stable identifier, becomes capture filename root
  path: string;        // route path, e.g. '/student/dashboard'
  auth: 'none' | 'student' | 'teacher' | 'admin' | 'dean' | 'quality' | 'owner';
  description: string; // human-readable
  breakpoints?: number[]; // optional override; default [360, 768, 1280, 3840]
  directions?: ('ltr' | 'rtl')[]; // optional override; default ['ltr', 'rtl']
};
```

### Login Helpers

For each role in the manifest, the audit uses a documented test-user
seed. Auth tokens are obtained once per role + breakpoint × direction
combination via `await login(page, role)`.

Test users live in `frontend/tests/visual/test-users.ts` and read
credentials from environment variables `MADAREK_TEST_<ROLE>_EMAIL` and
`MADAREK_TEST_<ROLE>_PASSWORD`. CI sets these from secrets; locally,
unset roles are skipped with a logged warning.

## Outputs

### Captures

`frontend/tests/visual/__captures__/<id>--<bp>--<dir>.png`

Full-page PNGs. Checked into the repo for the baseline; CI re-generates
on every PR and uploads as artifacts. The visible-improvement HTML
consumes these via static HTML.

### Invariant Report

`frontend/tests/visual/__report__.json` records per-route:

```json
{
  "id": "student-dashboard",
  "breakpoint": 360,
  "direction": "rtl",
  "horizontalScroll": false,
  "overflowingElements": [],
  "focusRingVisible": true
}
```

## Invariants Asserted

For each route × breakpoint × direction:

1. **No horizontal scroll on document.** `document.documentElement.scrollWidth ≤ window.innerWidth`.
2. **No element overflows the viewport horizontally.** No element's
   `getBoundingClientRect().right > window.innerWidth + 1`.
3. **Focus ring visible.** After `Tab` from `document.body`, the first
   focusable element shows a visible outline (or `box-shadow` matching
   the focus ring token).
4. **No layout shift after first paint.** Capture at network-idle +
   500 ms; CLS sample over a 2 s observation window.

Invariant failures fail the spec. Capture mismatches do NOT fail (they
require human review).

## Authentication

The audit uses programmatic login through the `/auth` endpoint, not the
UI. Each role's token is acquired once per worker and cached for the
duration of the spec run.

## Localization

For each direction:
- LTR: `<html lang="en" dir="ltr">`
- RTL: `<html lang="ar" dir="rtl">`

Set via the existing i18n locale switcher in the auth store before
each navigation.

## Reduced-Motion Coverage

A separate spec, `frontend/tests/visual/reduced-motion.spec.ts`, runs
the audit with `prefers-reduced-motion: reduce` emulated via
`page.emulateMedia({ reducedMotion: 'reduce' })`. Asserts:

- No reveal animation runs.
- No counter animates (final value rendered immediately).
- Page transition collapses to ≤ 80 ms fade.

## Visible-Improvement HTML

`scripts/visual-diff.html` is a static page that lists every entry in
the manifest and renders the before / after capture side by side for
each (breakpoint × direction). The reviewer scrolls through and rates.

## Local Workflow

```bash
# Run full audit (generates captures + report)
npm run -w frontend test:visual

# Run reduced-motion spec only
npm run -w frontend test:visual:reduced-motion

# View the visible-improvement comparison
open scripts/visual-diff.html
```

## CI Integration

The audit runs in CI on every PR that touches `frontend/`:

- Captures are uploaded as artifacts.
- The invariant report is parsed; any failure fails the job.
- Capture diffs are NOT auto-blocking — they surface for human review.

## Reproducibility

- Routes manifest is the single source of truth.
- Captures are deterministic given the same data + viewport + locale.
- The audit can re-run from a clean checkout with no manual setup
  beyond the test-user secrets.

## Versioning

This contract is **v1.0.0**.

- Adding a route: MINOR (no breaking change to existing captures).
- Removing a route: MAJOR.
- Adding a breakpoint or direction: MINOR.
- Changing the report schema: MAJOR.
