# Implementation Plan: Visual Uplift — Premium Product Quality

**Branch**: `002-visual-uplift` | **Date**: 2026-06-02 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-visual-uplift/spec.md`

## Summary

Layered visual quality pass on top of `001-premium-motion-system`. Tokens
and primitives are stable; this plan applies them at the **composition**
layer — typography rhythm, density, hierarchy, chart treatment, mobile
intent, icon discipline, chrome polish — so the difference is obvious to
a returning user within five seconds.

Approach: extend the existing `tokens.css` with a documented type-system
layer, harden the `chartTheme.ts` palette + plugin set, sweep every
primary surface against a Playwright audit script, replace remaining
emoji/non-Lucide glyphs, and rebalance composition where the audit
flags weakness. **No new motion tokens, no new primitives** — the gain
comes from how the existing system is composed on screen.

## Technical Context

**Language/Version**: TypeScript 5.7, React 18.3, Node ≥ 20 (unchanged)

**Primary Dependencies**: react-router-dom 6.28, @tanstack/react-query 5.62,
zustand 5.0.2, lucide-react 0.469, chart.js 4.4.7 + react-chartjs-2 5.2.0,
the motion primitives shipped in `001-*`. **No new runtime dependencies.**

**Storage**: N/A.

**Testing**: Vitest + RTL for any new primitives; Playwright for the
visual audit script (added in this feature). No backend tests.

**Target Platform**: Modern browsers — Chrome/Edge/Safari/Firefox latest
two; reference mobile = Snapdragon-6 / 4 GB RAM Android (carries from
`001-*`).

**Project Type**: Web application (existing).

**Performance Goals**: 60 fps motion (carries), CLS ≤ 0.05 every primary
route, page-transition ≤ 380 ms (carries), bundle add for this feature
≤ 12 KB gzipped on student dashboard route.

**Constraints**: Constitutional bundle budget (Principle VI) — total
≤ 250 KB gzip on student dashboard. RTL parity, reduced-motion, WCAG AA
contrast all carry from `001-*`. No raw motion/state values.

**Scale/Scope**: 7 role surfaces, ~100 routes, ~50 chart instances, 1
homepage. Audit covers ~25 representative routes at 4 breakpoints × 2
direction = 200 captures.

## Constitution Check

*GATE: Pre-design.*

| Principle | Verdict | Notes |
|-----------|---------|-------|
| I. Premium Experience & Design Excellence | ✅ Pass | This feature is the literal instantiation of the principle. Visible-improvement gate (NFR-001) is the explicit guardrail. |
| II. Mobile-First, Accessible & Bilingual | ✅ Pass | US5 + FR-018..FR-021 + FR-031..FR-033 lock mobile, RTL, and reduced-motion. |
| III. University-Truth Alignment | ✅ Pass | Homepage proof points + college identity continue to source from real UoZ data. No synthetic placeholders. |
| IV. Role-Based Governance & Least Privilege | ✅ Pass | No business-logic / permission changes. |
| V. AI-Assisted, Human-Authoritative | ✅ Pass | No AI decision pathways modified. |
| VI. Scalability & Integration Readiness | ✅ Pass | NFR-004 caps bundle add ≤ 12 KB gzip. No new dependencies. |
| VII. Security, Privacy & Auditability | ✅ Pass | No data flows changed. |

**Pre-design**: PASS. Zero violations.

**Post-design** (re-checked after Phase 1): PASS. Composition-only
changes; no contracts in `001-*` are altered.

## Project Structure

### Documentation (this feature)

```text
specs/002-visual-uplift/
├── plan.md                     # this file
├── spec.md                     # feature spec
├── research.md                 # Phase 0 — decisions
├── data-model.md               # Phase 1 — type-scale + chart-palette tables
├── quickstart.md               # Phase 1 — composition adoption guide
├── contracts/
│   ├── type-system.md          # canonical type-scale roles + tokens
│   ├── chart-theme.md          # palette + axis/tick/legend/tooltip rules
│   ├── icon-policy.md          # Lucide-only rules + sizing scale
│   └── audit-script.md         # Playwright audit contract
└── checklists/
    └── requirements.md         # spec quality checklist (already PASS)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── styles/
│   │   ├── tokens.css          # extend: type-role tokens (display/headline/
│   │   │                       #         body/label/metric)
│   │   ├── motion.css          # unchanged (from 001-*)
│   │   ├── components.css      # extend: tabular-num utility, mobile-list
│   │   │                       #         table-collapse pattern
│   │   ├── landing.css         # tighten: section rhythm, hero composition
│   │   ├── colleges.css        # already token-driven; verify only
│   │   └── polish.css          # gradual prune of superseded sections
│   ├── lib/
│   │   └── chartTheme.ts       # extend: 8-color categorical palette,
│   │                           # tabular-num enforcement
│   ├── components/
│   │   ├── motion/             # unchanged (from 001-*)
│   │   ├── primitives/
│   │   │   ├── Form.tsx        # unchanged (from 001-*)
│   │   │   └── States.tsx      # tighten EmptyState + ErrorState rhythm
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx     # active indicator: shared-layout sliding
│   │   │   ├── Topbar.tsx      # scrolled-elevation refinement
│   │   │   ├── BottomNav.tsx   # mobile touch-target audit
│   │   │   └── AppShell.tsx    # mobile drawer (focus trap on open)
│   │   └── dashboard/          # KPI-tile composition pass
│   └── pages/
│       └── ...                 # composition pass; emoji → Lucide where
│                               # they appear in chrome
└── tests/
    └── visual/
        └── audit.spec.ts       # NEW — Playwright audit script (FR-001)

design-system/                  # reference imagery — unchanged
```

**Structure Decision**: Web-app layout (existing). All net-new code is
the Playwright audit + small token / chart additions. Page-level
composition changes touch existing files in place to preserve git
blame.

## Complexity Tracking

> Empty — no Constitution Check violations to justify.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| _none_    | _n/a_      | _n/a_                                |
