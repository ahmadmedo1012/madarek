# R318 C2-P — landing smoothness harness results

- commit `a27be4be` · base `http://localhost:4245` · trace `false` · grbc `false` · `2` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | theme | 24.2% / 24.2% · p95 150ms · max 249.9ms | 16 / 2461ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 1.88s p.reveal-up.reveal-d-3.fo-hero-lead | p95 360ms (2 ev) | ×1 |
| 1440×900 | 4× | route | 6.7% / 6.7% · p95 33.3ms · max 99.9ms | 9 / 1128ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 1.75s p.reveal-up.reveal-d-3.fo-hero-lead | p95 152ms (1 ev) | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 4× | theme #1 | 24.2%/120f p95 150 max 249.9 | 16 | 0.007 | 1.88s || d-mut 0 |  |
| 1440×900 | 4× | route #1 | 6.7%/149f p95 33.3 max 99.9 | 9 | 0.007 | 1.75s || d-mut 0 |  |
