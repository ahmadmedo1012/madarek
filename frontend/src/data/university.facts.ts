/**
 * University institutional facts — the landing's single source of truth
 * (r153k / r153-D).
 *
 * Provenance: every literal below traces to the curated backend source
 * (backend/src/lib/zu-sync/static-source.ts, key `identity.*` /
 * `memberships`) or derives from the canonical colleges registry
 * (data/colleges.config.ts — the same registry `validate:colleges`
 * guards). The landing used to hand-retype these facts per section,
 * which is exactly how «متوسطيّة» became «إسلاميّة» (the curated source
 * says the Mediterranean union, not the Islamic one) and how «4 مدن»
 * contradicted both the registry (5 named cities) and the colleges
 * popover (6 حُرم). One module, one provenance comment per fact —
 * the colleges.config.ts content-registry precedent.
 */
import { colleges } from './colleges.config';

export const UNIVERSITY_FACTS = {
  /** zu.edu.ly:about via static-source.ts (`identity.founded`). */
  foundedYear: 1988,
  /** zu.edu.ly:about via static-source.ts (`identity.decree`). */
  decreeNumber: 135,
  /** zu.edu.ly:about via static-source.ts (`memberships`) — Arab,
   * African, and MEDITERRANEAN unions. «إسلاميّة» was a retyping
   * error, not a fact. */
  memberships: [
    { label: 'عربيّة', full: 'اتحاد الجامعات العربية' },
    { label: 'أفريقيّة', full: 'اتحاد الجامعات الأفريقية' },
    { label: 'متوسطيّة', full: 'اتحاد الجامعات المتوسطية' },
  ],
} as const;

/** Named campus cities from the canonical registry — «مناطق أخرى» is a
 * bucket, not a city, and is excluded from the count. Registry order
 * (الزاوية، العجيلات، زوارة، أبو عيسى، ناصر). */
export const CAMPUS_CITIES: readonly string[] = Array.from(
  new Set(
    colleges
      .map((c) => c.cityAr)
      .filter((city): city is string => Boolean(city) && city !== 'مناطق أخرى'),
  ),
);
