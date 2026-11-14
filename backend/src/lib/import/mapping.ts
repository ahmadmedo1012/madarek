/**
 * Column-mapping engine (master-F1) — pure, DB-free. Turns a raw
 * header row into a ColumnMap: every source column gets a canonical
 * target, a confidence, or an explicit `unknown` (unknown columns are
 * LISTED and reported, never silently dropped — the registrar sees
 * exactly what the engine could not place).
 *
 * Layering contract with master-E1 (src/lib/profiles/fields.ts):
 *   · `mapImportHeader` is the AUTHORITY for the §9.4 Arabic alias
 *     table and for routing headers to institution custom-field keys —
 *     this module calls it FIRST and never duplicates its decisions.
 *   · This module ADDS the layer E1's table deliberately does not
 *     carry: the English equivalents, the split-name pair (الاسم الأول/
 *     اسم العائلة — the r323 CSV template's own headers), email,
 *     faculty, guardian name, stage, birth date, gender, city and the
 *     teacher's employee id. Keeping them HERE (not as edits inside
 *     E1's table) keeps the two workstreams merge-clean; every alias
 *     still funnels through the same fold (normalizeArabicSearch) and
 *     the same canonical vocabulary.
 *
 * `MappingProfile` is the serializable form ({version, columns}) a
 * client saves (POST /import/mapping-profiles) and replays on the
 * next file — buildColumnMap for a first sniff, applyMappingProfile
 * for every reuse.
 */
import {
  mapImportHeader,
  type CanonicalImportField,
  type CustomFieldImportMeta,
} from '../profiles/fields.js';
import { normalizeArabicSearch } from '../../modules/search/normalize.js';

/* ── canonical vocabulary ────────────────────────────────────────── */

/** Canonical targets beyond E1's `CanonicalImportField` (see header). */
export type ExtendedImportField =
  | CanonicalImportField
  | 'firstName' // الاسم الأول (r323 split-name pair)
  | 'lastName' // اسم العائلة
  | 'email' // البريد الإلكتروني
  | 'faculty' // الكلية — resolved by name → facultyId
  | 'guardianName' // اسم ولي الأمر
  | 'stage' // المرحلة (school mode)
  | 'dateOfBirth' // تاريخ الميلاد (yyyy-mm-dd)
  | 'gender' // الجنس
  | 'city' // المدينة
  | 'employeeId'; // الرقم الوظيفي (TEACHER identity)

/** What a column's target can be: a canonical field, `custom` (the
 *  institution-field key rides in `customKey`), or `unknown` — the
 *  explicit "could not place this column" marker. */
export type ColumnTarget = ExtendedImportField | 'custom' | 'unknown';

/** Arabic labels for the canonical targets (preview/report display). */
export const TARGET_LABELS_AR: Record<ExtendedImportField, string> = {
  nameAr: 'الاسم الكامل',
  firstName: 'الاسم الأول',
  lastName: 'اسم العائلة',
  email: 'البريد الإلكتروني',
  universityId: 'رقم القيد',
  studentPhone: 'هاتف الطالب',
  guardianPhone: 'هاتف ولي الأمر',
  guardianName: 'اسم ولي الأمر',
  department: 'القسم',
  faculty: 'الكلية',
  grade: 'الصف',
  section: 'الفصل',
  year: 'السنة الدراسية',
  stage: 'المرحلة',
  dateOfBirth: 'تاريخ الميلاد',
  gender: 'الجنس',
  city: 'المدينة',
  employeeId: 'الرقم الوظيفي',
};

/* ── the F1 extension aliases (Arabic + English equivalents) ─────── */

/** Every alias here must fold exactly like its canonical target; the
 *  E1 table (fields.ts IMPORT_HEADER_ALIASES) wins first, so none of
 *  these may contradict it. */
const EXTENDED_ALIASES: ReadonlyArray<readonly [string, ExtendedImportField]> = [
  // العربية — الصيغ التي لا يغطيها جدول E1 (§9.4)
  ['الاسم الأول', 'firstName'],
  ['اسم العائلة', 'lastName'],
  ['البريد الإلكتروني', 'email'],
  ['الكلية', 'faculty'],
  ['اسم ولي الأمر', 'guardianName'],
  ['المرحلة', 'stage'],
  ['تاريخ الميلاد', 'dateOfBirth'],
  ['الجنس', 'gender'],
  ['النوع', 'gender'],
  ['المدينة', 'city'],
  ['الرقم الوظيفي', 'employeeId'],
  // English equivalents
  ['full name', 'nameAr'],
  ['student name', 'nameAr'],
  ['name', 'nameAr'],
  ['first name', 'firstName'],
  ['last name', 'lastName'],
  ['family name', 'lastName'],
  ['surname', 'lastName'],
  ['email', 'email'],
  ['e-mail', 'email'],
  ['email address', 'email'],
  ['registration number', 'universityId'],
  ['student id', 'universityId'],
  ['student number', 'universityId'],
  ['reg number', 'universityId'],
  ['university id', 'universityId'],
  ['phone', 'studentPhone'],
  ['phone number', 'studentPhone'],
  ['student phone', 'studentPhone'],
  ['mobile', 'studentPhone'],
  ['guardian phone', 'guardianPhone'],
  ['parent phone', 'guardianPhone'],
  ['guardian name', 'guardianName'],
  ['parent name', 'guardianName'],
  ['faculty', 'faculty'],
  ['college', 'faculty'],
  ['department', 'department'],
  ['specialization', 'department'],
  ['grade', 'grade'],
  ['section', 'section'],
  ['year', 'year'],
  ['academic year', 'year'],
  ['stage', 'stage'],
  ['date of birth', 'dateOfBirth'],
  ['birth date', 'dateOfBirth'],
  ['dob', 'dateOfBirth'],
  ['gender', 'gender'],
  ['city', 'city'],
  ['employee id', 'employeeId'],
  ['staff id', 'employeeId'],
];

/** Fold a header the same way E1's mapper does (its foldHeader twin). */
function foldHeader(header: string): string {
  return normalizeArabicSearch(header).replace(/\s+/g, ' ');
}

const EXTENDED_FOLDED = new Map<string, ExtendedImportField>(
  EXTENDED_ALIASES.map(([alias, target]) => [foldHeader(alias), target] as const),
);

/* ── language detection (reporting only — never a gate) ──────────── */

const ARABIC_CHAR = /[\u0600-\u06FF]/;
const LATIN_CHAR = /[A-Za-z]/;

export type HeaderLanguage = 'ar' | 'en' | 'mixed';

/**
 * Detect the header row's dominant script by Unicode range. Arabic
 * wins at ≥80% of the lettered characters, English symmetric, a real
 * balance is `mixed`. Reported by /import/parse so the UI can pick its
 * template dialect; nothing downstream depends on it.
 */
export function detectHeadersLanguage(headers: string[]): HeaderLanguage {
  let arabic = 0;
  let latin = 0;
  for (const header of headers) {
    for (const ch of header) {
      if (ARABIC_CHAR.test(ch)) arabic += 1;
      else if (LATIN_CHAR.test(ch)) latin += 1;
    }
  }
  const total = arabic + latin;
  if (total === 0) return 'en'; // digits/punctuation only — call it Latin
  const ratio = arabic / total;
  if (ratio >= 0.8) return 'ar';
  if (ratio <= 0.2) return 'en';
  return 'mixed';
}

/* ── ColumnMap ───────────────────────────────────────────────────── */

export interface ColumnMapEntry {
  /** The source header as it appeared (trimmed). */
  source: string;
  /** 0-based column position in the grid. */
  index: number;
  /** Canonical target, or `unknown` when nothing matched. */
  target: ColumnTarget;
  /** Present when target routes to an institution custom-field key. */
  customKey?: string;
  /** 1 exact alias · 0.9 custom field · 0.85 matched after folding · 0 unknown. */
  confidence: number;
}

export interface ColumnMap {
  headers: string[];
  detectedLanguage: HeaderLanguage;
  /** One entry per source column, in column order — unknowns included. */
  columns: ColumnMapEntry[];
  /** The subset of headers that matched nothing (never silently dropped). */
  unknownColumns: string[];
}

/** Normalize the mixed custom-field input (plain keys or full metas). */
function toCustomMetas(
  customFields: readonly (CustomFieldImportMeta | string)[],
): CustomFieldImportMeta[] {
  return customFields.map((c) => (typeof c === 'string' ? { key: c } : c));
}

/**
 * Build the suggested ColumnMap for a header row. Resolution order:
 *   1. `mapImportHeader` (E1) — the §9.4 Arabic aliases + custom-field
 *      routing (importKeyAr/En, labels, raw key). Confidence 0.9 for
 *      custom fields, 1.0/0.85 for canonical (exact vs folded).
 *   2. The F1 extension table (English + split-name + contact fields).
 *   3. `unknown` — listed in `unknownColumns`, confidence 0.
 */
export function buildColumnMap(
  headers: string[],
  customFields: readonly (CustomFieldImportMeta | string)[] = [],
): ColumnMap {
  const metas = toCustomMetas(customFields);
  const columns: ColumnMapEntry[] = headers.map((raw, index) => {
    const source = raw.trim();
    const folded = foldHeader(source);
    // Did matching need the Arabic fold? (diacritics, أ/إ/آ, ة/ه…)
    const lightlyFolded = source.toLowerCase().replace(/\s+/g, ' ').trim();
    const foldedMatch = folded !== lightlyFolded ? 0.85 : 1;

    const e1Match = source === '' ? null : mapImportHeader(source, metas);
    if (e1Match !== null) {
      if (typeof e1Match === 'string') {
        return { source, index, target: e1Match, confidence: foldedMatch };
      }
      return { source, index, target: 'custom' as const, customKey: e1Match.custom, confidence: 0.9 };
    }

    const extended = EXTENDED_FOLDED.get(folded);
    if (extended !== undefined && folded !== '') {
      return { source, index, target: extended, confidence: foldedMatch };
    }

    return { source, index, target: 'unknown' as const, confidence: 0 };
  });

  return {
    headers,
    detectedLanguage: detectHeadersLanguage(headers),
    columns,
    unknownColumns: columns.filter((c) => c.target === 'unknown' && c.source !== '').map((c) => c.source),
  };
}

/* ── MappingProfile (serializable, save/reuse) ───────────────────── */

export interface MappingProfileColumn {
  source: string;
  /** Canonical field name, `custom:<key>` for custom fields, or `unknown`. */
  target: string;
}

export interface MappingProfile {
  version: 1;
  columns: MappingProfileColumn[];
}

/** The wire form of a column entry (custom keys flattened to `custom:`). */
export function columnEntryToWire(entry: ColumnMapEntry): MappingProfileColumn {
  return {
    source: entry.source,
    target: entry.customKey !== undefined ? `custom:${entry.customKey}` : entry.target,
  };
}

/** Serialize a ColumnMap into the saveable MappingProfile. */
export function toMappingProfile(map: ColumnMap): MappingProfile {
  return { version: 1, columns: map.columns.map(columnEntryToWire) };
}

const KNOWN_TARGETS = new Set<string>([
  ...Object.keys(TARGET_LABELS_AR),
  'unknown',
]);

/** R350 I-P4 — the canonical target vocabulary, public for the preset
 *  engine (a preset target outside this set degrades to unknown). */
export const KNOWN_IMPORT_TARGETS: ReadonlySet<string> = KNOWN_TARGETS;

/** R350 I-P4 — membership check convenience. */
export function isKnownImportTarget(target: string): boolean {
  return KNOWN_TARGETS.has(target);
}

/**
 * Replay a saved MappingProfile against a (possibly new) header row:
 * each profile column re-finds its source header by fold-equality, and
 * its target is re-validated against the known vocabulary (a stale or
 * hand-edited target degrades to `unknown` — listed, never guessed).
 * Custom-field targets additionally require the key to still exist in
 * the institution's definitions.
 */
export function applyMappingProfile(
  headers: string[],
  profile: MappingProfile,
  customFields: readonly (CustomFieldImportMeta | string)[] = [],
): ColumnMap {
  const metas = toCustomMetas(customFields);
  const customKeys = new Set(metas.map((m) => m.key));
  const byFoldedSource = new Map<string, MappingProfileColumn>();
  for (const col of profile.columns) byFoldedSource.set(foldHeader(col.source), col);

  const columns: ColumnMapEntry[] = headers.map((raw, index) => {
    const source = raw.trim();
    const saved = byFoldedSource.get(foldHeader(source));
    if (saved === undefined || source === '') {
      return { source, index, target: 'unknown' as const, confidence: 0 };
    }
    if (saved.target.startsWith('custom:')) {
      const key = saved.target.slice('custom:'.length);
      if (customKeys.has(key)) {
        return { source, index, target: 'custom' as const, customKey: key, confidence: 0.9 };
      }
      return { source, index, target: 'unknown' as const, confidence: 0 };
    }
    if (saved.target === 'unknown' || !KNOWN_TARGETS.has(saved.target)) {
      return { source, index, target: 'unknown' as const, confidence: 0 };
    }
    return { source, index, target: saved.target as ColumnTarget, confidence: 1 };
  });

  return {
    headers,
    detectedLanguage: detectHeadersLanguage(headers),
    columns,
    unknownColumns: columns.filter((c) => c.target === 'unknown' && c.source !== '').map((c) => c.source),
  };
}

/* ── row application ─────────────────────────────────────────────── */

/**
 * Project ONE data row through the ColumnMap into a flat record:
 * `{target: cellValue}` for canonical fields, `{'custom:<key>': value}`
 * for custom fields. Missing cells read as '' — the validation layer
 * owns requiredness, not the projector.
 */
export function mapRowToRecord(row: string[], map: ColumnMap): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of map.columns) {
    if (entry.target === 'unknown') continue;
    const wire = entry.customKey !== undefined ? `custom:${entry.customKey}` : entry.target;
    record[wire] = (row[entry.index] ?? '').trim();
  }
  return record;
}

/**
 * Strip the bilingual alias/documentation row the official templates
 * (and real registrar files) carry under the header: English aliases
 * of the very columns above them. The check is deliberately STRICT —
 * EVERY non-empty cell must itself resolve (as a header) to the SAME
 * target as the column it sits under, and at least 3 cells must be
 * non-empty. A real data row never satisfies this: student values are
 * names and numbers, not aliases of their own column headers.
 */
export function stripBilingualAliasRow(
  headers: string[],
  rows: string[][],
): { headers: string[]; rows: string[][] } {
  if (rows.length === 0) return { headers, rows };
  const candidate = rows[0]!;
  const main = buildColumnMap(headers);
  let nonEmpty = 0;
  let matches = 0;
  for (let i = 0; i < headers.length; i += 1) {
    const cell = (candidate[i] ?? '').trim();
    if (cell === '') continue;
    nonEmpty += 1;
    const cellMap = buildColumnMap([cell]);
    const cellEntry = cellMap.columns[0]!;
    const mainEntry = main.columns[i]!;
    if (
      cellEntry.target !== 'unknown' &&
      cellEntry.target === mainEntry.target &&
      (cellEntry.customKey ?? null) === (mainEntry.customKey ?? null)
    ) {
      matches += 1;
    }
  }
  if (nonEmpty >= 3 && matches === nonEmpty) {
    return { headers, rows: rows.slice(1) };
  }
  return { headers, rows };
}
