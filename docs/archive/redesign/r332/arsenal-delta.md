# R332 A-Scout — arsenal delta

Research-only round. All versions below are live registry reads (`registry.npmjs.org/<pkg>/latest`) this session; all smoke tests ran in `/tmp/scout-*` sandboxes. No git commands run; no repo files touched except this report.

**Headline:** MCP tools + lighthouse + impeccable are all current. The real gaps are **lenis 1.1.5 → 1.3.27** (our dep is 2+ years old), **gsap 3.12/3.13 → 3.15**, **PurgeCSS 8.0.0** (brand-new major, ideal for the 52k-line purge), and the discovery that **Arabic-typography QA tooling doesn't exist as a package** — the practical adopt there is `stylelint-use-logical` as an RTL-safe property gate.

---

## (a) Scroll-driven animation fidelity

| tool | latest | ours | verdict | reason | evidence (command → output) |
|---|---|---|---|---|---|
| gsap | 3.15.0 (pub 2026-04-13) | 3.12/3.13 skills | **ADOPT** | 2 majors of ScrollTrigger fixes; verified loadable | `node -e "require('gsap');require('gsap/ScrollTrigger')"` → `gsap 3.15.0 \| ScrollTrigger loaded: true` |
| @gsap/react | 2.1.2 | not installed | **ADOPT** | drop-in `useGSAP()` for the React home page choreography | `node -e "require('@gsap/react')"` → `@gsap/react useGSAP: function` |
| lenis | 1.3.27 (pub 2026-10-15) | 1.1.5 (`frontend/package.json`, pub 2024-06-28) | **ADOPT** | our pinned version is 2y4m old; smooth-scroll is core to the twin goal | `jq '.dependencies.lenis' frontend/package.json` → `1.1.5`; registry time: `2024-06-28 → 2026-10-15` |
| scrollvars | 1.20.0 | — | WATCH | tiny CSS-var scroll engine, zero-dep; not needed while GSAP+Lenis live | `npm search scroll driven animation` → `scrollvars@1.20.0 — Tiny scroll-driven animation engine: one rAF loop in, CSS variables out` |
| frameup (GitHub zjebinsky/frameup) | repo, 3★ | — | WATCH | scroll-through **video** capture for motion-diff, but 3 stars, no npm package | GitHub search `scroll capture video playwright` → `zjebinsky/frameup ★3 pushed:2026-02-23` |

## (b) Pixel/visual regression vs LIVE EXTERNAL site

| tool | latest | ours | verdict | reason | evidence (command → output) |
|---|---|---|---|---|---|
| @argos-ci/cli | 6.11.0 (pub 2026-10-21) | — | **ADOPT** (needs ARGOS_TOKEN) | freshest live-site visual-regression pipeline: upload/baseline/review/deploy commands; pairs with existing Playwright captures | `npx -y @argos-ci/cli --version` → `6.11.0`; `--help` lists `upload, baseline, review, deploy, analytics` |
| odiff-bin | 4.5.0 | R331 binary (version not on PATH) | **KEEP** | local diff engine works; one CLI quirk: `--diff-color red` rejected, hex required | `odiff base.png live.png diff.png` → `Found 2439 different pixels (10.16%)` + 1,318-byte `diff.png`; `--diff-color red` → `Error: Invalid hex color format` |
| pixelmatch | 8.0.0 | R331 binary | WATCH | 8.x is a new major; odiff already covers diffing — don't split the diff engine | registry: `pixelmatch => 8.0.0` |
| backstopjs | 6.3.25 (pub 2024-09-07) | — | SKIP | stale vs Argos; heavy install (disk-tight) | registry time read |
| lost-pixel | 3.22.0 (pub 2024-11-14) | — | SKIP/WATCH | 1y stale, runner-style config, no edge over Argos | registry time read |

Capture path for heronaiapp.com stays: Playwright MCP 0.0.84 (current) → PNGs → odiff 4.5.0 locally, or Argos if a token is provisioned.

## (c) CSS dead-code purging + layering

| tool | latest | ours | verdict | reason | evidence (command → output) |
|---|---|---|---|---|---|
| purgecss | 8.0.0 (pub 2026-01-24) | — | **ADOPT** | brand-new major; smoke test on fixture: removed dead selectors, **preserved `@layer` block intact** — safe for layer-aware purge of the 52,121 lines | `purgecss --css styles.css --content page.html` → output kept `@layer base { :root … }` + used classes; dropped `.dead-old-banner` and `.animate-shimmer` |
| postcss-discard-unused | 9.0.7 | — | WATCH | only discards unused keyframes/counter-styles/fonts; narrower than PurgeCSS | npm search `unused css remove` |
| GitHub unused-css tools | robwizzie/unused-css-detector ★1 etc. | — | SKIP | search returned only 0–1★ hobby repos; PurgeCSS + browser coverage remains best-of | GitHub search `unused css detector` → top hits ★0–1 |

PurgeCSS does not do coverage-driven runtime purging; pair it with a one-shot Chrome coverage pass (chrome-devtools-mcp 1.12.0, current) for the audit, then rename r305-*/r314-* files (owner task).

## (d) Arabic typography QA (RTL, kashida, diacritics, contrast)

| tool | latest | ours | verdict | reason | evidence (command → output) |
|---|---|---|---|---|---|
| stylelint-use-logical | 2.1.3 | — | **ADOPT** | only working RTL-safe gate found: bans physical `left/right` properties/values that break mirroring; runs on stylelint 17 | `stylelint fix.css` → `✖ Unexpected "margin-left" property. Use "margin-inline-start"` ×3 (`padding-right`, `text-align: left`) |
| stylelint | 17.16.0 | — | **ADOPT** (engine) | current engine for the above rule; add to CI alongside purge | `./node_modules/.bin/stylelint --version` → `17.16.0` |
| stylis-plugin-rtl / rtl-css-js | 2.1.1 / 1.16.1 | — | SKIP | build-time CSS flipping, not QA; wrong layer for this project | npm search `rtl lint css` |
| npm "arabic typography" | font packages only (@fontsource/noto-sans-arabic 5.3.0, ibm-plex-sans-arabic 5.3.0) | — | FINDING | **no kashida/diacritics/Arabic-contrast QA tool exists on npm** — only font bundles | search returned 8 font/utility packages, zero QA tools |
| GitHub "arabic typography check" / "rtl css testing" | 0★ repos; omaritooo/miraya ("finds bugs that only exist in the right-to-left version of a web app") ★0 | — | WATCH | category is empty at quality bar; miraya is the only on-topic repo (0★, unmaintained risk) | GitHub search results, both queries |

Practical consequence: kashida/diacritics QA stays manual (Playwright MCP screenshots + human review); the automatable part is the logical-properties gate above.

---

## Currency table — known arsenal

| tool | latest | ours | verdict |
|---|---|---|---|
| gsap | 3.15.0 | 3.12/3.13 (skills) | **UPGRADE** |
| lenis | 1.3.27 | 1.1.5 (frontend dep) | **UPGRADE** |
| playwright | 1.64.1 | Python Playwright, chromium-1200 (R331) | UPGRADE-WHEN-CONVENIENT |
| @playwright/mcp | 0.0.84 | 0.0.84 | CURRENT |
| chrome-devtools-mcp | 1.12.0 | 1.12.0 | CURRENT |
| firecrawl-mcp | 3.36.0 | 3.36.0 | CURRENT |
| odiff-bin | 4.5.0 | R331 binary | CURRENT (re-verify binary version) |
| pixelmatch | 8.0.0 | R331 binary | WATCH |
| lighthouse | 13.6.0 | 13.6.0 | CURRENT |
| stylelint | 17.16.0 | not in project | **ADOPT** |
| impeccable | 4.8.0 | 4.8.0 | CURRENT |
| skills CLI (`npx skills`) | 1.7.5 | npx-fetched | CURRENT |
| skills.sh | — | `curl -sL https://skills.sh` → `HTTP 200, 924617 bytes` | UP (was assumed flaky — it isn't) |

---

## Adopt now (lead's list, ≤5)

1. **PurgeCSS 8 audit of the 52k lines** (biggest lever this round):
   ```bash
   npm i -D purgecss@8.0.0
   npx purgecss --css frontend/dist/assets/*.css \
     --content frontend/index.html 'frontend/src/**/*.{js,jsx,ts,tsx}' \
     --output frontend/dist/assets/purged/   # diff before deleting anything
   ```
2. **lenis bump** (2-year-old dep, smooth-scroll is core to the twin goal):
   `cd frontend && npm i lenis@1.3.27`
3. **gsap + React binding** for hero choreography:
   `cd frontend && npm i gsap@3.15.0 @gsap/react@2.1.2`
4. **RTL-safe CSS gate** (stylelint 17 + logical-properties plugin):
   `npm i -D stylelint@17.16.0 stylelint-use-logical@2.1.3`
   `.stylelintrc.json`: `{"plugins":["stylelint-use-logical"],"rules":{"csstools/use-logical":[true]}}` — note rule name is `csstools/use-logical`, not what the docs imply.
5. **Argos for live-site visual regression vs heronaiapp.com** (needs a free ARGOS_TOKEN; interim path = Playwright MCP capture + odiff 4.5.0, use **hex** diff colors):
   `npm i -g @argos-ci/cli@6.11.0 && argos upload shots/ --token $ARGOS_TOKEN`

## Could not verify

- **Python Playwright / chromium-1200 mapping to 1.x** — `import playwright` fails under this shell's default `python3` (R331 install lives elsewhere/venv); latest is 1.64.1 either way.
- **odiff/pixelmatch R331 binary versions** — not on PATH in this shell (`odiff --version` silent); smoke test used a fresh `odiff-bin@4.5.0` instead.
- **Argos upload against heronaiapp.com** — requires ARGOS_TOKEN, not provided this round; only CLI surface verified (`--version`/`--help`).
- **Kashida/diacritics rendering QA** — no tool exists (see category d); manual review remains the method.

*Evidence artifacts kept in `/tmp/scout-csspurge`, `/tmp/scout-visual`, `/tmp/scout-rtl`, `/tmp/scout-scroll` (~32 MB total; safe to delete).*
