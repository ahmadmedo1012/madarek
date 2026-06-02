<!-- SPECKIT START -->
Active feature: **Platform Completeness Uplift** (`011-platform-completeness-uplift`) — a gap-fill + polish response to `madarek_audit_report00.md`.

Layered on top of the existing inner application (already built: ~80 pages, JWT auth with refresh-cookie rotation, 60+ Prisma models, `Notification` + `GlobalSearch` + theme store). The audit's "no inner app" finding was an artifact of crawling unauthenticated; see the **Implementation Reality** note in spec.md before assuming green-field.

For technologies, project structure, decisions, and adoption guide, read the current plan at
`specs/011-platform-completeness-uplift/plan.md` and the supporting artifacts:

- `specs/011-platform-completeness-uplift/spec.md` — feature specification + clarifications + reality note
- `specs/011-platform-completeness-uplift/research.md` — Phase 0 decisions (R-001..R-008)
- `specs/011-platform-completeness-uplift/data-model.md` — schema deltas (NotificationPreference, User.locale, search-normalized cols)
- `specs/011-platform-completeness-uplift/contracts/` — notifications, search, locale, session-policy
- `specs/011-platform-completeness-uplift/quickstart.md` — engineer adoption guide

Foundation (do NOT redesign — extend at the composition layer only):

- `specs/001-premium-motion-system/` — motion + interaction tokens, primitives
- `specs/002-visual-uplift/` — type roles, chart palette, icon discipline
- `specs/003-motion-graphics-layer/` — decorative motion (spec only, not yet implemented)
- `specs/004-colleges-gallery/` — discoverable colleges surface (sibling to `/courses`)
<!-- SPECKIT END -->
