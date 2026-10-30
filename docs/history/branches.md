# Branch ledger — the road to ONE branch (R326 M0.3)

> Decision record for every remote branch deleted in R326 M0.3.
> Policy from here on: **exactly one branch — `main`**. Feature work lives
> in local worktrees; every change lands on main in small verified commits.

| Branch | Ancestor of main? | Unique commits | Decision | Note |
|--------|-------------------|----------------|----------|------|
| `feat/mobile-expo` | yes (merged `f3d1c17f`) | 0 (after merge) | **deleted** | The Expo app — merged into main with all gates green (M0.1). Full history preserved in the merge commit. |
| `r320/flow` | yes | 0 | **deleted** | Flows 1–13 work — already merged during R325 P4(a) (flows 14/14 green). |
| `r320/legal` | yes | 0 | **deleted** | Legal Y-series work — already merged in the R325 P1 wave. |
| `r322/map` | NO | 2 (`a166cd02`, `ac3f82fc`) | **discarded** | The 2 unique commits are early Heron *study* material: 30+ re-captured reference JPGs + an early stub of `map.md`. Main's `docs/redesign/r322/heron/map.md` is a superset (90 lines with the scroll-spec harness notes vs the branch's 4-line stub). The landing map product work itself was merged long ago ("merged in spirit"). Nothing of value lost. |
| `r322/statement` | yes | 0 | **deleted** | Statement-section work — already merged during R322. |

Open PRs at cleanup time: **0** (verified via GitHub API — nothing to close).

## Verification commands

```bash
for b in feat/mobile-expo r320/flow r320/legal r322/map r322/statement; do
  git merge-base --is-ancestor origin/$b main && echo "$b ✓ ancestor"
done
git ls-remote --heads origin   # → refs/heads/main only
```
