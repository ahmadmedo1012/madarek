/**
 * Seed script — populates the database with the same demo data
 * the original HTML prototype hard-coded in JavaScript.
 *
 * Run:  npm run db:seed
 *
 * Demo accounts (password = "1234" for all):
 *   student@zu.edu.ly  → STUDENT (أحمد الزروق)
 *   teacher@zu.edu.ly  → TEACHER (د. سالم البوسيفي)
 *   admin@zu.edu.ly    → ADMIN   (إدارة الجامعة)
 *   quality@zu.edu.ly  → QUALITY (ضمان الجودة)
 */

import {
  AcademicRank,
  AssignmentType,
  ArExperienceType,
  AttendanceStatus,
  GradeKind,
  JobType,
  MaterialType,
  PrismaClient,
  Role,
  NotificationType,
} from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ─── Faculties & Departments ─────────────────────────────────
  // Source-of-truth: the official Zawia University site (zu.edu.ly), as
  // captured in `zu.edu.ly.md` at the repo root. The institution lists 25
  // distinct faculty/city pairs — same name can repeat across cities
  // (Economics in الزاوية AND العجيلات are two separate institutions),
  // which is why uniqueness is on (name, city), not name alone.
  //
  // Order of the first 4 entries (IT, Engineering, Sciences, Medicine) is
  // load-bearing — index references later in this file assume it.

  // One-time rename: legacy "كلية الطب" row → source-correct name.
  await prisma.faculty.updateMany({
    where: { name: 'كلية الطب' },
    data: { name: 'كلية الطب البشري', nameEn: 'Human Medicine', iconEmoji: '⚕️' },
  });

  const faculties = await Promise.all(
    [
      // ── الزاوية (main campus, 13 faculties) ──────────────────
      { name: 'كلية تقنية المعلومات', nameEn: 'Information Technology', iconEmoji: '💻', city: 'الزاوية' },
      { name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: '⚙️', city: 'الزاوية' },
      { name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: '🔬', city: 'الزاوية' },
      { name: 'كلية الطب البشري', nameEn: 'Human Medicine', iconEmoji: '⚕️', city: 'الزاوية' },
      { name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: '📚', city: 'الزاوية' },
      { name: 'كلية الاقتصاد', nameEn: 'Economics', iconEmoji: '💼', city: 'الزاوية' },
      { name: 'كلية التربية', nameEn: 'Education', iconEmoji: '🎓', city: 'الزاوية' },
      { name: 'كلية القانون', nameEn: 'Law', iconEmoji: '⚖️', city: 'الزاوية' },
      { name: 'كلية الصيدلة', nameEn: 'Pharmacy', iconEmoji: '💊', city: 'الزاوية' },
      { name: 'كلية طب وجراحة الفم والأسنان', nameEn: 'Dentistry & Oral Surgery', iconEmoji: '🦷', city: 'الزاوية' },
      { name: 'كلية التقنية الطبية', nameEn: 'Medical Technology', iconEmoji: '🩺', city: 'الزاوية' },
      { name: 'كلية الرياضة والتربية البدنية', nameEn: 'Physical Education & Sports', iconEmoji: '⚽', city: 'الزاوية' },
      { name: 'كلية التمريض', nameEn: 'Nursing', iconEmoji: '👩‍⚕️', city: 'الزاوية' },
      // ── العجيلات (8 faculties) ────────────────────────────────
      { name: 'كلية الاقتصاد', nameEn: 'Economics', iconEmoji: '💼', city: 'العجيلات' },
      { name: 'كلية البيطرة والعلوم الزراعية', nameEn: 'Veterinary & Agricultural Sciences', iconEmoji: '🌾', city: 'العجيلات' },
      { name: 'كلية التربية', nameEn: 'Education', iconEmoji: '🎓', city: 'العجيلات' },
      { name: 'كلية الشريعة والقانون', nameEn: 'Sharia & Law', iconEmoji: '⚖️', city: 'العجيلات' },
      { name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: '🔬', city: 'العجيلات' },
      { name: 'كلية الصحة العامة', nameEn: 'Public Health', iconEmoji: '🏥', city: 'العجيلات' },
      { name: 'كلية هندسة الموارد الطبيعية', nameEn: 'Natural Resources Engineering', iconEmoji: '⛰️', city: 'العجيلات' },
      { name: 'كلية هندسة النفط والغاز', nameEn: 'Oil & Gas Engineering', iconEmoji: '⛽', city: 'العجيلات' },
      // ── زوارة ────────────────────────────────────────────────
      { name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: '📚', city: 'زوارة' },
      // ── مناطق أخرى ───────────────────────────────────────────
      { name: 'كلية التربية', nameEn: 'Education', iconEmoji: '🎓', city: 'أبو عيسى' },
      { name: 'كلية التربية', nameEn: 'Education', iconEmoji: '🎓', city: 'ناصر' },
      { name: 'كلية الموارد الطبيعية', nameEn: 'Natural Resources', iconEmoji: '⛰️', city: 'مناطق أخرى' },
    ].map((f) => prisma.faculty.upsert({
      where: { name_city: { name: f.name, city: f.city } },
      create: f,
      update: { nameEn: f.nameEn, iconEmoji: f.iconEmoji },
    })),
  );

  const itFaculty = faculties[0]!;
  const csDept = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: itFaculty.id, name: 'علوم الحاسوب' } },
    create: { name: 'علوم الحاسوب', nameEn: 'Computer Science', facultyId: itFaculty.id },
    update: {},
  });
  const isDept = await prisma.department.upsert({
    where: { facultyId_name: { facultyId: itFaculty.id, name: 'نظم المعلومات' } },
    create: { name: 'نظم المعلومات', nameEn: 'Information Systems', facultyId: itFaculty.id },
    update: {},
  });

  // Engineering — common departments.
  const engFaculty = faculties[1]!;
  await prisma.department.upsert({
    where: { facultyId_name: { facultyId: engFaculty.id, name: 'الهندسة المدنية' } },
    create: { name: 'الهندسة المدنية', nameEn: 'Civil Engineering', facultyId: engFaculty.id },
    update: {},
  });
  await prisma.department.upsert({
    where: { facultyId_name: { facultyId: engFaculty.id, name: 'الهندسة الكهربائية' } },
    create: { name: 'الهندسة الكهربائية', nameEn: 'Electrical Engineering', facultyId: engFaculty.id },
    update: {},
  });

  // Sciences — full department list per the official Zawia source
  // (botany, zoology, chemistry, mathematics, geology, physics,
  //  statistics, computer science). Established 1988.
  const sciFaculty = faculties[2]!;
  for (const dept of [
    { name: 'قسم النبات', nameEn: 'Botany' },
    { name: 'قسم الحيوان', nameEn: 'Zoology' },
    { name: 'قسم الكيمياء', nameEn: 'Chemistry' },
    { name: 'قسم الرياضيات', nameEn: 'Mathematics' },
    { name: 'قسم الجيولوجيا', nameEn: 'Geology' },
    { name: 'قسم الفيزياء', nameEn: 'Physics' },
    { name: 'قسم الإحصاء', nameEn: 'Statistics' },
    { name: 'قسم علم الحاسوب', nameEn: 'Computer Science' },
  ]) {
    await prisma.department.upsert({
      where: { facultyId_name: { facultyId: sciFaculty.id, name: dept.name } },
      create: { name: dept.name, nameEn: dept.nameEn, facultyId: sciFaculty.id },
      update: {},
    });
  }

  const medFaculty = faculties[3]!;
  await prisma.department.upsert({
    where: { facultyId_name: { facultyId: medFaculty.id, name: 'الطب البشري' } },
    create: { name: 'الطب البشري', nameEn: 'Human Medicine', facultyId: medFaculty.id },
    update: {},
  });

  // ─── Demo users ──────────────────────────────────────────────
  const password = await hashPassword('1234');

  const student = await prisma.user.upsert({
    where: { email: 'student@zu.edu.ly' },
    update: {},
    create: {
      email: 'student@zu.edu.ly',
      passwordHash: password,
      role: Role.STUDENT,
      firstName: 'أحمد',
      lastName: 'الزروق',
      avatarInitials: 'أح',
      avatarColor: '#4F8EF7',
      emailVerifiedAt: new Date(),
      studentProfile: {
        create: {
          universityId: 'UZ-2024-00001',
          facultyId: itFaculty.id,
          departmentId: csDept.id,
          year: 3,
          gpa: 3.4,
          totalXp: 2340,
          level: 7,
        },
      },
    },
  });

  const teacher = await prisma.user.upsert({
    where: { email: 'teacher@zu.edu.ly' },
    update: {},
    create: {
      email: 'teacher@zu.edu.ly',
      passwordHash: password,
      role: Role.TEACHER,
      firstName: 'سالم',
      lastName: 'البوسيفي',
      avatarInitials: 'سب',
      avatarColor: '#3DD68C',
      emailVerifiedAt: new Date(),
      teacherProfile: {
        create: {
          specialty: 'علوم الحاسوب والذكاء الاصطناعي',
          rank: AcademicRank.ASSOCIATE_PROFESSOR,
          departmentId: csDept.id,
        },
      },
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zu.edu.ly' },
    update: {},
    create: {
      email: 'admin@zu.edu.ly',
      passwordHash: password,
      role: Role.ADMIN,
      firstName: 'إدارة',
      lastName: 'الجامعة',
      avatarInitials: 'إد',
      avatarColor: '#9B6FE8',
      emailVerifiedAt: new Date(),
    },
  });

  const quality = await prisma.user.upsert({
    where: { email: 'quality@zu.edu.ly' },
    update: {},
    create: {
      email: 'quality@zu.edu.ly',
      passwordHash: password,
      role: Role.QUALITY,
      firstName: 'ضمان',
      lastName: 'الجودة',
      avatarInitials: 'جو',
      avatarColor: '#D4A537',
      emailVerifiedAt: new Date(),
    },
  });

  // ─── Courses (mirrors the prototype's `courses` array) ───────
  const courseDefs = [
    { code: 'SE301', name: 'هندسة البرمجيات', icon: '⚙️', color: '#4F8EF7' },
    { code: 'CT301', name: 'تقنيات الحاسوب', icon: '💻', color: '#3DD68C' },
    { code: 'IS301', name: 'نظم المعلومات', icon: '🖥️', color: '#F5A623' },
    { code: 'NET301', name: 'شبكات الحاسوب', icon: '🌐', color: '#9B6FE8' },
    { code: 'WEB301', name: 'تقنيات الإنترنت', icon: '🔗', color: '#2EC4B6' },
    { code: 'SEC301', name: 'أمن المعلومات', icon: '🔐', color: '#F06292' },
  ];

  const courses = [];
  for (const c of courseDefs) {
    const created = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        credits: 3,
        iconEmoji: c.icon,
        themeColor: c.color,
        departmentId: csDept.id,
      },
    });
    courses.push(created);
  }

  // ─── Offerings + enrollment for the demo student ─────────────
  const term = '2024-FALL';
  for (const course of courses) {
    const offering = await prisma.courseOffering.upsert({
      where: { courseId_term_teacherId: { courseId: course.id, term, teacherId: teacher.id } },
      update: {},
      create: {
        courseId: course.id,
        teacherId: teacher.id,
        term,
        room: 'قاعة 301',
        capacity: 40,
      },
    });
    await prisma.enrollment.upsert({
      where: { studentId_offeringId: { studentId: student.id, offeringId: offering.id } },
      update: {},
      create: { studentId: student.id, offeringId: offering.id, progressPct: 60 },
    });

    // Schedule slot example
    await prisma.scheduleSlot.create({
      data: {
        offeringId: offering.id,
        dayOfWeek: 0,
        startTime: '08:00',
        endTime: '09:30',
        room: 'قاعة 301',
      },
    });
  }

  // ─── A few assignments + grades ─────────────────────────────
  const seFirst = await prisma.courseOffering.findFirstOrThrow({
    where: { courseId: courses[0]!.id, term },
  });
  await prisma.assignment.create({
    data: {
      offeringId: seFirst.id,
      title: 'مشروع UML للتصميم',
      type: AssignmentType.PROJECT,
      dueAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      weight: 30,
      maxScore: 100,
    },
  });
  await prisma.grade.upsert({
    where: { offeringId_studentId_kind: { offeringId: seFirst.id, studentId: student.id, kind: GradeKind.QUIZ_1 } },
    update: { score: 88 },
    create: { offeringId: seFirst.id, studentId: student.id, kind: GradeKind.QUIZ_1, score: 88 },
  });

  // ─── Attendance demo ────────────────────────────────────────
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const session = await prisma.attendanceSession.upsert({
    where: { offeringId_date: { offeringId: seFirst.id, date: today } },
    update: {},
    create: { offeringId: seFirst.id, date: today, topic: 'مقدمة في UML' },
  });
  await prisma.attendanceRecord.upsert({
    where: { sessionId_studentId: { sessionId: session.id, studentId: student.id } },
    update: {},
    create: { sessionId: session.id, studentId: student.id, status: AttendanceStatus.PRESENT },
  });

  // ─── Materials demo ─────────────────────────────────────────
  await prisma.material.createMany({
    data: [
      {
        offeringId: seFirst.id,
        uploaderId: teacher.id,
        name: 'محاضرة_UML_الوحدة1.pdf',
        type: MaterialType.PDF,
        sizeBytes: BigInt(3_355_443),
        url: 'https://example.invalid/UML1.pdf',
        description: 'مخططات UML والكلاسات',
      },
      {
        offeringId: seFirst.id,
        uploaderId: teacher.id,
        name: 'شرائح_DesignPatterns.pptx',
        type: MaterialType.PPT,
        sizeBytes: BigInt(13_002_752),
        url: 'https://example.invalid/dp.pptx',
      },
    ],
  });

  // ─── Library books ──────────────────────────────────────────
  const books = [
    { title: 'Clean Code', author: 'R. Martin', category: 'prog', iconEmoji: '💻', themeColor: '#4F8EF7', rating: 4.8 },
    { title: 'Computer Networks', author: 'Tanenbaum', category: 'net', iconEmoji: '🌐', themeColor: '#2EC4B6', rating: 4.9 },
    { title: 'Deep Learning', author: 'Goodfellow', category: 'ai', iconEmoji: '🤖', themeColor: '#9B6FE8', rating: 4.7 },
    { title: 'Database Design', author: 'Elmasri', category: 'db', iconEmoji: '🗄️', themeColor: '#3DD68C', rating: 4.6 },
    { title: 'Cybersecurity Essentials', author: 'Cisco', category: 'sec', iconEmoji: '🔐', themeColor: '#F06292', rating: 4.5 },
    { title: 'Python Crash Course', author: 'Matthes', category: 'prog', iconEmoji: '🐍', themeColor: '#F5A623', rating: 4.9 },
    { title: 'Introduction to Algorithms', author: 'Cormen', category: 'prog', iconEmoji: '⚙️', themeColor: '#4F8EF7', rating: 4.8 },
    { title: 'Artificial Intelligence', author: 'Russell & Norvig', category: 'ai', iconEmoji: '🧠', themeColor: '#9B6FE8', rating: 4.7 },
  ];
  for (const b of books) {
    await prisma.book.create({ data: { ...b, totalCopies: 3, availableCopies: 2 } });
  }

  // ─── MOOCs ──────────────────────────────────────────────────
  const moocs = [
    { title: 'Python للبيانات والذكاء الاصطناعي', organization: 'منصة مدارك', iconEmoji: '🐍', category: 'prog', durationHours: 40, level: 'متوسط', rating: 4.8, enrolled: 1240 },
    { title: 'تصميم قواعد البيانات المتقدمة', organization: 'منصة مدارك', iconEmoji: '🗄️', category: 'data', durationHours: 25, level: 'متقدم', rating: 4.6, enrolled: 840 },
    { title: 'تسويق رقمي شامل', organization: 'شراكة Coursera', iconEmoji: '📱', category: 'business', durationHours: 30, level: 'مبتدئ', rating: 4.7, enrolled: 2100 },
    { title: 'تصميم UI/UX من الصفر', organization: 'شراكة Udemy', iconEmoji: '🎨', category: 'design', durationHours: 35, level: 'مبتدئ', rating: 4.9, enrolled: 3400 },
  ];
  for (const m of moocs) await prisma.moocCourse.create({ data: m });

  // ─── Jobs ───────────────────────────────────────────────────
  const jobs = [
    { title: 'مطور ويب Full Stack', company: 'شركة تقنية الزاوية', location: 'الزاوية · حضوري', type: JobType.FULL_TIME, salary: '2,500 ل.د', category: 'tech', iconEmoji: '💻' },
    { title: 'محلل بيانات Data Analyst', company: 'البنك التجاري الليبي', location: 'طرابلس · هجين', type: JobType.FULL_TIME, salary: '3,200 ل.د', category: 'tech', iconEmoji: '📊' },
    { title: 'تدريب صيفي — برمجة Python', company: 'ليبيا تك هاب', location: 'مصراتة · عن بُعد', type: JobType.INTERNSHIP, salary: 'مدفوع', category: 'intern', iconEmoji: '🐍' },
    { title: 'مصمم UI/UX', company: 'وكالة إبداع رقمي', location: 'عن بُعد', type: JobType.FREELANCE, salary: 'بالمشروع', category: 'remote', iconEmoji: '🎨' },
  ];
  for (const j of jobs) await prisma.job.create({ data: j });

  // ─── Achievements ───────────────────────────────────────────
  const achievements = [
    { code: 'TOP_PERF', name: 'قمة الأداء', description: 'حصلت على 90+ في 3 اختبارات متتالية', icon: '🏆', xp: 200 },
    { code: 'STREAK', name: 'انتظام نشط', description: 'حضرت جميع المحاضرات لمدة شهر', icon: '🔥', xp: 150 },
    { code: 'READER', name: 'قارئ نشط', description: 'أكملت 10 كتب في المكتبة الإلكترونية', icon: '📚', xp: 120 },
    { code: 'CONTRIBUTOR', name: 'مساهم مميز', description: 'أجبت على 50 سؤال في المنتدى', icon: '💬', xp: 100 },
  ];
  for (const a of achievements) {
    const ach = await prisma.achievement.upsert({ where: { code: a.code }, update: {}, create: a });
    await prisma.userAchievement.upsert({
      where: { userId_achievementId: { userId: student.id, achievementId: ach.id } },
      update: {},
      create: { userId: student.id, achievementId: ach.id },
    });
  }

  // ─── Skills ─────────────────────────────────────────────────
  const skills = [
    { name: 'البرمجة بـ Python', category: 'prog', icon: '🐍', level: 3 },
    { name: 'تصميم قواعد البيانات', category: 'db', icon: '🗄️', level: 4 },
    { name: 'أمن الشبكات', category: 'sec', icon: '🛡️', level: 2 },
    { name: 'التسويق الرقمي', category: 'business', icon: '📱', level: 1 },
    { name: 'اللغة الإنجليزية التقنية', category: 'lang', icon: '🌍', level: 3 },
    { name: 'إدارة المشاريع', category: 'business', icon: '📋', level: 2 },
  ];
  for (const s of skills) {
    const sk = await prisma.skill.upsert({
      where: { name: s.name },
      update: {},
      create: { name: s.name, category: s.category, icon: s.icon },
    });
    await prisma.userSkill.upsert({
      where: { userId_skillId: { userId: student.id, skillId: sk.id } },
      update: { level: s.level },
      create: { userId: student.id, skillId: sk.id, level: s.level, progressPct: s.level * 20 },
    });
  }

  // ─── Notifications ──────────────────────────────────────────
  // Realistic mix of notification types with proper time spread.
  const D = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);
  await prisma.notification.createMany({
    data: [
      // Most recent — unread
      { userId: student.id, type: NotificationType.URGENT, icon: '⚠️', title: 'موعد تسليم بحث هندسة البرمجيات', body: 'يجب رفع البحث قبل نهاية يوم الخميس', createdAt: D(0, 1) },
      { userId: student.id, type: NotificationType.ACADEMIC, icon: '🎓', title: 'تم نشر بحثك في مكتبة الجامعة', body: '«تطبيق أنماط التصميم في مشاريع الويب الحديثة» متاح الآن للزملاء', createdAt: D(0, 4) },
      { userId: student.id, type: NotificationType.ACADEMIC, icon: '📊', title: 'فجوة معرفية جديدة', body: 'تم رصد ضعف في مفهوم «التعقيد الزمني» — اطّلع على الفيديو المقترح', createdAt: D(0, 7) },
      { userId: student.id, type: NotificationType.SOCIAL, icon: '💬', title: 'رد جديد من د. سالم البوسيفي', body: 'علّق على سؤالك في حلقة النقاش', createdAt: D(1) },
      // Older — some read
      { userId: student.id, type: NotificationType.ACADEMIC, icon: '📅', title: 'محاضرة شبكات الحاسوب', body: 'الأحد 8:00 صباحاً — قاعة A-301', createdAt: D(1, 5), readAt: D(1, 4) },
      { userId: student.id, type: NotificationType.SYSTEM, icon: '✨', title: 'ميزة جديدة: تحليل الامتحانات', body: 'يمكنك الآن مراجعة كل امتحان أديتَه ومعرفة فجواتك المعرفية', createdAt: D(2), readAt: D(2) },
      { userId: student.id, type: NotificationType.ACADEMIC, icon: '🎤', title: 'ندوة دولية: مستقبل AI في التعليم', body: 'انضم إلى الندوة يوم 12 يونيو مع متحدثين من Stanford', createdAt: D(3), readAt: D(3) },
      { userId: student.id, type: NotificationType.URGENT, icon: '⏰', title: 'تذكير — اختبار قواعد البيانات', body: 'بعد 5 أيام · القاعة الرئيسية', createdAt: D(4), readAt: D(4) },
      { userId: student.id, type: NotificationType.ACADEMIC, icon: '🏆', title: 'حصلت على شارة جديدة', body: '«مساهم نشط» — أكملتَ 5 محاضرات هذا الأسبوع', createdAt: D(5), readAt: D(5) },
      { userId: student.id, type: NotificationType.SYSTEM, icon: '📚', title: 'تم تحديث المكتبة الإلكترونية', body: 'أضيف 4 بحوث جديدة في تخصصك', createdAt: D(7), readAt: D(7) },
    ],
  });

  // ─── Posts (community) ──────────────────────────────────────
  await prisma.post.createMany({
    data: [
      { authorId: student.id, body: 'هل أحد لديه ملخص لمحاضرة الذكاء الاصطناعي اليوم؟', hashtags: ['ذكاء_اصطناعي'] },
      { authorId: teacher.id, body: 'تم نشر شرائح المحاضرة الجديدة في المواد', hashtags: ['هندسة_البرمجيات'] },
    ],
  });

  // ─── Virtual labs + AR ─────────────────────────────────────
  await prisma.virtualLab.createMany({
    data: [
      { name: 'معمل الشبكات الافتراضي', platform: 'Cisco Packet Tracer', category: 'net', iconEmoji: '💻', totalExperiments: 18, themeColor: '#4F8EF7' },
      { name: 'معمل الكيمياء الرقمي', platform: 'ChemSim', category: 'chem', iconEmoji: '⚗️', totalExperiments: 24, themeColor: '#3DD68C' },
      { name: 'معمل الدوائر الكهربائية', platform: 'Tinkercad', category: 'eng', iconEmoji: '⚡', totalExperiments: 15, themeColor: '#F5A623' },
    ],
  });

  await prisma.arExperience.createMany({
    data: [
      { title: 'تشريح الجسم البشري', subject: 'بيولوجيا', type: ArExperienceType.AR, iconEmoji: '🧬', themeColor: '#9B6FE8' },
      { title: 'دوائر كهربائية حية', subject: 'هندسة كهربائية', type: ArExperienceType.AR, iconEmoji: '⚡', themeColor: '#F5A623' },
      { title: 'جولة في الفضاء الافتراضي', subject: 'فلك وفيزياء', type: ArExperienceType.VR, iconEmoji: '🌍', themeColor: '#2EC4B6' },
    ],
  });

  // ════════════════════════════════════════════════════════════
  //  Flipped Classroom: lectures + chapters + checkpoints
  //  + Educational Matrix: concepts + per-student mastery
  //  Built on the Software Engineering offering.
  // ════════════════════════════════════════════════════════════
  const seCourse = courses.find((c) => c.code === 'SE301')!;
  const seOffering = await prisma.courseOffering.findFirstOrThrow({
    where: { courseId: seCourse.id, term },
  });

  // Knowledge concept tree for Software Engineering
  const conceptDefs: Array<{ name: string; ordinal: number }> = [
    { name: 'مقدمة في هندسة البرمجيات', ordinal: 1 },
    { name: 'دورة حياة تطوير البرمجيات', ordinal: 2 },
    { name: 'تحليل المتطلبات', ordinal: 3 },
    { name: 'مخططات UML — Use Case', ordinal: 4 },
    { name: 'مخططات UML — Class Diagram', ordinal: 5 },
    { name: 'نماذج التصميم', ordinal: 6 },
    { name: 'اختبار البرمجيات', ordinal: 7 },
    { name: 'الصيانة والتطوير', ordinal: 8 },
  ];

  const concepts = [];
  for (const c of conceptDefs) {
    const created = await prisma.knowledgeConcept.create({
      data: { courseId: seCourse.id, name: c.name, ordinal: c.ordinal },
    });
    concepts.push(created);
  }

  // 3 lectures with chapters and embedded checkpoints
  const lectureDefs = [
    {
      title: 'مقدمة هندسة البرمجيات',
      description: 'تعريف الهندسة، أهميتها، ودورة حياة المشروع البرمجي.',
      ordinal: 1,
      durationSec: 600,
      chapters: [
        { title: 'ما هي هندسة البرمجيات؟', startSec: 0, endSec: 180, conceptIdx: 0 },
        { title: 'دورة حياة تطوير البرمجيات', startSec: 180, endSec: 420, conceptIdx: 1 },
        { title: 'النماذج: Waterfall, Agile', startSec: 420, endSec: 600, conceptIdx: 1 },
      ],
      checkpoints: [
        {
          triggerSec: 200,
          conceptIdx: 1,
          question: 'أي نموذج من نماذج التطوير يُعتمد على التكرار والاستجابة السريعة للتغيير؟',
          options: ['Waterfall', 'V-Model', 'Agile', 'Spiral'],
          correctIndex: 2,
          explanation: 'نموذج Agile يعتمد على دورات قصيرة (Sprints) وتعاون مستمر مع العميل.',
        },
      ],
    },
    {
      title: 'تحليل المتطلبات ومخططات UML',
      description: 'كيف نلتقط متطلبات المستخدم ونمثلها بمخططات Use Case و Class Diagram.',
      ordinal: 2,
      durationSec: 720,
      chapters: [
        { title: 'تحليل المتطلبات', startSec: 0, endSec: 240, conceptIdx: 2 },
        { title: 'مخططات Use Case', startSec: 240, endSec: 480, conceptIdx: 3 },
        { title: 'مخططات Class Diagram', startSec: 480, endSec: 720, conceptIdx: 4 },
      ],
      checkpoints: [
        {
          triggerSec: 280,
          conceptIdx: 3,
          question: 'في مخطط Use Case، ماذا يمثّل العنصر الذي يبدو كرجل تخطيطي (Stick figure)؟',
          options: ['وظيفة (Use Case)', 'علاقة Include', 'فاعل (Actor)', 'حدّ النظام'],
          correctIndex: 2,
          explanation: 'الفاعل (Actor) يمثّل أي مستخدم أو نظام يتفاعل مع النظام الذي ندرسه.',
        },
        {
          triggerSec: 560,
          conceptIdx: 4,
          question: 'ما الذي يمثّله السهم ذو الرأس المثلث المُفرَّغ في Class Diagram؟',
          options: ['Aggregation', 'Composition', 'Inheritance', 'Dependency'],
          correctIndex: 2,
          explanation: 'السهم ذو الرأس المثلث المفرَّغ يدلّ على علاقة وراثة (Inheritance / Generalization).',
        },
      ],
    },
    {
      title: 'نماذج التصميم وأفضل الممارسات',
      description: 'تطبيق نماذج التصميم Singleton, Factory, Observer لحل مشاكل برمجية شائعة.',
      ordinal: 3,
      durationSec: 540,
      chapters: [
        { title: 'لماذا نماذج التصميم؟', startSec: 0, endSec: 120, conceptIdx: 5 },
        { title: 'Singleton و Factory', startSec: 120, endSec: 360, conceptIdx: 5 },
        { title: 'Observer ومبادئ SOLID', startSec: 360, endSec: 540, conceptIdx: 5 },
      ],
      checkpoints: [
        {
          triggerSec: 250,
          conceptIdx: 5,
          question: 'ما الهدف الأساسي من نموذج Singleton؟',
          options: [
            'إنشاء أكثر من نسخة من الصنف',
            'ضمان وجود نسخة وحيدة فقط من الصنف',
            'فصل واجهة الصنف عن تنفيذه',
            'تعيين سلوك ديناميكي للأصناف',
          ],
          correctIndex: 1,
          explanation: 'Singleton يضمن وجود نسخة وحيدة من الصنف في كامل التطبيق ويوفّر نقطة وصول عالمية إليها.',
        },
      ],
    },
  ];

  for (const def of lectureDefs) {
    const lec = await prisma.lecture.create({
      data: {
        offeringId: seOffering.id,
        title: def.title,
        description: def.description,
        ordinal: def.ordinal,
        durationSec: def.durationSec,
        videoUrl: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
        posterUrl: '/brand/madarek-mark.svg',
      },
    });
    let chOrd = 0;
    for (const ch of def.chapters) {
      await prisma.lectureChapter.create({
        data: {
          lectureId: lec.id,
          title: ch.title,
          startSec: ch.startSec,
          endSec: ch.endSec,
          ordinal: chOrd++,
          conceptId: concepts[ch.conceptIdx]?.id,
        },
      });
    }
    for (const cp of def.checkpoints) {
      await prisma.lectureCheckpoint.create({
        data: {
          lectureId: lec.id,
          triggerSec: cp.triggerSec,
          conceptId: concepts[cp.conceptIdx]?.id,
          question: cp.question,
          options: cp.options,
          correctIndex: cp.correctIndex,
          explanation: cp.explanation,
        },
      });
    }
  }

  // Per-student mastery — simulated, plausible distribution.
  // Strong on basics, weaker on UML and design patterns.
  const masteryDistribution = [0.85, 0.80, 0.65, 0.45, 0.40, 0.35, 0.55, 0.70];
  for (let i = 0; i < concepts.length; i++) {
    const concept = concepts[i]!;
    const level = masteryDistribution[i] ?? 0.5;
    await prisma.studentMastery.upsert({
      where: { studentId_conceptId: { studentId: student.id, conceptId: concept.id } },
      update: { level },
      create: {
        studentId: student.id,
        conceptId: concept.id,
        level,
        attempts: 8 + i,
        correct: Math.round((8 + i) * level),
      },
    });
  }

  // ─── Sample research papers across statuses ────────────────
  await prisma.researchPaper.create({
    data: {
      studentId: student.id,
      reviewerId: teacher.id,
      offeringId: seOffering.id,
      title: 'تطبيق أنماط التصميم في مشاريع الويب الحديثة',
      abstract:
        'يستعرض هذا البحث استخدام أنماط التصميم Singleton، Factory، و Observer في تطبيقات الويب التفاعلية المبنية بـ React.js، مع دراسة حالة على تطبيقات الجامعات الذكية.',
      status: 'GRADED',
      plagiarismPct: 8.2,
      aiContentPct: 12.5,
      grade: 17,
      feedback: 'بحث جيد التنظيم. يُنصح بتعميق دراسة الحالة بمزيد من البيانات الكمية.',
      uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      scannedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000 + 60_000),
      gradedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    },
  });
  // A second paper that already passed checks but waits for review.
  await prisma.researchPaper.create({
    data: {
      studentId: student.id,
      offeringId: seOffering.id,
      title: 'تحليل أداء قواعد البيانات NoSQL في تطبيقات Real-Time',
      abstract:
        'مقارنة عملية بين MongoDB، Redis، و Cassandra في حالات استخدام محادثة لحظية وقياس زمن الاستجابة تحت أحمال متفاوتة.',
      status: 'CHECKS_PASSED',
      plagiarismPct: 6.4,
      aiContentPct: 11.2,
      uploadedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      scannedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 + 60_000),
    },
  });

  // Three published papers to populate the public library archive.
  // Spec: published papers go into the university's electronic library.
  await prisma.researchPaper.create({
    data: {
      studentId: student.id,
      reviewerId: teacher.id,
      offeringId: seOffering.id,
      title: 'استخدام التعلم العميق في تشخيص الأمراض الجلدية: مراجعة منهجية',
      abstract:
        'مراجعة منهجية تستعرض 27 دراسة حديثة (2020-2025) في توظيف الشبكات العصبية الالتفافية لتصنيف صور الأمراض الجلدية، مع تحليل دقّة النماذج وحدود التطبيق السريري.',
      status: 'PUBLISHED',
      fileUrl: '/api/v1/files/papers/sample.pdf',
      plagiarismPct: 4.1,
      aiContentPct: 7.8,
      grade: 18,
      feedback: 'بحث متميّز يُنصح بنشره في مجلة محكّمة.',
      uploadedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      scannedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000 + 60_000),
      gradedAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.researchPaper.create({
    data: {
      studentId: student.id,
      reviewerId: teacher.id,
      offeringId: seOffering.id,
      title: 'تأثير استراتيجية الصف المعكوس على تحصيل طلاب الهندسة في جامعة الزاوية',
      abstract:
        'دراسة شبه تجريبية على 84 طالباً من أقسام الهندسة، تقارن متوسط التحصيل بين فصلين أحدهما اعتمد الصف المعكوس مدعوماً بمنصة مدارك. النتائج تُظهر فرقاً ذا دلالة إحصائية لصالح المجموعة التجريبية.',
      status: 'PUBLISHED',
      fileUrl: '/api/v1/files/papers/sample.pdf',
      plagiarismPct: 5.6,
      aiContentPct: 4.3,
      grade: 19,
      feedback: 'دراسة دقيقة منهجياً وتمثّل إضافة حقيقية للحقل.',
      uploadedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      scannedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000 + 60_000),
      gradedAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
    },
  });
  await prisma.researchPaper.create({
    data: {
      studentId: student.id,
      reviewerId: teacher.id,
      offeringId: seOffering.id,
      title: 'تحليل أمن تطبيقات الجوّال المصرفية الليبية',
      abstract:
        'فحص أمني لأبرز ثلاثة تطبيقات مصرفية محلية، تحت أربعة محاور: تشفير الاتصال، إدارة الجلسة، تخزين البيانات الحساسة، ومقاومة الهندسة العكسية. تقدّم الدراسة توصيات عملية لرفع المستوى الأمني.',
      status: 'PUBLISHED',
      fileUrl: '/api/v1/files/papers/sample.pdf',
      plagiarismPct: 3.8,
      aiContentPct: 9.2,
      grade: 16,
      feedback: 'تطبيق ميداني قيّم. يُحسّن بإضافة مقابلات مع مسؤولي الأمن.',
      uploadedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      scannedAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000 + 60_000),
      gradedAt: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000),
      publishedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
    },
  });

  // ─── Watch event so the dashboard "Continue Learning" makes sense ──
  const firstLecture = await prisma.lecture.findFirstOrThrow({
    where: { offeringId: seOffering.id },
    orderBy: { ordinal: 'asc' },
  });
  await prisma.watchEvent.upsert({
    where: { lectureId_studentId: { lectureId: firstLecture.id, studentId: student.id } },
    update: {},
    create: {
      lectureId: firstLecture.id,
      studentId: student.id,
      watchedSec: Math.round(firstLecture.durationSec * 0.3),
      totalSec: firstLecture.durationSec,
      completed: false,
    },
  });

  // ─── Training tracks (Self-Development module) ───────────────
  // 11 tracks covering the categories required by the project brief.
  // Lessons are short, realistic, university-grade content. Each lesson
  // worth 5 points; track completion grants its `pointsAward`.
  type LessonSeed = { title: string; summary: string; content: string; estMinutes?: number; quiz?: { q: string; a: string } };
  type TrackSeed = {
    slug: string;
    title: string;
    titleEn: string;
    summary: string;
    category:
      | 'ONBOARDING' | 'ACADEMIC' | 'FLIPPED' | 'STUDY_SKILLS' | 'RESEARCH'
      | 'CAREER' | 'COMMUNICATION' | 'ENGLISH' | 'PROGRAMMING' | 'PRODUCTIVITY' | 'VISION';
    level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
    iconEmoji: string;
    themeColor: string;
    estMinutes: number;
    pointsAward: number;
    order: number;
    lessons: LessonSeed[];
    badge: { slug: string; title: string; description: string; iconEmoji: string; rarity?: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' };
  };

  const TRACKS: TrackSeed[] = [
    {
      slug: 'platform-onboarding',
      title: 'كيف تستخدم منصة الزاوية',
      titleEn: 'Platform Onboarding',
      summary: 'جولة سريعة على واجهات المنصة: المحاضرات، المصفوفة التعليمية، البحوث، المكتبة، والإحصاءات.',
      category: 'ONBOARDING', level: 'BEGINNER', iconEmoji: '🧭', themeColor: '#2952C8',
      estMinutes: 25, pointsAward: 150, order: 1,
      lessons: [
        { title: 'الترحيب والتسجيل', summary: 'كيفية إنشاء الحساب وإكمال الملف الشخصي', content: 'أهلاً بك في منصة جامعة الزاوية للتعليم الذكي. تبدأ رحلتك بإنشاء حسابك الجامعي عبر صفحة "إنشاء حساب"، وإدخال بياناتك الأساسية. بعدها أكمل ملفك الشخصي بإضافة الكلية والقسم والمعرّف الجامعي.', quiz: { q: 'ما النطاق الرسمي لإيميل الجامعة؟', a: 'zu.edu.ly' } },
        { title: 'لوحة التحكم الرئيسية', summary: 'فهم العناصر في الصفحة الرئيسية', content: 'لوحة التحكم تعرض: المقررات الحالية، نسبة الإنجاز، الإشعارات، والمساعد الذكي. كل بطاقة قابلة للنقر وتأخذك إلى التفاصيل.' },
        { title: 'المصفوفة التعليمية', summary: 'كيف تعمل وكيف تستفيد منها', content: 'المصفوفة التعليمية تتبع فهمك لكل مفهوم على حدة وتقترح فيديوهات لسد أي فجوة معرفية تظهر في امتحاناتك أو نقاط التفاعل.' },
        { title: 'البحوث والمكتبة', summary: 'رفع البحث والبحث في المكتبة', content: 'يمكنك رفع بحثك من قسم البحوث، وستجري المنصة فحص انتحال وفحص ذكاء اصطناعي قبل الإرسال للأستاذ. المكتبة تتيح البحث عبر آلاف الأبحاث المنشورة.', quiz: { q: 'ما النسبة القصوى المقبولة للانتحال في البحث؟', a: '15' } },
        { title: 'الإشعارات والرسائل', summary: 'متابعة كل جديد', content: 'سترى الجرس في الأعلى يحمل عدد الإشعارات غير المقروءة، ويتحدّث تلقائياً كل دقيقة. الرسائل المباشرة بينك وبين الأستاذ متوفرة في تبويب الرسائل.' },
      ],
      badge: { slug: 'badge-onboarded', title: 'مرحباً بك على المنصة', description: 'أكملت جولة التعرف على المنصة', iconEmoji: '🎉', rarity: 'COMMON' },
    },
    {
      slug: 'academic-methodology',
      title: 'منهجية الدراسة الجامعية',
      titleEn: 'Academic Methodology',
      summary: 'مهارات البحث الأكاديمي، التفكير النقدي، وكتابة التقارير الجامعية.',
      category: 'ACADEMIC', level: 'INTERMEDIATE', iconEmoji: '🎓', themeColor: '#0E5C2F',
      estMinutes: 45, pointsAward: 250, order: 2,
      lessons: [
        { title: 'مبادئ التفكير النقدي', summary: 'تحليل المعلومات وتقييم المصادر', content: 'التفكير النقدي يبدأ بطرح الأسئلة: من؟ ماذا؟ متى؟ لماذا؟ كيف؟ على أي معلومة قبل قبولها. المصادر الأكاديمية الموثوقة تأتي من مجلات مفهرسة، كتب أكاديمية، وقواعد بيانات معترف بها مثل Scopus وWeb of Science.' },
        { title: 'صياغة سؤال البحث', summary: 'من الفكرة العامة إلى السؤال الدقيق', content: 'سؤال البحث الجيد محدد، قابل للقياس، ومرتبط بمشكلة قائمة. ابدأ بسؤال عام ثم ضيقه تدريجياً. مثال: من "تأثير التكنولوجيا" إلى "أثر استخدام منصات التعليم المدمج على درجات طلاب الهندسة في جامعة الزاوية".', quiz: { q: 'كم عدد خصائص سؤال البحث الجيد؟', a: '3' } },
        { title: 'مراجعة الأدبيات', summary: 'كيف تكتشف ما تم نشره من قبل', content: 'مراجعة الأدبيات هي خريطة المعرفة الموجودة. ابحث في Google Scholar وResearchGate باستخدام كلمات مفتاحية دقيقة. اقرأ الملخصات أولاً، ثم المقدمات، ثم النتائج.' },
        { title: 'هيكل التقرير الأكاديمي', summary: 'IMRaD ولماذا يستخدم', content: 'IMRaD = Introduction, Methods, Results, and Discussion. هذا الهيكل القياسي يتيح للقارئ فهم بحثك بسرعة. كل قسم له هدف محدد.', quiz: { q: 'ماذا تعني الحروف IMRaD؟', a: 'Introduction Methods Results Discussion' } },
        { title: 'الأخلاقيات الأكاديمية', summary: 'الانتحال والأمانة العلمية', content: 'الانتحال يدمر مسيرتك الأكاديمية. وثّق كل اقتباس، استخدم علامات التنصيص، وادرج المرجع كاملاً. منصتنا تستخدم منظومات كشف انتحال متقدمة.' },
      ],
      badge: { slug: 'badge-scholar', title: 'باحث مبتدئ', description: 'أتقنت مبادئ المنهجية الأكاديمية', iconEmoji: '📚', rarity: 'RARE' },
    },
    {
      slug: 'flipped-classroom',
      title: 'استراتيجية الصف المعكوس',
      titleEn: 'Flipped Classroom Mastery',
      summary: 'كيف تستفيد من نموذج الصف المعكوس الذي تعتمده الجامعة لرفع التحصيل.',
      category: 'FLIPPED', level: 'BEGINNER', iconEmoji: '🔄', themeColor: '#7B3AED',
      estMinutes: 30, pointsAward: 150, order: 3,
      lessons: [
        { title: 'ما هو الصف المعكوس', summary: 'الفكرة الأصلية للدكتور إريك مازور', content: 'الصف المعكوس استراتيجية ابتكرها د. إريك مازور من جامعة هارفارد. الفكرة: الطالب يدرس الشروحات في فيديوهات قبل المحاضرة، وتتحول المحاضرة إلى مناقشة وتطبيق.', quiz: { q: 'من مبتكر استراتيجية الصف المعكوس؟', a: 'إريك مازور' } },
        { title: 'الدراسة الذاتية الفعّالة', summary: 'كيف تشاهد الفيديو وتستوعب', content: 'لا تشاهد الفيديو سلبياً. توقف عند كل نقطة، اكتب ملاحظات بكلماتك، وحاول حل أسئلة التفاعل قبل عرض الإجابة. هذا يضاعف الاستيعاب.' },
        { title: 'الاستفادة من القاعة', summary: 'المشاركة الفعّالة في النقاش', content: 'القاعة في الصف المعكوس مساحة للتطبيق، وليست لإعادة شرح ما درسته. اطرح الأسئلة التي عجزت عن حلها، وشارك في حلقات المناقشة.' },
        { title: 'نقاط التفاعل في الفيديو', summary: 'لماذا توقف الفيديوهات لتسأل', content: 'نقاط التفاعل تُجبرك على التوقف والتفكير. إجابتك تُسجَّل في المصفوفة التعليمية لتحديد فجواتك المعرفية تلقائياً.' },
      ],
      badge: { slug: 'badge-flipped', title: 'متقن الصف المعكوس', description: 'أكملت تدريب استراتيجية الصف المعكوس', iconEmoji: '🔄', rarity: 'COMMON' },
    },
    {
      slug: 'study-skills',
      title: 'مهارات الدراسة الفعّالة',
      titleEn: 'Effective Study Skills',
      summary: 'إدارة الوقت، التذكر طويل المدى، تقنيات المذاكرة المثبتة علمياً.',
      category: 'STUDY_SKILLS', level: 'BEGINNER', iconEmoji: '⏰', themeColor: '#D4A537',
      estMinutes: 35, pointsAward: 200, order: 4,
      lessons: [
        { title: 'تقنية بومودورو', summary: '25 دقيقة تركيز + 5 دقائق راحة', content: 'تقنية بومودورو ابتكرها فرانشيسكو شيريلو. تعمل على دورات: 25 دقيقة عمل مركز، ثم 5 دقائق راحة. بعد 4 دورات خذ راحة أطول (15-30 دقيقة). تساعد على مكافحة التشتت والإرهاق.', quiz: { q: 'كم دقيقة تركيز في كل دورة بومودورو؟', a: '25' } },
        { title: 'التكرار المتباعد', summary: 'كيف تتذكر للأبد وليس للامتحان فقط', content: 'منحنى النسيان لإبنغهاوس يقول: ننسى 70% من المعلومة خلال 24 ساعة بدون مراجعة. التكرار المتباعد يعكس هذا: راجع بعد يوم، 3 أيام، أسبوع، شهر. أدوات مثل Anki تؤتمت العملية.' },
        { title: 'قانون باريتو في الدراسة', summary: '20% من الجهد = 80% من النتيجة', content: 'في كل مادة هناك 20% من المفاهيم تشكل 80% من الامتحان. حدد هذه المفاهيم بالنظر في الامتحانات السابقة وأسئلة الأستاذ المتكررة، وركز جهدك عليها.' },
        { title: 'الكتابة اليدوية vs الطباعة', summary: 'لماذا الكتابة بخط اليد أفضل للتذكر', content: 'دراسات جامعة برينستون أثبتت: الطلاب الذين يدوّنون ملاحظاتهم بخط اليد يتذكرون 30% أكثر من الذين يكتبون على اللابتوب. الكتابة اليدوية تجبر الدماغ على معالجة المعلومة وإعادة صياغتها.' },
      ],
      badge: { slug: 'badge-disciplined', title: 'منظِّم الوقت', description: 'أتقنت مهارات الدراسة الفعّالة', iconEmoji: '⏱️', rarity: 'COMMON' },
    },
    {
      slug: 'research-skills',
      title: 'مهارات البحث العلمي',
      titleEn: 'Research Skills',
      summary: 'كتابة البحث، الاقتباس الصحيح، النشر في ResearchGate وGoogle Scholar.',
      category: 'RESEARCH', level: 'INTERMEDIATE', iconEmoji: '🔬', themeColor: '#0E5C2F',
      estMinutes: 50, pointsAward: 300, order: 5,
      lessons: [
        { title: 'بنية البحث العلمي', summary: 'من العنوان إلى المراجع', content: 'البحث العلمي القياسي يحتوي: عنوان، ملخص (Abstract)، مقدمة، مراجعة أدبيات، منهجية، نتائج، نقاش، خلاصة، مراجع. كل قسم له طول وتنسيق محدد.' },
        { title: 'البحث في قواعد البيانات', summary: 'Scopus, IEEE, PubMed, Google Scholar', content: 'استخدم عوامل البحث المنطقية: AND، OR، NOT. ضع الجمل بين علامات تنصيص للبحث الدقيق. صفّ النتائج حسب التاريخ أو الاستشهادات.' },
        { title: 'الاقتباس وأنماطه', summary: 'APA, MLA, Chicago, IEEE', content: 'كل تخصص له نمط اقتباس مفضل: APA للعلوم الاجتماعية، MLA للآداب، IEEE للهندسة. استخدم Zotero أو Mendeley لإدارة المراجع تلقائياً.', quiz: { q: 'أي نمط اقتباس يستخدم في الهندسة؟', a: 'IEEE' } },
        { title: 'فحص الانتحال', summary: 'لماذا منصتنا تفحص قبل الإرسال', content: 'الانتحال جريمة أكاديمية. منصتنا مرتبطة بأنظمة فحص متقدمة، وتطبق حد 15% كحد أقصى للتشابه. نسبة أعلى تعني رفض البحث تلقائياً.' },
        { title: 'النشر على ResearchGate وGoogle Scholar', summary: 'بناء بصمتك الأكاديمية', content: 'افتح حساباً مهنياً على ResearchGate وGoogle Scholar باستخدام إيميلك الجامعي. ارفع بحوثك المقبولة، اربطها بـ ORCID. هذا يبني سمعتك العلمية تدريجياً.' },
      ],
      badge: { slug: 'badge-researcher', title: 'باحث', description: 'أنهيت تدريب مهارات البحث العلمي', iconEmoji: '🔬', rarity: 'EPIC' },
    },
    {
      slug: 'career-skills',
      title: 'مهارات سوق العمل',
      titleEn: 'Career Skills',
      summary: 'كتابة السيرة الذاتية، المقابلات الوظيفية، LinkedIn، التشبيك المهني.',
      category: 'CAREER', level: 'INTERMEDIATE', iconEmoji: '💼', themeColor: '#2952C8',
      estMinutes: 40, pointsAward: 250, order: 6,
      lessons: [
        { title: 'بناء سيرة ذاتية احترافية', summary: 'CV من صفحة واحدة يفتح أبواباً', content: 'سيرتك الذاتية تُقرأ في 7 ثوانٍ. ضع المعلومات الأهم في الأعلى: الاسم، التواصل، ملخص في 3 أسطر، المهارات الفنية، الخبرات. تجنب الصور وعلامات التنصيص الزائدة.' },
        { title: 'كتابة خطاب التغطية', summary: 'لماذا تستحق هذه الوظيفة', content: 'خطاب التغطية يجيب على سؤال: لماذا أنت بالذات؟ اربط مهاراتك بمتطلبات الإعلان، أعطِ مثالاً واحداً ملموساً، واختم بدعوة لمقابلة.' },
        { title: 'المقابلة الشخصية', summary: 'STAR والأسئلة المتوقعة', content: 'استخدم تقنية STAR للإجابة على الأسئلة السلوكية: Situation، Task، Action، Result. تحضّر للأسئلة الكلاسيكية: حدثنا عن نفسك، نقاط ضعفك، لماذا تتركنا.', quiz: { q: 'ماذا تعني تقنية STAR؟', a: 'Situation Task Action Result' } },
        { title: 'بناء حساب LinkedIn فعّال', summary: 'الواجهة المهنية الرقمية', content: 'صورة شخصية محترفة، عنوان واضح، ملخص في 4 أسطر يحكي قصتك. أضف خبراتك بصيغة الإنجاز وليس الواجبات: "زدت X بنسبة Y" بدلاً من "كنت مسؤولاً عن X".' },
      ],
      badge: { slug: 'badge-career-ready', title: 'جاهز لسوق العمل', description: 'أتقنت مهارات سوق العمل', iconEmoji: '💼', rarity: 'RARE' },
    },
    {
      slug: 'communication',
      title: 'مهارات التواصل',
      titleEn: 'Communication Skills',
      summary: 'العرض الفعّال، الاستماع النشط، كتابة الرسائل المهنية.',
      category: 'COMMUNICATION', level: 'BEGINNER', iconEmoji: '🗣️', themeColor: '#D4A537',
      estMinutes: 30, pointsAward: 200, order: 7,
      lessons: [
        { title: 'فن العرض التقديمي', summary: 'قاعدة 10/20/30 لـ Guy Kawasaki', content: 'العروض الناجحة: 10 شرائح كحد أقصى، 20 دقيقة، خط 30 نقطة. أقل شرائح وأقل كلمات وخط أكبر = جمهور أكثر تركيزاً.', quiz: { q: 'كم شريحة كحد أقصى وفق قاعدة Guy Kawasaki؟', a: '10' } },
        { title: 'الاستماع النشط', summary: 'لماذا التواصل = الاستماع', content: 'الاستماع النشط يعني: لا تقاطع، أعد صياغة ما سمعت بكلماتك للتأكد من الفهم، اطرح أسئلة استيضاحية. هذا يبني الثقة ويمنع سوء الفهم.' },
        { title: 'كتابة الإيميل المهني', summary: 'موجز، واضح، يحترم وقت القارئ', content: 'موضوع واضح، تحية مناسبة، فقرة افتتاحية بهدف الرسالة، تفاصيل، طلب محدد، ختام مهذب. لا تكتب فقرات طويلة - استخدم النقاط.' },
        { title: 'لغة الجسد', summary: 'ما يقوله جسدك بدون كلمات', content: 'النظر في العينين يبني الثقة، الكتفان المستقيمان يدلان على الثقة، الابتسامة المعتدلة تكسر الجمود. تجنب تقاطع اليدين فهو يدل على الانغلاق.' },
      ],
      badge: { slug: 'badge-communicator', title: 'متواصل فعّال', description: 'أكملت تدريب مهارات التواصل', iconEmoji: '🗣️', rarity: 'COMMON' },
    },
    {
      slug: 'english-academic',
      title: 'الإنجليزية الأكاديمية',
      titleEn: 'Academic English',
      summary: 'قراءة الأبحاث الإنجليزية، الكتابة الأكاديمية، المصطلحات التقنية.',
      category: 'ENGLISH', level: 'INTERMEDIATE', iconEmoji: '🌍', themeColor: '#7B3AED',
      estMinutes: 60, pointsAward: 350, order: 8,
      lessons: [
        { title: 'لماذا الإنجليزية الأكاديمية مهمة', summary: '95% من الأبحاث العالمية بالإنجليزية', content: 'الإنجليزية لغة المعرفة العالمية. أكثر من 95% من الأبحاث المنشورة في أعلى المجلات بالإنجليزية. إتقانها يفتح لك العالم.' },
        { title: 'قراءة البحث العلمي', summary: 'استراتيجية القراءة الذكية', content: 'لا تقرأ البحث من البداية للنهاية. ابدأ بـ Abstract، ثم Conclusion، ثم Figures، ثم Methods فقط إذا كان البحث ذا صلة. هذا يوفر 70% من وقتك.' },
        { title: 'مصطلحات أكاديمية شائعة', summary: 'Methodology, Hypothesis, Significant', content: 'تعلم المصطلحات الأكاديمية الأساسية: Methodology (المنهجية)، Hypothesis (الفرضية)، Significant (ذو دلالة إحصائية). ميِّز بين Significant و"important" في السياق العلمي.', quiz: { q: 'بالإنجليزية: ما المصطلح المرادف للفرضية؟', a: 'Hypothesis' } },
        { title: 'الكتابة بأسلوب أكاديمي', summary: 'موضوعي، واضح، بصيغة المبني للمجهول حين يلزم', content: 'الكتابة الأكاديمية موضوعية: استخدم "The study found..." بدلاً من "I think...". تجنب الجمل الطويلة وعبارات اللغة العامية. المبني للمجهول مناسب لوصف المنهجية.' },
        { title: 'تجربتنا مع الإنجليزية في جنوب ليبيا', summary: '40% تحسن في الاستيعاب', content: 'في تجربتنا مع طلاب جنوب ليبيا باستخدام استراتيجية الصف المعكوس، حقق الطلاب: 40% تحسن في الاستيعاب، 70% زيادة في المشاركة، 90% تحقيق لأهداف التعلم. الالتزام بالمنهج هو المفتاح.' },
      ],
      badge: { slug: 'badge-english', title: 'إنجليزية أكاديمية', description: 'أتقنت أساسيات الإنجليزية الأكاديمية', iconEmoji: '🌍', rarity: 'EPIC' },
    },
    {
      slug: 'programming-basics',
      title: 'أساسيات البرمجة',
      titleEn: 'Programming Basics',
      summary: 'مفاهيم البرمجة، Python، التفكير الحسابي، حل المسائل.',
      category: 'PROGRAMMING', level: 'BEGINNER', iconEmoji: '💻', themeColor: '#2952C8',
      estMinutes: 55, pointsAward: 300, order: 9,
      lessons: [
        { title: 'ما هي البرمجة', summary: 'تعليمات للحاسوب لحل مسائل', content: 'البرمجة هي كتابة تعليمات منطقية للحاسوب لإنجاز مهام. الحاسوب يفهم لغات معينة (Python, JavaScript, C++)، وكل لغة لها قواعد نحوية (Syntax) محددة.' },
        { title: 'المتغيرات وأنواع البيانات', summary: 'String, Integer, Float, Boolean', content: 'المتغير صندوق له اسم يحفظ قيمة. أنواع البيانات الأساسية: نصوص (String) "Ahmed"، أعداد صحيحة (Integer) 25، أعداد عشرية (Float) 3.14، صواب/خطأ (Boolean) True/False.', quiz: { q: 'ما نوع البيانات لرقم 3.14؟', a: 'Float' } },
        { title: 'الجمل الشرطية', summary: 'if, else, elif', content: 'الشروط تجعل البرنامج يتخذ قرارات. مثال: if grade >= 60: print("نجح") else: print("راسب"). البرنامج يقرأ الشرط، فإذا كان صحيحاً ينفذ الكتلة الأولى، وإلا الكتلة الثانية.' },
        { title: 'الحلقات التكرارية', summary: 'for, while', content: 'الحلقات تكرر تنفيذ كود. for لتكرار محدد: for i in range(10). while للتكرار حتى يتحقق شرط: while balance > 0. الحلقات هي قوة البرمجة الحقيقية.' },
        { title: 'الدوال', summary: 'تجزئة الكود لقطع قابلة لإعادة الاستخدام', content: 'الدالة كتلة كود لها اسم وتقبل مدخلات وتنتج مخرجات. مثال: def average(a, b): return (a + b) / 2. تستخدمها مرة بعد مرة بدون إعادة كتابة الكود.' },
      ],
      badge: { slug: 'badge-coder', title: 'مبرمج مبتدئ', description: 'أكملت أساسيات البرمجة', iconEmoji: '💻', rarity: 'RARE' },
    },
    {
      slug: 'productivity',
      title: 'الإنتاجية والتعلم الذاتي',
      titleEn: 'Productivity & Self-Learning',
      summary: 'إدارة المهام، التوازن النفسي، تقنيات التعلم المستمر.',
      category: 'PRODUCTIVITY', level: 'BEGINNER', iconEmoji: '⚡', themeColor: '#0E5C2F',
      estMinutes: 30, pointsAward: 180, order: 10,
      lessons: [
        { title: 'إدارة المهام بطريقة GTD', summary: 'Getting Things Done لـ ديفيد ألن', content: 'GTD = اجمع المهام، وضحها، رتبها حسب السياق، راجعها أسبوعياً، ثم نفذها. أدوات: Notion، Todoist، أو حتى دفتر ورقي.' },
        { title: 'مصفوفة أيزنهاور', summary: 'مهم vs عاجل', content: 'كل مهمة تنتمي لأحد أربع خانات: مهم وعاجل (نفّذ فوراً)، مهم وغير عاجل (خطّط له)، غير مهم وعاجل (فوّضه)، غير مهم وغير عاجل (احذفه).', quiz: { q: 'كم خانة في مصفوفة أيزنهاور؟', a: '4' } },
        { title: 'التعلم مدى الحياة', summary: 'لماذا التخرج ليس النهاية', content: 'سوق العمل يتغير كل 5 سنوات. المهنيون الناجحون يخصصون 5 ساعات أسبوعياً للتعلم: قراءة، دورات، بودكاست، حضور مؤتمرات.' },
        { title: 'التوازن والاحتراق المهني', summary: 'علامات الإنذار وخطوات التعافي', content: 'الاحتراق علامات: إرهاق دائم، انفصال عاطفي، شعور بعدم الإنجاز. الوقاية: نوم كافٍ، تمارين رياضية، علاقات اجتماعية، هوايات خارج الدراسة.' },
      ],
      badge: { slug: 'badge-productive', title: 'منتج', description: 'أتقنت أدوات الإنتاجية الشخصية', iconEmoji: '⚡', rarity: 'COMMON' },
    },
    {
      slug: 'vision-ai-data',
      title: 'الذكاء الاصطناعي وعلم البيانات',
      titleEn: 'AI & Data Science (Vision Track)',
      summary: 'مسار متخصص ضمن رؤية جامعة الزاوية المستقبلية.',
      category: 'VISION', level: 'ADVANCED', iconEmoji: '🤖', themeColor: '#7B3AED',
      estMinutes: 70, pointsAward: 400, order: 11,
      lessons: [
        { title: 'مقدمة في الذكاء الاصطناعي', summary: 'تعريفات وتاريخ موجز', content: 'الذكاء الاصطناعي = أنظمة حاسوبية تحاكي القدرات الذهنية البشرية. تعلم آلي (ML) هو فرع منه، وتعلم عميق (DL) فرع من ML. ChatGPT مبني على نموذج Transformer من 2017.' },
        { title: 'تعلم الآلة مقابل التعلم العميق', summary: 'متى نستخدم كل منهما', content: 'تعلم الآلة الكلاسيكي مناسب للبيانات المهيكلة وكميات قليلة. التعلم العميق يحتاج بيانات ضخمة وقوة حسابية كبيرة، لكنه يتفوق في الصور واللغة.' },
        { title: 'علم البيانات والإحصاء', summary: 'الأساس الذي يقوم عليه كل شيء', content: 'علم البيانات يدمج الإحصاء والبرمجة والمعرفة المجالية. أدوات: Python (pandas, numpy)، R، SQL. مهارة قراءة البيانات أهم من إتقان الأدوات.' },
        { title: 'تتبع المعرفة (Knowledge Tracing)', summary: 'الخوارزمية وراء مصفوفتنا التعليمية', content: 'خوارزميات تتبع المعرفة تنتج نموذج معرفة الطالب بمرور الوقت. مسابقة Kaggle لشركة Riiid (2020) كانت محطة فاصلة. المنصة تستخدم نموذجاً مشابهاً لتحديد فجواتك المعرفية.', quiz: { q: 'ما اسم الشركة الكورية صاحبة مسابقة تتبع المعرفة على Kaggle؟', a: 'Riiid' } },
        { title: 'الذكاء الاصطناعي في التعليم', summary: 'مستقبل التعلم المخصص', content: 'الذكاء الاصطناعي سيغير التعليم: مدرسون افتراضيون، محتوى مخصص لكل طالب، تقييم لحظي، اكتشاف الفجوات قبل أن تظهر في الامتحان. منصة الزاوية خطوة في هذا الاتجاه.' },
      ],
      badge: { slug: 'badge-ai-pioneer', title: 'رائد ذكاء اصطناعي', description: 'أنهيت المسار المتخصص في الذكاء الاصطناعي', iconEmoji: '🤖', rarity: 'LEGENDARY' },
    },
  ];

  console.log(`📚 Seeding ${TRACKS.length} training tracks...`);
  for (const t of TRACKS) {
    const track = await prisma.trainingTrack.upsert({
      where: { slug: t.slug },
      update: {
        title: t.title, titleEn: t.titleEn, summary: t.summary,
        category: t.category, level: t.level, iconEmoji: t.iconEmoji,
        themeColor: t.themeColor, estMinutes: t.estMinutes,
        pointsAward: t.pointsAward, order: t.order, isPublished: true,
      },
      create: {
        slug: t.slug, title: t.title, titleEn: t.titleEn, summary: t.summary,
        category: t.category, level: t.level, iconEmoji: t.iconEmoji,
        themeColor: t.themeColor, estMinutes: t.estMinutes,
        pointsAward: t.pointsAward, order: t.order, isPublished: true,
      },
    });
    // Replace lessons (idempotent re-seed)
    await prisma.trainingLesson.deleteMany({ where: { trackId: track.id } });
    for (let i = 0; i < t.lessons.length; i++) {
      const l = t.lessons[i]!;
      await prisma.trainingLesson.create({
        data: {
          trackId: track.id,
          order: i + 1,
          title: l.title,
          summary: l.summary,
          contentMarkdown: l.content,
          estMinutes: l.estMinutes ?? Math.ceil(t.estMinutes / t.lessons.length),
          pointsAward: 5,
          quizQuestion: l.quiz?.q ?? null,
          quizAnswer: l.quiz?.a ?? null,
        },
      });
    }
    // Track-completion badge
    await prisma.badge.upsert({
      where: { slug: t.badge.slug },
      update: {
        title: t.badge.title, description: t.badge.description,
        iconEmoji: t.badge.iconEmoji, rarity: t.badge.rarity ?? 'COMMON',
        themeColor: t.themeColor, trackId: track.id,
      },
      create: {
        slug: t.badge.slug, title: t.badge.title, description: t.badge.description,
        iconEmoji: t.badge.iconEmoji, rarity: t.badge.rarity ?? 'COMMON',
        themeColor: t.themeColor, trackId: track.id,
      },
    });
  }

  // Cross-cutting badges (not tied to a specific track)
  for (const b of [
    { slug: 'badge-first-step', title: 'الخطوة الأولى', description: 'أنهيت أول درس على الإطلاق', iconEmoji: '👣', rarity: 'COMMON' },
    { slug: 'badge-polymath', title: 'متعدد المعارف', description: 'أنهيت 3 مسارات في فئات مختلفة', iconEmoji: '🧠', rarity: 'EPIC' },
    { slug: 'badge-marathoner', title: 'الماراثوني', description: '7 أيام متتالية من التعلم', iconEmoji: '🏃', rarity: 'RARE' },
    { slug: 'badge-perfectionist', title: 'الكامل', description: 'أنهيت مسارا بإجابات صحيحة 100%', iconEmoji: '💯', rarity: 'EPIC' },
    { slug: 'badge-zu-pioneer', title: 'رائد جامعة الزاوية', description: 'أكملت 5 مسارات على المنصة', iconEmoji: '🏆', rarity: 'LEGENDARY' },
  ]) {
    await prisma.badge.upsert({
      where: { slug: b.slug },
      update: { title: b.title, description: b.description, iconEmoji: b.iconEmoji, rarity: b.rarity },
      create: { slug: b.slug, title: b.title, description: b.description, iconEmoji: b.iconEmoji, rarity: b.rarity },
    });
  }

  // Demo: enroll the seed student in the onboarding track and complete first 2 lessons
  const onboardingTrack = await prisma.trainingTrack.findUnique({
    where: { slug: 'platform-onboarding' },
    include: { lessons: { orderBy: { order: 'asc' }, take: 2 } },
  });
  if (onboardingTrack) {
    const enrollment = await prisma.trainingEnrollment.upsert({
      where: { userId_trackId: { userId: student.id, trackId: onboardingTrack.id } },
      update: {},
      create: { userId: student.id, trackId: onboardingTrack.id },
    });
    for (const lesson of onboardingTrack.lessons) {
      const existing = await prisma.lessonProgress.findUnique({
        where: { enrollmentId_lessonId: { enrollmentId: enrollment.id, lessonId: lesson.id } },
      });
      if (!existing) {
        await prisma.lessonProgress.create({
          data: { enrollmentId: enrollment.id, lessonId: lesson.id, pointsAwarded: 5 },
        });
        await prisma.pointsLedger.create({
          data: {
            userId: student.id, points: 5,
            reason: 'lesson_completed', refType: 'TrainingLesson', refId: lesson.id,
          },
        });
      }
    }
    // Award the first-step badge
    const firstStep = await prisma.badge.findUnique({ where: { slug: 'badge-first-step' } });
    if (firstStep) {
      await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId: student.id, badgeId: firstStep.id } },
        update: {},
        create: { userId: student.id, badgeId: firstStep.id },
      });
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  Governance: default role permissions + a sample admin override
  // ════════════════════════════════════════════════════════════════
  const ROLE_CAPS: Record<Role, string[]> = {
    STUDENT: ['EXAMS_TAKE'],
    TEACHER: ['RESEARCH_GRADE_OWN', 'RESEARCH_PUBLISH', 'EXAMS_AUTHOR', 'CURRICULUM_EDIT_OWN', 'ANNOUNCE_FACULTY', 'COMPETITIONS_RUN', 'EVENTS_RUN'],
    ADMIN: ['USERS_MANAGE', 'ROLES_ASSIGN', 'TEACHERS_VERIFY', 'ANNOUNCE_PLATFORM', 'ANNOUNCE_FACULTY', 'COMPETITIONS_RUN', 'EVENTS_RUN', 'CURRICULUM_EDIT_ANY', 'RESEARCH_PUBLISH'],
    QUALITY: ['QUALITY_VIEW', 'QUALITY_REPORT', 'EXAMS_MODERATE', 'ANNOUNCE_FACULTY'],
  };
  for (const [role, caps] of Object.entries(ROLE_CAPS)) {
    for (const cap of caps) {
      await prisma.rolePermission.upsert({
        where: { role_capability: { role: role as Role, capability: cap as never } },
        update: {},
        create: { role: role as Role, capability: cap as never },
      });
    }
  }

  // Mark the seed teacher's profile as verified + with realistic onboarding data
  await prisma.teacherProfile.update({
    where: { userId: teacher.id },
    data: {
      degreeLevel: 'PHD',
      yearsExperience: 12,
      certifications: [
        { title: 'دكتوراه في علوم الحاسوب', issuer: 'جامعة مانشستر', year: 2014 },
        { title: 'شهادة Oracle Certified Professional', issuer: 'Oracle', year: 2018 },
        { title: 'تدريب الذكاء الاصطناعي للتعليم', issuer: 'Stanford Online', year: 2023 },
      ],
      subjectKeywords: ['Software Engineering', 'AI', 'Machine Learning', 'Database Systems', 'هندسة البرمجيات', 'الذكاء الاصطناعي'],
      verifiedAt: new Date(),
      verifiedById: admin.id,
    },
  });

  // ════════════════════════════════════════════════════════════════
  //  Question bank + sample exam template
  // ════════════════════════════════════════════════════════════════
  const swCategory = await prisma.questionCategory.upsert({
    where: { slug: 'software-engineering' },
    update: {},
    create: {
      slug: 'software-engineering',
      title: 'هندسة البرمجيات',
      description: 'بنك أسئلة هندسة البرمجيات — موحد لكليات الهندسة وتقنية المعلومات',
      facultyId: faculties[0]!.id, // IT
      isShared: true,
      iconEmoji: '💻',
    },
  });
  const generalCategory = await prisma.questionCategory.upsert({
    where: { slug: 'general-academic' },
    update: {},
    create: {
      slug: 'general-academic',
      title: 'مهارات أكاديمية عامة',
      description: 'أسئلة عامة قابلة لإعادة الاستخدام عبر الكليات',
      isShared: true,
      iconEmoji: '🎓',
    },
  });

  const seedQuestions = [
    {
      category: swCategory.id, type: 'MCQ' as const, prompt: 'ما هي المرحلة الأولى في دورة حياة تطوير البرمجيات (SDLC)؟',
      choices: ['التحليل والتخطيط', 'التصميم', 'الترميز', 'الاختبار'], correct: 0, difficulty: 'EASY' as const, points: 1,
    },
    {
      category: swCategory.id, type: 'MCQ' as const, prompt: 'أي نموذج تطوير برمجي يعمل بدورات قصيرة متكررة؟',
      choices: ['الشلال (Waterfall)', 'الحلزوني (Spiral)', 'أجايل (Agile)', 'V-Model'], correct: 2, difficulty: 'MEDIUM' as const, points: 2,
    },
    {
      category: swCategory.id, type: 'TRUE_FALSE' as const, prompt: 'مبدأ Single Responsibility هو أحد مبادئ SOLID.',
      choices: ['صحيح', 'خطأ'], correct: 0, difficulty: 'EASY' as const, points: 1,
    },
    {
      category: swCategory.id, type: 'SHORT' as const, prompt: 'ما هي اللغة الأكثر استخداماً لتطوير الواجهات الأمامية للويب؟',
      correct: 'JavaScript', difficulty: 'EASY' as const, points: 1,
    },
    {
      category: swCategory.id, type: 'MCQ' as const, prompt: 'ما الفرق بين Stack و Queue؟',
      choices: ['Stack: LIFO، Queue: FIFO', 'Stack: FIFO، Queue: LIFO', 'لا فرق', 'كلاهما LIFO'], correct: 0, difficulty: 'MEDIUM' as const, points: 2,
    },
    {
      category: swCategory.id, type: 'ESSAY' as const, prompt: 'اشرح بالتفصيل الفرق بين الاختبار اليدوي والاختبار الآلي، مع ذكر متى تستخدم كل نوع.',
      difficulty: 'HARD' as const, points: 5,
    },
    {
      category: generalCategory.id, type: 'MCQ' as const, prompt: 'ما النسبة القصوى المقبولة للتشابه (الانتحال) في البحث العلمي على منصة جامعة الزاوية؟',
      choices: ['5%', '10%', '15%', '25%'], correct: 2, difficulty: 'EASY' as const, points: 1,
    },
    {
      category: generalCategory.id, type: 'TRUE_FALSE' as const, prompt: 'استراتيجية الصف المعكوس تتطلب دراسة ذاتية قبل المحاضرة.',
      choices: ['صحيح', 'خطأ'], correct: 0, difficulty: 'EASY' as const, points: 1,
    },
  ];

  // Wipe and reseed for idempotence
  await prisma.examAnswer.deleteMany({});
  await prisma.examAttempt.deleteMany({});
  await prisma.examTemplateQuestion.deleteMany({});
  await prisma.examTemplate.deleteMany({});
  await prisma.question.deleteMany({});

  const createdQuestions: { id: string; type: string }[] = [];
  for (const sq of seedQuestions) {
    const q = await prisma.question.create({
      data: {
        categoryId: sq.category,
        type: sq.type,
        prompt: sq.prompt,
        choices: sq.choices ?? undefined,
        correctAnswer: sq.correct !== undefined ? sq.correct : undefined,
        difficulty: sq.difficulty,
        points: sq.points,
        authorId: teacher.id,
        isApproved: true, // pre-approved for demo
        moderatedById: quality.id,
      },
    });
    createdQuestions.push({ id: q.id, type: q.type });
  }

  // Build a published sample exam for the demo offering
  const demoOffering = await prisma.courseOffering.findFirst({
    where: { teacherId: teacher.id },
    include: { course: { select: { name: true } } },
  });
  if (demoOffering) {
    const exam = await prisma.examTemplate.create({
      data: {
        offeringId: demoOffering.id,
        title: `اختبار قصير — ${demoOffering.course.name}`,
        kind: 'QUIZ',
        description: 'اختبار قصير لمراجعة المفاهيم الأساسية. مدة الاختبار 30 دقيقة.',
        durationMin: 30,
        passingScore: 50,
        randomized: true,
        status: 'PUBLISHED',
        authorId: teacher.id,
        moderatedById: quality.id,
        moderationNote: 'تمت الموافقة — أسئلة متوازنة وتدرج المستوى مناسب',
        questions: {
          create: createdQuestions.slice(0, 5).map((q, i) => ({ questionId: q.id, order: i + 1 })),
        },
      },
    });
    // Pending-review unified faculty exam (so QUALITY has something to moderate)
    await prisma.examTemplate.create({
      data: {
        facultyId: faculties[0]!.id,
        title: 'اختبار موحد — أساسيات هندسة البرمجيات (كلية تقنية المعلومات)',
        kind: 'MIDTERM',
        description: 'اختبار نصفي موحد على مستوى الكلية — في انتظار مراجعة مكتب الجودة.',
        durationMin: 60,
        passingScore: 60,
        randomized: true,
        status: 'PENDING_REVIEW',
        authorId: teacher.id,
        questions: {
          create: createdQuestions.map((q, i) => ({ questionId: q.id, order: i + 1 })),
        },
      },
    });
    void exam;
  }

  // ════════════════════════════════════════════════════════════════
  //  Announcements + competitions + events
  // ════════════════════════════════════════════════════════════════
  await prisma.announcement.deleteMany({});
  await prisma.competition.deleteMany({});
  await prisma.campusEvent.deleteMany({});

  await prisma.announcement.createMany({
    data: [
      {
        authorId: admin.id, scope: 'PLATFORM', scopeId: null,
        title: 'إطلاق منصة جامعة الزاوية للتعليم الذكي',
        body: 'يسرّ جامعة الزاوية بالتعاون مع وزارة التعليم العالي والبحث العلمي إعلان إطلاق المنصة التعليمية الذكية بشكل رسمي. يستطيع جميع الطلاب والأساتذة الاستفادة من الميزات الجديدة فوراً.',
        pinned: true, iconEmoji: '🎉',
      },
      {
        authorId: admin.id, scope: 'PLATFORM', scopeId: null,
        title: 'موعد التسجيل للفصل الدراسي الجديد',
        body: 'يبدأ التسجيل للفصل الدراسي الجديد يوم الأحد القادم. يُرجى من جميع الطلاب مراجعة جدولهم الدراسي قبل اعتماده.',
        iconEmoji: '📅',
      },
      {
        authorId: teacher.id, scope: 'FACULTY', scopeId: faculties[0]!.id,
        title: 'محاضرة افتراضية مع خبير عالمي في الذكاء الاصطناعي',
        body: 'تستضيف كلية تقنية المعلومات محاضرة عن بُعد مع البروفيسور أندرو نج يوم الخميس عبر منصة الزاوية. الحضور مفتوح لجميع طلاب الكلية.',
        iconEmoji: '🎤',
      },
      {
        authorId: quality.id, scope: 'PLATFORM', scopeId: null,
        title: 'بدء جولة ضمان الجودة الفصلية',
        body: 'مكتب ضمان الجودة سيبدأ جولته الفصلية لمراجعة المقررات والمحاضرات المنشورة. جميع البيانات متاحة في لوحة الجودة.',
        iconEmoji: '✅',
      },
    ],
  });

  await prisma.competition.createMany({
    data: [
      {
        title: 'مسابقة أفضل بحث طلابي في الذكاء الاصطناعي',
        description: 'تستقبل جامعة الزاوية البحوث الطلابية في مجال الذكاء الاصطناعي وتطبيقاته. الفائز يحصل على منحة لحضور مؤتمر دولي.',
        category: 'بحث', prize: 'منحة مؤتمر دولي + 2,000 د.ل',
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        organizerId: teacher.id, iconEmoji: '🔬', themeColor: '#7B3AED',
      },
      {
        title: 'هاكاثون منصة الزاوية الأول',
        description: 'هاكاثون 48 ساعة لتطوير حلول رقمية لتحديات الجامعة. مفتوح لجميع الطلاب من جميع الكليات.',
        category: 'برمجة', prize: '5,000 د.ل + فرصة تدريب',
        deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        organizerId: admin.id, iconEmoji: '💻', themeColor: '#2952C8',
      },
      {
        title: 'مسابقة الإلقاء العلمي بالإنجليزية',
        description: 'قدّم بحثك في 3 دقائق باللغة الإنجليزية. تنميةً لمهارات العرض والتواصل العلمي الدولي.',
        category: 'إلقاء', prize: 'دورة TOEFL مجانية + شهادة',
        deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
        organizerId: teacher.id, iconEmoji: '🎤', themeColor: '#D4A537',
      },
    ],
  });

  await prisma.campusEvent.createMany({
    data: [
      {
        title: 'يوم المهنة 2026', description: 'فعالية يوم كامل تجمع الطلاب بأكثر من 30 شركة ومؤسسة وطنية. فرص توظيف وتدريب للخريجين والطلاب في السنوات النهائية.',
        location: 'القاعة الكبرى — الحرم الجامعي الرئيسي', startsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000),
        capacity: 500, organizerId: admin.id, iconEmoji: '💼', themeColor: '#0E5C2F',
      },
      {
        title: 'ندوة: مستقبل التعليم في ليبيا', description: 'ندوة حوارية مع وزارة التعليم العالي والبحث العلمي حول رؤية التعليم 2030.',
        location: 'مدرج كلية الهندسة', startsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 3 * 60 * 60 * 1000),
        capacity: 200, organizerId: quality.id, iconEmoji: '🎓', themeColor: '#2952C8',
      },
      {
        title: 'ورشة عمل: مهارات البحث العلمي', description: 'ورشة عملية لمدة 4 ساعات تغطي صياغة سؤال البحث، البحث في قواعد البيانات، والاقتباس الصحيح.',
        location: 'مكتبة الجامعة المركزية', startsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        endsAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000),
        capacity: 60, organizerId: teacher.id, iconEmoji: '📚', themeColor: '#7B3AED',
      },
    ],
  });

  console.log('✅ Seed complete.');
}

main()
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
