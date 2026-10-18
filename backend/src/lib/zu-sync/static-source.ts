/**
 * Demonstration-institution data sync — static source (r188).
 *
 * The PRD's daily institutional-data synchronization is demonstrated
 * with a curated static source. A live HTML scraper would be fragile
 * (no public API, structure can change without notice); instead the
 * demonstration tenant's fact sheet is curated here and synced from
 * it. The sync pipeline itself (fetcher-pluggable architecture, run
 * history, stale marking, per-institution scoping) is the REAL
 * product capability being demonstrated.
 *
 * r188 — FICTIONAL SOURCE: every fact below belongs to «جامعة مدارك
 * التجريبية», the platform's explicitly-synthetic demonstration
 * institution. Nothing here transcribes a real university: the
 * identity, contacts, strategy and grading values are coherent demo
 * fabrications (obviously-demo contact details, synthetic founding
 * year, concept campuses). Replaces the retired zu.edu.ly snapshot.
 *
 * Architecture: the sync system is fetcher-pluggable. To replace this
 * with a live HTTP fetcher later, implement a new module that exposes
 * the same `fetchFacts()` shape and swap it in `runSync()`.
 *
 * Source declaration: every fact is tagged with the demo source
 * section it came from, so admins can audit provenance.
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
 * Curated facts for the fictional demonstration tenant
 * (جامعة مدارك التجريبية). Synthetic by design — demo contact
 * details, demo identity, demo structure.
 */
export const STATIC_FACTS: FactPatch[] = [
  // ─── Identity ────────────────────────────────────────────
  { key: 'name.ar', value: 'جامعة مدارك التجريبية', category: 'identity', source: 'demo-source:identity' },
  { key: 'name.en', value: 'Madarek Demo University', category: 'identity', source: 'demo-source:identity' },
  { key: 'foundingYear', value: '2015', category: 'identity', source: 'demo-source:identity' },
  { key: 'foundingDecree', value: 'سجلّ عرض تجريبي — لا قرار حقيقي (بيانات اصطناعية)', category: 'identity', source: 'demo-source:identity' },
  { key: 'collegeCount', value: '25', category: 'identity', source: 'demo-source:colleges' },
  { key: 'website', value: 'https://demo.madarek.ly', category: 'identity', source: 'demo-source:identity' },

  // ─── Contact (obviously-synthetic demo details) ──────────
  { key: 'address.ar', value: 'حرم المعرفة · حرم الابتكار · حرم البيان — بيانات عرض', category: 'contact', source: 'demo-source:contact' },
  { key: 'phone.primary', value: '+218 00 000000', category: 'contact', source: 'demo-source:contact' },
  { key: 'postBox', value: '00000', category: 'contact', source: 'demo-source:contact' },
  { key: 'email.primary', value: 'info@demo.madarek.ly', category: 'contact', source: 'demo-source:contact' },

  // ─── Structure ───────────────────────────────────────────
  { key: 'memberships', value: 'لا عضويّات — مؤسّسة عرض اصطناعية (بيانات تجريبية)', category: 'memberships', source: 'demo-source:identity' },

  // ─── Strategic plan (synthetic) ──────────────────────────
  { key: 'strategicPlan.years', value: '2025 – 2029', category: 'strategic', source: 'demo-source:strategy' },
  { key: 'strategicPlan.vision', value: 'منصّة عرض تُبرهن على تعليم عالي منظَّم رقميًا', category: 'strategic', source: 'demo-source:strategy' },
  { key: 'strategicPlan.mission', value: 'إظهار سير العمل الأكاديمي الكامل — من الهيكل إلى الإتقان — ببيانات تجريبية آمنة', category: 'strategic', source: 'demo-source:strategy' },
  { key: 'strategicPlan.goals', value: 'تجربة الطالب، تقييم الأستاذ، عزل المؤسّسات، جودة قابلة للقياس — كلها كأمثلة حيّة', category: 'strategic', source: 'demo-source:strategy' },

  // ─── Grading scale (a coherent demo scale) ───────────────
  { key: 'grade.scale.excellent', value: '85% – 100%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.scale.veryGood', value: '75% – 84.9%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.scale.good', value: '65% – 74.9%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.scale.acceptable', value: '50% – 64.9%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.scale.weak', value: '35% – 49.9%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.scale.veryWeak', value: 'أقل من 35%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.passing.general', value: '50%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.passing.medical', value: '60%', category: 'grading', source: 'demo-source:rules' },
  { key: 'grade.passing.graduate', value: '65%', category: 'grading', source: 'demo-source:rules' },

  // ─── Programs (synthetic structure) ──────────────────────
  { key: 'program.duration.4y', value: 'الآداب، الاقتصاد، التربية البدنية، العلوم، البيطرة، التقنية الطبية، التربية، تقنية المعلومات', category: 'programs', source: 'demo-source:rules' },
  { key: 'program.duration.5y', value: 'الصيدلة، الهندسة، طب الأسنان، الصحة العامة', category: 'programs', source: 'demo-source:rules' },
  { key: 'program.duration.6y', value: 'الطب البشري', category: 'programs', source: 'demo-source:rules' },
  { key: 'language.primary', value: 'العربية', category: 'programs', source: 'demo-source:rules' },
  { key: 'language.secondary', value: 'الإنجليزية (لكليات الطب)', category: 'programs', source: 'demo-source:rules' },
  { key: 'degree.bachelor.science', value: 'البكالوريوس', category: 'programs', source: 'demo-source:rules' },
  { key: 'degree.bachelor.humanities', value: 'الليسانس', category: 'programs', source: 'demo-source:rules' },
  { key: 'degree.master', value: 'الإجازة العالية (الماجستير)', category: 'programs', source: 'demo-source:rules' },
  { key: 'degree.doctorate', value: 'الإجازة الدقيقة (الدكتوراه)', category: 'programs', source: 'demo-source:rules' },
];
