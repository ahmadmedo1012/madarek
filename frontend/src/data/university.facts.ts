/**
 * Demonstration-institution facts — the demo tenant's synthetic profile
 * (r188; previously the r153k University-of-Zawia fact sheet).
 *
 * Provenance: every literal below is SYNTHETIC demo data for «جامعة
 * مدارك التجريبية» — the platform's fictional demonstration tenant.
 * It mirrors the curated backend source shape
 * (backend/src/lib/zu-sync/static-source.ts, key `identity.*`) so the
 * same fact surfaces keep working, but nothing here claims a real
 * institution: no real founding decree, no real memberships, no real
 * addresses. The consuming surfaces label it بيانات تجريبية.
 */
export const UNIVERSITY_FACTS = {
  /** Synthetic founding year of the demo institution (demo-source). */
  foundedYear: 2015,
  /** Demo tenant — the platform's showcase institution (r188). */
  institutionNameAr: 'جامعة مدارك التجريبية',
  institutionNameEn: 'Madarek Demo University',
  /**
   * Demo structure profile — what the student «about my university»
   * page shows instead of the retired real-university membership
   * claims: the demo tenant's fictional structure highlights.
   */
  profile: [
    { label: 'تجريبية', full: 'مؤسّسة عرض اصطناعية — بياناتها مولَّدة لأغراض العرض' },
    { label: 'ثلاثة حرَم', full: 'حرم المعرفة · حرم الابتكار · حرم البيان' },
    { label: 'متعددة الكليات', full: 'بنية أكاديمية تجريبية بمسارات البكالوريوس والدراسات العليا' },
  ],
} as const;

