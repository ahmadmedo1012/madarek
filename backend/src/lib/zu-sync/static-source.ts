/**
 * University data sync — static source.
 *
 * The PRD requires daily synchronization of public institutional data
 * from zu.edu.ly. A live HTML scraper would be fragile (no public API,
 * structure can change without notice). Instead, we curate a static
 * source from the official site (see `zu.edu.ly.md` in the repo) and
 * sync from it.
 *
 * Architecture: the sync system is fetcher-pluggable. To replace this
 * with a live HTTP fetcher later, implement a new module that exposes
 * the same `fetchFacts()` shape and swap it in `runSync()`.
 *
 * Source declaration: every fact is tagged with the section of the
 * official site it came from, so admins can audit provenance.
 */

export interface FactPatch {
  key: string;
  value: string;
  category:
    | 'identity'
    | 'contact'
    | 'strategic'
    | 'grading'
    | 'colleges'
    | 'memberships'
    | 'programs'
    | 'general';
  source: string;
}

/**
 * Curated facts derived from the public university site (zu.edu.ly)
 * via the snapshot in `zu.edu.ly.md`. Updated when the official site
 * publishes substantive changes.
 */
export const STATIC_FACTS: FactPatch[] = [
  // ─── Identity ────────────────────────────────────────────
  { key: 'name.ar', value: 'جامعة الزاوية', category: 'identity', source: 'zu.edu.ly:about' },
  { key: 'name.en', value: 'University of Zawia', category: 'identity', source: 'zu.edu.ly:about' },
  { key: 'foundingYear', value: '1988', category: 'identity', source: 'zu.edu.ly:about' },
  { key: 'foundingDecree', value: 'قرار اللجنة الشعبية العامة رقم (135)', category: 'identity', source: 'zu.edu.ly:about' },
  { key: 'collegeCount', value: '26', category: 'identity', source: 'zu.edu.ly:faculty' },
  { key: 'website', value: 'https://www.zu.edu.ly', category: 'identity', source: 'zu.edu.ly' },
  { key: 'website.en', value: 'https://www.zu.edu.ly/en', category: 'identity', source: 'zu.edu.ly' },

  // ─── Contact ─────────────────────────────────────────────
  { key: 'address.ar', value: 'جامعة الزاوية - ليبيا', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'phone.primary', value: '+218 23 762659', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'phone.secondary', value: '+218 23 762882', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'phone.tertiary', value: '+218 23 762382', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'fax', value: '+218 23 76240035', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'postBox', value: '16418', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'email.primary', value: 'info@zu.edu.ly', category: 'contact', source: 'zu.edu.ly:contact' },
  { key: 'email.ico', value: 'ico@zu.edu.ly', category: 'contact', source: 'zu.edu.ly:contact' },

  // ─── Memberships ─────────────────────────────────────────
  { key: 'memberships', value: 'اتحاد الجامعات العربية، اتحاد الجامعات الأفريقية، اتحاد الجامعات المتوسطية', category: 'memberships', source: 'zu.edu.ly:about' },

  // ─── Strategic plan ──────────────────────────────────────
  { key: 'strategicPlan.years', value: '2024 – 2028', category: 'strategic', source: 'zu.edu.ly:about' },
  { key: 'strategicPlan.vision', value: 'جعل الجامعة منارة علمية رائدة', category: 'strategic', source: 'zu.edu.ly:about' },
  { key: 'strategicPlan.mission', value: 'تقديم تعليم عالي الجودة، وتطوير البحث العلمي، والمشاركة الفعالة في خدمة المجتمع', category: 'strategic', source: 'zu.edu.ly:about' },
  { key: 'strategicPlan.goals', value: 'تعزيز السمعة الأكاديمية والبحثية، توسيع الشراكات، تجويد الخدمات التعليمية والمجتمعية', category: 'strategic', source: 'zu.edu.ly:about' },

  // ─── Grading scale ───────────────────────────────────────
  { key: 'grade.scale.excellent', value: '85% – 100%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.scale.veryGood', value: '75% – 84.9%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.scale.good', value: '65% – 74.9%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.scale.acceptable', value: '50% – 64.9%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.scale.weak', value: '35% – 49.9%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.scale.veryWeak', value: 'أقل من 35%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.passing.general', value: '50%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.passing.medical', value: '60%', category: 'grading', source: 'zu.edu.ly:rules' },
  { key: 'grade.passing.graduate', value: '65%', category: 'grading', source: 'zu.edu.ly:rules' },

  // ─── Programs ────────────────────────────────────────────
  { key: 'program.duration.4y', value: 'الآداب، الاقتصاد، التربية البدنية، العلوم، البيطرة، التقنية الطبية، التربية، تقنية المعلومات', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'program.duration.5y', value: 'الصيدلة، الهندسة، طب الأسنان، الصحة العامة', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'program.duration.6y', value: 'الطب البشري', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'language.primary', value: 'العربية', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'language.secondary', value: 'الإنجليزية (لكليات الطب)', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'degree.bachelor.science', value: 'البكالوريوس', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'degree.bachelor.humanities', value: 'الليسانس', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'degree.master', value: 'الإجازة العالية (الماجستير)', category: 'programs', source: 'zu.edu.ly:rules' },
  { key: 'degree.doctorate', value: 'الإجازة الدقيقة (الدكتوراه)', category: 'programs', source: 'zu.edu.ly:rules' },
];

/**
 * Curated college list (city-tagged) — drives the Faculty seed reconciliation.
 */
export const COLLEGES_BY_CITY: Record<string, string[]> = {
  'الزاوية': [
    'كلية الآداب', 'كلية الاقتصاد', 'كلية التربية', 'كلية القانون',
    'كلية العلوم', 'كلية الصيدلة', 'كلية الطب البشري',
    'كلية طب وجراحة الفم والأسنان', 'كلية التقنية الطبية',
    'كلية الرياضة والتربية البدنية', 'كلية التمريض',
    'كلية الهندسة', 'كلية تقنية المعلومات',
  ],
  'العجيلات': [
    'كلية الاقتصاد', 'كلية البيطرة والعلوم الزراعية', 'كلية التربية',
    'كلية الشريعة والقانون', 'كلية العلوم', 'كلية الصحة العامة',
  ],
  'بئر الغنم': ['كلية هندسة الموارد الطبيعية'],
  'صرمان': [],
  'صبراتة': [],
  'زوارة': ['كلية الآداب'],
  'أبي عيسى': ['كلية التربية'],
  'ناصر': ['كلية التربية'],
};
