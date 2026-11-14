/**
 * permissions-matrix.ts — R353 E3: the permission matrix AS DATA.
 *
 * Single source of truth for who may do what, expressed in the exact
 * Libyan seats from docs/ROLES-LIBYA.md. `scripts/gates/gen-permissions-doc.mjs`
 * renders docs/PERMISSIONS.md from this table; the frontend nav and the
 * backend guards both already enforce these rules (nav = the map,
 * requireRole/requireCapability/assertOfferingAccess = the territory);
 * this table is the auditable CONTRACT between them, and the
 * permissions-matrix tests (frontend/tests/unit/permissions-matrix.test.ts)
 * keep it honest:
 *   - every declared seat is a real seat (role / role+staffRole /
 *     role+position combinations that can actually exist)
 *   - no two seats share an identical permission set without a
 *     documented reason (the overlap detector)
 *
 * Seats are written as:
 *   STUDENT · TEACHER · TEACHER+DEAN · TEACHER+ASSOCIATE_DEAN ·
 *   TEACHER+DEPARTMENT_HEAD · ADMIN+REGISTRAR_GENERAL ·
 *   ADMIN+COLLEGE_REGISTRAR · QUALITY+EXAMS_CONTROLLER ·
 *   QUALITY+QUALITY_OFFICER · OWNER
 */

export type MatrixAction =
  | 'view'    // read the resource
  | 'create'  // mint rows
  | 'edit'    // change rows others own
  | 'delete'  // remove rows
  | 'approve' // the workflow's control point (moderation, verification)
  | 'grade';  // evaluate student work

export type MatrixScope =
  | 'enrolled'     // only offerings the student is enrolled in
  | 'own'          // only rows the seat itself owns
  | 'department'   // the appointment's department
  | 'faculty'      // the appointment's / scope faculty
  | 'institution'  // the whole institution
  | 'platform';    // everywhere (OWNER)

export interface MatrixRow {
  /** Resource key (English identifier). */
  resource: string;
  /** Arabic resource name (the UI wording). */
  resourceAr: string;
  action: MatrixAction;
  /** Seats allowed this action on this resource. */
  seats: string[];
  scope: MatrixScope;
  /** Documented reason — REQUIRED when the overlap detector flags the row. */
  note?: string;
}

export const MATRIX_SEATS = [
  'STUDENT',
  'TEACHER',
  'TEACHER+DEAN',
  'TEACHER+ASSOCIATE_DEAN',
  'TEACHER+DEPARTMENT_HEAD',
  'ADMIN+REGISTRAR_GENERAL',
  'ADMIN+COLLEGE_REGISTRAR',
  'QUALITY+EXAMS_CONTROLLER',
  'QUALITY+QUALITY_OFFICER',
  'OWNER',
] as const;

export type MatrixSeat = (typeof MATRIX_SEATS)[number];

export const SEAT_LABELS_AR: Record<MatrixSeat, string> = {
  STUDENT: 'الطالب',
  TEACHER: 'الأستاذ',
  'TEACHER+DEAN': 'الأستاذ · عميد الكلية',
  'TEACHER+ASSOCIATE_DEAN': 'الأستاذ · وكيل الكلية',
  'TEACHER+DEPARTMENT_HEAD': 'الأستاذ · رئيس القسم',
  'ADMIN+REGISTRAR_GENERAL': 'المسجل العام',
  'ADMIN+COLLEGE_REGISTRAR': 'مسجل الكلية',
  'QUALITY+EXAMS_CONTROLLER': 'مراقب الامتحانات',
  'QUALITY+QUALITY_OFFICER': 'موظف الجودة',
  OWNER: 'مالك المنصة',
};

/**
 * THE MATRIX. Rules of authorship:
 *  - a seat appears in `seats` only if its holder may perform the
 *    action (the backend guard must agree — requireRole /
 *    requireCapability / ownership asserts are the enforcement)
 *  - `scope` is the WIDEST scope the action allows for the listed
 *    seats; per-seat narrowing (e.g. college registrar vs registrar
 *    general) is captured by splitting the row, not by a note
 *  - notes are mandatory where two seats would otherwise be identical
 */
/** R353 E3 — documented permission-identical seat PAIRS. The overlap
 * detector fails when two seats can do exactly the same things and no
 * reason is recorded. Today's real pair: the dean and the vice dean
 * hold the same platform powers (leadership oversight read + every
 * teaching action); the real-world split — the vice dean runs the exam
 * cycle (يشرف على الامتحانات النهائية ويشكّل لجانها), the dean signs
 * the final results and grants system permissions (docs/ROLES-LIBYA.md
 * §1) — becomes an approval WORKFLOW when results sign-off ships. */
export const SEAT_EQUIVALENCE_NOTES: Readonly<Record<string, string>> = {
  'TEACHER+DEAN≡TEACHER+ASSOCIATE_DEAN':
    'عميد ووكيل الكلية يتطابقان في صلاحيات المنصة اليوم؛ الفرق الوظيفي الحقيقي (الوكيل يشرف على دورة الامتحانات والعميد يعتمد النتائج النهائية) يصبح سير عمل اعتمادٍ عند إطلاق توقيع النتائج',
  // The triple below shares the same ACTION SET; the seats differ in the
  // SCOPE of the oversight rows (dean/vice-dean: faculty-wide;
  // department head: department-only — assertOfferingAccess R353 E2).
  'TEACHER+DEAN≡TEACHER+DEPARTMENT_HEAD':
    'مجموعة الأفعال نفسها للعميد ورئيس القسم، والفرق في نطاق الإشراف (العميد: كليته كلها؛ رئيس القسم: قسمه فقط — فرض في assertOfferingAccess عبر positionFacultyId/positionDepartmentId)',
  'TEACHER+ASSOCIATE_DEAN≡TEACHER+DEPARTMENT_HEAD':
    'مجموعة الأفعال نفسها لوكيل الكلية ورئيس القسم، والفرق في نطاق الإشراف (الوكيل: كليته كلها؛ رئيس القسم: قسمه فقط)',
};

export const PERMISSIONS_MATRIX: readonly MatrixRow[] = [
  // ── User accounts & the registrar's file custody ────────────────
  { resource: 'users', resourceAr: 'حسابات المستخدمين', action: 'view', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution', note: 'college registrar is narrowed to scopeFacultyId by the +fac guard (users.routes buildScopedUserWhere)' },
  { resource: 'users', resourceAr: 'حسابات المستخدمين', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR'], scope: 'institution' },
  { resource: 'users', resourceAr: 'حسابات المستخدمين', action: 'edit', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution', note: 'self-service edits (profile, password) are every-user actions outside this matrix' },
  { resource: 'users', resourceAr: 'حسابات المستخدمين', action: 'delete', seats: [], scope: 'institution', note: 'no seat deletes accounts — accounts are deactivated (isActive=false), preserving the academic record' },
  { resource: 'bulk-import', resourceAr: 'الاستيراد الجماعي (قوائم الطلاب)', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR'], scope: 'institution' },
  { resource: 'reset-link', resourceAr: 'روابط إعادة تعيين كلمة المرور', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR'], scope: 'institution' },

  // ── Enrollment (seating — the registrar's job, not the teacher's) ─
  { resource: 'enrollments', resourceAr: 'التسجيل في الشُعب', action: 'view', seats: ['STUDENT', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'own', note: 'students see their own enrollments (GET /enrollments/me)' },
  { resource: 'enrollments', resourceAr: 'التسجيل في الشُعب', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'TEACHER'], scope: 'institution', note: 'teachers hold only the batch-enroll path (/import/enroll) for their own offerings — the R352-era contract, kept explicit' },
  { resource: 'enrollments', resourceAr: 'التسجيل في الشُعب', action: 'delete', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR'], scope: 'institution' },

  // ── Course catalogue & offerings ────────────────────────────────
  { resource: 'catalog', resourceAr: 'دليل المقررات والكليات والأقسام', action: 'view', seats: ['STUDENT', 'TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'institution' },
  { resource: 'catalog', resourceAr: 'دليل المقررات والكليات والأقسام', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution', note: 'the registrar RECORDS the catalogue; the academic approval workflow (dept head proposes → dean approves) is a documented next step' },
  { resource: 'catalog', resourceAr: 'دليل المقررات والكليات والأقسام', action: 'edit', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution' },
  { resource: 'offerings', resourceAr: 'شُعب المقررات', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution' },
  { resource: 'offerings', resourceAr: 'شُعب المقررات', action: 'view', seats: ['STUDENT', 'TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'institution', note: 'content-level access is narrower: enrolled/taught/oversight (assertOfferingAccess); this row is the roster/catalog view' },

  // ── Offering content (lectures, materials, assignments) ─────────
  { resource: 'curriculum', resourceAr: 'المحاضرات والفصول والمواد', action: 'create', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD'], scope: 'own', note: 'CURRICULUM_EDIT_OWN — leadership seats keep the teaching powers they layer on top of' },
  { resource: 'curriculum', resourceAr: 'المحاضرات والفصول والمواد', action: 'edit', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own' },
  { resource: 'curriculum', resourceAr: 'المحاضرات والفصول والمواد', action: 'view', seats: ['STUDENT', 'TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'enrolled', note: 'dean/vice-dean read their faculty's offerings; department head their department (R353 E2 leadership oversight); quality oversight is institution-wide read-only' },

  // ── Attendance & grades ─────────────────────────────────────────
  { resource: 'attendance', resourceAr: 'الحضور والغياب', action: 'create', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD'], scope: 'own' },
  { resource: 'attendance', resourceAr: 'الحضور والغياب', action: 'view', seats: ['STUDENT', 'TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'own', note: 'students see only their own rows; oversight seats see within their scope' },
  { resource: 'grades', resourceAr: 'الدرجات', action: 'create', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own', note: 'the R353 E3 inventory flagged ADMIN grade-writes as a mismatch with the no-admin-grading philosophy — the registrar does NOT grade; the route still admits ADMIN today (documented deviation, owner decision pending)' },
  { resource: 'grades', resourceAr: 'الدرجات', action: 'view', seats: ['STUDENT', 'TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'own', note: 'students see only their own rows' },

  // ── Exams (the exams office owns moderation; teachers author) ───
  { resource: 'question-bank', resourceAr: 'بنك الأسئلة', action: 'create', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own', note: 'EXAMS_AUTHOR' },
  { resource: 'exam-templates', resourceAr: 'نماذج الامتحانات', action: 'create', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own' },
  { resource: 'exam-moderation', resourceAr: 'اعتماد نماذج الامتحانات', action: 'approve', seats: ['QUALITY+EXAMS_CONTROLLER', 'OWNER'], scope: 'institution', note: 'R353 E2: the quality-office default is GONE — مراقب الامتحانات (قسم الدراسة والامتحانات) owns the control point per docs/ROLES-LIBYA.md' },
  { resource: 'exam-attempts', resourceAr: 'اجتياز الامتحانات', action: 'view', seats: ['STUDENT', 'TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'own' },
  { resource: 'exam-attempts', resourceAr: 'اجتياز الامتحانات', action: 'grade', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own' },

  // ── Research ────────────────────────────────────────────────────
  { resource: 'research-papers', resourceAr: 'أوراق البحث', action: 'create', seats: ['STUDENT'], scope: 'own' },
  { resource: 'research-papers', resourceAr: 'أوراق البحث', action: 'grade', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own' },
  { resource: 'research-papers', resourceAr: 'أوراق البحث', action: 'approve', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'OWNER'], scope: 'own', note: 'publishing to the library is the supervising teacher's call' },

  // ── Quality (read + report; the OFFICE, not a power seat) ───────
  { resource: 'quality-dashboards', resourceAr: 'لوحات الجودة والتقييم', action: 'view', seats: ['QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'institution' },
  { resource: 'quality-reports', resourceAr: 'تقارير الجودة', action: 'create', seats: ['QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'institution' },

  // ── Announcements ───────────────────────────────────────────────
  { resource: 'announcements-faculty', resourceAr: 'إعلانات الكلية/القسم/المقرر', action: 'create', seats: ['TEACHER', 'TEACHER+DEAN', 'TEACHER+ASSOCIATE_DEAN', 'TEACHER+DEPARTMENT_HEAD', 'ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'QUALITY+EXAMS_CONTROLLER', 'QUALITY+QUALITY_OFFICER', 'OWNER'], scope: 'faculty' },
  { resource: 'announcements-platform', resourceAr: 'إعلانات المنصة', action: 'create', seats: ['ADMIN+REGISTRAR_GENERAL', 'OWNER'], scope: 'platform' },

  // ── Governance (verification + appointments) ────────────────────
  { resource: 'teacher-verification', resourceAr: 'توثيق ملفات الأساتذة', action: 'approve', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution', note: 'credentials verification is a registrar job (the records office); the ROLES_ASSIGN capability gates it' },
  { resource: 'teacher-positions', resourceAr: 'التعيينات الأكاديمية (عميد/وكيل/رئيس قسم)', action: 'approve', seats: ['ADMIN+REGISTRAR_GENERAL', 'OWNER'], scope: 'institution', note: 'appointments are recorded by the registrar; the university council decides (outside the platform today)' },
  { resource: 'role-assignment', resourceAr: 'منح الأدوار والصلاحيات', action: 'view', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution', note: 'ROLES_ASSIGN (view the grant surface); the owner console mints OWNERs (invitation-only)' },

  { resource: 'role-assignment', resourceAr: 'منح الأدوار والصلاحيات', action: 'edit', seats: ['ADMIN+REGISTRAR_GENERAL', 'ADMIN+COLLEGE_REGISTRAR', 'OWNER'], scope: 'institution', note: 'grant/revoke capabilities + staff seats (R353 E2 validateStaffRoleSeat)' },

  // ── Platform (OWNER) ────────────────────────────────────────────
  { resource: 'institutions', resourceAr: 'المؤسسات', action: 'create', seats: ['OWNER'], scope: 'platform' },
  { resource: 'system-settings', resourceAr: 'إعدادات المنصة وأعلام الميزات', action: 'edit', seats: ['OWNER'], scope: 'platform' },
] as const;
