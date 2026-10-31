# R325 route ledger — P2.4 phase 1 (capture + findings)

> Produced by `scripts/r325/capture-routes.mjs` against the LIVE seeded stack
> (Vite :5173 serving merged main `052c110f`, API :4000, PG16 :5433).
> One row per capture: `audits/evidence/r325/routes/<role>/<slug>-<bp>-<theme>.webp`.
> This ledger is the P2.4/P2.6 fix queue; every defect carries its evidence path.

## Coverage

| Role | Captures done | Notes |
|------|--------------:|-------|
| student | 264 | 25 routes × 1440/768/390 × paper/ink (+mid-scroll @1440 for long pages) |
| teacher | 156 | 16 routes × 6 |
| owner | 108 | 13 routes × 6 (+feedback-inbox re-verified post-fix) |
| registrar | 96 | 16 routes × 6 |
| quality | 84 | 10 routes × 6 |
| faculty | 18 | dashboard/faculties/students × 6 |
| head | 12 | dashboard × 6 |
| dean | 12 | dashboard × 6 |
| vicedean | 12 | dashboard × 6 |
| guest | 6 | /auth + landing |
| system | 2 | the wedged /owner/system probes (Y7) |
| **total** | **770** | 6 honest skips: `/student/document-viewer` needs a `:filename` param — captured via the flows (F11) instead |

## Fixed during the sweep

| Defect | Evidence | Fix |
|--------|----------|-----|
| `rows.map is not a function` — the owner feedback inbox crashed into the error boundary (12 console hits) | manifest consoleErrors @owner/* | `feedback.ts` queryFn resolved the raw AxiosResponse; the page read the API envelope as the rows array — resolve the BODY (`052c110f`) |

## Findings queue

### Y5-app candidates — INK-ISLAND (29 across 10 routes; P2.6 verifies each: text/raster content vs a real surface island)

| Route | Hits | Sample evidence |
|-------|------|-----------------|
| student/ai | 3 | `audits/evidence/r325/routes/student/ai-1440-ink.webp` |
| student/dashboard | 3 | `audits/evidence/r325/routes/student/dashboard-1440-ink.webp` |
| student/forbidden-owner-users | 3 | `audits/evidence/r325/routes/student/forbidden-owner-users-1440-ink.webp` |
| student/gamification | 3 | `audits/evidence/r325/routes/student/gamification-1440-ink.webp` |
| student/lecture-player | 3 | `audits/evidence/r325/routes/student/lecture-player-1440-ink.webp` |
| student/profile | 3 | `audits/evidence/r325/routes/student/profile-1440-ink.webp` |
| student/research | 3 | `audits/evidence/r325/routes/student/research-1440-ink.webp` |
| student/results | 3 | `audits/evidence/r325/routes/student/results-1440-ink.webp` |
| student/university | 2 | `audits/evidence/r325/routes/student/university-1440-ink.webp` |
| teacher/ai | 3 | `audits/evidence/r325/routes/teacher/ai-1440-ink.webp` |

### Wedged main threads (Y7 class) — DOM probe did not settle

- `student/courses`

### Horizontal overflow (scrollW > innerW)

0 captures — NONE

### Console errors (non-noise)

- ×12 `rows.map is not a function`
- ×6 `The above error occurred in the <FeedbackInboxPage> component:

    at FeedbackInboxPage (http://loc`
- ×6 `[ErrorBoundary] uncaught render error TypeError: rows.map is not a function
    at FeedbackInboxPage`

### Overlap probe notes

The DOM overlap scan reports `div.sheet-frame × nav.sidebar / header.topbar / div.sheet-grain` on every

route — the sheet-frame IS the fixed page backdrop by design (z-index ordering verified in the shell

evidence); recorded as probe noise, NOT a defect. The Y6 pairwise bottom-stack probe is the authoritative

overlap gate.

---

## P2.4/P2.6 verification — 2026-10-31 (R327 E5, task 5)

> Re-verified against the LIVE stack (Vite :5173 · API :4000 · PG16 :5433,
> **re-seeded since the capture** — cuids and the student's
> `onboardingCompletedAt` changed). Full evidence + method:
> `audits/evidence/r327/p2p6/README.md`. The r325 originals are untouched.

### P2.6 — the 29 INK-ISLAND candidates judged: 0 islands, 29 false-positives

Every flagged light mass resolves to the §R305 **deep-band inversion**
family — `.r305s-band--deep` / `.r305rp-band--deep` and their consumers
(`.dash-resume-card`/`.stu-hero`, `.r305p-hero`, `.ai-surface-head`,
`.r305g-level`, `.r305rp-res-band`, `.results-summary`, `.lecture-meta`,
`.r305u-facts`). Per the canon (r305-student.css §3): *«the Heron
inversion — ink ground in light theme, paper ground in dark (the neutral
scale flips), so the band always contrasts its page»* — the same register
the Y5-landing closure accepted («st-poché and the slide rules correctly
INVERT to paper in Ink», `d07a6966`). NOT islands: the ground rides
`var(--neutral-900)` and the ink `var(--neutral-0)` — one flipping ramp,
zero literals.

| Route (bps) | Element at the flagged box (live probe) | Verdict |
|-------|------|---------|
| student/ai (1440/768/390) | `.ai-surface-head.r305rp-band--deep` | false-positive — designed inversion |
| student/dashboard (1440/768/390) | `.dash-resume-card.stu-hero.r305s-band--deep` | false-positive — designed inversion |
| student/forbidden-owner-users (1440/768/390) | the 403-bounce dashboard's same resume card | false-positive — designed inversion |
| student/gamification (1440/768/390) | `.r305g-level-*` inside `.r305s-band--deep` (+ink-ramp text) | false-positive — designed inversion |
| student/lecture-player (1440/768/390) | `.lecture-meta.r305s-band--deep` under the player (poster = raster content) | false-positive — designed inversion |
| student/profile (1440/768/390) | `.r305p-hero.r305s-band--deep` | false-positive — designed inversion |
| student/research (1440/768/390) | `section.r305rp-band--deep.r305rp-res-band` | false-positive — designed inversion |
| student/results (1440/768/390) | `.results-summary.r305s-band--deep` | false-positive — designed inversion |
| student/university (1440/768) | `.r305u-facts` inside `.r305s-band--deep` | false-positive — designed inversion |
| teacher/ai (1440/768/390) | `.ai-surface-head.r305rp-band--deep` | false-positive — designed inversion |

**Counts: island 0 · content 0 (dominant surface) · false-positive 29.**

Proof (instruments, all live):

- **Token flip** (`/student/results`): light → band `rgb(40,40,40)`+white
  fg; dark → band `rgb(246,246,238)`+`rgb(46,46,46)` fg. Both poles of
  one ramp; grep across the serving sheets finds no raw light literals
  outside token-definition sites / comments / the `/__brand` exhibit.
- **Computed-style probe** (`audits/evidence/r327/p2p6/ink-app/ink-island-probe.json`
  + `ink-island-reprobe.json`): the flagged boxes land on the band family
  at the paper pole with DARK band text; the remaining samples are
  ink-ramp text masses or the player's raster poster.
- **Contrast on the paper pole** (live, dashboard resume card): main
  12.5:1 · course 12.5:1 · eyebrow 7.92:1 — all clear the 4.5 floor.
- **VLM review** of 4 representative shots (dashboard, teacher/ai,
  results, research): «deliberate high-contrast inverted callout… no
  other light surfaces out of place» — every verdict PARITY-OK.
- **Bonus**: the onboarding modal the fresh seed re-armed over the
  student dashboard is itself ink-themed (modal-card lum .013–.027,
  light text, orange CTA) — no island.

Re-captures (instrument-identical to the r325 "before"):
`audits/evidence/r327/p2p6/routes/` — all 10 candidate routes @1440-ink,
10/10 done, **0 console errors, 0 horizontal overflow**; pixel-diff vs
the r325 originals 1.4–13.4 % (the reseed's data deltas, the deep-band
regions unchanged). **No fix was needed — there was no real island to
tokenize.**

### P2.4 — the wedged student/courses thread: SETTLED (not reproduced)

The `probe-timeout` (Y7-class) did not reproduce — 3 consecutive live
attempts with the SAME inspectors() contract + the Y7 instruments:
inspectors 7/34/5 ms · screenshots 273/456/317 ms (Y7's hang signature
was 260 s) · rAF 135/151/133 frames per 3 s · **0 long tasks** ·
0 skeletons/error-text/jargon; the three shots byte-identical
(`audits/evidence/r327/p2p6/p2p4/`). The Y7 fix (`e7301d94`) landed
after the capture; this route's wedge was never root-caused, so the
closure is **verified settled**, not root-caused.

### P2.4 — the queue's 66 MISSING findings reconciled

`ledger-findings.json` was generated **mid-sweep**: 56 of the 66 MISSING
rows completed later in the same sweep (final manifest: 774 done + 6
honest skips; every authenticated role×route×bp×theme capture verified
on disk). The 10 genuinely absent: `system/403` + `system/design` beyond
their single 390-ink shot each — recorded gaps (the guest family stays
the @1440-paper spot-check by design; guest surfaces carry the Y4
census + Y5-landing evidence).

### What stays open after this pass

- `student/document-viewer` — the 6 honest skips (no seeded file
  resolves; covered by flows F11).
- `system/403` + `system/design` — 10 uncaptured surfaces (above).
- The 413-quota message surface (Y8) — fixed on the R327 E row
  (`89bc0734`), outside this ledger's queue.
