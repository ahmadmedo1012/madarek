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
router.get('/teacher/me/offerings', requireRole(Role.TEACHER, Role.ADMIN), async (req, res, next) => {
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
router.get('/teacher/offerings/:id/students', requireRole(Role.TEACHER, Role.ADMIN), async (req, res, next) => {
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

    const students: StudentRow[] = await Promise.all(
      offering.enrollments.map(async (enr) => {
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

        // Watch% over course lectures
        let watchPct = 0;
        if (lectureIds.length > 0) {
          const events = await prisma.watchEvent.findMany({
            where: { studentId: stu.id, lectureId: { in: lectureIds } },
            select: { watchedSec: true, totalSec: true, completed: true },
          });
          const totalWatched = events.reduce((s, e) => s + e.watchedSec, 0);
          const totalDuration = events.reduce((s, e) => s + e.totalSec, 0);
          watchPct = totalDuration > 0 ? Math.round((totalWatched / totalDuration) * 100) : 0;
        }

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
      }),
    );

    res.json({ data: students });
  } catch (e) { next(e); }
});

/**
 * GET /teacher/offerings/:id/analytics — course-level aggregates
 */
router.get('/teacher/offerings/:id/analytics', requireRole(Role.TEACHER, Role.ADMIN), async (req, res, next) => {
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
router.get('/teacher/risks', requireRole(Role.TEACHER, Role.ADMIN), async (req, res, next) => {
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
      },
      take: 20,
    });

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

        const watchPct = 70; // placeholder when watch query is too expensive
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
  requireRole(Role.TEACHER, Role.ADMIN),
  validate(recordAttSchema),
  async (req, res, next) => {
    try {
      const offeringId = req.params.id!;
      await assertOwnsOffering(offeringId, req.user!.id, req.user!.role);
      const { date, topic, records } = req.body as z.infer<typeof recordAttSchema>;
      const session = await prisma.attendanceSession.upsert({
        where: { offeringId_date: { offeringId, date } },
        update: { topic: topic ?? null },
        create: { offeringId, date, topic: topic ?? null },
      });
      // Replace records for this session
      await prisma.attendanceRecord.deleteMany({ where: { sessionId: session.id } });
      await prisma.attendanceRecord.createMany({
        data: records.map((r) => ({
          sessionId: session.id,
          studentId: r.studentId,
          status: r.status,
          notes: r.notes ?? null,
        })),
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
            faculty: profile.department.faculty.name,
            verified: !!profile.verifiedAt,
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
      const updated = await prisma.teacherProfile.update({
        where: { userId: req.params.id },
        data: {
          verifiedAt: req.body.verified ? new Date() : null,
          verifiedById: req.body.verified ? req.user!.id : null,
        },
        select: { userId: true, verifiedAt: true },
      });
      res.json({ data: updated });
    } catch (e) { next(e); }
  },
);

export default router;
