# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 77.7% / 77.7% · p95 100ms · max 116.7ms | 48 / 4182ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.02) | 1.91s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 66.9%/160f p95 100 max 116.7 · active 78.9%/123f p95 100 | 47 | 0.007 | 1.82s || d-mut 0 |  |
| 1440×900 | 4× | scroll #2 | 72.5%/142f p95 100 max 116.7 · active 77.7%/112f p95 100 | 48 | 0.007 | 1.91s || d-mut 0 |  |
| 1440×900 | 4× | scroll #3 | 65%/157f p95 100 max 149.9 · active 76.5%/119f p95 100 | 48 | 0.007 | 1.71s || d-mut 0 |  |
