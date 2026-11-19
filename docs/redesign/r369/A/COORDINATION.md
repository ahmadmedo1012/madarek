# R369 · COORDINATION — agent A's rolling log

## State (updated 2026-11-19 ~10:45 UTC)

| lane | branch | base | state |
|---|---|---|---|
| A · integrator | `agent/r369-integrate` | `exec/r368-fidelity-v2` @ `9d278577` | **ACTIVE** — t6/t5/t5-public merged, CI reds fixed at the root (size gate, deadcode, e2e trio, R305, rename scan), A2 instruments landed; `verify.sh --fast` + full e2e running for BASE-READY |
| B · landing art | `agent/r369-landing-art` | — (planned: `exec/r368-fidelity-v2` until BASE-READY) | **NOT STARTED** (no branch on the remote) |
| C · product | `agent/r369-product` | `wip/r368-t6` @ `5925fabd` | **ACTIVE** — checklist landed @ `05cbc35f` |

## For C (read before your next sync)

1. **Merge `origin/agent/r369-integrate` when `docs/redesign/r369/BASE-READY.md`
   appears on it** (workflow law). Your base (t6) misses v2's 11 commits —
   the merge brings: the T8 copy reduction (already-passing), the platform
   media enrichment, the wave-3 scorecard, AND my root fixes you inherit
   for free (the deadcode dedup incl. the auth pages you own, the R305
   supplemental contract, the preloader skip pointer-events fix, the
   concepts-band driver retune).
2. **Conflict forecast for your merge of my branch:** my deadcode commit
   touched `pages/auth/{ForgotPassword,ResetPassword,VerifyEmail}Page.tsx`
   (extracted `components/auth/AuthDoor.tsx`) and
   `styles/student/heron-supplemental.css` (hover-guard merge + comment
   reword) and `styles/training.css` (comment-only dedup). If you have
   edits in those files, keep both intents; the AuthDoor extraction is
   mechanical to re-apply.
3. **The 013 spec numbering collision** (`specs/013-heron-fidelity` vs
   `specs/013-public-pages-fidelity`) is recorded in
   `docs/SPECS-REFERENCE.md`; renumbering happens in A's consolidation
   lane — do not renumber from your side.

## For B (when you start)

1. Start from `origin/exec/r368-fidelity-v2` until BASE-READY, then merge
   `origin/agent/r369-integrate`.
2. `docs/redesign/r369/REQUESTS-A-to-B.md` is written: the 5 invalid T
   pairs (instrument-side structural limits, evidence cited), the stress
   collision in your lane, the judge-ledger fill protocol, and the token
   request channel.
3. The evidence policy is LAW from acf79ac4: per-state captures go to
   gitignored paths (`docs/audit/evidence/.local/` or the in-place
   gitignored dirs); committed evidence = JSON + ≤1.5 MB contact sheets
   per push; `scripts/gates/pre-push-guard.sh` (enable:
   `git config core.hooksPath .githooks`) blocks a fat push locally.

## A's open work (self-tracking)

- BASE-READY: `verify.sh --fast` + full e2e green → push → CI green →
  write `docs/redesign/r369/BASE-READY.md`.
- A3: T4 token migration (value inventory ready), docs consolidation
  (INDEX map, archive sweep, FIDELITY-HOWTO), bundle-ceiling doc
  reconciliation.
- A4: dry-run integration when both B and C have DELIVERY.md.
