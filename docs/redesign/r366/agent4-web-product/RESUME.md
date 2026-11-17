# Agent 4 · RESUME (live log)

## Session 1 — 2026-11-17 (Africa/Tripoli)

- 13:05 Cloned `main` @ `7a097457` (matches §2), branch `agent/r366-web-product` created. `~/.madarek-env` written (chmod 600).
- 13:10 npm ci at root (748 pkgs, 16 s). Playwright chromium-1200 already cached; chromium-1223 + headless-shell installed for @playwright/test 1.60.
- 13:15 Read instruments: `scripts/qa/overlap.mjs` (seed/stress/fontscale/shots, sequential), copy-budget gate (77 pages, 56 authed, ceilings == current words; authed sum 9215, minus Agent-1 folders → **ownable authed total 8885**).
- Skills §6 note: ponytail/caveman/gstack/ruflo/claude-mem/find-skills are Claude-environment skills — not installable in this execution sandbox (no plugin runtime); native tools (rg/node/Playwright) used instead. Recorded, moving on.
- 13:20 Branch pushed (a1c7f39 — program records). Build verified (tsc -b + vite, 24 s). vite preview :4173 (main-state dist) + vite dev :5173 kept running via setsid.
- 13:40–16:00 Subagent orchestration learning: the Task tool reports `context deadline exceeded` for long-running agents, but the agents RUN DETACHED and edit the working tree. Reports are recovered by having agents write report FILES (r366 pattern) and by reverse-engineering diffs. Parallel launches collide on the shared tree — sequential relaunches per lane.
- 16:00–16:30 LANE 2-a COMPLETED BY HAND (finishing the detached agent's partial work): diagnosed with instrumented probes — (1) legacy `.chat-area{scroll-behavior:smooth}` (student.css) animates programmatic scrollTop assignments → smooth pin flights chase content-visibility realization and strand the transcript (60-row open: 2781 px off bottom; streamed reply: 126 px); (2) scroll-anchoring drags poison the at-bottom guard; (3) the textarea counted as a scroller in the new test. Fixes: instant pins + time-boxed settle loop + `overflow-anchor:none` + `scroll-behavior:auto` (ai.css, scoped), test fixed to exclude form controls. e2e 6/6, unit 80+19 green. Copy 244→181, ceiling ratcheted. Commit ac3cc77, pushed.
- 17:10 overlap.mjs extended (commit 9598d33): `--workers`, `--popovers`, `--focus N`, `--contrast/--reducedmotion` — defaults byte-identical (verified clean run on /student/dashboard).
- 17:15–18:00 LANE 2-d notifications half COMPLETED BY HAND: `.notification-panel` computed `position:static` (T065 container geometry retired with R313 D16 and never replaced — production defect), unread dot 0×0, panel kissing the topbar (53.5 vs 55.5). Fixes: unlayered container contract in notifications.css, anchoredPosition bar-clamp, dot geometry. e2e 6/6 serial. Commit 9c1bb5b, pushed.
- 18:59–20:30 Stress baselines (main-state dist): 5 roles × headline routes × {360×640, 1440×900} × light+dark with `--stress --workers 2` — **ALL CLEAN** (0/0/0/0/0 per role; artifacts /tmp/r366/baseline-stress-*.json). Honest reading recorded in the ledger: the owner-perceived defect class lives in the interaction layers, proven by the failing-before e2e evidence, not the static crawl. (A 3-worker background sweep was OOM-killed twice — 2 workers foreground is the stable shape.)
- 19:03–19:06 Copy diet round 2 batch 1 (agent work integrated + my trims): teacher set 589→450 / 150→120 / 152→139; MorePages 410→356; Courses 119→115; OwnerInstitutions 178→173. Two trims REVERTED (r165g truthfulness + r173a summary-line contracts — the pins were right). 46+71+183 unit + teacher-grading e2e green. Ceilings ratcheted, gate CLEAN. Commit cfc1dc8, pushed.
- 20:30 L4/L5 instrument `scripts/qa/cls-axe.mjs` (commit 1b26388): CLS + axe serious/critical on the hermetic seed. Results: 14 pages × 4 roles @390×844 — **CLS max 0.0433 (≤0.05 held), axe serious/critical ZERO**.
- 20:45 Design gates on the r366 tree: contrast PASS, colors/raw-css/icons/motion-tokens OK, stylelint ratchet green (headroom improved: rawZIndex 79→69, rawHex 36→29 — baseline file untouched, integrator re-pins), copy-budget + mobile CLEAN.
- 20:50 Ledger v2 + RUBRIC + REQUESTS committed (633fd3f); copy review pack r366-pack.md committed (c46fb63).
- In flight (detached agents, monitored by mtime): 2-c exams (OnlineExamsPages writing since 20:12), 2-b pdf (PdfViewer+pdf.css since 19:37), 2-d messages/calendar (probe screenshots since ~20:45).

## Open risks / notes

- The Task tool's parent-side deadline means agent reports must land in files; if an agent dies silently, its diff is integrated by hand (the 2-a pattern).
- The full 5-width × popover/focus matrix runs at close-out on the rebuilt dist (L6.3).
- Community/competitions copy diet → REQUESTS to Agent 1 (folders are theirs).
