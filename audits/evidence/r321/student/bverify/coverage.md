# R321 c1 §B coverage sweep — Bverify rubric matrix

- base: `http://127.0.0.1:4296` (vite preview of the local dist) · generated 2026-10-28T03:43:51.818Z
- headline: **182 green / 205 cells** — 41 routes × 5 cells (4 viewports light + 390 dark)
- shots: 82 jpegs, 1743KB total
- rounded-corner/shadow scan: **N/A** (skipped per instruction)

| route | family | root | cells green/total | verdict | defects |
|---|---|---|---|---|---|
| `/student/dashboard` | r319s | r319s | 0/5 | DEFECT-listed | 390x844-light: failed-requests=21 · 768x1024-light: failed-requests=22 · 1024x768-light: failed-requests=22 · 1440x900-light: failed-requests=19 · 390x844-dark: failed-requests=6 |
| `/student/calendar` | r319s | r319s | 5/5 | GREEN |  |
| `/student/schedule` | r319s | r319s | 5/5 | GREEN |  |
| `/student/courses` | r319s | r319s | 5/5 | GREEN |  |
| `/student/courses/{offeringId}` | r319s | r319s | 5/5 | GREEN |  |
| `/student/catalog` | r319s | r319s | 5/5 | GREEN |  |
| `/student/labs` | r319s | r319s | 5/5 | GREEN |  |
| `/student/matrix` | r319s | r319s | 5/5 | GREEN |  |
| `/student/mooc` | r319s | r319s | 5/5 | GREEN |  |
| `/student/library` | r319s | r319s | 5/5 | GREEN |  |
| `/student/research` | r319s | r319s | 5/5 | GREEN |  |
| `/student/jobs` | r319s | r319s | 5/5 | GREEN |  |
| `/student/ai` | r319s | r319s | 5/5 | GREEN |  |
| `/student/gamification` | r319s | r319s | 5/5 | GREEN |  |
| `/student/skills` | r319s | r319s | 5/5 | GREEN |  |
| `/student/alerts` | r319s | r319s | 5/5 | GREEN |  |
| `/student/messages` | r319s | r319s | 5/5 | GREEN |  |
| `/student/ar` | r319s | ⚠ none | 5/5 | GREEN |  |
| `/student/social` | r319s | r319s | 5/5 | GREEN |  |
| `/student/downloads` | r319s | r319s | 5/5 | GREEN |  |
| `/student/university` | r319s | ⚠ none | 5/5 | GREEN |  |
| `/student/results` | r319s | ⚠ none | 5/5 | GREEN |  |
| `/student/payment` | r319s | r319s | 5/5 | GREEN |  |
| `/student/profile` | r319s | r319s | 5/5 | GREEN |  |
| `/settings` | r320-settings | ⚠ none | 5/5 | GREEN |  |
| `/student/webinars` | r319s | r319s | 5/5 | GREEN |  |
| `/training` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=6 |
| `/training/{slug}` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: h1-count=0; console-errors=4 |
| `/training/{slug}/lesson/{lessonId}` | r319s | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: h1-count=0; console-errors=4 |
| `/achievements` | r319s | r319s | 4/5 | DEFECT-listed | 390x844-dark: console-errors=7 |
| `/document/{filename}` | shared | ⚠ none | 5/5 | GREEN |  |
| `/vision` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=3 |
| `/vision/{vslug}` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=3 |
| `/competitions` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: console-errors=5 |
| `/competitions/{id}` | r320-shell | ⚠ none | 4/5 | DEFECT-listed | 390x844-dark: h1-count=0; console-errors=4 |
| `/student/online-exams` | r321x | r321x | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/online-exams/{examId}` | r321x | r321x | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/map` | r321m | r321m | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/live` | r321m | r321m | 4/5 | DEFECT-listed | 390x844-dark: console-errors=4 |
| `/student/lectures/{lectureId}` | r321p | r321p | 0/5 | DEFECT-listed | 390x844-light: failed-requests=1 · 768x1024-light: failed-requests=2 · 1024x768-light: failed-requests=1 · 1440x900-light: failed-requests=1 · 390x844-dark: h1-count=0; console-errors=4 |
| `/community` | r321c | r321c | 4/5 | DEFECT-listed | 390x844-dark: console-errors=7 |

## redirects
- `/student/settings` → `/settings`: 390x844-light→/student/settings ✗ · 768x1024-light→/student/settings ✗ · 1024x768-light→/student/settings ✗ · 1440x900-light→/student/settings ✗ · 390x844-dark→/student/settings ✗
- `/student/exams` → `/student/online-exams`: 390x844-light→/student/online-exams · 768x1024-light→/student/online-exams · 1024x768-light→/student/online-exams · 1440x900-light→/student/online-exams · 390x844-dark→/student/online-exams
- `/student/colleges` → `/colleges`: 390x844-light→/colleges · 768x1024-light→/colleges · 1024x768-light→/colleges · 1440x900-light→/colleges · 390x844-dark→/colleges
- `/student/achievements` → `/achievements`: 390x844-light→/achievements · 768x1024-light→/achievements · 1024x768-light→/achievements · 1440x900-light→/achievements · 390x844-dark→/achievements

## defect list (route · viewport · defect)
- dashboard · 390x844-light · failed-requests=21
- dashboard · 768x1024-light · failed-requests=22
- dashboard · 1024x768-light · failed-requests=22
- dashboard · 1440x900-light · failed-requests=19
- dashboard · 390x844-dark · failed-requests=6
- training · 390x844-dark · console-errors=6
- training-track · 390x844-dark · h1-count=0
- training-track · 390x844-dark · console-errors=4
- training-lesson · 390x844-dark · h1-count=0
- training-lesson · 390x844-dark · console-errors=4
- achievements · 390x844-dark · console-errors=7
- vision · 390x844-dark · console-errors=3
- vision-detail · 390x844-dark · console-errors=3
- competitions · 390x844-dark · console-errors=5
- competition-detail · 390x844-dark · h1-count=0
- competition-detail · 390x844-dark · console-errors=4
- online-exams · 390x844-dark · console-errors=4
- exam-taker · 390x844-dark · console-errors=4
- map · 390x844-dark · console-errors=4
- live · 390x844-dark · console-errors=4
- lecture-player · 390x844-light · failed-requests=1
- lecture-player · 768x1024-light · failed-requests=2
- lecture-player · 1024x768-light · failed-requests=1
- lecture-player · 1440x900-light · failed-requests=1
- lecture-player · 390x844-dark · h1-count=0
- lecture-player · 390x844-dark · console-errors=4
- community · 390x844-dark · console-errors=7

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
- document-viewer@390x844-light: 63.5115px
- document-viewer@768x1024-light: 58.9353px
- document-viewer@1024x768-light: 37.9259px
- document-viewer@1440x900-light: 53.3333px
- document-viewer@390x844-dark: 63.5115px
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
- shared → none (5 cells)
- r320-shell → none (20 cells)
- r321x → r321x (10 cells)
- r321m → r321m (10 cells)
- r321p → r321p (5 cells)
- r321c → r321c (5 cells)
