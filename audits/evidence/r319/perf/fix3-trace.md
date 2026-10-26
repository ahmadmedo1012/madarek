# R318 C2-P — landing smoothness harness results

- commit `4a5be0fb` · base `http://localhost:4245` · trace `true` · grbc `false` · `1` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 75.4% / 75.4% · p95 99.9ms · max 133.4ms | 48 / 4293ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.42s img | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 62.6%/155f p95 83.4 max 133.4 · active 75.4%/114f p95 99.9 | 48 | 0.007 | 0.42s || d-mut 0 |  |
