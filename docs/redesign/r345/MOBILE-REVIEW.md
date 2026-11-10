# R345 F — mobile 390×844 VLM review (Metro web, hermetic API)

Harness: `scripts/r345/mobile-review.mjs` (boots Metro web on :8082, seeds
theme + session in localStorage, intercepts `**/api/v1/**` with role users +
empty-list payloads so the designed empty states render; light+dark per
screen). Judge: `z-ai-web-dev-sdk` VLM, 6-criterion rubric (Arabic ≥14px ·
touch ≥44pt · RTL · theme · safe areas · state quality), 0–10.
Round 1 defect found + fixed: session-seed gap made every authed screen
show the Welcome + a dev-error toast (scores 5–6); with the seed fixed the
same screens score 8–9.5. auth-light 7.5 → hero band 300→348 → 8.5.
search 7 → journey-route illustration seat → 9.

| screen | light | dark |
|---|---|---|
| / (boot→welcome) | 8.5 | 9.3 |
| /auth | 8.5 | 9.0 |
| /select-institution (no membership) | 8.2 | 8.0 |
| /campus (cards) | 8.0 | 8.7 |
| /achievements | 9.0 | 9.5 |
| /community | 8.0 | 9.3 |
| /search | 9.0 | 9.0 |
| /help | 8.0 | 8.5 |
| /student/dashboard | 8.5 | 8.0 |
| /student/courses (empty → role-student art) | 9.0 | 9.4 |
| /student/library (empty → journey-library) | 9.0 | 9.0 |
| /student/research (empty → problem-04) | 9.0 | 9.0 |
| /student/matrix (empty → problem-03) | 9.0 | 9.0 |
| /student/ai | 9.0 | 9.0 |
| /student/alerts | 9.0 | 8.0 |
| /student/profile | 8.0 | 8.0 |
| /teacher/dashboard | 9.0 | 9.0 |
| /teacher/exams (empty → role-teacher) | 8.0 | 9.5 |

**36/36 ≥ 8.0 · avg 8.72** (judged.json: /tmp/r345/mobile/judged.json).
Judge noise (not defects, recorded): StackHeader back arrow already points
RIGHT (RTL-correct); some judges misread it. Residuals (below score impact,
not blockers): profile "blue طالب chip" (status tone, not accent), sparse
middles on empty-state screens (by design — `fill` centering).
