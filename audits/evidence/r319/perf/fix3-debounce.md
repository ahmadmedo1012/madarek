# R318 C2-P — landing smoothness harness results

- commit `4a5be0fb` · base `http://localhost:4245` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 86.1% / 86.1% · p95 100ms · max 133.4ms | 65 / 5329ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.02) | 0.51s img | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 78.2%/147f p95 99.9 max 133.4 · active 86.1%/115f p95 100 | 56 | 0.007 | 0.41s || d-mut 0 |  |
| 1440×900 | 4× | scroll #2 | 80.6%/144f p95 100 max 183.3 · active 89.4%/113f p95 100 | 65 | 0.007 | 0.38s || d-mut 0 |  |
| 1440×900 | 4× | scroll #3 | 77.2%/145f p95 100 max 133.4 · active 85.1%/114f p95 100 | 66 | 0.007 | 0.51s || d-mut 0 |  |

## PV re-verification addendum (r319-close-PV, host-noise context)

The table above is the CLOSE-OUT re-measure (same harness, same port, same
commit 4a5be0fb + fix3 working tree). The author's dead-session fix3 numbers
(measured on a quieter host) were: whole %frames>33ms 58.3/62.1/66.7 (median
62.1), active 68.9/71.5/75.2 (median 71.5), longtasks 33/42/46 (median 42),
CLS 0.007, LCP 1.80s worst, p95 83.4 — file overwritten by the re-measure.

The re-measure host was NOT quiet (a parallel agent fleet shares the box;
loadavg oscillated 0.3→3.3 during measurement; one contaminated pass hit
96.7% frames + CLS 0.421 and was discarded). Four clean fix3 passes gave
whole-frame medians 65.6/73.0/73.5/78.2 — the spread is host noise.

Same-host A/B control (fix3 stashed, fix2-state dist rebuilt, preview
restarted, measured within ~10 min of the fix3 pass above):
- fix2-state (no fix3): whole 77.9/78.2/75.5 · active 84.6/87.0/84.1 ·
  longtasks 62/64/50 · p95 100 · CLS 0.007
- fix3 (pass above):   whole 78.2/80.6/77.2 · active 86.1/89.4/85.1 ·
  longtasks 56/65/66 · p95 100 · CLS 0.007
→ frames% delta is INSIDE the host noise band (±5-8 pts run-to-run); no
regression detectable; p95/CLS/max identical structure.

MECHANISM PROBE (the fix's actual claim, noise-free): instrumented
`documentElement.scrollHeight` getter + scrollend counter over the exact
harness wheel profile (24 wheels @80ms):
- FULL profile: **107 scrollend events → 1 scrollHeight read** (pre-fix3:
  one forced DIRTY-tree read per scrollend ≈ 107 reads × ~6ms @4× ≈ the
  632ms/run the author profiled).
- Partial scroll (4 wheels, belt still populated): 42 scrollend → 2 reads,
  BOTH after ≥120ms of scroll silence (clean tree, ~free reads), ZERO
  during the gesture.
The storm-reconcile work is eliminated; the residual jank is the render
pipeline (per fix2's commit message), not the settle belt.
