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
| (next) | | | |

## Tools actually used (skill/MCP → date · commit · output)

| Tool | Invoked | Commit | Produced |
|------|---------|--------|----------|
| skills CLI (npx skills@1.7.4) | 2026-01-30 · baseline | (this commit) | version verified, agents loading skills |
| (rows appended by each agent — claim without output = void) | | | |

## Next actions

1. A-Scout: install + smoke-test the design/Expo/MCP arsenal → `docs/redesign/r331/arsenal.md`.
2. A-Heron-Recorder: behavioral recording of https://heronaiapp.com/ (GSAP/ScrollTrigger/Lenis
   dump, 2%-scroll frames, nav anatomy) → `heron-program.json` + `heron-program.md`.
3. A-Repo: hygiene pass 1 — heavy evidence out of the tree, `.gitattributes` + CI size gate,
   docs/scripts collapse plan with verified indexes.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
