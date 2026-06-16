<!-- SPECKIT START -->
Active feature: **Design, Theming & Graphics Uplift — World-Class Tier** (`012-design-graphics-uplift`)

Layered on top of `001-premium-motion-system` (motion primitives,
identity profiles), `002-visual-uplift` (type roles + chart palette),
and `003-motion-graphics-layer` (decorative motion).

For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at
`specs/012-design-graphics-uplift/plan.md` and the supporting artifacts:

- `specs/012-design-graphics-uplift/spec.md` — feature specification (with Clarifications)
- `specs/012-design-graphics-uplift/research.md` — Phase 0 decisions (R-001..R-012)
- `specs/012-design-graphics-uplift/data-model.md` — Prisma columns + frontend state shapes
- `specs/012-design-graphics-uplift/contracts/theme-tokens.md` — CSS custom properties + [data-theme]
- `specs/012-design-graphics-uplift/contracts/theme-state.md` — useTheme() hook + endpoints
- `specs/012-design-graphics-uplift/contracts/illustration-system.md` — bespoke SVG family + <Illustration>
- `specs/012-design-graphics-uplift/contracts/elevation-language.md` — overlay shadow / glass / z-order
- `specs/012-design-graphics-uplift/contracts/chart-treatment.md` — custom chart.js plugins
- `specs/012-design-graphics-uplift/contracts/onboarding-milestone.md` — onboarding + 3 milestones
- `specs/012-design-graphics-uplift/contracts/audit-script.md` — Playwright surface inventory + drift gate
- `specs/012-design-graphics-uplift/quickstart.md` — adoption guide

Foundation (do NOT redesign — extend at the composition layer only):

- `specs/001-premium-motion-system/` — motion + interaction tokens, primitives
- `specs/002-visual-uplift/` — type roles, chart palette, icon discipline
- `specs/003-motion-graphics-layer/` — decorative motion (spec only, not yet implemented)
<!-- SPECKIT END -->
