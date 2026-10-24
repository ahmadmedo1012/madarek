# Madarek Redesign — BLUEPRINT (r196) — **STATUS: SHIPPED (r285); read as history, not plan**

> **رأس الختم (r285):** هذا المخطط أُنجز. الهبوط OPTIKKA (r198)، التوكنات (r197)،
> الهيكل وعقد الأنماط (r210–r214)، العائلات الخمس (r220–r269)، وعصبة الرسوم
> (r270–r280 wired) — كلها مدموجة في `redesign/integration` وموثقة كقانون
> شاحن في `DESIGN.md` (راية R285 + §9 معمارية ما بعد إعادة التصميم).
> ما بقي صادقًا: (1) سبك `polish.css` في أوراق أصحابه — حملة شرائح أساس
> ببروتوكول §9c هناك؛ (2) مشاهد التهيئة الوارثة 2-3 + مقدمة الدور + المَيلستون
> بلا قطع مكافئة بعد؛ (3) صفحة إعدادات حقيقية تحتاج قرار مسار منسّق +
> عقد خلفية أولًا (طلب 4E #1). جدول التصحيحات §10 والملكية §1 أدناه
> تاريخية — الأصحية الآن للمنسّق (Agent Z).

# Madarek Redesign — BLUEPRINT (r196)

> Working canon for prompts 1A→6. Precedence: this file + the «Redesign direction» block
> in `DESIGN.md` override older design docs. `tokens.css` still wins on shipped values
> until 1A re-keys them. Every claim below is code-verified or measured in a real browser.

| Fact | Value |
|---|---|
| Repo / branch | `<repository>` @ `redesign/superlist-optikka` (base: main `956155b` = r195) |
| Live | `https://madarek.onrender.com` · Local run used for walkthrough: `tools/boot-pg.sh` (:5433) + migrate + seed + `dev`(:4000)/`dev:web`(:5173) |
| Locked direction | Homepage = OPTIKKA **principles**; every other page = Superlist (current) **principles**. Turion Space / Evergreen Nexus / egn-teal «stage void» retired. Translate principles — never copy reference assets, wording or colours. |
| Non-negotiables | No backend/API/schema/semantics changes. Arabic RTL first. Western digits 0-9. Honest copy (no «صُنعت في ليبيا», no «ما يُشحن اليوم», plagiarism = declared simulation, assistant = local deterministic engine by default). Commit format `type(rNNN): subject` (next: r197). |

---

## 1) Verified route map → family ownership (FINAL split)

Verified in `frontend/src/App.tsx` (495 L, **107 `path=` rows**, all components `React.lazy`).
Guard: `ProtectedRoute({allow})` in AppShell.tsx:462; `HomeRedirect` on `/`; `GuestRoute` on auth.
Nav: `NAV_BY_ROLE` (lib/nav.ts 417 L) + `NAV_TITLES` flattening in AppShell.

| Family / prompt | Owns files under… | Route rows (by prefix) |
|---|---|---|
| **2 Homepage** | `pages/LandingPage.tsx`, `components/landing/`, `styles/landing.css`, `hooks/useScrollStage.ts`, `hooks/useReveal.ts`, homepage assets in `public/brand/` | `/` (guest landing; authed → role home) |
| **4A Student learning** | `pages/student/`: Dashboard, Courses, CourseDetail, LecturePlayer, Matrix, Calendar, ProfilePage, MorePages.tsx (Schedule/Results/Labs/Live/ArVr/Downloads/University/Payment/CampusMap/Jobs/Webinars/Mooc/Social), student MessagesPage wrapper; `components/player/`, `components/onboarding/`; `styles/student.css`, `styles/player.css` | `/student/{dashboard,courses,catalog,schedule,results,calendar,courses/:offeringId,lectures/:lectureId,matrix,labs,live,ar,social,downloads,university,payment,map,gamification,skills,webinars,profile,messages}` + `/training*`+`/achievements` are **4E files** (see below) with student as primary role |
| **4B Research & library** | `pages/student/LibraryPage.tsx`, `pages/student/ResearchPage.tsx`, `pages/teacher/ResearchReviewPage.tsx`, `pages/DocumentViewerPage.tsx`, `components/pdf/`, `styles/pdf.css` | `/student/library` + `/teacher/library` (same file), `/student/research`, `/teacher/research`, `/document/:filename` |
| **4C Teacher & quality** | `pages/teacher/` (TeacherPages.tsx, TeacherDashboard, Intelligence(+detail), TeacherProfile, TeacherLive, TeacherLabs), `pages/quality/`, `pages/exams/OnlineExamsPages.tsx` (**single owner** incl. ExamTakerPage+ExamModerationPage), `components/curriculum/`; teacher rows in `styles/admin.css` consumed-not-edited | `/teacher/{dashboard,schedule,attendance,grades,materials,students,performance,assignments,exams,exams/:templateId,messages,intelligence,intelligence/:offeringId,labs,live,profile,ai,alerts,community,colleges,competitions,vision}` (dups of shared files), `/quality/*` (8 rows incl. notifications/alerts/exam-moderation dups) |
| **4D Admin & owner** | `pages/admin/`, `pages/owner/`, `components/owner/`, `styles/owner.css`, `styles/admin.css` | `/admin/*` (13 rows), `/owner/*` (13 rows incl. institutions/:slug) |
| **4E Community / assistant / settings / shared / unclaimed** | `pages/AuthPage.tsx`, `RegisterPage.tsx`, `NotFoundPage.tsx`, `pages/community/`, `pages/competitions/`, `pages/vision/`, `pages/colleges/`, `pages/student/TrainingPages.tsx`, `pages/student/AiAssistantPage.tsx` (+teacher dup), `components/messages/`, `components/primitives/`, `components/motion/`, `components/overlays/`, `components/layout/`, root components (Icon/BrandMark/StarMark/EmojiIcon/LibyaFlag/Illustration/CountUp/ErrorBoundary/HydrationSplash), `styles/components.css`, `layout.css`, `auth.css`, `notifications.css`, `colleges.css`, `training.css` | `/auth`, `/auth/register`, `/404`, `*`, `/colleges`, `/colleges/leaderboard`, `/colleges/:id`, `/vision`, `/vision/:slug`, `/competitions`, `/competitions/:id`, `/community`, `/training`, `/training/:slug`, `/training/:slug/lesson/:lessonId`, `/achievements`, `/student/ai`, `/teacher/ai`, `/owner/ai`, AlertsPage dups (×5), CommunityPage dups (×4), MessagesInbox consumers |
| **1A Tokens/type** | `styles/tokens.css`, `styles/fonts.css`, `public/fonts/`, parity export pair regeneration | — |
| **1B Shell & infra** | `components/layout/AppShell.tsx`, `Sidebar`, `Topbar`, `BottomNav`, `GlobalSearch`, `NotificationDropdown`, `ThemeToggle`, `ScrollProgress`, `styles/layout.css`, `stores/`, `lib/*`, `hooks/useResources.ts`, `utils/numbers.ts`, `frontend/index.html` (CSP re-hash duty), `frontend/tests/audit/routes.ts` | shell chrome only (no route rows) |

Shared-file rules: `App.tsx` route table = coordinator only. `components.css` (4E) changes are API-breaking for all 4s → coordinator integrates; 4A–4D file issues, don't edit. `MessagesInbox`/`AlertsPage`/`CommunityPage`/`AiAssistantPage`/`LibraryPage` are mounted multiple times — **exactly one family owns each file** (listed above). Every route row is owned; zero unclaimed.

**Verified dead/stub inventory**: redirect-only rows `/login`, `/student/exams`, `/admin/analysis` (keep, nav-deliberate); dead code → delete in 3: `components/CollegesPopover.tsx` + `styles/colleges-popover.css` (never rendered), `components/landing/TestimonialSection.tsx` (renders null, zero importers); `tests/audit/routes.ts` missing `/owner/institutions`, `/owner/institutions/:slug`, `/owner/notifications`, `/quality/notifications`, `/student/catalog` (1B fixes).

## 2) Baseline status (all green — nothing pre-broken)

| Gate | Result | Numbers |
|---|---|---|
| lint / typecheck | ✅ / ✅ | 19 allowed exhaustive-deps warnings; 0 errors |
| npm test | ✅ | **1970** frontend (183 files) + **1783** backend (76 files), 0 fail/skip, 223 s |
| parity export | ✅ | **165/165**, 0 broken vars, 42 retired absent |
| icons / motion / colors / raw-css / csp-hash | ✅ all | 0 raw literals; 16 color-gate allows; 37 spacing allows; CSP pins match |
| validate:colleges | ✅ | 25/25 AA |
| builds | ✅ | frontend 10 MB dist, **636.2/650 KB gz total (≈14 KB headroom!)**, entry 70.7/80, pdf chunk 95.7/110, main CSS 44.7 KB gz |
| CI | 9 jobs | lint, typecheck(+colleges), build+bundle-size, test×2, db-integration, e2e(28), design-gates(--strict), **surface-drift hard gate** |

**Sandbox note for implementers**: this workspace exports a global `DATABASE_URL=file:…` that overrides `backend/.env` — prefix any DB command with the real URL. PG runs via `tools/boot-pg.sh` on :5433 (no psql binary; prisma auto-creates the `madarek` database). Docs staleness found (fix opportunistically): parity «163» in AGENTS §4 / docs 05; «7 وظائف» CI in docs 04; migration counts 17/21/18; test counts in docs 04/05.

## 3) Measured reference findings → decisions

### Superlist (superlist.com, real-browser computed styles + network)
| Measured | → Madarek decision |
|---|---|
| Type scale 14/16/18/24/30/48/64; display lh 0.95–1.0, ls −0.02em; body lh 1.2 | Adopt the step *ladder*, reject Latin metrics: Arabic display lh 1.15–1.3, body 1.7, **zero negative tracking** (letter joins) |
| Fixed dark #181824 brand site vs light Intercom help; single accent (P3-red CTA) on near-flat canvas; hierarchy via surfaces not borders | Two-surface rule: homepage free (theme-aware paper/ink), in-app stays light/dark app themes; **one signal color**; cards separate by surface step + single soft shadow, not border stacks |
| Radii 8/10/15/20/100-pill; cards 20px + one shadow `0 10px 15px α.08`; screenshots = flat 20px rectangles, no device chrome | Radius ladder + single-shadow-per-level (§4); product imagery flat rounded on elevated surface (RTL-neutral, cheap) |
| Buttons: pill r100, H51/40, pad 14/25, icon-gap 4px, inset highlight | Pill for primary CTAs; H≥44 desktop / ≥44 mobile; icon-gap **8px** for Arabic; skip inset highlight |
| Nav 100px **not sticky**; mobile = top sheet 24px/600 links | **Reject** scroll-away nav (product app ≠ marketing); sticky topbar stays; adopt large-type sheet pattern at ≥44px rows |
| Spacing working set 8/10/16/20 + section steps 30/60 | 8/16/20 component gaps; 40/80 section rhythm; landing.css must reach token compliance (today: census-only, 92 literals) |
| **No reduced-motion rules, UA-default focus, PNG hero 772 KB, 2.47 MB page** | Anti-patterns → invert: keep full reduced-motion kill-switch + custom `:focus-visible` ring; WebP/srcset pipeline; Superlist is the **ceiling**, not the target |
| Help center: search-first hero + full-width bordered rows (960×128, r8) | Pattern for any docs/help surface (4E) |

### OPTIKKA (optikka.com, real-browser + bundle forensics)
| Measured | → Madarek homepage decision |
|---|---|
| Fixed-layer states over 11,500px scroll spacer (0 sticky); Lenis+GSAP+ScrollTrigger+lottie = **167 KB gz** JS | `position:sticky` wrappers + IntersectionObserver + the existing rAF `useScrollStage` engine; **no new animation dependency** |
| 1,182-frame WebP scrub ≈ **50 MB streamed**; preloader 3.8 s with 1.59 MB PNG spinner | One hero WebP ≤150 KB + CSS parallax; **no preloader** (or CSS-only ≤1 s, 300 ms fade exit) |
| Root `font-size:calc(10000vw/1440)` fluid rem scaling; every size a rem var | Adopt technique with Arabic design widths 1280/768/375 for homepage display type only |
| Two surfaces cream #E6D9CC ↔ black #1A1715 + ember accent; bg-color crossfade handover (~0.9 viewport); scale .3→1 entrances; footer slide-up | Same discipline with paper/ink + ultramarine (§4); IO-triggered crossfade + scale(.94→1) 500–700 ms; sticky footer slide-up |
| Numbered chapters «01. Pipeline» in accent; JetBrains-Mono tech copy | Western-digit chapter markers («01») in accent, bidi-isolated; Plex Mono micro-labels (already shipped) |
| Per-line mask headline reveals; body in mono | **Block-level reveals only** (per-line split breaks Arabic shaping) |
| 2 font files, 134.7 KB; site's own JS only 10.7 KB gz | Proof the budget works: homepage JS ≤200 KB gz critical path incl. framework share; fonts stay 2 preloaded faces |
| Weak reduced-motion (view-transitions only) | Beat the reference: full kill-switch covers scrub/parallax/preloader |

## 4) Locked tokens (TARGETS for 1A — not shipped yet; contrast computed, WCAG 2.1)

### Light
| Token | Hex | Contrast (on) | Role |
|---|---|---|---|
| `--paper` (page bg) | `#F3EEE4` | — | page ground |
| `--ground` (surface) | `#FBFAF7` | — | cards/inputs |
| `--ink` (text) | `#16140F` | 15.92 paper / 17.63 ground · AAA | text, icons |
| `--ink-secondary` | `#57534A` | 7.34 ground · AAA | body-secondary |
| `--ink-muted` | `#6B675C` | 5.41 ground · AA | metadata (min 13px) |
| `--signal` (ultramarine) | `#2E45E6` | 5.84 paper / 6.47 ground · AA | links, active, chart-1, focus ring |
| on-signal text | `#FFFFFF` | 6.75 on #2E45E6 · AA | CTA labels (fills stay #2E45E6 in both themes) |
| `--gold` | `#B57438` | 3.29 paper · **large/decorative only** | achievements, badges |
| `--gold-text` | `#8F5A28` | 4.96 paper · AA | gold when used as text |

### Dark
| Token | Hex | Contrast (on) | Role |
|---|---|---|---|
| `--paper` (page bg) | `#16140F` | — | page ground |
| `--ground` (surface) | `#201D17` | — | cards/inputs |
| `--ink` (text) | `#F3EEE4` | 15.92 bg / 14.53 ground · AAA | text |
| `--ink-secondary` | `#C9C3B4` | 9.56 ground · AAA | body-secondary |
| `--ink-muted` | `#8F887A` | ≥4.5 ground · AA | metadata (bumped from #8A8375=4.47) |
| `--signal-text` | `#8E9BFF` | 7.26 bg / 6.63 ground · AA | links/active text on dark |
| on-signal (dark) | `#16140F` | 7.26 on #8E9BFF | labels on light-signal fills |
| `--gold` (dark) | `#D9A05B` | 8.00 bg / 7.31 ground · AAA | achievements |
| forbidden | — | ink-on-ultramarine = 2.73 | never combine |

**Signal discipline**: ultramarine = the ONLY accent (links/active/focus/chart-1). Gold = achievements only. Role accents (`body[data-role]`, 7 roles) keep their slots, retuned in 1A to harmonize with ultramarine (each passes `gateCollegeAccent` thresholds 3.0/4.5/7.0 — theme.test.ts enforces).
**Radius ladder** (replaces r190 near-square; Superlist-informed, restrained): `--r-xs 4` chips/inputs · `--r-sm 6` small controls · `--r-md 8` buttons · `--r-lg 10` cards · `--r-xl 14` media/hero frames · `--r-2xl 16` modals/sheets · `--r-full` pill (primary CTA + search only).
**Spacing**: keep the `--sp-0-5…--sp-16` ladder as-is; enforce 40/80 section rhythm on homepage; kill the 8px card-grid gaps found in student/courses.
**Elevation**: one shadow per level, rest = surface step. `--elev-1` hairline · `--elev-2` `0 10px 15px ink/8%` · `--elev-3` modal. Dark theme: border+surface step, shadows de-emphasized.
**Type scale** (Arabic-tuned): 13/14/16/18/20/24/30/38/48/64 with lh 1.15–1.3 display, 1.6–1.7 body, 1.4 UI; **floor 13px for Arabic** (11–12px dt/dd/chips die); metrics in Plex Mono tabular.
**Motion**: keep `--t-*` (80/160/240/380/520/720) + `--ease-out (.16,1,.3,1)`; homepage transitions 500–700 ms; entrance `scale(.94→1)`; stagger ≤60 ms cap unchanged.

## 5) Typography bake-off (Prompt 1A decides; all self-hosted, ≤2 preloaded faces)

| Option | Display | Body | ΔKB | Risk | Verdict |
|---|---|---|---|---|---|
| **A (incumbent)** | Alexandria 600/700 (shipped) | IBM Plex Sans Arabic 400/500/600 + Plex Mono metrics | **0** | Alexandria display voice must prove editorial range at 64px | **Champion** — bake gallery first |
| B | Readex Pro 600/700 (new, OFL) | IBM Plex Sans Arabic (unchanged) | +60–90 (display files) | preload budget; x-height vs Alexandria | challenger only if A fails at display sizes |
| C | Noto Kufi Arabic | Almarai (full swap) | +120, re-pins 14 @font-face assets.test + all source-contract pins | test blast radius | rejected |

Non-negotiable: no negative tracking on Arabic; Latin snippets may use Plex Sans/Mono as today; `font-display: swap` + 2 Arabic preloads stay (assets.test pins this).

## 6) Homepage chapter plan (guest landing; every capability verified in code)

Mechanics (from §3 Optikka rows): sticky section wrappers + IO crossfades + bg handover; block reveals; numbered chapters `01`–`06` (Western digits, accent color, bidi-isolated); footer slide-up; theme-aware paper/ink; **no preloader, no canvas, no video, no new deps**; mobile = stacked, no pinning.

| # | Chapter | Featured capability (code-verified source) | Visual device |
|---|---|---|---|
| — | Fixed header | «ابدأ الآن» → `/auth/register`, «تسجيل الدخول» → `/auth`; CTAs ≥44px (today 32px — defect) | sticky, scrolled variant |
| — | Hero | One display line + honest sub («منصة تعليم ذكي مستقلة… بيانات جامعة الزاوية بيانات عرض مرجعية»); 1 WebP ≤150 KB (hero-scene.webp 54 KB replaceable ≤150) | fluid rem display + CSS parallax |
| 01 | الفصول المقلوبة | Recorded lectures + inline auto-graded quizzes + watch tracking + auto attendance (`learning.routes.ts`, LecturePlayer 858 L, VideoPlayerChrome 652 L) | flat app-frame screenshot on elevated surface |
| 02 | مصفوفة الإتقان | Per-concept mastery, gap detection, recommendations (`MatrixPage`, `student-dashboard.routes.ts`) | progress visual (SVG, chart tokens) |
| 03 | دورة البحوث | Submit → declared-simulation check → annotated PDF review → library with normalized Arabic search (`StudentResearchPage`, `PdfViewer`, `search/normalize.ts`) | PDF-annotation vignette (flat, RTL) |
| 04 | الاختبارات الإلكترونية | Question bank, templates, strict-matching attempts (`OnlineExamsPages` 1793 L) | exam card frame |
| 05 | المجتمع والتدريب | Posts/tags, scoped announcements, competitions/events (CommunityPages 819 L, CompetitionsPages 844 L); 11 training tracks + points/badges/leaderboard (TrainingPages 970 L) | two-panel: community / training |
| 06 | الجودة والحاكمية | 6 quality boards (`quality.routes`), last-owner governance lock (`governance.ts`), audit log, 2-institution isolation (`OwnerInstitutionsPage` 738 L) | stat march — numbers computed from code only |
| — | Vision + CTA + footer | Honest `VISION_STATUS` live/sim/soon pairs (already in copy gates) + giant wordmark | slide-up footer |

Copy gates: r168b/r177/r188 tests stay green — no «صُنعت في ليبيا», no «ما يُشحن اليوم», plagiarism labelled «محاكاة حتمية معلنة», assistant labelled «محرك محلي حتمي افتراضيًا», demo tenant labelled «جامعة مدارك التجريبية».

## 7) Shell & navigation plan per role

| Area | Decision |
|---|---|
| Topbar | Stays sticky; 56–64px; title + GlobalSearch pill (⌘K palette) unchanged |
| Sidebar | Keep `NAV_BY_ROLE` groups (7 student groups collapse model works); drawer on mobile with 44px rows (Superlist sheet pattern) |
| BottomNav | Keep 5 real routes/role |
| Dashboard hierarchy | 1 primary action + ≤4 KPI cards, then attention items (admin's banner model is the template); KPI cards same radius/family across roles (primitives from 4E) |
| Tap targets | Hard floor 44px: chips 36→44, «اسأل AI» 32→44, owner row actions 32→44, table links on mobile ≥44 |
| Micro-text | Floor 13px; 11–12px `<dt>/<dd>` KPI labels die |
| Number formatting | Single formatter path: `formatNum/formatDate` (ar-LY latn) with explicit `maximumFractionDigits`; fixes «3,40», «2.340», «1,0», «صفر», and quality's «61.81818181818181%» |
| Empty states | Keep honest copy; cap identical repeats (student/courses 5×, owner detail 25× → rollup or collapse) |
| URL depth | Top-level routes (/training, /achievements, /community, /colleges) get alias redirects from /student/* deep links (1B, App.tsx by coordinator) |
| Onboarding | Per-role first-frame copy; skippable without modal takeover (4A owns flow + store contract unchanged) |
| Theme | App keeps light+dark (dark default); homepage theme-aware on paper/ink; help/docs surface = light utilitarian (Superlist split) |

## 8) Keep / replace / delete matrix

| Item | Verdict | Notes |
|---|---|---|
| `tokens.css` (80 KB, 562 vars) | **Keep architecture, re-key values (1A)** | ramps, semantic, chrome, chart(21); stage/aura families retired with homepage rewrite |
| `motion.css`, `base.css` | Keep | reduced-motion zeroing + focus ring are gates — never weaken |
| `fonts.css` + 16 woff2 (365 KB) | Keep; 1A may add challenger | 2 Arabic preloads pinned by assets.test |
| `components.css` (212 KB) | **Replace by refactor (3+4E)** | shared component library; re-skin to new ladder; API stability via coordinator |
| `layout.css`, `auth.css`, `notifications.css` | Keep, re-skin | auth.css global-by-borrow documented |
| `student.css` (134 KB, append-only) | **Split & refactor (4A)** | per-family sections; strict raw-css sheet |
| `polish.css` (237 KB, 4,428 L, 573 blocks, 54 !important) | **Collapse & delete (3)** | overrides-only layer, last import wins, zero direct tests; migrate still-needed rules into owner sheets; surface-drift is the only net — snapshot before/after per batch |
| `owner.css`, `admin.css`, `training.css`, `colleges.css`, `pdf.css`, `player.css` | Keep, re-skin per family | strict sheets — token edits only |
| `colleges-popover.css` + `CollegesPopover.tsx` | **Delete (3)** | dead (never rendered) |
| `TestimonialSection.tsx` | **Delete (2)** | dead (renders null) |
| `landing.css` + landing components | **Replace (2)** | r191 Turion-derived choreography retired; keep `useScrollStage` rAF engine + honest stat march concept |
| Parity pair (`unified-parity.css`, `shared-design-system.css`) | Keep as verification artifact | regenerate whenever tokens change (parity gate) |
| primitives/States/Card/Form/Ledger, overlays, motion components, Icon, Charts (`ChartFrame`), PdfViewer, player, curriculum, GlobalSearch, ErrorBoundary | Keep (re-skin) | these are the system's bones |
| stores / lib/api / hooks/useResources | Keep untouched | API contract frozen |

## 9) Risk list (what will bite, per deliberate design decision)

| Risk | What pins it | Mitigation / owner |
|---|---|---|
| Parity gate red on any token change | `verify-parity-export.mjs` 165/165 diffs live tokens vs hand-maintained export pair | 1A regenerates pair + CHECKS table in same commit (r195 did exactly this) |
| Token-value tests | `token-snapshot.test.ts` (AA from live tokens), `theme.test.ts` (3.0/4.5/7.0), `chartTheme.test.tsx` (**#B57438 gold pin** — matches §4 gold), icon/avatar/badge contrast tests | 1A updates pins + re-derives contrast; never hand-wave |
| Retired-archaeology pins | `r162-ux-cohesion.test.tsx` pins `--ln-*` values + exactly 2 theme blocks | 3 deletes archaeology + retires test deliberately |
| Landing structure pins | `landing-scrollspy-grain.test.ts` (grain retired, `.fo-progress-bar` scaleX, `.fo-header.scrolled`, section ids) | 2 rewrites test with new section contract |
| Font/asset pins | `assets.test.ts`: 14 @font-face, 2 preloads, hero-scene.webp/orbit-ring.webp, r188 deletions | 1A/2 update in same commit |
| Honest-copy gates | `r168b-truthfulness`, `r177-brand-neutrality`, `r188-brand-integrity` | keep green forever; copy deck reviewed against them before 2 ships |
| Student source-contract pins | `r166a-student-visual`, `r183-student-pins`, `r183-B5/B8`, `r170d/e-a11y`, `r186-book-covers` (stripComments patterns on player/student/colleges/components.css) | 4A renegotiates pin-by-pin with visual proof |
| Surface-drift hard gate | `tests/audit/` + `surface-baseline.json` (16-route CI baseline) | every family re-promotes via `promote-baseline.ts` after visual sign-off; 1B first fixes missing 5 routes |
| Bundle ceiling | 636.2/650 KB gz total (≈14 KB headroom), entry 70.7/80 | 2 must swap JS for CSS/SVG (no GSAP/Lenis — §3); check-bundle-size.mjs runs in CI |
| CSP hashes | inline theme-bootstrap + JSON-LD hashed in `backend/src/app.ts:92-100` | any index.html edit (1B/2) recomputes both pins (recipe at app.ts:74-79) |
| Strict CSS sheets | colors --strict (16 allows), motion tokens, raw-css --strict on 17 sheets; landing census-only today | 2 moves landing.css into token compliance; all 4s stay compliant |
| e2e journeys | 28 Playwright specs incl. guest-landing | 2/4s re-run locally before handoff |
| Role accent slots | 7 `body[data-role]` accent blocks + colleges AA gate (`validate:colleges`) | 1A retunes with gate, not by hand |
| AGENTS.md identity claim | §1 uses «صُنعت في ليبيا» as identity | **fixed in r196** (same commit as this blueprint) |

## 10) Prompt corrections (reality ≠ what later prompts may assume)

| Prompt | Correction |
|---|---|
| **1A** | Tokens are TARGETS in §4 — but `tokens.css` still ships egn/teal (r195) until you re-key. Regenerate parity pair + update token-snapshot/theme/chartTheme pins + CHECKS table in the SAME commit. Radius ladder replaces r190 near-square — grep for hardcoded `--r-*` assumptions. Gold #B57438 chart pin is compatible with §4 gold — verify, don't assume. Add `maximumFractionDigits` formatters to `utils/numbers.ts` (fixes §7 number bugs). Bundle ceiling: CSS counts toward 650 KB total. |
| **1B** | Assume 1B = shell/infra (layout.css, AppShell family, stores, lib, index.html, audit routes). Fix `tests/audit/routes.ts` (5 missing routes) BEFORE any family re-promotes baselines. Any index.html edit ⇒ recompute CSP hashes. Alias redirects for /student/* deep links need App.tsx rows ⇒ route rows via coordinator only. |
| **2** | No GSAP/Lenis/canvas/lottie — the rAF `useScrollStage` engine + CSS sticky/IO achieve the Optikka mechanics at ≤ a few KB. Delete `TestimonialSection.tsx`. Rewrite `landing-scrollspy-grain.test.ts` + relevant `assets.test.ts` pins. Move landing.css from census-only to token compliance. Hero asset ≤150 KB WebP; critical-path JS ≤200 KB gz; homepage is lazy-loaded already — keep it that way. Mobile: no pinning; ≥44px CTAs (currently 32px). |
| **3** | Assumed = shared component/CSS consolidation incl. **polish.css collapse + deletion**. If 3 is something else, transfer this ownership. polish.css has ZERO direct tests — capture before/after surface screenshots per batch (surface-drift is the only net). Migrate live rules into owner sheets in token-compliant form; delete dead CollegesPopover pair here. |
| **4A** | `pages/exams/OnlineExamsPages.tsx` belongs to **4C** (taker included) — propose UX issues, don't edit. Onboarding store contract unchanged (server `/me/onboarding/complete`). student.css is strict-gated + source-contract-pinned (r166a/r183) — renegotiate pins with visual proof. Fix formatting bugs via 1A's formatters. |
| **4B** | pdfjs chunk 95.7/110 KB gz ceiling — do not add weight. `ResearchReviewPage.tsx` is 4B even though it's teacher-facing. LibraryPage file owned once; two routes mount it. |
| **4C** | TeacherPages.tsx (2,457 L) + ExamAuthorPages.tsx (2,957 L) are the two biggest files — plan atomic sub-edits. Quality guard is frontend-strict (ADMIN excluded) — that's a product decision, not a defect; don't "fix" silently. admin.css is 4D-owned: consume, don't edit. |
| **4D** | admin.css + owner.css owned here. Owner institutions detail: replace 25× empty-card wall with rollup/collapse (honest-empty pattern from 4E primitives). Audit-log redundant «المورد» column — drop presentation-side only. |
| **4E** | Owns primitives/components.css/motion/overlays + all shared dups (Alerts×5, Community×4, Ai×2, Inbox) + auth/404/colleges/training/vision/competitions. KPI card + empty-state + chip primitives land here FIRST (4A–4D consume). Top-level routes (/training, /achievements, /community) owned here though student is primary role. |
| **5** | Assumed = motion/a11y/polish hardening + final visual QA sweep. Reduced-motion must cover every new homepage mechanic (§3). Focus ring token unchanged (motion.css owns it). |
| **6** | Merge/deploy to main ONLY here. CHANGELOG rNNN chain continues. Docs staleness list (§2) opportunistically fixed by then. Render preview: none configured in repo — verify on Render after operator merges. |
| **All** | Sandbox: override `DATABASE_URL` per-command (global env leaks `file:` URL). Docs claims that disagree with code: code wins, fix doc same commit. Commit subjects Arabic-first per repo history. |

## 11) Walkthrough defect ledger (49 measured defects → owners)

**Protect (verified strengths)**: zero horizontal overflow at 390px on every surface; honest specific empty-state copy; Western numerals hold everywhere; structurally correct RTL (ellipsis side, no mirrored chevrons found); auth ergonomics (48px inputs, 16px font, password reveal); role-guard redirects leak nothing; consistent shell + ⌘K palette; charts degrade to real tables; landing already lazy + no canvas/video.

**Top recurring → owner**: tap targets <44px everywhere (1A token + 4A–4E + 2) · 11–12px Arabic micro-text on all 5 dashboards (1A floor) · flat KPI walls, no primary action (4A/4C/4D via 4E primitives) · formatting bugs «3,40»/«2.340»/«1,0»/«صفر»/«61.818…%» (1A formatter + 4A/4C/4D) · radius anarchy 0/2/3/9999 in-role (1A ladder) · honest-empty overload 5×/25× (4A/4D) · generic onboarding modal (4A) · /student/* deep-link 404s (1B aliases) · mobile table reflow 355px rows @12px (4D + 4E table primitive) · landing 15.8-viewports scroll with tiny CTAs (2).

## 12) Verification protocol (every stage, every changed surface)

Real browser at **360 / 390 / 768 / 1440** in **light + dark**. Pass = no horizontal page scroll; no console errors; no clipped/colliding text; visible focus ring on every control; tap targets ≥44px; AA contrast; Western digits; RTL chevrons/direction correct; loading/empty/error states present; reduced-motion shows complete static result. Then: `npm run lint && npm run typecheck && npm test`, parity + csp gates, `npm run build -w frontend`, and re-promote surface baseline if surfaces changed.
