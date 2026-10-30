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
