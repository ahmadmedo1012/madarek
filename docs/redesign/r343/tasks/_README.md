# R343 authoring preamble v2 (wave 1b) — binding rules distilled; NO browsers
You are an authoring agent. Your worktree: `/home/z/wt/<ID>` (branch `wip/r343-<ID>` off b8755850). No dev server, no Playwright, no conformance runs — the orchestrator verifies after merge. Your deliverable: component edits + a new mapping file + a new CSS file, typecheck/eslint clean.

## Setup every shell
`source /home/z/.madarek-env`. NEVER npm install/ci. NEVER edit: `scripts/conformance/mapping/footer.json`, `mapping/home-intro-wrap.json`, any other existing mapping, `run.mjs`, gates, ratchet, tolerances, exceptions, tests, other agents' files. You only ADD files (mapping + css) and edit the one component region you own.

## Commit discipline
`git add -A && git commit -m "<ID>: <what>"` every ≤5 min; `madarek_push push origin wip/r343-<ID>` (retry once on failure, else keep committing locally).

## The binding grammar (exact, verified in run.mjs)
- Frozen spec elements: `docs/redesign/r335/heron-spec/<section>.{bp}.json` — your slice file lists YOUR targets (path `p`, bp, tag, text-class `tc`, x/y/w/h, fs/lh/fw, colors, radius, pad).
- Your binding file: `scripts/conformance/mapping/<section>-<ID>.json` (run.mjs auto-merges every mapping/*.json):
  `{"ourSection": {…copy verbatim from the big mapping file…}, "heronPageKey": {…copy…}, "explicit": [ …entries… ]}`
- Entry: `{"section": "<section>", "heron": "<path or per-bp object>", "spec": "<same as heron>", "ours": "<section>.<yourname>", "skip": ["tag","geometry"], "note": "<why, r338 census law wording>"}`.
  - `ours` MUST equal the `data-spec` attribute value on your element, exactly (runner matches `element.ds === ours`).
  - Per-bp paths: if the same seat has different recorded paths at 390 vs 1440, use `"heron": {"390": "…", "1440": "…"}` (same for `spec`) — nearest-bp fallback covers 768/1024/1920 automatically; a path that doesn't exist at a bp simply no-ops (no fail).
  - `skip` groups allowed: tag, tc, geometry, type, color. Word/char split seats (tc=short, fs < 20) take `skip:["tag","geometry"]` + note citing the r338 census law (see `intro.word.1` in mapping/home-intro-wrap.json for the canonical note). Structural seats take NO skip. If a seat's geometry cannot honestly match (Arabic length), LEAVE IT UNBOUND and list it in your report — no blanket skips, no fake wrappers, no 0×0 boxes, no duplicate invisible copies.
- Styling law (Heron): paper `var(--paper #F6F6EE)`, ink `var(--ink #282828)`, orange `var(--accent #FA3600)` — use the existing CSS variables from the landing styles (check `tokens`/`shared.css` for names); radius 0; no shadows; hairlines 1px; no raw hex/durations/z-index. Geometry targets: match slice x/y/w/h within ±2px at BOTH 390 and 1440 (media queries per bp; 768/1024/1920 approximate — the binding no-ops there unless paths match).
- Light theme is what the frozen spec asserts. Dark theme: your elements must flip to dark tokens (the runner asserts internal consistency + WCAG ≥ 3.0 contrast in dark). Use the same variable-driven classes pattern as neighbors.

## Component edit rules
Mirror the reference wrapper-chain only where it is a REAL seat (layout container, text row, icon frame, rule). Keep every existing `data-spec` hook (e2e depends on them) — you only ADD. Visual output must not change beyond hairline-level alignment. React/TS strict; no new deps; Arabic copy where text is needed.

## Gates before you finish (no browsers)
1. `cd /home/z/wt/<ID> && npm run typecheck -w frontend 2>&1 | tail -3` — clean.
2. `cd /home/z/wt/<ID> && npx eslint frontend/src/components/landing/sections/<your component> frontend/src/styles/landing/<your css> 2>&1 | tail -3` — no new errors.
3. `python3 -c "import json;json.load(open('scripts/conformance/mapping/<section>-<ID>.json'))"` — valid JSON; every entry's heron path exists verbatim in your slice file (string or per-bp object values).

## Report (≤10 lines, your ONLY output)
`<ID>: slice <N> targets → <n> bound (skip-full <a> / skip-tag+geo <b> / left-unbound <c> with 1-line reasons), files touched, gates pass|fail, risks ≤2.`
