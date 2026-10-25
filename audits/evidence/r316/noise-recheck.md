# R318 C2-P — landing smoothness harness results

- commit `55afbae6` · base `http://localhost:4183` · trace `false` · grbc `false` · `3` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | scroll | 21.3% / 21.3% · p95 50ms · max 100ms | 4 / 321ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.02) | 0.25s img | — | ×3 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | notes |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | scroll #1 | 14%/229f p95 33.5 max 100 · active 18.3%/175f p95 50 | 4 | 0.007 | 0.25s ||  |
| 1440×900 | 1× | scroll #2 | 18.3%/224f p95 49.9 max 83.3 · active 21.3%/178f p95 50 | 5 | 0.007 | 0.15s ||  |
| 1440×900 | 1× | scroll #3 | 24.1%/216f p95 50 max 100 · active 32.1%/162f p95 50 | 3 | 0.007 | 0.16s ||  |
