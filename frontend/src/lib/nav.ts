import {
  LayoutDashboard, Calendar, BookOpen, BarChart3,
  Bot, Library, Trophy, FlaskConical,
  GraduationCap, Briefcase, Building2,
  Users, ClipboardCheck, ListChecks, Upload, TrendingUp,
  ClipboardList, Microscope, School,
  FileText, FileQuestion, FileBarChart, ShieldCheck, Activity, Compass, BookMarked,
  Radio, Wallet, MapPin, UserCircle, Brain, Megaphone, RefreshCw,
  Palette, Settings, AlertTriangle, MessageCircle, Video, Globe,
  Download, Medal, BadgeCheck, Box, Telescope,
  Bell, Award, Landmark,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole, AcademicPosition } from '../stores/auth.store';

export interface NavItem {
  to: string;
  icon: LucideIcon;
  label: string;
  badge?: { text: string; tone?: 'brand' | 'gold' | 'default' };
}
export interface NavGroup { label: string; items: NavItem[]; }

export const STUDENT_NAV: NavGroup[] = [
  {
    label: 'الرئيسية',
    items: [
      { to: '/student/dashboard', icon: LayoutDashboard, label: 'لوحة التحكم' },
      { to: '/student/schedule', icon: Calendar, label: 'الجدول الدراسي' },
      { to: '/student/courses', icon: BookOpen, label: 'مقرّراتي الدراسية' },
      { to: '/student/results', icon: BarChart3, label: 'النتائج والتقييمات' },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: '/student/matrix', icon: Compass, label: 'المصفوفة التعليمية' },
      { to: '/student/online-exams', icon: ClipboardCheck, label: 'الاختبارات الإلكترونية' },
      // 4-A14 P1-1 (wave 21-a): this route rendered real seeded
      // analytics but had ZERO inbound links anywhere — same for the
      // seven former «المزيد» surfaces, now regrouped below (5-B5).
      { to: '/student/exams', icon: FileBarChart, label: 'تحليل الاختبارات' },
      { to: '/student/library', icon: Library, label: 'المكتبة الإلكترونية' },
      { to: '/student/research', icon: BookMarked, label: 'بحوثي العلمية' },
      { to: '/student/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: '/student/ar', icon: Box, label: 'تجارب AR/VR' },
      { to: '/student/live', icon: Radio, label: 'البث المباشر' },
      { to: '/student/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
    ],
  },
  {
    /* 5-B5 (A4 P2-7 curation): the old «التطوير والمجتمع» + «المزيد»
       pair (7 + 8 items) is re-cut by intent. Growth surfaces — the
       progress trio (achievements / XP / skills, A4 P3-4 icon dedupe:
       Award / Medal / BadgeCheck) + external courses + webinars — form
       one «التطوير والتقدّم» family; community surfaces move to
       «المجتمع والفرص»; utility surfaces fold into «حسابي والخدمات».
       The junk drawer is gone; every route keeps a sidebar home. */
    label: 'التطوير والتقدّم',
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
    /* 5-B5 (A4 P2-1 + P2-7): «منافسة الكلّيّات» left the sidebar — its
       NavLink prefix-match lit BOTH /colleges and /colleges/leaderboard
       (double-active). The destination stays one click away via the
       leaderboard CTA on /colleges (CollegePages.tsx). */
    label: 'المجتمع والفرص',
    items: [
      { to: '/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: '/student/social', icon: MessageCircle, label: 'الشبكة الاجتماعية' },
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
      { to: '/competitions', icon: Trophy, label: 'المسابقات الأكاديميّة' },
      { to: '/student/jobs', icon: Briefcase, label: 'فرص العمل' },
    ],
  },
  {
    label: 'حسابي والخدمات',
    items: [
      { to: '/student/profile', icon: UserCircle, label: 'ملفي الشخصي' },
      /* 5-B5 (A4 P1-3/P2-8): the alerts page was bottom-nav + bell
         only — desktop had zero nav marker for it. Every role now
         carries its alerts page as a first-class sidebar item. */
      { to: '/student/alerts', icon: Bell, label: 'الإشعارات' },
      { to: '/student/payment', icon: Wallet, label: 'الشؤون المالية' },
      /* 5-B5 (A4 P3-4): Building2 ×2 dedupe — the university page
         takes Landmark, colleges keeps Building2. */
      { to: '/student/university', icon: Landmark, label: 'جامعة الزاوية' },
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
      { to: '/teacher/grades', icon: ListChecks, label: 'درجات الطلاب' },
      /* 5-B5 (A4 P1-3): «قائمة الطلاب» lived only in the mobile
         bottom-nav — desktop-reachable by URL alone. */
      { to: '/teacher/students', icon: Users, label: 'قائمة الطلاب' },
      { to: '/teacher/materials', icon: Upload, label: 'الملفات التعليمية' },
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
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'الإدارة',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة الإدارة' },
      { to: '/admin/teachers', icon: School, label: 'إدارة الأساتذة' },
      { to: '/admin/faculties', icon: Building2, label: 'الكلّيّات والأقسام' },
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
      { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
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
      /* 5-B5 (A4 P1-3/P2-8): the quality alerts page keeps its own
         canonical name (it is a distinct QualityAlertsPage surface,
         like the owner's «التنبيهات التشغيلية»). */
      { to: '/quality/alerts', icon: Bell, label: 'تنبيهات الجودة' },
      { to: '/quality/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      // 4-A14 P3-5 (23-b): quality + owner can access the public
      // colleges pages (any-auth routes) — the sidebar link follows the
      // teacher/admin grammar (Building2 · كلّيّات الجامعة).
      { to: '/colleges', icon: Building2, label: 'كلّيّات الجامعة' },
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
      { to: '/owner/alerts', icon: AlertTriangle, label: 'التنبيهات التشغيلية' },
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

export const ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إداري',
  // A person, not the function — «جودة» read as a role chip under a
  // user's name is not a person (15-j P1-8).
  QUALITY: 'أخصائي جودة',
  OWNER: 'مالك المنصة',
};

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
 *  - admin university-wide → "إداري"
 *  - admin scoped to faculty → "إداري كلّيّة"  (faculty name shown separately as a chip)
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
