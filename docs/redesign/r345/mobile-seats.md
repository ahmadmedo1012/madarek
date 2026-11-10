# R345 · F-0 — Mobile illustration seat survey (read-only, 2026-11 · Expo SDK 58)

## 1 · Screen inventory (`apps/mobile/app/`, 2 levels)
- Root: `_layout` · `index` (boot/session handoff) · `+not-found` · about · achievements · campus · community · contact · help · search · select-institution · settings · `(modals)/report`.
- `auth/`: `_layout` · **index = Welcome** (the signature surface: PlanBuilding facade draws in) · login · register · forgot/reset-password. **No onboarding route exists** — `/auth/index` is the only pre-auth narrative seat; `/select-institution` is the post-auth membership gate.
- `student/`: `(tabs)/{ai,alerts,courses,dashboard,profile}` + ar, assignments, calendar, catalog, courses/[offeringId], gamification, jobs, labs, lectures/[lectureId], library, live, map, materials, matrix, messages, mooc, online-exams(+/[templateId]), payment, research, results, schedule, skills, social, university, webinars.
- `teacher/`: `(tabs)/{dashboard,intelligence,profile,schedule,students}` + ai, alerts, assignments, attendance, curriculum, exams(+/[templateId]), grades, labs, live, materials, messages, research-review, students/[offeringId].
- `quality/ (tabs)+alerts+exam-moderation+professors` · `owner/ (tabs)+activity+ai+alerts+content+education+feedback+institutions(+/[slug])+system` · `admin/ (tabs)+alerts+courses+digital+feedback+invites+sync+permissions/[id]`.
- `colleges/{index,[id],leaderboard}` · `competitions/{index,[id]}` · `training/{index,[slug],[slug]/lesson/[lessonId]}` · `vision/{index,[slug]}` · `legal/[doc]` · `document/[filename]`.
- **Empty/loading components today** (`src/components/ui/`): `states.tsx` → `EmptyState{title?,message?,actionLabel?,onAction?,icon?,art?,room?,fill?}` (room: exam-hall|library|lecture-hall|building, R330 plan art at width 216), `ErrorState{message?,onRetry?,onReport?,compact?}`, `OfflineState`, `LoadingScreen{label,onRetry}`, `LoadingState{label}`, `Skeleton{w,h,style}`, `SkeletonList{rows,rowHeight}`, `OfflineBanner{visible}`, `Refreshable{refreshing,onRefresh,children}`; `data.tsx` → `DataList` tri-state (`isLoading/isError`→states.tsx exports; empty→`EmptyState`|`emptySlot`/`emptyTitle`/`emptyMessage`) + `usePagedList`; `boot.tsx` → `Boot`, `InlineBusy`, `usePulseStyle`. ~86 screens import these; **`art`/`room` is the sanctioned illustration slot**.

## 2 · Seat map — max 8, conservative (390×844 · ≥44pt touch · Screen owns safe areas)
| # | Seat (screen) | Illustration `/media/illustrations/r342/…` | alt (contract §3) | Display |
|---|---|---|---|---|
| 1 | `app/auth/index.tsx` Welcome | `hero/hero-campus-mobile-{light,dark}.webp` (768×1440) | تركيب رأسي مخصّص للجوّال من مجمّع التعلّم: قاعة المحاضرات أعلى، معرض المكتبة في الوسط، وفناء الأروقة بأسفل — رسم حبر معماري أصلي | 390 full-bleed ×~300pt top band, contentFit cover; CTA stack ≥44pt below |
| 2 | `app/select-institution.tsx` "لا عضوية نشطة بعد" | `roles/role-registrar-{light,dark}.webp` | شبّاك المسجّل العام: أرشيف وسجلّ مفتوح — الكليات والمقرّرات والصلاحيات | EmptyState `art`, 216×216 |
| 3 | `app/student/(tabs)/courses.tsx` "لا توجد مقرّرات" | `roles/role-student-{light,dark}.webp` | مقعد الطالب: مكتب دراسة ورف كتب ودرج صاعد — رحلة التعلّم الفردية | EmptyState `art`, 216×216 |
| 4 | `app/student/library.tsx` "لا توجد ملفات" | `journey/journey-library-{light,dark}.webp` | مخطط طابق المكتبة من الأعلى: صفوف الرفوف وطاولات المطالعة | EmptyState `art`, 240×240 |
| 5 | `app/student/research.tsx` "لم ترفع أي بحث بعد" | `problems/problem-04-research-{light,dark}.webp` | خزانة أرشيف متاهية: رسالة بحثية تُدفن خلف أدراج مغلقة — بحث مُودَع لا يُعثر عليه | EmptyState `art`, 216×216 |
| 6 | `app/student/matrix.tsx` "لم تتشكّل مصفوفتك بعد" | `problems/problem-03-mastery-{light,dark}.webp` | برج التقدّم: طابقان شبحان بخطوط متقطعة تمرّ منها خطوط النظر — إتقان غير مرئي | EmptyState `art`, 216×216 |
| 7 | `app/teacher/exams.tsx` "لم تُنشئ قوالب اختبارات بعد" | `roles/role-teacher-{light,dark}.webp` | منصّة الأستاذ: لوح شبكي وصفوف مقاعد — بناء المحاضرات والاختبارات | EmptyState `art`, 216×216 |
| 8 | `app/achievements.tsx` "لا توجد أوسمة بعد" | `why/why-cycle-{light,dark}.webp` (1600×800) | دورة المنصّة من اليمين إلى اليسار: مرصد التعلّم، جدار الفجوات، ممر التدريب، وسلّم التقدّم الصاعد | 342×171 strip above title (2:1) |
- Bench (available, not seated): statement-courtyard (community empty) · journey-route (catalog header band) · footer-skyline (about closing strip, 390×104) · journey-lecture/assessment/mastery, problem-01/02, role-quality/owner · hero-campus 1440 (@2x pairs are web-srcset only).

## 3 · Theme + asset serving
- Pattern (`app/campus.tsx:156`): `WEB_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, "")` (default `https://madarek.onrender.com`) → expo-image `<Image source={{uri}} contentFit transition={200} recyclingKey accessibilityLabel>` (memory+disk cache). Same origin serves `/media/illustrations/r342/**` (19 compositions verified on disk; `manifest.json → illustrations[].assets.{light,dark} + altAr` is the programmatic register — no new serving path needed).
- Dark twin: `useTheme() → {name:"light"|"dark", palette, tones, semantic}`; helpers `usePalette()`, `useSemanticTheme()` (surface/surfaceElevated/sunken/…), `useStatusTones()`; `userInterfaceStyle:"automatic"` + ThemeProvider. Pick the twin off `name === "dark"`; twins share geometry → zero layout shift; distinct URIs cache independently.

## 4 · Art wiring today
- `apps/mobile/app.config.ts`: `assets/images/icon.png`; android adaptiveIcon {foreground,background,monochrome}; expo-splash-screen {bg #F6F6EE, dark #282828, `splash-icon.png`, imageWidth 120}; notifications icon + color #FA3600; web favicon. (No OG on mobile — web-only.)
- `scripts/brand/build-app-icons.mjs` (repo root): parses the 32-grid constants from `apps/mobile/src/brand/mark.ts`, renders ALL 7 app PNGs (icon/adaptive-fg/bg/monochrome/splash/favicon/notification) + `shared/brand/mark.svg`; `--png` writes, `--check` byte-verifies, wired into `npm run tokens:check` → CI.
- Generated sync: `scripts/tokens/build.mjs` (`npm run tokens:build` / `tokens:check`) writes BOTH `frontend/…/tokens.generated.css` AND `apps/mobile/src/design/tokens.generated.ts` and byte-verifies `mark.ts`/`lockups.ts`/`wordmark.generated.ts` web↔RN; `wordmark.generated.ts` was emitted once by `scripts/r323/wordmark-build-r323.mjs`. **Everything is committed by hand + CI-drift-gated** — no script writes into apps/mobile at runtime.

## 5 · Primitives to reuse (compose, don't invent)
- `screen.tsx`: `Screen{children,scroll?,padded?,style?,contentContainerStyle?}` · `FormScreen` · `PageHeader{title,kicker?,mono?,right?,compact?}` · `SectionBar{index,title,action?}`.
- `text.tsx`: `T{variant?,color?,weight?,align?}` — variants `display h1 h2 h3 h4 bodyLg body sm xs mono monoSm`, colors `text secondary muted faint accentInk accent onPrimary onAccent gold danger inherit`; `MonoLabel{children,style?}`; `BidiText`.
- `surfaces.tsx`: `Card{children,style?,onPress?,accessibilityLabel?}` · `Hairline` · `HairlineRows` · `Badge{label,tone?,mono?}` · `SimulatedBadge` · `Sheet` · `ConfirmDialog` · `OptionSheet`.
- `data.tsx`/`pressables.tsx`: `RowList` · `LedgerRow{children,onPress?,accessibilityLabel?,last?,style?}` · `StatLine` · `KpiCard` · `ProgressBar{ratio,height?,accent?,label?}` · `Avatar` · `DataList` · `makeRow` · `usePagedList` · `Button{label,kind?:primary|accent|danger|ghost,small?,loading?}`.
- `design/tokens.ts`: `sp` rungs **2·4·6·8·10·12·16·20·24·32·40·48·56·72·96·128·160·192·240**; `touchFloor 44`; `radius {none:0, full:9999}`; type ladder monoXXS 10 → display 36 (+screenTitle 28, statNumber 44). `brand/plan`: `PlanBuilding|PlanLectureHall|PlanExamHall|PlanLibrary{width?,autoplay?,progress?,accessibilityLabel?}` — the vector signature the raster twins complement.

## 6 · Blockers / notes for the campus.tsx → university-card port
- Source ready: `shared/media/university-cards.ts` — `UNIVERSITY_CARDS` (9 specs; ids match campus.tsx HERO+RAIL photo ids 1:1), `cardById`, `drawComposition → {strokes: Line4[], arcs: Arc9[], accent}`. Pure data, RN-importable as-is.
- **react-native-svg 15.16 has NO `vectorEffect`** (absent from its d.ts; documented at `src/brand/Logo.tsx:12`): the web card's `non-scaling-stroke` hairlines must be recomputed in viewBox units — established pattern in `Logo.tsx` (1.5 @32-grid) and the plan library.
- Prefer RN text over `<Svg><Text>` for nameAr/subAr/nn/nameEn/cityAr (RTL shaping + a11y): seat `T`/`MonoLabel` around the Svg, keep the Svg to `Line`/`Path`/`Rect` (`G` fine; arc `d` strings work verbatim) — mirrors the web's "text is real text" rule.
- R345 PLAN-F deletes `frontend/public/media/universities/` — the port is **mandatory**, not cosmetic: campus.tsx's expo-image/photoUrl webp rail dies with that folder.
