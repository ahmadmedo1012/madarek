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
  // Mirrors the official faculty list of University of Zawia (29 colleges total).
  // We seed a representative subset that covers each region (Zawia + branches).
  // NOTE: Original 6 names are preserved verbatim to avoid orphaning rows in
  // existing deployed databases. New ones are appended.
  const faculties = await Promise.all(
    [
      { name: 'كلية تقنية المعلومات', nameEn: 'Information Technology', iconEmoji: '💻' },
      { name: 'كلية الهندسة', nameEn: 'Engineering', iconEmoji: '⚙️' },
      { name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: '🔬' },
      { name: 'كلية الطب', nameEn: 'Medicine', iconEmoji: '⚕️' },
      { name: 'كلية الاقتصاد', nameEn: 'Economics', iconEmoji: '💼' },
      { name: 'كلية القانون', nameEn: 'Law', iconEmoji: '⚖️' },
      { name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: '📚' },
      { name: 'كلية الصيدلة', nameEn: 'Pharmacy', iconEmoji: '💊' },
      { name: 'كلية التربية', nameEn: 'Education', iconEmoji: '🎓' },
      { name: 'كلية هندسة النفط والغاز', nameEn: 'Oil & Gas Engineering', iconEmoji: '⛽' },
      { name: 'كلية التربية البدنية وعلوم الرياضة', nameEn: 'Physical Education', iconEmoji: '⚽' },
      { name: 'كلية الطب البيطري والعلوم الزراعية', nameEn: 'Veterinary & Agricultural Sciences', iconEmoji: '🌾' },
    ].map((f) => prisma.faculty.upsert({ where: { name: f.name }, create: f, update: { nameEn: f.nameEn, iconEmoji: f.iconEmoji } })),
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

  // Add a few representative departments for the new faculties so admin/quality
  // dashboards have realistic structure to walk.
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

  await prisma.user.upsert({
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

  console.log('✅ Seed complete.');
}

main()
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
