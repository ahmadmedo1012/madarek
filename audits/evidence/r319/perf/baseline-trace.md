# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `true` · grbc `false` · `1` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll | 75.6% / 75.6% · p95 100ms · max 100ms | 60 / 5034ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 2.02s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | scroll #1 | 65.5%/171f p95 99.9 max 100 · active 75.6%/131f p95 100 | 60 | 0.007 | 2.02s || d-mut 0 |  |
