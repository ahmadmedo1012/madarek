import {
  LayoutDashboard, Calendar, BookOpen, BarChart3, Download,
  Bot, Library, Trophy, Target, FlaskConical,
  Globe, GraduationCap, Briefcase, Bell, Building2,
  Users, ClipboardCheck, ListChecks, Upload, TrendingUp,
  ClipboardList, MessageSquare, Microscope, School,
  FileText, Settings, ShieldCheck, Activity, Compass, BookMarked,
  Radio, Wallet, MapPin, Sparkles, Mic2, UserCircle, Brain, Megaphone, RefreshCw,
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
      { to: '/student/downloads', icon: Download, label: 'مركز التحميلات' },
    ],
  },
  {
    label: 'التعلم الذكي',
    items: [
      { to: '/student/matrix', icon: Compass, label: 'المصفوفة التعليمية', badge: { text: 'جديد', tone: 'brand' } },
      { to: '/student/exams', icon: ClipboardCheck, label: 'تحليل الامتحانات' },
      { to: '/student/online-exams', icon: FileText, label: 'الاختبارات الإلكترونية', badge: { text: 'جديد', tone: 'brand' } },
      { to: '/student/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
      { to: '/student/library', icon: Library, label: 'المكتبة الإلكترونية' },
      { to: '/student/research', icon: BookMarked, label: 'بحوثي العلمية' },
      { to: '/training', icon: GraduationCap, label: 'التطوير الذاتي', badge: { text: 'جديد', tone: 'gold' } },
      { to: '/achievements', icon: Trophy, label: 'الإنجازات والشهادات' },
      { to: '/student/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
    ],
  },
  {
    label: 'المجتمع والتطوير',
    items: [
      { to: '/student/social', icon: Globe, label: 'الشبكة الاجتماعية' },
      { to: '/community', icon: Megaphone, label: 'المجتمع الجامعي', badge: { text: 'جديد', tone: 'brand' } },
      { to: '/student/webinars', icon: Mic2, label: 'الندوات وورش العمل' },
      { to: '/student/mooc', icon: GraduationCap, label: 'كورسات خارجية' },
      { to: '/student/jobs', icon: Briefcase, label: 'فرص العمل' },
      { to: '/student/alerts', icon: Bell, label: 'الإشعارات' },
      { to: '/student/university', icon: Building2, label: 'جامعة الزاوية' },
    ],
  },
  {
    label: 'الخدمات الجامعية',
    items: [
      { to: '/student/profile', icon: UserCircle, label: 'ملفي الشخصي' },
      { to: '/student/live', icon: Radio, label: 'البث المباشر', badge: { text: 'Live', tone: 'brand' } },
      { to: '/student/payment', icon: Wallet, label: 'الشؤون المالية' },
      { to: '/student/map', icon: MapPin, label: 'خريطة الحرم' },
    ],
  },
  {
    label: 'رؤية المنصة',
    items: [
      { to: '/vision', icon: Sparkles, label: 'الابتكارات القادمة', badge: { text: '12', tone: 'gold' } },
    ],
  },
];

export const TEACHER_NAV: NavGroup[] = [
  {
    label: 'لوحة التدريس',
    items: [
      { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'لوحة الأستاذ' },
      { to: '/teacher/intelligence', icon: Brain, label: 'الذكاء الأكاديمي', badge: { text: 'AI', tone: 'gold' } },
      { to: '/teacher/schedule', icon: Calendar, label: 'جدول المحاضرات' },
      { to: '/teacher/attendance', icon: ClipboardCheck, label: 'الحضور والغياب' },
      { to: '/teacher/grades', icon: ListChecks, label: 'درجات الطلاب' },
      { to: '/teacher/materials', icon: Upload, label: 'المواد الدراسية' },
    ],
  },
  {
    label: 'متابعة الطلاب',
    items: [
      { to: '/teacher/students', icon: Users, label: 'قائمة الطلاب' },
      { to: '/teacher/performance', icon: TrendingUp, label: 'الأداء والتحليل' },
      { to: '/teacher/assignments', icon: ClipboardList, label: 'الواجبات والاختبارات' },
      { to: '/teacher/messages', icon: MessageSquare, label: 'الرسائل', badge: { text: '7' } },
    ],
  },
  {
    label: 'الأكاديمي',
    items: [
      { to: '/teacher/research', icon: Microscope, label: 'البحث العلمي' },
      { to: '/teacher/live', icon: Radio, label: 'البث المباشر', badge: { text: 'Live', tone: 'brand' } },
      { to: '/teacher/labs', icon: FlaskConical, label: 'المعامل الافتراضية' },
      { to: '/teacher/ai', icon: Bot, label: 'المساعد الذكي', badge: { text: 'AI', tone: 'gold' } },
      { to: '/teacher/library', icon: Library, label: 'المكتبة' },
      { to: '/teacher/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: '/teacher/alerts', icon: Bell, label: 'الإشعارات' },
    ],
  },
  {
    label: 'حسابي',
    items: [
      { to: '/teacher/profile', icon: UserCircle, label: 'الملف الأكاديمي' },
    ],
  },
  {
    label: 'رؤية المنصة',
    items: [
      { to: '/vision', icon: Sparkles, label: 'الابتكارات القادمة', badge: { text: '12', tone: 'gold' } },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: 'الإدارة العامة',
    items: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: 'لوحة الإدارة' },
      { to: '/admin/students', icon: GraduationCap, label: 'إدارة الطلاب' },
      { to: '/admin/teachers', icon: School, label: 'إدارة الأساتذة' },
      { to: '/admin/faculties', icon: Building2, label: 'الكليات والأقسام' },
      { to: '/admin/courses', icon: BookOpen, label: 'إدارة المقررات' },
    ],
  },
  {
    label: 'التقارير والتحليل',
    items: [
      { to: '/admin/analysis', icon: BarChart3, label: 'تحليل الأداء' },
      { to: '/admin/digital', icon: TrendingUp, label: 'التحول الرقمي' },
      { to: '/admin/reports', icon: FileText, label: 'التقارير' },
    ],
  },
  {
    label: 'النظام والمجتمع',
    items: [
      { to: '/admin/community', icon: Megaphone, label: 'المجتمع الجامعي' },
      { to: '/admin/sync', icon: RefreshCw, label: 'مزامنة الجامعة', badge: { text: 'جديد', tone: 'gold' } },
      { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
      { to: '/admin/alerts', icon: Bell, label: 'الإشعارات' },
    ],
  },
  {
    label: 'رؤية المنصة',
    items: [
      { to: '/vision', icon: Sparkles, label: 'الابتكارات القادمة', badge: { text: '12', tone: 'gold' } },
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
    label: 'الرقابة والمراجعة',
    items: [
      { to: '/quality/exam-moderation', icon: ClipboardCheck, label: 'مراجعة الاختبارات', badge: { text: 'جديد', tone: 'brand' } },
      { to: '/quality/curriculum', icon: ListChecks, label: 'مراجعة المناهج' },
      { to: '/quality/alerts', icon: Bell, label: 'تنبيهات حرجة' },
    ],
  },
  {
    label: 'التقارير والمجتمع',
    items: [
      { to: '/quality/reports', icon: FileText, label: 'تقارير الجودة' },
      { to: '/quality/community', icon: Megaphone, label: 'المجتمع الجامعي' },
    ],
  },
  {
    label: 'رؤية المنصة',
    items: [
      { to: '/vision', icon: Sparkles, label: 'الابتكارات القادمة', badge: { text: '12', tone: 'gold' } },
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
