# الوحدة: المشترك بين الأدوار (منصة)

> كل ما يخدم الخمسة أدوار معًا: المصادقة، الهيكل، السمات، الإشعارات،
> البحث، الكليات، التهيئة، ونظام التصميم.

## 1) المصادقة والجلسات

| الطبقة | الملفات | المضمون |
|---|---|---|
| خلفية | `backend/src/modules/auth/*`، `http/routes/auth.routes.ts`، `lib/jwt.ts`، `lib/password.ts` | argon2id، JWT HS256 مثبت، كوكي `mdrk_refresh`، lockout 5/15د، مساواة زمنية، سياسة كلمات 8–72 + قائمة شائعة |
| واجهة | `frontend/src/stores/auth.store.ts`، `lib/api.ts`، `hooks/useAuth.ts` | persist sessionStorage آمن (probe+fallback)، اعتراض 401→`/auth/refresh` (axios خام 15s)→إعادة إرسال، `queryClient.clear()` عند حدود الجلسة |
| صفحات | `pages/AuthPage.tsx`، `pages/RegisterPage.tsx` | دخول بريد/رقم جامعي، تسجيل طالب/أستاذ متعدد الخطوات، عرض حالة 429 |

تفصيل أمني كامل: [../10-security.md](../10-security.md).

## 2) الهيكل والتنقل

- `frontend/src/components/layout/AppShell.tsx`: Sidebar/Topbar/BottomNav
  (5 عناصر لكل دور)، `ProtectedRoute` (ينتظر `isHydrated` ثم يوجه بالدور)،
  `ScrollProgress`، `PageTransition`، عناوين مستندات من `lib/nav.ts`
  (بوابة تغطية)، تركيز بعد تنقل SPA، CommandPalette بـ⌘K.
- `GlobalSearch.tsx` (862 سطرًا): combobox ARIA، إحباط طلبات، تفويض ⌘K،
  نتيجة `/search/global` بالتطبيع العربي.

## 3) السمات ونظام التصميم

- `frontend/src/styles/tokens.css` (1,148 سطرًا): طبقات `@layer`،
  سمتان `[data-theme="light|dark"]`، ألوان أدوار `body[data-role]`،
  سلالم مسافات/نصف قطر/حركة/ظلال/z.
- `motion.css`: عائلات `--motion-duration-*` وقاطع `prefers-reduced-motion`؛
  `base.css` حزام 0.01ms إضافي.
- `fonts.css`: IBM Plex Sans Arabic 400–700 مستضاف ذاتيًا (12 woff2،
  أول رسم ≈86KB عبر preloads في `index.html`) + Plex Serif italic
  (لاتيني فقط بأعراف 21-c) + Plex Mono.
- bootstrap السمة: سكربت داخلي في `index.html` يقرأ `madarek-theme`
  قبل أول رسم ويثبت `data-theme` + `theme-color` — **بصمته في CSP**
  (`backend/src/app.ts`)، والبوابة `check-csp-hash` تفرض التزامن.
- الأيقونات: Lucide فقط عبر `components/Icon.tsx` (استثناءات موثقة:
  `EmojiIcon`، `LibyaFlag`، `Illustration`) — بوابة `check-icons`.
- الرسوم: `lib/chartTheme.ts` + `components/charts/ChartFrame.tsx`
  (لوحة من المتغيرات، tooltip مخصص، جدول بديل مخفي لكل رسم).
- الطبقات العلوية: `components/overlays/` بعقد `elevation-language.md`
  و`lib/overlayStack.ts` (Escape للطبقة العليا) و`lib/scrollLock.ts`
  (قفل مرجعي العدّ). `Popover`/`Lightbox` بلا مستهلكين — مثبتة بعقد
  (لا تحذف).
- **زوج التصدير**: `unified-parity.css` + `shared-design-system.css`
  غير مستوردَين في التطبيق — مرجع تقطير داخلي يمنع انحراف رموز التصميم،
  تفرضه بوابة parity 163/163. التفصيل: `DESIGN.md` + `docs/PARITY-EXPORT.md`.

## 4) الإشعارات والرسائل

- خلفية: `me.routes.ts` — قوائم/قراءة، إرسال رسالة بإشعار في معاملة
  واحدة وحد 30/د.
- واجهة: `NotificationDropdown.tsx` — عدّاد غير مقروء (استقصاء 60 ثانية
  والقائمة مغلقة) + قائمة 50 عنصرًا فقط وهي مفتوحة، فخ تركيز، إغلاق
  بوعي بالمسار.

## 5) المجتمع والإعلانات

- سطحان مقصودان: `/community` (إعلانات رسمية بنطاقات PLATFORM/
  FACULTY/DEPARTMENT/OFFERING — `CommunityPages.tsx`) و`/student/social`
  (منشورات أقران بوسوم عربية وتفاعلات تفاؤلية بمصالحة من الخادم —
  `MorePages.tsx`). مسابقات وأحداث حرم: `CompetitionsPages.tsx`
  (`Competition/CompetitionEntry`, `CampusEvent/EventRSVP`).

## 6) الكليات والواجهة التعريفية

- سجل هوية 25 كلية: `frontend/src/data/colleges.config.ts` (أسماء/مدن/
  slug/ألوان AA/أيقونات Lucide) — بوابة `npm run validate:colleges`
  تفرض التباين والأصول. واجهة JSON-LD في `index.html` تنص على «25 هي
  الحقيقة».
- صفحات: `pages/colleges/CollegePages.tsx` + `filter-colleges.ts`
  (فلتر نقي غير حساس للتشكيل) + `CollegesPopover` في الهبوط؛
  `/colleges/leaderboard` ترتيب عام.
- الهبوط: `pages/LandingPage.tsx` + `components/landing/` (OrbitScene
  canvas بلا اعتماديات، كوكبة، مسار رحلة، عمق بطل) — «الحرفة» موثقة
  في `DESIGN.md` وبوابات الحركة.
- حقائق الجامعة الخلفية: `/api/v1/colleges*` عامة (بوابة `anonymizeGuestUser`
  للزوار) + `/university/facts` بعد الدخول (zu-sync).

## 7) التهيئة الأولى والميلستونات

- خلفية: `modules/onboarding/service.ts` (كتابة شرطية idempotent
  `onboardingCompletedAt: null` + تدقيق)، `modules/milestones/`
  (كاتالوج ids بنمط مثبت + إلحاق ذري `array_append`، وإطلاق داخلي
  بعنبر `x-internal-service-token` — يفشل مغلقًا).
- واجهة: `components/onboarding/OnboardingFlow.tsx` (4 إطارات، يبدأ
  تلقائيًا على مسار الرئيسية مرة واحدة، إعادة من مساعدة Sidebar)
  و`MilestoneScene` بترتيب `selectCanShowMilestone` بعد التهيئة.

## 8) عناصر مشتركة يعتمد عليها الجميع

- `components/primitives/States.tsx`: Empty/Error/Loading/Skeleton
  عائلة كاملة + `PermissionDeniedState`.
- `components/ErrorBoundary.tsx` و`HydrationSplash.tsx`.
- `lib/format.ts`: `countAr` (جمع عربي) وتنسيق `ar-LY`.
- `components/DocumentViewerPage` + `PdfViewer` (pdfjs كسول) — يخدم
  `/document/:filename` بحارس `?back=` آمن.
