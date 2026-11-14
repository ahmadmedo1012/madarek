# R350 LANE S — SEARCH-DESIGN (S1)

The design for «بحثٌ يجد كل شيء» — ONE engine, every entity, role-honest.
Written against main@89c110fe. Evidence-first: every row cites the file
that owns it today.

## 0. The reconciliation — TWO engines become ONE

Today there are two (three, counting /directory):

| surface | endpoint | categories | consumers | fate |
|---|---|---|---|---|
| the dropdown search | `GET /search/global` (search.routes.ts:161) | courses, lectures, papers, tracks | web GlobalSearch + CommandPalette + mobile | **retired into the discovery engine; the route keeps answering (triple-pinned shape) but is served BY the same core** |
| the G1 discovery engine | `GET /search/discover` (search.routes.ts:506) | students, teachers, institutions, faculties, departments, courses, announcements | NONE yet (S5/S6 wire it) | **becomes the ONE engine** |
| the staff directory | `GET /directory` (profiles.routes.ts:693) | people (phones, prefix) | admin directory page | stays a SPECIALIZED surface (exports, audit); its name arm adopts the v2 normalizer so the two never drift |

The dropdown's 4 categories join the discovery engine as first-class
kinds; `/search/global` keeps its pinned wire shape forever (its tests
are law) but its implementation reuses the shared candidate/rank core.

## 1. The entity × field × weight × visibility matrix (the ONE registry)

Ranking tiers (global.ts:143–172, unchanged): `exact(0) < prefix(1) <
substring(2) < none(∞)`; ال-tolerance folded into the tier; phone hits
rank at substring. Field weights apply INSIDE a tier:
`name(1.0) > code/title(0.9) > subtitle/summary(0.7) > description(0.4)`.
nationalId is NEVER indexed or returned (identity law).

| kind | model | fields (weight) | visibility per role | href |
|---|---|---|---|---|
| student | User + StudentProfile | firstName+lastName (1.0), nameAr (0.9), universityId exact (1.0) | STUDENT: none. TEACHER: own rosters. ADMIN/QUALITY: institution. OWNER: all | ADMIN+: `/admin/people/:id`; teacher: roster view |
| teacher | User + TeacherProfile | firstName+lastName (1.0), nameAr (0.9), employeeId exact (1.0) | STUDENT: none. others: institution (QUALITY: name-only) | `/admin/people/:id` |
| institution | Institution | name (1.0), nameEn (0.9), slug exact | everyone: own institution (OWNER: all) | `/colleges`/`/admin/faculties` |
| faculty | Faculty | name (1.0), nameEn (0.9) | institution-scoped (OWNER: all) | `/admin/faculties` |
| department | Department | name (1.0), nameEn (0.9) | faculty-of-institution scope | `/admin/faculties` |
| course | CourseOffering+Course | course.name (1.0), course.code exact (1.0), course.nameEn (0.8) | STUDENT: active enrollments. TEACHER: own. ADMIN/QUALITY/OWNER: institution(+) | role-href matrix (courseHitHref, unchanged) |
| lecture | Lecture | title (1.0), description (0.4) | offering visibility (offeringVisibilityFilter) | lectureHitHref (unchanged) |
| material | Material (NEW) | name (1.0), description (0.4) | offering visibility | `/student/materials`·teacher variant |
| paper | ResearchPaper | title (1.0), abstract (0.4) | PUBLISHED + fileUrl not null | `/document/<base>?paper=` |
| track | TrainingTrack | title (1.0), titleEn (0.9), summary (0.4) | isPublished | `/training/track/:slug` |
| book | Book (NEW) | title (1.0), author (0.7), category (0.5) | authenticated (library is shared) | `/student/library`·role variants |
| job | Job (NEW) | title (1.0), company (0.7) | authenticated | `/student/jobs` |
| event | CampusEvent (NEW) | title (1.0) | institution-scoped | `/community` |
| announcement | Announcement | title (1.0) | the r323 audience facts per role (unchanged) | `/admin/community`·role variants |
| question (staff) | Question+QuestionCategory | prompt (1.0), category.title (0.6) | TEACHER/QUALITY/ADMIN/OWNER only (isApproved first) | `/quality/exam-moderation`·teacher bank |

phone arm (unchanged): ADMIN/OWNER/QUALITY(registrar) students-by-phone,
institution-re-pinned; returns normalized columns only.

## 2. Normalisation v2 — the shared corpus (S2)

One canonical corpus, three mirrors (backend `modules/search/normalize.ts`,
frontend `lib/search.ts`, mobile imports the frontend law via its own thin
copy of the same fold — byte-pinned by a shared test):

- today's fold (diacritics, tatweel, آأإٱ→ا, ؤ→و, ئ→ي, ء→'', ى→ي, ة→ه)
- **+ Eastern-Arabic/Persian digit folding** (٠-٩/۰-۹ → 0-9) at the QUERY
  edge (IDs typed with Arabic keyboard digits must hit)
- **+ clitic tolerance**: leading و/ب/ل/ف/ك + ال (والـ، بالـ، للـ، فالـ، كالـ)
  stripped in the MATCH direction only (never rewrites the stored term)
- **+ zero-width joiners/non-joiners/BOM/presentation-forms** (U+200B-200F,
  U+FE70-FEFF fold via NFKC on the Arabic range only)
- **+ transliteration table** (query-side expansion, ≤8 most common
  Libyan first names both directions: محمد/Mohammed/Muhammad/hamed …,
  أحمد/Ahmed, عبدالله/Abdullah/Abdallah …): expands the VARIANT list the
  engine searches, never the stored data
- **+ phone equivalence** (already law in phones.ts): 09…/+218…/00218…/
  9…/Eastern digits all normalise to one digit string — the engine's
  phone-detection arm already rides it
- **+ name-order tolerance**: «سالم محمد» vs «محمد سالم» — token-set
  equality ranks at exact tier (the people WHERE builds firstName OR
  lastName contains; the re-ranker folds token sets)

## 3. Index plan (S3) — one migration, EXPLAIN-proven

Extends the G1 floor (20261111054500) with the new-entity columns
(all `gin_trgm_ops`, all `IF NOT EXISTS`):

- Lecture.title; Material.name; ResearchPaper.title + abstract
- TrainingTrack.title + titleEn; Course.code (bpchar-replete: text cast)
- Book.title; Job.title; CampusEvent.title
- Question.prompt; QuestionCategory.title
- StudentProfile.nameAr + universityId(btree, exact); TeacherProfile.nameAr
- User.email — **NO** (PII + never a search field; universityId/employeeId
  are the public identifiers)

Proof: local PG 16 (tools/boot-pg.sh), seeded ≥100k rows per hot entity
(synthetic fabric script), `EXPLAIN (ANALYZE, BUFFERS)` before/after per
new category — the p95 budget: server ≤150 ms, end-to-end ≤300 ms.

## 4. The golden set + the CI gate (S4)

`backend/tests/search-eval/` — ≥250 Arabic/English/mixed queries × the
role matrix (student/teacher/admin/quality/owner), each with expected
top-5 ids per role. Harness: builds an in-memory synthetic corpus (fixed
seeded ids), runs the PURE engine (planGlobalQuery + ranker) against it,
scores Recall@1/5/10, MRR, and the p50/p95 of the rank pass; a REGRESSION
vs the committed `baseline.json` fails CI (Recall@5 ≥0.95, MRR ≥0.85 —
the lane targets). Role-leak assertions: a student query NEVER returns
another institution's people or staff-only entities (negative sets).

## 5. Web UI (S5) — the palette grows + a real page

- The palette (CommandPaletteBody) + the topbar pill both migrate to
  `/search/discover` (debounced, abortable, the same TanStack cache key),
  grouped results with icons + highlights, keyboard nav, recents,
  scope chips (الكل/أشخاص/مقررات/محاضرات/مواد/بحوث/كتب/وظائف/أحداث/
  إعلانات/أسئلة[staff-only]), empty state with suggestions, typo
  suggestion (the withinOneEdit law from lib/search.ts), skeletons.
- A full `/search` page (ROUTES.search) with filters + pagination — the
  palette's "عرض كل النتائج" target; lazy route (bundle ceiling: the
  eager GlobalSearch must not grow — page code splits).
- The dropdown 4-category response stays working (its tests are law).

## 6. Mobile UI (S6)

The search screen moves to `/search/discover` with recents/suggestions,
and people results gain the contact actions (tel:/wa.me/SMS/copy — the
PersonContactSheet verbs, ADMIN+ only per phoneVisibility) + the course
row `c.name/c.code` defect fixed (the wire sends title/subtitle).

## 7. What this design does NOT do

- No nationalId search — ever (identity law, identity-guard.mjs).
- No cross-institution people search for STUDENT/TEACHER (privacy law).
- No FTS/tsvector — trgm + tiers covers the ≤120-char q contract; a
  full-text engine is a future lane if the corpus demands it.
- /directory keeps its specialized surface; only its name arm adopts the
  v2 normalizer (one canonical corpus, two consumers).
