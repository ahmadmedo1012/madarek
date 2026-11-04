# R335 Arsenal — verified tooling

Verification method per tool: npm registry check (`npm view`), GitHub API existence/archived check,
and a smoke test where it matters (listed). Regenerated after the 2026-11-04 sandbox reset from the
agent's verified session results (A-Arsenal, agent-f5df06df).

## VERIFIED — install for R335

| tool | verified how | version | install | R335 use |
|---|---|---|---|---|
| @ast-grep/cli | smoke: pattern + YAML rule on JSX fixture | 0.51.1 | `npm i -D @ast-grep/cli` | structural TSX/CSS rewrites (Phase 2/3) |
| css-tree | smoke | 3.2.1 | `npm i -D css-tree` | CSS AST codemods (Phase 4) |
| postcss | smoke | 8.5.32 | already in repo toolchain | codemod driver |
| lightningcss | smoke: `transform({minify})` merges duplicate rules (3×`.card`→1, 300→158 chars) | 1.33.0 | `npm i -D lightningcss` | Phase 4 dedupe/merge; ⚠️ no npm bin, `bundle()` won't merge across @import |
| stylelint + stylelint-declaration-strict-value | smoke | 17.x (pin — v18 breaks plugin peer range) | `npm i -D stylelint@17 stylelint-declaration-strict-value` | @layer gate, no raw colours/durations/!important |
| webcrack | smoke: unminified a fixture bundle | 2.16.0 | `npx webcrack` | read Heron's minified bundles for parameters |
| knip | smoke (unreliable on micro-fixture; re-verify on real repo) | 6.44.1 | `npx knip` | unused dep/dead export sweep (used for mobile P0-7) |
| @axe-core/playwright | registry | latest | `npm i -D @axe-core/playwright` | a11y assertions in conformance suite |
| @lhci/cli | registry (real pkg; `lighthouse-ci` is a stale 2022 stub) | 0.16.0 | `npx @lhci/cli` | perf budget checks |
| impeccable (skill) | smoke: installed + `detect` found 3 real anti-patterns in fixture; all 16 subcommands confirmed | 4.8.0 | `npx skills add pbakaus/impeccable -y --agent claude-code` | craft critique passes (final panel prep) |
| hallmark (nutlope/hallmark) | GitHub (47k★) | — | skills add | anti-slop asset/copy spec |
| taste-skill (leonxlnx) | GitHub (109k★) | — | skills add | taste reference (scenes.md) |
| ui-ux-pro-max-skill | GitHub (144k★) | — | skills add | UI review heuristics |
| emilkowalski/skills (`review-animations`) | GitHub (53k★) | — | skills add | motion review |
| greensock/gsap-skills | GitHub (17.8k★) | — | skills add | animation craft reference |

## EXISTS but skip (reason)

| tool | reason |
|---|---|
| purgecss | CSS coverage via Chrome DevTools MCP + own codemod is strictly better for @layer trees |
| ts-morph / jscodeshift | ast-grep covers the planned rewrites with less setup |
| vercel-labs/react-native-skills (standalone) | doesn't exist standalone → `vercel-labs/agent-skills` |
| Expo MCP | verified name is `expo-mcp`; not needed for Phase 0/5 (CLI suffices) |

## DOES NOT EXIST / name corrections

| brief name | reality |
|---|---|
| `ast-grep` (npm) | 2022 stub → real: **`@ast-grep/cli`** |
| `lighthouse-ci` | stale 2022 → real: **`@lhci/cli`** |
| `@chrome-devtools/mcp` | → **`chrome-devtools-mcp`** |
| `@firecrawl/mcp` | → **`firecrawl-mcp`** |
| `anti-ui-slop`, `premium-frontend-ui`, `scroll-experience` | not found → alternatives mapped (hallmark, taste-skill scenes.md) |
| `npx skills add` (interactive) | hangs interactively; must use `-y --agent claude-code` |

## Tools actually used (honest)

| tool | task | outcome |
|---|---|---|
| npm view / GitHub API | existence checks | table above |
| impeccable smoke fixture | anti-pattern detection check | works as claimed |
| lightningcss smoke | duplicate-rule merge check | works (300→158 chars, 3×.card→1) |
| webcrack smoke | minified fixture parse | works |
| ast-grep smoke | JSX pattern + YAML rule | works |
| knip smoke | micro-fixture | flagged its own entry — re-verify on real repo before trusting |
