# R318 C2-P — landing smoothness harness results

- commit `76246853` · base `http://localhost:4245` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 74.6% / 74.6% · p95 83.4ms · max 133.3ms | 47 / 3896ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.02) | 1.80s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 60%/170f p95 83.4 max 133.3 · active 71.1%/128f p95 83.4 | 46 | 0.007 | 0.43s || d-mut 0 |  |
| 1440×900 | 4× | scroll #2 | 64.5%/172f p95 83.4 max 133.4 · active 74.6%/134f p95 83.4 | 47 | 0.007 | 0.32s || d-mut 0 |  |
| 1440×900 | 4× | scroll #3 | 65.9%/176f p95 83.4 max 133.4 · active 77.2%/136f p95 83.4 | 50 | 0.007 | 1.80s || d-mut 0 |  |
