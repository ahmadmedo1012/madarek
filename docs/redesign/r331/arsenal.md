# R331 Arsenal — Phase 0 tool inventory (A-Scout)

> Task ID 3-a · branch `wt/scout` · verified live in this sandbox on 2026-11-02.
> Every GREEN row below carries a **real command + real output excerpt** run by A-Scout.
> Larger logs live in `/home/z/heron-lab/` (outside git); paths referenced inline.

## Verdict at a glance

| Status | Tools |
|---|---|
| **GREEN** (installed + real smoke output) | skills CLI, impeccable, ui-ux-pro-max (+6 sub-skills), anti-ui-slop, frontend-design, web-design-guidelines, design-md, 8× gsap skills, scroll-craft, review-animations, 28× expo skills, vercel-react-native-skills, @playwright/mcp, chrome-devtools-mcp, firecrawl-mcp, expo-mcp, odiff, pixelmatch+pngjs, knip, lighthouse |
| **YELLOW** (works with constraints) | chrome-devtools-mcp (no system Chrome → needs `--executablePath`), firecrawl-mcp (keyless tier: scrape/search only), expo-mcp (needs a live Expo dev server for tool calls), knip (version proven; real run needs `npm install` in the target workspace first) |
| **RED** (blocked, honest reasons) | Local Playwright WebKit launch (missing `libgtk-4.so.1`, `libGLESv2.so.2`; no root — CI covers it), Android emulator (`/dev/kvm` absent — verified), system Chrome binary (absent), stylelint (not a dependency anywhere in the repo — nothing to run) |

---

## 1. Design/UX skills

All skills installed **globally** via the `skills` CLI (v1.7.4) into `~/.claude/skills/`
(copy mode, agent `claude-code`), so every later agent in any worktree reads the same files.
A second copy of impeccable also landed in `~/.agents/skills/impeccable`.

**Install pattern that works in this sandbox** (non-interactive, no TTY prompts — plain
`npx skills add <repo>` hangs waiting for input):

```bash
npx -y skills@1.7.4 add <owner>/<repo> -g -y -a claude-code [-s <skillName>] --json
```

Gotchas learned: agent id must be `claude-code` (not `claude`); `-s a,b` comma-lists do NOT
work (one skill per command); the flag `-s` takes the skill's *registered name* (from its
SKILL.md `name:`), not the repo directory name.

Skills are **markdown instruction sets**: a later agent "uses" one by reading
`~/.claude/skills/<name>/SKILL.md` (and the `reference/` files it points to) and following it.
There is no daemon and nothing to start.

| Tool (source repo) | Version | Installed where | Invoked how | Smoke-test evidence (real output) |
|---|---|---|---|---|
| `skills` CLI | 1.7.4 | npx (no install) | `npx -y skills@1.7.4 add … -g -y -a claude-code --json` | `npx -y skills@1.7.4 --version` → `1.7.4`; full inventory: `npx -y skills@1.7.4 ls -g` (48 skills listed; copy saved to `/home/z/heron-lab/skills-global-list.txt`) |
| **impeccable** (pbakaus/impeccable) | skill 4.8.0 / engine 0.1.18 | `~/.claude/skills/impeccable` (+ `~/.agents/skills/impeccable`) | `~/.claude/skills/impeccable/scripts/impeccable <verb>` — `detect`, `context`, `critique`, `audit`, `polish`, … | `impeccable detect frontend/src` → `366 files scanned with regex matching only (.css, .ts, .tsx).` … `line 720: [side-tab] border-inline-start: 3px solid → Thick colored border on one side of a card — the most recognizable tell of AI-generated UIs.` … `11 anti-patterns found.` + `21 advisory notes.` (full log: `/home/z/heron-lab/impeccable-detect-frontend.log`). Rule catalog: `impeccable detect --list-rules --quiet \| wc -l` → **62 rules**. Also ran `impeccable context --target frontend` → resolves repo root `/home/z/wt/scout`, inherits root `DESIGN.md` (42,827 chars, the Heron canon R306), flags `PRODUCT.md` missing. And on a crafted HTML file (`/home/z/heron-lab/slop-demo.html`): `[overused-font] Primary font: inter … 1 anti-pattern found. 2 advisory notes.` |
| **ui-ux-pro-max** (nextlevelbuilder/ui-ux-pro-max-skill) | latest (unversioned frontmatter) | `~/.claude/skills/ui-ux-pro-max` + sub-skills `banner-design`, `brand`, `design`, `design-system`, `slides`, `ui-styling` | `python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain {style,color,chart,landing,product,ux,typography,icons,gsap,react,web,google-fonts} [--stack <stack>]` | `search.py "education platform landing" --domain landing` → `**Domain:** landing \| **Query:** education platform landing / **Source:** landing.csv \| **Found:** 2 results` with real pattern rows (`App Store Style Landing`, `AI Personalization Landing`). Data: 79 styles, 192 palettes, 74 font pairings, 119 UX guidelines, 105 icons, 17 GSAP presets, 25 chart types, 22 stacks (local CSVs, no network). |
| **anti-ui-slop** (⚠ renamed: `uizze/anti-ui-slop` → **`uizze/uizze`**) | 1.3.1 | `~/.claude/skills/anti-ui-slop` | read `SKILL.md`, then the per-action playbook in `reference/` (`new-work.md`, `operate.md`, `polish.md`, `distill.md`, `audit.md`, `ios.md`, `craft.md`, `overdrive.md`) | Old repo `uizze/anti-ui-slop` → `Failed to clone repository / Authentication failed` (gone). GitHub API: uizze's active repo is `uizze/uizze` ("Design skills for coding agents", 78★) containing `skills/anti-ui-slop`. Installed from there; SKILL.md reads cleanly: "Stop coding agents from shipping generic UI… 800,000+ real web and iOS screens"; **free tier needs no account/token/dependency**; optional paid UIZZE MCP for visual references. |
| **frontend-design** (anthropics/skills) | latest (unversioned) | `~/.claude/skills/frontend-design` | read `SKILL.md` (instruction-only, ~10KB) | SKILL.md loads and reads: "Approach this as the design lead at a design studio known for giving every client a distinct visual identity…". Skill path confirmed: repo `anthropics/skills`, skill `frontend-design` (19 skills live in that repo). |
| **web-design-guidelines** (vercel-labs/agent-skills) | 1.0.0 | `~/.claude/skills/web-design-guidelines` | read `SKILL.md`; it is the agent-packaged version of vercel-labs/web-interface-guidelines (1,084★) | Installed with status `"installed"`, security gen=safe/socket=0 alerts/snyk=low; SKILL.md present and readable (Vercel web interface guidelines). |
| **design-md** (⚠ found at **google-labs-code/stitch-skills**, skill `design-md`) | latest (unversioned) | `~/.claude/skills/design-md` | read `SKILL.md` — synthesizes a semantic design system into `DESIGN.md` | skills.sh registry search for "design-md" → `google-labs-code/stitch-skills/design-md` (65,351 installs). Note: it is Stitch-project-oriented ("Analyze Stitch projects and synthesize a semantic design system into DESIGN.md"). Lower priority for us: the repo already has a root `DESIGN.md` (Heron canon) and impeccable's `document`/`extract` commands regenerate/extend it. The format spec itself lives at `google-labs-code/design.md` (28,680★). |
| **gsap skills** (greensock/gsap-skills) | latest (unversioned) | `~/.claude/skills/gsap-{core,frameworks,performance,plugins,react,scrolltrigger,timeline,utils}` | read each `SKILL.md`; 8 sub-skills installed | Install JSON: 8× `"status": "installed"` (gsap-core, gsap-frameworks, gsap-performance, gsap-plugins, gsap-react, gsap-scrolltrigger, gsap-timeline, gsap-utils). Registry confirms greensock/gsap-skills as canonical source (69k–92k installs per skill). |
| **scroll-craft** (nateherkai/scroll-craft) | latest (unversioned) | `~/.claude/skills/scroll-craft` | read `SKILL.md`; ships `engine/`, `scripts/`, `templates/`, `references/` | `"status": "installed"`; SKILL.md: "Build premium scroll-driven landing pages… plan the visitor journey, page grammar, emotional peak, and bespoke signature move." (4,370★ repo, 1,382 installs on skills.sh). |
| **review-animations** (emilkowalski/skills) | latest (unversioned) | `~/.claude/skills/review-animations` | read `SKILL.md` + `STANDARDS.md`; a review-only skill ("Default to flagging; approval is earned") | `"status": "installed"`; SKILL.md reads: "Reviews animation and motion code against a high craft bar derived from Emil Kowalski's design engineering philosophy." Repo also ships animate, animate-expo, animation-performance, find-animation-opportunities, improve-animations, remove-animations (not installed — available if wanted). |
| **expo skills** (expo/skills) | latest (unversioned) | `~/.claude/skills/expo-*` and `~/.claude/skills/eas-*` (28 skills) | read each `SKILL.md` — key ones for A-App: `expo-animation`, `expo-native-ui`, `expo-ui`, `expo-router`, `expo-web-to-native`, `expo-overview` | All six requested sub-skills verified present (`OK: expo-animation … OK: expo-overview`); plus expo-design-system, expo-dom, expo-project-structure, expo-upgrade, eas-* (eas-update, eas-workflows, …). expo-ui SKILL.md: "the **universal** layer requires **SDK 56+** and works in Expo Go". |
| **vercel-react-native-skills** (vercel-labs/agent-skills) ⚠ name | 1.0.0 | `~/.claude/skills/vercel-react-native-skills` | read `SKILL.md` (router) + `rules/*.md` (38 rules) | `-s react-native-skills` fails ("No matching skills found") — the registered name is **`vercel-react-native-skills`**. Installed OK; rules verified present: `rules/animation-gpu-properties.md`, `rules/navigation-native-navigators.md`, `rules/list-performance-*.md` (10 list rules), 38 rules total. |

## 2. MCP servers

All four servers were proven by sending a real JSON-RPC `initialize` (+ `tools/list` /
`tools/call`) over stdio — i.e. the exact conversation an MCP client has with them.
A shared local install lives in `/home/z/heron-lab/mcp-test` (`npm install`ed there so
later runs don't pay npx resolve cost); each also runs via `npx -y <pkg>` from anywhere.

| Server | Version | Installed where | Invoked how | Smoke-test evidence (real output) |
|---|---|---|---|---|
| **@playwright/mcp** | 0.0.84 (server reports `Playwright 1.65.0-alpha-2026-10-30`) | `/home/z/heron-lab/mcp-test/node_modules` | `npx -y @playwright/mcp --browser chromium` (stdio; or run from `/home/z/heron-lab/mcp-test`) | `initialize` → `{"result":{"protocolVersion":"2025-06-18","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"Playwright","version":"1.65.0-alpha-2026-10-30"}}}`; `tools/list` → **25 tools** (`browser_navigate`, `browser_resize`, `browser_take_screenshot`, `browser_evaluate`, `browser_fill_form`, …). Browsers: chromium-1200 (= Chrome for Testing 143.0.7499.4) already present in `~/.cache/ms-playwright` — **no PLAYWRIGHT_BROWSERS_PATH needed** for chromium. WebKit not launchable here (see §4). |
| **chrome-devtools-mcp** | 1.12.0 | `/home/z/heron-lab/mcp-test/node_modules` | `npx -y chrome-devtools-mcp --headless --isolated --executablePath /home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome` | `tools/list` → **32 tools** (`click`, `navigate_page`, `take_screenshot`, `take_snapshot`, `performance_start_trace`, `lighthouse_audit`, `emulate`, …). Real navigation: `tools/call new_page {url: file:///tmp/smoke.html}` → `## Pages / 2: CDT smoke (file:///tmp/smoke.html) [selected]` — Chromium really launched. **No system Chrome binary exists** (`which google-chrome chromium` → empty); the Playwright chromium works via `--executablePath` (note dir is `chrome-linux64/`, not `chrome-linux/`). |
| **firecrawl-mcp** | 3.36.0 | `/home/z/heron-lab/mcp-test/node_modules` | `npx -y firecrawl-mcp` — **keyless mode works**; `FIRECRAWL_API_KEY` env var unlocks more tools (not required for scrape/search) | Startup banner: `No FIRECRAWL_API_KEY or FIRECRAWL_API_URL set — running in keyless mode. firecrawl_scrape and firecrawl_search are free (rate-limited per IP)`. `initialize` → `serverInfo: firecrawl-fastmcp 3.36.0`. Real call: `firecrawl_scrape {url: https://example.com, formats: [markdown]}` → returned the example.com markdown body (multi-language IETF page incl. Arabic line). |
| **expo-mcp** (⚠ renamed: `expo-cli-mcp-server` → **`expo-mcp`**) | 0.2.4 | `/home/z/heron-lab/mcp-test/node_modules` | `npx -y expo-mcp --dev-server-url <url> --root <projectRoot>` — **requires a running Expo dev server** (e.g. after `npx expo start` in `apps/mobile`); `EXPO_TOKEN` (in `/home/z/.madarek-env`) is for EAS cloud ops, not needed to start the server | Old name gone from npm (`npm view expo-cli-mcp-server` → NOT FOUND). Current official package `expo-mcp` (repo `expo/expo-mcp`, maintained by Expo staff: brentvatne, evanbacon, ide…). With `--dev-server-url http://localhost:8081 --root /home/z/wt/scout/apps/mobile`: `initialize` → `serverInfo: {name: expo-mcp, version: 0.2.4}`; `tools/list` → **5 tools**: `open_devtools`, `collect_app_logs`, `automation_tap`, `automation_take_screenshot`, `automation_find_view`. Tool *calls* need the live dev server + a connected device/Expo Go (Android emulator blocked — §4). |

## 3. Visual diff (scratch dir: `/home/z/heron-lab/visual-diff`)

Both diff engines proven on the same pair of real PNGs — they agree exactly.

**Capture** (deterministic — the same URL captured twice produced byte-identical PNGs,
which is what a regression gate needs): `/home/z/heron-lab/visual-diff/capture.py`
(python playwright → `~/.venv/bin/python`).

| Tool | Version | Installed where | Invoked how | Smoke-test evidence (real output) |
|---|---|---|---|---|
| **odiff** (odiff-bin) | odiff-bin (npm latest) | `/home/z/heron-lab/visual-diff/node_modules/.bin/odiff` | `odiff <a.png> <b.png> <diff.png>` — exit 0 = identical, 22 = pixels differ | Identical pair → `Images are identical` (exit 0). Real pair (example.com @1280 vs @800 viewport) → `Found 433582 different pixels (42.34%)` (exit 22) + highlighted diff image written. Same-size pair with a painted 200×100 red box → `Found 20000 different pixels (1.95%)`. |
| **pixelmatch + pngjs** | pixelmatch 8.0.0, pngjs 7.0.0 | `/home/z/heron-lab/visual-diff/node_modules` | `node /home/z/heron-lab/visual-diff/diff.mjs <a.png> <b.png> [diff.png]` | Identical pair → `PIXELMATCH_DIFF 0 1024000 (0.00%)` (exit 0). Red-box pair → `PIXELMATCH_DIFF 20000 1024000 (1.95%)` (exit 1) — matches odiff exactly. ⚠ pixelmatch@8 is **ESM-only** (the script is `.mjs`); it exits 3 with a clear message on size mismatch (equal dimensions required). |

## 4. Supporting checks

| Tool | Version | Where | Invoked how | Smoke-test evidence (real output) |
|---|---|---|---|---|
| **knip** | 6.44.1 | npx (no install) | `npx -y knip` in a workspace (needs its `npm install` run first) | `npx -y knip --version` → `6.44.1` |
| **lighthouse** | 13.6.0 | npx (no install) | `CHROME_PATH=/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome npx -y lighthouse <url> --chrome-flags="--headless=new --no-sandbox" --output=json --output-path=<file>` | **Real audit run** on `https://example.com` → exit 0, JSON written; parsed: `performance score: 100`, `lighthouse version: 13.6.0` (`/home/z/heron-lab/lighthouse-example.json`). Also available as a chrome-devtools-mcp tool (`lighthouse_audit`). |
| **stylelint** | — | **not present in the repo** | `frontend/package.json` has zero stylelint entries (deps or devDeps) and no `.stylelintrc*`/`stylelint.config.*` exists anywhere in the worktree | Honest finding: nothing to run. If R331 wants CSS linting it must be added fresh (`npm i -D stylelint stylelint-config-standard` + config). The repo's own quality gates for CSS today are impeccable `detect` + the visual audit system. |
| Playwright (python) | chromium-1200 / Chrome for Testing 143.0.7499.4 | `~/.venv/bin/playwright`, browsers `~/.cache/ms-playwright` | `/home/z/.venv/bin/python <script>` | `capture.py` captured 1280×800 PNGs of example.com/example.org; repeated capture byte-identical (`cmp` → `IDENTICAL files`). |

## 5. Failed / blocked — honest reasons

1. **Local Playwright WebKit** — RED. The webkit-2227 download completes, but launch fails:
   `Host system is missing dependencies to run browsers. Missing libraries: libgtk-4.so.1, libGLESv2.so.2`
   (`/tmp/webkit-install-retry.log`; also the original background install at `/tmp/webkit-install.log`
   stayed 0 bytes). No root access to apt-install them. This matches `frontend/playwright.config.ts`
   which already documents it: the `webkit-iphone` project specs **skip cleanly here and GitHub CI
   runs them for real** (`npx playwright install webkit --with-deps`, job `ios-webkit`).
   Later agents: treat local WebKit as unavailable; rely on CI for WebKit/iPhone verification.
2. **Android emulator** — RED. `/dev/kvm` is absent (verified: `ls /dev/kvm` → `No such file or
   directory`); hardware-accelerated emulator cannot run. Device-level mobile verification must be
   EAS/CI or physical device; `expo-mcp` automation tools stay unusable locally for Android.
3. **System Chrome binary** — RED (worked around). No `google-chrome`/`chromium` on PATH. Everything
   Chrome-shaped (chrome-devtools-mcp, lighthouse) works by pointing at the Playwright chromium at
   `/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome` via `--executablePath` / `CHROME_PATH`.
4. **`uizze/anti-ui-slop`** — stale repo (clone fails). Successor installed from `uizze/uizze` (§1).
5. **`expo-cli-mcp-server`** — stale npm name (package gone). Successor `expo-mcp@0.2.4` installed (§2).
6. **stylelint** — not blocked by the sandbox; simply not present in the repo at all (§4).
7. **skills CLI interactive prompts** — plain `npx skills add <repo>` (without `-g -y -a <agent>`)
   hangs in this non-TTY shell until timeout. Always use the flag pattern in §1.

## 6. How later agents use this arsenal

### A-Web (frontend redesign)

```bash
# 1) Deterministic anti-pattern scan (no LLM, 62 rules) — run on the tree or a single file:
/home/z/.claude/skills/impeccable/scripts/impeccable detect frontend/src
#    Full check incl. tiny-text/low-contrast rules needs a rendered page:
cd frontend && npm run dev   # then:
/home/z/.claude/skills/impeccable/scripts/impeccable detect http://localhost:5173
#    Rule catalog / JSON output:
/home/z/.claude/skills/impeccable/scripts/impeccable detect --list-rules [--json]
#    Session context (loads root DESIGN.md canon; ask it for PRODUCT.md if missing):
cd /home/z/wt/<your-worktree> && /home/z/.claude/skills/impeccable/scripts/impeccable context --target frontend

# 2) The critique/polish flow is in the SKILL.md command table — read these before editing:
cat ~/.claude/skills/impeccable/SKILL.md                 # command table + modes (Persuade/Operate/Read/Experience)
cat ~/.claude/skills/impeccable/reference/critique.md    # UX review with heuristic scoring
cat ~/.claude/skills/impeccable/reference/polish.md      # final pass before shipping
cat ~/.claude/skills/impeccable/reference/craft-floor.md # read immediately before ANY UI edit

# 3) Supporting playbooks:
cat ~/.claude/skills/anti-ui-slop/SKILL.md               # + reference/{new-work,operate,polish,distill,audit}.md
cat ~/.claude/skills/frontend-design/SKILL.md            # distinctive-design persona (Anthropic)
cat ~/.claude/skills/web-design-guidelines/SKILL.md      # Vercel interface guidelines
python3 ~/.claude/skills/ui-ux-pro-max/scripts/search.py "arabic education dashboard" --domain ux --max-results 5

# 4) Motion work:
cat ~/.claude/skills/gsap-scrolltrigger/SKILL.md   (also gsap-core/-timeline/-react/-plugins)
cat ~/.claude/skills/review-animations/SKILL.md    (+ STANDARDS.md — run on any animation diff)
cat ~/.claude/skills/scroll-craft/SKILL.md         (scroll-driven landing surfaces)
```

**Playwright capture** for before/after evidence — use the repo's own audit system first
(it already exists and is wired to Vite):

```bash
cd frontend && npm install        # fresh worktrees need this first
npm run test:audit                # surface-inventory (skips unless AUDIT_BASELINE=1)
AUDIT_BASELINE=1 AUDIT_API_MOCK=1 npm run audit:capture:mock   # DB-less capture
npm run test:audit:drift          # drift vs tests/audit/surface-baseline.json
npm run audit:baseline            # promote a new baseline
```

For ad-hoc screenshots outside the repo system, MCP path (from `/home/z/heron-lab/mcp-test`,
or `npx -y @playwright/mcp` anywhere):

```bash
npx -y @playwright/mcp --browser chromium    # stdio MCP: browser_navigate → browser_take_screenshot
```

Chrome DevTools MCP (needs the executablePath workaround — no system Chrome):

```bash
npx -y chrome-devtools-mcp --headless --isolated \
  --executablePath /home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome
# tools: navigate_page, take_screenshot, take_snapshot, performance_start/stop_trace,
#        list_console_messages, list_network_requests, emulate, lighthouse_audit
```

Lighthouse one-shot:

```bash
CHROME_PATH=/home/z/.cache/ms-playwright/chromium-1200/chrome-linux64/chrome \
  npx -y lighthouse http://localhost:5173 --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path=/home/z/heron-lab/<name>.json
```

### A-App (Expo / mobile)

```bash
# Read these SKILL.md files before touching apps/mobile:
cat ~/.claude/skills/expo-animation/SKILL.md      # reanimated/worklets (SDK-matched installs)
cat ~/.claude/skills/expo-ui/SKILL.md             # universal layer, SDK 56+, works in Expo Go
cat ~/.claude/skills/expo-native-ui/SKILL.md
cat ~/.claude/skills/expo-router/SKILL.md
cat ~/.claude/skills/expo-web-to-native/SKILL.md
cat ~/.claude/skills/expo-overview/SKILL.md
cat ~/.claude/skills/vercel-react-native-skills/SKILL.md    # router → rules/*.md (38 rules):
cat ~/.claude/skills/vercel-react-native-skills/rules/animation-gpu-properties.md
cat ~/.claude/skills/vercel-react-native-skills/rules/navigation-native-navigators.md
cat ~/.claude/skills/vercel-react-native-skills/rules/list-performance-callbacks.md
# Also strong: emilkowalski's animate-expo exists in his repo (not installed) if needed.

# expo-mcp (after starting the dev server, e.g. `npx expo start` in apps/mobile):
. /home/z/.madarek-env    # EXPO_TOKEN for EAS operations — never commit it
npx -y expo-mcp --dev-server-url http://localhost:8081 --root /home/z/wt/<your-worktree>/apps/mobile
# tools: open_devtools, collect_app_logs, automation_tap, automation_take_screenshot, automation_find_view
# NOTE: automation tools need a connected device/Expo Go; Android emulator is blocked (no /dev/kvm).
```

### QA (visual diff)

```bash
cd /home/z/heron-lab/visual-diff

# capture (deterministic; same URL → byte-identical PNG):
/home/z/.venv/bin/python capture.py http://localhost:5173/<route> shot-<name>.png

# diff — odiff (fast native binary):
./node_modules/.bin/odiff baseline.png candidate.png diff.png
#   → "Images are identical" (exit 0)  or  "Found N different pixels (P%)" (exit 22)

# diff — pixelmatch (pure node, cross-check):
node diff.mjs baseline.png candidate.png diff.png
#   → "PIXELMATCH_DIFF <n> <total> (<pct>%)"  (exit 1 when n>0; exit 3 on size mismatch)

# firecrawl-mcp for content/reference crawling (keyless):
npx -y firecrawl-mcp    # tools: firecrawl_scrape, firecrawl_search (free, rate-limited per IP)
```

Primary regression system remains the repo's own `frontend/tests/audit` (see A-Web block);
the heron-lab pair (odiff/pixelmatch) is the ad-hoc / cross-check layer.

## 7. Larger artifacts (outside git, in `/home/z/heron-lab/`)

- `impeccable-detect-frontend.log` — full 366-file detect output (11 anti-patterns + 21 advisories)
- `skills-global-list.txt` — `npx skills ls -g` full inventory
- `visual-diff/` — capture.py, diff.mjs, shot-*.png, diff-*.png evidence pairs
- `mcp-test/` — local npm install of @playwright/mcp, chrome-devtools-mcp, firecrawl-mcp, expo-mcp
- `lighthouse-example.json` — real Lighthouse 13.6.0 run (perf 100, example.com)
- `slop-demo.html`, `skill_versions.py` — smoke fixtures
- `/tmp/webkit-install-retry.log` — WebKit dependency failure evidence
