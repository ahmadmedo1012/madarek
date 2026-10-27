# R318 C2-P — landing smoothness harness results

- commit `ff7aeed6` · base `http://localhost:4173` · trace `true` · grbc `false` · `1` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 70.8% / 70.8% · p95 183.3ms · max 250ms | 66 / 7476ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 1.94s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 67.1%/143f p95 150 max 250 · active 70.8%/113f p95 183.3 | 66 | 0.007 | 1.94s || d-mut 0 |  |
