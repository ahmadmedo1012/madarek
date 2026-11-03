# R333 Arsenal Delta — A-Scout

Round: R333 · Scouted: 2026-11-03 · Host: Debian 13 (trixie), Node v24.22.2, Playwright 1.60.0
Scope: WebKit headless fix, GSAP free-plugin audit, design-skill inventory, media tooling.

---

## 1. Master table

| Tool / Skill | Status | Exact invocation | Version | Evidence (one line) |
|---|---|---|---|---|
| Playwright WebKit (headless) | **AVAILABLE (fixed this round)** | `bash scripts/r333/webkit-userland.sh fix` then run node with env from `scripts/r333/webkit-userland.sh env` | 26.4 (webkit-2287) | `WEBKIT_LAUNCH_OK version=26.4 text=probe` — real page render + `newPage()` verified |
| Playwright Chromium | AVAILABLE (regression-checked) | `chromium.launch()` | 148.0.7778.96 | launch+close OK after all WebKit changes |
| Playwright `recordVideo` | **AVAILABLE (proven)** | `browser.newContext({ recordVideo: { dir, size } })` | playwright-core 1.60.0 | webkit + chromium each wrote a real `.webm` (ffprobe: 1.12s) |
| GSAP | **NEW** (not yet a project dep) | `npm i gsap` in frontend workspace | 3.15.0 (npm latest) | scratch-installed in `/tmp/gsap-check`; all 6 free plugins require OK |
| GSAP SplitText | AVAILABLE (free in 3.13+) | `import { SplitText } from "gsap/SplitText"` | 3.15.0 | `require('gsap/SplitText') → { SplitText }` OK |
| GSAP Flip | AVAILABLE (free) | `import { Flip } from "gsap/Flip"` | 3.15.0 | require OK |
| GSAP DrawSVGPlugin | AVAILABLE (free) | `import { DrawSVGPlugin } from "gsap/DrawSVGPlugin"` | 3.15.0 | require OK (⚠ absent from `gsap/all.js` named exports — use subpath) |
| GSAP MorphSVGPlugin | AVAILABLE (free) | `import { MorphSVGPlugin } from "gsap/MorphSVGPlugin"` | 3.15.0 | require OK (⚠ absent from `gsap/all.js` named exports — use subpath) |
| GSAP CustomEase | AVAILABLE (free) | `import { CustomEase } from "gsap/CustomEase"` | 3.15.0 | require OK |
| GSAP ScrollTrigger | AVAILABLE (free) | `import { ScrollTrigger } from "gsap/ScrollTrigger"` | 3.15.0 | require OK |
| impeccable (pbakaus) | AVAILABLE (npm) | `npx impeccable install` → `/impeccable init` in agent | 4.8.0 (`bin: impeccable → cli/bin/cli.js`) | README: `polish`, `bolder`, `critique`, `audit`, `document` commands; writes PRODUCT.md/DESIGN.md |
| taste-skill (leonxlnx) | AVAILABLE | `npx skills add leonxlnx/taste-skill` or Claude plugin route: `/plugin marketplace add Leonxlnx/taste-skill` (repo ships `.claude-plugin/marketplace.json`) | plugin v2.1.5, skill name `design-taste-frontend` | SKILL.md at `skills/taste-skill/SKILL.md` (fetched); `references/scenes.md` **exists** (HTTP 200) at `skills/taste-skill/references/scenes.md` |
| awwwards-animations-skill (devmartinese) | AVAILABLE | `npx skills add devmartinese/awwwards-animations-skill` | SKILL.md `name: awwwards-animations` | SKILL.md fetched (frontmatter verified); `references/` has gsap-react.md, lenis-react.md, advanced-patterns.md, … |
| Remotion | AVAILABLE (registry, not installed) | `npm view remotion` / `npm create video` | 4.0.540 | `npm view remotion version` → 4.0.540 |
| HyperFrames | AVAILABLE (registry, not installed) | `npm view hyperframes` | 0.9.9 | description: "Make videos with code and AI agents: write HTML, render MP4. Open source." |
| ffmpeg | AVAILABLE | `ffmpeg -version` | 7.1.5-0+deb13u1 | system binary; Playwright also bundles `ffmpeg-1011` in `~/.cache/ms-playwright/` |
| odiff | AVAILABLE (⚠ npm name) | `npx -y odiff-bin <base> <comp> [diff] -t 0.1` | odiff-bin 4.5.0 | usage banner printed; **note: npm package `odiff` (1.5.0) has no bin — must use `odiff-bin`** |
| PIL (Pillow) | AVAILABLE | `python3 -c "import PIL"` | 11.3.0 | import OK |

Nothing is BLOCKED anymore: WebKit was un-blocked this round (see §2).

---

## 2. WebKit user-space fix — full record

### 2.1 Starting state
Playwright reported 9 missing host libraries for `webkit-2287`:
`libgtk-4.so.1, libgraphene-1.0.so.0, libgstgl-1.0.so.0, libgstcodecparsers-1.0.so.0, libmanette-0.2.so.0, libenchant-2.so.2, libsecret-1.so.0, libwoff2dec.so.1.0.2, libGLESv2.so.2`

### 2.2 Two key discoveries
1. **Headless WebKit here is WPE, not GTK.** `webkit-2287/pw_run.sh --headless` runs `minibrowser-wpe/bin/MiniBrowser`. The GTK-only libs (libgtk-4, libgraphene, libmanette, libenchant-2, libsecret) are **never needed** — the real runtime missing set was much smaller.
2. **The bundle wrapper clobbers `LD_LIBRARY_PATH`.** `minibrowser-wpe/MiniBrowser` is a shell script that does `export LD_LIBRARY_PATH="${MYDIR}/lib:${MYDIR}/sys/lib"` — any inherited LD_LIBRARY_PATH is discarded. Therefore user-space libs must be **symlinked into `minibrowser-wpe/sys/lib/`**, not just exported. (`~/.cache/ms-playwright/webkit-2287/minibrowser-wpe/{lib,sys/lib}` are both writable as user `z`.)

### 2.3 Libs actually downloaded & extracted to `/home/z/pw-libs` (via `apt-get download` + `dpkg -x`, no root)

| Soname | Debian package | Why |
|---|---|---|
| libwoff2dec.so.1.0.2 (+woff2common/enc) | `libwoff1` | WOFF2 font decoding |
| libgstgl-1.0.so.0 | `libgstreamer-gl1.0-0` | WebKit media |
| libgstcodecparsers-1.0.so.0 | `libgstreamer-plugins-bad1.0-0` | WebKit media |
| libgudev-1.0.so.0 | `libgudev-1.0-0` | gstreamer dep chain |
| libEGL.so.1 | `libegl1` (glvnd) | EGL dispatch |
| libEGL_mesa.so.0 (+ICD json) | `libegl-mesa0` | software EGL (llvmpipe) — fixed `Could not create WPE EGL display: Aborting...` |
| libGLESv2.so.2 | `libgles2` | WebGL/GLES — fixed `Couldn't open libGLESv2.so.2` |

54 `.so` files from `/home/z/pw-libs/usr/lib/x86_64-linux-gnu` (+`lib/`) are symlinked into `/home/z/.cache/ms-playwright/webkit-2287/minibrowser-wpe/sys/lib/`.

### 2.4 Required launch environment
These must be present in the **node process env before `require('playwright-core')`** (Playwright's host-requirements pre-flight reads process env, not `launch({ env })`):

```bash
export LIBGL_ALWAYS_SOFTWARE=1
export __EGL_VENDOR_LIBRARY_FILENAMES=/home/z/pw-libs/usr/share/glvnd/egl_vendor.d/50_mesa.json
export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1
```
(`LIBGL_ALWAYS_SOFTWARE` needed because the sandbox has no `/dev/dri`; vendor-json needed because system `/usr/share/glvnd/egl_vendor.d/` is empty/non-writable.)

### 2.5 Final launch test
```
WEBKIT_LAUNCH_OK version=26.4 text=probe     # newPage + setContent + textContent round-trip
```
Regression: Chromium 148 still launches. Video recording on both engines verified (§4).

### 2.6 Wrapper script (deliverable)
**`/home/z/madarek/scripts/r333/webkit-userland.sh`** — subcommands:
- `fix` — idempotent: fetches Debian Contents index (one-time, `/tmp/r333-debs/`), loops: probe launch → map missing sonames (known table + Contents zgrep) → `apt-get download` → `dpkg -x` into `/home/z/pw-libs` → symlink into bundle `sys/lib` (max 8 iterations)
- `test` — launch probe (exit 0 = WebKit renders)
- `env` — prints the three required exports

⚠ **Maintenance note**: symlinks live inside `~/.cache/ms-playwright/webkit-2287/`. If WebKit is reinstalled (`npx playwright install webkit` wipes cache), re-run `webkit-userland.sh fix`. `/home/z/pw-libs` and `/tmp/r333-debs` survive cache wipes.

---

## 3. GSAP free-plugin matrix (verified from installed public package)

Public `gsap@3.15.0` — formerly "Club GreenSock" plugins are now bundled free (since GSAP 3.13). All present in `node_modules/gsap/dist/`:

| Plugin | dist file | Import path (✅ = require-verified) |
|---|---|---|
| SplitText | `SplitText.js` | ✅ `gsap/SplitText` |
| Flip | `Flip.js` | ✅ `gsap/Flip` |
| DrawSVGPlugin | `DrawSVGPlugin.js` | ✅ `gsap/DrawSVGPlugin` |
| MorphSVGPlugin | `MorphSVGPlugin.js` | ✅ `gsap/MorphSVGPlugin` |
| CustomEase | `CustomEase.js` | ✅ `gsap/CustomEase` |
| ScrollTrigger | `ScrollTrigger.js` | ✅ `gsap/ScrollTrigger` |

Caveats:
- Use **per-plugin subpath imports**. `gsap/all.js` named exports surfaced SplitText/Flip/CustomEase/ScrollTrigger but *not* DrawSVGPlugin/MorphSVGPlugin in a node require — subpaths are the reliable (and canonical) route.
- Package `exports` map allows `./dist/*` and `./*` subpaths; Vite/CJS interop verified via require.
- **GSAP is not yet in `frontend/package.json`** (deps currently include `lenis@1.1.5`, no gsap). Status = NEW: lead should `npm i gsap@^3.15.0 -w frontend` when R333 work starts. Verification was done in scratch (`/tmp/gsap-check`), repo untouched.

---

## 4. Recommended R333 media pipeline

```
  [1] RECORD                [2] POSTER                [3] REDUCE / COMPARE
  Playwright recordVideo →  ffmpeg single frame →     ffmpeg scale/crf · odiff-bin · PIL
  .webm (proven, both       .png/.jpg (proven tool,   (odiff-bin proven CLI;
  engines)                  execution pattern trivial) PIL proven)
```

| Step | Tool | Status |
|---|---|---|
| Record UI animation video | Playwright `recordVideo` (context option) → `.webm` | **PROVEN** — webkit + chromium each recorded a 640×360 webm; ffprobe read back 1.12s duration |
| Extract poster frame | `ffmpeg -ss <t> -i in.webm -frames:v 1 poster.png` | **PROVEN tool, pattern assumed** (ffmpeg 7.1.5 present; the exact poster command not executed this round) |
| Reduce motion / GIF→video, compress | `ffmpeg -vf scale=...,crf` | PROVEN tool, pattern assumed |
| Visual regression diff | `npx -y odiff-bin a.png b.png diff.png -t 0.1 --diff-overlay` | **PROVEN** (CLI usage banner executed) |
| Image massaging | PIL 11.3.0 | **PROVEN** (import) |
| HTML→MP4 programmatic rendering | HyperFrames 0.9.9 ("write HTML, render MP4") | ASSUMED / registry-only — pilot before relying on it |
| Heavy video composition | Remotion 4.0.540 | ASSUMED / registry-only — `npx create-video` deliberately not run (heavy) |

WebKit env requirement applies to any recorded R333 E2E session: export the three vars from §2.4 before running Playwright.

---

## 5. Handoff notes for lead
1. WebKit is unblocked — no root, no `install-deps`; recipe codified in `scripts/r333/webkit-userland.sh`.
2. Add `gsap` to frontend when starting R333 animation work; use subpath imports for DrawSVG/MorphSVG.
3. Three installable design skills verified real (impeccable 4.8.0, taste-skill 2.1.5, awwwards-animations); none installed here — installer runs left to lead.
4. Only file created in repo: `scripts/r333/webkit-userland.sh` + this doc. `/home/z/pw-libs`, `/tmp/r333-debs`, `/tmp/gsap-check`, `/tmp/vidtest` are sandbox artifacts outside the repo.
