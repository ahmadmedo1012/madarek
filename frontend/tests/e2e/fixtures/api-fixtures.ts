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

/* ── frozen clock ──────────────────────────────────────────────── */

/** The instant every fixture timestamp is relative to (10:00 UTC). */
export const FIXED_NOW_ISO = '2026-03-15T10:00:00.000Z';
export const FIXED_NOW = Date.parse(FIXED_NOW_ISO);

/** ISO string `hours` from the frozen now (negative = past). */
export function iso(hoursFromNow: number): string {
  return new Date(FIXED_NOW + hoursFromNow * 3_600_000).toISOString();
}

/** Match-any-greeting regex — the four shipped Arabic greetings. */
export const GREETING_RE = /(صباح الخير|مساء النور|مساء الخير|سهرة سعيدة)/;

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
  email: 'student@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'الزاوي',
  role: 'STUDENT',
  avatarColor: '#3b82f6',
  avatarInitials: 'أز',
  scopeFacultyId: null,
};

export const TEACHER_USER: FixtureUser = {
  id: 'usr_e2e_teacher',
  email: 'teacher@zu.edu.ly',
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
  email: 'admin@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'القرضابي',
  role: 'ADMIN',
  avatarColor: '#059669',
  avatarInitials: 'سق',
  scopeFacultyId: null,
};

export const QUALITY_USER: FixtureUser = {
  id: 'usr_e2e_quality',
  email: 'quality@zu.edu.ly',
  firstName: 'عائشة',
  lastName: 'الباروني',
  role: 'QUALITY',
  avatarColor: '#d97706',
  avatarInitials: 'عب',
  scopeFacultyId: null,
};

export const OWNER_USER: FixtureUser = {
  id: 'usr_e2e_owner',
  email: 'owner@zu.edu.ly',
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

/** The canonical demo password shared with the committed seed +
 * AuthPage's dev-only demo panel — a repo fixture, not a secret. */
export const DEMO_PASSWORD = 'Madarek2026!';

/** Credentials the mock transport accepts for a successful login. */
export const VALID_LOGIN = {
  email: STUDENT_USER.email,
  password: DEMO_PASSWORD,
} as const;

/** Lockout account: login answers 429 TOO_MANY_REQUESTS (A13 P2-1). */
export const LOCKED_EMAIL = 'locked@zu.edu.ly';

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

/* ── global search: GET /search/global?q=… — SearchResults ─────── */

export const SEARCH_RESULTS = {
  courses: [
    {
      id: 'crs_e2e_algorithms',
      title: 'مقدمة في الخوارزميات',
      subtitle: 'CS-201 · كلية الهندسة',
      iconEmoji: '🧮',
      themeColor: '#7c3aed',
      href: `/student/courses/${OFFERING_ID}`,
    },
  ],
  lectures: [
    {
      id: LECTURE_ID,
      title: 'الخوارزميات الجشعة',
      subtitle: 'المحاضرة 2 · مقدمة في الخوارزميات',
      iconEmoji: '🎬',
      themeColor: null,
      href: `/student/lectures/${LECTURE_ID}`,
    },
  ],
  papers: [],
  tracks: [],
};
