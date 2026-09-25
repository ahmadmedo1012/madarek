<!-- SPECKIT START -->
Status: feature 012 (**Design, Theming & Graphics Uplift — World-Class Tier**,
`012-design-graphics-uplift`) **shipped** — campaigns 1–2 landed it end to
end (see `specs/012-design-graphics-uplift/plan.md`; wave-14
SPECS-REFERENCE marks it Complete). The platform is now in a
maintenance/deepening phase (campaign 3: per-dimension audits + fixes).
For current technologies, project structure, shell commands, and state,
start with **`docs/PROJECT-REFERENCE.md`** — it is kept current.

The 012 artifacts remain the reference for the theming/design layer:

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
