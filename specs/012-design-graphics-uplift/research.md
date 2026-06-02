# Phase 0 Research — Design, Theming & Graphics Uplift

**Branch**: `012-design-graphics-uplift` | **Date**: 2026-06-02

This document resolves every open technical decision the spec leaves to planning. Each row records the **decision**, **rationale**, and the **alternatives considered**. The five clarifications captured in the spec's `Clarifications` session are referenced directly; this document goes deeper on the *how*.

---

## R-001 — Theme transport: CSS custom properties under `[data-theme="…"]`

**Decision**: Theme is applied via a single root-level attribute `data-theme` on `<html>` (`light` or `dark`). All theme-bearing tokens live in `tokens.css` under `:root[data-theme="light"] { … }` and `:root[data-theme="dark"] { … }` blocks. A separate `@media (prefers-contrast: more)` block layered inside each theme swaps shadows, glass and illustration fill modes. Theme application during initial page load is done by an inline `<script>` in `index.html` that reads localStorage / OS preference and sets `document.documentElement.dataset.theme` BEFORE any stylesheet paint, eliminating flash-of-wrong-theme.

**Rationale**:
- Single attribute toggle is the cheapest possible re-paint (one selector match, no JS re-evaluation per element).
- CSS variables already drive the design system from `001-*` / `002-*` — extending them to a per-theme block does not require touching components.
- Inline pre-paint script is the standard pattern (Next.js, Vercel, Linear) and is the only way to hit the "no flash, no flicker" requirement (FR-003).
- `@media (prefers-contrast: more)` nesting is well-supported in evergreen browsers and matches the Q1 clarification (no third theme).

**Alternatives considered**:
- *Class-based theming (`.theme-light`, `.theme-dark`)*: works, but a pre-paint script must add a class to `<html>` exactly the same way; semantics are weaker than `data-theme`.
- *React Context that re-renders the tree*: rejected — re-rendering the entire app on theme switch is expensive and triggers chart re-renders for no reason; CSS-only switch is faster and simpler.
- *Separate `light.css` / `dark.css` files swapped at runtime*: rejected — doubles the critical CSS budget and re-loads on switch.

---

## R-002 — Theme persistence and sync

**Decision**: Two-layer persistence (matches Q2 clarification):

1. **Local layer** (everyone, including guests): `localStorage` key `madarek.theme` ∈ `{"light", "dark", "system"}`. Default is `"system"` (defer to OS).
2. **Profile layer** (authenticated users only): `User.themePreference` enum column `'LIGHT' | 'DARK' | 'SYSTEM'`, default `'SYSTEM'`.

**Sync behaviour** on sign-in (`useTheme()` reconciles):
- If the user has a non-default profile value AND the local value is the default `"system"` → adopt the profile value, mirror it locally.
- If the local value is non-default AND the profile value is `'SYSTEM'` → push the local value to the profile.
- If both are non-default and differ → the **most recently changed** wins. We use a tiebreak timestamp (`User.themePreferenceUpdatedAt`) — the column with the later timestamp is canonical, the other is updated to match.
- On sign-out → local layer is preserved on the device for guest experience continuity.

**Rationale**: matches the Q2 clarification (localStorage + profile + two-way sync) without becoming a CRDT. The "most recent wins" rule is intuitive for an end-user and trivially implementable. Default `'SYSTEM'` lets us respect `prefers-color-scheme` for users who never opt in.

**Alternatives considered**:
- *Profile-only*: rejected — guests get no theme persistence.
- *Local-only*: rejected — fails the Q2 cross-device requirement.
- *Last-write-wins by string compare*: rejected — order-dependent, non-deterministic across timezones.

---

## R-003 — Role accent: 7 named CSS variable slots

**Decision**: One `--role-accent` token consumed at the chrome layer. Its value is set via a `data-role` attribute on a high-level element (typically `<body>`). Seven enumerated values map to seven curated accents — student, faculty, department-head, dean, admin, quality, owner — with explicit Light + Dark hex pairs. The same token is used for sidebar active state, topbar accent, KPI tile rim, and primary-CTA outline. Content text colours never bind to `--role-accent`.

**Rationale**: keeps the role-aware identity (FR-004) confined to one CSS variable and one DOM attribute — no JS plumbing, no per-component theming. The seven values are pre-vetted for AA contrast against Light + Dark surfaces. Switching role changes one attribute; everything tinted from `--role-accent` updates in one paint.

**Alternatives considered**:
- *Per-role full theme (separate `[data-theme=light-student]`, `…-faculty`)*: rejected — explodes 2 themes to 14, no design payoff at the rim/active layer.
- *Per-role colour at every component*: rejected — fragile and easy to drift.

---

## R-004 — College accent with contrast-safe fallback

**Decision**: A college's identity colour from `001-*` college identity profiles is projected into a `--college-accent` token, but only after passing a contrast gate at runtime:

1. The college's hex is placed on the chrome (header glow, breadcrumb, primary-CTA outline, hover ring).
2. Before painting, we compute APCA Lc (or fall back to WCAG L*) for the foreground text on top of every surface that uses the accent.
3. If the contrast falls below the gate (Lc 60 / 4.5:1), the token is replaced by the matching role-accent value or by a token-derived "safe accent" mapped to the closest hue.

**Rationale**: matches FR-005's "fall back to a safe accent if the college colour fails contrast" while keeping the visible identity wherever the college's brand colour is contrast-safe. Performing the gate at runtime catches palette drift if a college identity is later changed.

**Alternatives considered**:
- *Pre-compute a safe-accent table at build time*: rejected — palette additions/edits would require a re-build.
- *Apply college colour without a gate*: rejected — fails NFR-003.

---

## R-005 — Illustration system: inline SVG + `<Illustration name=… />` wrapper

**Decision**: Each scene is a TSX component returning inline SVG (no `<img src>`, no PNG/JPG). The `<Illustration>` wrapper:
- Accepts `name` (registered scene), `role?` (for the role-intro frame), `className?`, `aria-label?`.
- Reads `[data-theme]` from the document and renders the matching variant.
- Reads `dir` from the document (or via i18n hook) and emits the LTR or RTL composition.
- Uses CSS variables for stroke / palette / fill so theme + `prefers-contrast: more` are governed by tokens, not SVG attributes.
- Lazy-loads non-critical scenes via `React.lazy()` so the homepage hero (the only critical scene) is the only one eagerly bundled.

Family rules (documented under `contracts/illustration-system.md`):
- Stroke: `1.5` device-independent units, `round` linecap, `round` linejoin.
- Palette: 6 named hues drawn from `tokens.css` (`--ill-hue-1`..`--ill-hue-6`), each with a Light + Dark variant.
- Perspective: front-facing or 30° isometric, never mixed in the same scene.
- Character archetype: optional, but if present must use the same head proportions and clothing palette across scenes.
- Motif library: ≤ 12 reusable shapes (book, screen, lamp, leaf, arrow, …); new motifs require a registry update.

**Rationale**: inline SVG = themable via CSS, accessible alt text via component, no extra HTTP request, scales with DPI. A wrapper component (instead of raw `<svg>` in pages) is the governance handle — drift attempts must edit the registry.

**Alternatives considered**:
- *PNG/JPG raster*: rejected — can't theme via CSS, can't honour `prefers-contrast: more`, retina-doubles bundle size.
- *Lottie / animated SVG packs*: rejected — Spec's Disallowed-Patterns list bans them.
- *External CDN icons*: rejected — leaks visual identity ownership outside the project.

---

## R-006 — Custom chart.js treatment via plugins

**Decision**: Extend the existing `lib/chartTheme.ts` with three Chart.js plugins (no new runtime dependencies — all are first-party `chart.js` plugin hooks):

1. **`madarekTooltipPlugin`** — replaces the default tooltip with a designed surface (platform typography, surface tokens, shadow stack, rounded radius, soft fade).
2. **`madarekFadingAxisPlugin`** — paints axis labels and gridlines via `afterDraw`, applying a horizontal/vertical fade towards the chart edge (gradient mask).
3. **`madarekGradientFillPlugin`** — converts area fills under line charts into a vertical gradient sourced from `--chart-{idx}` tokens.

Rounded line caps are achieved via dataset config (`borderCapStyle: 'round'`, `borderJoinStyle: 'round'`). Smooth between-state transitions use `chart.update('none')` + a CSS transition wrapper for the canvas.

Dark-mode palette: a parallel set of `--chart-{idx}-dark` tokens ships in `tokens.css`. `chartTheme.ts` reads `getComputedStyle(document.documentElement)` to pick the active variant on every render.

**Rationale**: stays inside the existing chart.js install — no bundle inflation. Plugins are the framework's intended extension surface for visual treatment.

**Alternatives considered**:
- *Replace chart.js with Visx/Recharts/D3*: rejected — too large a swap for a visual treatment, drops working code.
- *CSS-only chart styling*: rejected — can't reach Canvas2D primitives.

---

## R-007 — Elevation language: shadow stack + glass + z-order tokens

**Decision**: A new section in `tokens.css` defines:
- `--elev-1` through `--elev-5` — composite `box-shadow` values per level (each level = ambient + key shadow). Light variant uses true blacks at low alpha; dark variant reduces shadow contribution and adds a top-edge highlight via inset shadow.
- `--glass-bg` and `--glass-blur` — the surface's translucent fill + the `backdrop-filter` blur radius. Set to opaque fallback values when `@supports not (backdrop-filter: blur(0))` matches.
- `--z-modal`, `--z-sheet`, `--z-popover`, `--z-dropdown`, `--z-toast`, `--z-tooltip` — six named stacking levels.

Each overlay component (`Modal`, `Sheet`, `Popover`, `Dropdown`, `Toast`, `NotificationPanel`, `CommandPalette`, `Lightbox`) consumes its assigned `--z-*` and `--elev-*` token and applies `--glass-bg` only if it overlaps content (modal, sheet, popover, command-palette).

**Rationale**: every overlay derives from one source. Z-order arguments in PRs become a token-update conversation, not a per-component fight.

**Alternatives considered**:
- *Tailwind-style `shadow-md`, `shadow-lg`*: rejected — Madrak's design system is token-based; introducing utility-class shadows splits the source of truth.
- *Per-component shadow values*: rejected — exact problem the elevation language exists to solve.

---

## R-008 — Onboarding state machine

**Decision**: Onboarding is a 4-frame in-app flow (3 generic + 1 role-intro per Q3). State per user is one column on `User`: `onboardingCompletedAt: DateTime?`. Trigger logic:

- On every authenticated render of the dashboard, the SPA reads `me.onboardingCompletedAt` (already in the existing `/api/v1/me` payload). If `null`, mount `<OnboardingFlow />` after the first paint.
- The flow has 4 frames; frame 4 swaps illustration + copy by `me.role`.
- Skip and Complete both call `POST /api/v1/me/onboarding/complete` which sets `onboardingCompletedAt = now()`.
- "Replay from help" calls the same render mechanism but bypasses the column check (the user explicitly asks for it).

For users who existed BEFORE this feature shipped: the migration leaves the column `null`, so the flow runs once on their next sign-in (matches Q3).

**Rationale**: one column, one endpoint, one component. The "single shared flow" decision keeps production cost flat — adding a role to the system in the future means only the role-intro frame's copy table needs an entry, not a new flow.

**Alternatives considered**:
- *Per-role flow definitions*: rejected by Q3.
- *Dismiss-only (never re-fire)*: rejected — needs explicit "replay from help" entry per the spec.

---

## R-009 — Milestone catalogue + per-user fire state

**Decision**: Three named milestones (Q4 fixed catalogue):

| ID | Trigger source | Where the trigger lives |
|----|----------------|--------------------------|
| `first-assignment-complete` | `Submission.status` transitions to `SUBMITTED` AND it is the user's first such transition | Backend `submissions` service hook |
| `first-course-complete` | `Enrollment.status` transitions to `COMPLETED` AND it is the user's first such transition | Backend `enrollments` service hook |
| `exam-window-opens` | Active exam window starts AND the user is enrolled in its course AND no entry exists in `firedMilestones` for this milestone-id-with-window-suffix | Backend `exam-window` cron tick |

State is `User.firedMilestones: String[]` — an array of milestone IDs already fired for this user. For `exam-window-opens`, the entry is keyed `exam-window-opens:<windowId>` so each window fires at most once per user.

The frontend reads `me.firedMilestones` from the user payload. Backend hooks call `POST /api/v1/me/milestones/:id/fire` to atomically append (using Postgres `array_append`) and return the updated array. The frontend mounts `<MilestoneScene id=… />` once for newly added IDs.

**Rationale**: one column on User, append-only writes (no race), three documented triggers. No new tables.

**Alternatives considered**:
- *Separate `MilestoneFire` table*: rejected — adds a join for a 1-to-N where N ≤ 3 in V1.
- *Frontend-only firing (localStorage flag)*: rejected — the trigger conditions are server-side data (a submission existing, an enrollment completing), so the trigger must live on the server.

---

## R-010 — Section-narrative scroll accents

**Decision**: A new motion utility `useSectionAccent(ref, opts)` wraps the existing `001-*` `IntersectionObserver`-based reveal helper. It fires once per section (records `accent-fired` on the element's `dataset` and observes only that element). Idle pause is governed by `document.hidden` and a `requestIdleCallback`-driven heartbeat that suspends `requestAnimationFrame` callbacks for the accent when the viewport has been still for ≥ 600 ms.

Accent kinds (selectable per section): `underline-draw`, `number-tick`, `scene-paint`, `quote-fade`, `parallax-shift` (≤ 8 px translation).

Reduced-motion support: every accent has a "final-state-only" branch that the wrapper renders when `matchMedia('(prefers-reduced-motion: reduce)')` is true.

**Rationale**: extends the foundation from `001-*` instead of inventing a new mechanism. One-shot semantics + idle pause are spec-mandated.

**Alternatives considered**:
- *GSAP / Framer Motion library*: rejected — bundle weight and the existing primitives are sufficient.
- *Always-on parallax*: rejected — Disallowed-Patterns bans idle motion.

---

## R-011 — Surface inventory governance

**Decision**: Two artefacts ship under `tests/audit/`:

1. `surface-inventory.spec.ts` — Playwright test that visits every route in a curated route table, captures the full DOM and a screenshot in (Light + Dark) × (LTR + RTL) at three viewports, and writes a JSON inventory to `surface-inventory.json` with: `{ route, theme, dir, viewport, illustrations[], overlays[], roleAccent, collegeAccent, motionTreatment }`.
2. `surface-drift.spec.ts` — diffs the latest inventory against the committed baseline. Drift kinds (off-token colour, off-family illustration, ad-hoc shadow, ad-hoc motion duration) are detected via DOM selectors against a known token set; any positive diff fails CI.

Both run in the existing Playwright runner. The baseline JSON is checked in.

**Rationale**: matches FR-018-style governance from `002-*` but stronger — drift is now a CI failure, not just a manual review note.

**Alternatives considered**:
- *Manual quarterly audit*: rejected — drift returns within two cycles.
- *Storybook visual regression*: rejected — Madrak doesn't currently use Storybook.

---

## R-012 — Performance budget verification

**Decision**: Add a `tests/perf/budget-verify.spec.ts` Playwright test that:
- Loads each of: homepage, login, student dashboard, faculty dashboard, college page (a known-tinted one), course detail.
- Asserts `transferSize` ≤ documented per-route budget + 18 KB headroom for V1.
- Asserts FCP regression ≤ 5 % vs the baseline measured on `main` before this feature merges.
- Asserts theme switch produces 0 CLS via `PerformanceObserver({ entryTypes: ['layout-shift'] })`.

The baseline is captured once on `main` immediately before the first `012-*` task lands and is committed under `tests/perf/baseline.json`.

**Rationale**: protects NFR-001, NFR-002, SC-007 with a test that is cheap to run on PR.

**Alternatives considered**:
- *Lighthouse CI*: rejected — the Madrak pipeline doesn't run it; adding it for this single feature is over-investment.

---

## Resolution summary

| Open question | Resolved by |
|---------------|-------------|
| Theme transport mechanism | R-001 |
| Theme persistence + sync rule | R-002 |
| Role / college accent expression | R-003, R-004 |
| Illustration format + governance | R-005 |
| Custom chart treatment | R-006 |
| Elevation / glass / z-order tokens | R-007 |
| Onboarding state machine + scope | R-008 |
| Milestone catalogue + state | R-009 |
| Scroll narrative + reduced-motion | R-010 |
| Surface inventory governance + CI | R-011 |
| Performance budget verification | R-012 |

All Phase 0 unknowns resolved. Phase 1 (data-model + contracts + quickstart) follows.
