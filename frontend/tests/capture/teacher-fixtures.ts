/**
 * teacher-fixtures — r174 visual-capture payloads for the teacher role.
 * Shapes mirror hooks/resources/teacher.ts (the real wire contract);
 * values are coherent but synthetic, for RENDERING only.
 */
import type { MockRouteDef } from '../e2e/fixtures/mock-transport';

const ok = (data: unknown): Record<string, unknown> => ({ data });

const TEACHER_DASHBOARD = {
  kpi: { studentCount: 118, avgGradePct: 74, attendancePct: 82, needsReview: 6 },
  pendingGrading: [
    {
      assignmentId: 'asg_e2e_1',
      title: 'واجب الأسبوع الثالث',
      type: 'HOMEWORK',
      course: { code: 'CS-201', name: 'مقدمة في الخوارزميات' },
      count: 14,
      oldestSubmittedAt: '2025-03-15T09:00:00Z',
      actionTo: '/teacher/assignments',
    },
    {
      assignmentId: 'asg_e2e_2',
      title: 'اختبار قصير — المصفوفات',
      type: 'QUIZ',
      course: { code: 'CS-204', name: 'هياكل البيانات' },
      count: 5,
      oldestSubmittedAt: '2025-03-16T11:30:00Z',
      actionTo: '/teacher/assignments',
    },
  ],
  trend: [
    { week: 'الأسبوع 1', avgGradePct: 68, attendancePct: 78 },
    { week: 'الأسبوع 2', avgGradePct: 71, attendancePct: 84 },
    { week: 'الأسبوع 3', avgGradePct: 70, attendancePct: 80 },
    { week: 'الأسبوع 4', avgGradePct: 74, attendancePct: 82 },
    { week: 'الأسبوع 5', avgGradePct: 76, attendancePct: 85 },
    { week: 'الأسبوع 6', avgGradePct: 74, attendancePct: 82 },
  ],
  feed: [
    {
      kind: 'submissions',
      id: 'sub_e2e_1',
      author: { firstName: 'أحمد', lastName: 'الزروق', avatarInitials: 'أز', avatarColor: '#4F8EF7' },
      meta: 'CS-201 · واجب الأسبوع الثالث',
      when: '2025-03-18T08:12:00Z',
      title: 'سلّم واجب الأسبوع الثالث',
      actionTo: '/teacher/assignments',
    },
    {
      kind: 'attendance',
      id: 'att_e2e_1',
      author: null,
      meta: 'CS-204 · محاضرة الأمس',
      when: '2025-03-17T10:00:00Z',
      title: 'غياب متكرر — 3 طلاب تنبيه',
      actionTo: '/teacher/attendance',
    },
    {
      kind: 'research',
      id: 'res_e2e_1',
      author: { firstName: 'سالم', lastName: 'البوسيفي', avatarInitials: 'سب', avatarColor: '#3DD68C' },
      meta: 'طلب مراجعة',
      when: '2025-03-16T14:40:00Z',
      title: 'ورقة بحثية بانتظار تقييمك',
      actionTo: '/teacher/research',
    },
  ],
};

const TEACHER_OFFERINGS = [
  {
    id: 'offr_e2e_algorithms',
    term: '2026S',
    room: 'قاعة A-12',
    capacity: 60,
    course: { id: 'crs_e2e_1', code: 'CS-201', name: 'مقدمة في الخوارزميات', iconEmoji: null, themeColor: null, credits: 3 },
    _count: { enrollments: 44, assignments: 8, lectures: 18, examTemplates: 3 },
    schedule: [
      { id: 'sch_1', dayOfWeek: 0, startTime: '09:00', endTime: '10:40', room: 'قاعة A-12' },
      { id: 'sch_2', dayOfWeek: 2, startTime: '09:00', endTime: '10:40', room: 'قاعة A-12' },
    ],
  },
  {
    id: 'offr_e2e_databases',
    term: '2026S',
    room: 'قاعة B-3',
    capacity: 45,
    course: { id: 'crs_e2e_2', code: 'CS-204', name: 'هياكل البيانات', iconEmoji: null, themeColor: null, credits: 3 },
    _count: { enrollments: 38, assignments: 6, lectures: 15, examTemplates: 2 },
    schedule: [
      { id: 'sch_3', dayOfWeek: 1, startTime: '11:00', endTime: '12:40', room: 'قاعة B-3' },
    ],
  },
];

const TEACHER_RISKS = [
  {
    studentId: 'usr_e2e_2',
    name: 'منى العجيلي',
    avatarInitials: 'مع',
    avatarColor: '#9B6FE8',
    riskScore: 78,
    riskLevel: 'AT_RISK',
    signals: ['غياب متكرر', 'تدهور الدرجات'],
    suggestion: 'تواصل مع الطالبة قبل منتصف الفصل',
    offeringId: 'offr_e2e_algorithms',
    courseName: 'مقدمة في الخوارزميات',
    courseIcon: null,
    courseColor: null,
  },
  {
    studentId: 'usr_e2e_3',
    name: 'خالد المهدي',
    avatarInitials: 'خم',
    avatarColor: '#D4A537',
    riskScore: 41,
    riskLevel: 'WATCH',
    signals: ['تأخر عن تسليمين'],
    suggestion: 'تنبيه لطيف عبر الرسائل',
    offeringId: 'offr_e2e_databases',
    courseName: 'هياكل البيانات',
    courseIcon: null,
    courseColor: null,
  },
];

export function teacherRoutes(): MockRouteDef[] {
  return [
    { method: 'GET', path: '/teacher/dashboard', json: ok(TEACHER_DASHBOARD) },
    { method: 'GET', path: '/teacher/me/offerings', json: ok(TEACHER_OFFERINGS) },
    { method: 'GET', path: '/teacher/risks', json: ok(TEACHER_RISKS) },
  ];
}
