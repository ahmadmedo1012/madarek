# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | scroll | 25.7% / 25.7% · p95 49.9ms · max 99.9ms | 3 / 277ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.02) | 0.29s img | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | scroll #1 | 15.7%/230f p95 33.4 max 99.9 · active 20.5%/176f p95 49.9 | 3 | 0.007 | 0.29s || d-mut 0 |  |
| 1440×900 | 1× | scroll #2 | 20.5%/229f p95 49.9 max 100 · active 26.3%/175f p95 50 | 4 | 0.007 | 0.18s || d-mut 0 |  |
| 1440×900 | 1× | scroll #3 | 19.7%/233f p95 33.4 max 83.3 · active 25.7%/179f p95 33.4 | 2 | 0.007 | 0.15s || d-mut 0 |  |
