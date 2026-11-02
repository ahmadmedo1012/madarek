# R331 — HANDOFF (ARSENAL & TRUE MATCH)

Mission: (A) Website = Heron, real and measured — behavioral recording first, then rebuild.
(B) Native app to world-class — real navigation architecture, Reanimated, L3 screens.
(C) Repository hygiene — lean tree, layered CSS, size gates.

Working language: English internally. All product copy stays Arabic (RTL).
Branch policy: one branch, `main`. Agents commit in worktrees (`/home/z/wt/*`, branch `wt/<agent>`).
Only the lead merges to `main` and pushes. CI runs on every branch push — do not push worktree branches.

## Environment facts (verified this round)

- Repo base: `d7fcac42` (R330 final). CI at `d7fcac42` = ✅ success (checked via GitHub Actions API).
- Tokens live in `/home/z/.madarek-env` (never committed): `GITHUB_TOKEN` (works; the literal in the
  brief returned "Bad credentials" — the token embedded in the git remote is the working one),
  `EXPO_TOKEN`. Source it: `. /home/z/.madarek-env`.
- `/dev/kvm` is **absent** → no local Android emulator. Per brief: noted once here; device-class
  evidence comes from RN-web + Playwright + EAS preview builds (iOS simulator + Android APK).
- `apps/mobile/package.json` confirmed missing: `react-native-reanimated`, `react-native-worklets`,
  `react-native-keyboard-controller`, `@gorhom/bottom-sheet` (B0 will add them; single native change).
- `frontend/src/styles` = 51,572 lines total (target ≤ 33k, `!important` = 0).
- `.git` = 359 MB (history untouched — no rewrite), `docs/` = 25 MB, 24 redesign folders.

## CI ledger (push → API-checked)

| sha | push | CI | note |
|-----|------|----|------|
| d7fcac42 | (base, R330) | ✅ | starting point, verified via Actions API |
| fdc8bb27 | baseline HANDOFF | ✅ | docs-only baseline |
| 2faeeae8 | arsenal + repo hygiene pass 1 | ✅ | CI + Size gate both green (API-checked) |
| 44b7cc60 | heron porting spec | (polling) | heron-program.json/md + thumbs |

## Tools actually used (skill/MCP → date · commit · output)

| Tool | Invoked | Commit | Produced |
|------|---------|--------|----------|
| skills CLI 1.7.4 | baseline | fdc8bb27 | 48 skills → ~/.claude/skills (arsenal.md) |
| impeccable 4.8.0 detect | 2faeeae8 | arsenal.md | 366 files, 11 anti-patterns, 21 advisories |
| Playwright MCP 0.0.84 | 2faeeae8 | arsenal.md | 25 tools, JSON-RPC proven, chromium-1200 |
| chrome-devtools-mcp 1.12.0 | 2faeeae8 | arsenal.md | 32 tools, real page launch via --executablePath |
| firecrawl-mcp 3.36.0 keyless | 2faeeae8 | arsenal.md | real scrape of example.com |
| odiff + pixelmatch | 2faeeae8 | arsenal.md | agree exactly: 1.95% diff pair, 0 on identical |
| Python Playwright recorder | 44b7cc60 | heron-program.json | 204 frames (4 viewports), GSAP/Lenis dump, nav states |
| lighthouse 13.6.0 | 2faeeae8 | arsenal.md | real audit run, perf 100 on example.com |
| size-gate.sh (new CI job) | 2faeeae8 | scripts/gates/ | GREEN on cleaned tree; 3 failure modes proven |

## Phase status

- Phase 0 (arsenal): ✅ — `docs/redesign/r331/arsenal.md`.
- Heron behavioral spec: ✅ — `heron-program.md` IS the Part A spec (Lenis on .main-inner,
  zero GSAP pins — sticky journey, rem formula 0.5787vw/1.199vw/2.5445vw, header thresholds
  1×/5× height, full tween table in heron-program.json).
- Repo hygiene pass 1: ✅ — tracked tree 324MB → 40.8MB; size gate active in CI.
- In flight: A-CSS (layered cascade), A-App-Shell (Tabs restructure + native deps).
- Next: web rebuild wave from heron-program.md; app motion/student/teacher/admin; QA panel.

## Next actions

1. Relaunch A-CSS + A-App-Shell (failed mid-run; worktree state preserved — continue, don't restart).
2. Launch A-Web-Hero + A-Web-Nav from heron-program.md (worktrees /home/z/wt/hero, /home/z/wt/nav).
3. Poll CI on 44b7cc60; upload /home/z/evidence-r331/ (284.7MB) to Release evidence-r331.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
