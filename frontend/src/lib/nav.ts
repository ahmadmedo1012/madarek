import { MessageSquarePlus,
  LayoutDashboard, Calendar, CalendarDays, BookOpen, BarChart3,
  Bot, Library, Trophy, FlaskConical,
  GraduationCap, Briefcase, Building2, Network,
  Users, ClipboardCheck, ListChecks, Upload, TrendingUp,
  ClipboardList, Microscope, School,
  FileText, FileQuestion, ShieldCheck, Activity, Compass, BookMarked, BookCopy,
  Radio, Wallet, MapPin, UserCircle, Brain, Megaphone, RefreshCw,
  Palette, Settings, UserCog, AlertTriangle, MessageCircle, Video, Globe,
  Download, Medal, BadgeCheck, Box, Telescope,
  Bell, Award, Landmark, Inbox,
  type LucideIcon,
} from 'lucide-react';
import { ROUTES } from './routes';
import type { AppRole, AcademicPosition } from '../stores/auth.store';
// R320 §B (c1-RENAME): the role display-name map lives in lib/roleLabels.ts
// (the one source of truth, with the backend twin) — re-exported here so
// every existing ROLE_LABELS import keeps working.
import { ROLE_LABELS } from './roleLabels';

export { ROLE_LABELS };

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: { text: string; tone?: 'brand' | 'gold' | 'default' };
}
export interface NavGroup {
  label: string;
  items: NavItem[];
  /* r183-B7 (A4 P2-3, the 3.2-screen student drawer): groups marked
   * `collapsed` render as ONE toggle row by default (Sidebar.tsx) —
   * the drawer's default scrollHeight stays ≤2 screens at 390px
   * while every route keeps its sidebar home. The group auto-expands
   * while one of its routes is the active page, and one tap opens it
   * any time. The icon rail (desktop `collapsed` sidebar) ignores
   * the flag — it renders every item as an icon anyway. */
  collapsed?: boolean;
}

export const STUDENT_NAV: NavGroup[] = [
  {
    label: 'الرئيسية',
    items: [
      { to: ROUTES.studentDashboard, icon: LayoutDashboard, label: 'لوحة التحكم' },
      { to: ROUTES.studentSchedule, icon: Calendar, label: 'الجدول الدراسي' },
      // r164-c: the one-calendar view — every deadline surface united
      // (schedule + assignments + exam windows + live). CalendarDays so
      // the icon stays unique vs the weekly schedule's Calendar (A4 P3-4).
      { to: ROUTES.studentCalendar, icon: CalendarDays, label: 'التقويم الأكاديمي' },
      { to: ROUTES.studentCourses, icon: BookOpen, label: 'مقرّراتي الدراسية' },
      // r180-F4: the institution's course catalogue (the discovery half of
      // the courses surface — enrollment itself stays admin-mediated).
      { to: ROUTES.studentCatalog, icon: BookCopy, label: 'دليل المقررات' },
      { to: ROUTES.studentResults, icon: BarChart3, label: 'النتائج والتقييمات' },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: ROUTES.studentMatrix, icon: Compass, label: 'المصفوفة التعليمية' },
      { to: ROUTES.studentOnlineExams, icon: ClipboardCheck, label: 'الاختبارات الإلكترونية' },
      // PP-X2 (audit P3-25): «تحليل الاختبارات» (/student/exams) left the
      // sidebar — the hub page was 4 cards, 3 of them repeating sidebar
      // destinations + 1 «قيد الإعداد». The route now redirects to
      // /student/online-exams, so ONE exams entry remains (this one).
      // 4-A14 P1-1 (wave 21-a) had surfaced it as a former orphan; the
      // premium-polish audit ruled the hub a lost click + choice paralysis.
      { to: ROUTES.studentLibrary, icon: Library, label: 'المكتبة الإلكترونية' },
      { to: ROUTES.studentResearch, icon: BookMarked, label: 'بحوثي العلمية' },
      { to: ROUTES.studentAi, icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
    ],
  },
  {
    /* r183-B7 (A4 P2-3): the immersive-learning trio (virtual labs /
       AR-VR / live broadcast) is a coherent low-frequency family —
       one collapsed toggle row instead of three always-visible rows.
       Unique icons preserved (A4 P3-4). */
    label: 'المعامل والتقنيات',
    collapsed: true,
    items: [
      { to: ROUTES.studentLabs, icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: ROUTES.studentAr, icon: Box, label: 'تجارب AR/VR' },
      { to: ROUTES.studentLive, icon: Radio, label: 'البث المباشر' },
    ],
  },
  {
    /* 5-B5 (A4 P2-7 curation) + r183-B7 (A4 P2-3): the growth family
       — self-development hub + the achievements trio + external
       courses + webinars. The achievements fold A4 proposed («النقاط»
       + «مهاراتي» into /achievements) would orphan both routes: the
       achievements page (TrainingPages.tsx) exposes no entries to
       them, and no other surface links either route — so the trio
       keeps its sidebar homes, and the whole family collapses to one
       row instead. */
    label: 'التطوير والتقدّم',
    collapsed: true,
    items: [
      { to: ROUTES.training, icon: GraduationCap, label: 'التطوير الذاتي' },
      { to: ROUTES.achievements, icon: Award, label: 'الإنجازات والشهادات' },
      { to: ROUTES.studentGamification, icon: Medal, label: 'النقاط والمستويات' },
      { to: ROUTES.studentSkills, icon: BadgeCheck, label: 'مهاراتي' },
      { to: ROUTES.studentMooc, icon: Globe, label: 'دورات خارجية' },
      { to: ROUTES.studentWebinars, icon: Video, label: 'الندوات وورش العمل' },
    ],
  },
  {
    /* 5-B5 (A4 P2-1 + P2-7) + r183-B7 (A4 P2-3): «منافسة الكلّيّات»
       left the sidebar (NavLink prefix-match double-active) — the
       leaderboard stays one click from /colleges. The community
       family collapses to one row; /community also stays reachable
       from the webinars page CTA and /competitions from the
       community page CTA. */
    label: 'المجتمع والفرص',
    collapsed: true,
    items: [
      { to: ROUTES.community, icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: ROUTES.studentSocial, icon: MessageCircle, label: 'الشبكة الاجتماعية' },
      { to: ROUTES.colleges, icon: Building2, label: 'كلّيّات الجامعة' },
      { to: ROUTES.competitions, icon: Trophy, label: 'المسابقات الأكاديميّة' },
      { to: ROUTES.studentJobs, icon: Briefcase, label: 'فرص العمل' },
    ],
  },
  {
    label: 'حسابي',
    items: [
      { to: ROUTES.studentProfile, icon: UserCircle, label: 'ملفي الشخصي' },
      /* r171a: the student messages inbox — the DM lifecycle's student
         half (shared inbox; enrolled teachers + prior correspondents as
         the honest recipient pool). Inbox icon: MessageCircle is taken
         by «الشبكة الاجتماعية» (A4 P3-4 unique-icon rule). */
      { to: ROUTES.studentMessages, icon: Inbox, label: 'الرسائل' },
      /* 5-B5 (A4 P1-3/P2-8): the alerts page was bottom-nav + bell
         only — desktop had zero nav marker for it. Every role now
         carries its alerts page as a first-class sidebar item. */
      { to: ROUTES.studentAlerts, icon: Bell, label: 'الإشعارات' },
      /* R320 cycle-3 (PAGES-GAP P2-1): the ANY-AUTHED settings door —
         every role carries it, LAST in the account group (a
         destination, never an interrupting item; UserCog distinct
         from the platform Settings icons in the ADMIN/OWNER navs). */
      { to: ROUTES.settings, icon: UserCog, label: 'إعدادات الحساب' },
    ],
  },
  {
    /* r183-B7 (A4 P2-3): the university-services family A4 asked to
       hub. No hub surface exists — UniversityInfoPage is a facts page
       with no links to the siblings (map/downloads/payment), and the
       pages themselves are out of this wave's file scope — so the
       task's fallback applies: ONE collapsed «خدمات الجامعة» section
       (payment / university / campus guide / downloads / roadmap).
       Auto-expands while one of them is active; map → university has
       its own cross-link (CampusMapPage CTA). */
    label: 'خدمات الجامعة',
    collapsed: true,
    items: [
      { to: ROUTES.studentPayment, icon: Wallet, label: 'الشؤون المالية' },
      /* 5-B5 (A4 P3-4): Building2 ×2 dedupe — the university page
         takes Landmark, colleges keeps Building2. */
      { to: ROUTES.studentUniversity, icon: Landmark, label: 'الجامعة التجريبية' },
      /* 5-B5 (A4 P3-1): one name per surface — the page's own h1 is
         «دليل الحرم الجامعيّ»; the title map used to say «خريطة الحرم
         الجامعي» (a third variant). Titles now derive from these
         labels, so the nav label IS the name. */
      { to: ROUTES.studentMap, icon: MapPin, label: 'دليل الحرم الجامعيّ' },
      { to: ROUTES.studentDownloads, icon: Download, label: 'مركز التحميلات' },
      { to: ROUTES.vision, icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    label: 'لوحة التدريس',
    items: [
      { to: ROUTES.teacherDashboard, icon: LayoutDashboard, label: 'لوحة الأستاذ' },
      { to: ROUTES.teacherIntelligence, icon: Brain, label: 'الذكاء الأكاديمي', badge: { text: 'AI', tone: 'gold' } },
      /* 5-B5 (A4 P1-3): «الأداء والتحليل» was a full orphan — an
         intended surface (PAGE_TITLES + App.tsx route) with zero
         inbound links anywhere. It slots beside its analytics sibling. */
      { to: ROUTES.teacherPerformance, icon: TrendingUp, label: 'الأداء والتحليل' },
      /* 5-B5 (A4 P3-1): the three short labels drifted from their
         surfaces' own names (title map + page h1s said «جدول
         المحاضرات» / «الحضور والغياب» / «درجات الطلاب»). One label
         per intent — the fuller names win everywhere. */
      { to: ROUTES.teacherSchedule, icon: Calendar, label: 'جدول المحاضرات' },
      { to: ROUTES.teacherAttendance, icon: ClipboardCheck, label: 'الحضور والغياب' },
      /* 5-B5 (A4 P1-3): «قائمة الطلاب» lived only in the mobile
         bottom-nav — desktop-reachable by URL alone. */
      { to: ROUTES.teacherStudents, icon: Users, label: 'قائمة الطلاب' },
      { to: ROUTES.teacherMaterials, icon: Upload, label: 'الملفات التعليمية' },
    ],
  },
  {
    /* r183-B6 (A4 P3-8): the grading trio (grades / assignments / exams)
       left «لوحة التدريس» at 10 items — the only group in any role's
       nav above the 9-item ceiling the student drawer already honors
       (nav-coverage pins it for ALL roles now). They are one intent
       family (produce work → grade it), so they become their own
       «التقييم والتصحيح» group instead of a 10-item mega-group. */
    label: 'التقييم والتصحيح',
    items: [
      { to: ROUTES.teacherGrades, icon: ListChecks, label: 'درجات الطلاب' },
      { to: ROUTES.teacherAssignments, icon: ClipboardList, label: 'الواجبات والاختبارات' },
      // 18-F1 — unified online-exam authoring (question bank + templates).
      // Distinct from الواجبات والاختبارات (classroom grading): this is the
      // bank/template/publish pipeline. D17-1: اختبار, never امتحان.
      { to: ROUTES.teacherExams, icon: FileQuestion, label: 'بنك الأسئلة والاختبارات' },
    ],
  },
  {
    label: 'البحث والمحاضرة',
    items: [
      { to: ROUTES.teacherResearch, icon: Microscope, label: 'البحث العلمي' },
      /* 5-B5 (A4 P3-1/P3-2): «البث المباشر» is the STUDENT viewing
         surface's name; the teacher page manages broadcasts (h1
         «إدارة البث المباشر»). «المكتبة» vs the student «المكتبة
         الإلكترونية» was the same drift — one LibraryPage, one name. */
      { to: ROUTES.teacherLive, icon: Radio, label: 'إدارة البث المباشر' },
      { to: ROUTES.teacherLabs, icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: ROUTES.teacherLibrary, icon: Library, label: 'المكتبة الإلكترونية' },
      { to: ROUTES.teacherAi, icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
    ],
  },
  {
    label: 'حسابي',
    items: [
      { to: ROUTES.teacherProfile, icon: UserCircle, label: 'الملف الأكاديمي' },
      /* 5-B5 (A4 P1-3): «الرسائل» was a full orphan (URL-only). */
      { to: ROUTES.teacherMessages, icon: MessageCircle, label: 'الرسائل' },
      /* 5-B5 (A4 P1-3/P2-8): the bell-only alerts page gains its
         sidebar home — parity with the owner role. */
      { to: ROUTES.teacherAlerts, icon: Bell, label: 'الإشعارات' },
      { to: ROUTES.teacherCommunity, icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: ROUTES.colleges, icon: Building2, label: 'كلّيّات الجامعة' },
      /* 5-B5 (A4 P3-2): same feature as the student's «المسابقات
         الأكاديميّة» — one name per intent, not two. */
      { to: ROUTES.competitions, icon: Trophy, label: 'المسابقات الأكاديميّة' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: ROUTES.vision, icon: Telescope, label: 'الابتكارات القادمة' },
      /* R320 cycle-3 (P2-1): teachers finally get the settings door —
         the change-password UI existed ONLY in the student profile
         although the API serves every role (PAGES-GAP T-2). */
      { to: ROUTES.settings, icon: UserCog, label: 'إعدادات الحساب' },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    /* R320 §B: the ADMIN role's group label is its canonical name
       «المسجل العام» (the registrar general — never a generalized
       office construction); one name for the role everywhere (sidebar,
       drawer, topbar kicker, titles). */
    label: 'المسجل العام',
    items: [
      { to: ROUTES.adminDashboard, icon: LayoutDashboard, label: 'لوحة المسجل العام' },
      { to: ROUTES.adminTeachers, icon: School, label: 'إدارة الأساتذة' },
      /* r305 (nav audit, task 2-a): Building2 ×2 dedupe — the A4 P3-4
         unique-icon-per-role rule the student/owner maps already honor
         (university→Landmark, institutions→Landmark). «كلّيّات الجامعة»
         (/colleges, the shared public surface carried by ALL five roles
         with the same glyph) keeps Building2; the faculties-and-
         departments CONSOLE takes Network — the faculty→department tree
         it actually manages. BottomNav's mirrored ADMIN slot re-pointed
         in the same change (r299 mirror contract). */
      { to: ROUTES.adminFaculties, icon: Network, label: 'الكلّيّات والأقسام' },
      /* 5-B5 (A4 P3-1/P3-2): the admin nav was the only role calling
         the shared colleges surface «صفحات الكلّيّات» — one name per
         intent across the five roles. */
      { to: ROUTES.colleges, icon: Building2, label: 'كلّيّات الجامعة' },
      { to: ROUTES.adminCourses, icon: BookOpen, label: 'إدارة المقرّرات' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: ROUTES.adminStudents, icon: GraduationCap, label: 'إدارة الطلاب' },
      /* 5-B4 hand-off: «تحليل الأداء» (/admin/analysis) left the nav —
         the surface is folded into /admin/reports (?trend=table). The
         route row in App.tsx stays (it renders the redirect preserving
         old bookmarks). */
      { to: ROUTES.adminDigital, icon: Activity, label: 'التحوّل الرقميّ' },
      { to: ROUTES.adminReports, icon: FileText, label: 'التقارير' },
      /* 5-B5 (A4 P1-3/P2-8): the bell-only alerts page gains its
         sidebar home — parity with the owner role. */
      { to: ROUTES.adminAlerts, icon: Bell, label: 'الإشعارات' },
      { to: ROUTES.adminSync, icon: RefreshCw, label: 'مزامنة الجامعة' },
      /* R320 cycle-3 (PAGES-GAP T-3): retitled — this is the ADMIN
         platform sheet (identity, DB health, limits), NOT user
         settings; the account door is /settings below (UserCog). */
      { to: ROUTES.adminSettings, icon: Settings, label: 'إعدادات المنصّة' },
      { to: ROUTES.settings, icon: UserCog, label: 'إعدادات الحساب' },
      { to: ROUTES.adminCommunity, icon: Megaphone, label: 'المجتمع الجامعي' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: ROUTES.vision, icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const QUALITY_NAV: NavGroup[] = [
  {
    label: 'مركز ضمان الجودة',
    items: [
      { to: ROUTES.qualityDashboard, icon: ShieldCheck, label: 'لوحة الجودة' },
      { to: ROUTES.qualityCourses, icon: BookOpen, label: 'جودة المقرّرات' },
      { to: ROUTES.qualityProfessors, icon: School, label: 'تقييم الأساتذة' },
      { to: ROUTES.qualityEngagement, icon: Activity, label: 'الانخراط والحضور' },
    ],
  },
  {
    label: 'المراجعة والتقارير',
    items: [
      { to: ROUTES.qualityExamModeration, icon: ClipboardCheck, label: 'مراجعة الاختبارات' },
      { to: ROUTES.qualityCurriculum, icon: ListChecks, label: 'مراجعة المناهج' },
      { to: ROUTES.qualityReports, icon: FileText, label: 'تقارير الجودة' },
      /* r165d (D2): صندوق الإشعارات الشخصي لأخصائي الجودة — وجهة الجرس
         الكاملة (Topbar alertsPath). صفحة AlertsPage المشتركة نفسها التي
         يحملها كل دور، وقرار العنوان هنا هو ما يجعل بوابة تغطية العناوين
         تمرّ (العناوين تستمدّ من تسميات التنقّل). أيقونة Inbox لأنّ Bell
         محجوز لـ«تنبيهات الجودة» في المجموعة نفسها (قاعدة A4 P3-4
         لتفريد الأيقونات). لوحة التنبيهات التشغيلية أدناه باقية كما هي
         برابطها الخاص. */
      { to: ROUTES.qualityNotifications, icon: Inbox, label: 'الإشعارات' },
      /* 5-B5 (A4 P1-3/P2-8): the quality alerts page keeps its own
         canonical name (it is a distinct QualityAlertsPage surface,
         like the owner's «التنبيهات التشغيلية»). */
      { to: ROUTES.qualityAlerts, icon: Bell, label: 'تنبيهات الجودة' },
      { to: ROUTES.qualityCommunity, icon: Megaphone, label: 'المجتمع الجامعي' },
      // 4-A14 P3-5 (23-b): quality + owner can access the public
      // colleges pages (any-auth routes) — the sidebar link follows the
      // teacher/admin grammar (Building2 · كلّيّات الجامعة).
      { to: ROUTES.colleges, icon: Building2, label: 'كلّيّات الجامعة' },
      /* R320 cycle-3 (P2-1): the account settings door. */
      { to: ROUTES.settings, icon: UserCog, label: 'إعدادات الحساب' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: ROUTES.vision, icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const OWNER_NAV: NavGroup[] = [
  {
    label: 'لوحة المالك',
    items: [
      { to: ROUTES.ownerDashboard, icon: LayoutDashboard, label: 'لوحة التحكم الرئيسية' },
      { to: ROUTES.ownerRealtime, icon: Radio, label: 'المراقبة الحية', badge: { text: 'LIVE', tone: 'brand' } },
      { to: ROUTES.ownerUsers, icon: Users, label: 'إدارة المستخدمين' },
      /* r178 (multi-institution): the institution console — create
       * institutions, provision their ADMINs, suspend/reactivate.
       * Landmark because Building2 is taken by «كلّيّات الجامعة» in
       * this role's «المنصة» group (A4 P3-4 unique-icon rule). */
      { to: ROUTES.ownerInstitutions, icon: Landmark, label: 'المؤسسات' },
      { to: ROUTES.ownerActivity, icon: Activity, label: 'سجل النشاط' },
    ],
  },
  {
    label: 'المنصة',
    items: [
      { to: ROUTES.ownerContent, icon: Palette, label: 'المحتوى والعلامة التجارية' },
      { to: ROUTES.ownerSystem, icon: Settings, label: 'النظام والتشغيل' },
      { to: ROUTES.ownerEducation, icon: GraduationCap, label: 'النظرة التعليمية' },
      // 4-A14 P3-5 (23-b): the public colleges pages are reachable for
      // the owner too — grouped with the platform-content items.
      { to: ROUTES.colleges, icon: Building2, label: 'كلّيّات الجامعة' },
    ],
  },
  {
    label: 'المراقبة والتحليل',
    items: [
      { to: ROUTES.ownerAi, icon: Bot, label: 'مركز الذكاء الاصطناعي', badge: { text: 'AI', tone: 'gold' } },
      /* r165d (D2): صندوق الإشعارات الشخصي للمالك — وجهة الجرس الكاملة
         (Topbar alertsPath). صفحة AlertsPage المشتركة نفسها بتسمية
         «الإشعارات» التي يحملها كل دور؛ بند التنقّل هذا هو مدخل العنوان
         أيضًا (بوابة تغطية العناوين). أيقونة Bell المتاحة في هذه القائمة
         (لوحة «التنبيهات التشغيلية» أدناه تحمل AlertTriangle)، واللوحة
         نفسها باقية كما هي. */
      { to: ROUTES.ownerNotifications, icon: Bell, label: 'الإشعارات' },
      { to: ROUTES.ownerAlerts, icon: AlertTriangle, label: 'التنبيهات التشغيلية' },
      // r323 B3.6 — the pilot feedback loop's inbox door.
      { to: ROUTES.ownerFeedback, icon: MessageSquarePlus, label: 'صندوق التغذية الراجعة' },
      /* R320 cycle-3 (P2-1): the account settings door (UserCog — the
         owner's /owner/system row keeps the platform Settings icon). */
      { to: ROUTES.settings, icon: UserCog, label: 'إعدادات الحساب' },
      { to: ROUTES.ownerGovernance, icon: ShieldCheck, label: 'الحوكمة المتقدمة' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: ROUTES.vision, icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const NAV_BY_ROLE: Record<AppRole, NavGroup[]> = {
  STUDENT: STUDENT_NAV,
  TEACHER: TEACHER_NAV,
  ADMIN: ADMIN_NAV,
  QUALITY: QUALITY_NAV,
  OWNER: OWNER_NAV,
};

/* ───────────────────────────────────────────────────────────────────
   ROLE_HOME — the single map for guard redirects (ProtectedRoute,
   GuestRoute, HomeRedirect) AND the onboarding auto-start gate
   (A13 P1-1). r157 (6A4-7 dedup): this map used to live as three
   private copies (AppShell.tsx, App.tsx, AuthPage.tsx +
   RegisterPage.tsx) — keeping it here means the guard bounce, the
   guest bounce, the post-login landing and the tour target can
   never drift apart. The auth pages' own copies are scheduled to
   fold onto this export in their own wave.
   ─────────────────────────────────────────────────────────────────── */
export const ROLE_HOME: Record<AppRole, string> = {
  STUDENT: ROUTES.studentDashboard,
  TEACHER: ROUTES.teacherDashboard,
  ADMIN: ROUTES.adminDashboard,
  QUALITY: ROUTES.qualityDashboard,
  OWNER: ROUTES.ownerDashboard,
};

/* ───────────────────────────────────────────────────────────────────
   ROLE_LABELS — moved to lib/roleLabels.ts (R320 §B, c1-RENAME): the
   one source of truth shared with the backend twin; ADMIN is
   «المسجل العام» there. Re-exported above for every consumer that
   imported it from here.
   ─────────────────────────────────────────────────────────────────── */

const POSITION_LABELS: Record<AcademicPosition, string> = {
  DEAN: 'عميد',
  ASSOCIATE_DEAN: 'وكيل العميد',
  DEPARTMENT_HEAD: 'رئيس قسم',
};

/**
 * Composite role label for the sidebar / topbar / profile chip.
 * Examples:
 *  - regular teacher → "أستاذ"
 *  - dept head       → "أستاذ · رئيس قسم"
 *  - dean            → "أستاذ · عميد كلّيّة الهندسة"  (when faculty name supplied)
 *  - admin university-wide → "المسجل العام"
 *  - admin scoped to faculty → "المسجل العام" (faculty name shown
 *    separately as the scope chip «المسجل العام · كلية …")
 */
export function displayRoleLabel(
  role: AppRole,
  position?: AcademicPosition | null,
  positionFacultyName?: string | null,
): string {
  if (role === 'TEACHER' && position) {
    const base = POSITION_LABELS[position];
    if (position === 'DEAN' && positionFacultyName) {
      return `${ROLE_LABELS.TEACHER} · ${base} ${positionFacultyName}`;
    }
    return `${ROLE_LABELS.TEACHER} · ${base}`;
  }
  return ROLE_LABELS[role];
}
