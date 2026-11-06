# Arsenal — tools used per task (append one line per tool)

- [T-15] npm install — root + frontend deps (playwright 1.60.0 available in frontend)
- [T-15] npx playwright install webkit — fetch webkit build into ~/.cache/ms-playwright
- [T-15] apt-get download — user-space fetch of 9 missing-lib .debs (no root needed)
- [T-15] dpkg -x — extract debs into /tmp/webkit-prefix
- [T-15] ldd — audit MiniBrowser/WebKit*Process for unresolved libs (3 rounds: 10 → 4 → 0)
- [T-15] readelf -d / strings / nm -D — RPATH audit + locate error strings & GLVND env-var names
- [T-15] apt-cache policy/search — map missing .so files to trixie package names
- [T-15] gcc + dlopen probe (eglprobe.c) — prove EGL surfaceless works once GLVND finds Mesa vendor
- [T-15] bash scripts/conformance/webkit-libs.sh — idempotent user-space recipe (download+extract+patch+exports)
- [T-15] npx vite --port 5315 — dev server for the webkit instrument cells
- [T-15] node scripts/conformance/run.mjs --engine webkit — footer cells under WebKit (96%/85%)
- [T-15] curl — 200-check the vite dev server before webkit cells
- [T-15] rg — verify prior patch state + locate --bps/--engine flags in run.mjs
- [T-15] node (failure-set diff) — prove webkit/chromium cells differ only by sub-pixel drift
