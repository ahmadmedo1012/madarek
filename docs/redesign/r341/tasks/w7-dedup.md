# W7-DEDUP — jscpd ratchet: 316 → ≤286 blocks (the 4 guest sheets + patterns.css internal)

Worktree `/home/z/wt/dedup`, branch `wip/dedup`. No dev server needed until final verification (then port 5318).

## Context (verified by the queen)
CI deadcode gate REGRESSED: `jscpd.duplicateBlocks 286 → 316`. The +30 came from the R341 D-wave: the 4 guest page sheets (`styles/about.css` ab-*, `styles/app.css` ap-*, `styles/help.css` hp-*, `styles/legal.css` lg-*) are prefix-copies of the same guest-sheet chrome grammar, and `styles/patterns.css` §9/§10/§11 carry 8 internal near-copies (the "consolidated VERBATIM" exam/quality/campus families).

Verified example (about.css:35-55 ≡ app.css:37-57 modulo prefix, comments differ only):
`.XX-header { position: sticky; inset-block-start: 0; z-index: var(--z-dropdown); background: color-mix(in srgb, var(--bg) 82%, transparent); backdrop-filter: blur(10px); border-block-end: 1px solid var(--grid-line); } .XX-header-inner { display: flex; … }`

## Mission
1. Run: `cd frontend && jscpd src --config ../scripts/deadcode/jscpd.json --reporters json --output /tmp/jscpd-w7 --silent` then analyze `/tmp/jscpd-w7/jscpd-report.json` (duplicates[].firstFile/secondFile .name/.start/.end/.lines).
2. For EVERY duplicated family across about/app/help/legal: hoist ONE grouped rule into `styles/patterns.css` (new section "§G — the guest-sheet chrome grammar (shared)") with ALL FOUR selectors (`.ab-header, .ap-header, .hp-header, .lg-header { … }` — byte-identical declarations, comments unified into one), and DELETE the per-sheet copies. Include their @media blocks (group the same-condition media rules the same way). Blocks whose declarations genuinely VARY between sheets stay per-sheet — list them in the report.
3. Same treatment for patterns.css INTERNAL duplicates (§9/§10/§11 families): merge identical rule bodies into grouped selectors where the selectors differ only by family prefix (e.g. `.pf-exam-… , .pf-quality-…`). If two IDENTICAL selectors already carry identical bodies twice — merge into one rule (the r320 duplicate-selector lint stays green).
4. NEVER change: selector names as rendered in TSX (markup untouched — only CSS moves), any declaration value, @layer homes (everything stays in @layer pages where it was), cascade order semantics (patterns.css is imported in main.tsx before the lazy page sheets — grouped base rules have no competitor after you delete the copies; page-specific overlays that come later keep winning).
5. Verify: `bash scripts/deadcode/check.sh` from repo root — must be at-or-below baseline (jscpd ≤286, knip 63/49 unchanged, depcruise unchanged). Then `bash scripts/verify.sh --fast > /tmp/dedup-verify.log 2>&1; echo $?` (NEVER piped).
6. Computed-style proof (browser, port 5318): `cd frontend && CHOKIDAR_USEPOLLING=1 npx vite --port 5318 --strictPort &` — write a playwright probe (/tmp or /home/z/probes, not the repo) that captures getComputedStyle for the shared seats (header, header-inner, main, section bar, pf-page-title) on /about, /app, /help, /legal at 1440+390, BEFORE your changes (git stash) and AFTER — the diff must be EMPTY. Then `node scripts/conformance/pages.mjs --url http://localhost:5318 --routes /about,/app,/help,/legal --bps 1440,390` (+ `--dark`) — all cells ≥90 (they are 98-99 today; a drop = your grouping broke something).
7. Bundle bonus: this dedupe also trims CSS gz — record the new total from verify's bundle gate (currently 770.4; report the number).

## Laws
Nothing gets worse (computed-style diff EMPTY is the proof); tests are law (r320 duplicate-selector lint, stylelint layer gate, r319/r321 pins — all must stay green); no !important added; tokens unchanged. Commit every ≤5 min on wip/dedup; push after first commit `git push -u origin wip/dedup` and after each commit. Do NOT merge to main.

## Report ≤10 lines
jscpd before→after · grouped families count + lines deleted · computed-style diff result · pages.mjs worst cell · bundle total · commits · verify exit.
