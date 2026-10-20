# 4E — Community / Assistant / Notifications / Colleges / Shared — Handoff

> Agent 4E · branch `redesign/4e-community-shared` (from origin/main @ cabc3a3, r197+r198 on main).
> Round range: **r260–r269**. Commit prefix `feat(r26N): …` / `fix(r26N): …`.
> Direction: every page = Superlist principles (list-first, quiet rows, detail attached to the item, calm surfaces, soft geometry, one signal accent). Homepage is NOT mine.

## Adopted route list (published early, per mission)

BLUEPRINT §1 assigns 4E the shared/dup pages. Per the team protocol, **Agent S owns auth/onboarding/404/error pages** (`/auth`, `/auth/register`, `/404`, `*`, `AuthPage`, `RegisterPage`, `NotFoundPage`) — subtracted from the 4E rows below. The homepage (`/`, `LandingPage`) is another agent's.

**Routes 4E owns and redesigns (verified against `frontend/src/App.tsx` @ cabc3a3):**

| Route(s) | Component (file) | Note |
|---|---|---|
| `/community` + `/teacher/community` + `/admin/community` + `/quality/community` | `CommunityPage` (`pages/community/CommunityPages.tsx`) | 4 mounts, one file |
| `/competitions`, `/competitions/:id` | `CompetitionsIndexPage`, `CompetitionDetailPage` (`pages/competitions/CompetitionsPages.tsx`) | |
| `/vision`, `/vision/:slug` | `VisionGalleryPage`, `VisionDetailPage` (`pages/vision/VisionPages.tsx`) | |
| `/colleges`, `/colleges/leaderboard`, `/colleges/:id` | `CollegesIndexPage`, `CollegesLeaderboardPage`, `CollegeDetailPage` (`pages/colleges/CollegePages.tsx`) | public routes; identity registry + validator |
| `/training`, `/training/:slug`, `/training/:slug/lesson/:lessonId` | `TrainingCatalogPage`, `TrainingTrackPage`, `TrainingLessonPage` (`pages/student/TrainingPages.tsx`) | student primary role |
| `/achievements` | `AchievementsPage` (same file as training) | gold = achievements only |
| `/student/ai`, `/teacher/ai` | `AiAssistantPage` (`pages/student/AiAssistantPage.tsx`) | «الواحة» assistant; honest engine indicator |
| `/owner/ai` | `OwnerAiPage` (`pages/owner/OwnerAiPage.tsx`) | file sits in owner/ folder; route row is 4E per BLUEPRINT |
| `/student/alerts`, `/teacher/alerts`, `/admin/alerts`, `/quality/notifications`, `/owner/notifications` | `AlertsPage` (exported from `pages/student/MorePages.tsx` L379–560) | the bell page ×5; component is 4E-owned, host file is 4A's (surgical edits only) |
| `components/messages/` (MessagesInbox, MessageComposeModal) | mounted by `/student/messages` (4A wrapper) + `/teacher/messages` (4C wrapper) | files mine; routes are 4A/4C's — no route edits |
| `components/community/CommunitySocialPanels.tsx` | rooms + posts panels inside CommunityPage | mine |

**Unclaimed-route sweep result:** every route row in App.tsx maps to a family (BLUEPRINT's claim «zero unclaimed» holds), with these **boundary files I adopted deliberately** (they are shared/dup surfaces whose route rows land in 4E per BLUEPRINT §1, while their host folders belong to other families):
1. `pages/owner/OwnerAiPage.tsx` — adopted (4E route `/owner/ai`); `OwnerAlertsPage.tsx` left to 4D (its route `/owner/alerts` is a 4D row, distinct from the bell's `/owner/notifications`).
2. `AlertsPage` inside `pages/student/MorePages.tsx` — adopted as component owner; edits confined to the `AlertsPage` function; host file otherwise untouched for 4A.
3. `components/community/CommunitySocialPanels.tsx` — adopted (page-scoped component of my route family).

**Settings/theme/preferences note (honest scope):** there is **no settings page** in this family and no route to add one to (App.tsx is frozen for me). The theme preference backend (`me.themePreference` + `useThemeProfileSync`) and its UI (ThemeToggle) are 1B/shell-owned. The settings-rows pattern (grouped rows, inline controls, instant feedback) is therefore applied to the surfaces I actually own that behave like settings/management: **AlertsPage** (inline mark-read/unread management rows) and the assistant's conversation management rows. A true «الإعدادات» page is net-new and needs a route + coordinator decision — see «Requests».

## Per-page design intent (user goal → mobile recomposition)

| Page | Primary user goal | Mobile recomposition |
|---|---|---|
| Community | «أرى ما الجديد في جامعتي وأتفاعل معه» — scan announcements, posts, events | Tabs become a sticky horizontal chip strip; cards → full-width rows; composer pinned to thumb |
| Competitions index | «أجد مسابقة تناسبني وألتحق قبل الموعد» | Filter pills scroll horizontally; rows full-width, deadline meta visible without tap |
| Competition detail | «أفهم القواعد وأشرك مداخلي وأتابع النتائج» | Hero stacks; entries = rows; sticky enter CTA |
| Colleges index | «أستكشف كليات الجامعة وأقارن» | Campus sections stack; search + chips sticky; cards single-column |
| College detail | «أعرف الكلية: قيادتها، أقسامها، نشاطها» | StatStrip 2×2; section pairs collapse to single column |
| Leaderboard | «أقارن الكليات بالمقاييس وأرتبها» | Table collapses to per-college cards (`tbl-stack` exists) |
| Training catalog | «أختار مسارًا وأبدأ» | KPI strip wraps; track cards single column |
| Track / lesson | «أتقدم في المسار درسًا درسًا» | Lesson rows full-width; sticky next-lesson CTA |
| Achievements | «أرى شاراتي ونقاطي وترتيبي» | Tabs scroll; badge grid 2-col; leaderboard top-10 + expand |
| Assistant | «أسأل وأحصل على إجابة واعية بفجواتي» | Conversation column becomes a sheet/drawer; composer sticks to keyboard edge |
| Notifications | «أستوعب ما يحتاج انتباهي وأفرغه» | Rows full-width; mark-read inline; mark-all in header |
| Vision | «أفهم ماذا قادم بصدق» | Grids → 1col; metrics wrap |
| Messages inbox | «أتابع محادثاتي وأرد» | Day groups stay; rows full-width; reply inline |

## Round log (appended per milestone)

- r260 — setup: branch created, stack booted (tools/boot-pg.sh :5433 + backend :4000 + frontend :5173), demo accounts verified, route map + adoption list published. No UI changes yet.

## Files changed
- (none yet — setup only)

## Requests
- (none yet)
