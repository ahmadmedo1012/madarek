# R338 RESUME — read first (≤30 lines)
1. main @71e5a4c5: ALL R338 section work landed; every landing gated by local verify.sh --fast (green); bundle 762.7≤777.
2. First task for the next lead: ONE full-matrix conformance run (own vite port + `node scripts/conformance/run.mjs --url …` then `--ratchet`) → commit ratchet.json+results.json to main (data-only). 3 attempts died on deadlines; it needs ~30 quiet minutes on the box.
3. Section scores (chromium light / dark): usecase 94.3/93.2 · problem 90.5/92.9 · map 90.8/92.9 · hero 90.3/90.6 · platform 80/80.5 · intro 77.0/79.7 · footer 69.4/~68 · cta 67.1/65.3 · why 63.5/67.4. Interactions 92.3% (hero seats 41% unauthored). Scroll cells 5/5, feel 30/30.
4. Next queue pulls (file-level residual lists live in the agents' reports + docs/redesign/r338/excusals.md): T-03g intro (deep h2 windows, 390) · T-05g why (explicit bindings d19→60, counterparts) · T-06h footer (≤991 grid boxes, dark) · T-08c3 platform (69 crossover nodes, curves) · T-10c cta (lede ladder, cg-strip, dark) · T-11e hero (strip y seats, ~13 interactive seats) · T-12 pattern library · T-15 chrome specs.
5. Track B rest: T-23 CODEOWNERS/PR-template/commitlint+husky+lint-staged · T-25 copy/tokens/routes single source (collect the scoped var rulings: platform CTA orange, --rl-soft-ink, --jt-ink).
6. Track C (CSS 43k→33k, !important→0): T-30..T-38 ALL queued, none started.
7. Track D (login/about/help/app/legal/404 + 5 role shells): T-40..T-49 queued, none started.
8. Track E (mobile P1 tickets, review ≥9, mobile-build.yml APK, gates+OTA): T-50..T-53 queued, none started. EXPO_TOKEN verified Admin-role last round.
9. Closing: re-run T-90 blind panel after sections reach target; rewrite REPORT.md honestly.
10. ENV blockers (owner): GitHub Actions quota/ruleset incident (all runs fail steps:0, logs 404; pushes fine; branch name r338/t13* rejected by ruleset — use different names) · WebKit host-blocked (libgtk-4/libGLESv2/libwoff2dec, no root) · CI evidence = local verify.sh --fast.
11. Ops model that survived: ≤4 concurrent agents (LLM backend + 2-CPU box die at 6+), per-agent worktree /home/z/wt/<id> + own vite port 53NN + run.mjs --url, commit+push every sub-step, split tasks after 2 deaths, lander = ONE build + ONE verify, docs-only pushes need no verify.
12. Credentials: /home/z/.madarek-env (600). BRIEF: /home/z/DISPATCH-BRIEF.md (+ repo copy with all 14 addenda). QUEUE: docs/redesign/r338/QUEUE.md. Full report: REPORT.md.
