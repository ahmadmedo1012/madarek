# R343 task preamble — EVERY agent reads this first
Repo: Madarek. Your worktree: `/home/z/wt/<ID>` (branch `wip/r343-<ID>` from b8755850). Reference reading copy (do not edit): `/home/z/wt/r342-integration`.

## Shell setup (every shell)
`source /home/z/.madarek-env` — gives GITHUB_TOKEN, EXPO_TOKEN, PLAYWRIGHT_BROWSERS_PATH, and `madarek_push` (push helper). NEVER echo the tokens. NEVER run npm install / npm ci (node_modules are hard-linked inodes shared box-wide). NEVER edit `scripts/conformance/mapping/footer.json` or `home-intro-wrap.json` or regenerate mappings (parallel agents own new files only). NEVER touch `scripts/conformance/run.mjs`, gates, ratchet.json, tolerances, exceptions.json, or any test assertion — you add code and bindings, you never move the goalposts.

## Commit discipline
`git add -A && git commit -m "<ID>: <what>"` every ≤5 min, then `madarek_push push origin wip/r343-<ID>`. If push fails, retry once, then continue committing locally and report it.

## Dev server + conformance chunk (memory is scarce: 2 CPU / 4 GB)
- Start YOUR vite: `cd /home/z/wt/<ID>/frontend && (nohup npx vite --port <YOUR-PORT> --strictPort > /tmp/vite-<ID>.log 2>&1 &)`; wait for `curl -s -o /dev/null -w '%{http_code}' http://localhost:<PORT>/` = 200 (Vite dev needs no build).
- Browser discipline: before ANY browser command, wait until `pgrep -fc 'chromium' || true` < 3 (sleep 20 loop, max 5 min). Kill your vite when done: `pkill -f 'vite --port <YOUR-PORT>'`.
- Section chunk (single bp): `cd /home/z/wt/<ID> && node scripts/conformance/run.mjs --url http://localhost:<PORT>/ --sections <SECTION> --bps 390 --out` then read the summary it prints (coverage % / measured / off-book per section).

## The binding model (R342-07 wrapper-mirror method)
- Frozen Heron reference DOM per bp: `docs/redesign/r335/heron-spec/<section>.{390,768,1024,1440,1920}.json` — `elements[]` each with `p` (Heron path like `footer > div[2] > div[1] > form[1] > div[2] > button[2] > div[1]`), tag, geometry, type, colors. LIGHT-ONLY (dark asserts internal consistency automatically).
- Your job: make OUR DOM mirror the reference's wrapper-chain topology for your subtree — real semantic containers only (grouping, layout seats, link seats, icon boxes the reference actually has), Arabic content, correct for RTL. NO junk: no empty divs whose only job is to be counted, no duplicate invisible copies, no 0x0 boxes. If a reference wrapper has no semantic purpose you can honestly carry, leave that path unbound (report it) — do not fake it.
- Add `data-spec="<section>.<name>"` hooks on the new elements. Bind them in a NEW file `scripts/conformance/mapping/<section>-<ID>.json` (run.mjs auto-merves every mapping/*.json): shape `{"ourSection": {"<section>": "<existing selector — copy from the big mapping file>"}, "heronPageKey": {…copy…}, "explicit": [{"section": "<section>", "heron": "<heron path>", "spec": "<heron path>", "ours": "<section>.<name>"}]}` — copy the ourSection/heronPageKey values verbatim from `mapping/<section>.json`.
- New CSS goes in YOUR file `frontend/src/styles/landing/<file>-<id-lower>.css`, imported with one `@import "./<file>-<id-lower>.css";` line appended to `frontend/src/styles/landing/home.css` (or the import block that already imports the parent file — check first). Tokens only (var(--…)); no raw hex/durations/z-index; radius 0; no shadows; hairlines. Do NOT edit footer.css/statement.css.
- Every new visible element must also exist sensibly in dark mode (the runner re-asserts vs light spec on theme flip) and at 390/768/1024/1440/1920 (you test 390 + 1440; the wave-end matrix does all five).

## Method references
`docs/redesign/r342/REPORT.md` (wrapper-chain method + last numbers), git log of the component (`git log --oneline -15 -- frontend/src/components/landing/sections/Footer.tsx` shows R342-07's lift commits), `scripts/conformance/run.mjs` header comment (lines 1-160) = the metric law.

## Quality gates before you finish
`cd /home/z/wt/<ID> && npm run typecheck -w frontend 2>&1 | tail -3` (must be clean), `npx eslint frontend/src/components/landing frontend/src/styles/landing 2>&1 | tail -3` (no new errors), `cd frontend && TZ=UTC npx vitest run --silent 2>&1 | tail -5` (no new failures; skip if box memory <500 MB free — report instead). One section chunk at 390 AND one at 1440, numbers recorded.

## Report back (≤10 lines, your ONLY output)
`<ID>: subtree <name> — coverage before→after (measured checks, bound elements added), bindings added <n>, bps verified, gates (typecheck/lint/vitest/chunk) pass|fail, risks/blockers (≤2 lines).`
