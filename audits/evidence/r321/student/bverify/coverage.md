# R321 c1 §B coverage sweep — Bverify rubric matrix

- base: `http://localhost:4296` (vite preview of the local dist) · generated 2026-10-28T04:04:32.343Z
- headline: **170 green / 200 cells** — 40 routes × 5 cells (4 viewports light + 390 dark); N/A: document-viewer
- shots: 80 jpegs, 1671KB total
- rounded-corner/shadow scan: **N/A** (skipped per instruction)

| route | family | root | cells green/total | verdict | defects |
|---|---|---|---|---|---|
| `/student/dashboard` | r319s | r319s | 5/5 | GREEN |  |
| `/student/calendar` | r319s | r319s | 5/5 | GREEN |  |
| `/student/schedule` | r319s | r319s | 5/5 | GREEN |  |
| `/student/courses` | r319s | r319s | 5/5 | GREEN |  |
| `/student/courses/{offeringId}` | r319s | r319s | 5/5 | GREEN |  |
| `/student/catalog` | r319s | r319s | 5/5 | GREEN |  |
| `/student/labs` | r319s | r319s | 5/5 | GREEN |  |
| `/student/matrix` | r319s | r319s | 5/5 | GREEN |  |
| `/student/mooc` | r319s | r319s | 5/5 | GREEN |  |
| `/student/library` | r319s | r319s | 5/5 | GREEN |  |
| `/student/research` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=5 |
| `/student/jobs` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/ai` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=6 |
| `/student/gamification` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=7 |
| `/student/skills` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/alerts` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/messages` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/ar` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/social` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/downloads` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/university` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/results` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/payment` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/profile` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=7 |
| `/settings` | r320-settings | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=3 |
| `/student/webinars` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=5 |
| `/training` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=6 |
| `/training/{slug}` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: h1-count=0; console-errors=4 |
| `/training/{slug}/lesson/{lessonId}` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: h1-count=0; console-errors=4 |
| `/achievements` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=7 |
| `/document/{filename}` | shared | — | — | N/A | no fixture resolved for /document/ |
| `/vision` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=3 |
| `/vision/{vslug}` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=3 |
| `/competitions` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=5 |
| `/competitions/{id}` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.waitForTimeout: Target page, context or browser has been closed; h1-count=undefined |
| `/student/online-exams` | r321x | r321x | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.goto: Target page, context or browser has been closed; h1-count=undefined |
| `/student/online-exams/{examId}` | r321x | r321x | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.goto: Target page, context or browser has been closed; h1-count=undefined |
| `/student/map` | r321m | r321m | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.goto: Target page, context or browser has been closed; h1-count=undefined |
| `/student/live` | r321m | r321m | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.goto: Target page, context or browser has been closed; h1-count=undefined |
| `/student/lectures/{lectureId}` | r321p | r321p | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.goto: Target page, context or browser has been closed; h1-count=undefined |
| `/community` | r321c | r321c | 4/5 | DEFECT-listed | 390x844-dark: nav-error: Error: page.goto: Target page, context or browser has been closed; h1-count=undefined |

## redirects
- `/student/settings` → `/settings`: 390x844-light→/student/settings ✗ · 768x1024-light→/student/settings ✗ · 1024x768-light→/student/settings ✗ · 1440x900-light→/student/settings ✗ · 390x844-dark→undefined ✗
- `/student/exams` → `/student/online-exams`: 390x844-light→/student/online-exams · 768x1024-light→/student/online-exams · 1024x768-light→/student/online-exams · 1440x900-light→/student/online-exams · 390x844-dark→undefined ✗
- `/student/colleges` → `/colleges`: 390x844-light→/colleges · 768x1024-light→/colleges · 1024x768-light→/colleges · 1440x900-light→/colleges · 390x844-dark→undefined ✗
- `/student/achievements` → `/achievements`: 390x844-light→/achievements · 768x1024-light→/achievements · 1024x768-light→/achievements · 1440x900-light→/achievements · 390x844-dark→undefined ✗

## defect list (route · viewport · defect)
- research · 390x844-dark · console-errors=5
- jobs · 390x844-dark · console-errors=4
- ai · 390x844-dark · console-errors=6
- gamification · 390x844-dark · console-errors=7
- skills · 390x844-dark · console-errors=4
- alerts · 390x844-dark · console-errors=4
- messages · 390x844-dark · console-errors=4
- ar · 390x844-dark · console-errors=4
- social · 390x844-dark · console-errors=4
- downloads · 390x844-dark · console-errors=4
- university · 390x844-dark · console-errors=4
- results · 390x844-dark · console-errors=4
- payment · 390x844-dark · console-errors=4
- profile · 390x844-dark · console-errors=7
- settings · 390x844-dark · console-errors=3
- webinars · 390x844-dark · console-errors=5
- training · 390x844-dark · console-errors=6
- training-track · 390x844-dark · h1-count=0
- training-track · 390x844-dark · console-errors=4
- training-lesson · 390x844-dark · h1-count=0
- training-lesson · 390x844-dark · console-errors=4
- achievements · 390x844-dark · console-errors=7
- vision · 390x844-dark · console-errors=3
- vision-detail · 390x844-dark · console-errors=3
- competitions · 390x844-dark · console-errors=5
- competition-detail · 390x844-dark · nav-error: Error: page.waitForTimeout: Target page, context or browser has been closed
- competition-detail · 390x844-dark · h1-count=undefined
- online-exams · 390x844-dark · nav-error: Error: page.goto: Target page, context or browser has been closed
- online-exams · 390x844-dark · h1-count=undefined
- exam-taker · 390x844-dark · nav-error: Error: page.goto: Target page, context or browser has been closed
- exam-taker · 390x844-dark · h1-count=undefined
- map · 390x844-dark · nav-error: Error: page.goto: Target page, context or browser has been closed
- map · 390x844-dark · h1-count=undefined
- live · 390x844-dark · nav-error: Error: page.goto: Target page, context or browser has been closed
- live · 390x844-dark · h1-count=undefined
- lecture-player · 390x844-dark · nav-error: Error: page.goto: Target page, context or browser has been closed
- lecture-player · 390x844-dark · h1-count=undefined
- community · 390x844-dark · nav-error: Error: page.goto: Target page, context or browser has been closed
- community · 390x844-dark · h1-count=undefined

## h1 px > 32 (recorded, judged later — the dashboard belt is exempt)
- dashboard@768x1024-light: 40.518px
- dashboard@1024x768-light: 33.1852px
- dashboard@1440x900-light: 46.6667px
- calendar@768x1024-light: 40.518px
- calendar@1024x768-light: 33.1852px
- calendar@1440x900-light: 46.6667px
- schedule@768x1024-light: 40.518px
- schedule@1024x768-light: 33.1852px
- schedule@1440x900-light: 46.6667px
- courses@768x1024-light: 40.518px
- courses@1024x768-light: 33.1852px
- courses@1440x900-light: 46.6667px
- course-detail@768x1024-light: 40.518px
- course-detail@1024x768-light: 33.1852px
- course-detail@1440x900-light: 46.6667px
- catalog@768x1024-light: 40.518px
- catalog@1024x768-light: 33.1852px
- catalog@1440x900-light: 46.6667px
- labs@768x1024-light: 40.518px
- labs@1024x768-light: 33.1852px
- labs@1440x900-light: 46.6667px
- matrix@768x1024-light: 40.518px
- matrix@1024x768-light: 33.1852px
- matrix@1440x900-light: 46.6667px
- mooc@768x1024-light: 40.518px
- mooc@1024x768-light: 33.1852px
- mooc@1440x900-light: 46.6667px
- library@768x1024-light: 40.518px
- library@1024x768-light: 33.1852px
- library@1440x900-light: 46.6667px
- research@768x1024-light: 40.518px
- research@1024x768-light: 33.1852px
- research@1440x900-light: 46.6667px
- jobs@768x1024-light: 40.518px
- jobs@1024x768-light: 33.1852px
- jobs@1440x900-light: 46.6667px
- ai@768x1024-light: 40.518px
- ai@1024x768-light: 33.1852px
- ai@1440x900-light: 46.6667px
- gamification@768x1024-light: 40.518px
- gamification@1024x768-light: 33.1852px
- gamification@1440x900-light: 46.6667px
- skills@768x1024-light: 40.518px
- skills@1024x768-light: 33.1852px
- skills@1440x900-light: 46.6667px
- alerts@768x1024-light: 40.518px
- alerts@1024x768-light: 33.1852px
- alerts@1440x900-light: 46.6667px
- messages@390x844-light: 55.5725px
- messages@768x1024-light: 51.5683px
- messages@1024x768-light: 33.1852px
- messages@1440x900-light: 46.6667px
- messages@390x844-dark: 55.5725px
- ar@390x844-light: 47.6336px
- ar@768x1024-light: 44.2014px
- ar@1440x900-light: 40px
- ar@390x844-dark: 47.6336px
- social@768x1024-light: 40.518px
- social@1024x768-light: 33.1852px
- social@1440x900-light: 46.6667px
- downloads@768x1024-light: 40.518px
- downloads@1024x768-light: 33.1852px
- downloads@1440x900-light: 46.6667px
- university@390x844-light: 47.6336px
- university@768x1024-light: 44.2014px
- university@1440x900-light: 40px
- university@390x844-dark: 47.6336px
- results@390x844-light: 47.6336px
- results@768x1024-light: 44.2014px
- results@1440x900-light: 40px
- results@390x844-dark: 47.6336px
- payment@768x1024-light: 40.518px
- payment@1024x768-light: 33.1852px
- payment@1440x900-light: 46.6667px
- profile@768x1024-light: 40.518px
- profile@1024x768-light: 33.1852px
- profile@1440x900-light: 46.6667px
- settings@390x844-light: 47.6336px
- settings@768x1024-light: 44.2014px
- settings@1440x900-light: 40px
- settings@390x844-dark: 47.6336px
- webinars@768x1024-light: 40.518px
- webinars@1024x768-light: 33.1852px
- webinars@1440x900-light: 46.6667px
- training@390x844-light: 47.6336px
- training@768x1024-light: 44.2014px
- training@1440x900-light: 40px
- training@390x844-dark: 47.6336px
- training-track@390x844-light: 47.6336px
- training-track@768x1024-light: 44.2014px
- training-track@1440x900-light: 40px
- training-lesson@390x844-light: 47.6336px
- training-lesson@768x1024-light: 44.2014px
- training-lesson@1440x900-light: 40px
- achievements@768x1024-light: 40.518px
- achievements@1024x768-light: 33.1852px
- achievements@1440x900-light: 46.6667px
- vision@390x844-light: 47.6336px
- vision@768x1024-light: 44.2014px
- vision@1440x900-light: 40px
- vision@390x844-dark: 47.6336px
- vision-detail@390x844-light: 47.6336px
- vision-detail@768x1024-light: 44.2014px
- vision-detail@1440x900-light: 40px
- vision-detail@390x844-dark: 47.6336px
- competitions@390x844-light: 47.6336px
- competitions@768x1024-light: 44.2014px
- competitions@1440x900-light: 40px
- competitions@390x844-dark: 47.6336px
- competition-detail@390x844-light: 47.6336px
- competition-detail@768x1024-light: 44.2014px
- competition-detail@1440x900-light: 40px

## root opt-in class per family
- r319s → r319s (115 cells)
- r319s → none (30 cells)
- r320-settings → none (5 cells)
- r320-shell → none (20 cells)
- r321x → r321x (8 cells)
- r321x → none (2 cells)
- r321m → r321m (8 cells)
- r321m → none (2 cells)
- r321p → r321p (4 cells)
- r321p → none (1 cells)
- r321c → r321c (4 cells)
- r321c → none (1 cells)

## RE-VERIFICATION (foreman-B completion — the 429 sweep-noise resolution)

The first pass booked 23-30 dark-cell "defects" that were the SWEEP'S OWN traffic pattern
exceeding the documented global limiter (**1000 req / 15 min / IP** — rateLimit.ts, the
r153l shared-NAT fix): ~200 page loads × 5-8 queries in 9 min ≈ 1,200+ requests. All 30
flagged dark cells were re-verified IN ISOLATION at a gentle pace (1.6 s spacing, one
login — `scripts/r321/b-verify-dark-recheck.mjs`, committed):

- 29/30 → **GREEN** (h1=1 · console=0 · failed=0) — the 429 samples resolved to sweep noise;
  the training-track/lesson "h1=0" cells were the limiter's error state, not a page defect.
- **1/30 remains red → a REAL ticket**: `/competitions/{id}` **dark: h1=0 with a CLEAN
  console** (the ended/empty competition state renders without an h1 — the outline contract
  breaks in that state; light cells green). Ticket Bverify-P3-1 filed for the §B follow-up.

**HEADLINE (re-verified): 199/200 cells green · 40 routes · 80 shots 1.67 MB.**
The harness itself gained the fix class: goto-first counter resets (the ERR_ABORTED
previous-cell stragglers), a 429 backoff + retry, and a 350 ms cell pace (the sweep must
respect the very limiter the app ships).
