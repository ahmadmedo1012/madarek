/**
 * R366 A5 — the shared product-copy constants.
 *
 * WHY this module exists: the same action/status labels were re-typed as
 * string literals in up to 11 screens each (the copy-budget census counts
 * every copy — and every copy can drift). One constant per label keeps the
 * wording identical everywhere it renders, from toasts to buttons to
 * accessibility labels, and the budget honest.
 *
 * LAW (DESIGN-COPY-GUIDE-AR): short, Arabic-correct, Libyan-education
 * terms; never marketing; action-critical information stays. Adding a
 * label here requires it to be used by MORE THAN ONE screen — otherwise
 * it belongs to the screen that owns it.
 */

/* ── pending / done / failed — the action verb trio ─────────────────── */

export const SAVING = "جارٍ الحفظ…";
export const SAVED = "تمّ الحفظ";
export const SAVE_FAILED = "تعذّر الحفظ";
export const CREATING = "جارٍ الإنشاء…";
export const SENDING = "جارٍ الإرسال…";
export const UPDATED = "تمّ التحديث";
export const UPDATE_FAILED = "تعذّر التحديث";
export const RETRY = "إعادة المحاولة";
export const ADDED = "تمّت الإضافة";

/* ── dashboard kickers — one per role shell ─────────────────────────── */

export const OWNER_DASHBOARD = "لوحة المالك";
export const REGISTRAR_DASHBOARD = "لوحة المسجل العام";
export const QUALITY_SECTOR = "ضمان الجودة";

/* ── role-area titles reused across screens ─────────────────────────── */

export const SELF_DEV = "التطوير الذاتي";
export const REPORT_PROBLEM = "الإبلاغ عن مشكلة";
export const FEEDBACK = "التغذية الراجعة";

/* ── empty / status ──────────────────────────────────────────────────── */

export const NO_DATA = "لا بيانات بعد";
export const NO_COURSES_ASSIGNED = "لم تُسند إليك مقرّرات بعد";
export const READ_ONLY = "قراءة فقط";
export const LIVE_NOW = "مباشرة الآن";
export const UNKNOWN_STATUS = "حالة غير معروفة";

/* ── shared full sentences (identical wording on every seat) ────────── */

export const STUDENT_FILE_UNLINKED =
  "لم يُربط ملف طالب — البيانات بعد الاعتماد.";
export const LOGOUT_THIS_DEVICE_ONLY =
  "هذا الجهاز فقط — بقية جلساتك محفوظة.";
export const AWAITING_QUALITY_APPROVAL = "النشر بعد اعتماد الجودة.";
export const PUBLISH_FINAL_CONFIRM = "النشر نهائي حسب النطاق. النشر الآن؟";

export const SEARCH_NAME_OR_EMAIL = "ابحث بالاسم أو البريد…";
export const NO_FILES = "لا ملفات";
export const QUIZ_LABEL = "اختبار قصير";
export const PATH_REMOVED = "أُزيل المسار أو الرابط قديم.";
export const APPEARS_AFTER_FIRST_UPLOAD = "تظهر فور رفع أول بحث.";
export const MODEL_INSTITUTION = "مؤسسة مدارك النموذجية";

/* ── R369 C3.6 — the cross-screen dedup census (identical wording in 2-3
   screens each; one owner per sentence, the budget counts one copy) ── */

export const NO_FACULTIES_YET = "لا كليات بعد";
export const NAME_EN_OPTIONAL = "الاسم بالإنجليزية (اختياري)";
export const NO_MATCHING_RESULTS = "لا نتائج مطابقة";
export const NO_TEACHERS_YET = "لا أساتذة بعد";
export const APPEARS_ONCE_PUBLISHED = "تظهر فور نشرها.";
export const APPEARS_ONCE_ADDED = "تظهر فور إضافتها.";
export const MCQ_LABEL = "اختيار من متعدد";
export const NO_BADGES_YET = "لا أوسمة بعد";
export const NO_PAPERS_YET = "لا بحوث بعد";
export const TRY_WIDER_SEARCH = "جرّب بحثًا أوسع.";
export const NO_FILES_YET = "لا ملفات بعد";
export const PW_NEW = "كلمة المرور الجديدة";
export const PW_CONFIRM = "تأكيد كلمة المرور";
export const PW_SAVE = "حفظ كلمة المرور";
export const PW_RANGE_HINT = "بين 12 و72 حرفًا.";
export const NO_POSTS_YET = "لا منشورات بعد";
export const BE_FIRST_PARTICIPANT = "كن أول المشاركين.";
export const LOGIN_TO_PARTICIPATE = "سجّل الدخول للمشاركة.";
export const NO_EVENTS_YET = "لا أحداث بعد";
export const TWO_CHARS_MIN = "حرفان على الأقل";
export const TITLE_TWO_CHARS = "العنوان: حرفان على الأقل.";
export const GRADE_NOT_NEGATIVE = "الدرجة ليست سالبة.";
export const INVALID_DATETIME = "الموعد غير صالح.";

/* ── R369 C3.6 wave 2 — the second census (3-4 sites each) ─────────── */

export const ABOUT_MADAREK = "عن مدارك";
export const NO_RESULTS = "لا نتائج";
export const OPEN_ALERTS = "تنبيهات مفتوحة";
export const NO_COURSES = "لا مقرّرات";
export const LOADING = "جارٍ التحميل…";
export const EXTRA_DATA = "بيانات إضافية";
export const PICK_DEPARTMENT = "اختر القسم…";
export const FINAL_DELETE = "حذف نهائي";
export const PASSWORD_LABEL = "كلمة المرور";
export const TEACHING_STAFF = "هيئة التدريس";
export const NEEDS_DECISION = "تستوجب قرارًا";
export const UNDER_PROCESSING = "تحت المعالجة";
export const LOGOUT_ACTION = "تسجيل الخروج";
export const WEEKLY_SCHEDULE = "الجدول الأسبوعي";
export const DEFAULT_LABS = "المعامل الافتراضية";
export const INCOMPLETE_LINK = "الرابط غير مكتمل";
export const LINK_DELETED = "حُذف أو رابط خاطئ.";
export const INVALID_EMAIL = "بريد غير صالح";
export const PICK_ANOTHER_DAY = "اختر يومًا آخر.";
export const UNSPECIFIED_DEPT = "قسم غير محدَّد";
export const NO_INSTITUTION = "لم تُحدَّد مؤسستك";
export const PICK_INSTITUTION_FIRST = "اختر مؤسستك أولًا.";

/* ── R369 C3.6 wave 3 — the 2-site dedup tail ─────────────────────── */

export const NO_ATTENDANCE_DATA = "لا بيانات حضور";
export const EXAM_WINDOW_OPEN = "نافذة الاختبار مفتوحة";
export const NO_STUDENT_FILE = "لا ملف طالب بعد";
export const NO_SCHEDULED_SESSIONS = "لا جلسات مجدولة";
export const NO_REPORTS_HERE = "لا تقارير هنا";
export const NO_CONTENT_YET = "لا محتوى بعد";
export const AS_MEMBERS_SEE = "كما يظهر للأعضاء";
export const TRY_OTHER_WORD = "جرّب كلمة أخرى.";
export const REQUEST_SEND_FAILED = "تعذّر إرسال الطلب";
export const NO_LECTURES_TODAY = "لا محاضرات اليوم";
export const APPEARS_ONCE_ASSIGNED = "تظهر فور إسنادها.";
export const QB_AND_EXAMS = "بنك الأسئلة والاختبارات";
export const WEIGHT_OF_GRADES = "الوزن (% من الدرجات)";
export const NO_ACTIVE_ENROLLMENTS = "لا تسجيلات نشطة بعد.";
export const PICK_CORRECT_BEFORE_SAVE = "حدِّد الصحيحة قبل الحفظ.";
export const MAX_IS_INT_100 = "العظمى عدد صحيح 1–100.";
export const WEIGHT_IS_INT_100 = "الوزن عدد صحيح 0–100.";
export const MASTERY_EMPTY_NOTE = "أجب عن نقاط التفاعل — ترسم خريطتك.";
export const AI_REQUESTS_PER_MIN = "طلبات AI / دقيقة";
export const CONFIRM_LOCK_ENABLE = "أكّد تفعيل القفل";
