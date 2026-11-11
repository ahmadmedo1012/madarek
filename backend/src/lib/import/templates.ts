/**
 * XLSX template + report builders (master-F1) — the registrar-facing
 * artifacts. Both write REAL workbooks via exceljs; both are pure in
 * the house sense (no DB, no clock — the route passes everything in).
 *
 * The STUDENT/TEACHER templates carry the bilingual header contract:
 * row 1 = the Arabic headers (every one an exact alias the mapping
 * engine resolves), row 2 = the English aliases of the SAME columns
 * (documentation — mapping.ts's stripBilingualAliasRow recognizes and
 * skips it on re-import, and real bilingual registrar files get the
 * same courtesy), rows 3-5 = worked examples. Sheet 2 «التعليمات» is
 * the field guide: required/optional, the date format, phone examples
 * in every Libyan shape, and the emailless-mode note.
 */
import ExcelJS from 'exceljs';
import type { ImportEntity } from './validate.js';

const DATE_FORMAT = 'yyyy-mm-dd';

/** One template column: its two header rows + the instruction rows. */
interface TemplateColumn {
  ar: string;
  en: string;
  required: string; // «إلزامي» | «اختياري»
  note: string;
  example: string | number | Date;
}

const STUDENT_COLUMNS: TemplateColumn[] = [
  { ar: 'الاسم الكامل', en: 'Full Name', required: 'إلزامي*', note: 'الاسم كما في الوثائق — أو استعمل العمودين التاليين بدلًا منه', example: 'أحمد محمد علي المصري' },
  { ar: 'الاسم الأول', en: 'First Name', required: 'إلزامي*', note: 'بديل الاسم الكامل (مع عمود اسم العائلة)', example: 'أحمد' },
  { ar: 'اسم العائلة', en: 'Last Name', required: 'إلزامي*', note: 'بديل الاسم الكامل (مع عمود الاسم الأول)', example: 'المصري' },
  { ar: 'رقم القيد', en: 'Registration Number', required: 'إلزامي', note: 'رقم الطالب في المؤسسة — به يدخل الحساب إذا لم يوجد بريد، ويجب ألا يتكرر داخل الملف', example: '20240001' },
  { ar: 'البريد الإلكتروني', en: 'Email', required: 'اختياري', note: 'إن تُرك فارغًا يُنشأ حساب بلا بريد (الدخول برقم القيد)', example: 'ahmed@example.ly' },
  { ar: 'رقم الهاتف', en: 'Phone', required: 'اختياري', note: 'أي صيغة ليبية: 0912345678 أو 091 234 5678 أو +218912345678', example: '0912345678' },
  { ar: 'رقم ولي الأمر', en: 'Guardian Phone', required: 'اختياري', note: 'هاتف ولي الأمر — يجوز اشتراكه بين عدة طلاب (إخوة)', example: '0923456789' },
  { ar: 'اسم ولي الأمر', en: 'Guardian Name', required: 'اختياري', note: 'اسم ولي الأمر كما في الوثائق', example: 'محمد علي المصري' },
  { ar: 'الكلية', en: 'Faculty', required: 'إلزامي جامعيًا', note: 'اسم الكلية كما هو مسجل في المؤسسة (يُتجاهل في النمط المدرسي)', example: 'كلية الهندسة' },
  { ar: 'القسم', en: 'Department', required: 'إلزامي جامعيًا', note: 'اسم القسم داخل الكلية — اختياري في النمط المدرسي', example: 'قسم الحاسبات' },
  { ar: 'السنة الدراسية', en: 'Academic Year', required: 'اختياري', note: 'رقم من 1 إلى 8 — إن تُرك فارغًا سُجِّلت السنة 1', example: 2 },
  { ar: 'المرحلة', en: 'Stage', required: 'اختياري (مدرسي)', note: 'المرحلة التعليمية للنمط المدرسي (ابتدائية/إعدادية/ثانوية)', example: 'ثانوية' },
  { ar: 'الصف', en: 'Grade', required: 'اختياري (مدرسي)', note: 'الصف للنمط المدرسي (الأول/الثاني/…)', example: 'الأول' },
  { ar: 'الفصل', en: 'Section', required: 'اختياري (مدرسي)', note: 'الفصل داخل الصف (أ/ب/…)', example: 'أ' },
  { ar: 'تاريخ الميلاد', en: 'Date of Birth', required: 'اختياري', note: `بالصيغة ${DATE_FORMAT} (أو اكتبه تاريخًا في الخلية)`, example: new Date(Date.UTC(2007, 2, 15)) },
  { ar: 'الجنس', en: 'Gender', required: 'اختياري', note: 'ذكر أو أنثى — أي قيمة أخرى تُترك غير محددة', example: 'ذكر' },
  { ar: 'المدينة', en: 'City', required: 'اختياري', note: 'مدينة السكن', example: 'طرابلس' },
];

const TEACHER_COLUMNS: TemplateColumn[] = [
  { ar: 'الاسم الكامل', en: 'Full Name', required: 'إلزامي*', note: 'الاسم كما في الوثائق — أو استعمل العمودين التاليين بدلًا منه', example: 'د. فاطمة عبد السلام' },
  { ar: 'الاسم الأول', en: 'First Name', required: 'إلزامي*', note: 'بديل الاسم الكامل (مع عمود اسم العائلة)', example: 'فاطمة' },
  { ar: 'اسم العائلة', en: 'Last Name', required: 'إلزامي*', note: 'بديل الاسم الكامل (مع عمود الاسم الأول)', example: 'عبد السلام' },
  { ar: 'الرقم الوظيفي', en: 'Employee ID', required: 'إلزامي*', note: 'رقم المدرّس الموظف — به يدخل الحساب إذا لم يوجد بريد، ولا يتكرر داخل الملف', example: 'T-1042' },
  { ar: 'البريد الإلكتروني', en: 'Email', required: 'اختياري', note: 'إن تُرك فارغًا يُنشأ حساب بلا بريد (الدخول بالرقم الوظيفي)', example: 'fatima@example.ly' },
  { ar: 'رقم الهاتف', en: 'Phone', required: 'اختياري', note: 'أي صيغة ليبية: 0912345678 أو +218912345678', example: '0912345678' },
  { ar: 'القسم', en: 'Department', required: 'إلزامي', note: 'اسم القسم كما هو مسجل في المؤسسة', example: 'قسم الرياضيات' },
  { ar: 'الكلية', en: 'Faculty', required: 'اختياري', note: 'لتضييق القسم إن وُجدت أقسام بنفس الاسم في أكثر من كلية', example: 'كلية التربية' },
];

/** '*' = required-with-alternative (the name pair OR the full name). */

function styleDataSheet(sheet: ExcelJS.Worksheet, columnCount: number): void {
  sheet.views = [{ rightToLeft: true }];
  const header = sheet.getRow(1);
  header.font = { bold: true };
  const alias = sheet.getRow(2);
  alias.font = { italic: true, color: { argb: 'FF666666' } };
  for (let c = 1; c <= columnCount; c += 1) {
    sheet.getColumn(c).width = 22;
  }
}

/** The instructions sheet — one row per column + the general notes. */
function addInstructionsSheet(
  workbook: ExcelJS.Workbook,
  columns: TemplateColumn[],
  entity: ImportEntity,
): void {
  const sheet = workbook.addWorksheet('التعليمات');
  sheet.views = [{ rightToLeft: true }];
  sheet.addRow(['العمود', 'إلزامي؟', 'الوصف']);
  sheet.getRow(1).font = { bold: true };
  for (const col of columns) {
    sheet.addRow([col.ar, col.required, col.note]);
  }
  const notes: string[][] = [
    [],
    ['ملاحظات عامة'],
    ['صيغة التاريخ', `${DATE_FORMAT} — مثال: 2007-03-15`],
    [
      'أمثلة الهاتف',
      '0912345678 · 091 234 5678 · 912345678 · +218 91 234 5678 · 00218912345678',
    ],
    [
      'الحساب بلا بريد',
      entity === 'STUDENT'
        ? 'الصفوف بلا بريد تُنشأ بحساب يدخل برقم القيد وكلمة مرور مؤقتة تظهر مرة واحدة عند التنفيذ'
        : 'الصفوف بلا بريد تُنشأ بحساب يدخل بالرقم الوظيفي وكلمة مرور مؤقتة تظهر مرة واحدة عند التنفيذ',
    ],
    ['التكرار', 'أرقام القيد/البريد المكررة داخل الملف تُرفض — والهاتف المشترك بين طالبين تحذير (إخوة) لا رفض'],
    ['الأعمدة الإضافية', 'الأعمدة التي لا يعرفها المحرك تُعرض في العرض المسبق ولا تُهمل بصمت'],
  ];
  for (const row of notes) sheet.addRow(row);
  sheet.getRow(sheet.rowCount - notes.length + 2).font = { bold: true };
  sheet.getColumn(1).width = 20;
  sheet.getColumn(2).width = 90;
}

/**
 * Build the entity's import template as a real XLSX buffer:
 * sheet 1 «الطلاب»/«المدرّسون» (Arabic headers, English alias row,
 * 3 example rows), sheet 2 «التعليمات».
 */
export async function buildImportTemplate(entity: ImportEntity): Promise<Buffer> {
  const columns = entity === 'STUDENT' ? STUDENT_COLUMNS : TEACHER_COLUMNS;
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(entity === 'STUDENT' ? 'الطلاب' : 'المدرّسون');

  sheet.addRow(columns.map((c) => c.ar));
  sheet.addRow(columns.map((c) => c.en));
  for (let i = 0; i < 3; i += 1) {
    sheet.addRow(columns.map((c) => (i === 0 ? c.example : '')));
  }
  // A real date cell in the first example (the template demonstrates
  // the format the reader returns).
  const dobIndex = columns.findIndex((c) => c.ar === 'تاريخ الميلاد');
  if (dobIndex !== -1) {
    sheet.getRow(3).getCell(dobIndex + 1).numFmt = DATE_FORMAT;
  }
  styleDataSheet(sheet, columns.length);
  addInstructionsSheet(workbook, columns, entity);

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/* ── the per-line import report ──────────────────────────────────── */

export interface ReportRow {
  line: number;
  name: string;
  identifier: string; // رقم القيد / الرقم الوظيفي
  status: 'ok' | 'skipped' | 'error' | 'pending';
  detail?: string; // the error text / the created-or-existing note
}

export interface ReportMeta {
  entity: ImportEntity;
  fileName: string;
  counts: {
    total: number;
    succeeded: number;
    skipped: number;
    failed: number;
  };
}

const STATUS_AR: Record<ReportRow['status'], string> = {
  ok: 'تم الإنشاء',
  skipped: 'تخطّي',
  error: 'خطأ',
  pending: 'لم يُنفَّذ',
};

/**
 * The import report workbook — one row per source line: its number,
 * name, identifier, verdict, and the Arabic detail (the refusal
 * message or the created reference). Sheet 2 carries the summary
 * counts. Temp passwords NEVER appear here — they are handed once in
 * the commit response, and nothing plaintext is persisted.
 */
export async function buildImportReport(rows: ReportRow[], meta: ReportMeta): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('التقرير');
  sheet.views = [{ rightToLeft: true }];

  sheet.addRow(['السطر', 'الاسم', 'المعرّف', 'الحالة', 'التفاصيل']);
  sheet.getRow(1).font = { bold: true };
  for (const row of rows) {
    sheet.addRow([
      row.line,
      row.name,
      row.identifier,
      STATUS_AR[row.status],
      row.detail ?? '',
    ]);
  }
  sheet.getColumn(1).width = 8;
  sheet.getColumn(2).width = 32;
  sheet.getColumn(3).width = 18;
  sheet.getColumn(4).width = 12;
  sheet.getColumn(5).width = 60;

  const summary = workbook.addWorksheet('الملخص');
  summary.views = [{ rightToLeft: true }];
  summary.addRow(['الملف', meta.fileName]);
  summary.addRow(['الكيان', meta.entity === 'STUDENT' ? 'طلاب' : 'مدرّسون']);
  summary.addRow(['إجمالي الصفوف', meta.counts.total]);
  summary.addRow(['نجح', meta.counts.succeeded]);
  summary.addRow(['تخطّي', meta.counts.skipped]);
  summary.addRow(['فشل', meta.counts.failed]);
  summary.getColumn(1).width = 20;
  summary.getColumn(2).width = 40;

  const out = await workbook.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}
