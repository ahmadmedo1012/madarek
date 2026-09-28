# 5-A3 — Typography micro-craft audit (Campaign 5 «الحرفة الختامية»)

**Scope:** whole frontend — tokens.css type tokens, all 15 stylesheets, rendered pages.
**Method:** measure rendered, not declared. Playwright chromium (`chromium-1243`), FE :5173 + BE :4000 live,
storage-state auth. **15 rendered surfaces**: landing, auth, student-dashboard (1440+390),
student-exams, student-results, student-library, community, teacher-dashboard, teacher-grades,
teacher-research, admin-dashboard, admin-students, vision, colleges-leaderboard, owner-dashboard,
command-palette. **Both themes** measured on 4 surfaces (post-boot `data-theme="dark"` flip, no
localStorage). Viewports 390 / 768 / 1440. ~180 computed-style samples + 95 orphan/margin/truncation
rows + canvas tnum truth-test. Probes: `.agents/tmp/a3-probe{1..8}.{mjs,json}`.
**AUDIT ONLY — zero source files modified.**

Reference lens: `scroll-craft/references/taste.md` §Typography + AGENTS-BRIEF §2 design world
(IBM Plex Sans Arabic 400/500/600/700, role tokens `--type-*`, ruling #2: no tracking on Arabic).

---

## 1. Type-token census (declarations)

### 1a. Raw `--fs-*` vs role `--type-*` consumption per stylesheet

| file | `var(--fs-*` | `var(--type-*` | verdict |
|---|---|---|---|
| tokens.css | 21 | 0 | the scale itself — correct home |
| base.css | 4 | 1 | foundation (h1-h3/body) — acceptable |
| auth.css | 0 | 39 | **exemplary** — fully role-migrated |
| student.css | 21 | 78 | mostly migrated |
| landing.css | 19 | 63 | mostly migrated |
| components.css | 69 | 57 | **heaviest raw consumer** |
| colleges.css | 44 | 34 | mixed |
| owner.css | 33 | 2 | **raw-only** (2 roles in 1351 lines) |
| training.css | 22 | 10 | mixed |
| layout.css | 24 | 0 | **zero role consumption** |
| polish.css | 25 | 0 | zero roles (overrides layer) |
| notifications.css | 3 | 0 | zero roles + **own private px scale** (14/13.5/13/12.5/12/11/10.5/10px) — mostly dead, superseded by polish.css:1389-1435 |
| pdf.css | 11 | 0 | print/PDF-viewer world — exempt-ish |
| motion.css | 1 | 0 | one `--fs-sm` (motion.css:172) |

**≈272 raw `--fs-*` declarations** across 11 files. Brief §2 says new code consumes roles — old
code was never migrated. Systemic debt, not a per-line bug (→ P2-7).

### 1b. Weights

- Declared weights resolve to 400/500/600/700 only. `--fw-black: 800` re-resolves to 700
  (tokens.css:869, wave 2-a) — verified in DOM: weight census across 4 surfaces × 2 themes =
  `{"400","500","600","700"}` only, identical light/dark. No 300/800/900 anywhere rendered.
- TSX inline `fontWeight: 600` ×6 (MorePages:1341, AdminGovernancePages:523/538, AdminSyncPage:260/338,
  AnnotationsPanel:278) — legal weight, but bypasses tokens (P3-5 family).

### 1c. Letter-spacing declarations on Arabic (ruling #2: must be 0)

Rendered-verified non-zero on Arabic (probe 1/4/5 computed):

| selector | declaration | computed on Arabic text |
|---|---|---|
| `.landing-role-name` | landing.css:972 `var(--type-display-letter-spacing)` | **-1.28px @40px** «الطالب» |
| `.btn` | components.css:324 `-0.005em` | **-0.06px @12px** «تسجيل الدخول», «اسأل AI», «السابق» — all 11 app surfaces |
| `.card-title` | components.css:111 `var(--ls-snug)` | **-0.216px @18px** «الاختبارات الإلكترونيّة», «أمن المعلومات · SEC301», «قائمة المراجعة» |
| `.sidebar-brand-name` | layout.css:98 `var(--ls-snug)` | **-0.156px @13px** «مدارك» — every page |
| `.avatar` | components.css:650 `-0.01em` | **-0.12/-0.13px @12-13px** «أح», «مل» |
| `.bottom-nav-label` | notifications.css:283 `0.005em` | **+0.055px @11px** «الرئيسية» (390px) |
| `.section-title` (div-rendered) | components.css:902 `var(--ls-snug)` | declaration live; same token measured -0.216px on `.card-title`; div escapes the reset |
| `.search-section-label` | layout.css:516 `0.06em` + uppercase | **DEAD** — computed `normal` (polish overrides) |
| `.topbar-title` | layout.css:334 `var(--ls-snug)` | **DEAD** — computed `normal` |
| `.notif-panel-title` | notifications.css:33 `-0.01em` | **DEAD** — computed `normal` (polish.css:1393) |
| `.notif-item-title` | notifications.css:139 `-0.005em` | superseded by polish.css:1422 (13px, no ls) |

The 21-c overrides-layer reset (`polish.css:5713` `:lang(ar) :is(h1..h6, .page-title,
.dash-section-title, .onboarding-flow-headline) { letter-spacing: normal }`) works — every h1/h2/h3/
.page-title measured `normal`, including the landing mega (declared -0.032em at landing.css:418 →
computed 0 on the h1). **The gap: class-styled Arabic text outside the reset list** (→ P1-1, P1-3,
P2-1/2/3/4).

Numerals keep tracking by design (`--type-metric-letter-spacing` -0.022em, polish.css:3355
`.metric-value -0.02em`) — sanctioned, digits have no joins. Measured -0.6px @30px on metric values.

### 1d. Off-scale font sizes (outside the `--fs-*` scale)

- **10px** — badge count pill (polish.css:1358), `.tab-count` (polish.css:1566), `.bottom-nav-label`
  ≤360px (notifications.css:304). Below the scale floor `--fs-xxs` 11px; Arabic at 10px is a
  legibility stretch (badge digits OK, Arabic nav labels not).
- **10.5px** — notifications.css:236 (dead — superseded by polish).
- **11px** — `.table thead th` (components.css:792, `--fs-xxs`) — live, Arabic table headers.
- **12.5px** — `.topbar-actions .btn.primary.sm` (polish.css:1312) — live off-scale CTA size.
- **13.5px / 12.5px** — notifications.css:135/144 — dead (polish overrides to 13/12).

### 1e. Serif voice (IBM Plex Serif italic)

`<em>` exists in exactly one file (LandingPage.tsx, 10×). Measured: every Arabic em renders
**upright** (`font-style: normal`, IBM Plex Sans Arabic, fw 700) — the C4 phantom-serif kill held.
The one sanctioned survivor `em.landing-serif-latin` («Oasis», bdi-wrapped) renders true IBM Plex
Serif italic 400 @56px. `--font-serif` consumed nowhere else in TSX. **Clean.**

---

## 2. Measured ramp (computed, light theme @1440 unless noted)

| element | size | leading (ratio) | tracking | weight | verdict |
|---|---|---|---|---|---|
| landing mega h1 `.landing-title` | 104px | 124.8px (**1.20**) | normal ✓ | 700 | ✅ Arabic display floor held (Latin 0.95–1.06 + 0.15) |
| landing section h2 56px | 56px | 64.4px (**1.15**) | normal ✓ | 700 | ✅ |
| final-CTA h2 72px | 72px | 82.8px (**1.15**) | normal ✓ | 700 | ✅ (but orphan at 390 → P2-6) |
| auth h1 | 40px | 46px (**1.15**) | normal ✓ | 700 | ✅ |
| `.page-title` (all app pages) | 40px | 46px (**1.15**) | normal ✓ | 700 | ✅ |
| `.welcome-card .page-title` (student dash) | 28px | 34.16px (**1.22**) | normal ✓ | 700 | ✅ deliberate clamp (polish.css:1618) |
| h2 / `.dash-section-title` 22px | 22px | 26.4px (**1.20**) | normal ✓ | 700 | ✅ |
| h3 22px (landing features) | 22px | 26.4px (**1.20**) | normal ✓ | 700 | ✅ |
| `.card-title` 18px | 18px | 23.4px (**1.30**) | **-0.216px ✗** | 700 | ⚠️ tracking violation (P2-1) |
| body `p` 15px | 15px | 24.75px (**1.65**) | normal ✓ | 400 | ✅ Arabic body leading; `text-wrap: pretty` ✓ |
| `.page-subtitle` 15px | 15px | 23.25px (**1.55**) | normal ✓ | 400 | ⚠️ measure 131.6ch (P1-2) |
| label `.form-label` / `.metric-label` | 13px / 12px | 1.5 ✓ | normal ✓ | 500/600 | ✅ |
| `.metric-value` | 30px | 33px (**1.10**) | -0.6px (digits) ✓ | 700 | ✅ tnum+lnum computed ✓ |
| `.nav-label` | 13px | 18.2px (**1.40**) | normal ✓ | 500/600 | ✅ |
| `.btn` | 12/12.5px | 1.65 ✓ | **-0.06px ✗** | 600 | ⚠️ tracking violation (P1-3) |
| `.bottom-nav-label` @390 | 11px | 11px (**1.0 ✗**) | **+0.055px ✗** | 600/700 | ⚠️ P2-5 |
| `.table thead th` (teacher-grades) | **11px** | 1.65 | normal ✓ | 600 | ⚠️ scale floor + Arabic (P2-8) |

**Ramp shape vs taste.md:** tracking tightens as size grows — on Arabic this is correctly traded
for ruling #2 (all Arabic tracking 0; only numerals keep -0.02em). Leading is inverse to measure and
Arabic-adjusted (display 1.15–1.25, body 1.65) — the ramp itself is healthy. The violations are
concentrated in **chrome micro-type** and **measure**, not the ramp.

---

## 3. Measure (45–75ch) — computed ch-widths

| prose block | measured | verdict |
|---|---|---|
| landing hero lede 17px | 56ch / 571px | ✅ |
| landing section ledes 17px | 56ch | ✅ |
| landing feature descs 15px | 33.5ch / 301px | under 45ch — card columns, acceptable |
| auth form sub 15px | 38ch | ✅ (short form copy) |
| auth demo hint 12px | 43.9ch | ✅ |
| **`.page-subtitle` (exams, library, community, admin-dash, admin-students, vision)** | **131.6ch / 1184px** | ❌ 1.75× ceiling (P1-2) |
| **teacher-grades lead-in `p.text-sm` 13px** | **145.4ch / 1134px** | ❌ (P1-2) |
| **student-exams `p.text-sm` 13px** | **145.4ch / 1134px** | ❌ (P1-2) |
| teacher-dashboard subtitle | 118.4ch | ❌ (P1-2) |
| community `.announcement-body` 15px | 70ch / 630px | ✅ (22-c 70ch cap works) |
| vision `main p` 15px | (subtitle 131.5ch ❌; body copy column-bound) | ⚠️ |

`.page-subtitle` has **no max-inline-size** — polish.css:874 sets only `line-height: 1.55`; the
paragraph stretches to the full 1280px content column on every wide page. `--type-body-max-measure:
72ch` exists in tokens.css and is consumed almost nowhere (student.css announcement body 70ch is a
hand value).

---

## 4. Orphans & wrapping

- `text-wrap: balance` computed on **all h1–h6** (base.css:47) incl. `.page-title`, `.landing-title`;
  `pretty` on all `p` (base.css:53). Measured ✓ everywhere.
- Class-styled card/section titles (`.card-title`, `.section-title`, `.thumb-card-title`) compute
  `text-wrap: wrap` — no balance. No orphan measured in sample (titles short/single-line), latent risk.
- **Orphan found: `.landing-final-cta-title` at 390px** — 2 lines, last line single word «بانتظارك»
  (measured word-rect grouping, `text-wrap: balance` computed — balance cannot save a 3-word title
  whose middle word is the longest). → P2-6.
- Landing mega/section/band titles at 390/768/1440: 2 lines, last lines 2–3 words — no orphans ✓
  (authored `overflow-wrap: break-word` + balance + max-inline-size 16–24ch hold).
- Truncation without `title`: rendered scan (elements actually ellipsis-clipped) found
  `.topbar-title` on teacher-grades + admin-students (content duplicated in the page h1 → low harm).
  Static census: 18 ellipsis/-webkit-line-clamp sites; all others either short static text, have
  title, or wrap. → P3-3.

## 5. Numerals

- **Global tnum**: base.css:16 `font-feature-settings: "kern","liga","calt","ss01","tnum"` on `:root`
  — computed on `table td` across surfaces (`"calt","kern","liga","ss01","tnum"`) ✓.
- **Metric role**: `.metric-value` computes `font-variant-numeric: tabular-nums` + `"lnum","tnum"` ✓
  on every dashboard (student/library/community/admin).
- **Canvas truth test**: IBM Plex Sans Arabic digit widths 1/0/9 ×10 = 180.0/180.0/180.0px equal
  (30px font) — numerals genuinely tabular, not just declared.
- `.font-mono` IDs (e.g. `UZ-2024-00001` in grades table) compute `tabular-nums` ✓.
- **Latin digits in Arabic runs**: 213 `<bdi>` across 46 TSX files; only un-wrapped mixed leaf run
  found on measured surfaces is «اسأل AI» (2-letter Latin acronym, no punctuation — bidi-safe).
  `owner-timeline-email` correctly `direction: ltr; unicode-bidi: isolate` (owner.css:942-946) ✓.

## 6. Dark theme ([data-theme="dark"], computed light→dark pairs)

| element | light lh | dark lh | weight |
|---|---|---|---|
| landing mega h1 | 1.20 | **1.25** | 700→700 |
| landing section h2 56px | 1.15 | **1.20** | 700→700 |
| landing h3 | 1.20 | 1.20 | 700→700 |
| body `p` | 1.65 | 1.65 | 400→400 |
| page-title 40px | 1.15 | 1.15 | 700→700 |
| metric 30px | 1.10 | 1.10 | 700→700 |

- **Leading compensation exists only on landing display** (tokens.css:503 `--type-display-line-height:
  1.2` + landing's calc(+0.05)). Body/headline/metric leading identical in both themes.
- **No weight compensation anywhere** (weight census identical) — documented platform ruling
  (tokens.css:499-502: tracking/weight axes "banned on Arabic cursive, leading is the legal one";
  700 is the family ceiling anyway). Accepted deviation, noted for the record → P3-1.

## 7. Hierarchy

- Heading-level skips: exactly **2** in the whole app — TrainingPages.tsx:868 (h1:748 → h3, no h2)
  and WebinarsPage.tsx:127/141 (h1 → h3 `.webinar-dest-title`). → P3-2.
- Heading rhythm measured (gap-above vs gap-below, 1440): landing feature h3s 14–16/16 (equal —
  card title/body pair, acceptable per taste "gap belongs to the section boundary"); **`.band-title`
  16 above vs 20 below — inverted** (below > above) → P3-4. `.dash-section-title` carries
  `margin-block-end: 16px` with 0 above (grid-gap provides the boundary) — declaration-level smell,
  rendered rhythm not measurable in grid; note only.
- App pages are heading-thin by design (h1 `.page-title` + card titles as styled divs) — a11y-flat
  but consistent; not filed.

---

## 8. Findings — P0/P1/P2/P3

### P0 — none.

### P1 (3)

**P1-1 · Arabic display tracking survives on `.landing-role-name`** — landing.css:972.
Computed **-1.28px @40px** on «الطالب»/«مدرّس» (role-picker rows, key landing section). The polish
reset covers only h1–h6/`.page-title`/`.dash-section-title`/`.onboarding-flow-headline` — this span
escapes it, while the h2s beside it compute `normal`. The same pages-layer declaration family
(landing.css:418/728/832/1166) is neutralized on headings but the pattern is one class away from
reappearing. **Fix:** drop `letter-spacing` from `.landing-role-name` (landing.css:972) and add the
class to the polish.css:5713 reset list (belt+braces), or extend the reset to
`:is(..., .landing-role-name, .card-title, .section-title, .sidebar-brand-name, .btn, .avatar)` in
one line.

**P1-2 · Prose measure 131–145ch on page headers** — polish.css:874 (`.page-subtitle` sets lh only,
no measure cap); teacher-grades/student-exams lead-in paragraphs (`p.text-sm`) uncapped.
Measured 131.6ch/1184px (exams, library, community, admin-dash, admin-students, vision),
145.4ch/1134px (grades/exams text-sm), 118.4ch (teacher-dash). taste floor: 45–75ch; a full-width
paragraph is unreadable regardless of size. **Fix:** `.page-subtitle { max-inline-size:
var(--type-body-max-measure); }` (72ch token already exists) + same cap on the two lead-in
paragraphs (or grid-constrain the page-head text block).

**P1-3 · `.btn` letter-spacing -0.005em on every Arabic button label** — components.css:324.
Computed -0.06px @12px on «تسجيل الدخول», «اسأل AI», «السابق», «إعادة المحاولة» — the single most
consumed Arabic tracking violation (buttons on all 15 surfaces). Sub-pixel at 12px today, but the
em value scales with font size and violates the platform's own hard ruling #2. **Fix:** delete the
declaration (or `letter-spacing: normal`).

### P2 (7)

**P2-1 · `.card-title` `--ls-snug` on Arabic card titles** — components.css:111. Computed
-0.216px @18px on «الاختبارات الإلكترونيّة» (exams), «اتجاه الأداء والحضور» (teacher-dash),
«أمن المعلومات · SEC301» (grades), «توزّع الطلاب حسب الكلّيّة» (admin), «قائمة المراجعة»
(research). Not in the reset list. **Fix:** `letter-spacing: normal` (components.css:111).

**P2-2 · `.section-title` `--ls-snug`, div-rendered** — components.css:902 + primitives/index.tsx:365
(`<div className="section-title">`). Declaration live; consumed by ResearchReviewPage.tsx:279/286/309/361
(«الملخّص», «التقييم»…) — divs escape the h1–h6 reset; the identical token measured -0.216px on
`.card-title` (same file). Not directly rendered in probes (review route needs state navigation).
**Fix:** `letter-spacing: normal` at components.css:902.

**P2-3 · `.sidebar-brand-name` `--ls-snug`** — layout.css:98. Computed -0.156px @13px «مدارك» on
every page. **Fix:** `letter-spacing: normal`.

**P2-4 · `.avatar` -0.01em on Arabic initials** — components.css:650. Computed -0.12/-0.13px
@12–13px «أح»/«مل». **Fix:** delete the declaration.

**P2-5 · `.bottom-nav-label`: 11px + line-height 1 + +0.005em tracking on Arabic** —
notifications.css:281-287 (+ 10px @≤360px, notifications.css:304). Computed @390: 11px, lh 11px
(ratio 1.0), ls +0.055px, «الرئيسية»/«مقرراتي». Arabic needs ≥1.2 leading even single-line
(descenders ج/ي crowd at 1.0) and zero tracking; 10px Arabic is below any sane floor. **Fix:**
`line-height: 1.3; letter-spacing: normal;` and floor the ≤360px variant at 11px (or 12px).

**P2-6 · Single-word orphan «بانتظارك» on the final-CTA title at 390px** — LandingPage.tsx:894 /
landing.css:1161-1174. Measured 2 lines, last line = 1 word, `text-wrap: balance` computed (balance
cannot fix a 3-word title whose accent word is last). The platform's own craft floor bans orphaned
single-word last lines in Arabic headlines. **Fix:** copy tweak («منصّتك الأكاديميّة في انتظارك»
keeps a 2-word last line) or step the display size down one rung ≤420px (taste: hero steps down a
rung below ~700px anyway).

**P2-7 · Raw `--fs-*` consumption debt ≈272 declarations / 11 files** (census §1a; heaviest:
components.css 69, colleges.css 44, owner.css 33-with-2-roles, layout.css 24-with-0-roles,
notifications.css private px scale). Every future size tweak must be made per-site; role tokens
pin size+weight+lh+tracking precisely so consumers don't drift. **Fix (incremental):** migrate at
touch-time; priority files layout.css + notifications.css (dead px scale → delete superseded
declarations) + owner.css.

### P3 (8)

**P3-1 · Dark-theme compensation is leading-only and landing-only** (§6). Body 1.65→1.65, headline
1.15→1.15 in dark; weight compensation banned by documented Arabic ruling (700 = family ceiling).
Consider `--type-body-line-height: 1.7` under `[data-theme="dark"]` if a dark-mode pass ever
flagged density; today's dark text is AA-pinned and readable — record-only.

**P3-2 · Heading-level skips ×2** — TrainingPages.tsx:868 (h1→h3), WebinarsPage.tsx:127/141
(h1→h3 card titles). **Fix:** demote to styled divs or promote to h2.

**P3-3 · `.topbar-title` ellipsis without `title`** — layout.css:334ff; measured clipped on
teacher-grades + admin-students. Content duplicated in page h1 → low harm. **Fix:** add
`title` attribute or drop the topbar duplicate.

**P3-4 · `.band-title` spacing inversion (marginal)** — measured 16px above vs 20px below
(landing bands ×2). taste: more space above a heading than below. **Fix:** `margin-block-start:
var(--sp-5)` on `.band-title` (landing.css:729).

**P3-5 · Off-scale sizes + inline styles** — 12.5px topbar CTA (polish.css:1312); 10px badge/tab
counts (polish.css:1358/1566); dead 13.5/12.5/10.5px in notifications.css; TSX inline
`fontSize: 'var(--fs-*)'` ×7 (VisionPages:210, CommunityPages:335, MorePages:1174/1179,
ProfilePage:192, TrainingPages:868, AuthoringModal:57). **Fix:** snap to tokens / move to classes.

**P3-6 · `.card-title`/`.section-title`/`.thumb-card-title` lack `text-wrap: balance`**
(computed `wrap`). No orphan measured in sample; latent risk on 2-line card titles at 390.
**Fix:** add `text-wrap: balance` to the shared card-title rule.

**P3-7 · Table type-scale inconsistency across 3 families** — measured th 15px (student agenda) /
11px (`.table` components.css:792) / 12px (admin tbl); td 15/13/13; grades first-column td fw 600
vs 400 elsewhere. 11px semibold Arabic headers sit at the legibility floor. **Fix:** normalize
`.table thead th` to `--type-label-size` (13px) and audit the admin-tbl variant.

**P3-8 · Dead letter-spacing/size declarations** (render-verified superseded): layout.css:334
(`.topbar-title` ls), layout.css:516 (`.search-section-label` 0.06em+uppercase), notifications.css:33/
135/139/144/236. Cleanup-only — they mislead future editors into thinking the values render.

### Verified clean (for the record)

- No weights outside 400/500/600/700 rendered anywhere, either theme.
- Phantom serif-italic on Arabic: **still dead** (measured upright, Plex Sans Arabic, fw 700);
  serif voice = exactly one sanctioned Latin run («Oasis», bdi-wrapped, true italic file).
- tnum: global (base.css:16) + metric role + `.font-mono` — computed and canvas-verified equal
  digit widths.
- Landing mega leading 1.20 light / 1.25 dark — Arabic display floor respected (taste Latin band
  0.95–1.06 + 0.15 Arabic allowance).
- `text-wrap: balance`/`pretty` adopted on all headings/paragraphs via base layer.
- bdi discipline: 213 sites / 46 files; only bidi-safe un-wrapped mixed run found («اسأل AI»).
- h1–h6 + `.page-title` tracking: computed `normal` everywhere (the 21-c reset holds).
- Announcement/community body measure 70ch ✓ (22-c fix verified live).

---

**Counts: P0 ×0 · P1 ×3 · P2 ×7 · P3 ×8.**

*Probes & raw data: `frontend/.agents/tmp/a3-probe{1..8}.mjs` + `.json` (computed-style JSON
~180 samples). No source files, tests, or git state touched.*
