# R318 C2-P — landing smoothness harness results

- commit `55afbae6` · base `http://localhost:4183` · trace `false` · grbc `false` · `78` runs
- frames (active window = first→last input): %frames>20ms / %frames>33ms · p95/max rAF delta (ms) — median across runs
- longtasks: count>50ms / total ms (median) · CLS: total (load phase / interaction phase), standard (no-input) sum
- top shifters: standard sum per node · under-input: shift sum INCLUDING input-adjacent entries (diagnostic)
- LCP: worst element + ms across runs · INP: p95 across pooled worst-per-interaction

| viewport | cpu | scenario | frames | longtasks | CLS + top shifters | LCP | INP | runs |
|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | scroll | 19.8% / 19.8% · p95 49.9ms · max 100ms | 4 / 315ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.04) | 0.26s img | — | ×5 |
| 1440×900 | 4× | scroll | 71.1% / 71.1% · p95 100ms · max 200ms | 63 / 5067ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.04) | 1.84s p.reveal-up.reveal-d-3.fo-hero-lead | — | ×6 |
| 390×844 | 1× | scroll | 2.8% / 2.8% · p95 16.8ms · max 50.1ms | 2 / 154ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.16s img | — | ×4 |
| 390×844 | 4× | scroll | 96.6% / 96.6% · p95 83.3ms · max 133.3ms | 69 / 5048ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.50s img | — | ×7 |
| 1440×900 | 1× | scroll ·grain-off | 22.6% / 22.6% · p95 49.9ms · max 150ms | 3 / 230ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.18s img | — | ×2 |
| 1440×900 | 4× | scroll ·grain-off | 76.7% / 76.7% · p95 100ms · max 183.3ms | 61 / 5032ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.46s img | — | ×2 |
| 390×844 | 1× | scroll ·grain-off | 2.7% / 2.7% · p95 16.8ms · max 66.6ms | 2 / 141ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.16s img | — | ×2 |
| 390×844 | 4× | scroll ·grain-off | 97.6% / 97.6% · p95 83.4ms · max 150ms | 75 / 5673ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.36s img | — | ×2 |
| 1440×900 | 1× | scroll ·filter-off | 23.8% / 23.8% · p95 49.9ms · max 83.3ms | 3 / 218ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.19s img | — | ×2 |
| 1440×900 | 4× | scroll ·filter-off | 72.5% / 72.5% · p95 100ms · max 166.7ms | 62 / 5032ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.40s img | — | ×2 |
| 390×844 | 1× | scroll ·filter-off | 2.4% / 2.4% · p95 16.8ms · max 66.7ms | 2 / 122ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.16s img | — | ×2 |
| 390×844 | 4× | scroll ·filter-off | 98.4% / 98.4% · p95 83.4ms · max 200ms | 76 / 5810ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.36s img | — | ×2 |
| 1440×900 | 1× | scroll ·svg-off | 23% / 23% · p95 50ms · max 116.7ms | 5 / 407ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.18s img | — | ×2 |
| 1440×900 | 4× | scroll ·svg-off | 74.6% / 74.6% · p95 100ms · max 133.3ms | 63 / 5234ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.34s img | — | ×2 |
| 390×844 | 1× | scroll ·svg-off | 2.6% / 2.6% · p95 16.8ms · max 66.7ms | 3 / 197ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.16s img | — | ×2 |
| 390×844 | 4× | scroll ·svg-off | 93.6% / 93.6% · p95 83.4ms · max 200.1ms | 71 / 5523ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.46s img | — | ×2 |
| 1440×900 | 4× | touch | 60.4% / 60.4% · p95 100ms · max 200.1ms | 165 / 12824ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.42s img | — | ×2 |
| 1440×900 | 4× | menu | — | 9 / 1323ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 0.36s img | — | ×2 |
| 1440×900 | 4× | theme | 26.2% / 26.2% · p95 116.7ms · max 300ms | 20 / 2678ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01) | 1.80s p.reveal-up.reveal-d-3.fo-hero-lead | p95 456ms (4 ev) | ×2 |
| 1440×900 | 4× | route | 31.4% / 31.4% · p95 50.1ms · max 300ms | 10 / 1654ms | 0.007 (load 0.007 / act 0) · div.hydration-splash (0.01), span.et-label (0) | 1.86s p.reveal-up.reveal-d-3.fo-hero-lead | p95 304ms (2 ev) | ×2 |
| 1440×900 | 4× | typing | 25.8% / 25.8% · p95 49.9ms · max 66.7ms | 9 / 863ms | 0.007 (load 0.007 / act 0) · div.cursor-lines (0.01) | 0.82s (gone) | p95 96ms (6 ev) | ×2 |
| 390×844 | 4× | touch | 94.8% / 94.8% · p95 83.4ms · max 383.4ms | 175 / 12773ms | 0 (load 0 / act 0) · span (0) · under-input: span (0) | 0.36s img | — | ×2 |
| 390×844 | 4× | menu | 11.3% / 11.3% · p95 33.4ms · max 116.7ms | 8 / 960ms | 0 (load 0 / act 0) | 0.42s img | p95 160ms (4 ev) | ×2 |
| 390×844 | 4× | theme | 10.8% / 10.8% · p95 33.4ms · max 183.4ms | 13 / 1598ms | 0 (load 0 / act 0) | 0.42s img | p95 272ms (4 ev) | ×2 |
| 390×844 | 4× | route | 5.6% / 5.6% · p95 33.3ms · max 150ms | 7 / 1012ms | 0 (load 0 / act 0) | 0.34s img | p95 176ms (2 ev) | ×2 |
| 390×844 | 4× | typing | 4.6% / 4.6% · p95 16.8ms · max 33.4ms | 2 / 111ms | 0 (load 0 / act 0) | 0.28s img | p95 48ms (6 ev) | ×2 |
| 1440×900 | 4× | cold ·loader-ON | 19.5% / 19.5% · p95 50ms · max 450ms | 20 / 2123ms | 0.008 (load 0.007 / act 0.008) · div.hydration-splash (0.01), a.btn.accent.lg (0), nav.fo-nav (0) · under-input: div.hydration-splash (0.01), a.btn.accent.lg (0), nav.fo-nav (0) | 4.05s div.fo-grain | — | ×2 |
| 1440×900 | 1× | cold ·loader-ON | 3.7% / 3.7% · p95 16.8ms · max 116.7ms | 1 / 99ms | 0.008 (load 0.007 / act 0.001) · div.hydration-splash (0.01), nav.fo-nav (0), a.btn.accent.lg (0) · under-input: nav.fo-nav (0), a.btn.accent.lg (0), a.fo-actions-login (0) | 2.99s h1.reveal-up.reveal-d-1.fo-hero-title | — | ×2 |
| 390×844 | 4× | cold ·loader-ON | 8.5% / 8.5% · p95 33.3ms · max 333.3ms | 13 / 1235ms | 0.034 (load 0 / act 0.034) · div.fo-hero-strip (0.07), section#statement.st-section (0.07), #node (0.04) · under-input: div.fo-hero-strip (0.07), section#statement.st-section (0.07), #node (0.04) | 3.62s div.fo-grain | — | ×2 |
| 390×844 | 1× | cold ·loader-ON | 0.4% / 0.4% · p95 16.8ms · max 83.3ms | 1 / 71ms | 0.037 (load 0 / act 0.037) · div.fo-hero-strip (0.07), section#statement.st-section (0.07), div.sl-meta (0.04) · under-input: div.fo-hero-strip (0.07), section#statement.st-section (0.07), div.sl-meta (0.04) | 2.80s div.fo-grain | — | ×2 |
| 1440×900 | 1× | cold | 0.7% / 0.7% · p95 16.8ms · max 100ms | 1 / 104ms | 0.008 (load 0 / act 0.008) · div.hydration-splash (0.01), nav.fo-nav (0), a.btn.accent.lg (0) · under-input: div.hydration-splash (0.01), nav.fo-nav (0), a.btn.accent.lg (0) | 2.99s h1.reveal-up.reveal-d-1.fo-hero-title | — | ×1 |
| 1440×900 | 4× | cold | 11.8% / 11.8% · p95 33.4ms · max 566.6ms | 10 / 1404ms | 0.008 (load 0 / act 0.008) · div.hydration-splash (0.01), a.btn.accent.lg (0), nav.fo-nav (0) · under-input: div.hydration-splash (0.01), a.btn.accent.lg (0), nav.fo-nav (0) | 3.95s h1.reveal-up.reveal-d-1.fo-hero-title | — | ×1 |
| 390×844 | 1× | cold | 0.2% / 0.2% · p95 16.8ms · max 66.6ms | 1 / 71ms | 0.034 (load 0 / act 0.034) · div.fo-hero-strip (0.03), section#statement.st-section (0.03), #node (0.02) · under-input: div.fo-hero-strip (0.03), section#statement.st-section (0.03), #node (0.02) | 2.76s div.fo-grain | — | ×1 |
| 390×844 | 4× | cold | 16% / 16% · p95 33.4ms · max 399.9ms | 8 / 838ms | 0.034 (load 0 / act 0.034) · div.fo-hero-strip (0.03), section#statement.st-section (0.03), ::before (0.02) · under-input: div.fo-hero-strip (0.03), section#statement.st-section (0.03), ::before (0.02) | 3.60s div.fo-grain | — | ×1 |

## Raw runs

| viewport | cpu | run | frames | lt>50 | CLS | LCP | census | d-mut | notes |
|---|---|---|---|---|---|---|---|---|---|
| 1440×900 | 1× | scroll #1 | 15.7%/235f p95 33.4 max 100 · active 19.8%/182f p95 49.9 | 2 | 0.007 | 0.26s ||  |  |
| 1440×900 | 1× | scroll #2 | 15.4%/227f p95 33.4 max 100 · active 19.5%/174f p95 50 | 3 | 0.007 | 0.16s ||  |  |
| 1440×900 | 1× | scroll #3 | 17%/230f p95 33.4 max 116.6 · active 21.6%/176f p95 49.9 | 4 | 0.007 | 0.19s ||  |  |
| 1440×900 | 4× | scroll #1 | 59.1%/171f p95 83.4 max 216.7 · active 71.1%/128f p95 99.9 | 58 | 0.007 | 0.33s ||  |  |
| 1440×900 | 4× | scroll #2 | 60.7%/178f p95 83.4 max 200 · active 70.1%/137f p95 83.4 | 60 | 0.007 | 0.30s ||  |  |
| 1440×900 | 4× | scroll #3 | 62.4%/165f p95 83.4 max 166.6 · active 74.4%/125f p95 100 | 63 | 0.007 | 1.84s ||  |  |
| 390×844 | 1× | scroll #1 | 2%/252f p95 16.8 max 50.1 · active 2.5%/198f p95 16.8 | 1 | 0 | 0.16s ||  |  |
| 390×844 | 1× | scroll #2 | 2.3%/265f p95 16.8 max 66.7 · active 2.8%/211f p95 16.8 | 2 | 0 | 0.16s ||  |  |
| 390×844 | 1× | scroll #3 | 2.6%/272f p95 16.8 max 50 · active 3.2%/217f p95 16.8 | 3 | 0 | 0.16s ||  |  |
| 390×844 | 4× | scroll #1 | 94.4%/142f p95 83.3 max 133.3 · active 96.6%/119f p95 83.4 | 62 | 0 | 0.38s ||  |  |
| 390×844 | 4× | scroll #2 | 95.7%/138f p95 83.4 max 200 · active 97.5%/121f p95 83.4 | 65 | 0 | 0.41s ||  |  |
| 390×844 | 4× | scroll #3 | 90.1%/152f p95 83.3 max 150 · active 97.6%/125f p95 83.3 | 58 | 0 | 0.38s ||  |  |
| 1440×900 | 1× | scroll·grain-off #1 | 16.7%/227f p95 33.4 max 150 · active 22%/173f p95 49.9 | 2 | 0.007 | 0.16s ||  |  |
| 1440×900 | 1× | scroll·grain-off #2 | 17.6%/244f p95 33.5 max 116.7 · active 22.6%/190f p95 49.9 | 3 | 0.007 | 0.18s ||  |  |
| 1440×900 | 4× | scroll·grain-off #1 | 64.7%/167f p95 99.9 max 183.3 · active 73.8%/130f p95 100 | 61 | 0.007 | 0.46s ||  |  |
| 1440×900 | 4× | scroll·grain-off #2 | 65.4%/159f p95 100 max 149.9 · active 76.7%/120f p95 100 | 56 | 0.007 | 0.35s ||  |  |
| 390×844 | 1× | scroll·grain-off #1 | 2.8%/254f p95 16.8 max 66.6 · active 2.5%/201f p95 16.8 | 2 | 0 | 0.14s ||  |  |
| 390×844 | 1× | scroll·grain-off #2 | 2.2%/277f p95 16.8 max 66.6 · active 2.7%/222f p95 16.8 | 2 | 0 | 0.16s ||  |  |
| 390×844 | 4× | scroll·grain-off #1 | 92.6%/148f p95 83.4 max 133.4 · active 96%/124f p95 83.4 | 65 | 0 | 0.36s ||  |  |
| 390×844 | 4× | scroll·grain-off #2 | 96.6%/146f p95 83.4 max 150 · active 97.6%/126f p95 83.4 | 75 | 0 | 0.35s ||  |  |
| 1440×900 | 1× | scroll·filter-off #1 | 18.8%/224f p95 49.9 max 66.7 · active 23.8%/172f p95 49.9 | 3 | 0.007 | 0.19s ||  |  |
| 1440×900 | 1× | scroll·filter-off #2 | 12.9%/248f p95 33.4 max 83.3 · active 16.6%/193f p95 33.4 | 2 | 0.007 | 0.17s ||  |  |
| 1440×900 | 4× | scroll·filter-off #1 | 60%/170f p95 99.9 max 166.7 · active 70.5%/129f p95 100 | 62 | 0.007 | 0.34s ||  |  |
| 1440×900 | 4× | scroll·filter-off #2 | 59.9%/182f p95 83.4 max 149.9 · active 72.5%/138f p95 83.4 | 53 | 0.007 | 0.40s ||  |  |
| 390×844 | 1× | scroll·filter-off #1 | 2.9%/245f p95 16.8 max 33.4 · active 2.1%/193f p95 16.8 | 1 | 0 | 0.13s ||  |  |
| 390×844 | 1× | scroll·filter-off #2 | 2.7%/261f p95 16.8 max 66.7 · active 2.4%/208f p95 16.8 | 2 | 0 | 0.16s ||  |  |
| 390×844 | 4× | scroll·filter-off #1 | 96.4%/137f p95 100 max 133.3 · active 96%/126f p95 83.3 | 76 | 0 | 0.36s ||  |  |
| 390×844 | 4× | scroll·filter-off #2 | 96.6%/149f p95 83.4 max 200 · active 98.4%/127f p95 83.4 | 76 | 0 | 0.33s ||  |  |
| 1440×900 | 1× | scroll·svg-off #1 | 17.7%/237f p95 49.9 max 116.7 · active 23%/183f p95 50 | 5 | 0.007 | 0.18s ||  |  |
| 1440×900 | 1× | scroll·svg-off #2 | 17.2%/233f p95 50 max 99.9 · active 21.7%/180f p95 50 | 3 | 0.007 | 0.18s ||  |  |
| 1440×900 | 4× | scroll·svg-off #1 | 64.3%/168f p95 83.4 max 133.3 · active 74.6%/130f p95 100 | 63 | 0.007 | 0.34s ||  |  |
| 1440×900 | 4× | scroll·svg-off #2 | 63%/173f p95 83.4 max 116.7 · active 72.9%/133f p95 100 | 63 | 0.007 | 0.32s ||  |  |
| 390×844 | 1× | scroll·svg-off #1 | 2.8%/248f p95 16.8 max 50.1 · active 1.5%/197f p95 16.7 | 2 | 0 | 0.16s ||  |  |
| 390×844 | 1× | scroll·svg-off #2 | 2.4%/250f p95 16.8 max 66.7 · active 2.6%/195f p95 16.8 | 3 | 0 | 0.16s ||  |  |
| 390×844 | 4× | scroll·svg-off #1 | 91.2%/147f p95 83.4 max 200.1 · active 93.6%/125f p95 83.4 | 68 | 0 | 0.38s ||  |  |
| 390×844 | 4× | scroll·svg-off #2 | 91%/144f p95 83.4 max 199.9 · active 93.4%/122f p95 83.4 | 71 | 0 | 0.46s ||  |  |
| 1440×900 | 4× | touch #1 | 57.8%/500f p95 83.4 max 200.1 · active 60.4%/460f p95 83.4 | 145 | 0.007 | 0.42s ||  |  |
| 1440×900 | 4× | menu #1 | — | 9 | 0.007 | 0.36s ||  | skipped: .fo-burger not visible at this width |
| 1440×900 | 4× | theme #1 | 24%/129f p95 83.3 max 300 | 15 | 0.007 | 0.32s ||  |  |
| 1440×900 | 4× | route #1 | 20%/135f p95 33.4 max 100 | 10 | 0.007 | 1.86s ||  |  |
| 1440×900 | 4× | typing #1 | 11.1%/190f p95 33.3 max 33.5 | 2 | 0.007 | 0.26s ||  |  |
| 390×844 | 4× | touch #1 | 90.9%/396f p95 83.4 max 300 · active 94.8%/363f p95 83.4 | 175 | 0 | 0.36s ||  |  |
| 390×844 | 4× | menu #1 | 7%/158f p95 33.3 max 116.7 | 6 | 0 | 0.42s ||  |  |
| 390×844 | 4× | theme #1 | 7.1%/492f p95 33.3 max 150 | 11 | 0 | 0.42s ||  | theme toggled via mobile menu |
| 390×844 | 4× | route #1 | 4.3%/1358f p95 16.8 max 116.7 | 7 | 0 | 0.34s ||  | route change via mobile menu; login link not found; route wa |
| 390×844 | 4× | typing #1 | 3.6%/194f p95 16.8 max 33.4 | 2 | 0 | 0.28s ||  |  |
| 1440×900 | 4× | cold·loader #1 | 15%/572f p95 33.4 max 433.3 | 16 | 0.008 | 3.97s ||  |  |
| 1440×900 | 1× | cold·loader #1 | 3%/676f p95 16.8 max 99.9 | 1 | 0.008 | 2.97s ||  |  |
| 390×844 | 4× | cold·loader #1 | 7.5%/644f p95 33.3 max 333.3 | 11 | 0.034 | 3.48s ||  |  |
| 390×844 | 1× | cold·loader #1 | 0.3%/697f p95 16.8 max 66.6 | 1 | 0.037 | 2.79s ||  |  |
| 1440×900 | 1× | cold #1 | 0.7%/1482f p95 16.8 max 100 | 1 | 0.008 | 2.99s ||  |  |
| 1440×900 | 4× | cold #1 | 11.8%/1271f p95 33.4 max 566.6 | 10 | 0.008 | 3.95s ||  |  |
| 390×844 | 1× | cold #1 | 0.2%/1496f p95 16.8 max 66.6 | 1 | 0.034 | 2.76s ||  |  |
| 390×844 | 4× | cold #1 | 16%/1262f p95 33.4 max 399.9 | 8 | 0.034 | 3.60s ||  |  |
| 1440×900 | 1× | scroll #1 | 14.2%/239f p95 33.4 max 100 · active 18.4%/185f p95 33.4 | 4 | 0.007 | 0.21s | · grbc 6772reads(null/s) 168attr 1117vars|  |  |
| 1440×900 | 4× | scroll #1 | 58.2%/170f p95 100 max 166.6 · active 69.3%/127f p95 100 | 53 | 0.007 | 0.43s | · grbc 4821reads(null/s) 168attr 841vars|  |  |
| 390×844 | 1× | scroll #1 | 2.4%/250f p95 16.8 max 50 · active 2.6%/195f p95 16.8 | 2 | 0 | 0.14s | · grbc 6503reads(null/s) 417attr 1149vars|  |  |
| 390×844 | 4× | scroll #1 | 95.3%/149f p95 83.3 max 183.4 · active 96.9%/129f p95 83.2 | 70 | 0 | 0.32s | · grbc 4010reads(null/s) 317attr 749vars|  |  |
| 1440×900 | 1× | scroll #1 | 17.5%/234f p95 33.4 max 100 · active 22.8%/180f p95 50 | 4 | 0.007 | 0.20s ||  |  |
| 390×844 | 4× | scroll #1 | 91.7%/157f p95 83.3 max 250 · active 94%/133f p95 83.3 | 70 | 0 | 0.34s ||  |  |
| 1440×900 | 4× | scroll #1 | 61.1%/175f p95 83.4 max 200 · active 70.9%/134f p95 83.4 | 64 | 0.007 | 0.48s || d-mut 0 |  |
| 1440×900 | 4× | touch #1 | 57%/491f p95 100 max 183.4 · active 60.1%/449f p95 100 | 165 | 0.007 | 0.36s || d-mut 0 |  |
| 1440×900 | 4× | menu #1 | — | 8 | 0.007 | 0.33s || d-mut 0 | skipped: .fo-burger not visible at this width |
| 1440×900 | 4× | theme #1 | 26.2%/126f p95 116.7 max 283.3 | 20 | 0.007 | 1.80s || d-mut 0 |  |
| 1440×900 | 4× | route #1 | 31.4%/121f p95 50.1 max 300 | 10 | 0.007 | 0.36s || d-mut 0 |  |
| 1440×900 | 4× | typing #1 | 25.8%/209f p95 49.9 max 66.7 | 9 | 0.007 | 0.82s || d-mut 0 |  |
| 390×844 | 4× | scroll #1 | 90.3%/154f p95 83.4 max 166.7 · active 93.8%/130f p95 83.4 | 69 | 0 | 0.50s || d-mut 0 |  |
| 390×844 | 4× | touch #1 | 91%/410f p95 83.3 max 383.4 · active 94.4%/375f p95 83.3 | 174 | 0 | 0.34s || d-mut 0 |  |
| 390×844 | 4× | menu #1 | 11.3%/151f p95 33.4 max 83.4 | 8 | 0 | 0.33s || d-mut 0 |  |
| 390×844 | 4× | theme #1 | 10.8%/474f p95 33.4 max 183.4 | 13 | 0 | 0.38s || d-mut 0 | theme toggled via mobile menu |
| 390×844 | 4× | route #1 | 5.6%/1337f p95 33.3 max 150 | 7 | 0 | 0.34s || d-mut 0 | route change via mobile menu; login link not found; route wa |
| 390×844 | 4× | typing #1 | 4.6%/195f p95 16.8 max 33.4 | 0 | 0 | 0.24s || d-mut 0 |  |
| 1440×900 | 4× | scroll #1 | 68.3%/161f p95 100.1 max 233.3 · active 77.4%/124f p95 116.6 | 66 | 0.007 | 0.38s | · grbc 4585reads(560.4/s) 168attr 809vars| d-mut 0 |  |
| 390×844 | 4× | scroll #1 | 92.1%/140f p95 83.3 max 133.3 · active 96.6%/116f p95 83.3 | 71 | 0 | 0.34s | · grbc 3619reads(465.9/s) 307attr 709vars| d-mut 0 |  |
| 1440×900 | 1× | cold·loader #1 | 3.7%/668f p95 16.8 max 116.7 | 1 | 0.008 | 2.99s || d-mut 0 |  |
| 1440×900 | 4× | cold·loader #1 | 19.5%/529f p95 50 max 450 | 20 | 0.008 | 4.05s || d-mut 0 |  |
| 390×844 | 1× | cold·loader #1 | 0.4%/695f p95 16.7 max 83.3 | 1 | 0.037 | 2.80s || d-mut 0 |  |
| 390×844 | 4× | cold·loader #1 | 8.5%/637f p95 33.3 max 299.9 | 13 | 0.033 | 3.62s || d-mut 0 |  |
