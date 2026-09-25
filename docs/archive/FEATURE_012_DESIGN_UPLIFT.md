# Feature 012: Design, Theming & Graphics Uplift — World-Class Tier

## Overview

**Branch**: `012-design-graphics-uplift`  
**Status**: In Progress  
**Base**: `001-premium-motion-system`, `002-visual-uplift`, `003-motion-graphics-layer`

Three pillars:
1. **Theming** — Full Light + Dark themes with role/college accents, `prefers-contrast: more` adaptation
2. **Bespoke Graphics** — Documented illustration family (6 V1 scenes + onboarding 4-frame + milestone scene)
3. **Scene-Level Liveliness** — Section-narrative accents, elevation language, custom chart treatment, onboarding + 3 milestones

## Contracts (7 files)

| Contract | Purpose |
|----------|---------|
| `theme-tokens.md` | CSS custom properties, `[data-theme]` blocks, role/college accents, elevation, illustration palette, chart palette, prefers-contrast |
| `theme-state.md` | `useTheme()` hook, persistence (localStorage + profile), OS watcher, sync algorithm, backend endpoints |
| `illustration-system.md` | SVG family rules, `<Illustration>` component, scene registry (9 V1 names), audit gate |
| `elevation-language.md` | Shadow stack, glass tokens, z-order hierarchy, surface assignment table |
| `chart-treatment.md` | 3 Chart.js plugins (tooltip, fading axis, gradient fill), palette resolver, theme-change behavior |
| `onboarding-milestone.md` | State machines, triggers, 3 backend endpoints, frontend hooks |
| `audit-script.md` | Playwright surface inventory + drift detection, CI integration |

## Data Model Changes

**User model additions**:
```prisma
themePreference          ThemePreference @default(SYSTEM)
themePreferenceUpdatedAt DateTime        @default(now())
onboardingCompletedAt    DateTime?
firedMilestones          String[]        @default([])
```

**ThemePreference enum**: LIGHT, DARK, SYSTEM

## Backend Endpoints (3 new)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/me/theme` | GET | Read user theme preference |
| `/api/v1/me/theme` | PUT | Update theme preference |
| `/api/v1/me/onboarding/complete` | POST | Mark onboarding complete |
| `/api/v1/me/milestones/:id/fire` | POST | Fire milestone (internal service) |

## Frontend Additions

### Styles (`frontend/src/styles/`)
- `tokens.css` — Extended with 012 additive layer (role-accent, college-accent, elevation, illustration palette, prefers-contrast)

### Lib (`frontend/src/lib/`)
- `theme.ts` — `useTheme()` hook, persistence engine, OS watcher
- `chartTheme.ts` — Extended with 3 plugins, gradient fills, dark-mode palette
- `illustrations/` — Scene registry + 9 V1 scenes (homepage-hero, error-404, empty-notifs, empty-search, milestone-section, onboarding frames 1-3, onboarding-role-intro)

### Components (`frontend/src/components/`)
- `Illustration.tsx` — Theme/RTL aware SVG wrapper
- `ThemeSwitcher.tsx` — Header control
- `OnboardingFlow.tsx` — 4-frame sequence with skip
- `MilestoneScene.tsx` — One-shot celebratory scene
- `overlays/` — Modal, Sheet, Popover, Toast, etc. with elevation tokens
- `primitives/States.tsx` — Extended to use `<Illustration>`
- `layout/Sidebar.tsx`, `Topbar.tsx` — Role/college accent application

### Hooks (`frontend/src/hooks/`)
- `useTheme.ts` — Theme contract
- `useOnboardingState.ts` — Onboarding flow control
- `useMilestone.ts` — Milestone detection/presentation

### Pages
- No new routes — existing pages consume new systems

### Tests
- `tests/unit/theme.test.ts`, `illustration.test.tsx`, `chartTheme.test.ts`
- `tests/audit/surface-inventory.spec.ts`, `surface-drift.spec.ts`

## Performance Targets

| Metric | Target |
|--------|--------|
| Theme switch | ≤ 80 ms, 0 CLS |
| FCP regression | ≤ 5% per route |
| Illustration scene | ≤ 8 KB gzipped |
| Parallax/animation | 60 fps on reference mobile |
| Bundle budget | ≤ 250 KB gzip (student dashboard) |

## Acceptance Criteria

- [ ] 100% routes render in Light + Dark with zero untokenised colour leaks
- [ ] WCAG AA body text, AAA numeric KPIs in both themes + prefers-contrast
- [ ] 6 V1 illustration scenes ship with Light/Dark variants
- [ ] Theme switch instant, no flicker
- [ ] Role/college accents visible but never overpower content
- [ ] Onboarding runs once per user (including pre-existing)
- [ ] 3 milestones fire once per scope
- [ ] Surface inventory audit passes CI drift gate

## Implementation Phases

1. **T001-T010**: Theming foundation (tokens, hook, switcher, persistence, OS detection)
2. **T011-T015**: Theme application sweep across all routes
3. **T016-T020**: Illustration system + V1 scenes
4. **T021-T024**: Custom chart treatment
5. **T025-T028**: Elevation language + overlay surfaces
6. **T029-T031**: Onboarding flow (backend + frontend)
7. **T032-T034**: Milestone catalogue
8. **T035-T037**: Section-narrative accents
9. **T038-T040**: Surface inventory + drift CI gate
