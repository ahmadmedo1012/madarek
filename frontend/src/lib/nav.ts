import {
  LayoutDashboard, Calendar, BookOpen, BarChart3,
  Bot, Library, Trophy, FlaskConical,
  GraduationCap, Briefcase, Building2,
  Users, ClipboardCheck, ListChecks, Upload, TrendingUp,
  ClipboardList, Microscope, School,
  FileText, ShieldCheck, Activity, Compass, BookMarked,
  Radio, Wallet, MapPin, Mic2, UserCircle, Brain, Megaphone, RefreshCw,
  type LucideIcon,
} from 'lucide-react';
import type { AppRole } from '../stores/auth.store';

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
      { to: '/student/courses', icon: BookOpen, label: 'مواد مسجلة' },
      { to: '/student/results', icon: BarChart3, label: 'النتائج والتقييمات' },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: '/student/matrix', icon: Compass, label: 'المصفوفة التعليمية' },
      { to: '/student/online-exams', icon: ClipboardCheck, label: 'الاختبارات الإلكترونية' },
      { to: '/student/library', icon: Library, label: 'المكتبة الإلكترونية' },
      { to: '/student/research', icon: BookMarked, label: 'بحوثي العلمية' },
      { to: '/student/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: '/student/live', icon: Radio, label: 'البث المباشر' },
      { to: '/student/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
    ],
  },
  {
    label: 'التطوير والمجتمع',
    items: [
      { to: '/training', icon: GraduationCap, label: 'التطوير الذاتي' },
      { to: '/achievements', icon: Trophy, label: 'الإنجازات والشهادات' },
      { to: '/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: '/student/jobs', icon: Briefcase, label: 'فرص العمل' },
    ],
  },
  {
    label: 'حسابي والخدمات',
    items: [
      { to: '/student/profile', icon: UserCircle, label: 'ملفي الشخصي' },
      { to: '/student/university', icon: Building2, label: 'جامعة الزاوية' },
      { to: '/student/payment', icon: Wallet, label: 'الشؤون المالية' },
      { to: '/student/map', icon: MapPin, label: 'خريطة الحرم' },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    label: 'لوحة التدريس',
    items: [
      { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'لوحة الأستاذ' },
      { to: '/teacher/intelligence', icon: Brain, label: 'الذكاء الأكاديمي', badge: { text: 'AI', tone: 'gold' } },
      { to: '/teacher/schedule', icon: Calendar, label: 'الجدول' },
      { to: '/teacher/attendance', icon: ClipboardCheck, label: 'الحضور' },
      { to: '/teacher/grades', icon: ListChecks, label: 'الدرجات' },
      { to: '/teacher/materials', icon: Upload, label: 'المواد الدراسية' },
      { to: '/teacher/assignments', icon: ClipboardList, label: 'الواجبات والاختبارات' },
    ],
  },
  {
    label: 'البحث والمحاضرة',
    items: [
      { to: '/teacher/research', icon: Microscope, label: 'البحث العلمي' },
      { to: '/teacher/live', icon: Radio, label: 'البث المباشر' },
      { to: '/teacher/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: '/teacher/library', icon: Library, label: 'المكتبة' },
      { to: '/teacher/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
    ],
  },
  {
    label: 'حسابي',
    items: [
      { to: '/teacher/profile', icon: UserCircle, label: 'الملف الأكاديمي' },
      { to: '/teacher/community', icon: Megaphone, label: 'المجتمع الجامعي' },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'الإدارة',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة الإدارة' },
      { to: '/admin/teachers', icon: School, label: 'إدارة الأساتذة' },
      { to: '/admin/faculties', icon: Building2, label: 'الكليات والأقسام' },
      { to: '/admin/courses', icon: BookOpen, label: 'إدارة المقررات' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { to: '/admin/reports', icon: FileText, label: 'التقارير' },
      { to: '/admin/sync', icon: RefreshCw, label: 'مزامنة الجامعة' },
      { to: '/admin/community', icon: Megaphone, label: 'المجتمع الجامعي' },
    ],
  },
];

export const QUALITY_NAV: NavGroup[] = [
  {
    label: 'مركز ضمان الجودة',
    items: [
      { to: '/quality/dashboard', icon: ShieldCheck, label: 'لوحة الجودة' },
      { to: '/quality/courses', icon: BookOpen, label: 'جودة المقررات' },
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
      { to: '/quality/community', icon: Megaphone, label: 'المجتمع الجامعي' },
    ],
  },
];

export const NAV_BY_ROLE: Record<AppRole, NavGroup[]> = {
  STUDENT: STUDENT_NAV,
  TEACHER: TEACHER_NAV,
  ADMIN: ADMIN_NAV,
  QUALITY: QUALITY_NAV,
};

export const ROLE_LABELS: Record<AppRole, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إداري',
  QUALITY: 'جودة',
};
