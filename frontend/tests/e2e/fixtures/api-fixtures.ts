/**
 * api-fixtures — the payload corpus for the hermetic E2E suite
 * (r164-k / Agent K).
 *
 * Every object here mirrors the REAL wire contract the frontend
 * consumes:
 *   - envelope: `{ data: T }` on success, `{ error: { code, message } }`
 *     on failure (frontend/src/lib/api.ts → unwrap() reads
 *     `res.data.data`; backend lib/errors.ts authors the Arabic
 *     messages shown verbatim by authErrorView — D17-3);
 *   - shapes: copied from the consuming hooks
 *     (src/hooks/resources/{student,learning,exams,notifications}.ts +
 *     src/hooks/useAuth.ts) — field-for-field, no invented fields.
 *
 * Time discipline (no flaky timers):
 *   - All timestamps derive from FIXED_NOW, and the E2E test fixture
 *     freezes the page clock at FIXED_NOW (page.clock.setFixedTime) with
 *     timezoneId 'UTC'. timeAgoAr / formatDue / examWindowState read
 *     Date.now() — frozen — so relative strings («منذ ساعتين»,
 *     «بعد 3 أيام», 'open') are deterministic. useGreeting reads
 *     new Date().getHours() → 10 UTC → «صباح الخير», also frozen.
 *
 * The same corpus serves the DB-less surface-inventory capture
 * (tests/audit, AUDIT_API_MOCK=1) — one fixture source, two harnesses.
 */

import type { AppRole } from '../../../src/stores/auth.store';
// R320 §C — the documented TEST password comes from the single
// source of truth. NOTE: Playwright's TS loader cannot follow the
// repo-root shared/testAccounts.ts RE-EXPORT chain (it transpiles the
// shim to CJS and named exports vanish — verified empirically), so
// Playwright-consumed fixtures import the PHYSICAL table module
// directly; vite/vitest consumers use the @shared alias.
import { TEST_PASSWORD } from '../../../../backend/src/modules/auth/test-accounts.data';

/* ── frozen clock ──────────────────────────────────────────────── */

/** The instant every fixture timestamp is relative to (10:00 UTC). */
export const FIXED_NOW_ISO = '2026-03-15T10:00:00.000Z';
export const FIXED_NOW = Date.parse(FIXED_NOW_ISO);

/** ISO string `hours` from the frozen now (negative = past). */
export function iso(hoursFromNow: number): string {
  return new Date(FIXED_NOW + hoursFromNow * 3_600_000).toISOString();
}

/** Match-any-greeting regex — the four shipped Arabic greetings.
 * r166a: the 00:00–06:00 branch is «ليلة سعيدة» (was «سهرة سعيدة» —
 * a soirée, the wrong register for 2am). */
export const GREETING_RE = /(صباح الخير|مساء النور|مساء الخير|ليلة سعيدة)/;

/* ── users & sessions ──────────────────────────────────────────── */

export interface FixtureUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  avatarColor: string | null;
  avatarInitials: string | null;
  scopeFacultyId: string | null;
}

export const STUDENT_USER: FixtureUser = {
  id: 'usr_e2e_student',
  email: 'student@test.ly',
  firstName: 'أحمد',
  lastName: 'الزاوي',
  role: 'STUDENT',
  avatarColor: '#3b82f6',
  avatarInitials: 'أز',
  scopeFacultyId: null,
};

export const TEACHER_USER: FixtureUser = {
  id: 'usr_e2e_teacher',
  email: 'teacher@test.ly',
  firstName: 'ليلى',
  lastName: 'الفيتوري',
  role: 'TEACHER',
  avatarColor: '#8b5cf6',
  avatarInitials: 'لف',
  scopeFacultyId: null,
};

/**
 * The three staff roles exist ONLY for the DB-less surface sweep
 * (AUDIT_API_MOCK=1): the audit harness seeds one context per role so
 * guarded routes render inside the app. No journey spec uses them —
 * their pages have no fixture payloads and would 501 into honest
 * error/empty states (which is exactly what the sweep records).
 */
export const ADMIN_USER: FixtureUser = {
  id: 'usr_e2e_admin',
  email: 'admin@test.ly',
  firstName: 'سالم',
  lastName: 'القرضابي',
  role: 'ADMIN',
  avatarColor: '#059669',
  avatarInitials: 'سق',
  scopeFacultyId: null,
};

export const QUALITY_USER: FixtureUser = {
  id: 'usr_e2e_quality',
  email: 'quality@test.ly',
  firstName: 'عائشة',
  lastName: 'الباروني',
  role: 'QUALITY',
  avatarColor: '#d97706',
  avatarInitials: 'عب',
  scopeFacultyId: null,
};

export const OWNER_USER: FixtureUser = {
  id: 'usr_e2e_owner',
  email: 'owner@test.ly',
  firstName: 'المدير',
  lastName: 'الأعلى',
  role: 'OWNER',
  avatarColor: '#dc2626',
  avatarInitials: 'مأ',
  scopeFacultyId: null,
};

/** One seeded user per guarded role (audit sweep, AUDIT_API_MOCK=1). */
export const ROLE_USERS: Record<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER', FixtureUser> = {
  STUDENT: STUDENT_USER,
  TEACHER: TEACHER_USER,
  ADMIN: ADMIN_USER,
  QUALITY: QUALITY_USER,
  OWNER: OWNER_USER,
};

/** The canonical TEST password (R320 §C) — imported from the shared
 * test-account table (repo-root shared/testAccounts.ts) so this
 * hermetic corpus can never drift from the documented value. A repo
 * fixture, not a secret. */
export const DEMO_PASSWORD = TEST_PASSWORD;

/** Credentials the mock transport accepts for a successful login. */
export const VALID_LOGIN = {
  email: STUDENT_USER.email,
  password: DEMO_PASSWORD,
} as const;

/** Lockout account: login answers 429 TOO_MANY_REQUESTS (A13 P2-1). */
export const LOCKED_EMAIL = 'locked@test.ly';

/** Wrong-password login the mock answers with 401 INVALID_CREDENTIALS. */
export const WRONG_LOGIN = { email: STUDENT_USER.email, password: 'wrong-password' } as const;

/** Error messages exactly as the backend authors them (lib/errors.ts). */
export const LOGIN_FAILED_MESSAGE = 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
export const LOGIN_LOCKED_MESSAGE = 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة.';

/** GET /auth/me — MeProfileResponse (hooks/useAuth.ts useMe). */
export function meProfile(user: FixtureUser): Record<string, unknown> {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    avatarColor: user.avatarColor,
    avatarInitials: user.avatarInitials,
    scopeFaculty: null,
    // 'SYSTEM' → useThemeProfileSync Case 3: the local choice stays
    // authoritative; no profile pull can flip the theme mid-test.
    themePreference: 'SYSTEM',
    themePreferenceUpdatedAt: iso(-24 * 90),
    onboardingCompletedAt: iso(-24 * 30),
    firedMilestones: [],
    studentProfile: user.role === 'STUDENT' ? {
      universityId: '2023-11045',
      year: 3,
      facultyId: 'fac_e2e_eng',
      departmentId: 'dep_e2e_cs',
      faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' },
      department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
    } : null,
    teacherProfile: null,
  };
}

/** GET /me/profile — MyProfile (hooks/resources/student.ts). */
export const MY_PROFILE = {
  id: STUDENT_USER.id,
  email: STUDENT_USER.email,
  firstName: STUDENT_USER.firstName,
  lastName: STUDENT_USER.lastName,
  role: 'STUDENT' as AppRole,
  avatarColor: STUDENT_USER.avatarColor,
  avatarInitials: STUDENT_USER.avatarInitials,
  emailVerifiedAt: iso(-24 * 200),
  createdAt: iso(-24 * 700),
  student: {
    universityId: '2023-11045',
    year: 3,
    gpa: 3.42,
    totalXp: 1240,
    level: 7,
    faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة', nameEn: null },
    department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', nameEn: null },
    /* r349-P2 additive keys — the privacy-shaped self view (the same
     * shape GET /people/:id returns for staff; privacy.ts is the
     * shaper) + the institution's custom-field values. The pre-P2
     * legacy keys above stay (the frozen consumer contract). */
    profile: {
      id: 'sp_e2e_student',
      userId: STUDENT_USER.id,
      kind: 'student',
      nameAr: 'أحمد محمد الزاوي',
      nameEn: 'Ahmed Alzawi',
      fatherName: 'محمد',
      grandfatherName: 'الزاوي',
      motherName: 'فاطمة الزاوي',
      dateOfBirth: '2004-06-15',
      birthPlace: 'طرابلس',
      gender: 'MALE',
      city: 'طرابلس',
      address: null,
      profileImageUrl: null,
      universityId: '2023-11045',
      phone: { access: 'VISIBLE', display: '0912345678', canRequestContact: false },
      phoneVisibility: 'INSTITUTION_STAFF',
      guardianPhoneVisibility: 'INSTITUTION_STAFF',
      additionalPhone: null,
      guardian: {
        name: 'محمد الزاوي',
        relationship: 'أب',
        phone: { access: 'VISIBLE', display: '0925556666', canRequestContact: false },
      },
      emergencyContact: { name: 'ليلى الزاوي', phone: '0911112222' },
      nationalId: { access: 'VISIBLE', value: '104061512345' },
      nationalIdPresent: true,
      academic: {
        stage: null,
        grade: null,
        section: null,
        previousSchool: null,
        transferStatus: null,
        studyType: 'MORNING',
        enrollmentStatus: 'ACTIVE',
        secondarySchool: 'ثانوية طرابلس للعلوم',
        secondarySchoolBranch: 'علمي',
        secondarySchoolPercent: 88.5,
        admissionYear: 2023,
      },
    },
    customFields: [],
  },
  teacher: null,
};

/* ── shared ids ────────────────────────────────────────────────── */

export const OFFERING_ID = 'offr_e2e_algorithms';
export const LECTURE_ID = 'lec_e2e_greedy';

/* ── student dashboard: GET /me/dashboard ──────────────────────── */

export const STUDENT_DASHBOARD = {
  profile: {
    year: 3,
    gpa: 3.42,
    totalXp: 1240,
    level: 7,
    facultyName: 'كلية الهندسة',
    departmentName: 'قسم علوم الحاسوب',
  },
  kpi: {
    courseCount: 4,
    attendancePct: 87,
    pendingAssignmentsCount: 2,
    totalXp: 1240,
    rank: 12,
    cohortSize: 180,
  },
  term: {
    code: '2026S',
    startsAt: iso(-24 * 42),
    endsAt: iso(24 * 70),
    progressPct: 45,
  },
  progress: {
    avgEnrollmentProgressPct: 58,
  },
  agenda: {
    classes: [
      {
        id: 'cls_e2e_1',
        offeringId: OFFERING_ID,
        courseName: 'مقدمة في الخوارزميات',
        courseCode: 'CS-201',
        startTime: '09:00',
        endTime: '10:30',
        room: 'قاعة A2',
        when: 'today' as const,
      },
      {
        id: 'cls_e2e_2',
        offeringId: 'offr_e2e_databases',
        courseName: 'قواعد البيانات المتقدمة',
        courseCode: 'CS-310',
        startTime: '11:00',
        endTime: '12:30',
        room: 'قاعة B1',
        when: 'tomorrow' as const,
      },
    ],
    assignments: [
      {
        id: 'asg_e2e_1',
        offeringId: OFFERING_ID,
        title: 'واجب الأسبوع الثالث',
        type: 'HOMEWORK' as const,
        dueAt: iso(24 * 3 + 0.5),
        courseName: 'مقدمة في الخوارزميات',
        courseCode: 'CS-201',
      },
    ],
    live: [],
  },
};

/* ── continue-learning: GET /me/resume ─────────────────────────── */

export const RESUME = {
  mode: 'continue' as const,
  progressPct: 62,
  watchedSec: 446,
  lecture: {
    id: LECTURE_ID,
    title: 'الخوارزميات الجشعة',
    durationSec: 720,
    ordinal: 2,
    course: {
      id: 'crs_e2e_algorithms',
      name: 'مقدمة في الخوارزميات',
      code: 'CS-201',
      themeColor: '#7c3aed',
    },
    offeringId: OFFERING_ID,
  },
};

/* ── enrollments: GET /enrollments/me ──────────────────────────── */

export const ENROLLMENTS = [
  {
    id: 'enr_e2e_1',
    progressPct: 62,
    offering: {
      id: OFFERING_ID,
      room: 'قاعة A2',
      course: {
        id: 'crs_e2e_algorithms',
        code: 'CS-201',
        name: 'مقدمة في الخوارزميات',
        iconEmoji: '🧮',
        themeColor: '#7c3aed',
        credits: 3,
        department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
      },
      teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
      schedule: [
        { id: 'sch_e2e_1', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', room: 'قاعة A2' },
      ],
    },
  },
  {
    id: 'enr_e2e_2',
    progressPct: 100,
    offering: {
      id: 'offr_e2e_databases',
      room: 'قاعة B1',
      course: {
        id: 'crs_e2e_databases',
        code: 'CS-310',
        name: 'قواعد البيانات المتقدمة',
        iconEmoji: '🗄️',
        themeColor: '#0ea5e9',
        credits: 3,
        department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
      },
      teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
      schedule: [
        { id: 'sch_e2e_2', dayOfWeek: 2, startTime: '11:00', endTime: '12:30', room: 'قاعة B1' },
      ],
    },
  },
];

/* ── lectures ──────────────────────────────────────────────────── */

const LECTURES = [
  {
    id: 'lec_e2e_bigO',
    offeringId: OFFERING_ID,
    title: 'تحليل التعقيد الزمني',
    description: 'رمز O الكبير وأسوأ الحالات.',
    ordinal: 1,
    durationSec: 660,
    videoUrl: '/api/v1/media/lecture-bigo.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 20),
    _count: { chapters: 2, checkpoints: 0 },
    watchEvents: [{ watchedSec: 660, totalSec: 660, completed: true }],
  },
  {
    id: LECTURE_ID,
    offeringId: OFFERING_ID,
    title: 'الخوارزميات الجشعة',
    description: 'الاختيار الجشع والإثبات الصحيح.',
    ordinal: 2,
    durationSec: 720,
    videoUrl: '/api/v1/media/lecture-greedy.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 13),
    _count: { chapters: 2, checkpoints: 1 },
    watchEvents: [{ watchedSec: 446, totalSec: 720, completed: false }],
  },
];

/** GET /offerings/:id/lectures — Lecture[]. */
export const OFFERING_LECTURES = LECTURES;

/**
 * GET /offerings/offr_e2e_databases/lectures — the second enrollment's
 * offering (CoursesPage counts lectures per card): one completed
 * lecture, coherent with its progressPct: 100.
 */
export const DB_OFFERING_LECTURES = [
  {
    id: 'lec_e2e_sql',
    offeringId: 'offr_e2e_databases',
    title: 'استعلامات SQL المتقدمة',
    description: 'JOINs والفهارس.',
    ordinal: 1,
    durationSec: 690,
    videoUrl: '/api/v1/media/lecture-sql.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 30),
    _count: { chapters: 1, checkpoints: 0 },
    watchEvents: [{ watchedSec: 690, totalSec: 690, completed: true }],
  },
];

/** GET /offerings/:id/full — OfferingFull. */
export const OFFERING_FULL = {
  id: OFFERING_ID,
  term: '2026S',
  room: 'قاعة A2',
  course: {
    id: 'crs_e2e_algorithms',
    name: 'مقدمة في الخوارزميات',
    code: 'CS-201',
    iconEmoji: '🧮',
    themeColor: '#7c3aed',
    description: 'المقرّر التأسيسي لتحليل وتصميم الخوارزميات.',
    credits: 3,
    department: {
      id: 'dep_e2e_cs',
      name: 'قسم علوم الحاسوب',
      faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة' },
    },
  },
  teacher: {
    id: TEACHER_USER.id,
    firstName: 'ليلى',
    lastName: 'الفيتوري',
    avatarInitials: 'لف',
    avatarColor: '#8b5cf6',
  },
  schedule: [
    { id: 'sch_e2e_1', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', room: 'قاعة A2' },
  ],
  materials: [
    {
      id: 'mat_e2e_1',
      name: 'مذكّرات الأسبوع الثالث.pdf',
      type: 'PDF',
      url: '/api/v1/files/mat_e2e_1.pdf',
      sizeBytes: '1048576',
      createdAt: iso(-24 * 6),
    },
  ],
  assignments: [
    {
      id: 'asg_e2e_1',
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK',
      dueAt: iso(24 * 3 + 0.5),
      weight: 10,
      maxScore: 20,
    },
  ],
  lectures: LECTURES,
  _count: { enrollments: 24 },
};

/** GET /lectures/:id — LectureDetail. */
export const LECTURE_DETAIL = {
  ...LECTURES[1],
  chapters: [
    { id: 'chp_e2e_1', title: 'مقدمة الخيار الجشع', startSec: 0, endSec: 240, ordinal: 1, conceptId: null, concept: null },
    { id: 'chp_e2e_2', title: 'أمثلة وتطبيقات', startSec: 240, endSec: 720, ordinal: 2, conceptId: null, concept: null },
  ],
  checkpoints: [
    {
      id: 'ckp_e2e_1',
      triggerSec: 300,
      question: 'متى يضمن الخيار الجشع الحل الأمثل؟',
      options: ['عندما تحقق المشكلة خاصية الاختيار الجشع', 'دائماً', 'عندما تكون البيانات مرتبة', 'لا يضمنها أبداً'],
      conceptId: null,
      answers: [],
    },
  ],
  offering: {
    id: OFFERING_ID,
    course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', themeColor: '#7c3aed' },
    teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
  },
};

/* ── online exams: GET /exams/me — MyExam[] ────────────────────── */

export const MY_EXAMS = [
  {
    id: 'exm_e2e_quiz3',
    title: 'اختبار قصير — الوحدة الثالثة',
    kind: 'QUIZ' as const,
    durationMin: 15,
    questionCount: 8,
    passingScore: 60,
    openAt: iso(-24 * 2),
    closeAt: iso(24 * 5),
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: null,
    facultyName: 'كلية الهندسة',
    myAttempt: null,
  },
  {
    id: 'exm_e2e_midterm',
    title: 'اختبار نصفي — الخوارزميات',
    kind: 'MIDTERM' as const,
    durationMin: 90,
    questionCount: 24,
    passingScore: 50,
    openAt: iso(-24 * 10),
    closeAt: iso(-24 * 9),
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: null,
    facultyName: 'كلية الهندسة',
    myAttempt: {
      id: 'att_e2e_midterm',
      status: 'GRADED',
      score: 82,
      maxScore: 100,
      submittedAt: iso(-24 * 10 + 2),
    },
  },
];

/* ── notifications ─────────────────────────────────────────────── */

export const NOTIFICATIONS = [
  {
    id: 'ntf_e2e_1',
    type: 'ACADEMIC' as const,
    title: 'تم نشر درجة الواجب الثاني',
    body: 'حصلت على 18 من 20 في واجب مادة مقدمة في الخوارزميات.',
    readAt: null,
    createdAt: iso(-2),
  },
  {
    id: 'ntf_e2e_2',
    type: 'URGENT' as const,
    title: 'تنبيه: اقتراب موعد اختبار نصفي',
    body: 'يفتح باب الاختبار النصفي خلال يومين.',
    readAt: null,
    createdAt: iso(-26),
  },
  {
    id: 'ntf_e2e_3',
    type: 'SYSTEM' as const,
    title: 'تحديث المنصة',
    body: null,
    readAt: iso(-1),
    createdAt: iso(-50),
  },
];

/** Unread count riding the notifications envelope meta. */
export const UNREAD_COUNT = 2;

/* ── faculties: GET /faculties — Faculty[] (register form) ─────── */

export const FACULTIES = [
  {
    id: 'fac_e2e_eng',
    name: 'كلية الهندسة',
    iconEmoji: '⚙️',
    city: 'الزاوية',
    departments: [
      { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب' },
      { id: 'dep_e2e_civil', name: 'قسم الهندسة المدنية' },
    ],
  },
  {
    id: 'fac_e2e_med',
    name: 'كلية الطب البشري',
    iconEmoji: '🩺',
    city: 'الزاوية',
    departments: [{ id: 'dep_e2e_gen', name: 'قسم العلوم الأساسية' }],
  },
];

/* ── discovery search: GET /search/discover?q=… — DiscoverResults (r353-F) ── */

export const DISCOVER_RESULTS = {
  query: 'خوارزم',
  categories: {
    courses: {
      items: [
        {
          id: 'crs_e2e_algorithms',
          kind: 'course' as const,
          titleAr: 'مقدمة في الخوارزميات',
          subtitleAr: 'CS-201 · كلية الهندسة',
          href: `/student/courses/${OFFERING_ID}`,
        },
      ],
      total: 1,
    },
    lectures: {
      items: [
        {
          id: LECTURE_ID,
          kind: 'lecture' as const,
          titleAr: 'الخوارزميات الجشعة',
          subtitleAr: 'المحاضرة 2 · مقدمة في الخوارزميات',
          // The palette suppresses lecture rows for a role with no
          // openable lecture surface — STUDENT keeps the deep link.
          href: `/student/lectures/${LECTURE_ID}`,
        },
      ],
      total: 1,
    },
  },
  tookMs: 2,
};

/* ══════════════════════════════════════════════════════════════════
   r165h — additive rows for the staff/library/checkpoint journeys.
   Everything above this banner is the r164-k corpus, untouched.
   ══════════════════════════════════════════════════════════════════ */

/* ── training catalog: GET /training/catalog ──────────────────── */

/**
 * The dashboard's resume-hero fallback arm (r164c) reads this on every
 * student dashboard visit. The corpus ships NO tracks — honest: RESUME
 * always rides a lecture here, so the training arm never renders and an
 * empty list is the truthful payload (also what closes the loud-501
 * gap the integrated tree had for this route).
 */
export const TRAINING_CATALOG: unknown[] = [];

/* ── teacher grading loop (r165h) ───────────────────────────────── */

/** GET /teacher/me/assignments — TeacherAssignmentRow[]. */
export const TEACHER_ASSIGNMENTS = [
  {
    id: 'asg_e2e_teacher_1',
    title: 'واجب الأسبوع الثالث',
    type: 'HOMEWORK' as const,
    dueAt: iso(24 * 2),
    weight: 10,
    maxScore: 20,
    course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' },
    submissions: 2,
    enrolled: 24,
  },
];

/** The graded-row response of POST /submissions/:id/grade. */
export function gradedSubmission(id: string, grade: number, feedback?: string): Record<string, unknown> {
  return {
    id,
    assignmentId: 'asg_e2e_teacher_1',
    studentId: STUDENT_USER.id,
    status: 'GRADED' as const,
    grade,
    feedback: feedback ?? null,
    textAnswer: null,
    fileUrl: null,
    submittedAt: iso(-2),
    gradedAt: iso(0),
  };
}

/**
 * GET /teacher/me/pending-submissions — PendingSubmissionRow[] (2 rows:
 * one on-time, one LATE so the queue renders the «متأخر» chip and the
 * grading modal's «تقييم التالي» has a live next target). The teacher
 * spec serves it through a STATEFUL route so a landed grade drops its
 * row — the static corpus cannot express that.
 */
export const PENDING_SUBMISSIONS = [
  {
    id: 'sub_e2e_1',
    submittedAt: iso(-2),
    status: 'SUBMITTED' as const,
    textAnswer: 'برهان البنية الفرعية المثلى مع مثال على جدول الأنشطة.',
    fileUrl: null,
    student: { firstName: 'مروة', lastName: 'البراني', avatarInitials: 'مر', avatarColor: '#0ea5e9' },
    assignment: {
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK' as const,
      maxScore: 20,
      dueAt: iso(24 * 2),
      offering: { course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
    },
  },
  {
    id: 'sub_e2e_2',
    submittedAt: iso(-26),
    status: 'LATE' as const,
    textAnswer: 'حلٌّ جزئي: العملية صحيحة لكن دون إثبات الاكتفاء بالاختيار المحلّي.',
    fileUrl: null,
    student: { firstName: 'سالم', lastName: 'قدّور', avatarInitials: 'سق', avatarColor: '#059669' },
    assignment: {
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK' as const,
      maxScore: 20,
      dueAt: iso(24 * 2),
      offering: { course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' } },
    },
  },
];

/* ── admin courses + delete-dependency 409 (r165h) ─────────────── */

/** GET /admin/courses?page=1&limit=20 — the enveloped, paginated roster. */
export const ADMIN_COURSES = {
  data: [
    {
      id: 'crs_e2e_algorithms',
      code: 'CS-201',
      name: 'مقدمة في الخوارزميات',
      credits: 3,
      themeColor: '#7c3aed',
      faculty: 'كلية الهندسة',
      facultyEmoji: '⚙️',
      department: 'قسم علوم الحاسوب',
      departmentId: 'dep_e2e_cs',
      offeringCount: 2,
      conceptCount: 14,
      totalEnrollments: 64,
      totalLectures: 12,
      totalMaterials: 5,
      recentOfferings: [
        { id: OFFERING_ID, term: '2026S', enrollments: 24, lectures: 6, teacher: 'د. ليلى الفيتوري' },
      ],
    },
    {
      id: 'crs_e2e_ethics',
      code: 'PHIL-101',
      name: 'مدخل إلى الأخلاق',
      credits: 2,
      themeColor: null,
      faculty: 'كلية الآداب',
      facultyEmoji: null,
      department: 'قسم الفلسفة',
      departmentId: 'dep_e2e_phil',
      offeringCount: 0,
      conceptCount: 0,
      totalEnrollments: 0,
      totalLectures: 0,
      totalMaterials: 0,
      recentOfferings: [],
    },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

/**
 * DELETE /courses/:id on a course with live teaching offerings — the
 * backend's verbatim Arabic 409 (courses.routes.ts AppError.conflict).
 */
export const COURSE_DELETE_CONFLICT = {
  error: {
    code: 'CONFLICT',
    message: 'لا يمكن حذف المقرر: ما زالت له شُعب تدريسية مسجّلة',
  },
};

/* ── quality exam moderation (r165h) ───────────────────────────── */

/** GET /exams/moderation-queue — ModerationQueueItem[]. */
export const MODERATION_QUEUE = [
  {
    id: 'tpl_e2e_quiz4',
    title: 'اختبار قصير — الوحدة الرابعة',
    kind: 'QUIZ' as const,
    durationMin: 20,
    createdAt: iso(-30),
    offering: { course: { name: 'مقدمة في الخوارزميات' } },
    author: { firstName: 'ليلى', lastName: 'الفيتوري' },
    _count: { questions: 2 },
  },
  {
    id: 'tpl_e2e_final_net',
    title: 'اختبار نهائي — الشبكات',
    kind: 'FINAL' as const,
    durationMin: 90,
    createdAt: iso(-70),
    offering: null,
    author: { firstName: 'منير', lastName: 'الزروق' },
    _count: { questions: 1 },
  },
];

/** GET /exams/templates/tpl_e2e_quiz4 — ExamTemplateDetail (2 questions). */
export const MODERATION_TEMPLATE_QUIZ = {
  id: 'tpl_e2e_quiz4',
  title: 'اختبار قصير — الوحدة الرابعة',
  description: null,
  kind: 'QUIZ' as const,
  status: 'PENDING_REVIEW' as const,
  durationMin: 20,
  passingScore: 60,
  randomized: true,
  moderationNote: null,
  openAt: null,
  closeAt: null,
  offeringId: OFFERING_ID,
  facultyId: null,
  authorId: TEACHER_USER.id,
  createdAt: iso(-30),
  offering: { id: OFFERING_ID, teacherId: TEACHER_USER.id, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
  faculty: null,
  author: { firstName: 'ليلى', lastName: 'الفيتوري' },
  moderatedBy: null,
  questions: [
    {
      id: 'tq_e2e_1',
      order: 1,
      pointsOverride: null,
      question: {
        id: 'qst_e2e_1',
        type: 'MCQ' as const,
        prompt: 'ما التعقيد الزمني للبحث الثنائي في أسوأ الحالات؟',
        choices: ['O(log n)', 'O(n)', 'O(n log n)', 'O(1)'],
        correctAnswer: 0,
        difficulty: 'EASY' as const,
        points: 2,
        isApproved: true,
        moderationNote: null,
        tags: ['تحليل'],
        category: { title: 'تحليل التعقيد' },
      },
    },
    {
      id: 'tq_e2e_2',
      order: 2,
      pointsOverride: 3,
      question: {
        id: 'qst_e2e_2',
        type: 'SHORT' as const,
        prompt: 'عرّف خاصية البنية الفرعية المثلى مع مثال.',
        choices: null,
        correctAnswer: 'كل حلٍّ أمثل يحتوي حلولاً مثلى لمسائله الفرعية — مثل أقصر مسار في Graph.',
        difficulty: 'MEDIUM' as const,
        points: 2,
        isApproved: false,
        moderationNote: 'الصياغة تحتاج مثالاً أدقّ.',
        tags: [],
        category: null,
      },
    },
  ],
  _count: { attempts: 0 },
};

/** GET /exams/templates/tpl_e2e_final_net — ExamTemplateDetail (1 question). */
export const MODERATION_TEMPLATE_FINAL = {
  id: 'tpl_e2e_final_net',
  title: 'اختبار نهائي — الشبكات',
  description: 'نطاق الوحدات الخمس الأولى.',
  kind: 'FINAL' as const,
  status: 'PENDING_REVIEW' as const,
  durationMin: 90,
  passingScore: 50,
  randomized: false,
  moderationNote: null,
  openAt: null,
  closeAt: null,
  offeringId: null,
  facultyId: null,
  authorId: 'usr_e2e_munir',
  createdAt: iso(-70),
  offering: null,
  faculty: { name: 'كلية الهندسة' },
  author: { firstName: 'منير', lastName: 'الزروق' },
  moderatedBy: null,
  questions: [
    {
      id: 'tq_e2e_3',
      order: 1,
      pointsOverride: null,
      question: {
        id: 'qst_e2e_3',
        type: 'TRUE_FALSE' as const,
        prompt: 'بروتوكول TCP يضمن تسليم الحزم بترتيب إرسالها.',
        choices: ['صح', 'خطأ'],
        correctAnswer: 0,
        difficulty: 'EASY' as const,
        points: 1,
        isApproved: true,
        moderationNote: null,
        tags: [],
        category: { title: 'أساسيات الشبكات' },
      },
    },
  ],
  _count: { attempts: 0 },
};

/** The templates the moderation preview serves, keyed by id. */
export const MODERATION_TEMPLATES: Record<string, unknown> = {
  tpl_e2e_quiz4: MODERATION_TEMPLATE_QUIZ,
  tpl_e2e_final_net: MODERATION_TEMPLATE_FINAL,
};

/* ── library borrow/return loop (r165h) ────────────────────────── */

/** GET /library/books — Book[] (one single-copy book so availability
 *  flips visibly on borrow/return; one multi-copy book). */
export const LIBRARY_BOOKS = [
  {
    id: 'bok_e2e_c',
    title: 'البرمجة بلغة C',
    author: 'د. عبد الرحمن الشريف',
    category: 'prog',
    iconEmoji: null,
    themeColor: '#7c3aed',
    rating: '4.6',
    totalCopies: 1,
    availableCopies: 1,
  },
  {
    id: 'bok_e2e_networks',
    title: 'شبكات الحاسوب: النظرية والتطبيق',
    author: 'د. هدى بن عامر',
    category: 'net',
    iconEmoji: null,
    themeColor: '#0ea5e9',
    rating: '4.2',
    totalCopies: 3,
    availableCopies: 3,
  },
];

/** GET /research/published — one published student paper. */
export const LIBRARY_RESEARCH = [
  {
    id: 'ppr_e2e_1',
    title: 'تحليل أداء الخوارزميات الجشعة في الجدولة',
    abstract: 'دراسة مقارنة لزمن التنفيذ على بيانات مرتّبة وعشوائية.',
    fileUrl: null,
    status: 'PUBLISHED' as const,
    plagiarismPct: 3,
    aiContentPct: 2,
    grade: 18,
    feedback: 'بحث متقن.',
    uploadedAt: iso(-24 * 40),
    scannedAt: iso(-24 * 39),
    gradedAt: iso(-24 * 30),
    publishedAt: iso(-24 * 28),
    student: { id: 'usr_e2e_student', firstName: 'أحمد', lastName: 'الزاوي', avatarInitials: 'أز', avatarColor: '#3b82f6' },
    reviewer: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
    offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201' } },
  },
];

/** A fresh loan row as POST /library/loans answers it (no `book` on
 *  the wire — the page refetches GET /me/loans after invalidation). */
export function loanRow(bookId: string, status: 'ACTIVE' | 'RETURNED', borrowedHoursAgo: number): Record<string, unknown> {
  return {
    id: `loan_e2e_${bookId}`,
    bookId,
    status,
    borrowedAt: iso(-borrowedHoursAgo),
    dueAt: iso(24 * 14 - borrowedHoursAgo),
    returnedAt: status === 'RETURNED' ? iso(0) : null,
  };
}

/* ── checkpoint lecture (r165h) ────────────────────────────────── */

export const CHECKPOINT_LECTURE_ID = 'lec_e2e_interact';

/**
 * GET /lectures/lec_e2e_interact — a lecture whose single checkpoint
 * triggers at second 0: the player's checkpoint effect (currentSec ≥
 * triggerSec, evaluated the moment the payload lands) opens the quiz
 * deterministically without playback — the 1-second test clip can never
 * reach a later trigger. watchEvents are EMPTY (nothing completed, no
 * resume-seek) so the modal is the page's first meaningful event.
 */
export const CHECKPOINT_LECTURE = {
  id: CHECKPOINT_LECTURE_ID,
  offeringId: OFFERING_ID,
  title: 'تمارين تفاعلية على الجشع',
  description: 'أسئلة توقّف أثناء المشاهدة ترسّخ خاصية الاختيار الجشع.',
  ordinal: 3,
  durationSec: 720,
  videoUrl: '/api/v1/media/lecture-interact.mp4',
  posterUrl: null,
  createdAt: iso(-24 * 7),
  _count: { chapters: 2, checkpoints: 1 },
  watchEvents: [],
  chapters: [
    { id: 'chp_e2e_i1', title: 'مراجعة الخاصية', startSec: 0, endSec: 240, ordinal: 1, conceptId: null, concept: null },
    { id: 'chp_e2e_i2', title: 'تمارين محلولة', startSec: 240, endSec: 720, ordinal: 2, conceptId: null, concept: null },
  ],
  checkpoints: [
    {
      id: 'ckp_e2e_i1',
      triggerSec: 0,
      question: 'أيّ شرط يضمن أن الاختيار المحلّي الأمثل يقود إلى حلٍّ عامٍّ أمثل؟',
      options: [
        'خاصية الاختيار الجشع والبنية الفرعية المثلى معًا',
        'ترتيب المدخلات تصاعديًا',
        'صغر حجم المسألة',
        'لا يوجد شرط — يعمل دائمًا',
      ],
      conceptId: null,
      answers: [],
    },
  ],
  offering: {
    id: OFFERING_ID,
    course: { id: 'crs_e2e_algorithms', name: 'مقدمة في الخوارزميات', code: 'CS-201', themeColor: '#7c3aed' },
    teacher: { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري' },
  },
};

/** The lectures list including the checkpoint lecture (siblings/nav). */
export const OFFERING_LECTURES_WITH_CHECKPOINT = [
  ...OFFERING_LECTURES,
  {
    id: CHECKPOINT_LECTURE_ID,
    offeringId: OFFERING_ID,
    title: 'تمارين تفاعلية على الجشع',
    description: 'أسئلة توقّف أثناء المشاهدة ترسّخ خاصية الاختيار الجشع.',
    ordinal: 3,
    durationSec: 720,
    videoUrl: '/api/v1/media/lecture-interact.mp4',
    posterUrl: null,
    createdAt: iso(-24 * 7),
    _count: { chapters: 2, checkpoints: 1 },
    watchEvents: [],
  },
];


/* ═════════════════════════════════════════════════════════════════
 * R356 Lane 2c — the 17 param-route fixtures (the ledger's honest-501
 * follow-up): populated detail payloads for every parameterized route
 * the page ledger listed as uncrawlable (docs/QA/page-ledger.md).
 * Shapes mirror the frontend hooks' interfaces verbatim.
 * ═════════════════════════════════════════════════════════════════ */

/* ── /student/training/:slug (+ /lesson/:lessonId) ──────────────── */
export const TRAINING_TRACK_SLUG = 'study-skills-e2e';
export const TRAINING_TRACK = {
  id: 'trk_e2e_study',
  slug: TRAINING_TRACK_SLUG,
  title: 'مهارات المذاكرة الفعّالة',
  titleEn: 'Effective Study Skills',
  summary: 'خطط مذاكرة واقعية، تكرار متباعد، واسترجاع فعّال قبل الاختبارات.',
  category: 'STUDY_SKILLS',
  level: 'BEGINNER',
  iconEmoji: '🧭',
  themeColor: null,
  estMinutes: 45,
  pointsAward: 120,
  enrolled: true,
  isCompleted: false,
  completedAt: null,
  lessons: [
    {
      id: 'les_e2e_plan',
      order: 1,
      title: 'خطة الأسبوع',
      summary: 'توزيع المقررات على أيام الأسبوع بأهداف قابلة للقياس.',
      contentMarkdown: '## الخطة\nابدأ بأصعب مقرر في أنشط ساعة لك.\n\n- جلسات 25 دقيقة مع راحة 5\n- مراجعة يوم الجمعة',
      estMinutes: 20,
      pointsAward: 50,
      quizQuestion: 'كم مدة جلسة التركيز المقترحة؟',
      isCompleted: true,
    },
    {
      id: 'les_e2e_recall',
      order: 2,
      title: 'الاسترجاع الفعّال',
      summary: 'اختبر نفسك بدل إعادة القراءة السلبية.',
      contentMarkdown: '## الاسترجاع\nأغلق الكتاب واكتب ما تتذكره، ثم قارن.',
      estMinutes: 25,
      pointsAward: 70,
      quizQuestion: null,
      isCompleted: false,
    },
  ],
};

/* ── /teacher/exams/:templateId (list + reuse of the moderation
 *    template details already shipped above) ───────────────────── */
export const EXAM_TEMPLATE_ROWS = [
  {
    id: 'tpl_e2e_quiz4',
    title: 'اختبار قصير — المصفوفات',
    kind: 'QUIZ',
    status: 'PUBLISHED',
    durationMin: 15,
    passingScore: 60,
    openAt: iso(-24),
    closeAt: iso(24 * 5),
    offering: { id: OFFERING_ID, course: { name: 'مقدمة في الخوارزميات', code: 'CS-201', iconEmoji: null } },
    faculty: { name: 'كلية الهندسة' },
    author: { firstName: 'سالم', lastName: 'الفتني' },
    _count: { questions: 4, attempts: 12 },
  },
  {
    id: 'tpl_e2e_final_net',
    title: 'اختبار نهائي — الشبكات',
    kind: 'FINAL',
    status: 'PENDING_REVIEW',
    durationMin: 120,
    passingScore: 50,
    openAt: null,
    closeAt: null,
    offering: null,
    faculty: { name: 'كلية الهندسة' },
    author: { firstName: 'سالم', lastName: 'الفتني' },
    _count: { questions: 1, attempts: 0 },
  },
];

/* ── /teacher/intelligence/:offeringId ─────────────────────────── */
export const TEACHER_OFFERINGS = [
  {
    id: OFFERING_ID,
    term: '2026-FALL',
    room: 'قاعة A-12',
    capacity: 60,
    course: { id: 'crs_e2e_algorithms', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: null, themeColor: null, credits: 3 },
    _count: { enrollments: 42, assignments: 3, lectures: 8, examTemplates: 2 },
    schedule: [{ id: 'sch_e2e_1', dayOfWeek: 0, startTime: '09:00', endTime: '10:30', room: 'قاعة A-12' }],
  },
];
export const OFFERING_ANALYTICS = {
  enrolled: 42,
  totalSessions: 8,
  overallAttendance: 78,
  avgGrade: 74,
  passRate: 82,
  assignmentCount: 3,
  examCount: 2,
};
export const TEACHER_STUDENTS = [
  {
    studentId: 'usr_e2e_amna',
    name: 'آمنة الفيتوري',
    universityId: '2026001',
    avatarInitials: 'آف',
    avatarColor: '#4F8EF7',
    attendancePct: 92,
    absences: 1,
    lateCount: 0,
    avgGrade: 88,
    watchPct: 71,
    riskScore: 12,
    riskLevel: 'OK',
    signals: [],
    suggestion: 'أداء ثابت — شجّعيها على مسارات التطوير الذاتي.',
  },
  {
    studentId: 'usr_e2e_moh',
    name: 'محمد القذافي',
    universityId: '2026002',
    avatarInitials: 'مق',
    avatarColor: '#B45DE0',
    attendancePct: 54,
    absences: 6,
    lateCount: 3,
    avgGrade: 49,
    watchPct: 22,
    riskScore: 71,
    riskLevel: 'AT_RISK',
    signals: ['غياب متكرر', 'درجة تحت الحد'],
    suggestion: 'راسله واقترح جلسة متابعة أسبوعية.',
  },
];
export const TEACHER_RISKS = [
  {
    studentId: 'usr_e2e_moh',
    name: 'محمد القذافي',
    avatarInitials: 'مق',
    avatarColor: '#B45DE0',
    riskScore: 71,
    riskLevel: 'AT_RISK',
    signals: ['غياب متكرر', 'درجة تحت الحد'],
    suggestion: 'راسله واقترح جلسة متابعة أسبوعية.',
    offeringId: OFFERING_ID,
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: null,
    courseColor: null,
  },
];

/* ── /admin/people/:id (+ directory + fields + history) ─────────── */
const PHONE_VISIBLE = { access: 'VISIBLE', display: '+218910000001', canRequestContact: false };
export const STUDENT_PERSON = {
  id: 'spr_e2e_amna',
  userId: 'usr_e2e_amna',
  kind: 'student',
  nameAr: 'آمنة الفيتوري',
  nameEn: 'Amna Alfituri',
  fatherName: 'علي',
  grandfatherName: 'يوسف',
  motherName: null,
  dateOfBirth: '2004-04-12',
  birthPlace: 'طرابلس',
  gender: 'FEMALE',
  city: 'طرابلس',
  address: null,
  profileImageUrl: null,
  universityId: '2026001',
  phone: PHONE_VISIBLE,
  phoneVisibility: 'INSTITUTION_STAFF',
  guardianPhoneVisibility: 'INSTITUTION_STAFF',
  additionalPhone: null,
  guardian: { name: 'علي الفيتوري', relationship: 'الأب', phone: { access: 'VISIBLE', display: '+218910000009', canRequestContact: false } },
  emergencyContact: { name: null, phone: null },
  nationalId: { access: 'MASKED', value: '1190****7' },
  nationalIdPresent: true,
  academic: {
    stage: null, grade: null, section: null, previousSchool: null, transferStatus: null,
    studyType: 'MORNING', enrollmentStatus: 'ACTIVE', secondarySchool: null,
    secondarySchoolBranch: null, secondarySchoolPercent: null, admissionYear: 2026,
  },
  user: { id: 'usr_e2e_amna', firstName: 'آمنة', lastName: 'الفيتوري', email: 'amna@test.ly', avatarColor: '#4F8EF7', avatarInitials: 'آف', isActive: true },
  customFields: [{ key: 'bus_route', labelAr: 'خط الحافلة', type: 'TEXT', value: 'الخط 3 — طريق المطار' }],
  faculty: { id: 'fac_e2e_eng', name: 'كلية الهندسة', nameEn: 'Engineering' },
  department: { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', nameEn: 'Computer Science' },
  year: 1,
};
export const DIRECTORY_PAGE = {
  data: [STUDENT_PERSON],
  meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
};
export const FIELD_DEFINITIONS = [
  {
    id: 'fd_e2e_bus',
    institutionId: 'inst_e2e_zu',
    key: 'bus_route',
    labelAr: 'خط الحافلة',
    labelEn: 'Bus route',
    entity: 'STUDENT',
    type: 'TEXT',
    required: false,
    options: null,
    validation: null,
    visibleTo: { roles: ['ADMIN'] },
    searchable: false,
    importKeyAr: 'خط الحافلة',
    importKeyEn: 'bus route',
    sortOrder: 1,
  },
];
export const PERSON_HISTORY = [
  { id: 'aud_e2e_1', action: 'people.read', metadata: { universityId: '2026001' }, createdAt: iso(-2), user: { firstName: 'المسجل', lastName: 'العام' } },
  { id: 'aud_e2e_2', action: 'people.update', metadata: { fields: ['phone'] }, createdAt: iso(-26), user: null },
];

/* ── /admin/permissions/:id ────────────────────────────────────── */
export const ADMIN_USERS_PAGE = {
  data: [
    { id: 'usr_e2e_amna', email: 'amna@test.ly', role: 'STUDENT', firstName: 'آمنة', lastName: 'الفيتوري', isActive: true, scopeFacultyId: null, memberships: [] },
    { id: 'usr_e2e_teacher', email: 'teacher@test.ly', role: 'TEACHER', firstName: 'سالم', lastName: 'الفتني', isActive: true, scopeFacultyId: null, memberships: [] },
  ],
  meta: { page: 1, limit: 20, total: 2, totalPages: 1 },
};
export const TEACHER_PERMISSIONS = {
  user: {
    id: 'usr_e2e_teacher',
    email: 'teacher@test.ly',
    role: 'TEACHER',
    firstName: 'سالم',
    lastName: 'الفتني',
    scopeFacultyId: null,
    scopeFaculty: null,
  },
  roleDefaults: ['EXAMS_AUTHOR', 'ANNOUNCE_FACULTY', 'RESEARCH_PUBLISH'],
  effective: ['EXAMS_AUTHOR', 'ANNOUNCE_FACULTY', 'RESEARCH_PUBLISH', 'QUALITY_VIEW'],
  overrides: [
    { id: 'ovr_e2e_1', capability: 'QUALITY_VIEW', grant: true, reason: 'طلب القسم', grantedAt: iso(-24 * 10) },
  ],
};

/* ── /admin/mail — the registrar mail console (R369-C fixtures) ──── */
export const MAIL_ADMIN_STATUS = {
  provider: 'resend',
  configured: true,
  from: 'مدارك <no-reply@madarek.ly>',
  domainVerified: null,
  previewEnabled: true,
  caps: { recipientDaily: 50, institutionDaily: 2000 },
  retryScheduleMin: [5, 30, 120],
  last24h: { queued: 3, sending: 1, sent: 61, failed: 2, suppressed: 1 },
  outboxTotals: { queued: 3, sending: 1, sent: 610, failed: 2, suppressed: 1 },
  suppressionTotal: 3,
  lastSentAt: iso(-2),
  lastSentTemplate: 'attendance-digest',
};
export const MAIL_OUTBOX_PAGE = {
  data: [
    { id: 'mail_e2e_1', to: 'amna@test.ly', template: 'welcome-student', subject: 'أهلًا بك في مدارك', status: 'sent', attempts: 1, nextAttemptAt: null, providerId: 're_e2e_1', lastError: null, dedupeKey: 'welcome:usr_e2e_amna', sentAt: iso(-3), createdAt: iso(-3) },
    { id: 'mail_e2e_2', to: 'teacher@test.ly', template: 'attendance-digest', subject: 'ملخّص الحضور اليومي', status: 'queued', attempts: 0, nextAttemptAt: iso(1), providerId: null, lastError: null, dedupeKey: 'att:off_e2e', sentAt: null, createdAt: iso(-1) },
    { id: 'mail_e2e_3', to: 'registrar@test.ly', template: 'import-report', subject: 'تقرير الاستيراد', status: 'failed', attempts: 3, nextAttemptAt: iso(4), providerId: null, lastError: 'SMTP 552 mailbox full', dedupeKey: 'imp:2026-1', sentAt: null, createdAt: iso(-5) },
    { id: 'mail_e2e_4', to: 'quality@test.ly', template: 'exam-moderation', subject: 'طلب تدقيق امتحان', status: 'sending', attempts: 1, nextAttemptAt: null, providerId: null, lastError: null, dedupeKey: 'mod:ex_e2e', sentAt: null, createdAt: iso(-0) },
  ],
  meta: { page: 1, limit: 10, total: 4, totalPages: 1 },
};
export const MAIL_SUPPRESSION_PAGE = {
  data: [
    { id: 'sup_e2e_1', email: 'bounced@test.ly', type: 'hard_bounce', reason: 'unknown mailbox', createdAt: iso(-24 * 20) },
    { id: 'sup_e2e_2', email: 'complaint@test.ly', type: 'complaint', reason: 'spam complaint', createdAt: iso(-24 * 40) },
    { id: 'sup_e2e_3', email: 'left@test.ly', type: 'unsubscribe', reason: 'طلب إلغاء الاشتراك', createdAt: iso(-24 * 60) },
  ],
  meta: { page: 1, limit: 10, total: 3, totalPages: 1 },
};
export const MAIL_TEMPLATES = { templates: ['welcome-student', 'attendance-digest', 'import-report', 'exam-moderation'] };

/* ── /owner/institutions/:slug ─────────────────────────────────── */
export const OWNER_INSTITUTIONS = [
  {
    id: 'inst_e2e_zu',
    name: 'مؤسسة مدارك النموذجية',
    nameEn: 'Madarek Model Institution',
    slug: 'zu',
    status: 'ACTIVE',
    createdAt: iso(-24 * 120),
    updatedAt: iso(-24 * 2),
    activeMembershipCount: 8,
    facultyCount: 2,
    admins: [
      { userId: 'usr_e2e_reg', email: 'registrar@test.ly', firstName: 'المسجل', lastName: 'العام', membershipId: 'mem_e2e_1', isActive: true },
    ],
  },
];
export const OWNER_FACULTIES = [
  {
    id: 'fac_e2e_eng',
    name: 'كلية الهندسة',
    nameEn: 'Engineering',
    iconEmoji: '⚙️',
    city: 'طرابلس',
    departmentCount: 1,
    studentCount: 42,
    teacherCount: 3,
    courseCount: 2,
    departments: [
      { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', students: 42, teachers: 2, courses: 2 },
    ],
  },
];
export const OWNER_TEACHERS = {
  data: [
    { id: 'usr_e2e_teacher', email: 'teacher@test.ly', firstName: 'سالم', lastName: 'الفتني' },
  ],
};

/* ── /competitions/:id (public) ────────────────────────────────── */
export const COMPETITION_DETAIL = {
  id: 'cmp_e2e_ai',
  title: 'تحدي الذكاء الاصطناعي الطلابي',
  description: 'ابنِ نموذجًا يحل مسائل الفصل الأول — التقويم على العرض التقديمي والتقرير.',
  category: 'برمجة',
  prize: 'فرصة تدريب صيفية',
  deadline: iso(24 * 14),
  status: 'OPEN',
  iconEmoji: '🏆',
  themeColor: '#FA3600',
  organizer: { firstName: 'المسجل', lastName: 'العام', role: 'ADMIN' },
  _count: { entries: 2 },
  organizerId: 'usr_e2e_reg',
  entries: [
    {
      id: 'ent_e2e_1',
      title: 'نموذج تنبؤ الحضور',
      submittedAt: iso(-48),
      score: null,
      user: { firstName: 'آمنة', lastName: 'الفيتوري', avatarColor: '#4F8EF7', avatarInitials: 'آف' },
    },
  ],
};

/* ── /colleges/:id (public) ────────────────────────────────────── */
export const COLLEGE_DETAIL = {
  id: 'clg_e2e_eng',
  name: 'كلية الهندسة',
  nameEn: 'Engineering',
  iconEmoji: '⚙️',
  city: 'طرابلس',
  stats: { studentCount: 420, teacherCount: 28, departmentCount: 3, courseCount: 12 },
  departments: [
    { id: 'dep_e2e_cs', name: 'قسم علوم الحاسوب', studentCount: 180, teacherCount: 12, courseCount: 6 },
    { id: 'dep_e2e_civ', name: 'قسم الهندسة المدنية', studentCount: 140, teacherCount: 9, courseCount: 4 },
  ],
};

/* ── /student/online-exams/:id — the taker flow (start/answer/finish) */
export const EXAM_START_PAYLOAD = {
  attemptId: 'att_e2e_quiz3',
  expiresAt: iso(0.25),
  durationMin: 15,
  title: 'اختبار قصير — الوحدة الثالثة',
  questions: [
    { id: 'q_e2e_1', type: 'MCQ', prompt: 'ما التعقيد الزمني للبحث الثنائي؟', choices: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'], points: 5 },
    { id: 'q_e2e_2', type: 'TRUE_FALSE', prompt: 'الخوارزمية الجشعة تضمن الحل الأمثل دائمًا.', choices: ['صح', 'خطأ'], points: 5 },
  ],
};
export const EXAM_SUBMIT_RESULT = {
  score: 10,
  maxScore: 10,
  status: 'SUBMITTED',
  needsManual: 0,
  passed: true,
};
