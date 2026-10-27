# R318 C2-P — landing smoothness harness results

- commit `ff7aeed6` · base `http://localhost:4173` · trace `false` · grbc `false` · `2` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 76% / 76% · p95 183.3ms · max 266.7ms | 75 / 8860ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 2.44s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×1 |
| 1440×900 | 4× | cold ·loader-ON | 12.4% / 12.4% · p95 33.4ms · max 700ms | 16 / 3087ms | 0.008 (load 0.007 / act 0.001) · div.hydration-splash (0.01), nav.fo-nav (0), div.theme-toggle (0) · under-input: nav.fo-nav (0), div.theme-toggle (0), a.fo-actions-login (0) | 5.04s h1.reveal-up.reveal-d-1.fo-hero-title | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 68.6%/159f p95 183.3 max 266.7 · active 76%/125f p95 183.3 | 75 | 0.007 | 2.44s || d-mut 0 |  |
| 1440×900 | 4× | cold·loader #1 | 12.4%/1188f p95 33.4 max 700 | 16 | 0.008 | 5.04s || d-mut 0 |  |
