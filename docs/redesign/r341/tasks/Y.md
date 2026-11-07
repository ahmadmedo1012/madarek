# Y-tasks — hygiene (parallel; non-landing, non-page files in the same wave)

Law: ratchets only improve (knip/jscpd/depcruise counts only go DOWN); safe cuts only (if unsure, leave it and report); `verify.sh --fast` before push; commit on `wip/y<N>`.

- **Y1 ponytail audit applied to non-landing code** — run the repo's ponytail/`lite` cleanup discipline over `frontend/src` EXCEPT `components/landing/**`+`styles/landing/**`, plus `backend/src` and `scripts/`: dead exports, unused params, duplicated helpers, stale comments referencing dead code. Safe cuts only; every cut is grep-proven (zero remaining references) + vitest green.
- **Y2 single source of truth** — copy/tokens/routes: one module each (`lib/copy.ts` exists for landing — extend the pattern to the non-landing duplicated literals where it is a mechanical win; route constants centralized). No behaviour change; tests green.
- **Y3 ratchets** — run knip/jscpd/depcruise gates (`scripts/deadcode/`, `scripts/gates/`); fix findings so each count drops; update the baselines DOWN with reasons.
- **Y4 docs** — AGENTS.md (repo map changes from C5 folder moves land later — do the rest now), `scripts/README.md`, `docs/INDEX.md` (r341 row + archive r333–r340 under `docs/redesign/`), CONTRIBUTING if stale.
- **Y5 hooks/CI sanity** — pre-push hook works (test it once on a throwaway branch), `.github/workflows/*.yml` reference real scripts (no rot), commitlint config matches practice. Actions IS alive again (2026-11-07) — note it in the workflow headers if stale comments say dead.
