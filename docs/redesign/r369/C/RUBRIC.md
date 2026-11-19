# R369 · C1.5 — the authenticated-page rubric (paired contact sheets)

Method: 12 representative pages (the page families across all five roles) captured at
{390, 1440} light on the hermetic seed, paired with the landing's own design-language
exemplar at the same widths from the SAME build (sheet = page-pair over landing-pair).
12 sheets ≤ the 40-sheet budget; committed at 780 KB (≤ 1.5 MB policy) under
`docs/audit/evidence/r369/rubric/`. Judging = my own read of each sheet assisted by a
VLM pass, with every VLM note cross-checked against measurement or documented design
intent (the T6 law: a note contradicted by measurement or intent is REJECTED and the
reason recorded — five of the raw notes were).

The axes: composition/alignment · type hierarchy · spacing rhythm/hairlines ·
colour/contrast consistency (warm paper, ONE orange accent) · one-primary-action clarity.

| page (family) | VLM raw | my rating | accepted defects (state) | rejected notes (reason) |
|---|---:|---:|---|---|
| student-dashboard (dashboard) | 4.3 | **4.3** | week-strip cell padding tight @390 (minor, watch) | bell chrome = allowed app chrome |
| student-courses (list) | 3.3 | **3.8** | accent dilution: pills+badges+links all carry orange weight (minor, recorded) | 1440 "empty canvas" = the 72ch measure cap by design |
| exam-taker (form) | 3.8 | **4.0** | kicker baseline crowding (minor) | — |
| student-ai (tool) | 3.4 | **4.0** | suggestion-chip wrap rhythm (minor) | "stray orange square in composer" — composer below the capture fold; focused re-look found nothing |
| teacher-dashboard (dashboard) | 3.8 | **4.3** | — | "(NOT_IMPLEMENTED) leak" = the documented support-code seat (States.tsx, mono <bdi> by design); title-duplication = topbar chrome vs page h1 |
| admin-students (table list) | 4.0 | **4.2** | rail inset rhythm (minor) | "(05) badge collides" = the D11 mono gutter index by design |
| admin-import (wizard form) | 3.2 | **4.0** | stepper chip wrap @390 (minor) | "two orange buttons compete" — focused re-look: «متابعة» renders clearly disabled/dimmed (~55% opacity), the honest initial state |
| owner-institutions (list) | 3.8 | **4.0** | — | header-crowding + form/table notes — the focused header re-look returned "normal dense RTL header, nothing concretely wrong"; the form-crop response was hallucinated HTML (discarded) |
| quality-moderation (list/detail) | 4.0 | **4.0** | title-to-edge breathing @390 (minor) | "orphan ح glyph" = avatar monogram by design; bottom-nav cut = sheet crop artifact |
| settings (form) | 3.9 | **4.0 → after fix** | **FIXED at the root**: the password trio spanned ~1015–1050px inside the 1440px card — capped to `min(560px, 100%)` (ChangePasswordCard, both hosts: /settings + student profile). Measured before 1050 → after 560 @1440, 316 @390 | icon-rail borders = shell chrome |
| community (feed) | 3.8 | **4.1** | tab-row to stats gap (minor) | the error-state support-code note (same rejection as teacher-dashboard) |
| training (catalog) | 3.8 | **3.8** | filter-pill float rhythm @390 (minor, recorded) | icon cluster = topbar chrome |

**Mean 4.04 · every page ≥ 3.8 · zero pages ≤ 3** (the ≤3 fix-all threshold never
triggered). Key-page floors (dashboards, primary lists, the exam flow): 4.0+.

The root fix shipped from this pass (the only >minor finding):
`frontend/src/components/account/ChangePasswordCard.tsx` — the form measure cap
(`maxInlineSize: 'min(560px, 100%)'`), verified by measurement: 1050px → 560px @1440,
316px @390 (PW-WIDTH probe, this round). Re-capture: `/tmp/r369/rubric2/settings-form-1440.png`.

Residuals carried (all minor, none ≤ 3): courses accent dilution, training filter-pill
rhythm, moderation title breathing, week-strip cell padding, chip-wrap rhythm on ai
suggestions + the import stepper.
