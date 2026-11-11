/**
 * Demonstration-institution facts — the demo tenant's synthetic profile
 * (r188; previously the r153k University-of-Zawia fact sheet; master/D6
 * re-keyed the fictional tenant to a clearly-generic MODEL INSTITUTION —
 * an educational organization label, not a university identity).
 *
 * Provenance: every literal below is SYNTHETIC demo data for «مؤسسة
 * مدارك النموذجية» — the platform's fictional demonstration tenant.
 * It mirrors the curated backend source shape
 * (backend/src/lib/zu-sync/static-source.ts, key `identity.*`) so the
 * same fact surfaces keep working, but nothing here claims a real
 * institution: no real founding decree, no real memberships, no real
 * addresses. The consuming surfaces label it بيانات تجريبية.
 */
export const UNIVERSITY_FACTS = {
  /** Synthetic founding year of the demo institution (demo-source). */
  foundedYear: 2015,
  /** Demo tenant — the platform's model institution (master/D6). */
  institutionNameAr: 'مؤسسة مدارك النموذجية',
  institutionNameEn: 'Madarek Model Institution',
  /**
   * Demo structure profile — what the student «about my institution»
   * page shows instead of retired real-institution membership claims:
   * the demo tenant's fictional structure highlights (named seats,
   * never a hard-coded count — counts render from live scoped data).
   */
  profile: [
    { label: 'نموذجية', full: 'مؤسّسة عرض اصطناعية — بياناتها مولَّدة لأغراض العرض، لا تمثّل أي جهة حقيقية' },
    { label: 'حرَم العرض', full: 'حرم المعرفة · حرم الابتكار · حرم البيان' },
    { label: 'متعددة الكليات', full: 'بنية أكاديمية تجريبية بمسارات البكالوريوس والدراسات العليا' },
  ],
} as const;
