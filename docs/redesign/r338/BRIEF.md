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

## ENV ADDENDUM (wave-1b, lead)
- Shared install RESTARTED by the lead — poll /tmp/madarek-install.done (up to 20 min, sleep 20). Do DEP-FREE work first (read specs/mappings, author TSX+CSS, commit+push). Do NOT self-install; if the log tail shows a hard error, report BLOCKER install.
- webkit absent from pw cache (install attempted after npm ci). If still absent at measure time → webkit cells = RESIDUAL, documented in excusals.md. Never fake.
- Section keys (scripts/conformance/mapping/): home-hero-wrap, home-intro-wrap, home-problem-wrap, home-why-wrap, home-platform-wrap, home-map-wrap, home-usecase-wrap, home-cta-wrap, footer (+ _chrome for chrome specs).
- OWNERSHIP corrections: problem → Chapters.tsx + pains.css (Live.tsx belongs to PLATFORM, T-08); cta → Vision.tsx + cta.css; map → map seat + colleges.css (verify in OWNERSHIP).
- Conformance: `bash scripts/verify.sh --sections <keys>`; run.mjs `--gate` = check vs ratchet, `--ratchet` = raise floor to current (NEVER lower — current floor 53.7). `verify.sh --fast` = tsc + vitest + bundle gate (~4 min).
- State: r337/usecase ALREADY MERGED into main. r337/problem holds 1 unmerged wip (73.6%). r337/intro fully merged. main RED at 37705268 (CI + Size gate) — medic is on it; land on main ONLY if your own verify.sh --fast is green, else push branch + report.
- Dead-agent rule: if /home/z/wt/<task-id> exists from a dead agent, continue from its last commit (git log) — never redo landed work.

## ENV ADDENDUM 2 (wave-2, lead — SUPERSEDES all flock instructions above)
- DO NOT USE flock — it is broken on this box (silently no-ops or starves for the whole window). Serialization is now: your OWN worktree + your OWN vite port + run.mjs --url. No shared locks except /tmp/verify.busy (below).
- DEDICATED PORTS: task tNN runs its own dev server on port 53NN (t02→5302, t04→5304 …) — e.g. `cd frontend && nohup npx vite --port 5304 --strictPort > /tmp/vite-t04.log 2>&1 &` then run the conformance instrument with `--url http://localhost:5304` (confirm exact flag in scripts/README.md — validated working by T-03). Kill your vite when done: `pkill -f 'vite.*5304'`.
- NEVER run the instrument against a shared/global server; never run verify.sh unless you are the medic/lander of this wave (verify.sh is heavy). Medic/lander: `mkdir /tmp/verify.busy` before verify.sh, `rmdir` after.
- COMMIT + PUSH AFTER EVERY COMPLETED SUB-STEP — agents on this box die without warning; your pushed branch is your progress. If your worktree already holds a dead agent's work: `git log --oneline -5` + `git status`, continue, never redo.
- Browser cache: chromium-1200 present and WORKS. If the instrument demands a newer build and /tmp/pw-install2.log shows it still downloading, use T-03's validated fallback: a private PLAYWRIGHT_BROWSERS_PATH dir with the requested build name symlinked to chromium-1200.
- Concurrency is deliberately ≤4 agents (backend + 2-CPU box die at 6+). If the box feels saturated, do dep-free authoring and defer measurement.
- Dark mode: the instrument currently has NO dark path (run.mjs) — dark cells are RESIDUAL until task T-14a lands. Webkit: browser absent; install retrying in background; residual if absent. Never fake either.

## ENV ADDENDUM 3 (wave-4, lead)
- Standardized browser fallback (validated by 3 agents): `mkdir -p /tmp/pw-browsers && for d in ~/.cache/ms-playwright/*; do ln -sfn "$d" /tmp/pw-browsers/$(basename "$d"); done && ln -sfn ~/.cache/ms-playwright/chromium-1200 /tmp/pw-browsers/chromium-1223 && export PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers` — use if the instrument complains about a missing browser build.
- Bundle ceiling on main is 777 KB gz (r337's documented raise, already merged). Do NOT exceed 777; prefer real cuts.
- Conformance honest baselines (chromium, 5-bp avg): usecase 87.9 (claimed 91.4 did not reproduce), problem 84.6, intro 74.7. why/footer rewrites landed on branches but UNMEASURED.
- run.mjs is shared instrument code: T-02a added the charSplit "wordset" rule on branch r338/t02-usecase-residual (NOT yet on main). If your task touches run.mjs, base your worktree on the branch that last touched it to avoid conflicts.

## ENV ADDENDUM 4 (wave-5, lead)
- node_modules in worktrees are HARDLINK copies. NEVER write into node_modules (no installs, no patching). If vite serves blank / module-not-found errors: `rm -rf ./node_modules frontend/node_modules` in YOUR worktree and re-copy from /home/z/madarek (`cp -al /home/z/madarek/node_modules ./node_modules` + same for frontend/) — never repair in place.
- Honest conformance state (chromium, 5-bp): usecase 87.9 · problem 84.6 · intro 74.7 · why 61.8 · footer 64.1/62.6/75.3/66.7/68.2 · platform/map/cta/hero/chrome unmeasured-this-round. Ratchet floor 53.7 (full matrix).

## ENV ADDENDUM 5 (wave-6, lead)
- main @0bd158ba carries: usecase 87.9 avg, intro 74.7, problem(old) 84.6→ now branch 88.8, why 62.2 (branch), footer 71 (branch). Bundle ceiling 777 KB gz HARD.
- CI-blockers to clear before landing (from L-4b forensics): t04 = missing `.pm-meta{border-block-end…}` spec rule; t05 = bundle 777.4>777 (cut real code); t06 = check-colors --strict raw hex/rgb literals + `.fo-wordmark-reg::before` count 4≠5.
- why.css lives at frontend/src/styles/landing/why.css (NOT components/landing/ — mapping _readme is stale).
- run.mjs is lead-controlled shared instrument: ONLY T-14a may edit it this wave (dark path + plumbing-skip mechanism per T-06c's documented need). Section agents: never touch run.mjs.
- Cross-section dependency: problem's copy-driven line-counts (sub 3-line, titlebox 1-line) live in platform-owned Live.tsx — T-08 owns that file and must honor them.

## ENV ADDENDUM 6 (wave-7, lead)
- Instrument upgrade on branch r338/t14a-instrument (562cba47, landing this wave): (1) `--dark` flag — measures under the site's own html[data-theme=dark] (geometry/type/border vs frozen light spec + token-flip census + WCAG contrast ≥3.0); (2) mapping `plumbing:[{section,heron,skip:["geometry"],reason}]` mechanism — skipped cells counted, never silent. Section agents: after t14a lands on main, run your section with `--dark` and fix reported dark-kind fails (e.g. footer dark y:154/w:96/x-mirror:86); add plumbing skips for defs/filter/mask scaffolding with reasons.
- why branch @eaaf5ebb: bundle gate PASS (777.0≤777), head rebuilt to measured seat; 61.1% with ~33 x-mirror cells regressed by the bundle diet (suspect ≤991 section width min(171.24rem,100%) vs 768/390 spec rects) — T-05e owns the recheck + mobile re-seat.

## ENV ADDENDUM 7 (wave-8, lead)
- CI INFRA INCIDENT (13:25–14:05 pushes): every r338 branch push red (CI + Size gate), job logs 404 BlobNotFound (log retention broken). Branch agents mirrored ALL gates locally GREEN (vitest 3051, lint 0, tsc, design-gates 9/9, size-gate exit 0, check-colors, r321). Until the incident clears: red branch CI alone is NOT exclusion evidence — mirror locally before excluding; try POST /actions/runs/<id>/rerun-failed-jobs (worked for T-01 before).
- Problem @d2a7a2e7 = 90.5% avg (93/93/93/89/85) — first section at target. Footer @7974d0b8 = 69.2% (blockers cleared locally).
- After t14a lands: sections opt into `--dark` + plumbing-skip (see ADDENDUM 6).

## ENV ADDENDUM 8 (wave-9, lead rulings)
- OWNERSHIP RULING (platform): T-08's exclusive set is EXTENDED to **Product.tsx + Live.tsx + platform.css + scripts/conformance/mapping/home-platform-wrap.json** (the platform seat section#product.pr-section is rendered by Product.tsx; OWNERSHIP.md r337 predates the P2-0 seat move — a doc refresh is queued in Track B).
- t14a is ON MAIN (a5b71046): all sections may now run `--dark` and add `plumbing:[{section,heron,skip:["geometry"],reason}]` entries to their mapping. Dark cells count toward the exit table — start opting in.
- r338/land-w8 holds t05(eaaf5ebb)+t04(d2a7a2e7)+t06(7974d0b8)+css-cut, NOT landed: combined bundle 777.6 > 777. The 0.6 KB must come out of JS (Chapters.tsx / Footer.tsx) — T-99 owns the diet + landing (merge t05's newer head 37b3c79a first).
- check-bundle-size.mjs counts dist/assets/*.js ONLY (css is not in the gate) — css cuts do not move it.
- GitHub Actions incident ONGOING (all-fail, logs 404, reruns red): local verify is the landing evidence; landers keep API-watching and re-check later runs.
- Usecase lh/geometry task split again (3 agent deaths): T-02c = color:162 + lh:22 only; T-02d = geometry (y:265 h:92 x-mirror:73 w:63 bg:81 + 390 parked deck) only.
