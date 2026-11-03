# R333 — PRODUCTION-VALUE PARITY · HANDOFF LEDGER

Round owner: team lead (delegate/merge/judge — does not implement).
Base: `main` @ `5d4468a5` (r332 end-state: twin harness, hero full-bleed, pains carousel, consent corner cell, routes, renames, W11 dashboards grammar, CI green).

## Round thesis
R332 matched Heron's *skeleton* (geometry twin). R333 matches Heron's **craft density**: product media, motion richness, signature-scene scale, decisive typography — judged by an **absolute 12-criterion rubric** (Heron-calibrated) that cannot be gamed by frame filtering. The Twin remains a geometry guard only.

## Exit criteria tracker
- [ ] `heron-craft.md` complete; every gap closed with a Madarek-original equivalent of equal production value
- [ ] Rubric: Madarek ≥ Heron − 0.5 on all 12 criteria @ 1920/1440/1024/768/390/360, Chromium+WebKit, light; dark passes contrast/harmony; typography/spacing/polish ≥ 9
- [ ] Signature plan scene legible & large at every viewport; pin length justified & shorter; no blank/tiny-plan frames on mobile
- [ ] Inner public pages + each role's top pages rated ≥ 8 (target 9) on real logged-in screens; app screens ≥ 8
- [ ] CSS ≤ 33k lines, `!important` = 0, Stylelint + size gates green
- [ ] CI green on last 30 commits, no overrides · `REPORT.md` with before/after media, rubric tables, tool-usage table, honest gaps

## Commit ledger
| sha | gates | CI | note |
|---|---|---|---|
| 5d4468a5 | (base) | CI ✅ / Size ✅ / Keep-warm ❌ (warm-only) | r332 HEAD |
| 7d4ba8b8 | docs-only | CI ✅ | kickoff ledger |
| d044f159 | docs+tools | CI ✅ | PHASE 1: heron-craft/rubric/judge/css-baseline/arsenal |
| cf5c5adf | local ✅ | CI ❌ bundle+E2E | WAVE 2 (P-B/P-C/P-D/PI-45/46) |
| e424f1a2 | local ✅ | CI ❌ (inherited + stale r306 pins) | WAVE 3 (stack/PI-B1-3/matrix P-F) |
| 87627cd4 | local ✅ | CI cancelled (superseded) | RED-MAIN ROOT FIX: gsap OUT (773.4≤776, 0 ceiling change), r308 renamed |
| 7637d334 | local ✅ | CI ❌ (r309/r311 .sl pins) | r306 test re-key (21/21) |
| a0f166fe | local ✅ (r309 23/23, r311 12/12) | CI ⏳ | entrance contract restored INTO Preloader |
| 6e005f65 | local ✅ | CI ⏳ | WAVE 4 (P-A1 media/P-F2 matrix complete/P-F3 fixes/P-G1 rated) |

Red-main events: cf5c5adf+e424f1a2+7637d334 — every root fixed (bundle, selectors, clock/lock/instrument contract), no assertions weakened, no ceilings moved.

## Environment events
- Sandbox reset #3: rebuilt env from session secrets, cloned @ 5d4468a5.
- vite inotify ENOSPC (fs.inotify.max_user_watches=8192 exhausted): owner-page lazy chunks 504 under default watcher → use polling (media-capture.md).
- Sibling session detected on feat/mobile-* branch (owner's) — main unaffected; lead touches main only.

## Tools actually used (unproven claims are void)
| tool | invoked | commit | artifact |
|---|---|---|---|
| Actions API CI check | every push | 7d4ba8b8→ | ledger rows |
| Playwright twin harness | P-F/P-F2 | e424f1a2/6e005f65 | run-matrix 9 sec × 4 vps × 2 sides |
| PIL (thumbs, pixel-diff, md5 A/B) | PI-B1/2/3, PI-45/46 | e424f1a2/cf5c5adf | byte-identical landing proofs |
| Playwright product capture @2× | P-A1 | 6e005f65 | 11 webp (2880×1740) + repo assets |
| embedded PG16 (local-db.mjs) | A-Stack | e424f1a2 | stack.md recipe, 3-role login proof |
| WebKit user-space libs | A-Scout | d044f159 | webkit-userland.sh, launch OK 26.4 |
| gsap 3.15 → REMOVED | red-main fix | 87627cd4 | bundle 817.6→773.4 KB gz |
| vitest 3080 tests | waves 2-4 | cf5c5adf→ | green (r306 re-keyed) |
| E2E playwright (local) | r308/r309/r311/prod-verify | a0f166fe | 41 specs green |

## Wave status
- A-Scout ✅ · A-Inventory ✅ (24 rows/20 tickets) · A-Judge ✅ (rubric+machinery) · A-CSS ✅ (census+50 PI tasks)
- P-B ✅ (plan 72.4% @1440, labels ≥13.9px, mobile edge-to-edge, twin 0-delta)
- P-C ✅ (reveals — gsap-free after root fix; type rungs; Arabic shaping guard)
- P-D ✅ (preloader w/ full r309 contract; cursor sheet clean; wordmark — letterbox restored by P-F3 ≥768)
- P-A1 ✅ (11 product shots) → P-A2 (wire into platform/journey) PENDING
- P-F ✅✅ (matrix complete chromium) → WebKit sweep + dark PENDING
- P-G1 ✅ (19 routes rated) → P-G2 (authed pages) + P-G3 (rebuild <8) PENDING
- P-I: 929 lines deleted (PI-B1/2/3, 45/46) → PI-00 coverage sweep + batch A PENDING
- Rubric blind panel: machinery ready → first full run PENDING

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
