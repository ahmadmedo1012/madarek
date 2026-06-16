# Implementation Plan: Premium Experience & Motion System

**Branch**: `001-premium-motion-system` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-premium-motion-system/spec.md`

## Summary

Formalize Madrak's perceived-quality layer as a single, token-driven motion +
interaction system. The work extends the existing `frontend/src/styles/tokens.css`
canon and the `polish.css` patterns into a complete, documented contract:
canonical motion tokens (durations, easings, distances, stagger), interaction
state tokens (hover, focus, pressed, selected, disabled, loading), platform-wide
page/navigation transitions, a per-action loading + skeleton system, animated
counters, scroll-reveal primitives, a college identity profile, homepage
narrative sections, and RTL/LTR + reduced-motion guarantees.

Approach: a thin React + CSS layer added on top of the running stack
(React 18, react-router-dom 6, Vite, IBM Plex Sans Arabic). Motion is delivered
through a tiny `Motion` primitive set (`<PageTransition>`, `<Reveal>`,
`<AnimatedNumber>`, `<Skeleton>`) plus token-driven CSS — no new heavy
animation library. View Transitions API where available, CSS keyframes as the
universal fallback, IntersectionObserver for reveals/counters,
`matchMedia('(prefers-reduced-motion: reduce)')` re-evaluated per navigation.

## Technical Context

**Language/Version**: TypeScript 5.7 (frontend), React 18.3, Node ≥ 20

**Primary Dependencies**: react-router-dom 6.28, @tanstack/react-query 5.62,
zustand 5.0.2, lucide-react 0.469, IBM Plex Sans Arabic (already loaded);
existing CSS layered architecture (`@layer tokens, base, layout, components,
pages, overrides`). **No new animation library** — motion uses the platform
View Transitions API, CSS animations/transitions, and IntersectionObserver.

**Storage**: N/A for this feature. College Identity Profile fields surface
through the existing data layer; no schema migration required for the motion
system itself (a follow-up backend task captures the new identity columns
when colleges adopt them).

**Testing**: Vitest + React Testing Library for primitives (`Reveal`,
`AnimatedNumber`, `Skeleton`, `PageTransition`); axe-core via @axe-core/react
for accessibility checks; manual QA matrix against acceptance scenarios on
desktop/tablet/mobile in both LTR and RTL.

**Target Platform**: Modern browsers — Chrome/Edge/Safari/Firefox latest two
versions; reference mid-tier mobile = Android device class equivalent to a
Snapdragon 6-series, 4 GB RAM (typical University of Zawia student baseline).

**Project Type**: Web application (existing `frontend/` + `backend/`).

**Performance Goals**: 60 fps motion on the reference device; ≤ 1 dropped
frame/second during transitions; CLS ≤ 0.05 on every primary route; page
transition duration ≤ 380 ms; counter animation 600–900 ms; reveal stagger
40–80 ms; perceptual-instant feedback < 100 ms; loading state visible by
200 ms.

**Constraints**: Constitutional bundle budget — student dashboard route
≤ 250 KB gzipped (Principle VI). Motion system MUST add ≤ 8 KB gzipped to
that route. No `!important`. No raw hex outside tokens. RTL parity required.

**Scale/Scope**: 7 role surfaces, ~100 routes, ~12 colleges (with identity
profiles), 1 homepage. ~50 dashboard tile/card variants in scope for hover/
focus/loading audits.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Premium Experience & Design Excellence | ✅ Pass | This is the principle being instantiated. All output is token-driven; visual review checklist baked into the rollout. |
| II. Mobile-First, Accessible & Bilingual | ✅ Pass | Mobile-first 360 px target, WCAG 2.1 AA gates, full LTR + RTL + reduced-motion coverage are non-negotiables in this plan. |
| III. University-Truth Alignment | ✅ Pass | Homepage stats and college identity sourced from the existing University of Zawia data layer; no synthetic placeholders. |
| IV. Role-Based Governance & Least Privilege | ✅ Pass | Spec touches presentation only; permissions and route guards untouched. |
| V. AI-Assisted, Human-Authoritative | ✅ Pass | No AI decision pathways modified. |
| VI. Scalability & Integration Readiness | ✅ Pass | Tokens + primitives are versioned and consumable by future modules; bundle budget honored (≤ 8 KB add). |
| VII. Security, Privacy & Auditability | ✅ Pass | No data flows changed. PII handling untouched. |

**Pre-design gate result**: PASS. No violations to track.

**Post-design gate result** (re-checked after Phase 1): PASS. The proposed
design (Motion primitives + extended tokens + identity profile data record)
introduces zero principle violations and no entries in the Complexity
Tracking table.

## Project Structure

### Documentation (this feature)

```text
specs/001-premium-motion-system/
├── plan.md                                # this file
├── spec.md                                # feature spec
├── research.md                            # Phase 0 output
├── data-model.md                          # Phase 1 — token + identity records
├── quickstart.md                          # Phase 1 — adoption guide
├── contracts/
│   ├── motion-tokens.md                   # canonical token contract
│   ├── interaction-tokens.md              # interaction-state token contract
│   ├── motion-primitives.tsx.md           # React API contracts (typed prose)
│   └── college-identity-profile.md        # per-college identity record
└── checklists/
    └── requirements.md                    # spec quality checklist (already done)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── components/
│   │   ├── motion/                        # NEW — primitives live here
│   │   │   ├── PageTransition.tsx
│   │   │   ├── Reveal.tsx
│   │   │   ├── AnimatedNumber.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   └── useReducedMotion.ts
│   │   ├── primitives/                    # existing — extend States.tsx
│   │   │   └── States.tsx                 # gain skeleton-aware variants
│   │   └── layout/
│   │       └── AppShell.tsx               # wrap routes in <PageTransition>
│   ├── styles/
│   │   ├── tokens.css                     # extend motion + interaction tokens
│   │   ├── motion.css                     # NEW — reduced-motion fallbacks,
│   │   │                                  #       reveal keyframes,
│   │   │                                  #       focus-ring system,
│   │   │                                  #       skeleton shimmer
│   │   ├── components.css                 # consume new tokens (audit)
│   │   ├── colleges.css                   # consume identity profile vars
│   │   └── polish.css                     # retire ad-hoc bits superseded
│   │                                      # by tokens (gradual)
│   └── pages/
│       ├── LandingPage.tsx                # apply hero + storytelling motion
│       └── colleges/                      # apply identity profile per college
└── tests/
    └── motion/                            # primitive unit + a11y tests

design-system/
└── madarek-zawia-university-lms/          # reference visual spec — authoritative
                                           # source of accent palette already
                                           # used by the project

backend/
└── prisma/                                # follow-up: optional identity-profile
                                           # columns on College (out of scope
                                           # for this PR; tracked in tasks)
```

**Structure Decision**: Web application layout (existing). All net-new code
lives under `frontend/src/components/motion/` and `frontend/src/styles/motion.css`.
Existing files (`tokens.css`, `polish.css`, `components.css`, `colleges.css`,
`primitives/States.tsx`, `layout/AppShell.tsx`, page components) are amended
rather than replaced — this preserves git blame and keeps the change reviewable.

## Complexity Tracking

> Empty — no Constitution Check violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _none_    | _n/a_      | _n/a_                                |
