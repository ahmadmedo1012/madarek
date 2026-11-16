# R357 — UI findings (handed to the UI agent)

Rules: the main agent does not touch CSS/layout/tokens/menus. Every visual
defect it hits during L2–L8 is logged here, one line each, with the page +
how it was found. The UI agent (`wip/r357-ui`) triages them.

<!-- format: - [page/route] finding — how found (crawl/e2e/manual) -->

<!-- L8 Lighthouse handover (r357, record-only per the brief) -->
- [/ landing] Lighthouse mobile perf 78 (TBT 670 ms, LCP 3.0 s; opportunities: unused-css −150 ms, unused-js −150 ms) — Lighthouse mobile preset, authed harness, 2026-11-16. A11y 87 (the only sub-90 a11y of the five).
- [/student/dashboard] Lighthouse mobile perf 78 (TBT 410 ms, LCP 3.9 s; opportunities: unused-css −250 ms, unused-js −150 ms) — same run. The other three pages pass ≥ 90 (login 95, colleges 97, admin-people 94).
