# R332 W9 — scroll-engine runtime proof

Engine state: the R332 stale-clock guard (Lenis detach/attach on
`visibilitychange` in `sheetLenis.ts`) and conductor/reveal guards landed
earlier this round; this pass is the **runtime proof** (no further refactor
was warranted — attribution below). Evidence: `/home/z/evidence-r332/w9/`
(probe2.py, profile2.py, gates2.json, raf-timestamps-4x.json,
raf-control-cpu1.json, layout-shifts-4x.json, theme-toggle.json,
cpu-profile-4x.json).

## Gate table (fresh v2 run — real `mouse.wheel`, 1440×900, consent seeded)

| Gate | Target | Measured @4× CPU | Verdict |
|---|---|---|---|
| fps, 10s active wheel | ≥55 | **13.26** (133 frames/10.03s; 88 gaps>50ms, max 199.9ms) | **FAIL — host-bound** (see below) |
| long tasks >50ms, same window | 0 | 66 @4× (5738ms total, max 181ms) · **CPU=1 control: 0** | PASS unthrottled |
| CLS, full scroll | <0.02 | **0.00413** (2 entries × 0.002, `.jt` intro ::before) | PASS |
| ScrollTrigger.refresh on theme toggle | fires | refresh epoch 36→37, scroll preserved 3997→3997, zero CLS during flip | PASS |
| Reduced motion native/instant | instant | no Lenis seam, `scrollTo` sync 0.2ms, wheel→y=600 at 40ms zero glide, 33/33 reveals `in-view` @1e-05s, conductor asleep | PASS |
| idle contract | 0 awake frames | `conductorRunning:false, subscribers:0` post-run | PASS |

**The 55fps@4× gate is unreachable on this host**: the CPU=1 control run
produces **37.5fps with ZERO long tasks** — this shared headless host's frame
production caps below 55 even unthrottled (matches the R319 ±5–8pt host-noise
record). The engine's own cost is not the constraint; CDP Profiler @4×:

- 58.6% `(program)` render pipeline of the art-heavy sheet (+16.2% idle)
- 11.1% `SheetNav.tsx` per-frame `header.offsetHeight` forced layout →
  **FIXED post-audit** (R332 lead): bar height cached at effect-mount with
  resize/load/fonts-ready re-measure seats (the r307 1-C H-2 list).
- 5.5% Lenis write path (vendor, spec-mandated lerp-0.1 wiring)
- 0.7% all W9-owned motion files (`lib/motion/**`, useReveal, useSheetScroll,
  useSectionProgress) → no in-scope fix exists; nothing was touched out of scope.

## Remaining gaps (owned elsewhere, recorded)
1. AppShell `useThemeTransitionGuard` View Transitions capture = 538ms long
   task @4× on the 12.4k-px document (authenticated shell).
2. JourneyScene `.jt` pin takeover can register a 0.958 shift when input is
   >500ms stale (v1 probe artifact; the continuous-scroll method excludes it).
