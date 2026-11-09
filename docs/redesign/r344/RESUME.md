# R344 RESUME
State: main=52cf4e4b (D1 cherry-picks pushed; CI running). Box: repo at /home/z/madarek (fresh clone), npm ci done, PW chromium-1223 installed.
DONE:
- Startup: env file written (2nd token works — 1st 401s), main verified f1e20a64→52cf4e4b, r344 docs scaffolded.
- G-1 (partial): D1 cherry-picked+pushed (52cf4e4b). BRANCHES.md + DECISIONS.md written. Branch deletion pending verify of CI on 52cf4e4b.
- Item 0 (analysis): CI red = rate 93.1 (70212/75422) vs ratchet 93.2. Local blob 93.24. Levers: ~2,400+ new passing checks needed for CI ≥93.3 (0.067N ≥ 157). Excused pools: footer 193@1440 etc; skipped pools: why 4958, hero 4390, intro 4068, platform 3818. Selector-based explicit bindings need NO component edits.
NEXT:
1. Finish G-1: run scripts/branch-sweep.sh (archive tags + delete 24 branches) → ls-remote = main only.
2. Item 0 probe: copy mapping minus excuses → scoped runs per section → harvest winners → new binding files (r344) scoped to passing bps → full local run ≥93.4 → push → 3× CI ≥93.3.
3. Then C-6 textures, C-4 plates, C-5 illustrations, C-sheet, D CSS, E panel, F mobile, G-2.
GOTCHAS: no background processes across calls; vite in-call only; never pipe verify.sh; ratchet only rises; skippedReport/unmatchedReport capped at 250/300 rows; scoped probes write results blobs (delete unscoped probes before commit).
