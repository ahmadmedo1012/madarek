/**
 * Row validation for the master-F1 import engine — pure, DB-free.
 * Consumes the mapped record per row (mapping.ts) and produces the
 * per-row verdict in the same Arabic voice as the r323 bulk-import
 * path (lib/bulk-import.ts — «الاسم الأول مطلوب» ورفقُه)، plus the
 * within-file duplicate report. The route layer owns everything that
 * needs the DB (existing accounts, faculty name resolution, the
 * transaction) — same split as r323.
 *
 * RULES (STUDENT) — the mission §8/§9 reading, tied to the schema:
 *   · name        : (first + last) OR the full-name column (nameAr).
 *                   A single-word name yields lastName '' — User accepts
 *                   it and the display joins survive.
 *   · identity    : universityId (رقم القيد) is REQUIRED — the emailless
 *                   mode (§8.6) logs in BY reg-number, and
 *                   StudentProfile.universityId is NOT NULL; an email is
 *                   optional (when absent the commit synthesizes a
 *                   placeholder mailbox and reports `emailPlaceholder`).
 *   · contact     : a row with no email AND no phone AND no guardian
 *                   phone is a WARNING (data still lands), not an error.
 *   · phones      : normalizePhone (E1) — display + search pair; a
 *                   non-empty unnormalizable phone is an ERROR.
 *   · year/grade  : year 1–8 (Arabic-Indic digits accepted); school
 *                   mode may carry stage/grade instead — neither in a
 *                   school file is a warning (year defaults to 1).
 *   · faculty/dep : required in UNIVERSITY mode; optional-with-warning
 *                   in SCHOOL mode (the commit falls back to the
 *                   school's general department).
 *   · duplicates  : in-file duplicate reg-numbers/emails are ERRORS on
 *                   the second+ occurrence; the SAME student phone on
 *                   different students is a WARNING (siblings share a
 *                   home phone — never split a family by force).
 *
 * RULES (TEACHER): name as above; employeeId OR email required
 * (emailless teachers log in by الرقم الوظيفي); department required;
 * specialty defaults to «عام» with a warning.
 */
import { normalizePhone } from '../phones.js';
import {
  validateFieldValue,
  type CustomFieldDefinitionInput,
  type FieldValueShape,
} from '../profiles/fields.js';
import { mapRowToRecord, type ColumnMap } from './mapping.js';

export type ImportEntity = 'STUDENT' | 'TEACHER';

/** The institution's academic mode (Institution.kind: SCHOOL vs the
 *  null/UNIVERSITY/COLLEGE/… legacy reading). */
export type InstitutionMode = 'UNIVERSITY' | 'SCHOOL';

/** One import file, ≤ 5000 data rows — a migration is many files, and
 *  the per-row ledger (ImportRow) stays bounded per job. */
/** R350 I-P1 — the I1 spec cap: ≤20,000 rows (the 10k perf pin lives
 *  in load.test.ts; 20k is the engine's hard ceiling). */
export const IMPORT_MAX_ROWS = 20_000;

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // same shape as r323

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;
function toAsciiDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0x0f));
}

/* ── normalized row shapes (what the commit layer consumes) ──────── */

export interface MappedStudentRow {
  firstName: string;
  lastName: string;
  nameAr?: string;
  email?: string;
  /** True when the source row carried NO email — the commit will
   *  synthesize `{universityId}@students.import.madarek.local` and the
   *  API response reports `emailPlaceholder: true` (honest, never a
   *  silent mailbox). */
  emailPlaceholder: boolean;
  universityId: string;
  year: number;
  faculty?: string;
  department?: string;
  stage?: string;
  grade?: string;
  section?: string;
  dateOfBirth?: string; // yyyy-mm-dd
  gender?: 'MALE' | 'FEMALE';
  city?: string;
  studentPhone?: string;
  studentPhoneNormalized?: string;
  guardianName?: string;
  guardianPhone?: string;
  guardianPhoneNormalized?: string;
  customValues: Record<string, FieldValueShape>;
}

export interface MappedTeacherRow {
  firstName: string;
  lastName: string;
  nameAr?: string;
  email?: string;
  emailPlaceholder: boolean; // → {employeeId}@teachers.import.madarek.local
  employeeId?: string;
  department?: string;
  specialty: string;
  personalPhone?: string;
  personalPhoneNormalized?: string;
  customValues: Record<string, FieldValueShape>;
}

export interface RowValidationResult {
  /** 1-based data line (header excluded) — the r323 convention. */
  line: number;
  status: 'ok' | 'error';
  errorsAr: string[];
  warningsAr: string[];
  /** Normalized data — fully populated when ok, best-effort otherwise. */
  mapped: MappedStudentRow | MappedTeacherRow;
}

export interface DuplicateGroup {
  value: string;
  lines: number[];
}

export interface DuplicateReport {
  /** In-file duplicate reg-numbers (STUDENT) — every occurrence listed. */
  regNumbers: DuplicateGroup[];
  /** In-file duplicate employee ids (TEACHER). */
  employeeIds: DuplicateGroup[];
  /** In-file duplicate emails (case-insensitive). */
  emails: DuplicateGroup[];
  /** The SAME student phone shared by different students — WARNING
   *  territory (siblings), listed for the registrar's eye. */
  sharedPhones: DuplicateGroup[];
}

export interface ValidationSummary {
  total: number;
  ok: number;
  error: number;
  warningCount: number;
}

export interface ValidationResult {
  rows: RowValidationResult[];
  counts: ValidationSummary;
  duplicateReport: DuplicateReport;
}

export interface ValidateRowsOptions {
  entity: ImportEntity;
  /** SCHOOL relaxes faculty/department to warnings and accepts
   *  stage/grade as the year carrier. */
  mode: InstitutionMode;
  /** The institution's custom-field definitions — every `custom:*`
   *  column value is validated through E1's validateFieldValue (the
   *  ONLY place a value is checked against its definition). */
  customFields?: CustomFieldDefinitionInput[];
}

/* ── shared helpers ──────────────────────────────────────────────── */

/** Split a full name for the User record: first word = firstName, the
 *  rest = lastName; a single word leaves lastName '' (User.lastName is
 *  NOT NULL but not non-empty — the schema accepts the honest shape). */
/**
 * The LIBYAN quadruple-name law (R350 I-P1): a first token of «عبد» is
 * INCOMPLETE on its own (the theophoric compound needs its second half
 * — عبد الله، عبد الرحمن)، so it keeps the NEXT word inside firstName.
 * Everything else: first word = firstName, the rest = lastName; a
 * single word leaves lastName '' (User.lastName is NOT NULL but not
 * non-empty — the schema accepts the honest shape).
 */
export function splitFullName(nameAr: string): { firstName: string; lastName: string } {
  const parts = nameAr.trim().split(/\s+/);
  if (parts[0] === 'عبد' && parts.length >= 2) {
    return { firstName: `${parts[0]} ${parts[1]}`, lastName: parts.slice(2).join(' ') };
  }
  const firstName = parts.shift() ?? '';
  return { firstName, lastName: parts.join(' ') };
}

/** yyyy-mm-dd (or a full ISO instant) → {iso date}; anything else fails. */
/**
 * A birth date from the wild (R350 I-P1) → {iso date}; anything else fails:
 *   · yyyy-mm-dd (the documented template format);
 *   · a full ISO instant (an xlsx cell that carried a time part) — keep the date;
 *   · dd/mm/yyyy or dd-mm-yyyy (the registrar's hand-typed shape — day
 *     ≤ 31 and month ≤ 12 make the two orders disambiguate themselves);
 *   · an Excel SERIAL number (days since 1899-12-30 — the raw number a
 *     cell shows when Excel ate the date format), plausible 1900–2100.
 */
export function parseDateOfBirth(raw: string): { date: string } | null {
  const ascii = toAsciiDigits(raw.trim());
  if (/^\d{4}-\d{2}-\d{2}$/.test(ascii)) {
    const d = new Date(`${ascii}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? null : { date: ascii };
  }
  // Full ISO (an xlsx cell that carried a time part) — keep the date.
  if (/^\d{4}-\d{2}-\d{2}T/.test(ascii)) {
    const d = new Date(ascii);
    return Number.isNaN(d.getTime()) ? null : { date: ascii.slice(0, 10) };
  }
  const dmy = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/.exec(ascii);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const iso = `${dmy[3]}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const d = new Date(`${iso}T00:00:00.000Z`);
      if (!Number.isNaN(d.getTime())) return { date: iso };
    }
    return null;
  }
  if (/^\d{4,6}$/.test(ascii)) {
    const serial = Number(ascii);
    const ms = (serial - 25569) * 86_400_000; // 1899-12-30 → Unix epoch
    const d = new Date(ms);
    const year = d.getUTCFullYear();
    if (!Number.isNaN(d.getTime()) && year >= 1900 && year <= 2100) {
      return { date: d.toISOString().slice(0, 10) };
    }
  }
  return null;
}

const GENDER_MALE = new Set(['ذكر', 'male', 'm', 'ذكرٌ']);
const GENDER_FEMALE = new Set(['أنثى', 'انثى', 'female', 'f']);

/** A validated phone pair, or the Arabic refusal for the row. */
function phonePair(raw: string): { pair: { display: string; normalized: string } } | { error: string } {
  const pair = normalizePhone(raw);
  if (pair === null) return { error: `رقم هاتف غير صالح (${raw.trim()})` };
  return { pair };
}

/** Validate one row's custom-field columns through E1's validator. */
function validateCustomValues(
  record: Record<string, string>,
  defs: CustomFieldDefinitionInput[],
  errors: string[],
): Record<string, FieldValueShape> {
  const out: Record<string, FieldValueShape> = {};
  for (const def of defs) {
    const raw = record[`custom:${def.key}`];
    const verdict = validateFieldValue(def, raw);
    if (!verdict.ok) {
      errors.push(verdict.errorAr);
      continue;
    }
    out[def.key] = verdict.normalized;
  }
  return out;
}

/** Track within-file duplicates: returns the group key for the value
 *  (so the caller can decide error vs warning per entity semantics). */
class DuplicateTracker {
  private first = new Map<string, number>();
  private groups = new Map<string, DuplicateGroup>();

  /** Register an occurrence; returns the line of the FIRST occurrence
   *  when this is a repeat (null the first time). */
  seen(key: string, line: number): number | null {
    const firstAt = this.first.get(key);
    if (firstAt !== undefined) return firstAt;
    this.first.set(key, line);
    return null;
  }

  /** Add to the report group (used for both errors and warnings). */
  report(key: string, value: string, line: number): void {
    let group = this.groups.get(key);
    if (!group) {
      group = { value, lines: [] };
      this.groups.set(key, group);
    }
    if (!group.lines.includes(line)) group.lines.push(line);
  }

  collect(): DuplicateGroup[] {
    return [...this.groups.values()];
  }
}

/* ── the validator ───────────────────────────────────────────────── */

/**
 * Validate every mapped row. Pure: no DB, no clock — the duplicate
 * report covers the FILE only; DB existence checks (existing accounts,
 * institution reg-numbers) belong to the preview/commit route, which
 * layers them as policy warnings/errors per the duplicate policy.
 */
export function validateRows(
  rows: string[][],
  map: ColumnMap,
  opts: ValidateRowsOptions,
): ValidationResult {
  const customDefs = opts.customFields ?? [];
  const results: RowValidationResult[] = [];

  const regTracker = new DuplicateTracker();
  const employeeTracker = new DuplicateTracker();
  const emailTracker = new DuplicateTracker();
  const phoneTracker = new DuplicateTracker();

  for (let i = 0; i < rows.length; i += 1) {
    const line = i + 1;
    const record = mapRowToRecord(rows[i]!, map);
    const errors: string[] = [];
    const warnings: string[] = [];

    /* name: (first + last) OR full name */
    let firstName = record.firstName ?? '';
    let lastName = record.lastName ?? '';
    const nameAr = record.nameAr ?? '';
    if (!firstName && !lastName && !nameAr) {
      errors.push('الاسم مطلوب — الاسم الكامل أو الاسم الأول واسم العائلة');
    } else if (!firstName && !lastName && nameAr) {
      const split = splitFullName(nameAr);
      firstName = split.firstName;
      lastName = split.lastName;
    } else if (firstName && !lastName && !nameAr) {
      errors.push('اسم العائلة مطلوب — أو استعمل عمود الاسم الكامل');
    } else if (!firstName && lastName && !nameAr) {
      errors.push('الاسم الأول مطلوب — أو استعمل عمود الاسم الكامل');
    }

    /* email: optional but must be valid */
    const emailRaw = (record.email ?? '').trim();
    if (emailRaw !== '' && !EMAIL_SHAPE.test(emailRaw)) {
      errors.push('البريد الإلكتروني غير صالح');
    }
    const email = emailRaw !== '' && EMAIL_SHAPE.test(emailRaw) ? emailRaw.toLowerCase() : undefined;
    if (email !== undefined) {
      const firstAt = emailTracker.seen(email, line);
      if (firstAt !== null) {
        emailTracker.report(email, email, firstAt);
        emailTracker.report(email, email, line);
        errors.push(`البريد الإلكتروني مكرر داخل الملف (أول ظهور: السطر ${firstAt})`);
      }
    }

    /* custom-field columns (E1's validator is the only truth) */
    const customValues = validateCustomValues(record, customDefs, errors);

    if (opts.entity === 'STUDENT') {
      /* identity: the reg-number is the account's emailless username */
      const universityId = (record.universityId ?? '').trim();
      if (universityId === '') {
        errors.push('رقم القيد مطلوب — لا يمكن إنشاء ملف طالب بدونه');
      } else {
        const firstAt = regTracker.seen(universityId, line);
        if (firstAt !== null) {
          regTracker.report(universityId, universityId, firstAt);
          regTracker.report(universityId, universityId, line);
          errors.push(`رقم القيد مكرر داخل الملف (أول ظهور: السطر ${firstAt})`);
        }
      }

      /* phones */
      let studentPhone: string | undefined;
      let studentPhoneNormalized: string | undefined;
      const studentPhoneRaw = (record.studentPhone ?? '').trim();
      if (studentPhoneRaw !== '') {
        const verdict = phonePair(studentPhoneRaw);
        if ('error' in verdict) errors.push(verdict.error);
        else {
          studentPhone = verdict.pair.display;
          studentPhoneNormalized = verdict.pair.normalized;
          // A shared student phone across DIFFERENT reg-numbers is the
          // siblings case — warn, never split the family by force.
          const firstAt = phoneTracker.seen(verdict.pair.normalized, line);
          if (firstAt !== null) {
            phoneTracker.report(verdict.pair.normalized, verdict.pair.display, firstAt);
            phoneTracker.report(verdict.pair.normalized, verdict.pair.display, line);
            warnings.push(`هاتف مشترك مع صف آخر في الملف (السطر ${firstAt}) — أخوة/أشقاء؟`);
          }
        }
      }

      let guardianPhone: string | undefined;
      let guardianPhoneNormalized: string | undefined;
      const guardianPhoneRaw = (record.guardianPhone ?? '').trim();
      if (guardianPhoneRaw !== '') {
        const verdict = phonePair(guardianPhoneRaw);
        if ('error' in verdict) errors.push(verdict.error);
        else {
          guardianPhone = verdict.pair.display;
          guardianPhoneNormalized = verdict.pair.normalized;
          // A guardian phone shared by several students is EXPECTED
          // (one parent, many children) — no warning at all.
        }
      }

      /* contact anchor */
      if (email === undefined && studentPhone === undefined && guardianPhone === undefined) {
        warnings.push('لا وسيلة تواصل في هذا الصف — لا بريد ولا هاتف');
      }

      /* year / stage / grade (school duality) */
      let year = 1;
      const yearRaw = toAsciiDigits((record.year ?? '').trim());
      if (yearRaw !== '') {
        const n = Number(yearRaw);
        if (!Number.isInteger(n) || n < 1 || n > 8) {
          errors.push('السنة الدراسية يجب أن تكون رقمًا بين 1 و 8');
        } else {
          year = n;
        }
      }
      const grade = (record.grade ?? '').trim() || undefined;
      const stage = (record.stage ?? '').trim() || undefined;
      const section = (record.section ?? '').trim() || undefined;
      if (opts.mode === 'SCHOOL' && yearRaw === '' && grade === undefined) {
        warnings.push('لا صف ولا سنة دراسية في هذا الصف — ستُسجَّل السنة 1');
      }

      /* faculty / department */
      const faculty = (record.faculty ?? '').trim() || undefined;
      const department = (record.department ?? '').trim() || undefined;
      if (opts.mode === 'UNIVERSITY') {
        if (!faculty) errors.push('الكلية مطلوبة (النمط الجامعي)');
        if (!department) errors.push('القسم مطلوب (النمط الجامعي)');
      } else if (!department) {
        warnings.push('لا قسم في هذا الصف — سيُستخدم القسم العام للمدرسة');
      }

      /* birth date + gender + city */
      let dateOfBirth: string | undefined;
      const dobRaw = (record.dateOfBirth ?? '').trim();
      if (dobRaw !== '') {
        const parsed = parseDateOfBirth(dobRaw);
        if (parsed === null) {
          errors.push('تاريخ ميلاد غير صالح — استعمل الصيغة سنة-شهر-يوم (2007-03-15)');
        } else {
          dateOfBirth = parsed.date;
        }
      }
      let gender: 'MALE' | 'FEMALE' | undefined;
      const genderRaw = toAsciiDigits((record.gender ?? '').trim().toLowerCase());
      if (genderRaw !== '') {
        if (GENDER_MALE.has(genderRaw)) gender = 'MALE';
        else if (GENDER_FEMALE.has(genderRaw)) gender = 'FEMALE';
        else warnings.push(`قيمة جنس غير معروفة (${record.gender}) — تُترك غير محددة`);
      }
      const city = (record.city ?? '').trim() || undefined;
      const guardianName = (record.guardianName ?? '').trim() || undefined;

      const mapped: MappedStudentRow = {
        firstName,
        lastName,
        ...(nameAr !== '' ? { nameAr } : {}),
        ...(email !== undefined ? { email } : {}),
        emailPlaceholder: email === undefined,
        universityId,
        year,
        ...(faculty !== undefined ? { faculty } : {}),
        ...(department !== undefined ? { department } : {}),
        ...(stage !== undefined ? { stage } : {}),
        ...(grade !== undefined ? { grade } : {}),
        ...(section !== undefined ? { section } : {}),
        ...(dateOfBirth !== undefined ? { dateOfBirth } : {}),
        ...(gender !== undefined ? { gender } : {}),
        ...(city !== undefined ? { city } : {}),
        ...(studentPhone !== undefined ? { studentPhone } : {}),
        ...(studentPhoneNormalized !== undefined ? { studentPhoneNormalized } : {}),
        ...(guardianName !== undefined ? { guardianName } : {}),
        ...(guardianPhone !== undefined ? { guardianPhone } : {}),
        ...(guardianPhoneNormalized !== undefined ? { guardianPhoneNormalized } : {}),
        customValues,
      };

      results.push({
        line,
        status: errors.length === 0 ? 'ok' : 'error',
        errorsAr: errors,
        warningsAr: warnings,
        mapped,
      });
    } else {
      /* TEACHER */
      const employeeId = (record.employeeId ?? '').trim() || undefined;
      if (employeeId === undefined && email === undefined) {
        errors.push('لا رقم وظيفي ولا بريد إلكتروني — لا يمكن إنشاء حساب مدرّس');
      }
      if (employeeId !== undefined) {
        const firstAt = employeeTracker.seen(employeeId, line);
        if (firstAt !== null) {
          employeeTracker.report(employeeId, employeeId, firstAt);
          employeeTracker.report(employeeId, employeeId, line);
          errors.push(`الرقم الوظيفي مكرر داخل الملف (أول ظهور: السطر ${firstAt})`);
        }
      }

      let personalPhone: string | undefined;
      let personalPhoneNormalized: string | undefined;
      const phoneRaw = (record.studentPhone ?? '').trim();
      if (phoneRaw !== '') {
        const verdict = phonePair(phoneRaw);
        if ('error' in verdict) errors.push(verdict.error);
        else {
          personalPhone = verdict.pair.display;
          personalPhoneNormalized = verdict.pair.normalized;
        }
      }

      const department = (record.department ?? '').trim();
      if (department === '') errors.push('القسم مطلوب للمدرّس');

      // «التخصص» folds onto the department (E1's ruling: a teacher's
      // specialization IS their department) — the profile's free-text
      // specialty therefore defaults to «عام» silently. No per-row
      // warning: it is not actionable row-by-row, and the template's
      // instruction sheet documents it.
      const specialty = 'عام';

      const mapped: MappedTeacherRow = {
        firstName,
        lastName,
        ...(nameAr !== '' ? { nameAr } : {}),
        ...(email !== undefined ? { email } : {}),
        emailPlaceholder: email === undefined && employeeId !== undefined,
        ...(employeeId !== undefined ? { employeeId } : {}),
        ...(department !== '' ? { department } : {}),
        specialty,
        ...(personalPhone !== undefined ? { personalPhone } : {}),
        ...(personalPhoneNormalized !== undefined ? { personalPhoneNormalized } : {}),
        customValues,
      };

      results.push({
        line,
        status: errors.length === 0 ? 'ok' : 'error',
        errorsAr: errors,
        warningsAr: warnings,
        mapped,
      });
    }
  }

  const duplicateReport: DuplicateReport = {
    regNumbers: regTracker.collect(),
    employeeIds: employeeTracker.collect(),
    emails: emailTracker.collect(),
    sharedPhones: phoneTracker.collect(),
  };

  return {
    rows: results,
    counts: {
      total: results.length,
      ok: results.filter((r) => r.status === 'ok').length,
      error: results.filter((r) => r.status === 'error').length,
      warningCount: results.reduce((n, r) => n + r.warningsAr.length, 0),
    },
    duplicateReport,
  };
}
