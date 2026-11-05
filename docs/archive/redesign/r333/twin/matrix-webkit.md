# Twin matrix — WebKit engine sweep (P-F4, R333)

Cross-vp doc (single run produces one report): evidence
`/home/z/evidence-r333/twin/run-webkit/` — `1440/` (5 sections, 11 frames/side/section,
`--step 10`) + `390/` (3 sections, 6 frames/side/section, `--step 20`) ·
full tables `report.md` / `report.json` next to it · engine **WebKit WPE headless**
(Playwright 1.57 python → bundle `webkit-2227`, engine version 26.0).

Why this file and not per-vp matrix files: the run is cross-vp and no `matrix-1440.md`
chromium baseline exists yet (1440 was the one calibrated vp never swept before P-F4),
so a single WebKit file keeps it clean. Chromium cross-references below are to
matrix-390/1920.

Thresholds: height Δ≤3% · heading fs Δ≤4% · rhythm Δ≤8px · trigger Δ≤40px ·
PASS = all within / FAIL = any >2× / else PARTIAL.

## WebKit enablement (sandbox) — what it took

1. **Launch**: `scripts/r333/webkit-userland.sh test` → `WEBKIT_LAUNCH_OK version=26.4`
   (node probe, bundle 2287). Python playwright 1.57 expects **webkit-2227** (a different
   bundle) → installed via `python3 -m playwright install webkit`, then the userland
   `sys/lib` symlinks had to be created manually into
   `webkit-2227/minibrowser-wpe/sys/lib` (58 libs): **fixer blind spot** — the fixer
   validates with the node probe (bundle 2287), so with 2287 healthy its probe-loop never
   reaches the symlink step for a different `WEBKIT_ROOT`.
2. **TLS broken in the WPE bundle** (heron is https): first goto died with
   *"TLS support is not available"* → extracted `glib-networking` into `/home/z/pw-libs`
   and injected **only** `libgiognutls.so` via
   `GIO_EXTRA_MODULES=/home/z/pw-libs/gio-modules-tls`. Pointing GIO_EXTRA_MODULES at the
   full `gio/modules` dir **fatal-aborts** every load ("internal error"): `libgiolibproxy`
   misses `libproxy.so.1` and `libgiognomeproxy` hits a missing `org.gnome.system.proxy`
   settings schema → `GLib-GIO-ERROR`. With the gnutls-only dir: heron loads, status 200.
3. Launch env (set BEFORE the python process): `LIBGL_ALWAYS_SOFTWARE=1`,
   `__EGL_VENDOR_LIBRARY_FILENAMES=/home/z/pw-libs/usr/share/glvnd/egl_vendor.d/50_mesa.json`,
   `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`, `GIO_EXTRA_MODULES=…/gio-modules-tls`.
4. One transient stall (heron cta @1440 frame p=50: seek/screenshot hung >5 min) —
   recovered cleanly on resume (same frame captured in 19s). Watch for recurrence.

Code change (P-F4, `scripts/twin/capture.py`): `--engine {chromium,webkit}` CLI flag
(default chromium → `getattr(pw, engine).launch()`; chromium path byte-identical) +
`engine` recorded in `capture-summary.json`.

## Verdicts @1440 (WebKit, vh=900)

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | notes (heron vs madarek) |
|---|---|---|---|---|---|---|
| journey | PARTIAL* | 0.41 | 0.0 | n/a (pinned) | 5.8 | h 6300.0 vs 6274.0, fs 46.67 both — clean |
| statement | PARTIAL* | 0.0 | 0.0 | n/a (layered) | 6.3 | h 722.5 vs 722.5, fs 33.33 both — clean |
| roles | FAIL | 0.0 | 0.0 | n/a | **1812.7** | h 886.7 vs 886.7, fs 40 both — trigger is cascade (below) |
| cta | FAIL | 0.06 | 0.0 | 0.0 | **1812.8** | h 697.5 vs 697.9 — all local metrics clean; trigger = cascade |
| footer | FAIL | 0.01 | 0.0 | 0.0 | **917.4** | h 709.5 vs 709.6 — local clean; trigger = cascade |

\* PARTIAL = verdict-rule artifact (rhythm n/a on pinned/layered bands); every measured
metric inside threshold.

**P-F3 fixes HOLD on WebKit @1440**: journey (0.41% h, trig 5.8px) and statement (0.0%/0.0%,
trig 6.3px) are clean; cta/footer local heights agree to 0.4px / 0.1px. The chromium-1920
footer-height defect (madarek +63%) does **not** reproduce @1440 under WebKit.

**cta/footer/roles trigger ~917–1813px = upstream cascade, same signature as matrix-1920
(chromium)**: section tops agree through journey (Δ 5.8px) and diverge only across the
unswept platform/why/roles region (heron's why band grows post-activation, ~2350px @1920;
roles Δ 1812.7 ≈ cta Δ 1812.8 → growth sits between roles.top and cta.top). Not local to
any swept section; treat as harness activation-order artifact until platform/why/roles are
swept @1440 (no chromium-1440 baseline exists to separate fresh vs post-activation yet).

## Verdicts @390 (WebKit, vh=844) — vs chromium run (matrix-390.md)

| section | verdict | height Δ% | heading fs Δ% | rhythm Δpx | trigger Δpx | chromium Δ (same section) |
|---|---|---|---|---|---|---|
| journey | PARTIAL* | 0.34 | 0.0 | n/a (pinned) | 19.6 | h 0.39, trig 7.3 |
| cta | FAIL | 0.14 | 0.0 | **12.0** | **106.0** | rhythm 12.0, trig 105.2 |
| footer | FAIL | 0.33 | 0.0 | 0.0 | **105.2** | h 2.08, trig 105.2 |

\* rhythm-n/a artifact. Numbers reproduce chromium's 390 run almost exactly — cta rhythm
12px vs 12px, footer trigger 105.2px vs 105.2px: **the 390 cascade (heron-side pre-cta
offset + platform/roles redistribution) is engine-independent**, and WebKit shows no new
mobile defect. footer height Δ actually improved vs chromium (0.33% vs 2.08%).
`--step 20` here (6 frames/side/section) — budget; medians less dense than chromium's
`--step 4` but within verdict noise.

## WebKit-specific rendering deltas (honest)

- Cross-engine absolute pixel diffs @p50 (meanDiff, 0–255): statement **35.8** (23.5% of
  px >32), cta 22.3, roles 22.1, footer 21.4, journey 13.6 @1440. These are
  engine-level rendering differences (font rasterization/antialiasing, blend/compositing)
  on top of layout — geometry medians (heights, heading fs, tops) match to decimal places,
  so it is pixels, not structure. Depth inspection of strips not done in P-F4 budget;
  `report/vp-1440/*-heat-p050.png` + `*-strip.png` are on disk for eyeballing.
- All `document.fonts.status` recorded per frame; heading fs medians identical
  heron-vs-madarek in every section → web-font loading did not degrade parity.
- UA override remains the Chrome UA string on both sides (kept for cross-side
  comparability); UA-content-negotiation differences are out of scope of this sweep.

## MISSING (budget)

- @1440: `hero, pains, platform, why` (also where the 1813px cascade originates —
  highest-value next captures).
- @390: `statement, roles` (chromium numbers exist; heron side only, `--step 20`).
- @768/1024/1920: unswept on WebKit.

## Artifact paths

- Evidence root: `/home/z/evidence-r333/twin/run-webkit/`
  (`1440/`, `390/`, `report.md`, `report.json`, `report/vp-1440/`, `report/vp-390/`)
- Env provenance: `1440/capture-summary.json` + `390/capture-summary.json` (`"engine": "webkit"`)
- TLS/GIO fix artifacts: `/home/z/pw-libs/usr/lib/x86_64-linux-gnu/gio/modules/` (extracted
  glib-networking), `/home/z/pw-libs/gio-modules-tls/libgiognutls.so` (safe GIO_EXTRA_MODULES)
- Sweep summary: `pf4-capture-summary.json` next to the run (if regenerated later runs
  overwrite `capture-summary.json`, this file holds the last P-F4 invocation state).
