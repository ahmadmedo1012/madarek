# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 79.6% / 79.6% · p95 100ms · max 183.4ms | 65 / 5746ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.02) | 2.11s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 68.3%/145f p95 116.6 max 166.7 · active 79.6%/108f p95 116.7 | 65 | 0.007 | 0.78s || d-mut 0 |  |
| 1440×900 | 4× | scroll #2 | 70.7%/164f p95 100 max 233.3 · active 83.3%/126f p95 100 | 67 | 0.007 | 2.11s || d-mut 0 |  |
| 1440×900 | 4× | scroll #3 | 64.9%/168f p95 83.4 max 183.4 · active 76.7%/129f p95 100 | 60 | 0.007 | 0.42s || d-mut 0 |  |
