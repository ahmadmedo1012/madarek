# R335 — File ownership map (exclusive; violations = revert)

One owner per file. Sub-agents work in their own worktree, own branch `r335/<task>`,
commit ≤ every 10 min, push; the lead merges into main.

| owner (task id) | worktree | branch | exclusive files |
|---|---|---|---|
| lead | /home/z/madarek | main | docs/redesign/r335/HANDOFF.md · OWNERSHIP.md · REPORT.md · merges |
| P0-7 bundle | /home/z/wt-mobile | r335/bundle-budget | apps/mobile/** · docs/mobile/bundle-r335.md — DONE (5b31d730) |
| A-Spec-1 | /home/z/wt-spec1 | r335/spec-1 | docs/redesign/r335/heron-spec/home-hero-wrap.*.json · home-intro-wrap.*.json |
| A-Spec-2 | /home/z/wt-spec2 | r335/spec-2 | docs/redesign/r335/heron-spec/home-problem-wrap.*.json · home-map-wrap.*.json |
| A-Spec-3 | /home/z/wt-spec3 | r335/spec-3 | docs/redesign/r335/heron-spec/home-platform-wrap.*.json · home-why-wrap.*.json |
| A-Spec-4 | /home/z/wt-spec4 | r335/spec-4 | docs/redesign/r335/heron-spec/home-usecase-wrap.*.json · home-cta-wrap.*.json · footer.*.json |
| A-Spec-1 only | /home/z/wt-spec1 | r335/spec-1 | docs/redesign/r335/heron-spec/_page.*.json · _motion.*.json · README provenance date |
| A-Conform | (next wave) | r335/conform | scripts/conformance/** · frontend data-spec hook map · exceptions.json |

Shared (read-only for agents): scripts/spec/extract-heron.mjs (lead-owned; bug reports as
branch commits touching nothing else), docs/redesign/r331/heron-program.json.
agents 2-4: the extractor writes _page/_motion files into your out dir — DELETE them before
committing (only spec-1 owns the global files; they are page-wide identical).
