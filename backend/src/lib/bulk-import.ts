/**
 * Bulk import (r323 B3.1) — the registrar's CSV path for creating a
 * class of students without touching the server console.
 *
 * Contract (mirrors docs: the CSV template the UI downloads):
 *   الاسم الأول, اسم العائلة, البريد الإلكتروني, الرقم الجامعي, الكلية, القسم, السنة
 *
 * Pure layer (this file): RFC 4180 CSV parsing (quotes, doubled quotes,
 * CRLF/LF, BOM), row validation against the same shapes the register
 * route enforces, within-file duplicate detection, faculty/department
 * NAME resolution planning, and temporary-password generation.
 * The route layer owns the DB lookups (existing emails / reg-numbers,
 * faculty→department chain) and the transaction.
 *
 * Honest scope: CSV only (Excel saves as CSV in one step — the UI
 * template says so). No XLSX parser dep exists in the house style, and
 * a half-rolled XLSX reader would be worse than a documented save-as.
 */

/** One file, ≤ 500 students — a registrar's class-list reality, and it
 *  keeps the preview table (and the transaction) bounded. */
export const BULK_IMPORT_MAX_ROWS = 500;

/** The exact header row the template ships — matched after trim. */
export const BULK_IMPORT_HEADERS = [
  'الاسم الأول',
  'اسم العائلة',
  'البريد الإلكتروني',
  'الرقم الجامعي',
  'الكلية',
  'القسم',
  'السنة',
] as const;

export interface BulkStudentRow {
  line: number; // 1-based data line (header excluded)
  firstName: string;
  lastName: string;
  email: string;
  universityId: string;
  faculty: string;
  department: string;
  year: number;
}

export interface BulkRowError {
  line: number;
  message: string;
}

export interface ParsedBulkCsv {
  rows: BulkStudentRow[];
  errors: BulkRowError[];
}

/**
 * RFC 4180 CSV parser. Deliberate scope: comma delimiter, `"` quoting
 * with `""` escapes, CRLF or LF line breaks, BOM stripped once. No
 * delimiter sniffing, no locale decimal games — the template is fixed.
 * Malformed quoting (an unterminated quoted field) surfaces as a
 * parse-level failure the route reports per-file, not per-row.
 */
export function parseCsv(text: string): string[][] {
  const bom = '\uFEFF';
  const clean = text.startsWith(bom) ? text.slice(bom.length) : text;
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < clean.length; i += 1) {
    const ch = clean[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"' && field === '') {
      // A quote opens a quoted field ONLY at field start; a quote that
      // appears mid-field is a literal character (lenient-RFC, Excel-like).
      inQuotes = true;
    } else if (ch === ',') {
      pushField();
    } else if (ch === '\n') {
      pushRow();
    } else if (ch === '\r') {
      // CRLF: consume the LF with it; a bare CR is also a line break.
      if (clean[i + 1] === '\n') i += 1;
      pushRow();
    } else {
      field += ch;
    }
  }
  // The final field/row only exists if something trailed the last break.
  if (field !== '' || row.length > 0) pushRow();
  return rows.filter((r) => !(r.length === 1 && r[0]!.trim() === ''));
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate + normalize the parsed grid into student rows.
 * `headerRow` is matched against BULK_IMPORT_HEADERS (order-insensitive,
 * trim-equal) — a wrong template is a file-level error, not 500 row errors.
 */
export function parseBulkStudentCsv(grid: string[][]): ParsedBulkCsv | { fileError: string } {
  if (grid.length === 0) return { fileError: 'الملف فارغ — حمّل القالب واملأه ثم أعد الرفع' };
  const header = grid[0]!.map((c) => c.trim());
  const expected = [...BULK_IMPORT_HEADERS].sort().join('\u0000');
  if ([...header].sort().join('\u0000') !== expected) {
    return {
      fileError:
        'ترويسة الملف لا تطابق القالب — حمّل القالب من جديد واحفظ الأعمدة بالترتيب نفسه',
    };
  }

  const rows: BulkStudentRow[] = [];
  const errors: BulkRowError[] = [];
  const seenEmails = new Map<string, number>();
  const seenUniversityIds = new Map<string, number>();

  for (let i = 1; i < grid.length; i += 1) {
    const line = i; // data line 1-based (header excluded)
    const cells = grid[i]!.map((c) => c.trim());
    if (cells.every((c) => c === '')) continue; // silent skip of blank lines

    // Cap FIRST (before any push): the file may hold at most
    // BULK_IMPORT_MAX_ROWS data rows — exactly, never 501.
    if (rows.length + errors.length >= BULK_IMPORT_MAX_ROWS) {
      errors.push({
        line,
        message: `عدد الصفوف يتجاوز الحد الأقصى (${BULK_IMPORT_MAX_ROWS}) — قسّم الملف`,
      });
      break;
    }

    const [firstName, lastName, email, universityId, faculty, department, yearRaw] = cells;
    const fail = (message: string) => errors.push({ line, message });

    if (!firstName) fail('الاسم الأول مطلوب');
    if (!lastName) fail('اسم العائلة مطلوب');
    if (!email || !EMAIL_SHAPE.test(email)) fail('البريد الإلكتروني غير صالح');
    if (!universityId) fail('الرقم الجامعي مطلوب');
    if (!faculty) fail('الكلية مطلوبة');
    if (!department) fail('القسم مطلوب');

    const year = yearRaw === undefined || yearRaw === '' ? 1 : Number(yearRaw);
    if (!Number.isInteger(year) || year < 1 || year > 8) {
      fail('السنة يجب أن تكون رقماً بين 1 و 8');
    }

    if (email && EMAIL_SHAPE.test(email)) {
      const key = email.toLowerCase();
      const firstAt = seenEmails.get(key);
      if (firstAt !== undefined) fail(`البريد الإلكتروني مكرر داخل الملف (أول ظهور: السطر ${firstAt})`);
      else seenEmails.set(key, line);
    }
    if (universityId) {
      const firstAt = seenUniversityIds.get(universityId);
      if (firstAt !== undefined) fail(`الرقم الجامعي مكرر داخل الملف (أول ظهور: السطر ${firstAt})`);
      else seenUniversityIds.set(universityId, line);
    }

    if (!errors.some((e) => e.line === line)) {
      rows.push({
        line,
        firstName: firstName!,
        lastName: lastName!,
        email: email!.toLowerCase(),
        universityId: universityId!,
        faculty: faculty!,
        department: department!,
        year: Math.trunc(year),
      });
    }
  }

  if (rows.length === 0 && errors.length === 0) {
    return { fileError: 'لا توجد صفوف بيانات في الملف' };
  }
  return { rows, errors };
}

/**
 * The TEMP password alphabet: 12 chars from a no-ambiguous set
 * (no 0/O, 1/l/I) — printable on the registrar's sheet, typable from a
 * phone, and it satisfies the platform's 12-char minimum policy.
 * `rng` is injectable for deterministic tests.
 */
const TEMP_PASSWORD_ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateTempPassword(rng: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 12; i += 1) {
    out += TEMP_PASSWORD_ALPHABET[Math.floor(rng() * TEMP_PASSWORD_ALPHABET.length)];
  }
  return out;
}

/** The printable header of the temp-password sheet (registrar hands these out). */
export const TEMP_PASSWORD_SHEET_HEADERS = ['الاسم', 'البريد الإلكتروني', 'الرقم الجامعي', 'كلمة المرور المؤقتة'] as const;

/**
 * A result row the preview/commit endpoints return — one entry per CSV
 * line, either an importable student (with its generated temp password)
 * or the honest per-line refusal.
 */
export interface BulkImportResultRow {
  line: number;
  status: 'ok' | 'error';
  message?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  universityId?: string;
  faculty?: string;
  department?: string;
  year?: number;
  tempPassword?: string;
}
