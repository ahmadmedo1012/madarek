<!--
SYNC IMPACT REPORT
==================
Version change: (uninitialized template) → 1.0.0
Bump rationale: Initial ratification. All principles added from scratch — no prior
versioned constitution existed; the file held only template placeholders.

Modified principles: N/A (initial ratification)
Added principles:
  I.   Premium Experience & Design Excellence (NON-NEGOTIABLE)
  II.  Mobile-First, Accessible & Bilingual (Arabic-RTL / English-LTR)
  III. University-Truth Alignment (University of Zawia)
  IV.  Role-Based Governance & Least Privilege
  V.   AI-Assisted, Human-Authoritative
  VI.  Scalability & Integration Readiness
  VII. Security, Privacy & Auditability

Added sections:
  - Quality & Compliance Standards
  - Development Workflow & Review Process
  - Governance

Removed sections: N/A

Templates requiring updates:
  ✅ .specify/templates/plan-template.md  — generic "Constitution Check" placeholder; no conflicts
  ✅ .specify/templates/spec-template.md  — no conflicts; success criteria stay technology-agnostic
  ✅ .specify/templates/tasks-template.md — generic phases compatible with principles (a11y/i18n/AI tasks fit Phase N polish or per-story)
  ✅ .specify/templates/checklist-template.md — generic; no conflicts

Follow-up TODOs: None — RATIFICATION_DATE set to today (2026-06-02) as the
formal adoption date for v1.0.0.
-->

# Madrak Constitution

Madrak (مدراك) is the AI-powered university platform of the University of Zawia,
unifying students, faculty, department heads, deans, administrators, and quality
assurance teams in a single intelligent ecosystem.

## Core Principles

### I. Premium Experience & Design Excellence (NON-NEGOTIABLE)

Every user-facing surface MUST meet a world-class design bar before it ships.

- All UI MUST consume design tokens (colors, spacing, typography, motion) from
  the canonical design system; hardcoded hex colors and inline pixel margins are
  prohibited in production code.
- Interactions MUST be smooth: animations target 60 fps on mid-range mobile
  hardware, and motion MUST respect `prefers-reduced-motion`.
- Every screen MUST pass a visual review against the polish checklist before
  merge — semantic HTML (`<header>`, `<main>`, `<nav>`), consistent palette,
  proportional whitespace, and no layout shift on load.

**Rationale**: Madrak is positioned as a globally competitive flagship platform.
Visual and interaction quality are first-class requirements, not polish that is
added "later."

### II. Mobile-First, Accessible & Bilingual

Madrak is built mobile-first and ships fully usable in Arabic (RTL) and English
(LTR) from day one.

- Layouts MUST be designed for a 360px viewport first and progressively enhance.
- Arabic is the primary content language; every screen MUST work end-to-end in
  RTL with locale-correct numerals, dates, and pluralization.
- Accessibility MUST target WCAG 2.1 AA: keyboard navigation, focus rings,
  ARIA roles where semantics fall short, color contrast ≥ 4.5:1 for body text,
  and screen-reader labels on every actionable element.
- New components MUST ship with a keyboard-only and screen-reader smoke test
  before merge.

**Rationale**: The user base spans students on entry-level phones, faculty on
desktops, and administrators with assistive technology needs. Excluding any of
them is not acceptable.

### III. University-Truth Alignment (University of Zawia)

Academic structure in Madrak MUST reflect the real University of Zawia — never
synthetic placeholders.

- Colleges, departments, programs, courses, semesters, and academic calendars
  MUST be sourced from authoritative University of Zawia data.
- Demo or seed data MUST be clearly flagged in code (`is_seed`, fixture folder,
  or environment guard) and MUST NOT leak into production.
- When real data is unavailable, features MUST surface a transparent "data
  pending" state instead of inventing plausible-looking content.

**Rationale**: Trust from faculty and administration depends on the platform
mirroring reality. Fabricated structure damages credibility irreversibly.

### IV. Role-Based Governance & Least Privilege

Every action in Madrak MUST be scoped to one of the defined roles, with
permissions enforced at the API layer — not only the UI.

- Roles: Student, Faculty, Department Head, Dean, Administrator, Quality
  Assurance. Additional roles require an ADR.
- Authorization MUST be checked server-side on every request; client-side hiding
  is presentation-only and never the security boundary.
- Cross-role data exposure MUST be explicit (e.g., a dean viewing department
  analytics) and logged.
- Privilege escalation paths MUST be reviewed in PR by a second reviewer.

**Rationale**: Universities have legitimate, sensitive separations between
roles (grades, evaluations, complaints). Conflating them — even briefly — causes
governance and legal harm.

### V. AI-Assisted, Human-Authoritative

AI augments learning, teaching, and administration. It never holds final
academic authority.

- AI features (recommendations, summaries, drafts, classifications) MUST present
  output as suggestions a human can accept, edit, or reject.
- Decisions with academic or administrative consequence — grades, attendance
  finalization, disciplinary records, official reports — MUST require explicit
  human confirmation and MUST record the human actor in the audit log.
- Every AI feature MUST disclose its assistive nature in the UI (e.g., "AI
  draft — review before sending").
- Model outputs MUST be evaluated for hallucination on a representative
  University of Zawia dataset before a feature ships.

**Rationale**: Academic decisions carry legal and personal weight. AI is a
multiplier for humans, not a substitute for accountability.

### VI. Scalability & Integration Readiness

Madrak is built to grow into the institutional backbone — and to integrate
upward into national education systems.

- Architecture MUST separate frontend, backend, and data layers with stable
  contracts (typed API schemas, versioned endpoints).
- Public-facing APIs MUST be versioned (`/api/v1/...`); breaking changes require
  a new version and a deprecation window.
- New modules MUST be designed as if a future Ministry of Education or
  inter-university integration could consume them — no internal-only data
  shapes leaking into shared layers.
- Performance budgets: API p95 < 400ms on representative queries; initial web
  bundle < 250KB gzipped on the student dashboard route.

**Rationale**: Retrofitting integration and scale onto a coupled system is
prohibitively expensive. Designing for it from the start costs little.

### VII. Security, Privacy & Auditability

Student and staff data is sensitive by default and treated as such.

- Secrets MUST live in environment variables or a managed secret store — never
  in the repository, logs, or client bundles.
- All authenticated requests MUST be logged with actor, action, resource, and
  timestamp; logs MUST be retained per institutional policy.
- Personally identifiable information MUST be transmitted over TLS and stored
  with appropriate access controls; debug logs MUST NOT echo PII.
- Inputs MUST be validated at the API boundary (no trust in client validation
  alone), and queries MUST use parameterization — never string concatenation.
- Destructive operations (mass deletes, role changes, grade overwrites) MUST be
  reversible via audit log within a defined retention window.

**Rationale**: A breach or untraceable change in a university system is
catastrophic — academic records are durable, public-facing, and legally weighty.

## Quality & Compliance Standards

These standards are enforced in every PR and apply across the codebase:

- **Design tokens**: `design-system/` is the single source of truth for colors,
  spacing, typography, radius, and motion. PRs introducing new hardcoded values
  MUST instead extend the token system or be rejected.
- **Accessibility checks**: New interactive components require manual keyboard
  + screen-reader smoke tests. Automated axe/Lighthouse checks SHOULD run in CI;
  a critical-level violation blocks merge.
- **Performance budgets**: Bundle size and API latency are tracked per route.
  A PR that regresses a tracked budget by > 10% requires explicit justification
  in the PR description.
- **Localization**: Every user-visible string MUST go through the i18n layer.
  No literal Arabic or English text in JSX/templates.
- **Real-data guard**: Components rendering academic structure MUST source from
  the canonical data layer. Seed/mock data is allowed only behind a clearly
  named guard (`USE_SEED_DATA`, fixture import, story file).

## Development Workflow & Review Process

- **Branching**: Feature work happens on short-lived branches; `main` is the
  always-deployable trunk. Direct pushes to `main` are reserved for the project
  owner's authorized workflow.
- **Specifications first**: Non-trivial features MUST go through Spec Kit —
  `/speckit-specify` → `/speckit-clarify` (when needed) → `/speckit-plan` →
  `/speckit-tasks` → `/speckit-implement`. Plans MUST cite which constitution
  principles they touch in the "Constitution Check" gate.
- **Code review**: Every PR requires at least one reviewer. PRs touching
  authorization, audit logs, AI decision pathways, or production data migrations
  require a second reviewer.
- **Testing discipline**: New backend logic ships with at least integration-level
  coverage of the happy path and one failure path. UI changes require a manual
  validation note in the PR.
- **Deployment**: The platform deploys continuously to Render from `main`. The
  author of a merge is responsible for verifying the deployed state.
- **Documentation**: Architecture-level decisions MUST be captured in
  `ARCHITECTURE.md`, `BACKEND.md`, `FRONTEND.md`, or an ADR — not only in chat.

## Governance

This constitution supersedes ad-hoc conventions. When a practice conflicts with
a principle here, this document wins.

- **Amendments**: Any change to a principle, a quality standard, or the workflow
  MUST be proposed as a PR that updates this file plus any affected templates
  or guidance docs in the same commit.
- **Versioning policy** (semantic):
  - **MAJOR**: Removing a principle, redefining a NON-NEGOTIABLE rule, or
    changing governance in a backward-incompatible way.
  - **MINOR**: Adding a principle or a materially new section/standard.
  - **PATCH**: Wording, clarifications, or non-semantic edits.
- **Compliance review**: PR reviewers MUST verify the change does not violate a
  principle. The plan template's "Constitution Check" gate is the formal
  verification step.
- **Complexity justification**: Any deviation from a principle MUST be recorded
  in the plan's Complexity Tracking table with a concrete reason and the
  simpler alternative considered.
- **Runtime guidance**: For day-to-day implementation conventions, refer to
  `CLAUDE.md`, `ARCHITECTURE.md`, `BACKEND.md`, `FRONTEND.md`, and
  `DESIGN_POLISH_PLAN.md`. This constitution sets the rules; those documents
  describe how to apply them.

**Version**: 1.0.0 | **Ratified**: 2026-06-02 | **Last Amended**: 2026-06-02
