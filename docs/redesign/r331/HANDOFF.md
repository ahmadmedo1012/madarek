# R331 — HANDOFF (ARSENAL & TRUE MATCH)

Mission: (A) Website = Heron, real and measured — behavioral recording first, then rebuild.
(B) Native app to world-class — real navigation architecture, Reanimated, L3 screens.
(C) Repository hygiene — lean tree, layered CSS, size gates.

Working language: English internally. All product copy stays Arabic (RTL).
Branch policy: one branch, `main`. Agents commit in worktrees (`/home/z/wt/*`, branch `wt/<agent>`).
Only the lead merges to `main` and pushes. CI runs on every branch push — do not push worktree branches.

## Environment facts (verified this round)

- Repo base: `d7fcac42` (R330 final). CI at `d7fcac42` = ✅ success (checked via GitHub Actions API).
- Tokens live in `/home/z/.madarek-env` (never committed): `GITHUB_TOKEN` (owner-supplied fine-grained
  PAT, verified via `GET /user` → `ahmadmedo1012`), `EXPO_TOKEN` (owner-supplied). Source it: `. /home/z/.madarek-env`.
- Remote: `github.com/ahmadmedo1012/madarek` (private→public history intact). Environment was reset
  once more mid-round (local worktrees lost); remote main + this file are the source of truth.
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
| 44b7cc60 | heron porting spec | ✅ | heron-program.json/md + thumbs |
| 5cc53712 | (owner ios-wf commits) | ❌ CI failure (E2E/design-gates/frontend-tests) | root causes: component-split contract-test drift + motion-gate allowlist |
| 1641934d | app-shell (persistent tabs ×5, motion deps) | ✅ | CI+Mobile+Keep-warm green |
| 4f85e953 | A-CSS pass 1 (@layer, stylelint, coverage) | ✅ | re-based over owner's a4b18484 (ios-sidestore wf) |
| b31b38f4 | A-Web-Hero + A-Web-Nav rebuilds | CI cancelled | superseded by batch push; hero+nav behavior proven locally |
| 70175cf2 | A-CI-Repair: pins re-seated + gate allowlist | (batch push) | merged+pushed together with c62c95b6; GitHub ran CI on batch head only |
| c62c95b6 | docs HANDOFF | ❌ CI (E2E + Typecheck; downstream skipped) | hero accessible-text seam, typecheck leftovers, e2e watcher window |
| 01300d68 | fix(r331-ci): seam+typecheck+watcher | ❌ CI (Surface drift only) | drift flagged 12 findings from the R331 landing rebuild |
| 4aaad5e2 | fix(r331-drift): cinematic rungs folded + card sample re-seated | ✅ CI all 10 jobs + Size gate ✅ | API-checked: runs 41468527861 / 41468527964 — **main is GREEN** |

**Red→green cycle closed.** Root causes of the three red pushes, in order: (1) 5cc53712 — the
landing split (LandingPage.tsx / SheetNav.tsx / Hero.tsx) left 6 contract tests + the motion-token
allowlist reading the old single-file anatomy → pins re-seated onto the new surface truth
(70175cf2). (2) c62c95b6 — hero accessible-text seam + typecheck leftovers + e2e watcher window
(01300d68). (3) 01300d68 — Surface drift: r331/hero.css cinematic durations (800/1000ms) not in
KNOWN_DURATIONS_MS, and the drift card sample pinned to the retired `.card` anatomy → durations
folded, sample re-seated on `.hro-work-item`/`.rl-row`, baseline re-promoted (4aaad5e2).

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
- Done: A-CSS pass 1 (@layer constitution — cascade-neutral PROVEN pixel-identical ×6;
  !important 80→61 live; coverage harness: 5,061 selectors, 3,524 dead candidates;
  stylelint baseline 82e/126w) · A-App-Shell (persistent (tabs) ×5 roles, reanimated 4.7.1
  + worklets + keyboard-controller + bottom-sheet added, FABs removed, «الحوكمة» fixed,
  762/762 tests, web export green) · A-Web-Hero (Heron construction, live animation proof
  t=0.3s vs t=3s) · A-Web-Nav (56px/1×/5× thresholds, clip-path menu, lenis stop, CLS 0.0234).
- In flight: A-Web-Journey (≤991 blank-pin defect), A-Web-Sections, A-App-Motion, A-App-Student.
- Next: A-Web-Inner/Dash, A-App-Brand/Teacher/Admin, QA panel, EAS builds, evidence Release.

## Push blocker — RESOLVED

The brief's literal GITHUB_TOKEN was truncated/invalid; the owner supplied a fresh fine-grained
PAT (verified `GET /user` → `ahmadmedo1012`). Batch push `70175cf2…c62c95b6` landed; the red→green
cycle above closed at `4aaad5e2` (CI 10/10 + Size gate, API-checked). Worktrees were lost to an
environment reset and are re-created as needed from remote main.

## Next actions

1. A-Web-Journey: rebuild the ≤991px journey per heron-program.md (`section.home-map{height:700dvh}`
   + sticky inner, zero GSAP pins) with before/after eye-proof of the blank-pin defect.
2. A-Web-Sections + A-Web-Inner/Dash; A-App-Motion + A-App-Student (L3 screens).
3. QA panel (blind 3-reviewer ≥9/10, ≥55fps@4×, CLS<0.02), EAS builds, evidence Release.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
