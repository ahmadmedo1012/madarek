# 4-A3 — Student Core Surfaces Audit (سيادة المظهر, Wave 19)

**Scope:** `DashboardPage.tsx`, `CoursesPage.tsx`, `CourseDetailPage.tsx`, `LecturePlayerPage.tsx`, `LibraryPage.tsx`, `ResearchPage.tsx`, relevant parts of `styles/student.css` (+ the shared blocks they render through: `components.css` dash/lists blocks, `polish.css` page/grid blocks, primitives, `hooks/useResources.ts` queries).
**Routes audited:** `/student/dashboard`, `/student/courses`, `/student/courses/cmuh085a0001x74qrseap66ec` (click-through), `/student/lectures/cmuh085cr004p74qrmbg62k9e` (click-through), `/student/library` (+ research tab & live search), `/student/research` (+ upload modal, submit modal).
**Method:** 24 screenshots (`/tmp/madarek-shots/a3-*.png` — desktop/mobile/dark/onboarding frames/modals/playing state), 8 VLM critique batches, 5 Playwright probes (click-through, DOM measurements at 1440/1280/390, contrast-ratio math in-page, focus/tab-order, onboarding replay). Audit-only — no source edits.

---

## Scores

| Surface | Score /10 | One-line verdict |
|---|---|---|
| Dashboard | **7.0** | Strong honest KPIs + authored count-up moment; mobile composition fails (doughnut row squeezes text to 114px). |
| Courses | **8.0** | Best page in scope — filter pills with live counts, re-stagger moment, honest empties; only query-flicker and bucket-overlap nits. |
| Course detail | **8.0** | Tinted hero + curriculum rows are premium; nested progress panel and generic material icons are the dings. |
| Lecture player | **7.5** | Excellent structure (no-shift 16:9 frame, RTL progress, resume-seek, checkpoint via Modal); one AA contrast miss + native chrome + seed media that makes chapters/checkpoints unreachable. |
| Library | **7.0** | Good tab a11y + sanitized snippets; mono Arabic labels, unlabeled search inputs, icon-as-cover cards, query flicker. |
| Research | **7.5** | Honest scan states + solid upload modal; simulated file picker and two copy overclaims. |
| Onboarding modal (context) | **7.0** | Focus trap, RTL arrows, Esc, dots — well built; weak skip affordance, negative tracking on Arabic headline. |

**Audit Health (per impeccable audit rubric):** A11y 3 · Performance 3 · Theming 3 · Responsive **2** · Implementation Integrity 3 → **14/20 (Good — address weak dimension: mobile composition).**

**RTL/bidi verdict:** No P0 RTL leakage found. Every Latin run in scope is `<bdi>`-wrapped or `dir="ltr"`-scoped (course codes, time ranges, ranks, grades, chapter times). Doughnut center, checkpoint notches and progress fills are center/inset-inline-start anchored — direction-correct by construction. No horizontal overflow on any route at 1440/1280/390.

**Counts: P0 0 · P1 3 · P2 7 · P3 13.**

---

## Findings

### P1

- **[P1] Mobile: doughnut row squeezes progress text to 114px** — `styles/components.css:964-968` (`.dash-progress-card .dash-progress-body { flex-direction: row }`, no ≤640px override) + `components.css:945-951` (`.dash-doughnut` fixed `168px`, `flex-shrink: 0`).
  Evidence: measured at 390×844 — doughnut 168px + gap 24px leave the text column **114px wide** while `.dash-progress-value` renders at 22px («متوسّط تقدّمك في 2 مقرّرين نشطين» wraps to ~6 ragged lines). VLM mobile pass independently flagged the hero band.
  Fix: `@media (max-width: 640px) { .dash-progress-card .dash-progress-body { flex-direction: column; align-items: center; text-align: center } }` (stack, matching `.dash-progress-body`'s own base rule at components.css:941).

- **[P1] WCAG AA: active-chapter concept label 3.95:1 (light) / 3.83:1 (dark)** — `styles/student.css:197-204` (`.chapter-concept { color: var(--text-faint) }`) over `.chapter-row.on { background: var(--accent-soft) }` (`student.css:225`).
  Evidence: in-page contrast math, both themes, 12px regular text (needs 4.5:1). The sibling `.chapter-title` uses `--accent-strong` (8.62:1, pinned in tokens.css) — the concept line was left on `--text-faint`.
  Fix: `.chapter-row.on .chapter-concept { color: var(--text-secondary) }` or the accent-strong ink at 12px.

- **[P1] Both library search inputs are placeholder-only (no label / aria-label)** — `pages/student/LibraryPage.tsx:231-236` (books) and `:338-343` (research).
  Evidence: probe — `labels.length === 0`, `aria-label === null` on both inputs; the research-tab search is that tab's primary interaction.
  Fix: add `aria-label="ابحث في الكتب"` / `aria-label="ابحث في البحوث المنشورة"` (or visually-hidden labels), plus a clear (×) affordance when `q` is non-empty.

### P2

- **[P2] Library stats render Arabic words in the mono costume** — `LibraryPage.tsx:435` and `:438`: `<span className="font-mono">انتحال: <bdi>…</bdi></span>` / `ذكاء اصطناعي:`.
  Evidence: computed font-family on the span is `"IBM Plex Mono", …` — IBM Plex Mono has no Arabic glyphs, so «انتحال:» falls to a system Arabic face mid-line while the digits stay Plex Mono (verified in-page). Also violates the craft floor's "mono is for data, not labels".
  Fix: move `font-mono` to the `<bdi>` (numbers only) and keep the Arabic label in the body face — mirroring the correct pattern on the same page (`:394`, `:402`).

- **[P2] Category/search change flashes the whole grid to skeleton** — `hooks/useResources.ts:256-265` (`useBooks`) and `:1039-1055` (`useResearchSearch`): no `placeholderData: keepPreviousData`.
  Evidence: every NEW category/query key transitions `isPending → true`, unmounting the book grid (`LibraryPage.tsx:248`) or research list (`:353`) into `BookGridSkeleton`/`ResearchListSkeleton`; cached keys re-show instantly, so the flash is intermittent and feels random.
  Fix: `placeholderData: keepPreviousData` on both queries (v5 API), keep skeletons for the true first load.

- **[P2] Mobile: `grid-4` collapses to 1 column — 4 stacked KPI cards eat the first paint** — `styles/components.css:24-26` (shared grid; consumed by Dashboard `DashboardPage.tsx:250`, Courses `:134`, CourseDetail `:158`, Research `:117`, library research tab `:299`).
  Evidence: measured 390px — each `.metric` is 340×132; header + 4 cards ≈ 700px of the 844px viewport (~83%) before any real content. VLM mobile passes on dashboard/courses/research all independently flagged it.
  Fix: scoped 2-col exception for compact stat rows on phone (`@media (max-width: 640px) { .grid-4.metric-only { grid-template-columns: repeat(2, 1fr) } }` or a `.grid-4-compact` variant), or a page-level `grid-2` on phone for these four surfaces. Cross-cutting: coordinate with 4-A10.

- **[P2] Arabic letter-spacing: negative tracking applied to Arabic headings** — `styles/polish.css:869-871` (`.page-title { letter-spacing: -0.012em }` — «مقرّراتي الدراسية», «المكتبة الإلكترونية», «بحوثي العلمية»), `styles/components.css:892-899` (`.dash-section-title { letter-spacing: var(--ls-snug) }` — «المهام والفصول القادمة»), `styles/tokens.css:216` (`--type-headline-letter-spacing: var(--ls-snug)` consumed by `.course-hero-title` `student.css:760` and `.lecture-meta-title` `student.css:76`), and the onboarding headline (measured `-0.264px` at 22px).
  Evidence: computed styles measured in-page; platform ruling #2 ("no letter-spacing — Arabic cursive joins") is already enforced for `.dash-eyebrow`/`.metric-label` (`student.css:471-472`) but not for titles.
  Fix: a single global `:lang(ar) / [dir="rtl"]` reset `h1, h2, .page-title, .dash-section-title, .onboarding-flow-headline { letter-spacing: 0 }` — owned by typeset (4-A12); my surfaces are the evidence list.

- **[P2] Seed data makes the lecture player's core interactions unreachable** — lecture `cmuh085cr004p74qrmbg62k9e`: `durationSec: 600`, `videoUrl` = 10-second Big Buck Bunny clip; chapters at 0/180/420s; checkpoint at 200s.
  Evidence: API payload + live probe — real media ends at 10s, so chapter 2/3 seeks clamp to the end, the checkpoint (`currentSec >= 200`, `LecturePlayerPage.tsx:128`) can never fire, and the watch bar shows a saved 30% (180/600) the media cannot physically reach. The checkpoint modal — the page's signature interaction — is unauditable live.
  Fix (seed): point `videoUrl` at a media file ≥ `durationSec`, or scale `durationSec`/`chapters`/`checkpoint.triggerSec` to the 10s clip. FE hardening (optional): clamp chapter `startSec` to the media duration read at `loadedmetadata`.

- **[P2] Library book cards use category icons as covers** — `LibraryPage.tsx:263-296` (`thumb-card-image` renders a 32px lucide icon in a tinted 100px band).
  Evidence: desktop shot — 5-col grid of near-identical icon tiles; VLM: "looks like a settings menu rather than a library". Craft floor: containers standing in for content.
  Fix: short-term — typographic cover (title + author set on the tint band, spine-like rule); long-term — `coverUrl` on the Book model. Keep the category icon as a small corner chip instead of the whole "cover".

- **[P2] Course-detail tint reads near-invisible in dark mode** — `styles/student.css:716-724` (`.course-hero` tint wash `color-mix(tint 7%, surface)` + border `tint 22%, rule`).
  Evidence: measured dark values — hero bg ≈ `rgb(34,39,45)` vs card `rgb(31,31,30)` vs page `rgb(25,25,24)`: the 7% wash moves the surface ~3 RGB points; the hero survives on its border alone. VLM dark pass: "card edges dissolve".
  Fix: raise the dark-mode mix (e.g. `[data-theme="dark"] .course-hero { background: color-mix(in srgb, var(--course-tint) 12%, var(--surface)); border-color: color-mix(in srgb, var(--course-tint) 35%, var(--rule)) }`).

### P3

- **[P3] Agenda rows keep a hover background while being non-interactive** — `styles/components.css:985` (`.dash-agenda-item:hover { background: var(--surface-2) }`); the cursor half of the affordance lie was already fixed (`student.css:487` `cursor: default`), the hover half wasn't. Fix: `.dash-agenda-item:hover { background: inherit }` in student.css.
- **[P3] Dashboard `formatDue` labels overdue assignments «اليوم»** — `DashboardPage.tsx:57` (`if (days <= 0) return 'اليوم · …'`) — an assignment due yesterday reads "due today"; CoursesPage's own copy (`CoursesPage.tsx:54`) correctly distinguishes. Fix: `days < 0 → 'فات الموعد · <date>'` and fold the two `formatDue`s into `lib/format.ts` (they already differ in plural rules).
- **[P3] Filter buckets overlap semantically** — `CoursesPage.tsx:43-48`: a course at 10% progress appears in both «قيد التقدّم» and «بحاجة إلى اهتمام»; counts don't partition. Fix: `attention` = `<30 && >0` minus done, or rename to make the overlap honest («متأخرة التقدّم»).
- **[P3] Nested panel inside the course hero** — `CourseDetailPage.tsx:143-152` / `student.css:772-783`: a bordered `var(--surface)` box inside the tinted hero band (card-in-card). Fix: drop the panel chrome — hairline inline-start rule + transparent ground on the hero wash.
- **[P3] Every material renders the same FileText icon** — `CourseDetailPage.tsx:257` — `MATERIAL_TYPE_LABEL` exists (`lib/courseMeta`) but the icon ignores the type. Fix: icon map PDF/link/video/slide.
- **[P3] Native video controls are the one unthemed browser surface** — `LecturePlayerPage.tsx:239` (`controls`). Craft floor asks browser surfaces to carry the design. Fix (cheap): `controlsList="nodownload"`, `accent-color` on the shell, and preload a poster frame; (real) custom chrome overlay is a wave of its own.
- **[P3] `onEnded` reports `completed: true` on any end** — `LecturePlayerPage.tsx:276` (`completed: data.durationSec > 0`) — inconsistent with the 95%-share guard used by the interval reporter (`:117`); the server re-derives completion (learning.routes.ts:203-206) so it's cosmetic, but the comment claims D9 alignment it doesn't have. Fix: `completed: isWatchComplete(v.currentTime, data.durationSec)` for symmetry.
- **[P3] Onboarding skip affordance is weak** — `components.css:1493-1501`: borderless, muted, 50×33px. Fix: keep it quiet but add the standard ghost-button padding/focus parity.
- **[P3] GPA row leaves dead space on phone** — `components.css:913-916` (`.dash-gpa-body`, no `justify-content`): orb 88px + text 88px in a ~294px track leaves ~78px trailing gap. Fix: `justify-content: space-between` or stack on phone.
- **[P3] Copy overclaims** — `LibraryPage.tsx:173` «آلاف الكتب» (seeded library: single digits) and `ResearchPage.tsx:333` «وResearchGate» (no such integration; also an un-wrapped Latin brand inside an Arabic sentence). Fix: «مكتبة الكتب الأكاديمية وبحوث الطلاب…» / drop the ResearchGate mention (or wrap in `<bdi>`).
- **[P3] Token-scale drift** — the student surfaces mix the legacy `--fs-*` scale (`student.css:1111-1291` §research paper rows, `components.css:880-1010` dash block) with the current `--type-*` scale (lecture/chapter/checkpoint blocks). Both are defined (`tokens.css:62-68`) so nothing breaks, but two type systems coexist on one page family. Fix: migrate §research + dash blocks to `--type-label-*` (owned by 4-A12; listed here as consumer evidence).
- **[P3] `document.title` is generic per route** — AppShell `resolveTitle` yields «تفاصيل المقرّر · مدارك» without the course name, «مشغّل المحاضرة · مدارك» without the lecture. Ownership: 4-A14 (nav IA) — deep-link/history entries for my routes are indistinguishable.
- **[P3] Books KPI is capped by the query limit** — `LibraryPage.tsx:139` (`books.data?.length`, `useBooks` sends `limit: 100`) — the «كتب الفئة الحاليّة» card undercounts past 100 and changes meaning under search (label still says "category"). Fix: `meta.total` from the endpoint or relabel when `booksFiltered`.

---

## VLM claims vs verified reality (discounted hallucinations)

- ~~"Doughnut label left-aligned / chart broken"~~ — center number measured dead-center (frameCx == dotCx); ChartFrame's summary is visually hidden. **Not a defect.**
- ~~"Lecture progress bar misaligned/detached in course list"~~ — measured flush with the row's inline-start edge (offset 0). **Not a defect.**
- ~~"Primary button must be on the right (RTL inversion P0)"~~ — onboarding footer places Next at inline-start, Back at inline-end; internally consistent with the dot progression; convention-dependent, not a violation. **Downgraded to nothing.**
- ~~"Mobile video overflows viewport (P0)"~~ — `overflowX = -10` (no overflow) on every route at 390px. **Not a defect.**
- ~~"Dark-mode text contrast failures"~~ — measured AA ratios in dark: 5.58–9.9 across metric labels, subtitles, badges. The real dark miss is the hero *surface* separation (kept as P2 above).
- ~~"Scan value/limit equal weight"~~ — measured 22px/700 value vs 11px/400 meta. **Hierarchy exists.**
- ~~"mark highlight low contrast"~~ — `mark` uses the pinned `--c-yellow-bg/deep` pair (8.62:1 measured). **Not a defect.**
- Confirmed by measurement: mobile KPI stack weight, doughnut-row squeeze, mono-Arabic stats, weak skip, dark hero subtlety, icon-as-cover cards.

## Positive findings (protect during fix waves)

- **bdi discipline** is exemplary in scope — every course code, time range, rank, grade and URL is isolated; `chapter-time` correctly `dir="ltr"`.
- **Honest state coverage**: every surface has shape-matched skeletons (`CourseGridSkeleton`, `LectureSkeleton`, `BookGridSkeleton`, `PaperRowSkeleton`), real empty states with next-step copy, and retry-capable error states with a way back (`CourseDetailPage.tsx:96-104`).
- **Motion**: authored moments per page (KPI count-up riding grid stagger, courses filter re-stagger with the first-render opt-out `student.css:691-697`, scan sweep, checkpoint correct-pulse) with per-keyframe reduced-motion off-switches in every section.
- **A11y craft**: ChartFrame gives the doughnut a role+summary+data table; tabs implement the full manual tablist pattern (roving tabindex, RTL arrows, Home/End — `LibraryPage.tsx:152-165`); progressbars carry roles; checkpoint quiz rides the shared Modal (focus trap, Esc); focus ring measured visible (2px).
- **Touch floors** are systematically patched per section (`student.css:1048-1057, 1643-1651`) — pills/tabs/rows measured 44-60px on mobile.
- **Security care**: `sanitizeSnippetHtml` allowlist for server snippets (`LibraryPage.tsx:48-69`).

## Top-10 quick wins

1. Stack `.dash-progress-card .dash-progress-body` below 640px — one media query unlocks the mobile dashboard (P1-1).
2. `aria-label` + clear button on the two library search inputs (P1-3).
3. Un-mono the Arabic labels in `.research-card-stats` — move `font-mono` onto the `<bdi>` (P2-1).
4. `placeholderData: keepPreviousData` on `useBooks` + `useResearchSearch` (P2-2).
5. `:root[dir="rtl"]` letter-spacing reset for Arabic titles (P2-4, coordinate 4-A12).
6. `.chapter-row.on .chapter-concept` → `--text-secondary` (P1-2).
7. Re-seed the demo lecture media (or scale its durationSec/chapters/checkpoint) so chapters + the checkpoint modal are exercisable (P2-5).
8. Kill the `.dash-agenda-item:hover` background (P3-1).
9. 2-col `.grid-4` exception for compact metric rows on phone (P2-3, coordinate 4-A10).
10. Dark-mode tint bump for `.course-hero` (P2-7) + wrap the Latin path in the submit-modal help text in `<bdi className="font-mono">`.

## Files to touch

| File | Findings |
|---|---|
| `frontend/src/styles/components.css` | P1-1 (dash-progress-body mobile), P3-1 (agenda hover), P3-9 (gpa row), P2-3 (grid-4 mobile, coordinate) |
| `frontend/src/styles/student.css` | P1-2 (chapter-concept), P2-7 (dark hero tint), P3-4 (hero panel chrome) |
| `frontend/src/styles/polish.css` | P2-4 (page-title tracking; with 4-A12) |
| `frontend/src/pages/student/LibraryPage.tsx` | P1-3 (search labels), P2-1 (mono Arabic), P2-6 (covers), P3-10 (copy), P3-13 (KPI total) |
| `frontend/src/hooks/useResources.ts` | P2-2 (keepPreviousData ×2) |
| `frontend/src/pages/student/DashboardPage.tsx` | P3-2 (formatDue overdue) |
| `frontend/src/pages/student/CoursesPage.tsx` | P3-3 (bucket overlap) |
| `frontend/src/pages/student/CourseDetailPage.tsx` | P3-4, P3-5 (material icons) |
| `frontend/src/pages/student/LecturePlayerPage.tsx` | P3-7 (onEnded flag), P2-5 FE clamp (optional) |
| `frontend/src/pages/student/ResearchPage.tsx` | P3-10 (ResearchGate copy) |
| seed / backend | P2-5 (lecture media data) |
