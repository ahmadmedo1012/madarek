# Quickstart — Heron Fidelity

**Branch**: `wip/r368-t0` (program root `plan/r368-heron-fidelity` @ `3b8eba04`) | **Date**: 2026-11-18 | **Plan**: [`plan.md`](./plan.md)

The engineer-facing orientation map for the heron-fidelity program. Pick the next open task from [`tasks.md`](./tasks.md) (status lives there; the authoritative per-task Files/Checks/Done-when live in `docs/superpowers/plans/heron-fidelity-plan.md`).

---

## What this feature is — in one sentence

Close Madarek's measured visual/interaction gap to the Heron reference across the landing page, public pages, every web role and the Expo app — with a trustworthy paired-evidence scorecard (E/T/Q) proving every claim.

## What it is NOT

1. Not a redesign of Madarek's brand, content or workflows — measured craft parameters only, in Madarek-owned code/assets.
2. Not a library-swap program — the current stack stays until same-state traces prove a replacement is better AND the bundle stays ≤770 KB.
3. Not a copy of anything Heron — no source, text, images, logo or fonts, ever.
4. Not a gate-relaxation program — every ceiling/ratchet/threshold in the repo stays.

## Read order before writing code

1. [`spec.md`](./spec.md) — stories, FRs, criteria (the approved `docs/specs/heron-fidelity.md` governs verbatim).
2. [`contracts/measurement-law.md`](./contracts/measurement-law.md) — the E/T/Q law you will be measured by (and `scripts/conformance/pairs.mjs` + its fixtures — the law is executable).
3. [`plan.md`](./plan.md) + `docs/superpowers/plans/heron-fidelity-plan.md` — the ordered tasks with their per-task Files/Checks/Done-when.
4. `docs/superpowers/plans/heron-fidelity-progress.md` — what is already measured/done (never re-land finished work).
5. `docs/redesign/r341/OWNERSHIP.md` — the files you may touch for your seat.

## The working loop (per task)

```bash
# your own worktree + strict port (AGENTS.md law)
git worktree add /home/z/wt/<task-id> -b wip/<task-id>   # only if the branch doesn't exist
cd /home/z/wt/<task-id>/frontend && npx vite --port 53NN --strictPort &

# the instrument (ALWAYS your own port)
node --test scripts/conformance/pairs.test.mjs scripts/conformance/gates.test.mjs
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/fidelity.mjs \
  --local http://localhost:53NN --bps 1440,390 --out docs/audit/evidence --validate
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/stress.mjs --url http://localhost:53NN/

# focused product gates (never root `npm run build` without a live DATABASE_URL)
npm run typecheck && TZ=UTC npm test --workspace=frontend -- <focused-file>
npm run build -w frontend && node scripts/check-bundle-size.mjs
```

Commit per sub-step (`type(rNNN): subject`; section rewrites carry `conformance <section>: a% → b%`), push the task branch, record before/after in the progress file. Playwright browsers need the `/tmp/pw-browsers` chromium-1223→1200 symlink fallback (documented in AGENTS.md §Environment notes).

## Environment realities (this sandbox)

- Node v24.22.3 (supported 20–24); 2 CPUs — no parallel heavy builds; `verify.sh` is lead-only.
- The reference (`heronaiapp.com`) is reachable; `madarek.onrender.com` is NOT — local crops only.
- The SpecKit CLI is not installable here (research.md R-008) — this package is authored in the repo's own SpecKit structure; do not claim tool runs that did not happen.
- The evidence pushes respect the +5 MB docs/ budget (≤500 KB per tracked file); `repeat/` crops stay untracked (repeatability.json carries the numbers).
