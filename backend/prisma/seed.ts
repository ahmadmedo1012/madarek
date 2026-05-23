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
  const faculties = await Promise.all(
    [
      { name: 'كلية تقنية المعلومات', nameEn: 'IT', iconEmoji: '💻' },
      { name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: '⚙️' },
      { name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: '🔬' },
      { name: 'كلية الطب', nameEn: 'Medicine', iconEmoji: '⚕️' },
      { name: 'كلية الاقتصاد', nameEn: 'Economics', iconEmoji: '💼' },
      { name: 'كلية القانون', nameEn: 'Law', iconEmoji: '⚖️' },
    ].map((f) => prisma.faculty.upsert({ where: { name: f.name }, create: f, update: {} })),
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

  await prisma.user.upsert({
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
  await prisma.notification.createMany({
    data: [
      { userId: student.id, type: NotificationType.URGENT, icon: '⚠️', title: 'موعد تسليم المشروع النهائي', body: 'مشروع نظم المعلومات يجب تسليمه خلال 3 أيام' },
      { userId: student.id, type: NotificationType.ACADEMIC, icon: '📅', title: 'تذكير — محاضرة شبكات الحاسوب', body: 'الأحد 8:00 صباحاً — قاعة 301' },
      { userId: student.id, type: NotificationType.SYSTEM, icon: '🔧', title: 'تحديث منصة مدارك AI', body: 'تم إضافة ميزات جديدة للمساعد الذكي' },
      { userId: student.id, type: NotificationType.SOCIAL, icon: '💬', title: 'رد على منشورك', body: 'د. سالم البوسيفي علّق على سؤالك' },
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

  console.log('✅ Seed complete.');
}

main()
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
