/**
 * Custom-field validation + import-header mapping (master-E1) — the pure,
 * DB-free service layer for the structured custom-field system
 * (InstitutionFieldDefinition + FieldValue).
 *
 * SCHOOL/UNIVERSITY DUALITY (why this module exists): the same profile
 * machine serves a university (faculty/department/year columns) and a
 * school (stage/grade/section columns) — what DIFFERS per institution
 * is which extra attributes the registrar needs. Instead of a Json blob
 * on the profile, each institution defines structured fields
 * (`InstitutionFieldDefinition`) and values are stored one-column-per-
 * type in `FieldValue`. This module owns the shared rules:
 *
 *   · `validateFieldValue` — the ONLY place a value is checked against
 *     its definition (type shape, required, SELECT options membership,
 *     `{min,max,pattern}` validation rules). Both the API write path
 *     and the CSV import path call it — never reimplement it ad hoc.
 *   · `mapImportHeader` — the §9.4 alias table: the Arabic column
 *     headers real schools/universities write in their spreadsheets
 *     (الاسم، اسم التلميذ، الرقم الدراسي، رقم القيد…) mapped to
 *     canonical profile keys, with institution-specific columns routed
 *     to their custom-field keys.
 *
 * Purity: no DB, no clock, no env — decision logic only (AGENTS.md §5).
 * The route layer owns lookups, transactions, and the one-profile-FK
 * invariant of FieldValue (exactly one of studentProfileId/
 * teacherProfileId set).
 */
import type { FieldEntity, FieldType } from '@prisma/client';
import { normalizeArabicSearch } from '../../modules/search/normalize.js';

/* ── definition shapes (structural: satisfied by Prisma rows too) ── */

/** The controlled shape of `InstitutionFieldDefinition.validation`. */
export interface FieldValidationRules {
  min?: number;
  max?: number;
  pattern?: string;
}

/** A definition as this module needs it (a Prisma row satisfies it). */
export interface CustomFieldDefinitionInput {
  key: string;
  labelAr: string;
  labelEn?: string;
  entity: FieldEntity;
  type: FieldType;
  required: boolean;
  /** Controlled: `string[]` — required for SELECT/MULTI_SELECT. */
  options?: unknown;
  /** Controlled: `{ min?, max?, pattern? }`. */
  validation?: unknown;
}

/** One validated value — exactly the column family its type maps to. */
export interface FieldValueShape {
  valueText?: string;
  valueNumber?: number;
  valueDate?: Date;
  valueBoolean?: boolean;
  valueSelect?: string;
  valueMultiSelect?: string[];
}

export type FieldValidationResult =
  | { ok: true; normalized: FieldValueShape }
  | { ok: false; errorAr: string };

/* ── controlled-JSON guards (definitions are validated HERE, not in PG) ── */

function parseRules(validation: unknown): FieldValidationRules | 'invalid' {
  if (validation === null || validation === undefined) return {};
  if (typeof validation !== 'object' || Array.isArray(validation)) return 'invalid';
  const v = validation as Record<string, unknown>;
  const rules: FieldValidationRules = {};
  for (const k of Object.keys(v)) {
    if (k !== 'min' && k !== 'max' && k !== 'pattern') return 'invalid';
  }
  if (v.min !== undefined) {
    if (typeof v.min !== 'number' || !Number.isFinite(v.min)) return 'invalid';
    rules.min = v.min;
  }
  if (v.max !== undefined) {
    if (typeof v.max !== 'number' || !Number.isFinite(v.max)) return 'invalid';
    rules.max = v.max;
  }
  if (v.pattern !== undefined) {
    if (typeof v.pattern !== 'string' || v.pattern === '') return 'invalid';
    rules.pattern = v.pattern;
  }
  return rules;
}

/** `string[]`, non-empty, no blanks/duplicates — or null (broken def). */
function parseOptions(options: unknown): string[] | null {
  if (!Array.isArray(options) || options.length === 0) return null;
  const seen = new Set<string>();
  for (const o of options) {
    if (typeof o !== 'string') return null;
    const t = o.trim();
    if (t === '' || seen.has(t)) return null;
    seen.add(t);
  }
  return options as string[];
}

/* ── value coercion helpers ─────────────────────────────────────── */

const ARABIC_DIGITS = /[\u0660-\u0669\u06F0-\u06F9]/g;

function toAsciiDigits(text: string): string {
  return text.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0x0f));
}

function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const TRUE_TOKENS = new Set(['true', 'نعم', '1']);
const FALSE_TOKENS = new Set(['false', 'لا', '0']);

/** Accept a Date, `YYYY-MM-DD` (UTC midnight), or any parseable ISO string. */
function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}

/* ── the one validator ──────────────────────────────────────────── */

/**
 * Validate one raw value against its definition. On success returns the
 * normalized `FieldValueShape` (only the type's column family is set —
 * the caller writes it to `FieldValue` verbatim). On failure returns an
 * Arabic, user-facing message carrying the field's `labelAr`.
 */
export function validateFieldValue(
  def: CustomFieldDefinitionInput,
  value: unknown,
): FieldValidationResult {
  const label = def.labelAr;

  if (isEmptyValue(value)) {
    return def.required
      ? { ok: false, errorAr: `«${label}» حقل مطلوب` }
      : { ok: true, normalized: {} };
  }

  const rules = parseRules(def.validation);
  if (rules === 'invalid') {
    return { ok: false, errorAr: `«${label}» تعريف الحقل غير سليم (قواعد التحقق)` };
  }
  if (rules.pattern !== undefined) {
    try {
      void new RegExp(rules.pattern);
    } catch {
      return { ok: false, errorAr: `«${label}» تعريف الحقل غير سليم (نمط غير صالح)` };
    }
  }

  switch (def.type) {
    case 'TEXT': {
      if (typeof value !== 'string') {
        return { ok: false, errorAr: `«${label}» يجب أن يكون نصًا` };
      }
      const text = value.trim();
      if (rules.min !== undefined && text.length < rules.min) {
        return { ok: false, errorAr: `«${label}» يجب ألا يقل عن ${rules.min} حرفًا` };
      }
      if (rules.max !== undefined && text.length > rules.max) {
        return { ok: false, errorAr: `«${label}» يجب ألا يزيد عن ${rules.max} حرفًا` };
      }
      if (rules.pattern !== undefined && !new RegExp(rules.pattern).test(text)) {
        return { ok: false, errorAr: `«${label}» لا يطابق النمط المطلوب` };
      }
      return { ok: true, normalized: { valueText: text } };
    }

    case 'NUMBER': {
      // Arabic-Indic digits are accepted — the registrar's spreadsheets
      // carry them (a grade average typed as ٠٤٫٥ reads as 4.5… well,
      // the digits fold; the decimal separator must be the Latin dot).
      const raw =
        typeof value === 'number'
          ? String(value)
          : typeof value === 'string'
            ? toAsciiDigits(value.trim())
            : '';
      const n = raw === '' ? Number.NaN : Number(raw);
      if (!Number.isFinite(n)) {
        return { ok: false, errorAr: `«${label}» يجب أن يكون رقمًا` };
      }
      if (rules.min !== undefined && n < rules.min) {
        return { ok: false, errorAr: `«${label}» يجب أن يكون ${rules.min} أو أكثر` };
      }
      if (rules.max !== undefined && n > rules.max) {
        return { ok: false, errorAr: `«${label}» يجب أن يكون ${rules.max} أو أقل` };
      }
      return { ok: true, normalized: { valueNumber: n } };
    }

    case 'DATE': {
      const d = parseDateValue(value);
      if (d === null) {
        return { ok: false, errorAr: `«${label}» تاريخ غير صالح` };
      }
      // min/max are epoch-ms bounds for DATE (documented on the column).
      if (rules.min !== undefined && d.getTime() < rules.min) {
        return { ok: false, errorAr: `«${label}» تاريخ قبل النطاق المسموح` };
      }
      if (rules.max !== undefined && d.getTime() > rules.max) {
        return { ok: false, errorAr: `«${label}» تاريخ بعد النطاق المسموح` };
      }
      return { ok: true, normalized: { valueDate: d } };
    }

    case 'BOOLEAN': {
      if (typeof value === 'boolean') {
        return { ok: true, normalized: { valueBoolean: value } };
      }
      if (typeof value === 'string') {
        const t = toAsciiDigits(value.trim().toLowerCase());
        if (TRUE_TOKENS.has(t)) return { ok: true, normalized: { valueBoolean: true } };
        if (FALSE_TOKENS.has(t)) return { ok: true, normalized: { valueBoolean: false } };
      }
      return { ok: false, errorAr: `«${label}» يجب أن يكون نعم/لا` };
    }

    case 'SELECT': {
      const options = parseOptions(def.options);
      if (options === null) {
        return { ok: false, errorAr: `«${label}» تعريف الحقل غير سليم (الخيارات)` };
      }
      if (typeof value !== 'string' || !options.includes(value.trim())) {
        return {
          ok: false,
          errorAr: `«${label}» يجب أن تكون إحدى القيم: ${options.join('، ')}`,
        };
      }
      return { ok: true, normalized: { valueSelect: value.trim() } };
    }

    case 'MULTI_SELECT': {
      const options = parseOptions(def.options);
      if (options === null) {
        return { ok: false, errorAr: `«${label}» تعريف الحقل غير سليم (الخيارات)` };
      }
      // Accept a real array, or a comma-separated string (Arabic «،» or
      // Latin «,») — the CSV import path feeds strings.
      const items =
        typeof value === 'string'
          ? value.split(/[،,]/)
          : Array.isArray(value)
            ? value.map((v) => String(v))
            : null;
      if (items === null) {
        return { ok: false, errorAr: `«${label}» يجب أن يكون قائمة قيم` };
      }
      const picked: string[] = [];
      for (const item of items) {
        const t = String(item).trim();
        if (t === '') continue;
        if (!options.includes(t)) {
          return {
            ok: false,
            errorAr: `«${label}» يتضمن قيمة غير موجودة في الخيارات: ${t}`,
          };
        }
        if (!picked.includes(t)) picked.push(t); // dedupe, keep order
      }
      if (picked.length === 0) {
        return def.required
          ? { ok: false, errorAr: `«${label}» حقل مطلوب` }
          : { ok: true, normalized: {} };
      }
      return { ok: true, normalized: { valueMultiSelect: picked } };
    }
  }
}

/* ── import-header mapping (mission §9.4 alias table) ───────────── */

/**
 * Canonical profile keys an import header can resolve to. FK columns are
 * mapped by NAME (`department`) — the route resolves them through the
 * same faculty→department chain the r323 bulk-import uses, never by raw
 * id from a spreadsheet.
 */
export type CanonicalImportField =
  | 'nameAr' // الاسم كما في الوثائق (StudentProfile.nameAr)
  | 'universityId' // الرقم الدراسي/رقم القيد/الرقم الجامعي (reg number)
  | 'studentPhone' // رقم الهاتف/هاتف الطالب
  | 'guardianPhone' // رقم ولي الأمر
  | 'department' // القسم/التخصص — resolved by name → departmentId
  | 'grade' // الصف (school mode)
  | 'section' // الفصل (school mode)
  | 'year'; // السنة الدراسية (university mode, Int)

/** An institution's custom field, as the mapper needs it (Prisma-shaped). */
export interface CustomFieldImportMeta {
  key: string;
  labelAr?: string;
  labelEn?: string;
  importKeyAr?: string | null;
  importKeyEn?: string | null;
}

export type ImportHeaderMatch = CanonicalImportField | { custom: string } | null;

/**
 * The §9.4 aliases — real spreadsheet headers from Libyan schools and
 * universities. «التخصص» folds onto `department` too: a student's
 * specialization IS their department/program in the Libyan academic
 * record, and there is no separate profile column for it.
 */
const IMPORT_HEADER_ALIASES: ReadonlyArray<readonly [string, CanonicalImportField]> = [
  ['الاسم', 'nameAr'],
  ['اسم الطالب', 'nameAr'],
  ['الاسم الكامل', 'nameAr'],
  ['اسم التلميذ', 'nameAr'],
  ['الرقم الدراسي', 'universityId'],
  ['رقم القيد', 'universityId'],
  ['الرقم الجامعي', 'universityId'],
  ['رقم الهاتف', 'studentPhone'],
  ['هاتف الطالب', 'studentPhone'],
  ['رقم ولي الأمر', 'guardianPhone'],
  ['القسم', 'department'],
  ['التخصص', 'department'],
  ['الصف', 'grade'],
  ['الفصل', 'section'],
  ['السنة الدراسية', 'year'],
];

/** Fold a header for matching: canonical Arabic fold + whitespace. */
function foldHeader(header: string): string {
  return normalizeArabicSearch(header).replace(/\s+/g, ' ');
}

/**
 * Map one CSV/spreadsheet header to its canonical profile key, an
 * institution custom-field key (`{custom}`), or `null` when nothing
 * matches (the caller reports the unknown column honestly).
 *
 * Matching folds Arabic (diacritics, أ/إ/آ→ا, ة→ه…) and ignores case/
 * spacing — «إسم الطالب » and «اسم الطالب» are the same header. The
 * optional `customFields` list carries the institution's definitions:
 * a header matching their `importKeyAr`/`importKeyEn` (or, as a
 * friendly fallback, their labels or the raw key) routes to
 * `{custom: key}` — the caller then validates the cell with
 * `validateFieldValue` against that definition.
 */
export function mapImportHeader(
  header: string,
  customFields: readonly CustomFieldImportMeta[] = [],
): ImportHeaderMatch {
  if (typeof header !== 'string') return null;
  const folded = foldHeader(header);
  if (folded === '') return null;

  for (const [alias, key] of IMPORT_HEADER_ALIASES) {
    if (folded === foldHeader(alias)) return key;
  }
  for (const field of customFields) {
    const candidates = [field.importKeyAr, field.importKeyEn, field.labelAr, field.labelEn, field.key];
    for (const candidate of candidates) {
      if (candidate && folded === foldHeader(candidate)) return { custom: field.key };
    }
  }
  return null;
}
