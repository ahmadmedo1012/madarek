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
