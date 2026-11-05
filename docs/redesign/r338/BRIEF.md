# R338 DISPATCH BRIEF — common rules for EVERY sub-agent (read first, follow exactly)
Repo: github.com/ahmadmedo1012/madarek · local clone: /home/z/madarek · you are one agent in a parallel fleet. Your Task ID and specifics come from your dispatch prompt.

## Skills/tools you must load and use
This harness has NO Claude plugin marketplace: ponytail, impeccable, ui-ux-pro-max, anti-ui-slop, frontend-design, gsap-skills, expo-skills and all MCP servers are NOT AVAILABLE — do not waste time looking for or installing them. Use instead: the repo's own scripts (`scripts/verify.sh`, `scripts/conformance/*.mjs`, `scripts/README.md`), Playwright from the repo's node_modules, and bunx-run npm tools when needed (stylelint, knip, jscpd, lightningcss, ts-morph, madge…). Append one line per tool you ACTUALLY used to `docs/redesign/r338/arsenal.md` in your worktree (format: `T-xx | tool | what for`) and repeat it in your report.

## Setup (exact, in order)
1. `source /home/z/.madarek-env`  # GITHUB_TOKEN / EXPO_TOKEN. NEVER echo them, commit them, or put them in logs/docs.
2. `cd /home/z/madarek && git fetch origin --prune`
3. Worktree: if `/home/z/wt/<task-id>` already exists → `cd` there, `git fetch origin && git rebase <your-base>` and CONTINUE from the last commit (a prior agent died; check `git log --oneline -5` and `git status`). Else: `git worktree add --force /home/z/wt/<task-id> -b r338/<task-id> <base>` (on `index.lock`/`worktree` lock errors: sleep 3, retry up to 5×).
4. Deps: follow ENV NOTES at the bottom of this file (lead-updated). Do NOT run a full install unless ENV NOTES says to.
5. Branch naming: `r338/<task-id>`. Commit AND push (`git push -u origin r338/<task-id>`) partial work at least every ~10 minutes. Small commits. Never force-push. Never edit /home/z/DISPATCH-QUEUE.md, /home/z/DISPATCH-BRIEF.md or docs/redesign/r338/HANDOFF.md (lead-only).

## Concurrency (multiple agents share this machine)
- Any command that spawns a dev server or runs `scripts/conformance/*` must be serialized: `flock -w 1500 /tmp/conf.lock <command>` (fallback if no flock: retry loop on `mkdir /tmp/conf.lock.dir`). Builds/tsc/vitest need no lock.
- Playwright browsers are shared in ~/.cache/ms-playwright. If webkit cannot launch (missing system libs, no root), measure chromium + dark and list webkit as RESIDUAL — never fake a number.

## Hard rules (violation = task failure)
- Own ONLY the files your task names (binding: docs/redesign/r337/OWNERSHIP.md + scripts/conformance/mapping/*.json — confirm exact paths/section keys there FIRST). Never touch other tasks' files, other agents' worktrees, .github/workflows (unless your task says so), or any gate/ceiling/baseline.
- NEVER: raise a gate ceiling (bundle ≤ 776 KB gz), re-pin a spec baseline, weaken an assertion, add continue-on-error, lower the ratchet, or commit secrets.
- Reproduce MEASURED parameters (geometry, type, colour, durations, easings, triggers) in our own code and copy. NEVER paste Heron source, text, images or fonts. Arabic adaptations = transformed expectations (RTL mirror, letter-spacing 0, Arabic line-height floor).
- REWRITE, DON'T PATCH: a section task replaces the section's TSX+CSS from scratch in the layered architecture, adds real counterparts for missing elements (authored inline-SVG line-art, or 2× crops of OUR OWN product UI — never Heron assets), deletes the old rules it replaces, and carries `conformance <section>: a% → b%` in the commit message. Done = ≥90% on ALL 5 breakpoints + dark theme + WebKit, measured by scripts/conformance (exact commands in scripts/README.md).
- Genuinely impossible cells may be excused ONLY with a written justification appended to docs/redesign/r338/excusals.md (r337 precedent: 19 documented excusals). Section target stays ≥90%.
- Landing on main: ONLY agents whose prompt says "you may land on main" (lander/medic). Before landing: `scripts/verify.sh --fast` green → `git pull --rebase` → re-verify if the rebase changed anything → push. On push race: `git pull --rebase`, re-verify, retry once, else report.
- Time box ≈25 min unless your prompt overrides. If you can't finish: commit+push partials and report EXACTLY what remains at file level. Never mark done with an excuse; never report conformance numbers you did not measure yourself.

## Report back (≤10 lines, this exact shape — your ONLY output)
`TASK <id> | BRANCH <name> | COMMITS <shas> | PUSHED yes/no | VERIFY <pass/fail + numbers> | CONFORMANCE <a% → b% per bp/dark/webkit or n/a> | TOOLSUSED <one line> | RESIDUAL <file-level remainder or none> | BLOCKERS <owner-only items or none>`

## ENV NOTES (lead-appended after environment detection — read these last)
(pending — will be appended before wave 1 dispatch)

## ENV NOTES (detected, machine facts — authoritative)
- Repo layout + lockfiles: package-lock.json  (see also frontend/ if present). A SINGLE shared install runs in the background in /home/z/madarek (log /tmp/madarek-install.log, marker /tmp/madarek-install.done).
- Deps in YOUR worktree: poll for /tmp/madarek-install.done (up to 15 min, sleep 20). Then hardlink-copy: `cp -al /home/z/madarek/node_modules ./node_modules` (instant, no disk cost) and repeat for any nested node_modules you find one level deep in /home/z/madarek (e.g. frontend/node_modules). If the marker never appears, read the log tail; only then run your own install and report the deviation.
- Playwright browsers: shared cache ~/.cache/ms-playwright, background chromium+webkit install in flight (marker /tmp/pw-browsers.done). If webkit cannot launch (no root for system deps), measure chromium+dark and list webkit as RESIDUAL — never fake a number.
- Machine: 2 CPUs, ~7 GB disk — be frugal: no parallel builds inside your agent; ALWAYS wrap dev-server/conformance/verify.sh commands in `flock -w 1500 /tmp/conf.lock <cmd>`.
- madarek.onrender.com is NOT reachable from this sandbox. 2× product-UI crops must come from the LOCAL dev server/build of this repo. heronaiapp.com IS reachable.
- No gh CLI, no yarn/pnpm on PATH. GitHub API via curl + jq: https://api.github.com/repos/ahmadmedo1012/madarek with header "Authorization: Bearer $GITHUB_TOKEN". Never print .git/config or remote URLs (they embed auth).
- git identity preset in /home/z/madarek; worktrees inherit it.
