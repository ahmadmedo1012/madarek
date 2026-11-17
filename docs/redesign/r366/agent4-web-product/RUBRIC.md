# Rubric — per-page craft scores (R366 L1.4, Agent 4)

Every key authenticated page scored 1–5 on eight axes (alignment/grid, spacing rhythm,
hierarchy = one primary action, density, consistency with the design system, contrast,
states, RTL). Scores derive from the stress-crawl JSONs + the surface e2e geometry
assertions + the targeted DOM audits (not taste). Pages scoring ≤ 3 must be fixed at
the root and re-scored.

## Method
- geometry evidence: scripts/qa/overlap.mjs --stress runs (before/after JSONs in /tmp/r366/)
- interaction evidence: the surface e2e suites (ai-assistant, notifications, messages,
  calendar, document-viewer, online-exams — each with failing-before assertions)
- contrast evidence: scripts/r323/contrast-gate.mjs + the axe pass
- density evidence: copy-budget gate (words per page) + DOM node counts at 360

## Score table (key pages — before → after)

| page | align | rhythm | hierarchy | density | consistency | contrast | states | RTL | Σ | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| /student/ai | 4→5 | 4→5 | 4 | 3→4 | 4 | 4 | 4→5 | 5 | 33→37 | fixed (2-a) |
| /student/messages | 3→* | 3→* | 3 | 3 | 3 | 4 | 3 | 4 | — | (2-d lane, in flight) |
| /student/calendar | 3→* | 3 | 3 | 4 | 3 | 4 | 3 | 4 | — | (2-d lane) |
| /student/online-exams/:id | 2→* | 3 | 3 | 3 | 3 | 4 | 3 | 4 | — | (2-c lane; timer overlap = align 2) |
| /document/:filename | 2→* | 3 | 3 | 3 | 3 | 4 | 3 | 4 | — | (2-b lane) |
| /student/dashboard | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 33 | holds |
| /student/courses | 4 | 4 | 4 | 4→5 | 4 | 4 | 4 | 5 | 33→34 | copy trim |
| /teacher/dashboard | 4 | 4 | 4 | 3→4 | 4 | 4 | 4 | 5 | 32→33 | copy diet |
| /teacher/exams | 3 | 3 | 4 | 3 | 4 | 4 | 4 | 5 | 30 | holds (authoring fixes in 2-c) |
| /admin/students | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 33 | holds |
| /quality/dashboard | 4 | 4 | 4 | 3 | 4 | 4 | 4 | 5 | 32 | holds |
| /owner/dashboard | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 33 | holds |
| /settings | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 5 | 33 | holds |

(*) = re-score at close-out when the lane's fixes land; the Σ column updates then.
Pages at ≤ 3 on ANY axis after the lanes land get a root fix + re-capture before close.
