/**
 * seed-demo-r330 — the clean Arabic demo pack (r330 · task D).
 *
 * Owner brief: user-facing lists must read like a real semester, not a
 * developer log — no probe strings, no "rNNN" stamps, no APP_INTERNAL
 * codes, no SYNC_* jargon, no "test" in emails. Acceptance gate for
 * EVERY display string below (name, title, body, email, room, feedback):
 *
 *     /\br\d{3}\b|probe|APP_INTERNAL|SYNC_|test/i   → must NOT match
 *
 * What it seeds (all upsert/guarded-create → re-runs are no-ops):
 *   - reuses the established demo tenant مؤسسة مدارك النموذجية
 *     (slug madarek-demo — the same row seed.ts maintains; the fixed
 *     legacy id 'inst-madarek-demo' is only on the fresh-create
 *     branch so migrated and fresh databases agree on the reference id)
 *   - 8 courses with real Arabic names (codes CS101…NT101 — a fresh
 *     grammar that cannot collide with the 30x codes of seed.ts /
 *     seed-pilot.ts), 38 lectures with sensible durations
 *   - 6 teachers with Arabic names + full TeacherProfiles
 *   - 40 students — emails userNN@demo.madarek.ly (the SAME demo
 *     domain the registrar's «حذف بيانات العرض» action already sweeps
 *     for the pilot cohort — so this pack is removable by that one
 *     action too), reg numbers DEMO-2026-101…140 (no overlap with the
 *     pilot's 001…030), password = the documented TEST_PASSWORD
 *   - enrollments (5 of 8 courses each, believable progress), grades
 *     (QUIZ_1 for all + MIDTERM for half, realistic spread), 2 exam
 *     templates per course, 10 direct messages and 8 notifications in
 *     human Arabic
 *
 * Run (operator-invoked, NOT part of the deploy chain — the r183
 * established-database guard in seed.ts owns deploy-time seeding):
 *     npm run seed:demo:r330        (backend workspace)
 *
 * This file deliberately inserts NO probe/telemetry rows and never
 * touches rows created by seed.ts / seed-pilot.ts — it only upserts
 * its own deterministic-keyed set.
 */

import {
  AcademicRank,
  DegreeLevel,
  ExamKind,
  ExamStatus,
  GradeKind,
  NotificationType,
  PrismaClient,
  Role,
} from '@prisma/client';
import { hashPassword } from '../src/lib/password.js';
import { TEST_PASSWORD } from '../src/modules/auth/test-accounts.data.js';

const TERM = '2024-FALL';
const INSTITUTION_SLUG = 'madarek-demo';

// ─── Teachers (6) — Arabic names, full profiles ─────────────────
interface TeacherSeedDef {
  email: string;
  firstName: string;
  lastName: string;
  rank: AcademicRank;
  degree: DegreeLevel;
  specialty: string;
  departmentKey: string; // `${facultyName}::${departmentName}`
  years: number;
  office: string;
  officeHours: string;
  bio: string;
  color: string;
}

const TEACHERS: TeacherSeedDef[] = [
  {
    email: 'khaled.mansouri@demo.madarek.ly',
    firstName: 'خالد',
    lastName: 'المنصوري',
    rank: AcademicRank.PROFESSOR,
    degree: DegreeLevel.PHD,
    specialty: 'علوم الحاسوب',
    departmentKey: 'كلية تقنية المعلومات::علوم الحاسوب',
    years: 22,
    office: 'مبنى كلية تقنية المعلومات — مكتب 305',
    officeHours: 'الأحد والثلاثاء 10:00–12:00',
    bio: 'مهتم بتعليم البرمجة من أول سطر، وببناء مناهج تربط النظرية بمشاريع حقيقية صغيرة.',
    color: '#4F8EF7',
  },
  {
    email: 'salma.benissa@demo.madarek.ly',
    firstName: 'سلمى',
    lastName: 'بن عيسى',
    rank: AcademicRank.ASSOCIATE_PROFESSOR,
    degree: DegreeLevel.PHD,
    specialty: 'التشريح البشري',
    departmentKey: 'كلية الطب البشري::التشريح',
    years: 15,
    office: 'مبنى كلية الطب البشري — مكتب 210',
    officeHours: 'الاثنين والأربعاء 11:00–13:00',
    bio: 'تؤمن أن فهم البنية يسبق فهم الوظيفة، وأن الرسم باليد أفضل طريق لحفظ التفاصيل.',
    color: '#3DD68C',
  },
  {
    email: 'omar.sherif@demo.madarek.ly',
    firstName: 'عمر',
    lastName: 'الشريف',
    rank: AcademicRank.LECTURER,
    degree: DegreeLevel.MASTERS,
    specialty: 'إدارة الأعمال',
    departmentKey: 'كلية الاقتصاد::إدارة الأعمال',
    years: 9,
    office: 'مبنى كلية الاقتصاد — مكتب 108',
    officeHours: 'الأحد 13:00–15:00',
    bio: 'يحب تحويل مفاهيم الإدارة إلى حالات دراسية من سوق العمل المحلي.',
    color: '#F5A623',
  },
  {
    email: 'hoda.taher@demo.madarek.ly',
    firstName: 'هدى',
    lastName: 'الطاهر',
    rank: AcademicRank.ASSISTANT_PROFESSOR,
    degree: DegreeLevel.PHD,
    specialty: 'الرياضيات المتقطعة',
    departmentKey: 'كلية العلوم::قسم الرياضيات',
    years: 12,
    office: 'مبنى كلية العلوم — مكتب 402',
    officeHours: 'الثلاثاء والخميس 09:00–11:00',
    bio: 'ترى في الرياضيات المتقطعة لغة الحاسوب الأولى، وتدرّسها بالأمثلة قبل التعريفات.',
    color: '#9B59B6',
  },
  {
    email: 'youssef.warshafana@demo.madarek.ly',
    firstName: 'يوسف',
    lastName: 'ورشفاني',
    rank: AcademicRank.ASSISTANT_PROFESSOR,
    degree: DegreeLevel.PHD,
    specialty: 'الكيمياء العضوية',
    departmentKey: 'كلية العلوم::قسم الكيمياء',
    years: 11,
    office: 'مبنى كلية العلوم — مكتب 311',
    officeHours: 'الأربعاء 10:00–12:00',
    bio: 'يشرح التفاعلات العضوية كقصص لجزيئات تتبادل الروابط، لا كقوائم تُحفظ.',
    color: '#EF6C00',
  },
  {
    email: 'mariam.ahmar@demo.madarek.ly',
    firstName: 'مريم',
    lastName: 'الأحمر',
    rank: AcademicRank.LECTURER,
    degree: DegreeLevel.MASTERS,
    specialty: 'التاريخ الحديث',
    departmentKey: 'كلية الآداب::التاريخ',
    years: 8,
    office: 'مبنى كلية الآداب — مكتب 115',
    officeHours: 'الاثنين 12:00–14:00',
    bio: 'تعيد قراءة تاريخ ليبيا الحديث من شهادات أهلها وأرشيفاتها المحلية.',
    color: '#2EC4B6',
  },
];

// ─── Courses (8) — real Arabic names, department placement ──────
interface LectureSeedDef {
  title: string;
  description: string;
  durationSec: number;
}

interface CourseSeedDef {
  code: string;
  name: string;
  description: string;
  credits: number;
  icon: string;
  color: string;
  departmentKey: string;
  teacherEmail: string;
  room: string;
  lectures: LectureSeedDef[];
}

const COURSES: CourseSeedDef[] = [
  {
    code: 'CS101',
    name: 'مقدمة في البرمجة بلغة بايثون',
    description: 'من أول سطر كود إلى برامج صغيرة مفيدة: المتغيرات، الشروط، الحلقات والدوال.',
    credits: 3,
    icon: '🐍',
    color: '#3B82F6',
    departmentKey: 'كلية تقنية المعلومات::علوم الحاسوب',
    teacherEmail: 'khaled.mansouri@demo.madarek.ly',
    room: 'قاعة 101',
    lectures: [
      { title: 'أول برنامج لك في بايثون', description: 'تشغيل المفسّر، أمر الطباعة، وأخطاء البداية الشائعة.', durationSec: 1560 },
      { title: 'المتغيرات وأنواع البيانات', description: 'الأعداد والنصوص والقيم المنطقية وكيف يختار الحاسوب بينها.', durationSec: 1440 },
      { title: 'الشروط واتخاذ القرار', description: 'جمل if وelif وelse وكيف يفرّع البرنامج مساره.', durationSec: 1620 },
      { title: 'الحلقات التكرارية', description: 'while وfor: متى نتوقف ومتى نمرّ على عناصر قائمة.', durationSec: 1500 },
      { title: 'الدوال وتنظيم الكود', description: 'تعريف الدوال، الوسائط، القيم المرجعة، وتقسيم المشكلة إلى أجزاء.', durationSec: 1680 },
    ],
  },
  {
    code: 'MD101',
    name: 'تشريح الإنسان العام',
    description: 'جولة منظّمية في جسم الإنسان: الأجهزة، بنيتها، وعلاقاتها الوظيفية.',
    credits: 4,
    icon: '🫀',
    color: '#EF5350',
    departmentKey: 'كلية الطب البشري::التشريح',
    teacherEmail: 'salma.benissa@demo.madarek.ly',
    room: 'قاعة المشرّح 1',
    lectures: [
      { title: 'مستويات التنظيم في جسم الإنسان', description: 'من الخلية إلى النسيج إلى العضو إلى الجهاز.', durationSec: 1500 },
      { title: 'الجهاز الهيكلي: العظام والمفاصل', description: 'أنواع العظام، تركيب المفصل، وأشهر المفاصل في الحركة اليومية.', durationSec: 1680 },
      { title: 'الجهاز العضلي وآلية الحركة', description: 'العضلات الإرادية وغير الإرادية وكيف يتحول التقلص إلى حركة.', durationSec: 1440 },
      { title: 'الجهاز الدوري والقلب', description: 'مسار الدم، صمامات القلب، والنبض من منظور تشريحي.', durationSec: 1740 },
      { title: 'الجهاز العصبي: من العصبون إلى المنعكس', description: 'بنية العصبون، الأعصاب القحفية، وقوس المنعكس.', durationSec: 1620 },
    ],
  },
  {
    code: 'MG101',
    name: 'مبادئ الإدارة',
    description: 'التخطيط والتنظيم والقيادة والرقابة: أساسيات إدارة منظمة صغيرة أو كبيرة.',
    credits: 3,
    icon: '📊',
    color: '#7E57C2',
    departmentKey: 'كلية الاقتصاد::إدارة الأعمال',
    teacherEmail: 'omar.sherif@demo.madarek.ly',
    room: 'قاعة 204',
    lectures: [
      { title: 'ماهية الإدارة ووظائفها', description: 'تعريف الإدارة وأربع وظائفها الكبرى بمثال مشروع طالب.', durationSec: 1380 },
      { title: 'التخطيط الاستراتيجي', description: 'من الرؤية إلى الأهداف السنوية إلى خطط العمل الأسبوعية.', durationSec: 1500 },
      { title: 'التنظيم والهياكل الإدارية', description: 'التسلسل الهرمي، نطاق الإشراف، والتنسيق بين الإدارات.', durationSec: 1440 },
      { title: 'القيادة والتحفيز', description: 'أنماط القيادة وما يحرّك فريق العمل فعلًا.', durationSec: 1560 },
    ],
  },
  {
    code: 'MA101',
    name: 'الرياضيات المتقطعة',
    description: 'اللغة الرياضية للحاسوب: المنطق، المجموعات، العلاقات، والمخططات.',
    credits: 3,
    icon: '➗',
    color: '#26A69A',
    departmentKey: 'كلية العلوم::قسم الرياضيات',
    teacherEmail: 'hoda.taher@demo.madarek.ly',
    room: 'قاعة 305',
    lectures: [
      { title: 'المنطق والبراهين', description: 'القضايا المنطقية، الكمّيات، وأشكال البرهان الشائعة.', durationSec: 1500 },
      { title: 'المجموعات والعمليات عليها', description: 'الاتحاد والتقاطع والفرق والتمثيل بمخططات فِن.', durationSec: 1380 },
      { title: 'العلاقات والدوال', description: 'خواص العلاقات: الانعكاسية والتماثل والتعدية.', durationSec: 1560 },
      { title: 'التراتيب والتوافقيات', description: 'مبدأ السلة الحمامة والعد بدون عدّ فردي.', durationSec: 1440 },
      { title: 'نظرية المخططات', description: 'الرؤوس والأضلاع، المسارات، والمخططات المترابطة.', durationSec: 1680 },
    ],
  },
  {
    code: 'CH101',
    name: 'الكيمياء العضوية',
    description: 'كيمياء مركبات الكربون: البنية، التسمية، وتفاعلات المجموعات الوظيفية.',
    credits: 4,
    icon: '⚗️',
    color: '#00897B',
    departmentKey: 'كلية العلوم::قسم الكيمياء',
    teacherEmail: 'youssef.warshafana@demo.madarek.ly',
    room: 'مختبر الكيمياء 2',
    lectures: [
      { title: 'الروابط التساهمية والبنية الجزيئية', description: 'هجينة الأوربتالات وأشكال الجزيئات العضوية.', durationSec: 1500 },
      { title: 'الألكانات والتسمية النظامية', description: 'السلاسل المستقيمة والمتفرعة وقواعد التسمية الدولية.', durationSec: 1560 },
      { title: 'الألكينات وتفاعلات الإضافة', description: 'الرابطة المزدوجة كموضع نشاط في التفاعلات.', durationSec: 1620 },
      { title: 'الكحولات والفينولات', description: 'التصنيف حسب موضع مجموعة الهيدروكسيل وأهم التفاعلات.', durationSec: 1440 },
      { title: 'الأحماض الكربوكسيلية والإسترات', description: 'من الخل إلى العطور: كيف تتكوّن الإسترات.', durationSec: 1560 },
    ],
  },
  {
    code: 'HI101',
    name: 'تاريخ ليبيا الحديث',
    description: 'من أواخر العهد العثماني إلى بناء الدولة الحديثة: قراءة في الأحداث والشواهد.',
    credits: 2,
    icon: '🏛️',
    color: '#8D6E63',
    departmentKey: 'كلية الآداب::التاريخ',
    teacherEmail: 'mariam.ahmar@demo.madarek.ly',
    room: 'قاعة 12',
    lectures: [
      { title: 'ليبيا أواخر العهد العثماني', description: 'الولايات الثلاث والمجتمع والمشهد التعليمي قبل التغيير الكبير.', durationSec: 1440 },
      { title: 'الاحتلال الإيطالي والمقاومة', description: 'مراحل الاحتلال ومحطات المقاومة وأثرها في المجتمع.', durationSec: 1620 },
      { title: 'عصر المملكة الليبية', description: 'الاستقلال، بناء المؤسسات، وتحولات الخمسينيات والستينيات.', durationSec: 1500 },
      { title: 'خطوات بناء الدولة الحديثة', description: 'التعليم والبنية الأساسية ومسار المؤسسات عبر العقود.', durationSec: 1380 },
    ],
  },
  {
    code: 'EN101',
    name: 'اللغة الإنجليزية الأكاديمية',
    description: 'مهارات القراءة والكتابة والإلقاء لطلبة الجامعة بمصطلحات دقيقة.',
    credits: 2,
    icon: '🔤',
    color: '#2952C8',
    departmentKey: 'كلية الآداب::اللغة الإنجليزية',
    teacherEmail: 'mariam.ahmar@demo.madarek.ly',
    room: 'معمل اللغة 1',
    lectures: [
      { title: 'مهارات القراءة الأكاديمية', description: 'القراءة السريعة، الفكرة الرئيسة، وتدوين الملاحظات.', durationSec: 1380 },
      { title: 'كتابة الفقرة الأكاديمية', description: 'جملة الموضوع، الدعامات، والروابط بين الجمل.', durationSec: 1500 },
      { title: 'المصطلحات العلمية الشائعة', description: 'جذور لاتينية ويونانية تفسّر نصف المصطلح الجامعي.', durationSec: 1320 },
      { title: 'العرض الشفوي ومهارات الإلقاء', description: 'بنية العرض، لغة الجسد، وإدارة الوقت أمام الجمهور.', durationSec: 1440 },
    ],
  },
  {
    code: 'NT101',
    name: 'شبكات الحاسوب',
    description: 'كيف تنتقل البيانات بين الأجهزة: الطبقات، العنونة، والأجهزة الشبكية.',
    credits: 3,
    icon: '🌐',
    color: '#5C6BC0',
    departmentKey: 'كلية تقنية المعلومات::علوم الحاسوب',
    teacherEmail: 'khaled.mansouri@demo.madarek.ly',
    room: 'معمل الشبكات',
    lectures: [
      { title: 'مقدمة في شبكات الحاسوب', description: 'لماذا شبكات؟ أنواعها حسب المدى وأمثلة من الحرم الجامعي.', durationSec: 1320 },
      { title: 'الطبقات ونموذج الاتصال المرجعي', description: 'رحلة الرسالة من التطبيق إلى الوسط الفيزيائي.', durationSec: 1560 },
      { title: 'العنونة وعناوين الشبكات', description: 'بنية العنوان، القناع، وحساب الشبكات بمثال محلول.', durationSec: 1500 },
      { title: 'الأجهزة الشبكية وتوصيلها', description: 'المبدّل والموجّه ونقطة الوصول: من يفعل ماذا؟', durationSec: 1380 },
      { title: 'بروتوكولات النقل والموثوقية', description: 'مقابل: الموثوقية والسرعة ومتى نفضّل كلًا منهما.', durationSec: 1620 },
      { title: 'أساسيات أمن الشبكات', description: 'الجدار الناري، التشفير، وممارسات الحرم الجامعي الآمن.', durationSec: 1440 },
    ],
  },
];

// ─── Students (40) — Arabic names, emails userNN@demo.madarek.ly ─
const STUDENT_NAMES: string[] = [
  'أحمد بن يونس', 'سارة الفيتوري', 'محمد الزروق', 'هدى بن عامر',
  'عبد السلام الككلي', 'ريم الشريف', 'منصور العجيلي', 'آية المغربي',
  'طارق بن سالم', 'نورة الحسني', 'إبراهيم المصراتي', 'ليلى البرعصي',
  'يوسف الرقيعي', 'ملاك بن حميدة', 'الصديق الزليتني', 'وعد السويحلي',
  'بلال الطرابلسي', 'جود بن عيسى', 'خديجة المرابط', 'عمر بن يحيى',
  'أسماء القدادري', 'نور الدين بن عمر', 'فاطمة بن سعيد', 'صالح العبيدي',
  'مريم بن غليطة', 'حسن درسي', 'زينب الفرجاني', 'معتز بن مسعود',
  'رقية الشويهدي', 'أنس الكردي', 'بشرى الباروني', 'المنتصر المصراتي',
  'سلمى الزنتاني', 'وليد بن سليمان', 'حنان العجيلي', 'كريم الفيتوري',
  'أميرة الحسني', 'خالد بن يحيى', 'ندى المغربي', 'طارق بن عامر',
];

const STUDENT_COLORS = ['#4F8EF7', '#3DD68C', '#F5A623', '#9B59B6', '#EF6C00', '#2EC4B6'];

// ─── Helpers ─────────────────────────────────────────────────────
/** Days ago (for «recent» demo timestamps). */
const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 60 * 60 * 1000);
/** Days ahead (for future exam windows / deadlines). */
const ahead = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

interface DemoSummary {
  institution: string;
  courses: number;
  lectures: number;
  teachers: number;
  students: number;
  enrollments: number;
  grades: number;
  examTemplates: number;
  messages: number;
  notifications: number;
}

export async function seedDemoR330(prisma: PrismaClient): Promise<DemoSummary> {
  const summary: DemoSummary = {
    institution: INSTITUTION_SLUG,
    courses: 0,
    lectures: 0,
    teachers: 0,
    students: 0,
    enrollments: 0,
    grades: 0,
    examTemplates: 0,
    messages: 0,
    notifications: 0,
  };

  // ── 1. the demo tenant — reuse the established row (never rebrand) ──
  // seed.ts keeps this slug/name; the fixed id appears ONLY on the
  // fresh-create branch so a brand-new database lands on the same
  // reference id the tests (and seed.ts) expect.
  const institution = await prisma.institution.upsert({
    where: { slug: INSTITUTION_SLUG },
    update: {},
    create: {
      id: 'inst-madarek-demo',
      name: 'مؤسسة مدارك النموذجية',
      nameEn: 'Madarek Model Institution',
      slug: INSTITUTION_SLUG,
      status: 'ACTIVE',
    },
  });

  // ── 2. faculties — SAME composite keys seed.ts uses (حرم المعرفة) ──
  // so existing rows are found rather than duplicated.
  const facultyNames = [
    { name: 'كلية تقنية المعلومات', nameEn: 'Information Technology', iconEmoji: '💻' },
    { name: 'كلية الطب البشري', nameEn: 'Human Medicine', iconEmoji: '⚕️' },
    { name: 'كلية العلوم', nameEn: 'Sciences', iconEmoji: '🔬' },
    { name: 'كلية الاقتصاد', nameEn: 'Economics', iconEmoji: '💼' },
    { name: 'كلية الآداب', nameEn: 'Arts', iconEmoji: '📚' },
  ];
  const facultyIds = new Map<string, string>();
  for (const f of facultyNames) {
    const row = await prisma.faculty.upsert({
      where: { institutionId_name_city: { institutionId: institution.id, name: f.name, city: 'حرم المعرفة' } },
      update: { nameEn: f.nameEn, iconEmoji: f.iconEmoji },
      create: { ...f, city: 'حرم المعرفة', institutionId: institution.id },
    });
    facultyIds.set(f.name, row.id);
  }

  // ── 3. departments — reuse existing names where seed.ts created them ──
  const departmentIds = new Map<string, string>();
  const DEPARTMENT_DEFS = [
    { facultyName: 'كلية تقنية المعلومات', name: 'علوم الحاسوب', nameEn: 'Computer Science' },
    { facultyName: 'كلية الطب البشري', name: 'التشريح', nameEn: 'Anatomy' },
    { facultyName: 'كلية العلوم', name: 'قسم الرياضيات', nameEn: 'Mathematics' },
    { facultyName: 'كلية العلوم', name: 'قسم الكيمياء', nameEn: 'Chemistry' },
    { facultyName: 'كلية الاقتصاد', name: 'إدارة الأعمال', nameEn: 'Business Administration' },
    { facultyName: 'كلية الآداب', name: 'التاريخ', nameEn: 'History' },
    { facultyName: 'كلية الآداب', name: 'اللغة الإنجليزية', nameEn: 'English Language' },
  ];
  for (const d of DEPARTMENT_DEFS) {
    const facultyId = facultyIds.get(d.facultyName)!;
    const row = await prisma.department.upsert({
      where: { facultyId_name: { facultyId, name: d.name } },
      update: {},
      create: { name: d.name, nameEn: d.nameEn, facultyId },
    });
    departmentIds.set(`${d.facultyName}::${d.name}`, row.id);
  }

  // ── 4. teachers: user → membership → profile (seed.ts order) ──
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const teacherIds = new Map<string, string>();
  for (const t of TEACHERS) {
    const user = await prisma.user.upsert({
      where: { email: t.email },
      // re-run: the documented demo password stays in sync with the docs
      update: { passwordHash, isActive: true },
      create: {
        email: t.email,
        passwordHash,
        role: Role.TEACHER,
        firstName: t.firstName,
        lastName: t.lastName,
        avatarInitials: `${t.firstName.slice(0, 1)}${t.lastName.slice(0, 1)}`,
        avatarColor: t.color,
        emailVerifiedAt: new Date(),
      },
    });
    const membership = await prisma.membership.upsert({
      where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
      update: { role: Role.TEACHER, isActive: true },
      create: { userId: user.id, institutionId: institution.id, role: Role.TEACHER, isActive: true },
    });
    // TeacherProfile has no natural unique key — resolve by
    // (user, membership institution), create when absent (seed.ts pattern).
    const existingProfile = await prisma.teacherProfile.findFirst({
      where: { userId: user.id, membership: { institutionId: institution.id } },
      select: { id: true },
    });
    if (!existingProfile) {
      await prisma.teacherProfile.create({
        data: {
          userId: user.id,
          membershipId: membership.id,
          specialty: t.specialty,
          rank: t.rank,
          degreeLevel: t.degree,
          yearsExperience: t.years,
          departmentId: departmentIds.get(t.departmentKey)!,
          bio: t.bio,
          officeLocation: t.office,
          officeHours: t.officeHours,
        },
      });
    }
    teacherIds.set(t.email, user.id);
    summary.teachers++;
  }

  // ── 5. courses + offerings + lectures + exam templates ──
  const offeringIds: string[] = [];
  for (const c of COURSES) {
    const course = await prisma.course.upsert({
      where: { institutionId_code: { institutionId: institution.id, code: c.code } },
      update: {},
      create: {
        code: c.code,
        name: c.name,
        description: c.description,
        credits: c.credits,
        iconEmoji: c.icon,
        themeColor: c.color,
        departmentId: departmentIds.get(c.departmentKey)!,
        institutionId: institution.id,
      },
    });
    summary.courses++;

    const teacherId = teacherIds.get(c.teacherEmail)!;
    const offering = await prisma.courseOffering.upsert({
      where: { courseId_term_teacherId: { courseId: course.id, term: TERM, teacherId } },
      update: {},
      create: { courseId: course.id, teacherId, term: TERM, room: c.room, capacity: 40 },
    });
    offeringIds.push(offering.id);

    // 5a. lectures — create-once, guarded by (offering, title)
    for (const [i, lec] of c.lectures.entries()) {
      const exists = await prisma.lecture.findFirst({
        where: { offeringId: offering.id, title: lec.title },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.lecture.create({
        data: {
          offeringId: offering.id,
          title: lec.title,
          description: lec.description,
          ordinal: i,
          durationSec: lec.durationSec,
          // the honest self-hosted placeholder clip the player ships
          videoUrl: `/media/generated/chapter-card-${c.code.toLowerCase()}-${i + 1}.mp4`,
          posterUrl: '/brand/madarek-mark.svg',
        },
      });
      summary.lectures++;
    }

    // 5b. exam templates — one published quiz + one approved midterm
    const quizTitle = `الاختبار القصير الأول — ${c.name}`;
    const quizExists = await prisma.examTemplate.findFirst({
      where: { offeringId: offering.id, title: quizTitle },
      select: { id: true },
    });
    if (!quizExists) {
      await prisma.examTemplate.create({
        data: {
          offeringId: offering.id,
          title: quizTitle,
          kind: ExamKind.QUIZ,
          description: `يغطي المحاضرات الأولى من مقرر ${c.name} — أسئلة اختيار من متعدد.`,
          durationMin: 20,
          passingScore: 50,
          randomized: true,
          status: ExamStatus.PUBLISHED,
          authorId: teacherId,
          openAt: ago(2),
          closeAt: ahead(12),
        },
      });
      summary.examTemplates++;
    }
    const midtermTitle = `امتحان منتصف الفصل — ${c.name}`;
    const midtermExists = await prisma.examTemplate.findFirst({
      where: { offeringId: offering.id, title: midtermTitle },
      select: { id: true },
    });
    if (!midtermExists) {
      await prisma.examTemplate.create({
        data: {
          offeringId: offering.id,
          title: midtermTitle,
          kind: ExamKind.MIDTERM,
          description: `امتحان كتابي شامل لنصف مقرر ${c.name} — يُعلن مكان التقلد قبل الأسبوع.`,
          durationMin: 60,
          passingScore: 50,
          randomized: false,
          status: ExamStatus.APPROVED,
          authorId: teacherId,
          openAt: ahead(9),
          closeAt: ahead(10),
        },
      });
      summary.examTemplates++;
    }
  }

  // ── 6. students: user → membership → profile (40 صفًّا) ──
  const cohort: { id: string }[] = [];
  for (const [i, fullName] of STUDENT_NAMES.entries()) {
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || 'العرض';
    const email = `user${String(i + 1).padStart(2, '0')}@demo.madarek.ly`;
    const universityId = `DEMO-2026-${String(i + 101).padStart(3, '0')}`;
    // spread the roster across the departments the 8 courses live in
    const homeDeptKey = COURSES[i % COURSES.length]!.departmentKey;
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash, isActive: true },
      create: {
        email,
        passwordHash,
        role: Role.STUDENT,
        firstName: firstName ?? 'طالب',
        lastName,
        avatarInitials: `${(firstName ?? 'ط').slice(0, 1)}${lastName.slice(0, 1)}`,
        avatarColor: STUDENT_COLORS[i % STUDENT_COLORS.length]!,
        emailVerifiedAt: new Date(),
      },
    });
    const membership = await prisma.membership.upsert({
      where: { userId_institutionId: { userId: user.id, institutionId: institution.id } },
      update: { role: Role.STUDENT, isActive: true },
      create: { userId: user.id, institutionId: institution.id, role: Role.STUDENT, isActive: true },
    });
    const homeDept = await prisma.department.findUnique({
      where: { id: departmentIds.get(homeDeptKey)! },
      select: { facultyId: true },
    });
    await prisma.studentProfile.upsert({
      where: { institutionId_universityId: { institutionId: institution.id, universityId } },
      update: { membershipId: membership.id, departmentId: departmentIds.get(homeDeptKey)! },
      create: {
        userId: user.id,
        membershipId: membership.id,
        institutionId: institution.id,
        universityId,
        facultyId: homeDept!.facultyId,
        departmentId: departmentIds.get(homeDeptKey)!,
        year: 1 + (i % 4),
        gpa: Math.round((2.2 + ((i * 37) % 170) / 100) * 100) / 100,
        totalXp: 120 + (i * 53) % 900,
        level: 1 + (i % 4),
      },
    });
    cohort.push({ id: user.id });
    summary.students++;
  }

  // ── 7. enrollments: 5 of 8 courses each (deterministic skip pattern) ──
  // progressPct carries a believable spread — demo data should look
  // alive, and the registrar demo-reset sweeps this domain wholesale.
  for (const [i, stu] of cohort.entries()) {
    for (const [idx, offeringId] of offeringIds.entries()) {
      if ((i + idx) % 8 === 3) continue; // skip pattern → 5 of 8 each
      const progressPct = 18 + ((i * 13 + idx * 29) % 63); // 18–80
      await prisma.enrollment.upsert({
        where: { studentId_offeringId: { studentId: stu.id, offeringId } },
        update: { progressPct },
        create: { studentId: stu.id, offeringId, status: 'active', progressPct },
      });
      summary.enrollments++;
    }
  }

  // ── 8. grades: QUIZ_1 for everyone enrolled + MIDTERM for half ──
  // deterministic spread 55–97 — a believable bell, not a line.
  const FEEDBACK = [
    'أداء جيد — راجع الوحدة الثانية قبل الامتحان القادم.',
    'متميز في الواجبات، حافظ على هذا المستوى.',
    'يحتاج مراجعة الأساسيات — ساعات المكتب متاحة لك.',
    'تحسّن واضح مقارنة بالأسبوع الأول.',
  ];
  for (const [i, stu] of cohort.entries()) {
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: stu.id, offering: { term: TERM } },
      select: { offeringId: true },
      orderBy: { enrolledAt: 'asc' },
    });
    for (const [idx, e] of enrollments.entries()) {
      await prisma.grade.upsert({
        where: { offeringId_studentId_kind: { offeringId: e.offeringId, studentId: stu.id, kind: GradeKind.QUIZ_1 } },
        update: {},
        create: {
          offeringId: e.offeringId,
          studentId: stu.id,
          kind: GradeKind.QUIZ_1,
          score: 55 + ((i * 7 + idx * 11) % 43),
          weight: 10,
          feedback: (i + idx) % 4 === 0 ? FEEDBACK[(i + idx) % FEEDBACK.length]! : null,
        },
      });
      summary.grades++;
      if ((i + idx) % 2 === 0) {
        await prisma.grade.upsert({
          where: { offeringId_studentId_kind: { offeringId: e.offeringId, studentId: stu.id, kind: GradeKind.MIDTERM } },
          update: {},
          create: {
            offeringId: e.offeringId,
            studentId: stu.id,
            kind: GradeKind.MIDTERM,
            score: 52 + ((i * 9 + idx * 5) % 47),
            weight: 30,
            feedback: (i + idx) % 5 === 0 ? FEEDBACK[(i + idx) % FEEDBACK.length]! : null,
          },
        });
        summary.grades++;
      }
    }
  }

  // ── 9. direct messages — 10 رسالة إنسانية بين الطلبة وأساتذتهم ──
  // Deterministic ids keep re-runs from duplicating (no natural unique).
  const cs = TEACHERS[0]!; // خالد المنصوري
  const md = TEACHERS[1]!; // سلمى بن عيسى
  const ma = TEACHERS[3]!; // هدى الطاهر
  const hi = TEACHERS[5]!; // مريم الأحمر
  const stuId = (n: number) => cohort[n - 1]!.id; // userNN → id
  const MESSAGES: { id: string; from: string; to: string; body: string; daysAgo: number; read: boolean }[] = [
    { id: 'seed-demo-msg-01', from: stuId(1), to: teacherIds.get(cs.email)!, body: 'دكتور، هل موضوع الدوال مشمول في الاختبار القصير لمقرر البرمجة؟', daysAgo: 3, read: true },
    { id: 'seed-demo-msg-02', from: teacherIds.get(cs.email)!, to: stuId(1), body: 'نعم، حتى نهاية الحلقات التكرارية. ركّز على التمارين الثالثة والرابعة.', daysAgo: 3, read: true },
    { id: 'seed-demo-msg-03', from: stuId(2), to: teacherIds.get(md.email)!, body: 'تحية طيبة دكتورة، هل يمكن نشر شرائح محاضرة الجهاز الدوري؟', daysAgo: 2, read: true },
    { id: 'seed-demo-msg-04', from: teacherIds.get(md.email)!, to: stuId(2), body: 'نُشرت في صفحة المقرر مع مذكرة الملخص. موفقة.', daysAgo: 2, read: true },
    { id: 'seed-demo-msg-05', from: stuId(3), to: teacherIds.get(ma.email)!, body: 'دكتورة، عندي سؤال في تمرين التراتيب رقم سبعة.', daysAgo: 1, read: true },
    { id: 'seed-demo-msg-06', from: teacherIds.get(ma.email)!, to: stuId(3), body: 'أرسلي محاولتك وسنناقشها في الساعات المكتبية غدًا.', daysAgo: 1, read: true },
    { id: 'seed-demo-msg-07', from: stuId(5), to: teacherIds.get(hi.email)!, body: 'مساء الخير، هل مرجع تاريخ ليبيا الحديث متوفر في المكتبة؟', daysAgo: 1, read: true },
    { id: 'seed-demo-msg-08', from: teacherIds.get(hi.email)!, to: stuId(5), body: 'متوفر نسخة إلكترونية، ستجد الرابط في مواد المقرر.', daysAgo: 0, read: false },
    { id: 'seed-demo-msg-09', from: stuId(7), to: teacherIds.get(cs.email)!, body: 'شكرًا دكتور على الشرح الواضح في محاضرة اليوم.', daysAgo: 0, read: false },
    { id: 'seed-demo-msg-10', from: teacherIds.get(cs.email)!, to: stuId(7), body: 'عفوًا، سعدت بذلك. أي استفسار أنا هنا.', daysAgo: 0, read: false },
  ];
  for (const m of MESSAGES) {
    await prisma.message.upsert({
      where: { id: m.id },
      update: { body: m.body, readAt: m.read ? ago(m.daysAgo, 2) : null },
      create: {
        id: m.id,
        fromUserId: m.from,
        toUserId: m.to,
        body: m.body,
        createdAt: ago(m.daysAgo, 1),
        readAt: m.read ? ago(m.daysAgo, 2) : null,
      },
    });
    summary.messages++;
  }

  // ── 10. notifications — 8 إشعارات بعناوين بشرية مقروءة ──
  const NOTIFICATIONS: {
    id: string; userId: string; type: NotificationType; icon: string;
    title: string; body: string; daysAgo: number; read: boolean;
  }[] = [
    { id: 'seed-demo-ntf-01', userId: stuId(1), type: NotificationType.ACADEMIC, icon: '📝', title: 'تم فتح باب التسجيل لمقرر الكيمياء العضوية', body: 'التسجيل متاح حتى نهاية الأسبوع — المقاعد محدودة', daysAgo: 0, read: false },
    { id: 'seed-demo-ntf-02', userId: stuId(2), type: NotificationType.URGENT, icon: '⏰', title: 'تأجلت محاضرة الرياضيات المتقطعة', body: 'أُرجئت محاضرة اليوم إلى الخميس الساعة العاشرة صباحًا', daysAgo: 0, read: false },
    { id: 'seed-demo-ntf-03', userId: stuId(3), type: NotificationType.ACADEMIC, icon: '🎯', title: 'نُشرت درجات الاختبار القصير', body: 'درجتك في الاختبار القصير لمقرر مقدمة في البرمجة بلغة بايثون متاحة الآن', daysAgo: 1, read: false },
    { id: 'seed-demo-ntf-04', userId: stuId(4), type: NotificationType.URGENT, icon: '⏰', title: 'تذكير بامتحان منتصف الفصل', body: 'امتحان منتصف الفصل لتشريح الإنسان العام يوم الأحد القادم', daysAgo: 1, read: true },
    { id: 'seed-demo-ntf-05', userId: stuId(5), type: NotificationType.SOCIAL, icon: '💬', title: 'رد جديد من د. مريم الأحمر', body: 'ردّت على رسالتك بخصوص مرجع تاريخ ليبيا الحديث', daysAgo: 2, read: true },
    { id: 'seed-demo-ntf-06', userId: stuId(6), type: NotificationType.SYSTEM, icon: '🗓️', title: 'صدر جدول الامتحانات النهائي', body: 'اطّلع على جدول امتحانات الفصل الحالي في صفحة الجدول', daysAgo: 3, read: true },
    { id: 'seed-demo-ntf-07', userId: stuId(7), type: NotificationType.SOCIAL, icon: '🎤', title: 'الندوة الأسبوعية: مهارات العرض الأكاديمي', body: 'تنعقد الندوة يوم الثلاثاء في قاعة المؤتمرات — الحضور مفتوح', daysAgo: 4, read: true },
    { id: 'seed-demo-ntf-08', userId: stuId(8), type: NotificationType.SYSTEM, icon: '📚', title: 'اكتمل تحديث مكتبة المقررات', body: 'أُضيفت مراجع جديدة لمقررات الفصل الحالي في المكتبة الإلكترونية', daysAgo: 5, read: true },
  ];
  for (const n of NOTIFICATIONS) {
    await prisma.notification.upsert({
      where: { id: n.id },
      update: {
        type: n.type,
        icon: n.icon,
        title: n.title,
        body: n.body,
        createdAt: ago(n.daysAgo),
        readAt: n.read ? ago(n.daysAgo, 3) : null,
      },
      create: {
        id: n.id,
        userId: n.userId,
        type: n.type,
        icon: n.icon,
        title: n.title,
        body: n.body,
        createdAt: ago(n.daysAgo),
        readAt: n.read ? ago(n.daysAgo, 3) : null,
      },
    });
    summary.notifications++;
  }

  return summary;
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    const s = await seedDemoR330(prisma);
    console.log(
      `🌱 بذرة العرض النظيفة: مؤسسة «مؤسسة مدارك النموذجية» — ${s.courses} مقررات، ${s.lectures} محاضرات، ` +
        `${s.teachers} أساتذة، ${s.students} طلبة، ${s.enrollments} تسجيل، ${s.grades} درجة، ` +
        `${s.examTemplates} نماذج امتحان، ${s.messages} رسائل، ${s.notifications} إشعارات — كل النصوص المعروضة نظيفة (بلا سلاسل فنية).`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Standalone entry (tsx prisma/seed-demo-r330.ts). The direct-run guard
// keeps a future `import { seedDemoR330 }` from double-running the pack.
if (process.argv[1]?.includes('seed-demo-r330')) void main();
