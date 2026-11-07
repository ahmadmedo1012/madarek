# T-15 — WebKit in user space (unblocked)

**Status: UNBLOCKED.** Playwright WebKit launches headless in the sandbox with
NO root, NO sudo, NO X server. Proof (from `frontend/`, re-verified 2026-11-06
13:29 UTC — note all three env vars are required; without
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` pw's ldconfig-blind check refuses
on `libGLESv2.so.2` even though the prefix resolves it):

```
$ eval "$(bash ../scripts/conformance/webkit-libs.sh 2>/dev/null)"   # sets all 3 vars below
$ LD_LIBRARY_PATH=/tmp/webkit-prefix/usr/lib/x86_64-linux-gnu:/tmp/webkit-prefix/usr/lib \
  __EGL_VENDOR_LIBRARY_DIRS=/tmp/webkit-prefix/usr/share/glvnd/egl_vendor.d \
  PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1 \
  node -e "const {webkit}=require('playwright');(async()=>{const b=await webkit.launch({headless:true});
  const p=await b.newPage(); await p.goto('http://example.com'); console.log('WEBKIT-TITLE:',await p.title()); await b.close();})()"
WEBKIT-TITLE: Example Domain
```

## What was missing (and why R333 failed)

Host: Debian 13 (trixie), Playwright 1.60.0 (frontend dep), webkit-2287 bundle.
`npx playwright install webkit` downloads the browser but the host validation
fails — the base image lacks WebKit's system libraries. Iterative `ldd` on
`minibrowser-{gtk,wpe}/bin/{MiniBrowser,WebKitWebProcess}` found **10 → 4 → 0**
unresolved libs across three rounds (libs depend on libs):

| lib | package (trixie) |
|---|---|
| libgtk-4.so.1 | libgtk-4-1 |
| libgraphene-1.0.so.0 | libgraphene-1.0-0 |
| libgstgl-1.0.so.0 | libgstreamer-gl1.0-0 |
| libgstcodecparsers-1.0.so.0 | libgstreamer-plugins-bad1.0-0 |
| libmanette-0.2.so.0 | libmanette-0.2-0 |
| libenchant-2.so.2 | libenchant-2-2 |
| libsecret-1.so.0 | libsecret-1-0 |
| libwoff2dec.so.1.0.2 | libwoff1 |
| libGLESv2.so.2 | libgles2 (dlopen'd) |
| libEGL.so.1 | libegl1 (GLVND) |
| libEGL_mesa.so.0 + vendor json | libegl-mesa0 |
| libevdev.so.2 | libevdev2 |
| libgudev-1.0.so.0 | libgudev-1.0-0 |
| libhidapi-hidraw.so.0 | libhidapi-hidraw0 |

14 packages, ~5 MB of debs. (libbacktrace + libsoup are already bundled inside
the webkit-2287 zip's `sys/lib`.)

## The three real blockers (beyond missing debs)

1. **The MiniBrowser wrappers REPLACE `LD_LIBRARY_PATH`.**
   `~/.cache/ms-playwright/webkit-*/minibrowser-{gtk,wpe}/MiniBrowser` (the
   "zip bundle wrapper" that `pw_run.sh` execs) does
   `export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib"` — the inherited
   value (our prefix) is discarded. Fix: patch both wrappers to append
   (`…${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}`). Re-running
   `npx playwright install webkit` restores them → re-run `webkit-libs.sh`.

2. **GLVND vendor discovery.** With no root, `libegl-mesa0`'s ICD json lives in
   the prefix, not `/usr/share/glvnd/egl_vendor.d`. Without it, EGL has **zero
   vendors** (`eglQueryString` client extensions empty) and WebKit's headless
   WPE backend dies with `Could not create WPE EGL display: EGL_SUCCESS.
   Aborting...`. Fix: `__EGL_VENDOR_LIBRARY_DIRS=<prefix>/usr/share/glvnd/egl_vendor.d`.
   ⚠ This libglvnd build reads the **double-underscore** name only — the
   single-underscore `EGL_VENDOR_LIBRARY_DIRS` is silently ignored (verified
   with a dlopen probe; Mesa then provides `EGL_MESA_platform_surfaceless`,
   EGL 1.5 initializes, llvmpipe renders — no GPU, no /dev/dri needed).

3. **Playwright's host validation is ldconfig-blind.** It greps `/sbin/ldconfig -p`
   for dlopen'd libs (libGLESv2.so.2), which cannot see LD_LIBRARY_PATH, so it
   refuses to launch even though the lib resolves fine at runtime. Fix:
   `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` (cosmetic skip, not a lie:
   `ldd` with the prefix is 100% clean).

Also: WebKit's MiniBrowser does NOT accept `--no-sandbox` (that's a Chromium
flag — "Cannot parse arguments: Unknown option --no-sandbox").

## How to run

```bash
bash scripts/conformance/webkit-libs.sh            # idempotent: fetch+extract+patch, prints exports
eval "$(bash scripts/conformance/webkit-libs.sh)"  # ...and apply them

# instrument, engine switch (run.mjs gained --engine / CONF_ENGINE):
PLAYWRIGHT_WEBKIT_LD_PREFIX=/tmp/webkit-prefix node scripts/conformance/run.mjs \
    --engine webkit --sections footer --bps 1440,390 --url http://localhost:5315/
# or, with the exports already applied:
node scripts/conformance/run.mjs --engine webkit --sections footer --bps 1440,390
```

`run.mjs` change (minimal, T-15): imports `webkit` alongside `chromium`, adds
`--engine` flag / `CONF_ENGINE` env (default `chromium` — zero behavior change),
reads `PLAYWRIGHT_WEBKIT_LD_PREFIX` to set the child-process env before launch,
and records `engine` in `results.json`.

## Current cell results (proof run, re-verified 2026-11-06 13:30 UTC)

Same section/bps under both engines, vite dev server :5315, evidence JSONs at
`/tmp/t15-webkit.json` + `/tmp/t15-chromium.json` (both carry `engine` in the
header — re-run to regenerate):

| engine | footer@1440 | footer@390 | total |
|---|---|---|---|
| **webkit** | 96% | 85% | 1023/1127 = **90.8%** |
| chromium | 96% | 85% | 1022/1127 = 90.7% |

Delta: 1 check (0.1pp) — WebKit is measurement-equivalent to chromium for the
footer cells. A row-by-row diff of the failure lists shows the **same rows** in
both engines with sub-pixel value drift (e.g. `#ds:footer.col2` y: actual
`-11076` webkit vs `-11075` chromium; `#ds:footer.brand` w: actual 57 vs 58) —
the single pass/fail flip is a tolerance-boundary rounding effect, not a
rendering disagreement. Full-matrix WebKit runs are possible but ~1.4× slower
per bp (~14.5 s vs ~11.2 s); not wired into the ratchet (chromium stays the
engine of record until a separate decision).

## Files

- `scripts/conformance/webkit-libs.sh` — the idempotent recipe (packages list,
  wrapper patch, ldd sanity check, export printer).
- `scripts/conformance/run.mjs` — `--engine webkit` / `CONF_ENGINE` /
  `PLAYWRIGHT_WEBKIT_LD_PREFIX` (T-15 block, ~15 lines).
- `docs/redesign/r339/arsenal.md` — tool log.
