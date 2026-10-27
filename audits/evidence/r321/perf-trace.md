# R318 C2-P — landing smoothness harness results

- commit `ff7aeed6` · base `http://localhost:4173` · trace `true` · grbc `true` · `1` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 83.3% / 83.3% · p95 199.9ms · max 266.6ms | 78 / 9791ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 2.32s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 75.3%/146f p95 183.4 max 266.6 · active 83.3%/114f p95 199.9 | 78 | 0.007 | 2.32s | · grbc 105reads(10.2/s) 154attr 515vars| d-mut 0 |  |
