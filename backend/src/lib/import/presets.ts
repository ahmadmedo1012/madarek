/**
 * R350 I-P4 — the mapping PRESETS (§I2): named, ready-made column
 * mappings for the common registrar file shapes, so a first upload
 * starts one tap from mapped instead of from zero.
 *
 *   · generic-university — the standard university export (verified).
 *   · generic-school     — the standard school roster (verified).
 *   · ghweil-school      — «منظومة الغويل للمدارس» (UNVERIFIED stub,
 *                          honestly labelled; the owner's anonymised
 *                          sample turns it real — §5 of the brief).
 *
 * A preset is a set of rules: each rule carries the header spellings
 * it accepts (folded at apply time — the same normalizeArabicSearch
 * fold the mapping engine uses) and the ONE canonical target they map
 * to. Application is tolerant on the HEADER side (a file may spell
 * «اسم الطالب» where the template said «الاسم الكامل») and strict on
 * the TARGET side (unknown vocabulary degrades to unknown — listed,
 * never guessed). The parse route reports per-preset COVERAGE of the
 * required targets so the wizard can suggest the best fit; the
 * registrar still reviews the mapping before preview (F2's step 2).
 */
import type { MappingProfile } from './mapping.js';

export type PresetEntity = 'STUDENT';

/** One placement rule: accepted header spellings → canonical target. */
export interface PresetRule {
  aliases: string[];
  target: string;
}

export interface ImportPreset {
  id: 'generic-university' | 'generic-school' | 'ghweil-school';
  /** The Arabic label the wizard chip carries. */
  labelAr: string;
  entity: PresetEntity;
  /** UNIVERSITY files carry faculty/department; SCHOOL files carry
   * stage/grade — purely informational for the UI (validation reads
   * the institution's own kind). */
  shape: 'UNIVERSITY' | 'SCHOOL';
  /** False = the stub nobody has verified against a real export. */
  verified: boolean;
  /** The honest Arabic note the wizard shows next to an unverified preset. */
  noteAr?: string;
  rules: PresetRule[];
  /** Targets a file must cover for this preset to be a clean fit. */
  requiredTargets: string[];
}

const COMMON_STUDENT_RULES: PresetRule[] = [
  { aliases: ['الاسم الكامل', 'اسم الطالب', 'الاسم', 'اسم الطالبة', 'full name', 'student name', 'name'], target: 'nameAr' },
  { aliases: ['رقم القيد', 'الرقم الجامعي', 'رقم التسجيل', 'رقم الطالب', 'الرقم المدرسي', 'registration number', 'student id', 'student number'], target: 'universityId' },
  { aliases: ['البريد الإلكتروني', 'البريد', 'الإيميل', 'email', 'e-mail'], target: 'email' },
  { aliases: ['هاتف الطالب', 'رقم الهاتف', 'الهاتف', 'الجوال', 'phone', 'mobile'], target: 'studentPhone' },
  { aliases: ['اسم ولي الأمر', 'ولي الأمر', 'guardian name', 'parent name'], target: 'guardianName' },
  { aliases: ['هاتف ولي الأمر', 'رقم ولي الأمر', 'guardian phone', 'parent phone'], target: 'guardianPhone' },
  { aliases: ['تاريخ الميلاد', 'الميلاد', 'date of birth', 'birth date', 'dob'], target: 'dateOfBirth' },
  { aliases: ['الجنس', 'النوع', 'gender'], target: 'gender' },
  { aliases: ['المدينة', 'city'], target: 'city' },
];

export const IMPORT_PRESETS: readonly ImportPreset[] = [
  {
    id: 'generic-university',
    labelAr: 'قالب جامعة (عام)',
    entity: 'STUDENT',
    shape: 'UNIVERSITY',
    verified: true,
    rules: [
      ...COMMON_STUDENT_RULES,
      { aliases: ['السنة الدراسية', 'السنة', 'year', 'academic year'], target: 'year' },
      { aliases: ['الكلية', 'faculty', 'college'], target: 'faculty' },
      { aliases: ['القسم', 'التخصص', 'department', 'specialization'], target: 'department' },
    ],
    requiredTargets: ['nameAr', 'universityId', 'year'],
  },
  {
    id: 'generic-school',
    labelAr: 'قالب مدرسة (عام)',
    entity: 'STUDENT',
    shape: 'SCHOOL',
    verified: true,
    rules: [
      ...COMMON_STUDENT_RULES,
      { aliases: ['المرحلة', 'stage'], target: 'stage' },
      { aliases: ['الصف', 'grade'], target: 'grade' },
      { aliases: ['الفصل', 'الشعبة', 'section'], target: 'section' },
    ],
    requiredTargets: ['nameAr', 'universityId', 'stage'],
  },
  {
    id: 'ghweil-school',
    labelAr: 'منظومة الغويل للمدارس (غير موثّق)',
    entity: 'STUDENT',
    shape: 'SCHOOL',
    verified: false,
    noteAr: 'قالب غير موثّق — تعذّر التحقق من صيغة ملفات «منظومة الغويل للمدارس» من أي مصدر موثوق. جرّبه بحذر وراجع المطابقة قبل التثبيت، وأرسل عينة ملف مجهولة الهوية ليكتمل التهيئة.',
    rules: [
      // best-guess school shape until the owner's sample arrives (§5):
      // the common Libyan school-export vocabulary. Every rule is a
      // GUESS — the preset is labelled unverified end-to-end.
      { aliases: ['الاسم', 'اسم الطالب', 'الاسم الكامل'], target: 'nameAr' },
      { aliases: ['الرقم', 'رقم الطالب', 'الرقم المدرسي'], target: 'universityId' },
      { aliases: ['الصف'], target: 'grade' },
      { aliases: ['الفصل', 'الشعبة'], target: 'section' },
      { aliases: ['ولي الأمر', 'اسم ولي الأمر'], target: 'guardianName' },
      { aliases: ['هاتف ولي الأمر', 'رقم ولي الأمر'], target: 'guardianPhone' },
      { aliases: ['الهاتف', 'هاتف الطالب'], target: 'studentPhone' },
      { aliases: ['الجنس'], target: 'gender' },
      { aliases: ['تاريخ الميلاد'], target: 'dateOfBirth' },
    ],
    requiredTargets: ['nameAr'],
  },
];

export interface PresetCoverage {
  id: ImportPreset['id'];
  /** placed required targets / total required targets. */
  coverage: number;
  placedTargets: string[];
  missingTargets: string[];
  /** Total headers the preset placed (beyond the required ones). */
  placedColumns: number;
}

/** Fold exactly like the mapping engine (mapping.ts foldHeader). */
function fold(header: string, normalize: (s: string) => string): string {
  return normalize(header).replace(/\s+/g, ' ');
}

/**
 * Apply ONE preset to a header row: every header resolves through the
 * preset's own alias rules (fold-equality); a hit's target must still
 * be a known canonical target or `custom:<key>` (the caller validates
 * custom keys against the institution). Returns the placement map
 * (header → target) — deliberately NOT a ColumnMap, so the wizard can
 * merge it into its editable mapping state.
 */
export function applyPresetToHeaders(
  preset: ImportPreset,
  headers: string[],
  normalize: (s: string) => string,
  knownTargets: ReadonlySet<string>,
  customKeys: ReadonlySet<string> = new Set(),
): Map<string, string> {
  const folded = new Map<string, string>();
  for (const rule of preset.rules) {
    for (const alias of rule.aliases) {
      const key = fold(alias, normalize);
      // FIRST rule wins: rule order is priority order, and a collision
      // is deterministic (never "whoever iterated last").
      if (!folded.has(key)) folded.set(key, rule.target);
    }
  }
  const placed = new Map<string, string>();
  for (const raw of headers) {
    const source = raw.trim();
    if (source === '') continue;
    const target = folded.get(fold(source, normalize));
    if (target === undefined) continue;
    const ok = target.startsWith('custom:')
      ? customKeys.has(target.slice('custom:'.length))
      : knownTargets.has(target);
    if (ok) placed.set(source, target);
  }
  return placed;
}

/** The per-preset required-target coverage for a header row. */
export function presetCoverage(
  preset: ImportPreset,
  headers: string[],
  normalize: (s: string) => string,
  knownTargets: ReadonlySet<string>,
  customKeys: ReadonlySet<string> = new Set(),
): PresetCoverage {
  const placed = applyPresetToHeaders(preset, headers, normalize, knownTargets, customKeys);
  const placedTargets = new Set(placed.values());
  const placedRequired = preset.requiredTargets.filter((t) => placedTargets.has(t));
  const missing = preset.requiredTargets.filter((t) => !placedTargets.has(t));
  return {
    id: preset.id,
    coverage: preset.requiredTargets.length === 0 ? 1 : placedRequired.length / preset.requiredTargets.length,
    placedTargets: placedRequired,
    missingTargets: missing,
    placedColumns: placed.size,
  };
}

/** The presets as saveable MappingProfiles (source = first alias, so a
 *  saved preset replays through applyMappingProfile against its own
 *  template dialect). */
export function presetToProfile(preset: ImportPreset): MappingProfile {
  return {
    version: 1,
    columns: preset.rules.map((r) => ({ source: r.aliases[0]!, target: r.target })),
  };
}
