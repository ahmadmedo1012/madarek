# R318 C2-P — landing smoothness harness results

- commit `ff7aeed6` · base `http://localhost:4173` · trace `false` · grbc `false` · `1` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll ·svg-off | 71.4% / 71.4% · p95 150ms · max 166.8ms | 62 / 6611ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 1.98s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll·svg-off #1 | 62.9%/159f p95 149.9 max 166.8 · active 71.4%/119f p95 150 | 62 | 0.007 | 1.98s || d-mut 0 |  |
