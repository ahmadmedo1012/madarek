# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 390×844 | 4× | scroll | 25.6% / 25.6% · p95 50ms · max 66.7ms | 8 / 872ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.45s img | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 390×844 | 4× | scroll #1 | 21.7%/244f p95 49.9 max 66.7 · active 26.6%/192f p95 49.9 | 8 | 0 | 0.45s || d-mut 0 |  |
| 390×844 | 4× | scroll #2 | 22%/246f p95 50 max 66.7 · active 25.6%/195f p95 50 | 8 | 0 | 0.40s || d-mut 0 |  |
| 390×844 | 4× | scroll #3 | 21.3%/244f p95 50 max 66.7 · active 24.1%/195f p95 50 | 6 | 0 | 0.36s || d-mut 0 |  |
