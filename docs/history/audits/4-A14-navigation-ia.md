# 4-A14 — Navigation IA & Flows Audit («التنقل» · سيادة المظهر · Campaign 4)

**Agent:** 4-A14 · **Scope:** route-level navigation IA — `frontend/src/App.tsx` (routes+guards), `frontend/src/lib/nav.ts`, `frontend/index.html`, plus the navigation behaviors they wire: document.title resolution, deep links, cross-role guards, scroll restoration, back-over-overlay, sidebar nav accuracy, wayfinding on detail pages, empty/error/loading states on 6 core pages.
**Method (all live-measured, DOM-first — VLM used once, its one claim dismissed):** one harness (`/home/z/a14-probe.mjs`, run from `frontend/`) — 111 route probes across 6 role contexts (guest/student/teacher/admin/quality/owner, storageState auth, 1440×900, ar-LY), 10 guard probes, 6 scroll flows, 3 back-over-overlay probes, 69 sidebar click-throughs (all 5 roles), 18 error/empty/loading state probes (page.route abort + 2.5s throttle + zero-match search). Data: `/tmp/a14-data/{census,guards,scroll,overlays,nav,states,ids}.json`. Screenshots (problems only): `/tmp/madarek-shots/a14-*` (16 files from this run; the 15:01 `a14-*` files are from a dead earlier attempt and are not cited). VLM: 1 call (notif-dropdown shot) — its "error page behind the panel" claim was disproven by DOM text (dashboard renders «مساء النور، أحمد…» behind the panel); measurement wins.
**Sibling cross-refs (not duplicated):** A13 register 401 P0 + onboarding-every-route P1 (cross-cited below); A6 teacher→/student/labs dead CTA P1 (cross-cited); A2 shell internals (drawer/clip/search); A3 student-page internals; A9 overlay primitives; A12 titles-vs-typography (this audit owns the *route→title map*, A12 owns typography).

---

## 1 · Route census

**101 route declarations** in App.tsx (34 student · 21 teacher · 13 admin · 9 quality · 10 owner · 5 any-auth [vision/document/competitions] · 3 public colleges · 6 public/aliases) — **111 live probes over 100 unique paths**. Deep-link load: **96/100 render their target** with no unintended redirect and zero console errors; 3 guard-redirects behaved exactly as coded; **1 page crashes (P0-1)**.

| Check | Result |
|---|---|
| Deep links (direct URL entry, all roles) | ✅ 96/100 OK — no soft-404 redirects, no auth loops, `HydrationSplash` never flashes longer than hydration |
| Legacy aliases | ✅ `/login` → `/auth` (App.tsx:195); wildcard `*` renders the designed 404 (A13 scored it 8/10) |
| document.title per route | ⚠️ 93/100 get a real per-route title; **7 fall back to «منصة الزاوية · مدارك»** (P2-1); 8 public/guest pages keep the static base title (A13 P3, cross-ref) |
| English / missing titles | ✅ none |
| Duplicate titles | ⚠️ the 5-teacher-route fallback cluster (P2-1); intentional same-feature pairs («المعامل الافتراضية» student+teacher, «المجتمع الجامعي» ×4 mounts) — acceptable |
| Cross-role guards (10 probes) | ✅ all 6 deny-pairs redirect to the role home; admin→quality correctly allowed; guest→auth preserves `state.from`; **all redirects are 100% silent** (P2-5) |
| Scroll restoration (6 flows) | ✅ exact restore: courses 522→detail 0→back **522** (settled), colleges **2651**, vision **450**; forward re-entry at 0; sidebar nav-change resets to 0. `useScrollRestoration.ts` is a model implementation |
| Sidebar accuracy (69 items × 5 roles) | ✅ every item navigates to its own path; active state matched **69/69**; zero dead links. One nuance: `/colleges/leaderboard` marks **two** items `.on` simultaneously (P3-2) |
| Nav-reachable stubs («قيد التطوير/قريباً») | `/student/payment`, `/student/map`, `/teacher/grades` (entry), `/teacher/materials` (upload), `/admin/settings`, `/quality/reports`, `/owner/content` — all render *honest* notice cards with real surrounding data (page internals owned by A5/A6/A7/A8) |
| Orphan routes (zero inbound links, repo-wide grep) | **9 surfaces** (P1-1) |
| Wayfinding on detail pages | 9/11 have a back affordance (`.back-link`, ghost-btn or `?back=` param); **CollegeDetail has none** (P2-3); CompetitionDetail has one but the page crashes (P0-1) |
| Error states (6 core pages, API abort) | ✅ designed ErrorState + working retry on student dashboard (full-page), library (section-level, graceful degradation), admin dashboard; ❌ teacher grades renders **error-as-empty** (P2-4) |
| Loading states (6 core pages, 2.5s throttle) | ✅ shape-matched skeletons (PageSkeleton/DetailSkeleton) or designed LoadingState on all 6 |
| Empty states | ✅ library zero-match → «لا توجد كتب تطابق البحث» + suggestion chips; global search zero-match → suggestions; community tabs have designed EmptyStates («لا توجد إعلانات بعد»…) |

### Title census — every non-default title anomaly
| Route | Title rendered | Problem |
|---|---|---|
| `/teacher/exams` | `منصة الزاوية · مدارك` | **Sidebar destination** («بنك الأسئلة والاختبارات») unmapped in PAGE_TITLES |
| `/teacher/exams/:templateId` | `منصة الزاوية · مدارك` | No DYNAMIC_TITLES regex for it |
| `/teacher/ai` | `منصة الزاوية · مدارك` | unmapped (nav: «المساعد الذكي») |
| `/teacher/library` | `منصة الزاوية · مدارك` | unmapped (nav: «المكتبة») |
| `/teacher/alerts` | `منصة الزاوية · مدارك` | unmapped (Topbar bell «عرض الكلّ» target) |
| `/admin/alerts` | `منصة الزاوية · مدارك` | unmapped (Topbar bell target) |
| `/student/ar` | `منصة الزاوية · مدارك` | unmapped + orphan route |
| `/` `/auth` `/auth/register` `/404` + all guest `/colleges*` | static `مدارك · منصة التعليم الذكي · جامعة الزاوية` | No title logic outside AppShell (A13 P3 cross-ref) |
| (fallback itself) | `منصة الزاوية · مدارك` | **Wrong brand** — the platform is «مدارك», the fallback names the university platform (AppShell.tsx:125) |

---

## 2 · Findings

### P0 ×1

#### P0-1 · Competition detail page crashes — the whole app blanks (every role, both entry paths)
- **Where:** `frontend/src/pages/competitions/CompetitionsPages.tsx:284` — `<bdi>{c._count.entries}</bdi>`; backend payload `backend/src/http/routes/social.routes.ts:401-424` spreads the raw competition with `include: { entries }` but **no `_count`** (the *list* endpoint includes `_count`, which is why `/competitions` renders fine).
- **Evidence:** student deep-link `/competitions/cmuh085iz00bn74qrm8szboyc` → `TypeError: Cannot read properties of undefined (reading 'entries')` ×3 (stack: `at CompetitionDetailPage (…/CompetitionsPages.tsx:515:64)` in served source) → `#root` textContent **empty** — sidebar, topbar, everything gone (screenshot `a14-p0-competition-crash.png`, a 5.8KB blank frame). Entry path 2: `/community` → competitions tab → `CompetitionCard` links to the same route. Live API check: detail payload keys are `id,title,…,organizer,entries` — **no `_count`**; `entries: []` is present.
- **Fix sketch:** FE one-liner `c.entries.length` (entries already ships in the payload; keeps organizer/public parity), or BE adds `_count: { select: { entries: true } }`. Pair with P1-3 (error boundary) so the next shape drift degrades instead of blanking.

### P1 ×3

#### P1-1 · 9 built surfaces are unreachable — zero inbound links anywhere in the app
- **Where:** `frontend/src/lib/nav.ts:22-65` (STUDENT_NAV) + `nav.ts:67-177` (no `/vision` in any role nav) vs routes in `App.tsx:202-234, 316-324`.
- **Evidence (repo-wide grep + census):** `/student/social` (الشبكة الاجتماعية — full posts feed renders, scrollH 840), `/student/webinars` (ندوات وورش العمل, scrollH 1201), `/student/mooc` (دورات خارجية), `/student/exams` (تحليل الاختبارات), `/student/downloads` (مركز التحميلات), `/student/gamification` (الإنجازات والنقاط), `/student/skills` (المهارات والشهادات), `/student/ar` (تجارب AR/VR) — none appear in STUDENT_NAV, BottomNav, any `Link to=`/`navigate()` in any page (`AppShell.tsx` matches are the title *map*, not links). `/vision` + `/vision/:slug` (الابتكارات القادمة — 12 concepts, scrollH 1290) is in **no** role's nav and no page links to it — the entire roadmap feature is URL-only. All 9 render real seeded content (census h1s verified).
- **Fix sketch:** add a «المزيد» group to STUDENT_NAV (social, webinars, mooc, exams-analysis, downloads, gamification, skills, ar — 8 items is one group too many; pick a hub or curate) + a shared «الرؤية» entry (e.g. in each role's last group or the user menu). Alternatively delete the dead routes — but they render real data, so surfacing is the higher-value fix.

#### P1-2 · Public college funnel dead-ends in an auth error — landing → college = «يلزم تسجيل الدخول»
- **Where:** `backend/src/http/routes/colleges.routes.ts:354` (`GET /colleges/:id` behind `authMiddleware`) and `:161` (leaderboard, same) — vs the FE's public layout `App.tsx:166-182` (CollegesLayout, ruling #9 «world-readable»), the public gallery CTA `CollegePages.tsx:363`, every college card `CollegePages.tsx:326-331`, and the landing popover's per-college deep links `components/CollegesPopover.tsx:177-189`.
- **Evidence:** `curl` unauthenticated: `/api/v1/colleges` → 200 (public, as documented at colleges.routes.ts:18-22), `/api/v1/colleges/:id` → **401**. Guest flow probed live: landing popover/gallery card click → «تعذَّر تحميل هذا القسم · يلزم تسجيل الدخول للمتابعة · إعادة المحاولة» — a dead-end error whose retry can never succeed (screenshots `a14-guest-college-detail-401.png`, `a14-guest-leaderboard.png`). Same for guest `/colleges/leaderboard`. The signed-in flow works (student census detail renders «كلية الآداب»).
- **Fix sketch:** either open the detail to guests with a PII-safe payload (the bundle leaks `topStudents` names/avatars — strip or anonymize when unauthenticated) **or** keep it authed but give guests a designed sign-in CTA state («سجّل الدخول لاستكشاف الكلّيّة») instead of a retryable error. Same choice for the leaderboard (aggregate numbers, no PII — safe to open).

#### P1-3 · No React error boundary anywhere — any render crash = total white screen
- **Where:** `App.tsx:184-343` (no ErrorBoundary component in the tree; repo-wide grep for `componentDidCatch|getDerivedStateFromError|ErrorBoundary` → **0 hits**).
- **Evidence:** P0-1 blanks the entire app — not just the route pane — because the crash propagates to the root. The user loses the sidebar, the notifications, everything; the only recovery is a manual reload.
- **Fix sketch:** one `RouteErrorBoundary` wrapping the AppShell's inner `<Suspense>` (AppShell.tsx:294) rendering the NotFound-style recovery surface («حدث خطأ غير متوقّع» + إعادة المحاولة + العودة للرئيسية), keyed on `location.pathname` so it resets per route. ~40 lines, platform-wide insurance.

### P2 ×5

#### P2-1 · 7 routes get the generic wrong-brand fallback title «منصة الزاوية · مدارك»
- **Where:** `frontend/src/components/layout/AppShell.tsx:26-103` (PAGE_TITLES gaps), `:105-117` (DYNAMIC_TITLES has no `/teacher/exams/:templateId`), `:125` (fallback string names «منصة الزاوية», not the product «مدارك»).
- **Evidence:** live census — `/teacher/exams` (a primary sidebar destination), `/teacher/exams/:templateId`, `/teacher/ai`, `/teacher/library`, `/teacher/alerts`, `/admin/alerts`, `/student/ar` all render the fallback. Nav probe shows teacher clicking «بنك الأسئلة والاختبارات» → tab reads «منصة الزاوية · مدارك».
- **Fix sketch:** add the 6 static entries + 1 dynamic regex to AppShell's maps and change the fallback to `'مدارك'` (or the platform base). 10-minute fix, high tab/history payoff.

#### P2-2 · Notification panel survives browser-back — still open, `aria-expanded="true"`, over the previous page
- **Where:** `frontend/src/components/layout/NotificationDropdown.tsx:51` — `const [open, setOpen] = useState(false)` with no location-keyed reset.
- **Evidence:** dashboard → sidebar → library → open bell → `page.goBack()` → `/student/dashboard` with `.notification-panel` **still visible** (rect x:142 y:52 380×540, `visibility:visible`, `opacity:1`) and the bell still `aria-expanded="true"` (screenshot `a14-notif-dropdown-survives-back.png`; VLM's contradictory claim about the page behind was disproven by DOM text — dashboard renders normally). Sidebar *clicks* do close it (outside-click), so only history/direct-nav leaves it stranded.
- **Fix sketch:** `const location = useLocation(); useEffect(() => setOpen(false), [location.pathname])` inside NotificationDropdown (or lift open-state reset into Topbar).

#### P2-3 · College detail page has no back link or breadcrumb for signed-in users
- **Where:** `frontend/src/pages/colleges/CollegePages.tsx:399-487+` — the detail page opens directly with the `SectionAccent` hero; repo grep finds no back-link/«العودة»/`to="/colleges"` anywhere in the file. Only guests get the layout-level «العودة إلى الصفحة الرئيسية» (App.tsx:174-177), which goes to `/`, not the gallery.
- **Evidence:** census `backLink: NONE` for student `/colleges/:id`; every sibling detail page (course, lecture, exam template, training, online-exam, vision, document, teacher-offering) has a back affordance — this is the one orphan-style hole in an otherwise consistent pattern.
- **Fix sketch:** copy the standard `<Link to="/colleges" className="btn ghost sm"><Icon icon={ChevronRight}/>كلّيّات الجامعة</Link>` ghost button above the hero (matches CourseDetail/VisionDetail idiom).

#### P2-4 · Teacher grades renders a failed query as «— لا توجد مقرّرات —» (error-as-empty)
- **Where:** `frontend/src/pages/teacher/TeacherPages.tsx:216` — `{offerings.length === 0 && <option value="">— لا توجد مقرّرات —</option>}` renders identically for `isError` and for a genuinely empty list (same pattern at `:350` on a sibling page).
- **Evidence:** aborting `**/api/v1/teacher/me/offerings*` → after react-query's 1 retry exhausts, page shows the normal frame + «— لا توجد مقرّرات —» + «اختر مقرّراً» — `hasErrorUI: false` (screenshot `a14-error-as-empty-teacher-grades.png`). A teacher whose network blipped concludes they have no courses instead of seeing a retry.
- **Fix sketch:** gate on `offsQ.isError ? <ErrorState …/> : offerings.length === 0 && …` — the sibling pages (dashboard, library) already model section-level ErrorStates.

#### P2-5 · Cross-role guard redirects are 100% silent — no signal, no toast, no access-denied surface
- **Where:** `frontend/src/components/layout/AppShell.tsx:315-324` — `ProtectedRoute` deny-path `<Navigate to={home[user.role]} replace />` and nothing else.
- **Evidence:** all 6 deny-probes (student→/admin/dashboard, student→/teacher/grades, teacher→/student/labs, admin→/owner/dashboard, quality→/admin/students, owner→/student/dashboard) landed on the role home with `signal: null` — no toast, no flash, no message. Combined with A6's P1 (teacher-labs «معاينة كطالب» CTA points at a route that bounces), users click a visible affordance and are teleported home with zero explanation.
- **Fix sketch:** navigate with `state: { deniedFrom: location.pathname }` and render a one-shot toast «هذه الصفحة غير متاحة لدورك — تمّت إعادتك إلى لوحتك» (toast infra already global, App.tsx:189).

### P3 ×6

#### P3-1 · `/colleges/leaderboard` lights two sidebar items at once
- **Where:** `NavLink` prefix matching (Sidebar.tsx:148-163) + nav.ts:50-51 — `/colleges` and `/colleges/leaderboard` are siblings, not parent/child. Evidence: nav probe `activeHrefs=["/colleges","/colleges/leaderboard"]`. Fix: `end` prop on the gallery item or nest the leaderboard under it.

#### P3-2 · IA label near-duplicates confuse three achievements surfaces
- **Where:** nav.ts:48 «الإنجازات والشهادات» (/achievements, training-based) vs AppShell.tsx:33 «الإنجازات والنقاط» (/student/gamification, XP) vs AppShell.tsx:34 «المهارات والشهادات» (/student/skills). Three «شهادات/إنجازات» concepts, one reachable, two orphans (P1-1). Fix: resolve when surfacing the orphans — «النقاط والمستويات» for gamification, «مهاراتي» for skills.

#### P3-3 · Nav-label ↔ page-title drift on 3 destinations
- `/student/map` nav «خريطة الحرم» vs h1 «دليل الحرم الجامعيّ»; `/admin/digital` nav «التحوّل الرقميّ» vs title «التحول الرقمي» (hamza); `/teacher/live` nav «البث المباشر» vs title «إدارة البث المباشر» (last one defensible). Fix: align on the nav.ts string as canonical (AppShell reads from a shared map — see P2-1 fix).

#### P3-4 · Modals are URL-blind: browser-back destroys the page instead of closing the overlay
- **Where:** platform pattern — overlays register in `overlayStack` (Sidebar.tsx:37, A9's verified Esc choreography) but never in history. Evidence: teacher exam-builder modal open on `/teacher/exams` → `goBack()` → navigated to `/teacher/dashboard`, modal unmounted (data preserved only by discard-guards). On Android (hardware back) this is the dominant close gesture. Fix sketch (platform decision): either push a `?modal=` state or intercept popstate while `overlayStack` is non-empty. Cross-ref A9 (owns overlay primitives).

#### P3-5 · Quality/Owner roles have no route to the colleges gallery (or vision)
- **Where:** nav.ts:130-177 — QUALITY_NAV and OWNER_NAV lack `/colleges` (admin and teacher have it). Combined with P2-3, a quality user who somehow lands on `/colleges/:id` has no in-page or in-nav way back to the gallery. Minor (deliberate role scoping?) but the vision route (P1-1) affects them identically.

#### P3-6 · Onboarding overlay contaminates deep-link first paints (cross-ref A13 P1)
- A13 proved it auto-starts on every authed route; my census had to dismiss it on cold deep-links (it would otherwise mask every first-paint probe). Re-cited here because deep-links are this audit's surface — the fix (gate to `ROLE_HOME[role]`) is already specced in A13.

---

## 3 · Verified-good — do not regress

- **`useScrollRestoration.ts` is exact:** per-`location.key` sessionStorage positions, POP-restore after layout via rAF, PUSH/REPLACE reset to top, correct container (`.content` not window). Measured perfect restores on 3 real heights (522 / 2651 / 450) incl. after refetch settle.
- **Guard matrix is complete and loop-free:** every deny-pair lands on the role home in one hop; admin→quality allowed by design (App.tsx:285); guest deep-links carry `state.from` for post-login resume (A13-verified `readFromPath`).
- **69/69 sidebar items** navigate correctly with matching active state across all 5 roles; BottomNav destinations all valid.
- **Error states on core pages are genuinely designed** (student dashboard full-page ErrorState; library section-level degradation that keeps KPIs/other sections alive; admin dashboard ErrorState) with working retry buttons; retry policy is smart (`queryClient.ts` — 1 retry, transient-only).
- **Wayfinding idiom is consistent on 9/11 detail surfaces** — RTL-correct `ChevronRight`=back, `.back-link` family, DocumentViewer's `?back=` param with the in-app path guard.
- **Wildcard 404** renders the designed surface on any unknown URL (no soft-404 redirect, App.tsx:337); `/login` alias handled.

## 4 · Top-10 quick wins (effort-ordered)

1. **P0-1:** `CompetitionsPages.tsx:284` → `c.entries.length` (one line, unblanks a whole feature).
2. **P2-1:** 6 PAGE_TITLES entries + 1 DYNAMIC_TITLES regex + fallback → «مدارك» (10 lines).
3. **P1-3:** one `RouteErrorBoundary` around AppShell's inner Suspense (~40 lines, kills white-screen class).
4. **P2-2:** NotificationDropdown closes on `location.pathname` change (2 lines).
5. **P2-3:** back-link above the college detail hero (3 lines, copies the course idiom).
6. **P2-4:** `offsQ.isError` branch in GradesPage select (5 lines).
7. **P2-5:** denied-navigation toast via `navigate(..., {state})` (≈10 lines).
8. **P1-2 (backend):** public leaderboard + PII-stripped guest detail **or** guest sign-in CTA state (route-level, ~1h).
9. **P1-1 (product):** add the «المزيد» nav group + «الرؤية» entry (nav.ts only — the pages already exist).
10. **P3-1:** `end` prop on the `/colleges` NavLink (1 line).

## 5 · Files to touch

| File | Findings |
|---|---|
| `frontend/src/pages/competitions/CompetitionsPages.tsx` | P0-1 |
| `frontend/src/components/layout/AppShell.tsx` | P1-3 (boundary wrap), P2-1 (title maps+fallback), P2-5 (denied state) |
| `frontend/src/components/layout/NotificationDropdown.tsx` | P2-2 |
| `frontend/src/pages/colleges/CollegePages.tsx` | P2-3 (back-link) |
| `frontend/src/pages/teacher/TeacherPages.tsx` | P2-4 |
| `frontend/src/lib/nav.ts` | P1-1 (orphan surfacing), P3-1, P3-2, P3-3, P3-5 |
| `frontend/src/components/layout/Sidebar.tsx` | P3-1 (`end` prop) |
| `backend/src/http/routes/colleges.routes.ts` | P1-2 |
| `backend/src/http/routes/social.routes.ts` | P0-1 (alt. fix: add `_count`) |
| `frontend/src/App.tsx` | P1-2 (guest CTA variant), P1-3 (boundary at root), P3-4 (popstate/overlay decision, coordinate with A9) |
