import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Locale = 'ar' | 'en';
export type Dir = 'rtl' | 'ltr';

type TranslationDictionary = Record<string, string>;

interface I18nState {
  locale: Locale;
  dir: Dir;
  dictionaries: Record<Locale, TranslationDictionary>;
  t: (key: string) => string;
  setLocale: (locale: Locale) => void;
}

const ar: TranslationDictionary = {
  // Navigation & Common
  'nav.dashboard': 'لوحة التحكم',
  'nav.schedule': 'الجدول الدراسي',
  'nav.courses': 'المواد الدراسية',
  'nav.results': 'النتائج والتقييمات',
  'nav.ai': 'المساعد الذكي',
  'nav.library': 'المكتبة الإلكترونية',
  'nav.gamification': 'الإنجازات والنقاط',
  'nav.skills': 'المهارات والشهادات',
  'nav.labs': 'المعامل الافتراضية',
  'nav.social': 'الشبكة الاجتماعية',
  'nav.mooc': 'كورسات خارجية',
  'nav.jobs': 'فرص العمل',
  'nav.alerts': 'الإشعارات',
  'nav.downloads': 'مركز التحميلات',
  'nav.university': 'جامعة الزاوية',
  'nav.matrix': 'المصفوفة التعليمية',
  'nav.research': 'بحوثي العلمية',
  'nav.profile': 'ملفي الشخصي',
  'nav.webinars': 'الندوات وورش العمل',
  'nav.exams': 'تحليل الامتحانات',
  'nav.live': 'البث المباشر',
  'nav.payment': 'الشؤون المالية',
  'nav.map': 'خريطة الحرم الجامعي',
  'nav.vision': 'الابتكارات القادمة',
  'nav.training': 'التطوير الذاتي',
  'nav.achievements': 'الإنجازات والشهادات',
  'nav.community': 'المجتمع الجامعي',
  // Teacher
  'nav.teacher.dashboard': 'لوحة الأستاذ',
  'nav.teacher.schedule': 'جدول المحاضرات',
  'nav.teacher.attendance': 'الحضور والغياب',
  'nav.teacher.grades': 'درجات الطلاب',
  'nav.teacher.materials': 'المواد الدراسية',
  'nav.teacher.students': 'قائمة الطلاب',
  'nav.teacher.performance': 'الأداء والتحليل',
  'nav.teacher.assignments': 'الواجبات والاختبارات',
  'nav.teacher.messages': 'الرسائل',
  'nav.teacher.research': 'البحث العلمي',
  'nav.teacher.intelligence': 'الذكاء الأكاديمي',
  'nav.teacher.profile': 'الملف الأكاديمي',
  'nav.teacher.live': 'إدارة البث المباشر',
  // Admin
  'nav.admin.dashboard': 'لوحة الإدارة',
  'nav.admin.students': 'إدارة الطلاب',
  'nav.admin.teachers': 'إدارة الأساتذة',
  'nav.admin.faculties': 'الكليات والأقسام',
  'nav.admin.courses': 'إدارة المقررات',
  'nav.admin.analysis': 'تحليل الأداء',
  'nav.admin.digital': 'التحول الرقمي',
  'nav.admin.reports': 'التقارير',
  'nav.admin.settings': 'الإعدادات',
  'nav.admin.sync': 'مزامنة الجامعة',
  // Quality
  'nav.quality.dashboard': 'لوحة الجودة',
  'nav.quality.courses': 'جودة المقررات',
  'nav.quality.professors': 'تقييم الأساتذة',
  'nav.quality.engagement': 'الانخراط والحضور',
  'nav.quality.reports': 'تقارير الجودة',
  'nav.quality.curriculum': 'مراجعة المناهج',
  'nav.quality.alerts': 'تنبيهات الجودة',
  'nav.quality.exam_moderation': 'مراجعة الاختبارات',
  // Online exams
  'nav.online_exams': 'الاختبارات الإلكترونية',
  // Owner
  'nav.owner.dashboard': 'لوحة التحكم الرئيسية',
  'nav.owner.users': 'إدارة المستخدمين',
  'nav.owner.activity': 'سجل النشاط',
  'nav.owner.content': 'المحتوى والعلامة التجارية',
  'nav.owner.system': 'النظام والتشغيل',
  'nav.owner.education': 'النظرة التعليمية',
  'nav.owner.realtime': 'المراقبة الحية',
  'nav.owner.ai': 'مركز الذكاء الاصطناعي',
  'nav.owner.alerts': 'التنبيهات التشغيلية',
  'nav.owner.governance': 'الحوكمة المتقدمة',
  // Common actions
  'action.save': 'حفظ',
  'action.cancel': 'إلغاء',
  'action.edit': 'تعديل',
  'action.delete': 'حذف',
  'action.search': 'بحث',
  'action.close': 'إغلاق',
  'action.submit': 'إرسال',
  'action.back': 'رجوع',
  'action.next': 'التالي',
  'action.previous': 'السابق',
  'action.logout': 'تسجيل الخروج',
  'action.login': 'تسجيل الدخول',
  // Page titles
  'page.madarek': 'مدارك',
  'page.course_details': 'تفاصيل المقرر',
  'page.lecture_player': 'مشغّل المحاضرة',
  'page.vision_detail': 'ابتكار قادم',
  'page.document_viewer': 'عارض المستندات',
  'page.training_lesson': 'درس تدريبي',
  'page.training_track': 'مسار تدريبي',
  'page.exam_in_progress': 'اختبار جارٍ',
  'page.admin_permissions': 'إدارة الصلاحيات',
  // Misc
  'lang.toggle': 'English',
  'theme.light': 'الوضع الفاتح',
  'theme.dark': 'الوضع الداكن',
  'user.profile': 'ملف المستخدم',
  'sidebar.open': 'فتح القائمة',
  'search.placeholder': 'بحث في مدارك...',
};

const en: TranslationDictionary = {
  // Navigation & Common
  'nav.dashboard': 'Dashboard',
  'nav.schedule': 'Schedule',
  'nav.courses': 'Courses',
  'nav.results': 'Results & Grades',
  'nav.ai': 'AI Assistant',
  'nav.library': 'E-Library',
  'nav.gamification': 'Achievements & Points',
  'nav.skills': 'Skills & Certificates',
  'nav.labs': 'Virtual Labs',
  'nav.social': 'Social Network',
  'nav.mooc': 'External Courses',
  'nav.jobs': 'Job Opportunities',
  'nav.alerts': 'Notifications',
  'nav.downloads': 'Download Center',
  'nav.university': 'University of Zawia',
  'nav.matrix': 'Learning Matrix',
  'nav.research': 'My Research',
  'nav.profile': 'My Profile',
  'nav.webinars': 'Webinars & Workshops',
  'nav.exams': 'Exam Analysis',
  'nav.live': 'Live Streaming',
  'nav.payment': 'Finance',
  'nav.map': 'Campus Map',
  'nav.vision': 'Upcoming Innovations',
  'nav.training': 'Self Development',
  'nav.achievements': 'Achievements & Certificates',
  'nav.community': 'University Community',
  // Teacher
  'nav.teacher.dashboard': 'Teacher Panel',
  'nav.teacher.schedule': 'Lecture Schedule',
  'nav.teacher.attendance': 'Attendance',
  'nav.teacher.grades': 'Student Grades',
  'nav.teacher.materials': 'Course Materials',
  'nav.teacher.students': 'Student List',
  'nav.teacher.performance': 'Performance & Analytics',
  'nav.teacher.assignments': 'Assignments & Tests',
  'nav.teacher.messages': 'Messages',
  'nav.teacher.research': 'Scientific Research',
  'nav.teacher.intelligence': 'Academic Intelligence',
  'nav.teacher.profile': 'Academic Profile',
  'nav.teacher.live': 'Live Stream Management',
  // Admin
  'nav.admin.dashboard': 'Admin Panel',
  'nav.admin.students': 'Manage Students',
  'nav.admin.teachers': 'Manage Teachers',
  'nav.admin.faculties': 'Faculties & Departments',
  'nav.admin.courses': 'Manage Courses',
  'nav.admin.analysis': 'Performance Analysis',
  'nav.admin.digital': 'Digital Transformation',
  'nav.admin.reports': 'Reports',
  'nav.admin.settings': 'Settings',
  'nav.admin.sync': 'University Sync',
  // Quality
  'nav.quality.dashboard': 'Quality Panel',
  'nav.quality.courses': 'Course Quality',
  'nav.quality.professors': 'Professor Evaluation',
  'nav.quality.engagement': 'Engagement & Attendance',
  'nav.quality.reports': 'Quality Reports',
  'nav.quality.curriculum': 'Curriculum Review',
  'nav.quality.alerts': 'Quality Alerts',
  'nav.quality.exam_moderation': 'Exam Moderation',
  // Online exams
  'nav.online_exams': 'Online Exams',
  // Owner
  'nav.owner.dashboard': 'Main Control Panel',
  'nav.owner.users': 'User Management',
  'nav.owner.activity': 'Activity Log',
  'nav.owner.content': 'Content & Branding',
  'nav.owner.system': 'System & Operations',
  'nav.owner.education': 'Education Overview',
  'nav.owner.realtime': 'Live Monitoring',
  'nav.owner.ai': 'AI Center',
  'nav.owner.alerts': 'Operational Alerts',
  'nav.owner.governance': 'Advanced Governance',
  // Common actions
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.edit': 'Edit',
  'action.delete': 'Delete',
  'action.search': 'Search',
  'action.close': 'Close',
  'action.submit': 'Submit',
  'action.back': 'Back',
  'action.next': 'Next',
  'action.previous': 'Previous',
  'action.logout': 'Logout',
  'action.login': 'Login',
  // Page titles
  'page.madarek': 'Madarek',
  'page.course_details': 'Course Details',
  'page.lecture_player': 'Lecture Player',
  'page.vision_detail': 'Upcoming Innovation',
  'page.document_viewer': 'Document Viewer',
  'page.training_lesson': 'Training Lesson',
  'page.training_track': 'Training Track',
  'page.exam_in_progress': 'Exam In Progress',
  'page.admin_permissions': 'Manage Permissions',
  // Misc
  'lang.toggle': 'العربية',
  'theme.light': 'Light Mode',
  'theme.dark': 'Dark Mode',
  'user.profile': 'User Profile',
  'sidebar.open': 'Open Menu',
  'search.placeholder': 'Search Madarek...',
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'ar',
      dir: 'rtl',
      dictionaries: { ar, en },
      t: (key: string) => {
        const state = get();
        return state.dictionaries[state.locale][key] ?? key;
      },
      setLocale: (locale: Locale) => {
        const dir: Dir = locale === 'ar' ? 'rtl' : 'ltr';
        set({ locale, dir });
      },
    }),
    { name: 'madarek-locale', storage: createJSONStorage(() => localStorage) },
  ),
);
