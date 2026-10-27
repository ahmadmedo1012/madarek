import {
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
      { to: '/student/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
      { to: '/student/schedule', icon: Calendar, label: 'الجدول الدراسي' },
      // r164-c: the one-calendar view — every deadline surface united
      // (schedule + assignments + exam windows + live). CalendarDays so
      // the icon stays unique vs the weekly schedule's Calendar (A4 P3-4).
      { to: '/student/calendar', icon: CalendarDays, label: 'التقويم الأكاديمي' },
      { to: '/student/courses', icon: BookOpen, label: 'مقرّراتي الدراسية' },
      // r180-F4: the institution's course catalogue (the discovery half of
      // the courses surface — enrollment itself stays admin-mediated).
      { to: '/student/catalog', icon: BookCopy, label: 'دليل المقررات' },
      { to: '/student/results', icon: BarChart3, label: 'النتائج والتقييمات' },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: '/student/matrix', icon: Compass, label: 'المصفوفة التعليمية' },
      { to: '/student/online-exams', icon: ClipboardCheck, label: 'الاختبارات الإلكترونية' },
      // PP-X2 (audit P3-25): «تحليل الاختبارات» (/student/exams) left the
      // sidebar — the hub page was 4 cards, 3 of them repeating sidebar
      // destinations + 1 «قيد الإعداد». The route now redirects to
      // /student/online-exams, so ONE exams entry remains (this one).
      // 4-A14 P1-1 (wave 21-a) had surfaced it as a former orphan; the
      // premium-polish audit ruled the hub a lost click + choice paralysis.
      { to: '/student/library', icon: Library, label: 'المكتبة الإلكترونية' },
      { to: '/student/research', icon: BookMarked, label: 'بحوثي العلمية' },
      { to: '/student/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
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
      { to: '/student/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: '/student/ar', icon: Box, label: 'تجارب AR/VR' },
      { to: '/student/live', icon: Radio, label: 'البث المباشر' },
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
      { to: '/training', icon: GraduationCap, label: 'التطوير الذاتي' },
      { to: '/achievements', icon: Award, label: 'الإنجازات والشهادات' },
      { to: '/student/gamification', icon: Medal, label: 'النقاط والمستويات' },
      { to: '/student/skills', icon: BadgeCheck, label: 'مهاراتي' },
      { to: '/student/mooc', icon: Globe, label: 'دورات خارجية' },
      { to: '/student/webinars', icon: Video, label: 'الندوات وورش العمل' },
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
      { to: '/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: '/student/social', icon: MessageCircle, label: 'الشبكة الاجتماعية' },
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
      { to: '/competitions', icon: Trophy, label: 'المسابقات الأكاديميّة' },
      { to: '/student/jobs', icon: Briefcase, label: 'فرص العمل' },
    ],
  },
  {
    label: 'حسابي',
    items: [
      { to: '/student/profile', icon: UserCircle, label: 'ملفي الشخصي' },
      /* r171a: the student messages inbox — the DM lifecycle's student
         half (shared inbox; enrolled teachers + prior correspondents as
         the honest recipient pool). Inbox icon: MessageCircle is taken
         by «الشبكة الاجتماعية» (A4 P3-4 unique-icon rule). */
      { to: '/student/messages', icon: Inbox, label: 'الرسائل' },
      /* 5-B5 (A4 P1-3/P2-8): the alerts page was bottom-nav + bell
         only — desktop had zero nav marker for it. Every role now
         carries its alerts page as a first-class sidebar item. */
      { to: '/student/alerts', icon: Bell, label: 'الإشعارات' },
      /* R320 cycle-3 (PAGES-GAP P2-1): the ANY-AUTHED settings door —
         every role carries it, LAST in the account group (a
         destination, never an interrupting item; UserCog distinct
         from the platform Settings icons in the ADMIN/OWNER navs). */
      { to: '/settings', icon: UserCog, label: 'إعدادات الحساب' },
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
      { to: '/student/payment', icon: Wallet, label: 'الشؤون المالية' },
      /* 5-B5 (A4 P3-4): Building2 ×2 dedupe — the university page
         takes Landmark, colleges keeps Building2. */
      { to: '/student/university', icon: Landmark, label: 'الجامعة التجريبية' },
      /* 5-B5 (A4 P3-1): one name per surface — the page's own h1 is
         «دليل الحرم الجامعيّ»; the title map used to say «خريطة الحرم
         الجامعي» (a third variant). Titles now derive from these
         labels, so the nav label IS the name. */
      { to: '/student/map', icon: MapPin, label: 'دليل الحرم الجامعيّ' },
      { to: '/student/downloads', icon: Download, label: 'مركز التحميلات' },
      { to: '/vision', icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    label: 'لوحة التدريس',
    items: [
      { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'لوحة الأستاذ' },
      { to: '/teacher/intelligence', icon: Brain, label: 'الذكاء الأكاديمي', badge: { text: 'AI', tone: 'gold' } },
      /* 5-B5 (A4 P1-3): «الأداء والتحليل» was a full orphan — an
         intended surface (PAGE_TITLES + App.tsx route) with zero
         inbound links anywhere. It slots beside its analytics sibling. */
      { to: '/teacher/performance', icon: TrendingUp, label: 'الأداء والتحليل' },
      /* 5-B5 (A4 P3-1): the three short labels drifted from their
         surfaces' own names (title map + page h1s said «جدول
         المحاضرات» / «الحضور والغياب» / «درجات الطلاب»). One label
         per intent — the fuller names win everywhere. */
      { to: '/teacher/schedule', icon: Calendar, label: 'جدول المحاضرات' },
      { to: '/teacher/attendance', icon: ClipboardCheck, label: 'الحضور والغياب' },
      /* 5-B5 (A4 P1-3): «قائمة الطلاب» lived only in the mobile
         bottom-nav — desktop-reachable by URL alone. */
      { to: '/teacher/students', icon: Users, label: 'قائمة الطلاب' },
      { to: '/teacher/materials', icon: Upload, label: 'الملفات التعليمية' },
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
      { to: '/teacher/grades', icon: ListChecks, label: 'درجات الطلاب' },
      { to: '/teacher/assignments', icon: ClipboardList, label: 'الواجبات والاختبارات' },
      // 18-F1 — unified online-exam authoring (question bank + templates).
      // Distinct from الواجبات والاختبارات (classroom grading): this is the
      // bank/template/publish pipeline. D17-1: اختبار, never امتحان.
      { to: '/teacher/exams', icon: FileQuestion, label: 'بنك الأسئلة والاختبارات' },
    ],
  },
  {
    label: 'البحث والمحاضرة',
    items: [
      { to: '/teacher/research', icon: Microscope, label: 'البحث العلمي' },
      /* 5-B5 (A4 P3-1/P3-2): «البث المباشر» is the STUDENT viewing
         surface's name; the teacher page manages broadcasts (h1
         «إدارة البث المباشر»). «المكتبة» vs the student «المكتبة
         الإلكترونية» was the same drift — one LibraryPage, one name. */
      { to: '/teacher/live', icon: Radio, label: 'إدارة البث المباشر' },
      { to: '/teacher/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: '/teacher/library', icon: Library, label: 'المكتبة الإلكترونية' },
      { to: '/teacher/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
    ],
  },
  {
    label: 'حسابي',
    items: [
      { to: '/teacher/profile', icon: UserCircle, label: 'الملف الأكاديمي' },
      /* 5-B5 (A4 P1-3): «الرسائل» was a full orphan (URL-only). */
      { to: '/teacher/messages', icon: MessageCircle, label: 'الرسائل' },
      /* 5-B5 (A4 P1-3/P2-8): the bell-only alerts page gains its
         sidebar home — parity with the owner role. */
      { to: '/teacher/alerts', icon: Bell, label: 'الإشعارات' },
      { to: '/teacher/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
      /* 5-B5 (A4 P3-2): same feature as the student's «المسابقات
         الأكاديميّة» — one name per intent, not two. */
      { to: '/competitions', icon: Trophy, label: 'المسابقات الأكاديميّة' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: '/vision', icon: Telescope, label: 'الابتكارات القادمة' },
      /* R320 cycle-3 (P2-1): teachers finally get the settings door —
         the change-password UI existed ONLY in the student profile
         although the API serves every role (PAGES-GAP T-2). */
      { to: '/settings', icon: UserCog, label: 'إعدادات الحساب' },
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
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة المسجل العام' },
      { to: '/admin/teachers', icon: School, label: 'إدارة الأساتذة' },
      /* r305 (nav audit, task 2-a): Building2 ×2 dedupe — the A4 P3-4
         unique-icon-per-role rule the student/owner maps already honor
         (university→Landmark, institutions→Landmark). «كلّيّات الجامعة»
         (/colleges, the shared public surface carried by ALL five roles
         with the same glyph) keeps Building2; the faculties-and-
         departments CONSOLE takes Network — the faculty→department tree
         it actually manages. BottomNav's mirrored ADMIN slot re-pointed
         in the same change (r299 mirror contract). */
      { to: '/admin/faculties', icon: Network, label: 'الكلّيّات والأقسام' },
      /* 5-B5 (A4 P3-1/P3-2): the admin nav was the only role calling
         the shared colleges surface «صفحات الكلّيّات» — one name per
         intent across the five roles. */
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
      { to: '/admin/courses', icon: BookOpen, label: 'إدارة المقرّرات' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: '/admin/students', icon: GraduationCap, label: 'إدارة الطلاب' },
      /* 5-B4 hand-off: «تحليل الأداء» (/admin/analysis) left the nav —
         the surface is folded into /admin/reports (?trend=table). The
         route row in App.tsx stays (it renders the redirect preserving
         old bookmarks). */
      { to: '/admin/digital', icon: Activity, label: 'التحوّل الرقميّ' },
      { to: '/admin/reports', icon: FileText, label: 'التقارير' },
      /* 5-B5 (A4 P1-3/P2-8): the bell-only alerts page gains its
         sidebar home — parity with the owner role. */
      { to: '/admin/alerts', icon: Bell, label: 'الإشعارات' },
      { to: '/admin/sync', icon: RefreshCw, label: 'مزامنة الجامعة' },
      /* R320 cycle-3 (PAGES-GAP T-3): retitled — this is the ADMIN
         platform sheet (identity, DB health, limits), NOT user
         settings; the account door is /settings below (UserCog). */
      { to: '/admin/settings', icon: Settings, label: 'إعدادات المنصّة' },
      { to: '/settings', icon: UserCog, label: 'إعدادات الحساب' },
      { to: '/admin/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: '/vision', icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const QUALITY_NAV: NavGroup[] = [
  {
    label: 'مركز ضمان الجودة',
    items: [
      { to: '/quality/dashboard', icon: ShieldCheck, label: 'لوحة الجودة' },
      { to: '/quality/courses', icon: BookOpen, label: 'جودة المقرّرات' },
      { to: '/quality/professors', icon: School, label: 'تقييم الأساتذة' },
      { to: '/quality/engagement', icon: Activity, label: 'الانخراط والحضور' },
    ],
  },
  {
    label: 'المراجعة والتقارير',
    items: [
      { to: '/quality/exam-moderation', icon: ClipboardCheck, label: 'مراجعة الاختبارات' },
      { to: '/quality/curriculum', icon: ListChecks, label: 'مراجعة المناهج' },
      { to: '/quality/reports', icon: FileText, label: 'تقارير الجودة' },
      /* r165d (D2): صندوق الإشعارات الشخصي لأخصائي الجودة — وجهة الجرس
         الكاملة (Topbar alertsPath). صفحة AlertsPage المشتركة نفسها التي
         يحملها كل دور، وقرار العنوان هنا هو ما يجعل بوابة تغطية العناوين
         تمرّ (العناوين تستمدّ من تسميات التنقّل). أيقونة Inbox لأنّ Bell
         محجوز لـ«تنبيهات الجودة» في المجموعة نفسها (قاعدة A4 P3-4
         لتفريد الأيقونات). لوحة التنبيهات التشغيلية أدناه باقية كما هي
         برابطها الخاص. */
      { to: '/quality/notifications', icon: Inbox, label: 'الإشعارات' },
      /* 5-B5 (A4 P1-3/P2-8): the quality alerts page keeps its own
         canonical name (it is a distinct QualityAlertsPage surface,
         like the owner's «التنبيهات التشغيلية»). */
      { to: '/quality/alerts', icon: Bell, label: 'تنبيهات الجودة' },
      { to: '/quality/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      // 4-A14 P3-5 (23-b): quality + owner can access the public
      // colleges pages (any-auth routes) — the sidebar link follows the
      // teacher/admin grammar (Building2 · كلّيّات الجامعة).
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
      /* R320 cycle-3 (P2-1): the account settings door. */
      { to: '/settings', icon: UserCog, label: 'إعدادات الحساب' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: '/vision', icon: Telescope, label: 'الابتكارات القادمة' },
    ],
  },
];

export const OWNER_NAV: NavGroup[] = [
  {
    label: 'لوحة المالك',
    items: [
      { to: '/owner/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم الرئيسية' },
      { to: '/owner/realtime', icon: Radio, label: 'المراقبة الحية', badge: { text: 'LIVE', tone: 'brand' } },
      { to: '/owner/users', icon: Users, label: 'إدارة المستخدمين' },
      /* r178 (multi-institution): the institution console — create
       * institutions, provision their ADMINs, suspend/reactivate.
       * Landmark because Building2 is taken by «كلّيّات الجامعة» in
       * this role's «المنصة» group (A4 P3-4 unique-icon rule). */
      { to: '/owner/institutions', icon: Landmark, label: 'المؤسسات' },
      { to: '/owner/activity', icon: Activity, label: 'سجل النشاط' },
    ],
  },
  {
    label: 'المنصة',
    items: [
      { to: '/owner/content', icon: Palette, label: 'المحتوى والعلامة التجارية' },
      { to: '/owner/system', icon: Settings, label: 'النظام والتشغيل' },
      { to: '/owner/education', icon: GraduationCap, label: 'النظرة التعليمية' },
      // 4-A14 P3-5 (23-b): the public colleges pages are reachable for
      // the owner too — grouped with the platform-content items.
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
    ],
  },
  {
    label: 'المراقبة والتحليل',
    items: [
      { to: '/owner/ai', icon: Bot, label: 'مركز الذكاء الاصطناعي', badge: { text: 'AI', tone: 'gold' } },
      /* r165d (D2): صندوق الإشعارات الشخصي للمالك — وجهة الجرس الكاملة
         (Topbar alertsPath). صفحة AlertsPage المشتركة نفسها بتسمية
         «الإشعارات» التي يحملها كل دور؛ بند التنقّل هذا هو مدخل العنوان
         أيضًا (بوابة تغطية العناوين). أيقونة Bell المتاحة في هذه القائمة
         (لوحة «التنبيهات التشغيلية» أدناه تحمل AlertTriangle)، واللوحة
         نفسها باقية كما هي. */
      { to: '/owner/notifications', icon: Bell, label: 'الإشعارات' },
      { to: '/owner/alerts', icon: AlertTriangle, label: 'التنبيهات التشغيلية' },
      /* R320 cycle-3 (P2-1): the account settings door (UserCog — the
         owner's /owner/system row keeps the platform Settings icon). */
      { to: '/settings', icon: UserCog, label: 'إعدادات الحساب' },
      { to: '/owner/governance', icon: ShieldCheck, label: 'الحوكمة المتقدمة' },
      // 4-A14 P1-1: the shared roadmap entry (any-auth route).
      { to: '/vision', icon: Telescope, label: 'الابتكارات القادمة' },
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
  STUDENT: '/student/dashboard',
  TEACHER: '/teacher/dashboard',
  ADMIN:   '/admin/dashboard',
  QUALITY: '/quality/dashboard',
  OWNER:   '/owner/dashboard',
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
