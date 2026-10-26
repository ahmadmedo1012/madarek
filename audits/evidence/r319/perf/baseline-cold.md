# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `false` · grbc `false` · `4` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | cold ·loader-ON | 1% / 1% · p95 16.8ms · max 100ms | 1 / 104ms | 0.008 (load 0.007 / act 0.001) · div.hydration-splash (0.01), #node (0), nav.fo-nav (0) · under-input: #node (0), nav.fo-nav (0), a.fo-actions-login (0) | 4.61s h1.reveal-up.reveal-d-1.fo-hero-title | — | ×2 |
| 1440×900 | 4× | cold ·loader-ON | 14.8% / 14.8% · p95 33.4ms · max 516.7ms | 14 / 1841ms | 0.008 (load 0.007 / act 0.008) · div.hydration-splash (0.01), #node (0), nav.fo-nav (0) · under-input: div.hydration-splash (0.01), #node (0), nav.fo-nav (0) | 5.48s h1.reveal-up.reveal-d-1.fo-hero-title | — | ×2 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | cold·loader #1 | 1%/1475f p95 16.8 max 100 | 1 | 0.008 | 4.61s || d-mut 0 |  |
| 1440×900 | 1× | cold·loader #2 | 0.5%/1489f p95 16.8 max 83.3 | 1 | 0.008 | 3.93s || d-mut 0 |  |
| 1440×900 | 4× | cold·loader #1 | 10.7%/1263f p95 33.4 max 466.7 | 14 | 0.008 | 4.88s || d-mut 0 |  |
| 1440×900 | 4× | cold·loader #2 | 14.8%/1227f p95 33.4 max 516.7 | 14 | 0.008 | 5.48s || d-mut 0 |  |
