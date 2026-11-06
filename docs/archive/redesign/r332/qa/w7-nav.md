# W7 — Navigation/menu/cursor vs `heron-program.json` (R332)

Verification-first lane: **no source changes needed** — every probed threshold already matched
the spec numbers. Evidence: `/home/z/evidence-r332/w7/` (probe_w7.py, probe-before/after.json).

| # | item | heron | madarek (probed live) | verdict |
|---|---|---|---|---|
| 1 | header @1440 | 56.3px fixed, transparent, fold 0.0635 | **56px**, top 7px, alpha 0, fold **0.0622** (−2.1%); @390: 50px (ref 49.61) | PASS |
| 2 | `on-scroll` >1×h | y > 1×bar height | OFF y=55,56 · **ON y=57** (`classList.toggle('on-scroll', y>h)` shape kept) | PASS |
| 3 | `on-hide` >5× scroll-DOWN | >~280px down-only | 5×h=280: no latch y=279 · **latch y=281** | PASS |
| 4 | lift −101% 0.4s | translateY(−101%) .4s | settled **−56.56px = −101%** of 56; `transform 0.4s ease`; pointer-events killed | PASS |
| 5 | show on any up-scroll | immediate | dropped ≤120ms after up-seek | PASS |
| 6 | 100ms debounce | setTimeout debounce | 320→300 reversal inside 40ms → no latch | PASS |
| 7 | hover guard | :hover suppresses | pointer on bar @600 → no hide; off bar @640 → latches | PASS |
| 8 | ≤991 clip-path wipe | inset 0.4s | 100%→59.1%→12.65%→0.39%→`inset(0)` on 0.4s ease | PASS |
| 9 | lenis.stop() while open | stop/start pair | `__mdrkLenis.isStopped=true`, wheel froze 0→0; route click unmounts + restarts | PASS |
| 10 | cursor difference-blend line | difference @0.2 | was `normal` → **FIXED post-verify** (R332 lead): `mix-blend-mode: difference` + 0.2 opacity in `landing/hero.css` `.hi-guide` | FIXED |
| 11 | flat-route seats | flat register | المقررات→`/#chapters` · الكليات→`/colleges` · الحرم→`/campus` · التطبيق→`/app` · المسابقات→`/auth` | PASS |

Gates: vitest `landing-scrollspy-grain` + `r306-landing-sheet` + `r170d-a11y-pins` 34/34 ·
tsc clean · stylelint owned css no new issues.
