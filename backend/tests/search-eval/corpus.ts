/**
 * R350 S4 — the golden-set corpus: a fixed, seeded synthetic institution
 * (~50 entities across the discovery kinds, Arabic/English/mixed) the
 * eval harness ranks with the REAL pure engine. Deterministic ids so
 * the committed baseline.json never drifts between runs.
 */

export interface CorpusEntity {
  id: string;
  kind: string;
  /** The rank haystacks, in weight order (title 1.0 → secondary 0.7). */
  haystacks: string[];
  /** The entity's own display title (the rankAndPaginate tie-break). */
  title: string;
  /** true = visible to a STUDENT (the role-leak negative set reads this). */
  studentVisible: boolean;
  /** true = staff-only (questions) — a student NEVER sees these. */
  staffOnly?: boolean;
  /** the owning institution ('a' | 'b') — cross-institution leak pin. */
  institution: 'a' | 'b' | 'shared';
  /* r353-F — the identifier arms (the registrar's lookups). Students
   * carry the User email + the StudentProfile universityId and phone
   * keys exactly as the route's select returns them; teachers carry the
   * email. */
  email?: string;
  universityId?: string;
  studentPhoneNormalized?: string;
  guardianPhoneNormalized?: string;
}

const A = 'a';

/** Students (User rows: first/last name haystacks + the identifier arms). */
export const STUDENTS: CorpusEntity[] = [
  { id: 'st-1', kind: 'student', haystacks: ['محمد', 'المهدي', 'محمد المهدي'], title: 'محمد المهدي', studentVisible: false, institution: A,
    email: 'mohamed.mahdi@students.madarek.ly', universityId: 'UZ-2024-00001', studentPhoneNormalized: '218912345678', guardianPhoneNormalized: '218912345678' },
  { id: 'st-2', kind: 'student', haystacks: ['أحمد', 'الطاهر', 'أحمد الطاهر'], title: 'أحمد الطاهر', studentVisible: false, institution: A,
    email: 'ahmed.taher@students.madarek.ly', universityId: 'UZ-2024-00002', studentPhoneNormalized: '218913456789', guardianPhoneNormalized: undefined },
  { id: 'st-3', kind: 'student', haystacks: ['هدى', 'الفيتوري', 'هدى الفيتوري'], title: 'هدى الفيتوري', studentVisible: false, institution: A,
    email: 'huda.faitouri@students.madarek.ly', universityId: 'UZ-2024-00003', studentPhoneNormalized: '218922223333', guardianPhoneNormalized: undefined },
  { id: 'st-4', kind: 'student', haystacks: ['سالم', 'القاسم', 'سالم القاسم'], title: 'سالم القاسم', studentVisible: false, institution: A,
    email: 'salem.gasem@students.madarek.ly', universityId: '30351', studentPhoneNormalized: undefined, guardianPhoneNormalized: '218917777888' },
  { id: 'st-5', kind: 'student', haystacks: ['عبدالله', 'السني', 'عبدالله السني'], title: 'عبدالله السني', studentVisible: false, institution: A,
    email: 'abdullah.seni@students.madarek.ly', universityId: '30352', studentPhoneNormalized: '218915555666', guardianPhoneNormalized: undefined },
  { id: 'st-6', kind: 'student', haystacks: ['مريم', 'بن عثمان', 'مريم بن عثمان'], title: 'مريم بن عثمان', studentVisible: false, institution: A,
    email: 'mariam.benothman@students.madarek.ly', universityId: '30353', studentPhoneNormalized: '218914444555', guardianPhoneNormalized: undefined },
  { id: 'st-7', kind: 'student', haystacks: ['فاطمة', 'الشرقاوي', 'فاطمة الشرقاوي'], title: 'فاطمة الشرقاوي', studentVisible: false, institution: 'b' },
  { id: 'st-8', kind: 'student', haystacks: ['عمر', 'المفتي', 'عمر المفتي'], title: 'عمر المفتي', studentVisible: false, institution: 'b' },
  /* r353-F — the fold-stress roster: the names a plain Libyan keyboard
   * types wrong (multi-seat hamza words, hamza+ta-marbuta, alif-maqsura). */
  { id: 'st-9', kind: 'student', haystacks: ['أسامة', 'العبار', 'أسامة العبار'], title: 'أسامة العبار', studentVisible: false, institution: A,
    email: 'usama.abar@students.madarek.ly', universityId: 'UZ-2024-00009', studentPhoneNormalized: '218918886666', guardianPhoneNormalized: undefined },
  { id: 'st-10', kind: 'student', haystacks: ['إبراهيم', 'الفيتوري', 'إبراهيم الفيتوري'], title: 'إبراهيم الفيتوري', studentVisible: false, institution: A,
    email: 'ibrahim.faitouri@students.madarek.ly', universityId: '30360', studentPhoneNormalized: '218919997777', guardianPhoneNormalized: undefined },
  { id: 'st-11', kind: 'student', haystacks: ['مليكة', 'بوزيد', 'مليكة بوزيد'], title: 'مليكة بوزيد', studentVisible: false, institution: A,
    email: 'malika.bouzid@students.madarek.ly', universityId: '30361', studentPhoneNormalized: '218912223444', guardianPhoneNormalized: '218912223444' },
];

/** Teachers. */
export const TEACHERS: CorpusEntity[] = [
  { id: 'tc-1', kind: 'teacher', haystacks: ['خالد', 'بن موسى', 'خالد بن موسى'], title: 'خالد بن موسى', studentVisible: false, institution: A,
    email: 'khaled.benmoussa@madarek.ly' },
  { id: 'tc-2', kind: 'teacher', haystacks: ['نادية', 'البراني', 'نادية البراني'], title: 'نادية البراني', studentVisible: false, institution: A,
    email: 'nadia.barani@madarek.ly' },
  { id: 'tc-3', kind: 'teacher', haystacks: ['Ibrahim', 'Alfashtaki', 'Ibrahim Alfashtaki'], title: 'Ibrahim Alfashtaki', studentVisible: false, institution: 'b' },
];

/** Faculties + departments + institutions. */
export const ORGS: CorpusEntity[] = [
  { id: 'fa-1', kind: 'faculty', haystacks: ['كلية الهندسة', 'Faculty of Engineering'], title: 'كلية الهندسة', studentVisible: true, institution: A },
  { id: 'fa-2', kind: 'faculty', haystacks: ['كلية العلوم', 'Faculty of Science'], title: 'كلية العلوم', studentVisible: true, institution: A },
  { id: 'fa-3', kind: 'faculty', haystacks: ['كلية الطب البشري'], title: 'كلية الطب البشري', studentVisible: true, institution: 'b' },
  { id: 'dp-1', kind: 'department', haystacks: ['علوم الحاسب'], title: 'علوم الحاسب', studentVisible: true, institution: A },
  { id: 'dp-2', kind: 'department', haystacks: ['الهندسة الكهربائية'], title: 'الهندسة الكهربائية', studentVisible: true, institution: A },
  { id: 'in-1', kind: 'institution', haystacks: ['مؤسسة مدارك النموذجية', 'Madarek Model Institution'], title: 'مؤسسة مدارك النموذجية', studentVisible: true, institution: A },
];

/** Courses (offering rows: course name + code). */
export const COURSES: CorpusEntity[] = [
  { id: 'co-1', kind: 'course', haystacks: ['أساسيات الشبكات', 'CS201'], title: 'أساسيات الشبكات', studentVisible: true, institution: A },
  { id: 'co-2', kind: 'course', haystacks: ['قواعد البيانات', 'CS310'], title: 'قواعد البيانات', studentVisible: true, institution: A },
  { id: 'co-3', kind: 'course', haystacks: ['الرياضيات المتقطعة', 'MATH204'], title: 'الرياضيات المتقطعة', studentVisible: true, institution: A },
  { id: 'co-4', kind: 'course', haystacks: ['هندسة البرمجيات', 'SE401'], title: 'هندسة البرمجيات', studentVisible: true, institution: A },
  { id: 'co-5', kind: 'course', haystacks: ['البرمجة الكائنية', 'OOP210'], title: 'البرمجة الكائنية', studentVisible: true, institution: A },
  { id: 'co-6', kind: 'course', haystacks: ['شبكات الحاسب المتقدمة', 'CS501'], title: 'شبكات الحاسب المتقدمة', studentVisible: true, institution: A },
];

/** Lectures + materials. */
export const LECTURES: CorpusEntity[] = [
  { id: 'le-1', kind: 'lecture', haystacks: ['مقدمة في الشبكات'], title: 'مقدمة في الشبكات', studentVisible: true, institution: A },
  { id: 'le-2', kind: 'lecture', haystacks: ['طبقة التطبيق'], title: 'طبقة التطبيق', studentVisible: true, institution: A },
  { id: 'le-3', kind: 'lecture', haystacks: ['خوارزميات الرسم البياني'], title: 'خوارزميات الرسم البياني', studentVisible: true, institution: A },
  { id: 'le-4', kind: 'lecture', haystacks: ['الاستعلامات المتشعبة'], title: 'الاستعلامات المتشعبة', studentVisible: true, institution: A },
];
export const MATERIALS: CorpusEntity[] = [
  { id: 'ma-1', kind: 'material', haystacks: ['ملف شرح الشبكات'], title: 'ملف شرح الشبكات', studentVisible: true, institution: A },
  { id: 'ma-2', kind: 'material', haystacks: ['ورقة تمارين الرياضيات'], title: 'ورقة تمارين الرياضيات', studentVisible: true, institution: A },
  { id: 'ma-3', kind: 'material', haystacks: ['عرض قواعد البيانات'], title: 'عرض قواعد البيانات', studentVisible: true, institution: A },
];

/** Papers + tracks + books + jobs + events + announcements. */
export const PAPERS: CorpusEntity[] = [
  { id: 'pa-1', kind: 'paper', haystacks: ['أمن الشبكات اللاسلكية في ليبيا'], title: 'أمن الشبكات اللاسلكية في ليبيا', studentVisible: true, institution: A },
  { id: 'pa-2', kind: 'paper', haystacks: ['تحليل أداء قواعد البيانات'], title: 'تحليل أداء قواعد البيانات', studentVisible: true, institution: A },
];
export const TRACKS: CorpusEntity[] = [
  { id: 'tr-1', kind: 'track', haystacks: ['مسار الشبكات', 'Networking Track'], title: 'مسار الشبكات', studentVisible: true, institution: 'shared' },
  { id: 'tr-2', kind: 'track', haystacks: ['مسار تعلم الآلة', 'Machine Learning'], title: 'مسار تعلم الآلة', studentVisible: true, institution: 'shared' },
];
export const BOOKS: CorpusEntity[] = [
  { id: 'bk-1', kind: 'book', haystacks: ['أساسيات الشبكات', 'Tanenbaum'], title: 'أساسيات الشبكات', studentVisible: true, institution: 'shared' },
  { id: 'bk-2', kind: 'book', haystacks: ['قواعد بيانات عملية', 'Elmasri'], title: 'قواعد بيانات عملية', studentVisible: true, institution: 'shared' },
];
export const JOBS: CorpusEntity[] = [
  { id: 'jo-1', kind: 'job', haystacks: ['مهندس شبكات', 'شركة الليبية للاتصالات'], title: 'مهندس شبكات', studentVisible: true, institution: 'shared' },
  { id: 'jo-2', kind: 'job', haystacks: ['مطور واجهات', 'LTT'], title: 'مطور واجهات', studentVisible: true, institution: 'shared' },
];
export const EVENTS: CorpusEntity[] = [
  { id: 'ev-1', kind: 'event', haystacks: ['ملتقى الذكاء الاصطناعي'], title: 'ملتقى الذكاء الاصطناعي', studentVisible: true, institution: A },
  { id: 'ev-2', kind: 'event', haystacks: ['معرض الكتاب السنوي'], title: 'معرض الكتاب السنوي', studentVisible: true, institution: A },
];
export const ANNOUNCEMENTS: CorpusEntity[] = [
  { id: 'an-1', kind: 'announcement', haystacks: ['إعلان عن فتح باب التسجيل'], title: 'إعلان عن فتح باب التسجيل', studentVisible: true, institution: A },
  { id: 'an-2', kind: 'announcement', haystacks: ['ورشة عمل الشبكات'], title: 'ورشة عمل الشبكات', studentVisible: true, institution: A },
];

/** Questions — staff-only by law. */
export const QUESTIONS: CorpusEntity[] = [
  { id: 'qu-1', kind: 'question', haystacks: ['ما هو بروتوكول TCP', 'الشبكات'], title: 'ما هو بروتوكول TCP', studentVisible: false, staffOnly: true, institution: 'shared' },
  { id: 'qu-2', kind: 'question', haystacks: ['عرّف الاستعلام المتشعب', 'قواعد البيانات'], title: 'عرّف الاستعلام المتشعب', studentVisible: false, staffOnly: true, institution: 'shared' },
  { id: 'qu-3', kind: 'question', haystacks: ['عدد مستويات نموذج OSI', 'الشبكات'], title: 'عدد مستويات نموذج OSI', studentVisible: false, staffOnly: true, institution: 'shared' },
];

export const CORPUS: CorpusEntity[] = [
  ...STUDENTS, ...TEACHERS, ...ORGS, ...COURSES, ...LECTURES,
  ...MATERIALS, ...PAPERS, ...TRACKS, ...BOOKS, ...JOBS, ...EVENTS,
  ...ANNOUNCEMENTS, ...QUESTIONS,
];
