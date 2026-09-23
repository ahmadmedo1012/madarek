import { Router } from 'express';
import { z } from 'zod';
import { AttendanceStatus, Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { validate } from '../validate.js';
import { AppError } from '../../lib/errors.js';
import { assertOwnsOffering } from '../../lib/permissions.js';

const router = Router();
router.use(authMiddleware);

// ════════════════════════════════════════════════════════════════
//  Teacher view of their teaching scope
// ════════════════════════════════════════════════════════════════

/** GET /teacher/me/offerings — offerings I teach with summary KPIs */
router.get('/teacher/me/offerings', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const offerings = await prisma.courseOffering.findMany({
      where: { teacherId: userId },
      include: {
        course: { select: { id: true, code: true, name: true, iconEmoji: true, themeColor: true, credits: true } },
        _count: { select: { enrollments: true, assignments: true, lectures: true, examTemplates: true } },
        schedule: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: offerings });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Roster + per-student academic intelligence
// ════════════════════════════════════════════════════════════════

interface StudentRow {
  studentId: string;
  name: string;
  universityId: string;
  avatarInitials: string | null;
  avatarColor: string | null;
  attendancePct: number;
  absences: number;
  lateCount: number;
  avgGrade: number;
  watchPct: number;
  riskScore: number;
  riskLevel: 'OK' | 'WATCH' | 'AT_RISK' | 'CRITICAL';
  signals: string[];
  suggestion: string;
}

function classifyRisk(score: number): 'OK' | 'WATCH' | 'AT_RISK' | 'CRITICAL' {
  if (score >= 80) return 'OK';
  if (score >= 65) return 'WATCH';
  if (score >= 45) return 'AT_RISK';
  return 'CRITICAL';
}

function suggestionFor(row: { attendancePct: number; avgGrade: number; watchPct: number; absences: number }): string {
  const issues: string[] = [];
  if (row.attendancePct < 60) issues.push('حضوره منخفض — تواصل معه قبل المحاضرة القادمة');
  if (row.avgGrade < 50) issues.push('درجاته أقل من 50% — اقترح جلسة دعم فردية');
  if (row.watchPct < 40) issues.push('متابعة المحاضرات المسجَّلة ضعيفة — تأكد أنه يفتح المنصة');
  if (row.absences >= 3) issues.push(`غاب ${row.absences} مرات متتالية — قد يكون انقطع عن الدراسة`);
  if (issues.length === 0) return 'الأداء مستقر — استمر في المتابعة الدورية';
  return issues.join(' · ');
}

/**
 * GET /teacher/offerings/:id/students
 * Per-student snapshot with attendance, grade avg, watch%, risk score, suggestion.
 * Risk = 40%·attendance + 40%·grade + 20%·watch
 */
router.get('/teacher/offerings/:id/students', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const offeringId = req.params.id!;
    await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true,
                studentProfile: { select: { universityId: true } },
              },
            },
          },
        },
        attendance: { include: { records: true } },
        grades: true,
        lectures: { select: { id: true } },
      },
    });
    if (!offering) throw AppError.notFound('Offering not found');

    const totalSessions = offering.attendance.length;
    const lectureIds = offering.lectures.map((l) => l.id);
    const studentIds = offering.enrollments.map((enr) => enr.student.id);

    // ONE findMany for the whole roster (lectureId IN + studentId IN) —
    // the old code issued a watchEvent query PER STUDENT (N+1).
    const watchEvents = lectureIds.length > 0 && studentIds.length > 0
      ? await prisma.watchEvent.findMany({
          where: { lectureId: { in: lectureIds }, studentId: { in: studentIds } },
          select: { studentId: true, watchedSec: true, totalSec: true },
        })
      : [];
    const eventsByStudent = new Map<string, { watched: number; duration: number }>();
    for (const ev of watchEvents) {
      const cur = eventsByStudent.get(ev.studentId) ?? { watched: 0, duration: 0 };
      cur.watched += ev.watchedSec;
      cur.duration += ev.totalSec;
      eventsByStudent.set(ev.studentId, cur);
    }

    const students: StudentRow[] = offering.enrollments.map((enr) => {
      const stu = enr.student;
      // Attendance breakdown
      const myAttendance = offering.attendance.flatMap((s) => s.records.filter((r) => r.studentId === stu.id));
      const presentCount = myAttendance.filter((r) => r.status === AttendanceStatus.PRESENT).length;
      const lateCount = myAttendance.filter((r) => r.status === AttendanceStatus.LATE).length;
      const absences = myAttendance.filter((r) => r.status === AttendanceStatus.ABSENT).length;
      const attendancePct = totalSessions === 0 ? 100 : Math.round(((presentCount + lateCount * 0.5) / totalSessions) * 100);

      // Average grade
      const myGrades = offering.grades.filter((g) => g.studentId === stu.id);
      const avgGrade = myGrades.length === 0
        ? 0
        : Math.round(myGrades.reduce((sum, g) => sum + Number(g.score) / g.maxScore * 100, 0) / myGrades.length);

      // Watch% over course lectures (from the grouped events)
      const agg = eventsByStudent.get(stu.id);
      const watchPct = agg && agg.duration > 0 ? Math.round((agg.watched / agg.duration) * 100) : 0;

      const riskScore = Math.round(0.4 * attendancePct + 0.4 * avgGrade + 0.2 * watchPct);
      const riskLevel = classifyRisk(riskScore);

      const signals: string[] = [];
      if (attendancePct < 60) signals.push('حضور منخفض');
      if (avgGrade < 50 && myGrades.length > 0) signals.push('درجات منخفضة');
      if (watchPct < 40) signals.push('متابعة ضعيفة');
      if (absences >= 3) signals.push('غياب متكرر');

      return {
        studentId: stu.id,
        name: `${stu.firstName} ${stu.lastName}`,
        universityId: stu.studentProfile?.universityId ?? '—',
        avatarInitials: stu.avatarInitials,
        avatarColor: stu.avatarColor,
        attendancePct,
        absences,
        lateCount,
        avgGrade,
        watchPct,
        riskScore,
        riskLevel,
        signals,
        suggestion: suggestionFor({ attendancePct, avgGrade, watchPct, absences }),
      };
    });

    res.json({ data: students });
  } catch (e) { next(e); }
});

/**
 * GET /teacher/offerings/:id/analytics — course-level aggregates
 */
router.get('/teacher/offerings/:id/analytics', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const offeringId = req.params.id!;
    await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);

    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        enrollments: { select: { studentId: true } },
        attendance: { include: { records: true } },
        grades: true,
        assignments: { include: { _count: { select: { submissions: true } } } },
        examTemplates: { include: { _count: { select: { attempts: true } } } },
      },
    });
    if (!offering) throw AppError.notFound('Offering not found');

    const enrolled = offering.enrollments.length;
    const totalSessions = offering.attendance.length;
    const allRecords = offering.attendance.flatMap((s) => s.records);
    const presents = allRecords.filter((r) => r.status === 'PRESENT').length;
    const totalRecords = allRecords.length;
    const overallAttendance = totalRecords === 0 ? 0 : Math.round((presents / totalRecords) * 100);

    const allGrades = offering.grades.map((g) => Number(g.score) / g.maxScore * 100);
    const avgGrade = allGrades.length === 0 ? 0 : Math.round(allGrades.reduce((s, x) => s + x, 0) / allGrades.length);
    const passRate = allGrades.length === 0 ? 0 : Math.round((allGrades.filter((g) => g >= 50).length / allGrades.length) * 100);

    res.json({
      data: {
        enrolled,
        totalSessions,
        overallAttendance,
        avgGrade,
        passRate,
        assignmentCount: offering.assignments.length,
        examCount: offering.examTemplates.length,
      },
    });
  } catch (e) { next(e); }
});

/**
 * GET /teacher/risks — at-risk students across ALL my offerings (top 10).
 * Uses the same risk scoring logic.
 */
router.get('/teacher/risks', requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER), async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const offerings = await prisma.courseOffering.findMany({
      where: { teacherId: userId },
      include: {
        course: { select: { name: true, iconEmoji: true, themeColor: true } },
        enrollments: {
          include: {
            student: {
              select: { id: true, firstName: true, lastName: true, avatarInitials: true, avatarColor: true },
            },
          },
        },
        attendance: { include: { records: true } },
        grades: true,
        lectures: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Real watch% signal: one batched query across all my offerings' lectures.
    const allLectureIds = offerings.flatMap((o) => o.lectures.map((l) => l.id));
    const watchEvents = allLectureIds.length > 0
      ? await prisma.watchEvent.findMany({
          where: { lectureId: { in: allLectureIds } },
          select: { lectureId: true, studentId: true, watchedSec: true, totalSec: true },
        })
      : [];
    const lectureOffering = new Map<string, string>();
    for (const o of offerings) for (const l of o.lectures) lectureOffering.set(l.id, o.id);
    // (offeringId, studentId) → { watched, duration }
    const watchAgg = new Map<string, { watched: number; duration: number }>();
    for (const ev of watchEvents) {
      const oid = lectureOffering.get(ev.lectureId);
      if (!oid) continue;
      const key = `${oid}|${ev.studentId}`;
      const cur = watchAgg.get(key) ?? { watched: 0, duration: 0 };
      cur.watched += ev.watchedSec;
      cur.duration += ev.totalSec;
      watchAgg.set(key, cur);
    }

    interface RiskRow {
      studentId: string;
      name: string;
      avatarInitials: string | null;
      avatarColor: string | null;
      offeringId: string;
      courseName: string;
      courseIcon: string | null;
      courseColor: string | null;
      riskScore: number;
      riskLevel: 'OK' | 'WATCH' | 'AT_RISK' | 'CRITICAL';
      signals: string[];
      suggestion: string;
    }
    const all: RiskRow[] = [];
    for (const off of offerings) {
      const totalSessions = off.attendance.length;
      for (const enr of off.enrollments) {
        const myAtt = off.attendance.flatMap((s) => s.records.filter((r) => r.studentId === enr.student.id));
        const presentCount = myAtt.filter((r) => r.status === 'PRESENT').length;
        const lateCount = myAtt.filter((r) => r.status === 'LATE').length;
        const absences = myAtt.filter((r) => r.status === 'ABSENT').length;
        const attendancePct = totalSessions === 0 ? 100 : Math.round(((presentCount + lateCount * 0.5) / totalSessions) * 100);

        const myGrades = off.grades.filter((g) => g.studentId === enr.student.id);
        const avgGrade = myGrades.length === 0
          ? 100  // assume OK if no grades yet
          : Math.round(myGrades.reduce((s, g) => s + Number(g.score) / g.maxScore * 100, 0) / myGrades.length);

        const watchAggEntry = watchAgg.get(`${off.id}|${enr.student.id}`);
        const watchPct = watchAggEntry && watchAggEntry.duration > 0
          ? Math.round((watchAggEntry.watched / watchAggEntry.duration) * 100)
          : 0; // real signal — no more hardcoded 70 placeholder
        const riskScore = Math.round(0.4 * attendancePct + 0.4 * avgGrade + 0.2 * watchPct);
        const level = classifyRisk(riskScore);
        if (level === 'OK') continue; // skip green students
        const signals: string[] = [];
        if (attendancePct < 60) signals.push('حضور منخفض');
        if (avgGrade < 50 && myGrades.length > 0) signals.push('درجات منخفضة');
        if (absences >= 3) signals.push('غياب متكرر');
        all.push({
          studentId: enr.student.id,
          name: `${enr.student.firstName} ${enr.student.lastName}`,
          avatarInitials: enr.student.avatarInitials,
          avatarColor: enr.student.avatarColor,
          offeringId: off.id,
          courseName: off.course.name,
          courseIcon: off.course.iconEmoji,
          courseColor: off.course.themeColor,
          riskScore,
          riskLevel: level,
          signals,
          suggestion: suggestionFor({ attendancePct, avgGrade, watchPct, absences }),
        });
      }
    }
    all.sort((a, b) => a.riskScore - b.riskScore);
    res.json({ data: all.slice(0, 15) });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Manual attendance roll-call
// ════════════════════════════════════════════════════════════════
const recordAttSchema = z.object({
  date: z.coerce.date(),
  topic: z.string().max(200).optional(),
  records: z.array(z.object({
    studentId: z.string().cuid(),
    status: z.nativeEnum(AttendanceStatus),
    notes: z.string().max(300).optional(),
  })).min(1),
}).strict();

router.post(
  '/teacher/offerings/:id/attendance',
  requireRole(Role.TEACHER, Role.ADMIN, Role.OWNER),
  validate(recordAttSchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.id!;
      await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);
      const { date, topic, records } = req.body as z.infer<typeof recordAttSchema>;

      // Every studentId in the roll-call must be an enrolled student of
      // this offering — otherwise arbitrary users could be marked present.
      const studentIds = Array.from(new Set(records.map((r) => r.studentId)));
      const enrollments = await prisma.enrollment.findMany({
        where: { offeringId, studentId: { in: studentIds } },
        select: { studentId: true },
      });
      const enrolledSet = new Set(enrollments.map((e) => e.studentId));
      if (studentIds.some((id) => !enrolledSet.has(id))) {
        throw AppError.badRequest('Records contain students not enrolled in this offering');
      }

      // Session upsert + record replacement must be atomic — a crash between
      // deleteMany and createMany used to wipe a session's records.
      const session = await prisma.$transaction(async (tx) => {
        const s = await tx.attendanceSession.upsert({
          where: { offeringId_date: { offeringId, date } },
          update: { topic: topic ?? null },
          create: { offeringId, date, topic: topic ?? null },
        });
        // Replace records for this session
        await tx.attendanceRecord.deleteMany({ where: { sessionId: s.id } });
        await tx.attendanceRecord.createMany({
          data: records.map((r) => ({
            sessionId: s.id,
            studentId: r.studentId,
            status: r.status,
            notes: r.notes ?? null,
          })),
        });
        return s;
      });
      res.json({ data: { sessionId: session.id, count: records.length } });
    } catch (e) { next(e); }
  },
);

// ════════════════════════════════════════════════════════════════
//  Curriculum AI suggestions
// ════════════════════════════════════════════════════════════════

/**
 * POST /teacher/offerings/:id/curriculum/suggest
 * Generates a structured course outline based on the course name + dept + existing concepts.
 * Deterministic / heuristic — no LLM call. Realistic enough for demo.
 */
router.post('/teacher/offerings/:id/curriculum/suggest', requireCapability('CURRICULUM_EDIT_OWN', 'CURRICULUM_EDIT_ANY'), async (req, res, next) => {
  try {
    const offeringId = req.params.id!;
    await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);
    const offering = await prisma.courseOffering.findUnique({
      where: { id: offeringId },
      include: {
        course: { include: { department: { include: { faculty: true } } } },
        lectures: { orderBy: { ordinal: 'asc' } },
      },
    });
    if (!offering) throw AppError.notFound('Offering not found');

    const courseName = offering.course.name;
    const lectureCount = offering.lectures.length;

    // Heuristic outline templates — pick by keyword match in course name.
    const courseLower = courseName.toLowerCase();
    type ChapterSuggestion = { title: string; topics: string[]; estLectures: number };
    let outline: ChapterSuggestion[];

    if (courseLower.includes('برمج') || courseLower.includes('حاسوب') || courseLower.includes('programming')) {
      outline = [
        { title: 'الفصل 1 — المفاهيم الأساسية', topics: ['مقدمة في البرمجة', 'المتغيرات وأنواع البيانات', 'العمليات الحسابية والمنطقية'], estLectures: 3 },
        { title: 'الفصل 2 — التحكم في التدفق', topics: ['الجمل الشرطية', 'الحلقات التكرارية', 'الدوال الأساسية'], estLectures: 3 },
        { title: 'الفصل 3 — هياكل البيانات', topics: ['المصفوفات', 'القوائم', 'القواميس'], estLectures: 3 },
        { title: 'الفصل 4 — البرمجة الكائنية', topics: ['الكلاس والكائن', 'الوراثة', 'تعدد الأشكال'], estLectures: 3 },
        { title: 'الفصل 5 — التطبيق العملي', topics: ['مشروع متكامل', 'اختبار البرامج', 'إدارة الكود'], estLectures: 2 },
      ];
    } else if (courseLower.includes('هندس') || courseLower.includes('engineering')) {
      outline = [
        { title: 'الفصل 1 — أسس النمذجة الرياضية', topics: ['التحليل الرياضي', 'النماذج الفيزيائية الأساسية'], estLectures: 3 },
        { title: 'الفصل 2 — أدوات التحليل', topics: ['تحليل القوى', 'الإجهاد والانفعال', 'القياس والمعايرة'], estLectures: 3 },
        { title: 'الفصل 3 — التصميم الهندسي', topics: ['متطلبات التصميم', 'بدائل الحلول', 'التحليل المقارن'], estLectures: 3 },
        { title: 'الفصل 4 — التطبيقات والمعامل', topics: ['تجارب معملية', 'محاكاة', 'مشروع تصميمي'], estLectures: 3 },
      ];
    } else if (courseLower.includes('طب') || courseLower.includes('medic')) {
      outline = [
        { title: 'الفصل 1 — الأسس النظرية', topics: ['التشريح المرتبط', 'الفسيولوجيا', 'علم الأمراض'], estLectures: 4 },
        { title: 'الفصل 2 — المهارات السريرية', topics: ['الفحص السريري', 'التشخيص التفريقي', 'حالات إكلينيكية'], estLectures: 4 },
        { title: 'الفصل 3 — العلاج والمتابعة', topics: ['خطة العلاج', 'الأدوية والجرعات', 'المضاعفات والمتابعة'], estLectures: 3 },
      ];
    } else if (courseLower.includes('بحث') || courseLower.includes('منهج')) {
      outline = [
        { title: 'الفصل 1 — تأسيس المشروع البحثي', topics: ['اختيار الموضوع', 'سؤال البحث', 'مراجعة الأدبيات'], estLectures: 3 },
        { title: 'الفصل 2 — المنهجية', topics: ['المناهج الكمية', 'المناهج النوعية', 'تصميم العينة'], estLectures: 3 },
        { title: 'الفصل 3 — جمع وتحليل البيانات', topics: ['أدوات الجمع', 'التحليل الإحصائي', 'التفسير'], estLectures: 3 },
        { title: 'الفصل 4 — كتابة البحث', topics: ['هيكل IMRaD', 'الاقتباس والمراجع', 'النشر العلمي'], estLectures: 2 },
      ];
    } else {
      // Generic academic outline — Bloom's taxonomy progression
      outline = [
        { title: 'الفصل 1 — المعرفة الأساسية', topics: ['مدخل ومصطلحات', 'المفاهيم الجوهرية', 'الأسس النظرية'], estLectures: 3 },
        { title: 'الفصل 2 — الفهم العميق', topics: ['الترابط بين المفاهيم', 'الأمثلة التطبيقية', 'دراسات حالة'], estLectures: 3 },
        { title: 'الفصل 3 — التطبيق', topics: ['تمارين عملية', 'حلول لمسائل قياسية', 'دراسات مقارنة'], estLectures: 3 },
        { title: 'الفصل 4 — التحليل والتقييم', topics: ['نقد المصادر', 'مقارنة المناهج', 'الحكم العلمي'], estLectures: 2 },
        { title: 'الفصل 5 — الإبداع والابتكار', topics: ['مشاريع مستقلة', 'ربط المعرفة بالواقع', 'حلول جديدة'], estLectures: 2 },
      ];
    }

    const totalLectures = outline.reduce((s, c) => s + c.estLectures, 0);
    res.json({
      data: {
        courseName,
        currentLectureCount: lectureCount,
        suggestedTotalLectures: totalLectures,
        outline,
        rationale: lectureCount === 0
          ? `لم يتم رفع أي محاضرة بعد لهذا المقرر. الهيكل المقترح يقسم المنهج إلى ${outline.length} فصول رئيسية بمجموع ${totalLectures} محاضرة، مرتبة حسب تدرج المعرفة من المفاهيم الأساسية إلى التطبيق والتحليل.`
          : `تم اكتشاف ${lectureCount} محاضرة منشورة بالفعل. الهيكل المقترح يكمل ما لديك ويضيف فصولاً ينقصها التغطية بناءً على أهمية المنهج وتدرجه التعليمي.`,
        nextSteps: [
          'راجع الفصول وعدّل العناوين لتناسب منهجك',
          'أضف محاضرة لكل موضوع، مع نقطة تفاعل واحدة على الأقل',
          'اربط كل محاضرة بمفاهيم معرفية للمصفوفة التعليمية',
          'أنشئ امتحاناً قصيراً (Quiz) في نهاية كل فصل',
        ],
      },
    });
  } catch (e) { next(e); }
});

// ════════════════════════════════════════════════════════════════
//  Smart professor onboarding suggestions
// ════════════════════════════════════════════════════════════════

/** GET /admin/teachers/:id/suggestions — courses this teacher should teach */
router.get(
  '/admin/teachers/:id/suggestions',
  requireCapability('TEACHERS_VERIFY', 'USERS_MANAGE'),
  async (req, res, next) => {
    try {
      const teacherId = req.params.id!;
      const profile = await prisma.teacherProfile.findUnique({
        where: { userId: teacherId },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          department: { include: { faculty: true } },
        },
      });
      if (!profile) throw AppError.notFound('Teacher profile not found');

      // Get all courses, prefer same department first then same faculty
      const sameDeptCourses = await prisma.course.findMany({
        where: { departmentId: profile.departmentId },
        include: { department: { include: { faculty: true } } },
      });
      const sameFacultyCourses = await prisma.course.findMany({
        where: {
          department: { facultyId: profile.department.facultyId },
          NOT: { departmentId: profile.departmentId },
        },
        include: { department: { include: { faculty: true } } },
      });

      const keywords = [profile.specialty.toLowerCase(), ...profile.subjectKeywords.map((k) => k.toLowerCase())];

      function score(courseName: string): number {
        const cn = courseName.toLowerCase();
        let s = 0;
        for (const k of keywords) {
          if (k && cn.includes(k)) s += 30;
          // also award partial: course tokens that match keyword tokens
          const courseTokens = cn.split(/\s+/);
          const keyTokens = k.split(/\s+/);
          for (const ct of courseTokens) {
            for (const kt of keyTokens) {
              if (ct.length >= 3 && kt.length >= 3 && ct === kt) s += 12;
            }
          }
        }
        return s;
      }

      const ranked = [
        ...sameDeptCourses.map((c) => ({ c, scoreVal: score(c.name) + 25, reason: 'نفس القسم' })),
        ...sameFacultyCourses.map((c) => ({ c, scoreVal: score(c.name) + 10, reason: 'نفس الكلية' })),
      ]
        .filter((x) => x.scoreVal > 0)
        .sort((a, b) => b.scoreVal - a.scoreVal)
        .slice(0, 12);

      // Degree-level eligibility heuristic
      const degreeEligibility: Record<typeof profile.degreeLevel, string> = {
        BACHELORS: 'مؤهل لتدريس مستوى البكالوريوس (السنوات 1-2)',
        MASTERS: 'مؤهل لتدريس البكالوريوس بكافة سنواته',
        PHD: 'مؤهل لتدريس البكالوريوس والدراسات العليا',
      };

      res.json({
        data: {
          teacher: {
            id: teacherId,
            name: `${profile.user.firstName} ${profile.user.lastName}`,
            email: profile.user.email,
            specialty: profile.specialty,
            rank: profile.rank,
            degreeLevel: profile.degreeLevel,
            yearsExperience: profile.yearsExperience,
            certifications: profile.certifications ?? [],
            subjectKeywords: profile.subjectKeywords,
            department: profile.department.name,
            departmentId: profile.departmentId,
            faculty: profile.department.faculty.name,
            facultyId: profile.department.facultyId,
            verified: !!profile.verifiedAt,
            position: profile.position,
            positionFacultyId: profile.positionFacultyId,
            positionDepartmentId: profile.positionDepartmentId,
            appointedAt: profile.appointedAt,
          },
          eligibilityNote: degreeEligibility[profile.degreeLevel],
          suggestedCourses: ranked.map((r) => ({
            id: r.c.id, code: r.c.code, name: r.c.name, iconEmoji: r.c.iconEmoji,
            departmentName: r.c.department.name, facultyName: r.c.department.faculty.name,
            matchScore: r.scoreVal, reason: r.reason,
          })),
        },
      });
    } catch (e) { next(e); }
  },
);

const verifyTeacherSchema = z.object({
  verified: z.boolean(),
  notes: z.string().max(1000).optional(),
}).strict();

router.post(
  '/admin/teachers/:id/verify',
  requireCapability('TEACHERS_VERIFY'),
  validate(verifyTeacherSchema),
  async (req, res, next) => {
    try {
      const targetId = req.params.id!;
      // Wrap update + audit in a transaction so governance never
      // loses the audit trail if the auditLog.create fails (or vice
      // versa — if audit fails, the verify is rolled back).
      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.teacherProfile.update({
          where: { userId: targetId },
          data: {
            verifiedAt: req.body.verified ? new Date() : null,
            verifiedById: req.body.verified ? req.user!.id : null,
          },
          select: { userId: true, verifiedAt: true, verifiedById: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'TEACHER_VERIFY',
            resourceType: 'TeacherProfile',
            resourceId: targetId,
            userId: req.user!.id,
            metadata: { verified: req.body.verified, notes: req.body.notes ?? null },
          },
        });
        return r;
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

/**
 * Assign or clear an academic leadership position on a teacher.
 *
 * Body:
 *   { position: null }                                  → clear
 *   { position: 'DEAN', positionFacultyId: '...' }      → appoint dean of a faculty
 *   { position: 'ASSOCIATE_DEAN', positionFacultyId }   → appoint associate dean
 *   { position: 'DEPARTMENT_HEAD', positionDepartmentId } → appoint dept head
 *
 * Sets `appointedAt = now` on a fresh appointment; preserves it on a re-save
 * unless the position changed.
 */
const assignPositionSchema = z.discriminatedUnion('position', [
  z.object({ position: z.literal('DEAN'), positionFacultyId: z.string().cuid() }),
  z.object({ position: z.literal('ASSOCIATE_DEAN'), positionFacultyId: z.string().cuid() }),
  z.object({ position: z.literal('DEPARTMENT_HEAD'), positionDepartmentId: z.string().cuid() }),
  z.object({ position: z.null() }),
]);

router.post(
  '/admin/teachers/:id/position',
  requireCapability('ROLES_ASSIGN'),
  validate(assignPositionSchema),
  async (req, res, next) => {
    try {
      const body = req.body as z.infer<typeof assignPositionSchema>;
      const targetId = req.params.id!;

      const existing = await prisma.teacherProfile.findUnique({
        where: { userId: targetId },
        select: { position: true, appointedAt: true },
      });
      if (!existing) throw AppError.notFound('Teacher profile not found');

      // A leadership seat is exclusive: refuse to appoint a second active
      // DEAN/ASSOCIATE_DEAN for the same faculty, or a second DEPARTMENT_HEAD
      // for the same department (409 instead of silently shadowing).
      // The check + write run in one transaction to shrink the race window.
      const conflictWhere =
        body.position === 'DEAN' || body.position === 'ASSOCIATE_DEAN'
          ? { position: body.position, positionFacultyId: body.positionFacultyId, userId: { not: targetId } }
          : body.position === 'DEPARTMENT_HEAD'
            ? { position: body.position, positionDepartmentId: body.positionDepartmentId, userId: { not: targetId } }
            : null;

      const isFresh = body.position !== existing.position;
      const data: Record<string, unknown> =
        body.position === null
          ? { position: null, positionFacultyId: null, positionDepartmentId: null, appointedAt: null }
          : body.position === 'DEPARTMENT_HEAD'
            ? {
                position: body.position,
                positionDepartmentId: body.positionDepartmentId,
                positionFacultyId: null,
                appointedAt: isFresh ? new Date() : existing.appointedAt,
              }
            : {
                position: body.position,
                positionFacultyId: body.positionFacultyId,
                positionDepartmentId: null,
                appointedAt: isFresh ? new Date() : existing.appointedAt,
              };

      const updated = await prisma.$transaction(async (tx) => {
        if (conflictWhere) {
          const conflict = await tx.teacherProfile.findFirst({
            where: conflictWhere,
            select: { userId: true },
          });
          if (conflict) {
            throw AppError.conflict('This position is already held by another teacher');
          }
        }
        const r = await tx.teacherProfile.update({
          where: { userId: targetId },
          data,
          select: {
            userId: true,
            position: true,
            positionFacultyId: true,
            positionDepartmentId: true,
            appointedAt: true,
          },
        });
        // Audit trail — leadership appointments are governance-sensitive
        // (DEAN / ASSOCIATE_DEAN / DEPARTMENT_HEAD confer faculty-wide
        // authority). Previously these mutations were invisible to governance.
        await tx.auditLog.create({
          data: {
            action: 'TEACHER_POSITION',
            resourceType: 'TeacherProfile',
            resourceId: targetId,
            userId: req.user!.id,
            metadata: {
              oldPosition: existing.position,
              newPosition: body.position,
              positionFacultyId: body.position === 'DEAN' || body.position === 'ASSOCIATE_DEAN' ? body.positionFacultyId : null,
              positionDepartmentId: body.position === 'DEPARTMENT_HEAD' ? body.positionDepartmentId : null,
            },
          },
        });
        return r;
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

/**
 * Set the governance scope of an ADMIN or QUALITY user.
 *
 * Body: { scopeFacultyId: string | null }
 *   null → university-wide (default)
 *   set  → scoped to a single faculty
 *
 * Restricted to users with ROLES_ASSIGN. Refuses if the target isn't
 * ADMIN/QUALITY (other roles use scope differently or not at all).
 */
const assignScopeSchema = z.object({
  scopeFacultyId: z.string().cuid().nullable(),
}).strict();

router.post(
  '/admin/users/:id/scope',
  requireCapability('ROLES_ASSIGN'),
  validate(assignScopeSchema),
  async (req, res, next) => {
    try {
      const target = await prisma.user.findUnique({
        where: { id: req.params.id! },
        select: { id: true, role: true, scopeFacultyId: true },
      });
      if (!target) throw AppError.notFound('User not found');
      if (target.role !== 'ADMIN' && target.role !== 'QUALITY') {
        throw new AppError('BAD_REQUEST', 'Scope only applies to ADMIN/QUALITY users', 400);
      }
      // Wrap update + audit in a transaction — scope changes are
      // governance-sensitive (university-wide ↔ faculty-scoped) and
      // must be auditable.
      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.user.update({
          where: { id: target.id },
          data: { scopeFacultyId: req.body.scopeFacultyId },
          select: { id: true, scopeFacultyId: true },
        });
        await tx.auditLog.create({
          data: {
            action: 'USER_SCOPE_CHANGE',
            resourceType: 'User',
            resourceId: target.id,
            userId: req.user!.id,
            metadata: {
              oldScopeFacultyId: target.scopeFacultyId,
              newScopeFacultyId: req.body.scopeFacultyId,
              targetRole: target.role,
            },
          },
        });
        return r;
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

export default router;
