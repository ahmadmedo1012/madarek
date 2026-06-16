# Implementation Plan: Colleges Gallery — Discoverable, Organized, Beautiful

**Branch**: `004-colleges-gallery` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-colleges-gallery/spec.md`

## Summary

Closes the discovery loop on the existing `/colleges` route: the
homepage hero badge "أكثر من 25 كلّيّة" becomes a clickable link, and
the existing `CollegesIndexPage` is upgraded in place with search,
campus-filter chips, URL-persisted state, accent stripes from the
identity profile, and skeleton/empty/error treatments matching the
gallery's quality.

Approach: small, additive composition pass on top of the working
city-grouped index. No new pages, no new data sources, no new
primitives. Filtering is client-side (~26 colleges). Search and
campus filter persist in `?q=…&campus=…`. Reveal motion uses the
canonical `Reveal` primitive from `001-*`. Type roles + state
tokens come from `002-*`. Identity-profile accent comes from the
`001-*` College Identity contract.

## Technical Context

**Language/Version**: TypeScript 5.7, React 18.3, Node ≥ 20 (unchanged).

**Primary Dependencies**: react-router-dom 6.28, @tanstack/react-query 5.62,
lucide-react 0.469, the motion primitives from `001-*`, the type roles
from `002-*`. **No new runtime dependencies.**

**Storage**: N/A.

**Testing**: Vitest unit tests for filter logic + URL state hook;
manual smoke on `/colleges` and the homepage badge in LTR + RTL +
mobile + reduced-motion.

**Target Platform**: Existing platform (Chrome/Edge/Safari/Firefox
latest two; reference mid-tier Android per `001-*`).

**Project Type**: Web application (existing).

**Performance Goals**: First-contentful render of the gallery
within 1.5 s on the reference device; CLS ≤ 0.05; first interactive
within 2 s on broadband.

**Constraints**: Bundle add ≤ 6 KB gzipped on the gallery route over
the current baseline. Reduced-motion + RTL parity inherited from
`001-*` and `002-*`. No raw motion / state values.

**Scale/Scope**: ~26 colleges across 6 campuses. One existing index
page (`CollegesIndexPage`), one homepage hero badge, the existing
`/api/colleges` endpoint, one CSS file (`colleges.css`).

## Constitution Check

*GATE: Pre-design.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Premium Experience & Design Excellence | ✅ Pass | Gallery uses canonical `--type-*` + `--state-*` tokens; accent stripes from identity profile only. |
| II. Mobile-First, Accessible & Bilingual | ✅ Pass | US6 + FR-023..FR-026 lock mobile; FR-031 adds aria-live for filter changes; FR-029 mirrors directional motion in RTL. |
| III. University-Truth Alignment | ✅ Pass | SC-008 forbids synthetic colleges; FR-010 distinguishes "—" (unknown) from "0" (verified zero). |
| IV. Role-Based Governance & Least Privilege | ✅ Pass | Gallery is the existing public route; no permission changes. |
| V. AI-Assisted, Human-Authoritative | ✅ Pass | No AI decision pathways modified. |
| VI. Scalability & Integration Readiness | ✅ Pass | NFR-003 caps add ≤ 6 KB gzip; auto-update (SC-010) via existing data source. |
| VII. Security, Privacy & Auditability | ✅ Pass | No data flows changed; URL state contains only query strings. |

**Pre-design**: PASS. Zero violations.

**Post-design** (re-checked after Phase 1): PASS. Composition-only
upgrade; no contracts in `001-*` or `002-*` are altered.

## Project Structure

### Documentation (this feature)

```text
specs/004-colleges-gallery/
├── plan.md                     # this file
├── spec.md                     # feature spec
├── research.md                 # Phase 0 — decisions
├── data-model.md               # Phase 1 — filter + URL-state schema
├── quickstart.md               # Phase 1 — adoption guide
├── contracts/
│   └── gallery-state.md        # filter + URL-state contract
└── checklists/
    └── requirements.md         # spec quality checklist (PASS)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx                    # link the "أكثر من 25 كلّيّة" badge
│   │   └── colleges/
│   │       └── CollegePages.tsx               # extend CollegesIndexPage
│   │                                          # — search input + campus chips
│   │                                          # — URL state hook
│   │                                          # — filtered-empty state
│   │                                          # — skeleton state matching layout
│   ├── styles/
│   │   └── colleges.css                       # new rules:
│   │                                          # .gallery-toolbar (sticky on mobile)
│   │                                          # .gallery-search-input
│   │                                          # .gallery-chip-strip
│   │                                          # .college-card-accent (identity stripe)
│   ├── hooks/
│   │   └── useUrlQueryState.ts                # NEW — small hook for URL ↔ state
│   └── data/
│       └── colleges.config.ts                 # already exists (from 001-*),
│                                              # consumed by the accent stripe.
└── tests/
    └── gallery/
        ├── useUrlQueryState.test.tsx          # NEW — hook tests
        └── filterColleges.test.ts             # NEW — pure-function filter tests

design-system/                                  # unchanged
backend/                                        # unchanged (existing /api/colleges)
```

**Structure Decision**: Web-app layout (existing). All net-new work is
the toolbar + filter logic + URL-state hook. Existing
`CollegesIndexPage` is amended in place to preserve git blame; no
file renames.

## Complexity Tracking

> Empty — no Constitution Check violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _none_    | _n/a_      | _n/a_                                |
