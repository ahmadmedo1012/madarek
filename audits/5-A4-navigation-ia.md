# Audit 5-A4 — Navigation, IA & Wayfinding (all roles)

**Campaign 5 «الحرفة الختامية» · audit-only — zero source edits, zero git ops.**
Scope: App.tsx routing, AppShell (sidebar/topbar/bottom-nav/drawer), GlobalSearch,
CommandPalette, back/breadcrumb patterns, page titles, nav copy & order, active
states, RTL direction, skip-link/keyboard, nav badges.

Method: live probes (playwright chromium-1243 from `frontend/`, localhost:5173,
storage states `/tmp/madarek-states/*.json` + one fresh UI login for search
queries) + full code pass. Probe scripts: `frontend/.agents/tmp/a4-probes/p1…p8`
(+ p3b/p3c/p3d, p4b, p5b, p7, p8). Screenshots: `/tmp/a4-shots/`.
Measured: 91 route-visits for active states (5 roles), 12 deep pages for
wayfinding, 5-role IA census, topbar geometry at 320px, drawer ergonomics at
390px, palette/pill keyboard paths, transition truth-sampling, badge CSS.

Environment notes for reproducibility: the seeded access tokens in the storage
states expire ~15 min after minting; the `mdrk_refresh` cookie keeps the app
working (api.ts refresh interceptor), but the global 1000-req/15-min rate
limiter tripped twice mid-audit (429 → in-page error states); probes were
re-run paced with a fresh backend. The backend must be started in the SAME
shell command as the probe — spawned processes are reaped when the Bash
command ends (known 22-d note, re-confirmed).

---

## 1. Per-role IA census (live, sidebar at 1440 + bottom-nav at 390)

### STUDENT — 5 groups · 31 items (the heaviest nav in the app)
| # | Group | Items (label → href) |
|---|-------|----------------------|
| 1 | الرئيسية | لوحة التحكم `/student/dashboard` · الجدول الدراسي `/student/schedule` · مقرّراتي الدراسية `/student/courses` · النتائج والتقييمات `/student/results` |
| 2 | التعلم الذكي | المصفوفة التعليمية `/matrix` · الاختبارات الإلكترونية `/online-exams` · تحليل الاختبارات `/exams` · المكتبة الإلكترونية · بحوثي العلمية · المعامل الافتراضية · البث المباشر · المساعد الذكي (badge AI) |
| 3 | التطوير والمجتمع | التطوير الذاتي `/training` · الإنجازات والشهادات `/achievements` · المجتمع الجامعي `/community` · كلّيّات الجامعة `/colleges` · **منافسة الكلّيّات `/colleges/leaderboard`** · المسابقات الأكاديميّة `/competitions` · فرص العمل |
| 4 | حسابي والخدمات | ملفي الشخصي · جامعة الزاوية · الشؤون المالية · خريطة الحرم |
| 5 | المزيد | الشبكة الاجتماعية · الندوات وورش العمل · دورات خارجية · مركز التحميلات · النقاط والمستويات · مهاراتي · تجارب AR/VR · الابتكارات القادمة `/vision` |

Bottom-nav (5): الرئيسية `/dashboard` · مقرراتي `/courses` · المساعد `/ai` ·
الإشعارات `/alerts` · حسابي `/profile`.
**Not in the sidebar:** `/student/alerts` (bottom-nav + bell footer only — on
desktop ≥921px the page has **zero** nav marker), deep routes
(`/student/courses/:id`, `/student/lectures/:id`, `/student/online-exams/:id`,
`/training/*`) all have back affordances (§4).

Drawer cost: 31 items → `.sidebar-nav` scrollHeight 1626px vs 574px client at
390×844 — **~3 screens of scrolling** in the mobile drawer (measured).

### TEACHER — 3 groups · 18 items
| # | Group | Items |
|---|-------|-------|
| 1 | لوحة التدريس | لوحة الأستاذ · الذكاء الأكاديمي (AI) · الجدول · الحضور · الدرجات · الملفات التعليمية · الواجبات والاختبارات · بنك الأسئلة والاختبارات |
| 2 | البحث والمحاضرة | البحث العلمي · البث المباشر · المعامل الافتراضية · المكتبة · المساعد الذكي (AI) |
| 3 | حسابي | الملف الأكاديمي · المجتمع الجامعي · كلّيّات الجامعة · المسابقات · الابتكارات القادمة |

Bottom-nav (5): الرئيسية · الجدول · **طلابي `/teacher/students`** · تحليلات
`/teacher/intelligence` · حسابي.
**Not in the sidebar (live-verified zero inbound links, App.tsx:273-281 are the
only references + PAGE_TITLES):**
- `/teacher/students` «قائمة الطلاب» — bottom-nav only ⇒ **unreachable via nav on desktop**.
- `/teacher/performance` «الأداء والتحليل» — **full orphan (URL-only)**.
- `/teacher/messages` «الرسائل» — **full orphan (URL-only)**.
- `/teacher/alerts` — bell footer + one dashboard link (TeacherDashboardPage.tsx:290) only.

### ADMIN — 2 groups · 13 items
الإدارة: لوحة الإدارة · إدارة الأساتذة · الكلّيّات والأقسام · **صفحات الكلّيّات
`/colleges`** · إدارة المقرّرات. النظام: إدارة الطلاب · تحليل الأداء · التحوّل
الرقميّ · التقارير · مزامنة الجامعة · الإعدادات · المجتمع الجامعي · الابتكارات القادمة.
Bottom-nav (5): الرئيسية · الكلّيّات · الطلاب · الأساتذة · التقارير.
**Not in sidebar:** `/admin/alerts` (bell footer only).
Note: admin groups students under «النظام» while teachers sit under «الإدارة» —
asymmetric placement of the same activity class.

### QUALITY — 2 groups · 10 items
مركز ضمان الجودة: لوحة الجودة · جودة المقرّرات · تقييم الأساتذة · الانخراط
والحضور. المراجعة والتقارير: مراجعة الاختبارات · مراجعة المناهج · تقارير
الجودة · المجتمع الجامعي · كلّيّات الجامعة · الابتكارات القادمة.
Bottom-nav (5): الرئيسية · المقررات · المناهج · الانخراط · التقارير.
**Not in sidebar:** `/quality/alerts` (bell footer + 2 dashboard links only).

### OWNER — 3 groups · 12 items
لوحة المالك: لوحة التحكم الرئيسية · المراقبة الحية (LIVE) · إدارة المستخدمين ·
سجل النشاط. المنصة: المحتوى والعلامة التجارية · النظام والتشغيل · النظرة
التعليمية · كلّيّات الجامعة. المراقبة والتحليل: مركز الذكاء الاصطناعي (AI) ·
التنبيهات التشغيلية · الحوكمة المتقدمة · الابتكارات القادمة.
Bottom-nav (5): الرئيسية · المستخدمون · المراقبة · التنبيهات · الحوكمة.
Owner is the only role whose alerts page (`/owner/alerts`) is a first-class
sidebar item — the other four roles hide theirs behind the bell (see P2-8).

### Cross-role naming consistency
| Feature | Student | Teacher | Admin | Quality | Owner | Verdict |
|---|---|---|---|---|---|---|
| المجتمع `/community` | المجتمع الجامعي | المجتمع الجامعي | المجتمع الجامعي | المجتمع الجامعي | — | ✓ consistent |
| كلّيّات `/colleges` | كلّيّات الجامعة | كلّيّات الجامعة | **صفحات الكلّيّات** | كلّيّات الجامعة | كلّيّات الجامعة | admin drifts (P3-1) |
| مسابقات `/competitions` | **المسابقات الأكاديميّة** | **المسابقات** | — | — | — | drift + teacher label ≠ its own topbar title (P3-1) |
| مكتبة (same LibraryPage) | **المكتبة الإلكترونية** | **المكتبة** | — | — | — | same feature, two names (P3-2) |
| التنبيهات page | الإشعارات (bottom-nav only) | الإشعارات (bell only) | الإشعارات (bell only) | تنبيهات الجودة (bell only) | التنبيهات التشغيلية (sidebar) | placement + name inconsistent (P2-8) |
| AI assistant | المساعد الذكي | المساعد الذكي | — | — | مركز الذكاء الاصطناعي | ✓ (owner page is genuinely different) |

Label style is noun-consistent (no verb/noun mixing) — good. Ordering follows
most-used-first within groups; teacher puts الذكاء الأكاديمي at slot 2 in the
sidebar but slot 4 in bottom-nav (two different "most-used" models).

---

## 2. Active-state matrix (91 route-visits, desktop + 390px bottom-nav)

- **Exactly one sidebar item active + href == route: 82/91 visits.** No
  cross-role leakage (NavLink per role), correct on every deep route thanks to
  prefix matching (`/competitions/:id` → `/competitions` highlighted, etc.).
- **Bottom-nav (390px):** exactly-one on every route that is a bottom-nav
  destination; zero false actives on other routes; labels don't overflow
  (measured 5×72px cells, no `scrollWidth > clientWidth`).
- **Active visible in both themes** (measured): light text `#5C3416` on
  `#F4E4D2` with role-accent icon `#3B5BDB`; dark text `#E0A067` on `#3D2D1B`.

Issues (9/91):
| Route | Sidebar | Bottom-nav | Root cause |
|---|---|---|---|
| `/colleges/leaderboard` (student) | **2 active** (`/colleges` + `/colleges/leaderboard`) | — | NavLink default prefix match; `/colleges` matches its own sub-path. **P2-1** |
| `/student/alerts` | none | ✓ | not a sidebar item — desktop has no marker at all |
| `/teacher/students` | none | ✓ | sidebar item missing (P1-3) |
| `/teacher/performance` | none | none | orphan (P1-3) |
| `/teacher/messages` | none | none | orphan (P1-3) |
| `/teacher/alerts`, `/admin/alerts`, `/quality/alerts` | none | none | bell-only pages (P2-8) |

---

## 3. Page titles (topbar + document.title)

- `document.title` mirrors every resolved route title («X · مدارك») — verified
  on 5 role homes + 12 deep pages (15-g fix holds; fallback «مدارك» never
  appends the suffix — AppShell.tsx:281-286).
- **Dynamic routes resolve pattern-generic titles** (AppShell.tsx:128-148):
  every course detail tab reads «تفاصيل المقرّر · مدارك», every lecture
  «مشغّل المحاضرة · مدارك», every competition «مسابقة · مدارك». Browser
  history/tab entries are indistinguishable (P2-6).
- Topbar vs H1: teacher/admin/owner dashboards match; **student dashboard h1
  is the greeting «مساء الخير، أحمد»** and **quality h1 is «مركز ضمان
  الجودة»** vs topbar «لوحة الجودة» (P3-10). Deep pages: topbar carries the
  section («تفاصيل المقرّر»), h1 carries the entity («هندسة البرمجيات»)
  — acceptable split, but see P2-6 for the tab title.

---

## 4. Wayfinding on deep pages (12 measured)

| Page | Back affordance | Target | Notes |
|---|---|---|---|
| course detail | «العودة إلى مقرراتي» + ChevronRight | `/student/courses` | ✓ |
| lecture player | link labeled with the course name + ChevronRight | offering detail | ✓ context-rich, different grammar (P3-5) |
| exam taker | «كل الاختبارات» | `/student/online-exams` | ✓; pre-start screen has **no h1** (h2 «هل أنت مستعد للبدء؟» only) |
| competition detail | «كل المسابقات» (button→navigate) | `/competitions` | ✓ |
| vision detail | «كل الابتكارات» | `/vision` | ✓ |
| training track / lesson | «كل المسارات» | `/training` | ✓ |
| document viewer | «رجوع» | `/student/library?tab=research` | ✓ preserves the source tab |
| college detail | «كلّيّات الجامعة» | `/colleges` | ✓ (guest funnel gets a home link — App.tsx:167-183) |
| teacher offering detail | ChevronRight link | `/teacher/intelligence` | ✓ |
| teacher exam template | ChevronRight link | `/teacher/exams` | ✓ |
| admin permissions | «العودة إلى الأساتذة» | `/admin/teachers` | ✓ |

**No dead-ends** among measured deep pages: every one has a back affordance
above the fold + the persistent sidebar. There are **no breadcrumbs anywhere**
(breadcrumbEls = 0 on all pages) — the back-link pattern is the only trail;
consistent ChevronRight = RTL back direction everywhere (verified in code on
all 11 pages + measured hrefs).

Back-link copy grammar drifts across pages: «العودة إلى X» / «كل X» /
«رجوع» / bare entity name (P3-5).

---

## 5. GlobalSearch & CommandPalette

Verified-good (do not regress):
- `/` focuses the pill on desktop (measured focus + combobox ARIA); on the
  ≤920px band it opens the palette (measured `paletteOpen: true`,
  focus in `.cmd-input`) — the pill is `display:none` there and the
  `.topbar-search-toggle` (44×44, measured) is the touch entry.
- ⌘K/Ctrl+K opens shell-wide, auto-focuses the input, **toggles closed**
  (measured open→close), inert while other overlays own the screen
  (overlayStack check, AppShell.tsx:327-340).
- ↑/↓ move `aria-activedescendant` (measured opt-2 «مقرّراتي الدراسية»,
  aria-selected true); **Enter navigates and closes** (measured: palette query
  «هندسة» → Enter → `/document/<paper-id>`, palette unmounted); Esc closes.
- Empty state: «لم نعثر على أوامر تطابق «zzzzqq»» + honest hint; error ≠
  empty (retry row); polite counted-noun live regions on both surfaces.
- Palette = role nav actions + live results sharing the pill's query cache
  (identical `['search','global',term]` key); 60px rows on touch (≥44 floor).
- Empty-state tip pills all return real results (API-verified: هندسة 4,
  بحث 2, برمجة 1, الزاوية 3 hits) — no fake suggestions.

Issues:
- **Stale query after Escape (pill):** Escape blurs but never clears — the
  next `/` refocus reopens the dropdown with the old term and typing
  concatenates. Measured: query read back as «هندسةاختبار». GlobalSearch.tsx:241-245.
  The palette keeps its query too when reopened within its ~exit window
  (measured «zzzzqqد. أحمد» after rapid Esc→⌘K→typing). **P2-3.**
- **Search index scope:** courses/lectures/papers/tracks only. «اختبار» and
  «محاضرة» return 0 rows (API-verified); a professor name («د. أحمد») returns
  0 (no people search); competitions/community threads unsearchable. **P2-4.**
- **Pill vs palette asymmetry:** for «اختبار» the palette surfaces 2 nav
  actions («الاختبارات الإلكترونية», «تحليل الاختبارات» — measured) while
  the desktop pill shows only the empty state. Same query, two answers. **P2-4.**
- **No recent/frequent items** in the palette (measured: only «إجراءات سريعة»). **P3-6.**
- Notification items navigate to the alerts list, never to the subject
  (NotificationDropdown.tsx:126-130 `navigate(alertsPath)`). **P3-7.**

---

## 6. Mobile nav (390 / 320)

- **Drawer RTL:** docked inline-START = physical **right** (x=70, w=320,
  right=390 = viewport edge, measured), slides with `translateX`, Esc closes
  (x back to 390), backdrop shows, body scroll-locked, chords inert
  (overlayStack 'sidebar-drawer'). ✓ (4-A2 P1-4 fix holds)
- **Targets:** close button 44×44, nav items 295×44, logout 44×44 (measured —
  7-b floor holds). Bottom-nav items 72×59 ≥44. ✓
- **Bottom-nav unmounts while the drawer is open** (measured `bottomNavMounted:
  false`) — no stacking; reappears on close. ✓
- **Topbar title at 320px: BROKEN.** The `auto 1fr auto` grid starves the
  title column to **0-10px** (measured on 4 routes: clientW 0/10 vs scrollW
  81-116; actions cluster 202px + burger 44px). The 4-A10 P2 ellipsis fix
  (layout.css:361-366) renders an ellipsis into a 0-10px box — the page name
  is unreadable on the narrowest phones. **P1-2.** Also no `title` attribute
  on the truncated title (craft floor requires a tooltip). P3-8.
- Bottom-nav labels: 11px (A3 P2-5 already filed), no overflow; ≤360px
  condenses to 10px. Active label = bold + accent-ink.
- **Drawer focus is not trapped:** 6/6 Tab presses escaped behind the scrim
  into page content (measured trail: burger → «اسأل AI» → bell → user card →
  welcome-card text → body); focus also never moves into the drawer on open
  (activeElement stays on the burger). Sidebar.tsx registers overlayStack +
  Esc (lines 37-65) but mounts no useFocusTrap. 4-A2 P2-4 still open. **P2-5.**

---

## 7. Transitions, skip-link, keyboard, badges

- **PageTransition:** single keyed remount; `.content-inner` plays the 160ms
  `page-enter` token fade on every route change (truth-sampled: opacity 0 →
  0.99 @40ms → 1 @80ms; animationName `page-enter`, duration 0.16s), plus the
  `.page`-level `madark-page-in` (polish) — the compounding 5-A2 P1-1
  documented; from a wayfinding view the transition is uniform across all
  routes, interruptible, RM-safe (RM probe: zero animation entries). It is
  orientation-neutral (no directional cue) — acceptable, not a finding beyond
  A2's diet recommendation.
- **Skip-link: WORKS.** First Tab stop is «تخطَّ إلى المحتوى الرئيسي»
  (measured), Enter moves focus to `#main` (tabIndex -1). Focus after route
  change stays on the clicked nav link (measured `A#/student/courses`) —
  focus is not lost; title/docTitle update synchronously.
- **Badges:** bell badge hidden at 0 unread (measured null with seeded 0),
  99+ cap, counted-noun aria-label, tnum digits, RM kills the pulse
  (notifications.css:314-318). Contrast fix (21-a) is code-verified: light
  `--c-rose-deep #6B2128` + white = 10.75:1; dark `--c-rose-ink` bg +
  `--c-rose-bg` digits ≈5.3:1 (notifications.css:445-483, tokens-documented).
  Could not be measured live — the seeded student has 0 unread. Nav badges
  (AI gold, LIVE brand) use accent-soft/accent-strong pairs (layout.css:170-184).
- **Bottom-nav active color ignores the role-accent system:** measured
  `rgb(181,116,56)` (#B57438 copper) for the STUDENT role — polish.css:3714
  hard-codes `color: var(--accent)` in the overrides layer, defeating
  notifications.css:251-256 `var(--role-accent, var(--accent))` (012 FR-004).
  The sidebar active icon correctly reads the role accent (#3B5BDB measured).
  Two nav surfaces, two accent systems. **P2-2.**

---

## 8. Findings

### P0 — none.

### P1
- **P1-1 · Teacher dashboard feed CTAs are dead links → 404.**
  Evidence: live-measured — the rendered feed action «مراجعة البحث» has
  `href="/research"`; clicking lands on `/research` → the designed 404
  («هذه الصفحة تغيّبت عن الحضور»). The backend builds root-relative
  `actionTo: '/grades'` / `'/research'` / `'/attendance'`
  (backend/src/http/routes/teacher-dashboard.routes.ts:133, 457, 468) and the
  FE renders it raw (`<Link to={item.actionTo}>`,
  frontend/src/pages/teacher/TeacherDashboardPage.tsx:407-411) — no
  `/teacher` prefix exists for those routes (App.tsx:270-272,274,278).
  Fix sketch: emit `actionTo: '/teacher/grades'` etc. in the route builder
  (3-line backend change) **or** prefix in the FE mapper
  (`actionTo: \`/teacher${item.actionTo}\``). Backend test should pin the
  prefixed paths.
- **P1-2 · Topbar page title collapses to 0-10px at 320px.**
  Evidence: measured `.topbar-title` clientWidth 0px (scrollW 102) on
  `/student/results` @320×700; 10px on 4 sampled routes; the fixed columns eat
  the track (topbar-actions 202px + burger 44px, kids' rects measured;
  layout.css:350-366 `grid-template-columns: auto 1fr auto`).
  Fix sketch: at ≤420px let the title wrap to its own row or shrink the
  actions cluster (drop the user avatar to initials-only 32px, tighten gaps),
  e.g. `@media (max-width: 420px){ .topbar{ grid-template-rows: auto auto }
  .topbar-title{ grid-column: 1 / -1; order: -1; font-size: var(--type-label-size); } }`
  — keep the ≥920px layout untouched. Add `title` attr while truncating (see P3-8).
- **P1-3 · Teacher has three unrouted-home surfaces (orphans) + alerts pages
  carry zero nav marker on desktop.**
  Evidence: `/teacher/performance` «الأداء والتحليل» and `/teacher/messages`
  «الرسائل» have NO inbound link and NO nav item anywhere (grep: only App.tsx
  route + PAGE_TITLES); `/teacher/students` «قائمة الطلاب» lives only in the
  mobile bottom-nav (BottomNav.tsx:49) — desktop-reachable by URL only;
  `/student/alerts` shows no active marker on desktop (measured: sidebar
  none, bottom-nav hidden ≥921px). PAGE_TITLES covers all of them
  (AppShell.tsx:73-77,123-124) — they are intended surfaces.
  Fix sketch (nav.ts only): add «قائمة الطلاب» + «الرسائل» + «الأداء
  والتحليل» to TEACHER_NAV (group 1 slots after الذكاء الأكاديمي, group 3
  for messages), and add «الإشعارات» to every role's sidebar footer-group for
  parity with owner (or a persistent bell-active state).

### P2
- **P2-1 · `/colleges/leaderboard` marks TWO sidebar items active.**
  NavLink prefix matching lights both `/colleges` and `/colleges/leaderboard`
  (nav.ts:55-56; measured both `.on`). Violates exactly-one discipline.
  Fix sketch: `end` on the `/colleges` NavLink (Sidebar.tsx renders NAV_BY_ROLE
  items — add an optional `end` flag to NavItem), accepting the loss of parent
  highlight on `/colleges/:id` (that page carries its own back link), or fold
  the leaderboard into `/colleges` as a tab (also fixes the Trophy ×3 overlap).
- **P2-2 · Bottom-nav active state ignores the role-accent system.**
  polish.css:3714 `color: var(--accent)` (overrides layer) beats
  notifications.css:251-256 `var(--role-accent, …)` (pages layer). Measured
  #B57438 for student (role accent #3B5BDB measured on the sidebar icon).
  Fix sketch: change polish.css:3714 (and the `::before` ring at 3717) to
  `var(--role-accent, var(--accent))` + `--role-accent-ink` for the label.
- **P2-3 · Stale search query after Escape.**
  Pill: Escape (GlobalSearch.tsx:241-245) blurs without clearing — measured
  concatenation «هندسةاختبار» on the next `/` focus; dropdown reopens with
  stale results. Palette: reopening inside the exit window keeps the previous
  query (measured «zzzzqqد. أحمد»).
  Fix sketch: clear `setQuery('')` + `setDebounced('')` on Escape in the pill;
  in CommandPaletteBody reset state on `open` transition (or key the body on
  open). Cheap, high-frequency-path.
- **P2-4 · Global search index has no people/competitions/threads and the
  pill lacks the palette's action fallback.**
  «د. أحمد» → 0 (measured); «اختبار»/«محاضرة» → 0 API rows while the palette
  answers with nav actions (2, measured) — desktop pill users get a dead end
  for the same query.
  Fix sketch: (a) backend `/search/global` gains professors (name) +
  competitions (title) sections; (b) FE pill shows a «إجراءات» group fed from
  NAV_BY_ROLE when term ≥1 char (reuse the palette's filter), so both
  surfaces answer consistently.
- **P2-5 · Mobile drawer: no focus trap, no initial focus.**
  Measured 6/6 Tab presses escape behind the scrim; focus never enters the
  drawer on open. Sidebar.tsx:37-65 handles stack+Esc+scroll-lock only.
  Fix sketch: mount `useFocusTrap({ open: sidebarOpen && ≤920px, containerRef:
  asideRef, closeOnEscape: false /* Esc handler already owned */, onClose:
  closeSidebar, overlayKind: 'sidebar-drawer' })` + focus the close button on
  open (matches the Sheet contract).
- **P2-6 · Dynamic-route titles are pattern-generic.**
  Every course tab reads «تفاصيل المقرّر · مدارك» (measured; AppShell.tsx:128-148
  resolves from pathname alone). History entries indistinguishable; the topbar
  never names the entity.
  Fix sketch: pages already own the entity name — let AppShell expose a
  `usePageTitle(title)` context (or a zustand slice) that overrides
  `resolveTitle` per mount; fall back to the static map. Tab title should be
  `${entity} · ${section}`.
- **P2-7 · Student IA overload: 31 items / 5 groups; drawer scrolls ~3 screens.**
  Measured scrollH 1626 vs clientH 574 @390. The «المزيد» bucket (8 items)
  is a junk drawer; three destinations share the Trophy icon (achievements /
  leaderboard / competitions) and two share Building2 (colleges / university).
  Fix sketch: fold «منافسة الكلّيّات» into `/colleges` (tab or CTA — the CTA
  already exists, CollegePages.tsx:362-366); merge «النقاط والمستويات» +
  «مهاراتي» + «الإنجازات والشهادات» into one «تقدّمي» surface with tabs (the
  achievements page already tabs); that alone takes the sidebar to ~24 items
  and unique icons.

### P3
- **P3-1 · Nav label ↔ topbar title drift within a role.** teacher «الجدول»
  vs title «جدول المحاضرات»; «الحضور» vs «الحضور والغياب»; «الدرجات» vs
  «درجات الطلاب» (nav.ts:98-100 vs AppShell.tsx:69-71); admin «صفحات
  الكلّيّات» vs title «كلّيّات الجامعة» (nav.ts:139 vs AppShell.tsx:111);
  teacher «المسابقات» vs title «المسابقات الأكاديميّة» (nav.ts:125 vs
  AppShell.tsx:113). Fix: make PAGE_TITLES derive from nav.ts labels (single
  source) or align the strings.
- **P3-2 · Same feature, different names across roles.** Library:
  «المكتبة الإلكترونية» (student) vs «المكتبة» (teacher) — same LibraryPage.
  Competitions: «المسابقات الأكاديميّة» vs «المسابقات». taste.md: one label
  per intent. Fix: pick one name per feature in nav.ts.
- **P3-3 · Bottom-nav renames destinations.** «الرئيسية» vs «لوحة التحكم»
  (all roles), «تحليلات» vs «الذكاء الأكاديمي» (teacher), «طلابي» vs
  «قائمة الطلاب». Shortening is fine; renaming is not. Fix: use the sidebar
  label's head noun («التحكم» is awkward — prefer renaming the sidebar label
  to «الرئيسية» everywhere, one edit in nav.ts ×5).
- **P3-4 · Icon reuse hurts scannability.** Trophy ×3 + Building2 ×2 in the
  student sidebar (census). Fix: Medal for gamification (already imported),
  Landmark/Trophy for leaderboard, keep Trophy for competitions.
- **P3-5 · Back-link copy grammar inconsistent.** «العودة إلى X» / «كل X» /
  «رجوع» / bare entity name (§4 table). Fix: standardize «العودة إلى X»
  (the platform's own dominant grammar) — 6 small copy edits.
- **P3-6 · No recent/frequent items in the palette.** Measured: only
  «إجراءات سريعة». Fix: persist last 5 navigations from the palette in
  localStorage; render «الأخيرة» group above actions.
- **P3-7 · Notification items never deep-link to their subject.**
  NotificationDropdown.tsx:126-130 always `navigate(alertsPath)`. Fix: extend
  the notification payload with a target href (backend) and fall back to the
  alerts page.
- **P3-8 · Truncated topbar title has no tooltip.** Measured
  `hasTitleAttr: false` on all truncated routes (craft floor: no truncation
  without a title attribute). Fix: `<h? className="topbar-title" title={title}>`.
- **P3-9 · Heading gaps on two learning surfaces.** Exam taker pre-start has
  no h1 (h2 only, measured); LecturePlayerPage renders its title in
  `div.lecture-meta-title` — zero h1-h6 in the file (code-verified).
  Fix: promote those to h1 (visually unchanged via existing classes).
- **P3-10 · Dashboard h1 ≠ topbar title on 2 roles.** Student h1 is the
  greeting «مساء الخير، أحمد» vs topbar «لوحة التحكم»; quality h1 «مركز ضمان
  الجودة» vs «لوحة الجودة» (measured). Fix: prepend an sr-only h1 or align
  the greeting block to include the page name.

---

## 9. Verified-good (do-not-regress)

1. Skip-link → #main focus path (first Tab stop, Enter lands focus).
2. document.title per route + restore-on-unmount; the «مدارك» fallback never
   double-appends.
3. Active-state discipline 82/91 with correct hrefs; both themes; prefix
   parent-highlight on all deep routes.
4. Drawer RTL-right dock + Esc + scroll-lock + chord inertness + 44px floors.
5. Bottom-nav: 5 items/role, ≥44px, no label overflow, aria-label, hide-on-scroll.
6. CommandPalette: full keyboard loop, combobox ARIA + counted-noun live
   regions, shared query cache, toggle-close, 44px touch rows.
7. Search: debounce + abort + error≠empty + honest scope copy + working tip
   pills; Enter-from-palette navigates AND closes.
8. PageTransition: one keyed mechanism, token durations, RM-safe.
9. ROLE_HOME single map (guard + HomeRedirect + onboarding gate — A13 P1-1 fix
   holds; verified gating code AppShell.tsx:258-266).
10. Badge contrast fix (21-a) code-verified both themes; 0-unread hides the
    badge; 99+ cap.

## 10. Quick wins for the fix wave (ordered)

1. P1-1 backend 3-string fix (dead feed CTAs) — highest harm-to-effort ratio.
2. P2-3 stale-query clear on Escape (2 lines + palette remount key).
3. P2-1 `end` flag on `/colleges` NavLink (+ NavItem type).
4. P2-2 role-accent in polish.css:3714-3721 (2 declarations).
5. P1-2 320px topbar title row-wrap block (one media query in layout.css).
6. P1-3 teacher nav.ts additions (3 items) + alerts sidebar parity.
7. P3-1/P3-2 label alignment pass (nav.ts ↔ PAGE_TITLES).
