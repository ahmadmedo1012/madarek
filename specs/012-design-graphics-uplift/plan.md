# Implementation Plan: Design, Theming & Graphics Uplift — World-Class Tier

**Branch**: `012-design-graphics-uplift` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-design-graphics-uplift/spec.md`

## Summary

The next altitude on top of `001-premium-motion-system`, `002-visual-uplift`, and `003-motion-graphics-layer`: a deliberate tier-jump in design-system depth. Three pillars:

1. **Theming** — full Light + Dark themes covering surface, accent, chart palette, illustration variants and elevation; both adapting under `prefers-contrast: more`. Per-role accent + per-college accent at the chrome layer. Two-way persistence (localStorage + `themePreference` on the user profile).
2. **Bespoke graphics** — a documented illustration family (palette, stroke, perspective, motif library) shipping 6 high-impact scenes inside V1 (`homepage-hero-scene`, `404`, `no-notifications`, `no-search-results`, `onboarding-sequence` 4-frame, `milestone-section-complete`); the rest of the 12+ catalogue in a follow-up cycle inside the same family.
3. **Scene-level liveliness** — section-narrative one-shot accents on homepage and key landing surfaces, designed elevation language for every overlay, custom chart treatment replacing chart.js defaults, onboarding (single 4-frame flow, runs once for every user post-release) and three named milestones (`first-assignment-complete`, `first-course-complete`, `exam-window-opens`).

Approach: extend `tokens.css` with a `[data-theme]` system + a `prefers-contrast` adaptation block; ship a `useTheme()` hook with the documented persistence contract; ship an `<Illustration>` component plus an SVG sprite set covering the 6 V1 scenes with `light`/`dark` variants and RTL composition; harden the existing `chartTheme.ts` with the custom treatment (rounded caps, gradient area fills, designed tooltip plugin, fading-edge axis); wire onboarding + milestone state through new Prisma columns and three backend endpoints; sweep every overlay surface to the new elevation tokens. **No redesign of existing motion or composition tokens** — every gain is composition + new tokens layered on top.

## Technical Context

**Language/Version**: TypeScript 5.7, React 18.3, Node ≥ 20 (unchanged from `001-*`).

**Primary Dependencies**: react-router-dom 6.28, @tanstack/react-query 5.62, zustand 5.0.2, lucide-react 0.469, chart.js 4.4.7 + react-chartjs-2 5.2.0, i18next 23.16, the motion primitives shipped in `001-*`. Backend: Express 4.21, Prisma 5.22 + PostgreSQL, zod 3.23. **No new runtime dependencies** — all new visual work uses inline SVG, CSS custom properties, and existing libraries.

**Storage**: PostgreSQL via Prisma. New columns on `User` (`themePreference`, `onboardingCompletedAt`, `firedMilestones`) — see `data-model.md`. No new tables.

**Testing**: Vitest + RTL for the new theme hook + illustration component; Playwright for the cross-route theme/illustration audit and the surface inventory script. Backend: integration tests for the three new endpoints (theme, onboarding, milestones).

**Target Platform**: Modern browsers — Chrome/Edge/Safari/Firefox latest two (CSS custom properties + `prefers-color-scheme` + `prefers-contrast` baseline). Reference mobile = Snapdragon-6 / 4 GB RAM Android (carries from `001-*`). `backdrop-filter` is progressively enhanced — surfaces fall back to opaque fill on browsers without it.

**Project Type**: Web application (existing `frontend/` + `backend/`).

**Performance Goals**: theme switch ≤ 80 ms (one paint cycle), CLS during switch = 0, FCP regression ≤ 5 % per route, 60 fps on parallax + scroll-narrative accents on reference mobile, illustration scene weight ≤ 8 KB gzipped per scene.

**Constraints**: Constitutional bundle budget (Principle VI) — total ≤ 250 KB gzip on student dashboard. Carries from `002-*`: tabular numerals on metrics, Lucide-only icons, type-role token discipline. Carries from `001-*`: `prefers-reduced-motion` parity, RTL parity, WCAG AA contrast on body / AAA on numeric KPIs. Disallowed-Patterns list in `spec.md` is a binding gate — no infinite loops added, no glass on opaque surfaces, no off-family illustration.

**Scale/Scope**: 7 role surfaces, ~100 routes, ~50 chart instances, 1 homepage. V1 ships: 1 illustration system + 6 finished scenes (homepage-hero + 404 + no-notifications + no-search-results + onboarding 4-frame + milestone-section-complete) + 1 designed elevation language across ~9 overlay types + 1 custom chart treatment + 3 backend endpoints + 3 Prisma columns. Audit covers ~25 representative routes × 4 viewports × 2 themes × 2 directions = 400 captures.

## Constitution Check

*GATE: Pre-design.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Premium Experience & Design Excellence | ✅ Pass | This feature is the literal next-altitude instantiation of the principle. NFR-001..NFR-006 + Disallowed-Patterns are the explicit guardrails. |
| II. Mobile-First, Accessible & Bilingual | ✅ Pass | NFR-005 locks RTL parity for every illustrated/themed surface; NFR-003 holds AA/AAA across Light + Dark + `prefers-contrast: more`; NFR-004 locks reduced-motion parity. |
| III. University-Truth Alignment | ✅ Pass | College-accent FR-005 sources from `001-*` college identity profiles. Homepage hero scene composes with real UoZ statistics from `002-*`. No synthetic placeholders. |
| IV. Role-Based Governance & Least Privilege | ✅ Pass | No business-logic / permission changes. Role-accent FR-004 is purely presentational (chrome tint), enforced no further than UI. |
| V. AI-Assisted, Human-Authoritative | ✅ Pass | No AI decision pathways modified. |
| VI. Scalability & Integration Readiness | ✅ Pass | No new runtime dependency. Bundle add target ≤ 18 KB gzip on student dashboard route (theme tokens + 1-2 illustrations + chart-treatment helpers). Three new `/api/v1/*` endpoints follow the existing versioning contract. |
| VII. Security, Privacy & Auditability | ✅ Pass | New columns store presentation preferences only, no PII. Theme-sync endpoint accepts an enum value (`light` / `dark` / `system`) — input validated at the API boundary. No log lines emit user PII for these columns. |

**Pre-design**: PASS. Zero violations.

**Post-design** (re-checked after Phase 1): PASS. The Phase 1 contracts are surface-level (tokens, hook, component, three endpoints with strict zod schemas). No `001/002/003-*` contracts altered.

## Project Structure

### Documentation (this feature)

```text
specs/012-design-graphics-uplift/
├── plan.md                     # this file
├── spec.md                     # feature spec (with Clarifications session 2026-06-02)
├── research.md                 # Phase 0 — R-001..R-012
├── data-model.md               # Phase 1 — Prisma columns + theme/illustration entities
├── quickstart.md               # Phase 1 — adoption guide
├── contracts/
│   ├── theme-tokens.md         # CSS custom properties + [data-theme] surface contract
│   ├── theme-state.md          # useTheme() hook + persistence contract
│   ├── illustration-system.md  # SVG family rules + <Illustration> component contract
│   ├── elevation-language.md   # shadow stack + radius + glass + z-order tokens
│   ├── chart-treatment.md      # custom chart.js plugin + tooltip + axis treatment
│   ├── onboarding-milestone.md # state machine + backend endpoints
│   └── audit-script.md         # Playwright surface-inventory contract
└── checklists/
    └── requirements.md         # spec quality checklist (already PASS, re-validated post-clarify)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── styles/
│   │   ├── tokens.css            # extend: theme blocks (data-theme="light|dark"),
│   │   │                         #         prefers-contrast: more block, role-accent
│   │   │                         #         tokens, college-accent token slots,
│   │   │                         #         elevation tokens, glass tokens
│   │   ├── motion.css            # unchanged (from 001-*)
│   │   ├── components.css        # extend: surface depth + glass utility classes
│   │   ├── landing.css           # extend: section-narrative accents (one-shot)
│   │   ├── colleges.css          # extend: college-accent application
│   │   └── polish.css            # gradual prune of superseded sections
│   ├── lib/
│   │   ├── theme.ts              # NEW: detect / set / sync theme
│   │   ├── chartTheme.ts         # extend: custom treatment plugin, designed
│   │   │                         #         tooltip, fading-edge axis, gradient area
│   │   └── illustrations/
│   │       ├── index.ts          # NEW: scene registry + lazy SVG loader
│   │       ├── homepage-hero.tsx # NEW: V1 scene
│   │       ├── error-404.tsx     # NEW: V1 scene
│   │       ├── empty-notifs.tsx  # NEW: V1 scene
│   │       ├── empty-search.tsx  # NEW: V1 scene
│   │       ├── onboarding/       # NEW: 4 frames (3 generic + 1 role-intro)
│   │       └── milestone-section.tsx # NEW: V1 scene
│   ├── components/
│   │   ├── Illustration.tsx      # NEW: scene component (theme + RTL aware)
│   │   ├── ThemeSwitcher.tsx     # NEW: header control
│   │   ├── motion/               # unchanged (from 001-*)
│   │   ├── primitives/
│   │   │   ├── States.tsx        # extend: empty/error states use <Illustration/>
│   │   │   └── …                 # other primitives unchanged
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # extend: role-accent application
│   │   │   ├── Topbar.tsx        # extend: theme switcher + role-accent
│   │   │   └── …                 # other layout components unchanged
│   │   ├── overlays/             # NEW: shared elevation surfaces
│   │   │   ├── Modal.tsx         # NEW: applies elevation tokens
│   │   │   ├── Sheet.tsx
│   │   │   ├── Popover.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── …
│   │   └── onboarding/
│   │       ├── OnboardingFlow.tsx # NEW: 4-frame sequence + skip
│   │       └── MilestoneScene.tsx # NEW: one-shot scene presenter
│   ├── hooks/
│   │   ├── useTheme.ts           # NEW: theme contract (see contracts/theme-state.md)
│   │   ├── useOnboardingState.ts # NEW: read/write onboarding completion
│   │   └── useMilestone.ts       # NEW: fire + persist milestone events
│   └── pages/                    # consume the above; no new routes
└── tests/
    ├── audit/
    │   └── surface-inventory.spec.ts  # NEW: Playwright sweep (themes × routes)
    └── unit/
        ├── theme.test.ts              # NEW: theme detection / persistence
        ├── illustration.test.tsx      # NEW: <Illustration/> family compliance
        └── chartTheme.test.ts         # NEW: custom treatment behaviour

backend/
├── src/
│   ├── modules/
│   │   ├── users/                # extend: theme + onboarding columns in mapper
│   │   ├── theme/                # NEW: GET/PUT /api/v1/me/theme
│   │   ├── onboarding/           # NEW: POST /api/v1/me/onboarding/complete
│   │   └── milestones/           # NEW: POST /api/v1/me/milestones/:id/fire
│   └── …                         # other modules unchanged
├── prisma/
│   ├── schema.prisma             # extend: User.themePreference,
│   │                             #         User.onboardingCompletedAt,
│   │                             #         User.firedMilestones (String[])
│   └── migrations/
│       └── 20260602xx_design_uplift_state/  # NEW migration
└── tests/
    └── modules/
        ├── theme.test.ts          # NEW: contract test
        ├── onboarding.test.ts     # NEW: contract test
        └── milestones.test.ts     # NEW: contract test
```

**Structure Decision**: Web application (`frontend/` + `backend/`) — preserves the existing structure. All new visual work lives under `frontend/src/{styles,lib,components,hooks}`. The only backend additions are three small REST endpoints under `/api/v1/me/*` plus three Prisma columns on `User`. No new top-level packages.

## Phase 2 Tasks (preview only — generated by `/speckit-tasks`)

The next phase will produce `tasks.md` from this plan + the contracts. Anticipated structure:

- **T001..T010** Theming foundation: tokens, `useTheme()`, switcher, persistence wiring, OS-preference detection, `prefers-contrast` adaptations.
- **T011..T015** Theme application sweep: every primary route audited and corrected, including charts in dark mode and the role-accent / college-accent at chrome.
- **T016..T020** Illustration system: `<Illustration/>`, scene registry, V1 scenes (6 surfaces, 4 onboarding frames count as one scene set).
- **T021..T024** Custom chart treatment: tooltip plugin, axis fading, gradient area, dark-mode palette tuning.
- **T025..T028** Elevation language: tokens, glass utility, overlay surfaces (modal/sheet/popover/dropdown/toast/notification panel/command palette/lightbox).
- **T029..T031** Onboarding flow: backend + frontend + skip / replay-from-help wiring.
- **T032..T034** Milestone catalogue: backend + frontend + three named milestone scenes/triggers.
- **T035..T037** Section-narrative accents on homepage and key landings (one-shot, idle-pause).
- **T038..T040** Surface-inventory governance: Playwright audit script, inventory artefact, drift CI gate.

## Complexity Tracking

> Constitution Check passed with zero unjustified violations. No entries.
