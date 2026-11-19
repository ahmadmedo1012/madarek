/**
 * Shared copy constants — the authed app's ONE-owner vocabulary.
 *
 * R369-C4.1 wave-1 (the dedup hoist): the cross-screen census
 * (scripts/tmp-dupcensus.mjs — the copy-budget gate's own lexer)
 * found IDENTICAL Arabic strings living in 2+ authed page files —
 * pure duplication the ratchet counted once per file. Every string
 * below is hoisted VERBATIM: the substituted sites render the exact
 * same words (no copy change — one owner per sentence, the same
 * mechanic the mobile lane shipped in its wave-3).
 */

/** إعادة المحاولة — 22 screens. */
export const RETRY_ACTION = "إعادة المحاولة" as const;

/** جارٍ التحميل… — 12 screens. */
export const LOADING = "جارٍ التحميل…" as const;

/** لوحة المالك — 9 screens. */
export const DASH_OWNER = "لوحة المالك" as const;

/** إلغاء — 15 screens. */
export const CANCEL = "إلغاء" as const;

/** الكل — 14 screens. */
export const ALL = "الكل" as const;

/** لا مقرّرات بعد — 5 screens. */
export const EMPTY_COURSES_YET = "لا مقرّرات بعد" as const;

/** لا نتائج — 6 screens. */
export const NO_RESULTS = "لا نتائج" as const;

/** عند التغيير تُنهى جلسات بقية الأجهزة، وتبقى جلستك مفتوحة. — 2 screens. */
export const SESSIONS_NOTICE_OTHER_DEVICES = "عند التغيير تُنهى جلسات بقية الأجهزة، وتبقى جلستك مفتوحة." as const;

/** طلاب — 10 screens. */
export const NOUN_STUDENTS = "طلاب" as const;

/** جارٍ الحفظ… — 5 screens. */
export const SAVING = "جارٍ الحفظ…" as const;

/** سجلّ النشاط — 5 screens. */
export const ACTIVITY_LOG = "سجلّ النشاط" as const;

/** لا مقرّرات — 5 screens. */
export const EMPTY_COURSES = "لا مقرّرات" as const;

/** طالبان — 8 screens. */
export const NOUN_TWO_STUDENTS = "طالبان" as const;

/** طالباً — 8 screens. */
export const NOUN_STUDENT_ACC = "طالباً" as const;

/** السابق — 8 screens. */
export const PREV = "السابق" as const;

/** التالي — 8 screens. */
export const NEXT = "التالي" as const;

/** لوحة المسجل العام — 3 screens. */
export const DASH_REGISTRAR = "لوحة المسجل العام" as const;

/** الطلاب — 7 screens. */
export const LABEL_STUDENTS = "الطلاب" as const;

/** الكلّيّة — 7 screens. */
export const LABEL_COLLEGE = "الكلّيّة" as const;

/** الحالة — 7 screens. */
export const LABEL_STATUS = "الحالة" as const;

/** مقرّراً — 7 screens. */
export const NOUN_COURSE_ACC = "مقرّراً" as const;

/** لا بحوث بعد — 3 screens. */
export const EMPTY_RESEARCH_YET = "لا بحوث بعد" as const;

/** محاضرات — 7 screens. */
export const LABEL_LECTURES = "محاضرات" as const;

/** طالب — 7 screens. */
export const NOUN_STUDENT = "طالب" as const;

/** تمّ الحفظ — 4 screens. */
export const SAVED = "تمّ الحفظ" as const;

/** اليوم — 7 screens. */
export const LABEL_TODAY = "اليوم" as const;

/** المراقبة الحيّة — 4 screens. */
export const LIVE_MONITORING = "المراقبة الحيّة" as const;

/** تعذّر جلب التنبيهات — 3 screens. */
export const FAILED_FETCH_ALERTS = "تعذّر جلب التنبيهات" as const;

/** المكتبة الإلكترونية — 4 screens. */
export const E_LIBRARY = "المكتبة الإلكترونية" as const;

/** دليل الحرم الجامعيّ — 3 screens. */
export const CAMPUS_GUIDE = "دليل الحرم الجامعيّ" as const;

/** الخطوة التالية — 4 screens. */
export const NEXT_STEP = "الخطوة التالية" as const;

/** التطوير الذاتي — 4 screens. */
export const SELF_DEV = "التطوير الذاتي" as const;

/** المعامل الافتراضية — 4 screens. */
export const VIRTUAL_LABS = "المعامل الافتراضية" as const;

/** لا منشورات بعد — 3 screens. */
export const EMPTY_POSTS_YET = "لا منشورات بعد" as const;

/** مقرّرات — 6 screens. */
export const LABEL_COURSES = "مقرّرات" as const;

/** إجراءات — 6 screens. */
export const LABEL_ACTIONS = "إجراءات" as const;

/** محاضرة — 6 screens. */
export const LABEL_LECTURE = "محاضرة" as const;

/** من — 6 screens. */
export const FROM = "من" as const;

/** المقرّر — 6 screens. */
export const LABEL_THE_COURSE = "المقرّر" as const;

/** البريد الإلكتروني — 3 screens. */
export const LABEL_EMAIL = "البريد الإلكتروني" as const;

/** تعذّر التحميل — 3 screens. */
export const FAILED_LOAD = "تعذّر التحميل" as const;

/** إدارة الطلاب — 3 screens. */
export const MANAGE_STUDENTS = "إدارة الطلاب" as const;

/** قائمة الطلاب — 3 screens. */
export const LIST_STUDENTS = "قائمة الطلاب" as const;

/** إغلاق — 5 screens. */
export const CLOSE = "إغلاق" as const;

/** بثّ مباشر — 3 screens. */
export const LIVE_STREAM = "بثّ مباشر" as const;

/** مسح البحث — 3 screens. */
export const CLEAR_SEARCH = "مسح البحث" as const;

/** بثّ إعلان — 3 screens. */
export const BROADCAST_NOTICE = "بثّ إعلان" as const;

/** أستاذ مساعد — 3 screens. */
export const RANK_ASSISTANT_PROF = "أستاذ مساعد" as const;

/** أستاذ مشارك — 3 screens. */
export const RANK_ASSOCIATE_PROF = "أستاذ مشارك" as const;

/** مراجعة الاختبارات — 3 screens. */
export const EXAM_REVIEW = "مراجعة الاختبارات" as const;

/** إدارة المستخدمين — 3 screens. */
export const MANAGE_USERS = "إدارة المستخدمين" as const;

/** تقارير الجودة — 3 screens. */
export const QUALITY_REPORTS = "تقارير الجودة" as const;

/** الاسم — 5 screens. */
export const LABEL_NAME = "الاسم" as const;

/** القسم — 5 screens. */
export const LABEL_DEPT = "القسم" as const;

/** كلّيّة — 5 screens. */
export const LABEL_COLLEGE_SHORT = "كلّيّة" as const;

/** مقرّر واحد — 3 screens. */
export const ONE_COURSE = "مقرّر واحد" as const;

/** مقرّران — 5 screens. */
export const NOUN_COURSE_TWO = "مقرّران" as const;

/** هيئة التدريس — 3 screens. */
export const FACULTY_BODY = "هيئة التدريس" as const;

/** المقرّرات — 5 screens. */
export const LABEL_THE_COURSES = "المقرّرات" as const;

/** بحوث منشورة — 3 screens. */
export const PUBLISHED_RESEARCH = "بحوث منشورة" as const;

/** منشور — 5 screens. */
export const ONE_POST = "منشور" as const;

/** ابحث… — 5 screens. */
export const SEARCH_PLACEHOLDER = "ابحث…" as const;

/** جارٍ الإضافة… — 3 screens. */
export const ADDING = "جارٍ الإضافة…" as const;

/** إجمالي المستخدمين — 3 screens. */
export const TOTAL_USERS = "إجمالي المستخدمين" as const;

/** اسم المقرّر — 3 screens. */
export const COURSE_NAME = "اسم المقرّر" as const;

/** فصل واحد — 3 screens. */
export const ONE_SEMESTER = "فصل واحد" as const;

/** الكلّيّة / القسم — 3 screens. */
export const COLLEGE_DEPT = "الكلّيّة / القسم" as const;

/** ساعات معتمدة — 3 screens. */
export const CREDIT_HOURS = "ساعات معتمدة" as const;

/** العنوان — 5 screens. */
export const LABEL_ADDRESS = "العنوان" as const;

/** النظام — 5 screens. */
export const LABEL_SYSTEM = "النظام" as const;

/** تعذَّر التحميل. — 3 screens. */
export const FAILED_LOAD_DOT = "تعذَّر التحميل." as const;

/** تعذَّر النشر. — 3 screens. */
export const FAILED_PUBLISH_DOT = "تعذَّر النشر." as const;

/** اختبار قصير — 3 screens. */
export const QUIZ_SHORT = "اختبار قصير" as const;

/** لا أسئلة في القالب — 2 screens. */
export const EMPTY_TEMPLATE_QUESTIONS = "لا أسئلة في القالب" as const;

/** المصفوفة التعليمية — 3 screens. */
export const LEARNING_MATRIX = "المصفوفة التعليمية" as const;

/** بانتظار البيانات — 3 screens. */
export const PENDING_DATA = "بانتظار البيانات" as const;

/** تنبيهات حرجة — 3 screens. */
export const CRITICAL_ALERTS = "تنبيهات حرجة" as const;

/** فتح المجتمع — 3 screens. */
export const OPEN_COMMUNITY = "فتح المجتمع" as const;

/** لا بيانات — 3 screens. */
export const NO_DATA = "لا بيانات" as const;

/** جارٍ الإنشاء… — 3 screens. */
export const CREATING = "جارٍ الإنشاء…" as const;

/** محاضرة واحدة — 3 screens. */
export const ONE_LECTURE = "محاضرة واحدة" as const;

/** مقرّراتي الدراسية — 3 screens. */
export const MY_COURSES = "مقرّراتي الدراسية" as const;

/** البث المباشر — 3 screens. */
export const LIVE_BROADCAST = "البث المباشر" as const;

/** تحت المراقبة — 3 screens. */
export const UNDER_WATCH = "تحت المراقبة" as const;

/** في خطر — 3 screens. */
export const AT_RISK = "في خطر" as const;

/** الكليات — 4 screens. */
export const LABEL_COLLEGES = "الكليات" as const;

/** تغيير كلمة المرور — 2 screens. */
export const CHANGE_PASSWORD = "تغيير كلمة المرور" as const;

/** موقوف — 4 screens. */
export const STATUS_SUSPENDED = "موقوف" as const;

/** تعذّر تحميل المقرّرات — 2 screens. */
export const FAILED_LOAD_COURSES = "تعذّر تحميل المقرّرات" as const;

/** أستاذ — 4 screens. */
export const NOUN_PROF = "أستاذ" as const;

/** أساتذة — 4 screens. */
export const NOUN_PROFS = "أساتذة" as const;

/** لم يستجب الخادم. — 2 screens. */
export const FAILED_SERVER = "لم يستجب الخادم." as const;

/** حفظ — 4 screens. */
export const SAVE = "حفظ" as const;

/** لا نتائج مطابقة — 2 screens. */
export const NO_MATCHING_RESULTS = "لا نتائج مطابقة" as const;

/** الاسم بالإنجليزية (اختياري) — 2 screens. */
export const NAME_ENG_OPTIONAL = "الاسم بالإنجليزية (اختياري)" as const;

/** رمز تعبيري (اختياري) — 2 screens. */
export const EMOJI_OPTIONAL = "رمز تعبيري (اختياري)" as const;

/** تعذّر إضافة الكلّيّة — 2 screens. */
export const FAILED_ADD_COLLEGE = "تعذّر إضافة الكلّيّة" as const;

/** تعذّر إضافة القسم — 2 screens. */
export const FAILED_ADD_DEPT = "تعذّر إضافة القسم" as const;

/** لا بيانات بعد — 2 screens. */
export const NO_DATA_YET = "لا بيانات بعد" as const;

/** أكثر المقرّرات تسجيلاً — 2 screens. */
export const TOP_ENROLLED_COURSES = "أكثر المقرّرات تسجيلاً" as const;

/** لا تسجيلات بعد — 2 screens. */
export const NO_ENROLLMENTS_YET = "لا تسجيلات بعد" as const;

/** فصلان — 4 screens. */
export const NOUN_SEM_TWO = "فصلان" as const;

/** فصول — 4 screens. */
export const NOUN_SEMS = "فصول" as const;

/** فصلاً — 4 screens. */
export const NOUN_SEM_ACC = "فصلاً" as const;

/** تعديل — 4 screens. */
export const EDIT = "تعديل" as const;

/** تعذّر حفظ المقرّر — 2 screens. */
export const FAILED_SAVE_COURSE = "تعذّر حفظ المقرّر" as const;

/** تعذّر فتح الشعبة — 2 screens. */
export const FAILED_OPEN_SECTION = "تعذّر فتح الشعبة" as const;

/** ، — 4 screens. */
export const COMMA_AR = "،" as const;

/** النوع — 4 screens. */
export const LABEL_TYPE = "النوع" as const;

/** نشطة — 4 screens. */
export const STATUS_ACTIVE_F = "نشطة" as const;

/** بعد — 4 screens. */
export const SUFFIX_YET = "بعد" as const;

/** اختبار — 4 screens. */
export const EXAM = "اختبار" as const;

/** نقطتان — 4 screens. */
export const NOUN_TWO_POINTS = "نقطتان" as const;

/** اكتب إجابتك هنا… — 2 screens. */
export const ANSWER_HERE_PLACEHOLDER = "اكتب إجابتك هنا…" as const;

/** اختيار من متعدد — 2 screens. */
export const MCQ = "اختيار من متعدد" as const;

/** صح أم خطأ — 2 screens. */
export const TRUE_FALSE = "صح أم خطأ" as const;

/** متوسط — 4 screens. */
export const STATUS_AVG = "متوسط" as const;

/** تعذَّر تنفيذ القرار. — 2 screens. */
export const FAILED_DECISION_DOT = "تعذَّر تنفيذ القرار." as const;

/** العودة إلى الاختبارات — 2 screens. */
export const BACK_TO_EXAMS = "العودة إلى الاختبارات" as const;

/** المستخدمون — 4 screens. */
export const USERS = "المستخدمون" as const;

/** لا شيء حرجًا — 2 screens. */
export const NOTHING_CRITICAL = "لا شيء حرجًا" as const;

/** مقرّر — 4 screens. */
export const COURSE = "مقرّر" as const;

/** لا أساتذة بعد — 2 screens. */
export const NO_PROFS_YET = "لا أساتذة بعد" as const;

/** تعذّر تحميل الأساتذة — 2 screens. */
export const FAILED_LOAD_PROFS = "تعذّر تحميل الأساتذة" as const;

/** محاضرتان — 4 screens. */
export const NOUN_TWO_LECTURES = "محاضرتان" as const;

/** حرج — 4 screens. */
export const STATUS_CRITICAL = "حرج" as const;

/** مكتمل — 4 screens. */
export const STATUS_DONE = "مكتمل" as const;

/** مكتملة — 4 screens. */
export const STATUS_DONE_F = "مكتملة" as const;

/** نقطة تفاعل واحدة — 2 screens. */
export const ONE_INTERACTION_POINT = "نقطة تفاعل واحدة" as const;

/** غير متوفر بعد — 2 screens. */
export const NOT_AVAILABLE_YET = "غير متوفر بعد" as const;

/** تسليم — 4 screens. */
export const SUBMIT = "تسليم" as const;

/** الندوات وورش العمل — 2 screens. */
export const SEMINARS_WORKSHOPS = "الندوات وورش العمل" as const;

/** تسليمات بانتظار التقييم — 2 screens. */
export const SUBMISSIONS_PENDING_REVIEW = "تسليمات بانتظار التقييم" as const;

/** لا إنجازات بعد — 2 screens. */
export const NO_ACHIEVEMENTS_YET = "لا إنجازات بعد" as const;

/** لا ترتيب بعد — 2 screens. */
export const NO_RANKING_YET = "لا ترتيب بعد" as const;

/** لا تقييمات بعد — 2 screens. */
export const NO_RATINGS_YET = "لا تقييمات بعد" as const;

/** على لوحة المجتمع — 2 screens. */
export const ON_COMMUNITY_BOARD = "على لوحة المجتمع" as const;

/** تعذّر تحميل بياناتك. — 2 screens. */
export const FAILED_LOAD_YOUR_DATA = "تعذّر تحميل بياناتك." as const;

/** تعذّر اجتياز الفحص — 2 screens. */
export const FAILED_VERIFICATION = "تعذّر اجتياز الفحص" as const;

/** جارٍ رفع الملف… — 2 screens. */
export const UPLOADING_FILE = "جارٍ رفع الملف…" as const;

/** تحقّق من اتصالك. — 2 screens. */
export const CHECK_CONNECTION = "تحقّق من اتصالك." as const;

/** اختر من التقويم. — 2 screens. */
export const PICK_FROM_CALENDAR = "اختر من التقويم." as const;

/** جارٍ التحضير… — 2 screens. */
export const PREPARING = "جارٍ التحضير…" as const;

/** بحوثي — 3 screens. */
export const MY_RESEARCH = "بحوثي" as const;

/** إعدادات الحساب — 2 screens. */
export const ACCOUNT_SETTINGS = "إعدادات الحساب" as const;

/** طالب واحد — 2 screens. */
export const ONE_STUDENT = "طالب واحد" as const;

/** كلّ الكلّيّات — 2 screens. */
export const ALL_COLLEGES = "كلّ الكلّيّات" as const;

/** نشط — 3 screens. */
export const STATUS_ACTIVE_M = "نشط" as const;

/** تعذَّر التسجيل. — 2 screens. */
export const FAILED_ENROL_DOT = "تعذَّر التسجيل." as const;

/** تسجيلات — 3 screens. */
export const ENROLLMENTS = "تسجيلات" as const;

/** جارٍ التسجيل… — 2 screens. */
export const ENROLLING = "جارٍ التسجيل…" as const;

/** التحوّل الرقميّ — 2 screens. */
export const DIGITAL_TRANSFORMATION = "التحوّل الرقميّ" as const;

/** إعدادات المنصّة — 2 screens. */
export const PLATFORM_SETTINGS = "إعدادات المنصّة" as const;

/** استيراد الطلاب — 2 screens. */
export const IMPORT_STUDENTS = "استيراد الطلاب" as const;

/** لا مقرّرات. — 2 screens. */
export const EMPTY_COURSES_DOT = "لا مقرّرات." as const;

/** التقارير المؤسسية — 2 screens. */
export const INSTITUTIONAL_REPORTS = "التقارير المؤسسية" as const;

/** مُعيد / محاضر — 2 screens. */
export const RANK_LECTURER = "مُعيد / محاضر" as const;

/** لوحة الجودة — 2 screens. */
export const DASH_QUALITY = "لوحة الجودة" as const;

/** لا أساتذة — 2 screens. */
export const NO_PROFS = "لا أساتذة" as const;

/** أستاذان — 3 screens. */
export const NOUN_TWO_PROFS = "أستاذان" as const;

/** أستاذاً — 3 screens. */
export const NOUN_PROF_ACC = "أستاذاً" as const;

/** الملف الأكاديمي — 2 screens. */
export const ACADEMIC_FILE = "الملف الأكاديمي" as const;

/** البريد — 3 screens. */
export const LABEL_MAIL = "البريد" as const;

/** الدرجة — 3 screens. */
export const LABEL_GRADE = "الدرجة" as const;

/** الرتبة — 3 screens. */
export const LABEL_RANK = "الرتبة" as const;

/** النطاق — 3 screens. */
export const LABEL_SCOPE = "النطاق" as const;

/** الاختبارات — 3 screens. */
export const LABEL_EXAMS = "الاختبارات" as const;

/** تعذّر التحديث — 2 screens. */
export const FAILED_UPDATE = "تعذّر التحديث" as const;

/** إدارة المقرّرات — 2 screens. */
export const MANAGE_COURSES = "إدارة المقرّرات" as const;

/** موثَّق — 3 screens. */
export const STATUS_VERIFIED = "موثَّق" as const;

/** تاريخ الإنشاء — 2 screens. */
export const CREATED_AT = "تاريخ الإنشاء" as const;

/** تحديث — 3 screens. */
export const REFRESH = "تحديث" as const;

/** قسم واحد — 2 screens. */
export const ONE_DEPT = "قسم واحد" as const;

/** قسمان — 3 screens. */
export const NOUN_TWO_DEPTS = "قسمان" as const;

/** أقسام — 3 screens. */
export const NOUN_DEPTS = "أقسام" as const;

/** قسماً — 3 screens. */
export const NOUN_DEPT_ACC = "قسماً" as const;

/** تسجيل واحد — 2 screens. */
export const ONE_ENROLLMENT = "تسجيل واحد" as const;

/** يحتاج انتباهك — 2 screens. */
export const NEEDS_YOUR_ATTENTION = "يحتاج انتباهك" as const;

/** إجمالي الطلاب — 2 screens. */
export const TOTAL_STUDENTS = "إجمالي الطلاب" as const;

/** اسم الكلّيّة — 2 screens. */
export const COLLEGE_NAME = "اسم الكلّيّة" as const;

/** كلية العلوم — 2 screens. */
export const COLLEGE_SCIENCES = "كلية العلوم" as const;

/** المدينة — 3 screens. */
export const LABEL_CITY = "المدينة" as const;

/** حرم المعرفة — 2 screens. */
export const KNOWLEDGE_CAMPUS = "حرم المعرفة" as const;

/** إضافة الكلّيّة — 2 screens. */
export const ADD_COLLEGE = "إضافة الكلّيّة" as const;

/** إضافة قسم — 2 screens. */
export const ADD_DEPT = "إضافة قسم" as const;

/** اسم القسم — 2 screens. */
export const DEPT_NAME = "اسم القسم" as const;

/** قسم الحاسوب — 2 screens. */
export const CS_DEPT = "قسم الحاسوب" as const;

/** إضافة القسم — 2 screens. */
export const ADD_THE_DEPT = "إضافة القسم" as const;

/** الطالب — 3 screens. */
export const LABEL_THE_STUDENT = "الطالب" as const;

/** المحاضرات — 3 screens. */
export const THE_LECTURES = "المحاضرات" as const;

/** إضافة مقرّر — 2 screens. */
export const ADD_COURSE = "إضافة مقرّر" as const;

/** كود المقرّر — 2 screens. */
export const COURSE_CODE = "كود المقرّر" as const;

/** الساعات المعتمدة — 2 screens. */
export const THE_CREDIT_HOURS = "الساعات المعتمدة" as const;

/** بين 1 و10 — 2 screens. */
export const BETWEEN_1_10 = "بين 1 و10" as const;

/** حفظ التعديلات — 2 screens. */
export const SAVE_CHANGES = "حفظ التعديلات" as const;

/** إضافة المقرّر — 2 screens. */
export const ADD_THE_COURSE = "إضافة المقرّر" as const;

/** فتح شعبة — 2 screens. */
export const OPEN_SECTION = "فتح شعبة" as const;

/** الفصل الدراسي — 2 screens. */
export const SEMESTER = "الفصل الدراسي" as const;

/** الأستاذ — 3 screens. */
export const LABEL_THE_PROF = "الأستاذ" as const;

/** اختر الأستاذ… — 2 screens. */
export const PICK_PROF = "اختر الأستاذ…" as const;

/** القاعة (اختياري) — 2 screens. */
export const HALL_OPTIONAL = "القاعة (اختياري)" as const;

/** السعة — 3 screens. */
export const CAPACITY = "السعة" as const;

/** جارٍ الفتح… — 2 screens. */
export const OPENING = "جارٍ الفتح…" as const;

/** فتح الشعبة — 2 screens. */
export const OPEN_THE_SECTION = "فتح الشعبة" as const;

/** حذف نهائي — 2 screens. */
export const DELETE_PERMANENTLY = "حذف نهائي" as const;

/** إضافة كلّيّة — 2 screens. */
export const ADD_A_COLLEGE = "إضافة كلّيّة" as const;

/** اختر القسم… — 2 screens. */
export const PICK_DEPT = "اختر القسم…" as const;

/** متابعة — 3 screens. */
export const FOLLOW = "متابعة" as const;

/** التفاصيل — 3 screens. */
export const DETAILS = "التفاصيل" as const;

/** الرقم الجامعي — 2 screens. */
export const UNI_ID = "الرقم الجامعي" as const;

/** كلمة المرور — 2 screens. */
export const PASSWORD = "كلمة المرور" as const;

/** خدمات المؤسسة — 2 screens. */
export const ORG_SERVICES = "خدمات المؤسسة" as const;

/** الهاتف — 3 screens. */
export const LABEL_PHONE = "الهاتف" as const;

/** الحضور — 3 screens. */
export const ATTENDANCE = "الحضور" as const;

/** الفصل — 3 screens. */
export const SEM = "الفصل" as const;

/** جارٍ… — 3 screens. */
export const BUSY_DOTS = "جارٍ…" as const;

/** قسم — 3 screens. */
export const DEPT = "قسم" as const;

/** لا مسابقات — 2 screens. */
export const NO_COMPETITIONS = "لا مسابقات" as const;

/** أيام — 3 screens. */
export const DAYS = "أيام" as const;

/** يوماً — 3 screens. */
export const NOUN_DAY_ACC = "يوماً" as const;

/** قريباً — 3 screens. */
export const SOON = "قريباً" as const;

/** كن الأول — 2 screens. */
export const BE_FIRST = "كن الأول" as const;

/** لا مشاركات — 2 screens. */
export const NO_PARTICIPATIONS = "لا مشاركات" as const;

/** الوصف قصير — 2 screens. */
export const DESC_SHORT = "الوصف قصير" as const;

/** الوصف — 3 screens. */
export const DESC = "الوصف" as const;

/** انتهى التقديم — 2 screens. */
export const APPLICATION_CLOSED = "انتهى التقديم" as const;

/** تعذَّر الإنشاء. — 2 screens. */
export const FAILED_CREATE_DOT = "تعذَّر الإنشاء." as const;

/** تعذَّر الحفظ. — 2 screens. */
export const FAILED_SAVE_DOT = "تعذَّر الحفظ." as const;

/** نصفي — 3 screens. */
export const MIDTERM = "نصفي" as const;

/** نهائي — 3 screens. */
export const FINAL = "نهائي" as const;

/** اختبارات — 3 screens. */
export const EXAMS = "اختبارات" as const;

/** سؤال — 3 screens. */
export const NOUN_Q = "سؤال" as const;

/** سؤالان — 3 screens. */
export const NOUN_TWO_Q = "سؤالان" as const;

/** أسئلة — 3 screens. */
export const NOUN_QS = "أسئلة" as const;

/** سؤالاً — 3 screens. */
export const NOUN_Q_ACC = "سؤالاً" as const;

/** ابدأ — 3 screens. */
export const START = "ابدأ" as const;

/** جارٍ التحقق… — 2 screens. */
export const VERIFYING = "جارٍ التحقق…" as const;

/** نقطة — 3 screens. */
export const NOUN_POINT = "نقطة" as const;

/** تم الحفظ — 2 screens. */
export const SAVED_PLAIN = "تم الحفظ" as const;

/** جارٍ التسليم… — 2 screens. */
export const SUBMITTING = "جارٍ التسليم…" as const;

/** إجابة قصيرة — 2 screens. */
export const SHORT_ANSWER = "إجابة قصيرة" as const;

/** سؤال مقالي — 2 screens. */
export const ESSAY_QUESTION = "سؤال مقالي" as const;

/** الإجابة الصحيحة: — 2 screens. */
export const CORRECT_ANSWER_COLON = "الإجابة الصحيحة:" as const;

/** الإجابة النموذجية: — 2 screens. */
export const MODEL_ANSWER_COLON = "الإجابة النموذجية:" as const;

/** معيار التصحيح: — 2 screens. */
export const GRADING_CRITERIA_COLON = "معيار التصحيح:" as const;

/** بانتظار المراجعة — 2 screens. */
export const PENDING_REVIEW = "بانتظار المراجعة" as const;

/** دقيقة — 3 screens. */
export const MINUTE = "دقيقة" as const;

/** دقائق — 3 screens. */
export const MINUTES = "دقائق" as const;

/** جارٍ الاعتماد… — 2 screens. */
export const APPROVING = "جارٍ الاعتماد…" as const;

/** جارٍ الرفض… — 2 screens. */
export const REJECTING = "جارٍ الرفض…" as const;

/** رفض القالب — 2 screens. */
export const REJECT_TEMPLATE = "رفض القالب" as const;

/** النتائج والتقييمات — 2 screens. */
export const RESULTS_RATINGS = "النتائج والتقييمات" as const;

/** درجة النجاح — 2 screens. */
export const PASS_MARK = "درجة النجاح" as const;

/** تنبيهات الجودة — 2 screens. */
export const QUALITY_ALERTS = "تنبيهات الجودة" as const;

/** قيد المراجعة — 2 screens. */
export const UNDER_REVIEW = "قيد المراجعة" as const;

/** تغيير صلاحيات — 2 screens. */
export const CHANGE_PERMS = "تغيير صلاحيات" as const;

/** إنشاء حساب — 2 screens. */
export const CREATE_ACCOUNT = "إنشاء حساب" as const;

/** إنشاء مقرّر — 2 screens. */
export const CREATE_COURSE = "إنشاء مقرّر" as const;

/** تحديث مقرّر — 2 screens. */
export const UPDATE_COURSE = "تحديث مقرّر" as const;

/** رفع ملف — 2 screens. */
export const UPLOAD_FILE = "رفع ملف" as const;

/** حذف ملف — 2 screens. */
export const DELETE_FILE = "حذف ملف" as const;

/** نشر بحث — 2 screens. */
export const PUBLISH_RESEARCH = "نشر بحث" as const;

/** إنشاء مسابقة — 2 screens. */
export const CREATE_COMPETITION = "إنشاء مسابقة" as const;

/** تجاوز صلاحية — 2 screens. */
export const SKIP_PERM = "تجاوز صلاحية" as const;

/** تعديل نطاق — 2 screens. */
export const EDIT_SCOPE = "تعديل نطاق" as const;

/** تعيين موقع — 2 screens. */
export const SET_LOCATION = "تعيين موقع" as const;

/** إلغاء تسجيل — 2 screens. */
export const UNENROL = "إلغاء تسجيل" as const;

/** حلّ تنبيه — 2 screens. */
export const RESOLVE_ALERT = "حلّ تنبيه" as const;

/** تحديث إعداد — 2 screens. */
export const UPDATE_SETTING = "تحديث إعداد" as const;

/** تبديل ميزة — 2 screens. */
export const TOGGLE_FEATURE = "تبديل ميزة" as const;

/** تغيير المظهر — 2 screens. */
export const CHANGE_THEME = "تغيير المظهر" as const;

/** إكمال التعريف — 2 screens. */
export const COMPLETE_PROFILE = "إكمال التعريف" as const;

/** تحقيق إنجاز — 2 screens. */
export const ACHIEVE_BADGE = "تحقيق إنجاز" as const;

/** لا أحداث — 2 screens. */
export const NO_EVENTS = "لا أحداث" as const;

/** عرض — 3 screens. */
export const VIEW = "عرض" as const;

/** معدّل النجاح — 2 screens. */
export const PASS_RATE = "معدّل النجاح" as const;

/** النظام والتشغيل — 2 screens. */
export const SYSTEM_OPS = "النظام والتشغيل" as const;

/** تنبيهات مفتوحة — 2 screens. */
export const OPEN_ALERTS = "تنبيهات مفتوحة" as const;

/** التنبيهات المفتوحة — 2 screens. */
export const THE_OPEN_ALERTS = "التنبيهات المفتوحة" as const;

/** جارٍ الجلب… — 2 screens. */
export const FETCHING = "جارٍ الجلب…" as const;

/** تنبيهان حرجان — 2 screens. */
export const TWO_CRITICAL_ALERTS = "تنبيهان حرجان" as const;

/** تنبيهاً حرجاً — 2 screens. */
export const NOUN_ALERT_ACC = "تنبيهاً حرجاً" as const;

/** أستاذ واحد — 2 screens. */
export const ONE_PROF = "أستاذ واحد" as const;

/** الجلسات النشطة — 2 screens. */
export const ACTIVE_SESSIONS = "الجلسات النشطة" as const;

/** التنبيهات — 3 screens. */
export const THE_ALERTS = "التنبيهات" as const;

/** جلسات نشطة — 2 screens. */
export const SESSIONS_ACTIVE = "جلسات نشطة" as const;

/** اختبارات جارية — 2 screens. */
export const ONGOING_EXAMS = "اختبارات جارية" as const;

/** طلبات AI / دقيقة — 2 screens. */
export const AI_REQ_PER_MIN = "طلبات AI / دقيقة" as const;

/** المؤسسات — 3 screens. */
export const INSTITUTIONS = "المؤسسات" as const;

/** تعذَّر الاتصال. — 2 screens. */
export const FAILED_CONNECT_DOT = "تعذَّر الاتصال." as const;

/** تمّ الإنشاء — 2 screens. */
export const CREATED = "تمّ الإنشاء" as const;

/** تمّ التحديث — 2 screens. */
export const UPDATED = "تمّ التحديث" as const;

/** ملف واحد — 2 screens. */
export const ONE_FILE = "ملف واحد" as const;

/** ملفاً — 3 screens. */
export const NOUN_FILE_ACC = "ملفاً" as const;

/** مقرّرات نشطة — 2 screens. */
export const ACTIVE_COURSES = "مقرّرات نشطة" as const;

/** جلسات — 3 screens. */
export const NOUN_SESSIONS = "جلسات" as const;

/** حضور — 3 screens. */
export const NOUN_ATTEND = "حضور" as const;

/** لا تنبيهات — 2 screens. */
export const NO_ALERTS = "لا تنبيهات" as const;

/** مفهوم واحد — 2 screens. */
export const ONE_CONCEPT = "مفهوم واحد" as const;

/** فتح — 3 screens. */
export const OPEN = "فتح" as const;

/** فجوات — 3 screens. */
export const GAPS = "فجوات" as const;

/** واجبات — 3 screens. */
export const HOMEWORK = "واجبات" as const;

/** التزامات اليوم — 2 screens. */
export const TODAY_COMMITMENTS = "التزامات اليوم" as const;

/** المؤسسة النموذجية — 2 screens. */
export const MODEL_INSTITUTION = "المؤسسة النموذجية" as const;

/** مركز التحميلات — 2 screens. */
export const DOWNLOADS_CENTER = "مركز التحميلات" as const;

/** ساعتان معتمدتان — 2 screens. */
export const TWO_CREDIT_HOURS = "ساعتان معتمدتان" as const;

/** ساعة معتمدة — 2 screens. */
export const ONE_CREDIT_HOUR = "ساعة معتمدة" as const;

/** دليل المقرّرات — 2 screens. */
export const COURSES_GUIDE = "دليل المقرّرات" as const;

/** مقرّراتي — 3 screens. */
export const MY_COURSES_SHORT = "مقرّراتي" as const;

/** نقطتا تفاعل — 2 screens. */
export const TWO_INTERACTION_POINTS = "نقطتا تفاعل" as const;

/** نقاط تفاعل — 2 screens. */
export const INTERACTION_POINTS = "نقاط تفاعل" as const;

/** نقطة تفاعل — 2 screens. */
export const INTERACTION_POINT = "نقطة تفاعل" as const;

/** واجبان — 3 screens. */
export const NOUN_TWO_HOMEWORK = "واجبان" as const;

/** واجباً — 3 screens. */
export const NOUN_HOMEWORK_ACC = "واجباً" as const;

/** مقرّرات مسجَّلة — 2 screens. */
export const ENROLLED_COURSES = "مقرّرات مسجَّلة" as const;

/** غداً — 3 screens. */
export const TOMORROW = "غداً" as const;

/** جيد — 3 screens. */
export const GOOD = "جيد" as const;

/** ابدأ المسار — 2 screens. */
export const START_PATH = "ابدأ المسار" as const;

/** نقاط الإنجاز — 2 screens. */
export const ACHIEVEMENT_POINTS = "نقاط الإنجاز" as const;

/** المساعد الذكي — 2 screens. */
export const AI_ASSISTANT = "المساعد الذكي" as const;

/** الآن — 3 screens. */
export const NOW = "الآن" as const;

/** سدّ الفجوة — 2 screens. */
export const CLOSE_THE_GAP = "سدّ الفجوة" as const;

/** منذ يومين — 2 screens. */
export const SINCE_TWO_DAYS = "منذ يومين" as const;

/** منذ أيام — 2 screens. */
export const SINCE_DAYS = "منذ أيام" as const;

/** منذ يوماً — 2 screens. */
export const SINCE_A_DAY = "منذ يوماً" as const;

/** من أصل — 2 screens. */
export const OUT_OF = "من أصل" as const;

/** معامل متاحة — 2 screens. */
export const AVAILABLE_LABS = "معامل متاحة" as const;

/** ذكاء اصطناعي — 2 screens. */
export const AI = "ذكاء اصطناعي" as const;

/** بحث واحد — 2 screens. */
export const ONE_RESEARCH = "بحث واحد" as const;

/** بحوث — 3 screens. */
export const RESEARCH = "بحوث" as const;

/** المعامل والتقنيات — 2 screens. */
export const LABS_TECH = "المعامل والتقنيات" as const;

/** مباشرة الآن — 2 screens. */
export const LIVE_NOW = "مباشرة الآن" as const;

/** جلسات قادمة — 2 screens. */
export const UPCOMING_SESSIONS = "جلسات قادمة" as const;

/** جلسة واحدة — 2 screens. */
export const ONE_SESSION = "جلسة واحدة" as const;

/** تسليمان — 3 screens. */
export const NOUN_TWO_SUBMISSIONS = "تسليمان" as const;

/** تسليماً — 3 screens. */
export const NOUN_SUBMISSION_ACC = "تسليماً" as const;

/** الإنجازات والشهادات — 2 screens. */
export const ACHIEVEMENTS_CERTS = "الإنجازات والشهادات" as const;

/** للمستوى التالي — 2 screens. */
export const TO_NEXT_LEVEL = "للمستوى التالي" as const;

/** الشؤون الماليّة — 2 screens. */
export const FINANCE = "الشؤون الماليّة" as const;

/** الرقم الجامعيّ — 2 screens. */
export const UNI_ID_DOT = "الرقم الجامعيّ" as const;

/** ساعات العمل — 2 screens. */
export const OFFICE_HOURS = "ساعات العمل" as const;

/** بانتظار الفحص — 2 screens. */
export const PENDING_CHECK = "بانتظار الفحص" as const;

/** جارٍ الفحص — 2 screens. */
export const CHECKING = "جارٍ الفحص" as const;

/** جارٍ الآن — 2 screens. */
export const RUNNING_NOW = "جارٍ الآن" as const;

/** — بدون مقرّر — — 2 screens. */
export const NO_COURSE_DASH = "— بدون مقرّر —" as const;

/** إزالة الملف — 2 screens. */
export const REMOVE_FILE = "إزالة الملف" as const;

/** البحث العلمي — 2 screens. */
export const SCIENTIFIC_RESEARCH = "البحث العلمي" as const;

/** دقيقة واحدة — 2 screens. */
export const ONE_MINUTE = "دقيقة واحدة" as const;

/** نقطة واحدة — 2 screens. */
export const ONE_POINT = "نقطة واحدة" as const;

/** مجموع النقاط — 2 screens. */
export const TOTAL_POINTS = "مجموع النقاط" as const;

/** بانتظار تقييمك — 2 screens. */
export const AWAITING_YOUR_RATING = "بانتظار تقييمك" as const;

/** وصف (اختياري) — 2 screens. */
export const DESC_OPTIONAL = "وصف (اختياري)" as const;

/** تقييم التسليم — 2 screens. */
export const RATE_SUBMISSION = "تقييم التسليم" as const;

/** تسجيل الحضور — 2 screens. */
export const RECORD_ATTENDANCE = "تسجيل الحضور" as const;

/** مستقر — 3 screens. */
export const STABLE = "مستقر" as const;

/** بانتظار درجتك — 2 screens. */
export const AWAITING_YOUR_GRADE = "بانتظار درجتك" as const;

/** الكل مستقر — 2 screens. */
export const ALL_STABLE = "الكل مستقر" as const;

/** هذا الفصل — 2 screens. */
export const THIS_SEMESTER = "هذا الفصل" as const;

/** لا طلاب — 2 screens. */
export const NO_STUDENTS = "لا طلاب" as const;

/** لا واجبات — 2 screens. */
export const NO_HOMEWORK = "لا واجبات" as const;

/** إدخال الدرجات — 2 screens. */
export const GRADE_ENTRY = "إدخال الدرجات" as const;

/** تمّ الحفظ. — 2 screens. */
export const SAVED_DOT = "تمّ الحفظ." as const;
