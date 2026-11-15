/**
 * Backend unit test — the master-G1 global-discovery search engine
 * `backend/src/modules/search/global.ts` (pure, DB-free — the engine's
 * law; the route handler owns every prisma call).
 *
 * Mirrors the conventions of __tests__/normalize.test.ts (co-located
 * pure suites) and tests/modules/visibility-logic.test.ts (where-shape
 * pins):
 *  · planGlobalQuery — the Arabic fold, the al-prefix arms, the DB
 *    contains variants, and E1 phone detection (digits-heavy queries
 *    normalize through lib/phones.ts);
 *  · rankHit — exact=0 < prefix=1 < substring=2 < none=∞ ordering,
 *    with the ال tolerance folded in;
 *  · globalSearchScope — THE FULL §10.4 permission matrix as
 *    where-shapes: student→no people; teacher→own-offering students +
 *    same-institution colleagues; admin→institution roster (phones
 *    admitted + returned); quality→roster name-only (phone search
 *    admitted, phone fields never returned); owner→everything; and the
 *    cross-institution isolation law on every non-OWNER where;
 *  · the parse/pagination/rank-and-page helpers + the href matrices.
 */
import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { normalizeArabicSearch } from '../normalize.js';
import {
  GLOBAL_SEARCH_CATEGORIES,
  RANK_NONE,
  RANK_PREFIX,
  RANK_SUBSTRING,
  RANK_EXACT,
  PHONE_FIELDS_ROLES,
  announcementHitHref,
  bookHitHref,
  candidateTake,
  emailMatchArms,
  eventHitHref,
  facultyHitHref,
  globalSearchScope,
  identifierHit,
  institutionHitHref,
  jobHitHref,
  materialHitHref,
  multiwordHit,
  parseGlobalSearchCategories,
  parseGlobalSearchPagination,
  phoneHit,
  phoneMatchArm,
  planGlobalQuery,
  questionHitHref,
  rankAndPaginate,
  rankHit,
  studentHitHref,
  teacherHitHref,
  typoHit,
  universityIdMatchArm,
  withinOneEdit,
} from '../global.js';

// ─────────────────────────────────────────────────────────────────
//  planGlobalQuery
// ─────────────────────────────────────────────────────────────────

describe('planGlobalQuery — Arabic fold + al-prefix + variants', () => {
  it('normalizes through the canonical normalizer (diacritics/hamza/ة folds) and keeps both base forms FIRST', () => {
    const plan = planGlobalQuery('الخَوَارِزْمِيَات');
    expect(plan.normalized).toBe('الخوارزميات');
    // r353-F: the variants list grew past the old [raw, normalized] —
    // the ال/clitic arms, the reverse folds and the per-word arms follow
    // the two base forms (order is deterministic; the head stays raw →
    // normalized so the trigram-friendly exact forms are tried first).
    expect(plan.variants[0]).toBe('الخَوَارِزْمِيَات');
    expect(plan.variants[1]).toBe('الخوارزميات');
    expect(plan.variants).toContain('خوارزميات'); // the noAl arm
  });

  it('carries the ال-stripped arm (noAl)', () => {
    expect(planGlobalQuery('المبروك').noAl).toBe('مبروك');
    expect(planGlobalQuery('مبروك').noAl).toBe('مبروك'); // no prefix → unchanged
  });

  it('dedupes the base forms when the raw query is already normalized (the fold arms follow)', () => {
    // r353-F: the reverse folds are the point — «احمد» must also try
    // the hamza-bearing forms the stored roster may carry.
    expect(planGlobalQuery('احمد').variants[0]).toBe('احمد');
    expect(new Set(planGlobalQuery('احمد').variants).size).toBe(planGlobalQuery('احمد').variants.length);
    expect(planGlobalQuery('cisco').variants).toEqual(['cisco']);
    expect(planGlobalQuery('Cisco').variants).toEqual(['Cisco', 'cisco']);
  });

  it('keeps the raw query byte-identical (the envelope echoes it)', () => {
    expect(planGlobalQuery('  أحمد ').raw).toBe('  أحمد ');
  });
});

describe('planGlobalQuery — r353-F bug 1: the REVERSE-FOLD gap (typed «احمد» vs stored «أحمد»)', () => {
  it('a plain-alif query regenerates the hamza-bearing forms the stored data may carry', () => {
    const plan = planGlobalQuery('احمد');
    expect(plan.variants).toContain('أحمد');
    expect(plan.variants).toContain('إحمد');
    expect(plan.variants).toContain('آحمد');
  });

  it('a plain ه query regenerates ة, a plain ي regenerates ى, a plain و regenerates ؤ', () => {
    expect(planGlobalQuery('مدرسه').variants).toContain('مدرسة');
    expect(planGlobalQuery('مستشفي').variants).toContain('مستشفى');
    expect(planGlobalQuery('مسؤول').variants).toContain('مسؤول'); // و → ؤ
  });

  it('multi-seat words regenerate the full cartesian (≤3 foldable positions)', () => {
    // «اسامه» (plain keyboard) must regenerate «أسامة» (both seats).
    expect(planGlobalQuery('اسامه').variants).toContain('أسامة');
    expect(planGlobalQuery('اسامه').variants).toContain('أسامه'); // single-seat forms too
    expect(planGlobalQuery('اسامه').variants).toContain('اسامة');
  });

  it('cross-word hamza seats: the per-word folds fetch «أحمد إبراهيم» from «احمد ابراهيم»', () => {
    const plan = planGlobalQuery('احمد ابراهيم');
    // The whole-query cartesian is skipped for multiword queries (the
    // per-word arms subsume it — each word matches alone, wherever it
    // lives in the stored name).
    expect(plan.variants).toContain('أحمد');
    expect(plan.variants).toContain('إبراهيم');
  });

  it('small cross-word pairs cover through the per-word arms («احمد سالم» → «أحمد» + «سألم»)', () => {
    const plan = planGlobalQuery('احمد سالم');
    expect(plan.variants).toContain('أحمد');
    expect(plan.variants).toContain('سألم');
  });

  it('long foldable queries degrade to Hamming-1 (bounded, never a 3^k explosion)', () => {
    // «الخوارزميات» carries 5 foldable positions → substitutions only.
    const plan = planGlobalQuery('الخوارزميات');
    expect(plan.variants).toContain('الخوارزميأت'); // single-seat substitution…
    expect(plan.variants).not.toContain('أخوإرزميآت'); // …never the cartesian
    expect(plan.variants.length).toBeLessThanOrEqual(40); // the hard cap
  });

  it('hamza-bearing QUERIES still find plain-alif data (the forward fold — unchanged)', () => {
    const plan = planGlobalQuery('أحمد');
    expect(plan.variants).toContain('احمد'); // the normalized twin
  });
});

describe('planGlobalQuery — r353-F bug 1b: the ال arms (noAl was computed but never used)', () => {
  it('«الشبكات» also tries «شبكات» — so it finds a stored «شبكات الحاسوب»', () => {
    const plan = planGlobalQuery('الشبكات');
    expect(plan.noAl).toBe('شبكات');
    expect(plan.variants).toContain('شبكات');
  });

  it('«شبكات» also tries «الشبكات» — so it finds a stored «الشبكات المتقدمة»', () => {
    expect(planGlobalQuery('شبكات').variants).toContain('الشبكات');
  });

  it('clitic-prefixed queries strip to the base word (والـ بالـ للـ فالـ كالـ)', () => {
    const plan = planGlobalQuery('والشبكات');
    expect(plan.variants).toContain('شبكات');
    expect(plan.variants).toContain('الشبكات');
  });

  it('multiword queries add per-word arms (order-free fetch: «المهدي محمد» fetches «محمد المهدي»)', () => {
    const plan = planGlobalQuery('المهدي محمد');
    expect(plan.variants).toContain('المهدي');
    expect(plan.variants).toContain('مهدي');
    expect(plan.variants).toContain('محمد');
  });

  it('single-letter and 2-letter preposition words never arm (the «في»/«و» leak guard)', () => {
    const plan = planGlobalQuery('ملتقى الذكاء الاصطناعي في ليبيا');
    expect(plan.variants).not.toContain('في');
    expect(plan.variants).not.toContain('و');
  });
});

describe('planGlobalQuery — r353-F bug 3: the digit fold reaches every arm', () => {
  it('Arabic-Indic digits fold in the variants (the code/university-id contains arms)', () => {
    const plan = planGlobalQuery('٣٠١');
    expect(plan.normalized).toBe('301');
    expect(plan.variants).toContain('301');
  });

  it('hyphenated student numbers survive as typed AND folded', () => {
    const plan = planGlobalQuery('UZ-2024-00001');
    expect(plan.variants).toContain('UZ-2024-00001');
    expect(plan.asciiLike).toBe(true);
  });

  it('asciiLike gates the identifier arms — Arabic queries never burn them', () => {
    expect(planGlobalQuery('احمد').asciiLike).toBe(false);
    expect(planGlobalQuery('احمد 2024').asciiLike).toBe(false);
    expect(planGlobalQuery('ahmed@madarek.ly').asciiLike).toBe(true);
    expect(planGlobalQuery('30351').asciiLike).toBe(true);
    expect(planGlobalQuery('CS301').asciiLike).toBe(true);
  });
});

describe('planGlobalQuery — phone detection (E1 normalizePhone)', () => {
  it('a Libyan trunk mobile resolves to the 218-prefixed search key', () => {
    const plan = planGlobalQuery('0912345678');
    expect(plan.digits).toBe(10);
    expect(plan.isPhoneQuery).toBe(true);
    expect(plan.phoneDigits).toBe('218912345678');
  });

  it('the international and bare-NSN shapes land on the SAME key', () => {
    expect(planGlobalQuery('+218 91 234 5678').phoneDigits).toBe('218912345678');
    expect(planGlobalQuery('00218912345678').phoneDigits).toBe('218912345678');
    expect(planGlobalQuery('912345678').phoneDigits).toBe('218912345678');
  });

  it('Arabic-Indic digits count and normalize (E1 converts them)', () => {
    const plan = planGlobalQuery('٠٩١٢٣٤٥٦٧٨');
    expect(plan.digits).toBe(10);
    expect(plan.phoneDigits).toBe('218912345678');
  });

  it('a non-international number stays as typed (no Libyan guess)', () => {
    expect(planGlobalQuery('+44 7911 123456').phoneDigits).toBe('447911123456');
  });

  it('a name query with a few digits is NOT a phone query', () => {
    const plan = planGlobalQuery('أحمد 1234');
    expect(plan.digits).toBe(4);
    expect(plan.isPhoneQuery).toBe(false);
    expect(plan.phoneDigits).toBeNull();
  });

  it('digits-heavy garbage (unresolvable trunk form) is not a phone query', () => {
    // 0… trunk that does not resolve to the Libyan plan → normalizePhone
    // refuses (a countryless guess would poison the search key).
    const plan = planGlobalQuery('0123456789012345');
    expect(plan.digits).toBe(16);
    expect(plan.isPhoneQuery).toBe(false);
    expect(plan.phoneDigits).toBeNull();
  });

  it('digit-count below the phone threshold never phone-matches', () => {
    expect(planGlobalQuery('1234567').isPhoneQuery).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
//  rankHit
// ─────────────────────────────────────────────────────────────────

describe('rankHit — exact=0, prefix=1, substring=2, none=∞', () => {
  it('exact', () => {
    expect(rankHit('خوارزميات', 'خوارزميات')).toBe(RANK_EXACT);
    expect(rankHit(normalizeArabicSearch('Cisco Networking'), 'cisco networking')).toBe(RANK_EXACT);
  });

  it('prefix', () => {
    expect(rankHit('خوارزميات متقدمة', 'خوارزميات')).toBe(RANK_PREFIX);
    expect(rankHit('خوارزميات متقدمة', 'خوارزمي')).toBe(RANK_PREFIX);
  });

  it('substring (not a prefix)', () => {
    expect(rankHit('مقدمة في خوارزميات المراحل', 'خوارزميات')).toBe(RANK_SUBSTRING);
    expect(rankHit('شبكات الحاسوب', 'الحاسوب')).toBe(RANK_SUBSTRING);
  });

  it('no match', () => {
    expect(rankHit('شبكات', 'خوارزميات')).toBe(RANK_NONE);
    expect(rankHit('', 'خوارزميات')).toBe(RANK_NONE);
  });

  it('the ordering law: exact < prefix < substring < none', () => {
    const ranks = [
      rankHit('احمد', 'احمد'),
      rankHit('احمد المبروك', 'احمد'),
      rankHit('محمد احمد', 'احمد'),
      rankHit('محمد', 'احمد'),
    ];
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(4);
  });

  it('the ال prefix tolerance is folded into the ranking', () => {
    // «الرياضيات» ranks EXACT against «رياضيات» — the ranker and the
    // matchesNormalizedQuery verifier can never disagree on matchability.
    expect(rankHit('رياضيات', 'الرياضيات')).toBe(RANK_EXACT);
    expect(rankHit('رياضيات تطبيقية', 'الرياضيات')).toBe(RANK_PREFIX);
    expect(rankHit('كلية الرياضيات', 'الرياضيات')).toBe(RANK_SUBSTRING);
  });

  it('an empty query never matches (defensive)', () => {
    expect(rankHit('anything', '')).toBe(RANK_NONE);
  });
});

// ─────────────────────────────────────────────────────────────────
//  globalSearchScope — THE §10.4 permission matrix
// ─────────────────────────────────────────────────────────────────

const INST = 'inst_demo';
const USER = 'user_1';

describe('globalSearchScope — STUDENT discovers NO people', () => {
  const scope = globalSearchScope(Role.STUDENT, USER, INST, {
    facultyIds: ['fac_1'],
    departmentIds: ['dep_1'],
    offeringIds: ['off_1', 'off_2'],
  });

  it('students and teachers categories are null (empty, not an error)', () => {
    expect(scope.students).toBeNull();
    expect(scope.teachers).toBeNull();
  });

  it('records remain: own institution, own faculties/departments, enrolled offerings', () => {
    expect(scope.institutions).toEqual({ id: INST });
    expect(scope.faculties).toEqual({ institutionId: INST });
    expect(scope.departments).toEqual({ faculty: { institutionId: INST } });
    // offeringVisibilityFilter's STUDENT branch: ACTIVE enrollments only.
    expect(scope.courses).toEqual({
      enrollments: { some: { studentId: USER, status: 'active' } },
    });
  });

  it('announcements: PLATFORM + the caller own scopes (feed shape)', () => {
    expect(scope.announcements).toEqual({
      OR: [
        { scope: 'PLATFORM' },
        { scope: 'FACULTY', scopeId: { in: ['fac_1'] } },
        { scope: 'DEPARTMENT', scopeId: { in: ['dep_1'] } },
        { scope: 'OFFERING', scopeId: { in: ['off_1', 'off_2'] } },
      ],
    });
  });

  it('no phone search, no phone fields', () => {
    expect(scope.phoneSearch).toBe(false);
    expect(scope.phoneFieldsVisible).toBe(false);
  });
});

describe('globalSearchScope — TEACHER: own-offering students + same-institution colleagues', () => {
  const scope = globalSearchScope(Role.TEACHER, USER, INST, {
    facultyIds: ['fac_9'],
    departmentIds: ['dep_9'],
    offeringIds: ['off_9'],
  });

  it('students: ONLY students with an ACTIVE enrollment in an offering they teach', () => {
    expect(scope.students).toEqual({
      role: 'STUDENT',
      enrollments: { some: { status: 'active', offering: { teacherId: USER } } },
    });
  });

  it('teachers: colleagues = same-institution TEACHER profiles (active membership)', () => {
    expect(scope.teachers).toEqual({
      role: 'TEACHER',
      teacherProfiles: { some: { membership: { institutionId: INST, isActive: true } } },
    });
  });

  it('courses: the offerings they teach (the ownership pin)', () => {
    expect(scope.courses).toEqual({ teacherId: USER });
  });

  it('records institution-scoped; no phone search, no phone fields', () => {
    expect(scope.institutions).toEqual({ id: INST });
    expect(scope.faculties).toEqual({ institutionId: INST });
    expect(scope.departments).toEqual({ faculty: { institutionId: INST } });
    expect(scope.phoneSearch).toBe(false);
    expect(scope.phoneFieldsVisible).toBe(false);
  });
});

describe('globalSearchScope — ADMIN: the institution roster incl. phone columns', () => {
  const scope = globalSearchScope(Role.ADMIN, USER, INST, {
    facultyIds: ['fac_1'],
    departmentIds: ['dep_1'],
    offeringIds: ['off_1'],
  });

  it('students: users with an ACTIVE StudentProfile in the institution', () => {
    expect(scope.students).toEqual({
      role: 'STUDENT',
      studentProfiles: { some: { institutionId: INST, membership: { isActive: true } } },
    });
  });

  it('teachers: users with an ACTIVE TeacherProfile in the institution', () => {
    expect(scope.teachers).toEqual({
      role: 'TEACHER',
      teacherProfiles: { some: { membership: { institutionId: INST, isActive: true } } },
    });
  });

  it('courses: institution-pinned through the offering → course chain', () => {
    expect(scope.courses).toEqual({ course: { institutionId: INST } });
  });

  it('phone search YES and phone fields YES (the only roster with both)', () => {
    expect(scope.phoneSearch).toBe(true);
    expect(scope.phoneFieldsVisible).toBe(true);
  });
});

describe('globalSearchScope — QUALITY: the roster name-only', () => {
  const scope = globalSearchScope(Role.QUALITY, USER, INST, {});

  it('same institution roster shape as ADMIN', () => {
    expect(scope.students).toEqual(
      globalSearchScope(Role.ADMIN, USER, INST, {}).students,
    );
    expect(scope.teachers).toEqual(
      globalSearchScope(Role.ADMIN, USER, INST, {}).teachers,
    );
  });

  it('phone search admitted (the registrar lookup is shared) but phone fields NEVER returned', () => {
    expect(scope.phoneSearch).toBe(true);
    expect(scope.phoneFieldsVisible).toBe(false);
  });

  it('without facts, announcements collapse to PLATFORM-only', () => {
    expect(scope.announcements).toEqual({ OR: [{ scope: 'PLATFORM' }] });
  });
});

describe('globalSearchScope — OWNER: every institution, phones both ways', () => {
  const scope = globalSearchScope(Role.OWNER, USER, null, {});

  it('unscoped wheres across every category (platform-wide oversight)', () => {
    expect(scope.students).toEqual({ role: 'STUDENT' });
    expect(scope.teachers).toEqual({ role: 'TEACHER' });
    expect(scope.institutions).toEqual({});
    expect(scope.faculties).toEqual({});
    expect(scope.departments).toEqual({});
    expect(scope.courses).toEqual({});
    expect(scope.announcements).toEqual({});
  });

  it('phone search YES and phone fields YES', () => {
    expect(scope.phoneSearch).toBe(true);
    expect(scope.phoneFieldsVisible).toBe(true);
  });
});

describe('globalSearchScope — cross-institution isolation (the law)', () => {
  it('the institution-shared record categories pin the institution id for every non-OWNER role', () => {
    for (const role of [Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.QUALITY] as const) {
      const scope = globalSearchScope(role, USER, INST, {});
      for (const key of ['institutions', 'faculties', 'departments'] as const) {
        expect(JSON.stringify(scope[key]), `${role}.${key}`).toContain(INST);
      }
    }
  });

  it('announcements pin the institution THROUGH the facts (the feed convention)', () => {
    // The scope ids come from facts the handler gathers
    // institution-scoped (own profile + own enrollments for
    // STUDENT/TEACHER, the institution's faculties/departments/
    // offerings for ADMIN/QUALITY) — a foreign institution's ids can
    // never enter the OR.
    for (const role of [Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.QUALITY] as const) {
      const scope = globalSearchScope(role, USER, INST, {
        facultyIds: ['fac_demo_1'],
        departmentIds: ['dep_demo_1'],
        offeringIds: ['off_demo_1'],
      });
      const blob = JSON.stringify(scope.announcements);
      expect(blob, role).toContain('fac_demo_1');
      expect(blob, role).toContain('dep_demo_1');
      expect(blob, role).toContain('off_demo_1');
      expect(blob, role).not.toContain('inst_tripoli');
    }
  });

  it('the oversight roles pin courses to the institution (offering → course chain)', () => {
    for (const role of [Role.ADMIN, Role.QUALITY] as const) {
      expect(JSON.stringify(globalSearchScope(role, USER, INST, {}).courses), role).toContain(INST);
    }
  });

  it('STUDENT/TEACHER courses pin by OWNERSHIP (enrollment / teaching assignment) — the stronger per-row guarantee', () => {
    // profile-scoping.ts's own ruling: student/teacher rows are pinned
    // by what they own, which is stronger than institution membership.
    expect(JSON.stringify(globalSearchScope(Role.STUDENT, USER, INST, {}).courses)).toContain(USER);
    expect(JSON.stringify(globalSearchScope(Role.TEACHER, USER, INST, {}).courses)).toContain(USER);
  });

  it('a foreign institution id never appears in any scoped where', () => {
    const scope = globalSearchScope(Role.ADMIN, USER, INST, {});
    const blob = JSON.stringify(scope);
    expect(blob).not.toContain('inst_tripoli');
  });

  it('a contextless non-OWNER role fails closed — nothing discoverable', () => {
    const scope = globalSearchScope(Role.ADMIN, USER, null, {});
    expect(scope.students).toBeNull();
    expect(scope.teachers).toBeNull();
    expect(scope.institutions).toBeNull();
    expect(scope.faculties).toBeNull();
    expect(scope.departments).toBeNull();
    expect(scope.courses).toBeNull();
    expect(scope.announcements).toBeNull();
    expect(scope.phoneSearch).toBe(false);
    expect(scope.phoneFieldsVisible).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
//  Phone arm + phone re-verification
// ─────────────────────────────────────────────────────────────────

describe('phoneMatchArm / phoneHit (§5)', () => {
  it('null for a non-phone query', () => {
    expect(phoneMatchArm(planGlobalQuery('أحمد'), INST)).toBeNull();
  });

  it('matches BOTH normalized student columns, re-pinned to the institution', () => {
    const arm = phoneMatchArm(planGlobalQuery('0912345678'), INST);
    expect(arm).toEqual({
      studentProfiles: {
        some: {
          institutionId: INST,
          OR: [
            { studentPhoneNormalized: { contains: '218912345678' } },
            { guardianPhoneNormalized: { contains: '218912345678' } },
          ],
        },
      },
    });
  });

  it('OWNER (no institution) searches every institution — no pin inside the arm', () => {
    const arm = phoneMatchArm(planGlobalQuery('0912345678'), null);
    expect(arm).toEqual({
      studentProfiles: {
        some: {
          OR: [
            { studentPhoneNormalized: { contains: '218912345678' } },
            { guardianPhoneNormalized: { contains: '218912345678' } },
          ],
        },
      },
    });
  });

  it('r353-F E5: a faculty-scoped registrar\'s phone arm carries the faculty pin (no out-of-faculty fetch)', () => {
    const arm = phoneMatchArm(planGlobalQuery('0912345678'), INST, 'fac_eng');
    expect(arm).toEqual({
      studentProfiles: {
        some: {
          institutionId: INST,
          facultyId: 'fac_eng',
          OR: [
            { studentPhoneNormalized: { contains: '218912345678' } },
            { guardianPhoneNormalized: { contains: '218912345678' } },
          ],
        },
      },
    });
  });

  it('phoneHit verifies the fetched profile (student OR guardian column)', () => {
    const plan = planGlobalQuery('0912345678');
    expect(phoneHit({ studentPhoneNormalized: '218912345678', guardianPhoneNormalized: null }, plan)).toBe(true);
    // Sibling privacy: the shared FAMILY number finds the sibling too —
    // by design (the registrar's use case).
    expect(phoneHit({ studentPhoneNormalized: null, guardianPhoneNormalized: '218912345678' }, plan)).toBe(true);
    expect(phoneHit({ studentPhoneNormalized: '218200000000', guardianPhoneNormalized: null }, plan)).toBe(false);
    expect(phoneHit(undefined, plan)).toBe(false);
    expect(phoneHit({ studentPhoneNormalized: '218912345678', guardianPhoneNormalized: null }, planGlobalQuery('أحمد'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
//  r353-F — the registrar's identifier arms (bugs 2+3)
// ─────────────────────────────────────────────────────────────────

describe('emailMatchArms / universityIdMatchArm (the exact-key fast paths)', () => {
  it('email arms: exact (User_email_key) + insensitive contains — ASCII queries only', () => {
    expect(emailMatchArms(planGlobalQuery('ahmed@madarek.ly'))).toEqual([
      { email: 'ahmed@madarek.ly' },
      { email: { contains: 'ahmed@madarek.ly', mode: 'insensitive' } },
    ]);
    // An Arabic name query never burns the (unindexed) email ILIKE arm.
    expect(emailMatchArms(planGlobalQuery('احمد'))).toEqual([]);
  });

  it('universityId arm: exact (the (institutionId, universityId) unique index) + digit-folded contains', () => {
    const arm = universityIdMatchArm(planGlobalQuery('UZ-2024-00001'), INST, 'fac_eng');
    const blob = JSON.stringify(arm);
    // The exact fast path + the case-folded contains path, pinned inside
    // the institution+faculty profile some.
    expect(arm).toEqual({
      studentProfiles: {
        some: {
          institutionId: INST,
          facultyId: 'fac_eng',
          OR: expect.arrayContaining([
            { universityId: 'UZ-2024-00001' },
            { universityId: { contains: 'UZ-2024-00001', mode: 'insensitive' } },
            { universityId: { contains: 'uz-2024-00001', mode: 'insensitive' } },
          ]),
        },
      },
    });
    // The variants list also carries the ال-free base forms only for
    // Arabic queries — an ASCII id never gets an ال-prefixed twin.
    expect(blob).not.toContain('ال');
  });

  it('Arabic-Indic digits fold into the universityId contains arm («٣٠١» finds «301»)', () => {
    const arm = universityIdMatchArm(planGlobalQuery('٣٠١'), INST);
    expect(JSON.stringify(arm)).toContain('"contains":"301"');
  });

  it('OWNER drops the exact arm (the unique index is composite) but keeps contains', () => {
    const arm = universityIdMatchArm(planGlobalQuery('30351'), null);
    expect(arm).not.toBeNull();
    expect(JSON.stringify(arm)).not.toContain('"universityId":"30351"');
    expect(JSON.stringify(arm)).toContain('"contains":"30351"');
  });

  it('an Arabic name query admits no universityId arm (dead ILIKE guard)', () => {
    expect(universityIdMatchArm(planGlobalQuery('احمد'), INST)).toBeNull();
  });
});

describe('identifierHit — the JS re-verification for identifier-fetched rows', () => {
  it('an exact student number ranks EXACT (the registrar typed the whole key)', () => {
    expect(identifierHit('UZ-2024-00001', planGlobalQuery('UZ-2024-00001'))).toBe(RANK_EXACT);
    expect(identifierHit('uz-2024-00001', planGlobalQuery('UZ-2024-00001'))).toBe(RANK_EXACT);
  });

  it('a partial number ranks SUBSTRING; Arabic-Indic digits fold', () => {
    expect(identifierHit('UZ-2024-00001', planGlobalQuery('2024'))).toBe(RANK_SUBSTRING);
    expect(identifierHit('UZ-2024-00001', planGlobalQuery('٠٠٠٠١'))).toBe(RANK_SUBSTRING);
    expect(identifierHit('UZ-2024-00001', planGlobalQuery('٢٠٢٤'))).toBe(RANK_SUBSTRING);
  });

  it('an exact email ranks EXACT; a partial email SUBSTRING', () => {
    expect(identifierHit('ahmed.taher@students.madarek.ly', planGlobalQuery('ahmed.taher@students.madarek.ly'))).toBe(RANK_EXACT);
    expect(identifierHit('ahmed.taher@students.madarek.ly', planGlobalQuery('ahmed.taher'))).toBe(RANK_SUBSTRING);
    expect(identifierHit('ahmed.taher@students.madarek.ly', planGlobalQuery('@students.madarek.ly'))).toBe(RANK_SUBSTRING);
  });

  it('an Arabic name query never matches an identifier (the fold classes cannot collide)', () => {
    expect(identifierHit('UZ-2024-00001', planGlobalQuery('احمد'))).toBe(RANK_NONE);
    expect(identifierHit('ahmed@madarek.ly', planGlobalQuery('شبكات'))).toBe(RANK_NONE);
    expect(identifierHit(null, planGlobalQuery('30351'))).toBe(RANK_NONE);
    expect(identifierHit(undefined, planGlobalQuery('30351'))).toBe(RANK_NONE);
  });
});

// ─────────────────────────────────────────────────────────────────
//  r353-F — the multiword (order-free) + 1-edit-typo rank arms
// ─────────────────────────────────────────────────────────────────

describe('multiwordHit / typoHit / withinOneEdit (the last-resort rank arms)', () => {
  it('withinOneEdit: substitution, transposition, insert, delete — bounded to one edit', () => {
    expect(withinOneEdit('طالب', 'طلاب')).toBe(true);   // transposition
    expect(withinOneEdit('محمد', 'محمذ')).toBe(true);   // substitution
    expect(withinOneEdit('محمد', 'محمدد')).toBe(true);  // insertion
    expect(withinOneEdit('محمد', 'محد')).toBe(true);    // deletion
    expect(withinOneEdit('محمد', 'محنذ')).toBe(false);  // two edits
    expect(withinOneEdit('محمد', 'محمد')).toBe(true);   // identical
  });

  it('multiwordHit: «المهدي محمد» matches the stored «محمد المهدي» (order-free)', () => {
    const plan = planGlobalQuery('المهدي محمد');
    expect(multiwordHit(['محمد', 'المهدي', 'محمد المهدي'], plan)).toBe(true);
    expect(multiwordHit(['محمد علي'], plan)).toBe(false); // one word missing
  });

  it('multiwordHit never fires for single-word queries (the substring contract owns those)', () => {
    expect(multiwordHit(['محمد المهدي'], planGlobalQuery('محمد'))).toBe(false);
  });

  it('typoHit: «هندسي» matches «هندسة» — and «طلاب» matches «الطالب»', () => {
    expect(typoHit(['هندسة البرمجيات'], planGlobalQuery('هندسي'))).toBe(true);
    expect(typoHit(['الطالب'], planGlobalQuery('طلاب'))).toBe(true);
    expect(typoHit(['قواعد البيانات'], planGlobalQuery('هندسي'))).toBe(false);
  });

  it('typoHit is gated to 4+ letter words (a 1-edit near-miss on a 3-letter word is noise)', () => {
    expect(typoHit(['شبك'], planGlobalQuery('شبح'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
//  r353-F E5 — the college-registrar faculty scope + the phone-fields seat
// ─────────────────────────────────────────────────────────────────

describe('r353-F E5 — globalSearchScope: the scopeFacultyId pin (the users-list mirror)', () => {
  const FAC = 'fac_eng';

  it('a scoped ADMIN sees ONLY their faculty\'s students (the same profile some as the institution pin)', () => {
    const scope = globalSearchScope(Role.ADMIN, USER, INST, {}, FAC);
    expect(scope.students).toEqual({
      role: 'STUDENT',
      studentProfiles: {
        some: { institutionId: INST, membership: { isActive: true }, facultyId: FAC },
      },
    });
  });

  it('a scoped ADMIN sees ONLY teachers homed in their faculty (department → faculty chain)', () => {
    const scope = globalSearchScope(Role.ADMIN, USER, INST, {}, FAC);
    expect(scope.teachers).toEqual({
      role: 'TEACHER',
      teacherProfiles: {
        some: { membership: { institutionId: INST, isActive: true }, department: { facultyId: FAC } },
      },
    });
  });

  it('the same pin applies to a scoped QUALITY caller (the users list narrows both seats)', () => {
    const scope = globalSearchScope(Role.QUALITY, USER, INST, {}, FAC);
    expect(scope.students).toEqual(globalSearchScope(Role.ADMIN, USER, INST, {}, FAC).students);
    expect(scope.teachers).toEqual(globalSearchScope(Role.ADMIN, USER, INST, {}, FAC).teachers);
  });

  it('an UNSCOPED admin keeps the institution-wide roster (byte-identical to the pre-E5 shape)', () => {
    expect(globalSearchScope(Role.ADMIN, USER, INST, {}, null).students).toEqual(
      globalSearchScope(Role.ADMIN, USER, INST, {}).students,
    );
    expect(globalSearchScope(Role.ADMIN, USER, INST, {}, undefined).teachers).toEqual(
      globalSearchScope(Role.ADMIN, USER, INST, {}).teachers,
    );
  });

  it('the faculty pin changes NOTHING for STUDENT/TEACHER callers (their arms are ownership-pinned already)', () => {
    expect(globalSearchScope(Role.STUDENT, USER, INST, {}, FAC).students).toBeNull();
    expect(globalSearchScope(Role.TEACHER, USER, INST, {}, FAC).courses).toEqual({ teacherId: USER });
  });

  it('non-people categories stay institution-wide for a scoped registrar (the users-list analogy covers people/roster)', () => {
    const scoped = globalSearchScope(Role.ADMIN, USER, INST, {}, FAC);
    const unscoped = globalSearchScope(Role.ADMIN, USER, INST, {});
    expect(scoped.courses).toEqual(unscoped.courses);
    expect(scoped.faculties).toEqual(unscoped.faculties);
    expect(scoped.announcements).toEqual(unscoped.announcements);
  });
});

describe('r353-F E5 — phoneFieldsVisible is the USERS_MANAGE seat (lib/permissions.ts)', () => {
  it('PHONE_FIELDS_ROLES is pinned to ADMIN + OWNER (the DEFAULT_ROLE_CAPABILITIES USERS_MANAGE holders)', () => {
    expect(PHONE_FIELDS_ROLES).toEqual(['ADMIN', 'OWNER']);
  });

  it('ADMIN and OWNER get phone fields; QUALITY never does (even with the shared phone SEARCH arm)', () => {
    expect(globalSearchScope(Role.ADMIN, USER, INST, {}).phoneFieldsVisible).toBe(true);
    expect(globalSearchScope(Role.OWNER, USER, null, {}).phoneFieldsVisible).toBe(true);
    expect(globalSearchScope(Role.QUALITY, USER, INST, {}).phoneFieldsVisible).toBe(false);
    expect(globalSearchScope(Role.QUALITY, USER, INST, {}).phoneSearch).toBe(true); // the lookup stays shared
  });
});

// ─────────────────────────────────────────────────────────────────
//  Categories / pagination / rank-and-page helpers
// ─────────────────────────────────────────────────────────────────

describe('parseGlobalSearchCategories', () => {
  it('missing / empty / non-string → every category (the collapse convention)', () => {
    expect(parseGlobalSearchCategories(undefined)).toEqual([...GLOBAL_SEARCH_CATEGORIES]);
    expect(parseGlobalSearchCategories('')).toEqual([...GLOBAL_SEARCH_CATEGORIES]);
    expect(parseGlobalSearchCategories(42)).toEqual([...GLOBAL_SEARCH_CATEGORIES]);
    expect(parseGlobalSearchCategories(['students'])).toEqual([...GLOBAL_SEARCH_CATEGORIES]);
  });

  it('comma-separated subset, case-insensitive, deduped to canonical order', () => {
    expect(parseGlobalSearchCategories('students')).toEqual(['students']);
    expect(parseGlobalSearchCategories('STUDENTS')).toEqual(['students']);
    expect(parseGlobalSearchCategories('teachers,students')).toEqual(['students', 'teachers']);
    expect(parseGlobalSearchCategories('students,students')).toEqual(['students']);
  });

  it('unknown or empty tokens are rejected (null → 400 at the wire)', () => {
    expect(parseGlobalSearchCategories('bogus')).toBeNull();
    expect(parseGlobalSearchCategories('students,,teachers')).toBeNull();
    expect(parseGlobalSearchCategories('students, bogus')).toBeNull();
  });
});

describe('parseGlobalSearchPagination (lenient — no 400s on stray params)', () => {
  it('defaults: page 1, pageSize 10', () => {
    expect(parseGlobalSearchPagination(undefined, undefined)).toEqual({ page: 1, pageSize: 10 });
    expect(parseGlobalSearchPagination('abc', 'xyz')).toEqual({ page: 1, pageSize: 10 });
  });

  it('accepts numeric strings and numbers', () => {
    expect(parseGlobalSearchPagination('2', '25')).toEqual({ page: 2, pageSize: 25 });
    expect(parseGlobalSearchPagination(3, 20)).toEqual({ page: 3, pageSize: 20 });
  });

  it('floors page at 1 and caps pageSize at 50', () => {
    expect(parseGlobalSearchPagination('0', '10').page).toBe(1);
    expect(parseGlobalSearchPagination('-4', '10').page).toBe(1);
    expect(parseGlobalSearchPagination('1', '500').pageSize).toBe(50);
    expect(parseGlobalSearchPagination('1', '0').pageSize).toBe(10);
  });
});

describe('candidateTake — the windowed candidate fetch', () => {
  it('5× pageSize for the common first page', () => {
    expect(candidateTake(1, 10)).toBe(50);
  });

  it('grows to cover the requested page (plus one page of headroom)', () => {
    expect(candidateTake(5, 10)).toBe(60);
    expect(candidateTake(2, 20)).toBe(100);
  });

  it('hard-capped — a broad query never scans unbounded rows', () => {
    expect(candidateTake(100, 50)).toBe(250);
    expect(candidateTake(1000, 50)).toBe(250);
  });
});

describe('rankAndPaginate — verify-window ordering + slicing', () => {
  interface Row { id: string; name: string }

  it('orders exact < prefix < substring, tie-breaks by title then id', () => {
    const rows: Row[] = [
      { id: 'c', name: 'محمد احمد' },      // substring
      { id: 'b', name: 'احمد المبروك' },   // prefix
      { id: 'a', name: 'احمد' },           // exact
    ];
    const qN = normalizeArabicSearch('احمد');
    const page = rankAndPaginate(
      rows,
      (r) => rankHit(normalizeArabicSearch(r.name), qN),
      (r) => normalizeArabicSearch(r.name),
      (r) => r.id,
      1,
      10,
    );
    expect(page.items.map((r) => r.id)).toEqual(['a', 'b', 'c']);
    expect(page.total).toBe(3);
  });

  it('drops non-matching rows (rank ∞) from items AND total', () => {
    const rows: Row[] = [
      { id: 'a', name: 'احمد' },
      { id: 'x', name: 'شبكات' },
    ];
    const qN = normalizeArabicSearch('احمد');
    const page = rankAndPaginate(
      rows,
      (r) => rankHit(normalizeArabicSearch(r.name), qN),
      (r) => normalizeArabicSearch(r.name),
      (r) => r.id,
      1,
      10,
    );
    expect(page.items.map((r) => r.id)).toEqual(['a']);
    expect(page.total).toBe(1);
  });

  it('slices the requested page; totals stay honest within the window', () => {
    const rows: Row[] = Array.from({ length: 7 }, (_, i) => ({ id: `r${i}`, name: `احمد ${i}` }));
    const qN = normalizeArabicSearch('احمد');
    const rank = (r: Row) => rankHit(normalizeArabicSearch(r.name), qN);
    const page2 = rankAndPaginate(rows, rank, (r) => normalizeArabicSearch(r.name), (r) => r.id, 2, 3);
    expect(page2.items).toHaveLength(3);
    expect(page2.total).toBe(7);
    const page3 = rankAndPaginate(rows, rank, (r) => normalizeArabicSearch(r.name), (r) => r.id, 3, 3);
    expect(page3.items).toHaveLength(1);
    const page4 = rankAndPaginate(rows, rank, (r) => normalizeArabicSearch(r.name), (r) => r.id, 4, 3);
    expect(page4.items).toHaveLength(0);
    expect(page4.total).toBe(7);
  });
});

// ─────────────────────────────────────────────────────────────────
//  Hit hrefs (the courseHitHref convention — real surfaces only)
// ─────────────────────────────────────────────────────────────────

describe('studentHitHref / teacherHitHref — role destinations', () => {
  it('studentHitHref — ADMIN registrar roster, TEACHER student list, OWNER users console', () => {
    expect(studentHitHref(Role.ADMIN)).toBe('/admin/students');
    expect(studentHitHref(Role.TEACHER)).toBe('/teacher/students');
    expect(studentHitHref(Role.OWNER)).toBe('/owner/users');
  });

  it('studentHitHref — QUALITY gets null (no quality students surface — plain row)', () => {
    expect(studentHitHref(Role.QUALITY)).toBeNull();
  });

  it('teacherHitHref — ADMIN/QUALITY/OWNER land on their real surfaces', () => {
    expect(teacherHitHref(Role.ADMIN)).toBe('/admin/teachers');
    expect(teacherHitHref(Role.QUALITY)).toBe('/quality/professors');
    expect(teacherHitHref(Role.OWNER)).toBe('/owner/users');
  });

  it('teacherHitHref — TEACHER colleagues are name-only rows (no surface, no dead click)', () => {
    expect(teacherHitHref(Role.TEACHER)).toBeNull();
  });
});

describe('institutionHitHref / facultyHitHref / announcementHitHref', () => {
  it('institutionHitHref — /colleges renders the caller institution; OWNER gets a plain row', () => {
    for (const role of [Role.STUDENT, Role.TEACHER, Role.ADMIN, Role.QUALITY] as const) {
      expect(institutionHitHref(role)).toBe('/colleges');
    }
    expect(institutionHitHref(Role.OWNER)).toBeNull();
  });

  it('facultyHitHref — the public CollegeDetailPage deep link', () => {
    expect(facultyHitHref('fac_42')).toBe('/colleges/fac_42');
  });

  it('announcementHitHref — the community surfaces per role; OWNER plain row', () => {
    expect(announcementHitHref(Role.STUDENT)).toBe('/community');
    expect(announcementHitHref(Role.TEACHER)).toBe('/teacher/community');
    expect(announcementHitHref(Role.ADMIN)).toBe('/admin/community');
    expect(announcementHitHref(Role.QUALITY)).toBe('/quality/community');
    expect(announcementHitHref(Role.OWNER)).toBeNull();
  });
});

/* ════════════════════════════════════════════════════════════════
   R350 S3 — the eight new record kinds' scope laws (SEARCH-DESIGN §1)
   ════════════════════════════════════════════════════════════════ */

describe('R350 S3 — globalSearchScope: the new record kinds', () => {
  it('STUDENT: enrolled offerings only (lectures + materials), the shared content, NO questions', () => {
    const scope = globalSearchScope(Role.STUDENT, USER, INST, {});
    expect(scope.lectures).toEqual({
      offering: { enrollments: { some: { studentId: USER, status: 'active' } } },
    });
    expect(scope.materials).toEqual({
      offering: { enrollments: { some: { studentId: USER, status: 'active' } } },
    });
    // papers: PUBLISHED with a real file, institution-pinned
    expect(scope.papers).toEqual({ institutionId: INST, status: 'PUBLISHED', fileUrl: { not: null } });
    expect(scope.tracks).toEqual({ isPublished: true });
    expect(scope.books).toEqual({});
    expect(scope.jobs).toEqual({});
    expect(scope.events).toEqual({ institutionId: INST });
    // the staff question bank is INVISIBLE to a student (the law)
    expect(scope.questions).toBeNull();
  });

  it('TEACHER: own offerings\' lectures + materials; the approved question bank', () => {
    const scope = globalSearchScope(Role.TEACHER, USER, INST, {});
    expect(scope.lectures).toEqual({ offering: { teacherId: USER } });
    expect(scope.materials).toEqual({ offering: { teacherId: USER } });
    expect(scope.papers).toEqual({ institutionId: INST, status: 'PUBLISHED', fileUrl: { not: null } });
    expect(scope.questions).toEqual({ isApproved: true });
    expect(scope.events).toEqual({ institutionId: INST });
  });

  it('ADMIN/QUALITY: the institution\'s lectures + materials (the course→institution chain)', () => {
    for (const role of [Role.ADMIN, Role.QUALITY] as const) {
      const scope = globalSearchScope(role, USER, INST, {});
      expect(scope.lectures).toEqual({ offering: { course: { institutionId: INST } } });
      expect(scope.materials).toEqual({ offering: { course: { institutionId: INST } } });
      expect(scope.questions).toEqual({ isApproved: true });
      expect(scope.books).toEqual({});
      expect(scope.jobs).toEqual({});
    }
  });

  it('OWNER: platform-wide — every offering\'s lectures/materials, every paper/track/book/job/event', () => {
    const scope = globalSearchScope(Role.OWNER, USER, null, {});
    expect(scope.lectures).toEqual({});
    expect(scope.materials).toEqual({});
    expect(scope.papers).toEqual({ status: 'PUBLISHED', fileUrl: { not: null } });
    expect(scope.tracks).toEqual({ isPublished: true });
    expect(scope.events).toEqual({});
    expect(scope.questions).toEqual({ isApproved: true });
  });

  it('fail-closed: a contextless institutional role discovers NOTHING (the second lock)', () => {
    const scope = globalSearchScope(Role.ADMIN, USER, null, {});
    expect(scope.lectures).toBeNull();
    expect(scope.materials).toBeNull();
    expect(scope.papers).toBeNull();
    expect(scope.tracks).toBeNull();
    expect(scope.books).toBeNull();
    expect(scope.jobs).toBeNull();
    expect(scope.events).toBeNull();
    expect(scope.questions).toBeNull();
  });

  it('the categories constant carries all fifteen kinds in canonical order', () => {
    expect(GLOBAL_SEARCH_CATEGORIES).toEqual([
      'students', 'teachers', 'institutions', 'faculties', 'departments',
      'courses', 'lectures', 'materials', 'papers', 'tracks', 'books',
      'jobs', 'events', 'announcements', 'questions',
    ]);
  });
});

describe('R350 S3 — the new kinds\' hrefs (the file-less-paper law)', () => {
  it('materialHitHref: STUDENT → the offering course page, TEACHER → their materials, oversight → null', () => {
    expect(materialHitHref(Role.STUDENT, 'off_1')).toBe('/student/courses/off_1');
    expect(materialHitHref(Role.TEACHER, 'off_1')).toBe('/teacher/materials');
    expect(materialHitHref(Role.ADMIN, 'off_1')).toBeNull();
    expect(materialHitHref(Role.QUALITY, 'off_1')).toBeNull();
    expect(materialHitHref(Role.OWNER, 'off_1')).toBeNull();
  });

  it('bookHitHref/jobHitHref: the STUDENT surfaces only', () => {
    expect(bookHitHref(Role.STUDENT)).toBe('/student/library');
    expect(bookHitHref(Role.TEACHER)).toBe('/teacher/library');
    expect(bookHitHref(Role.ADMIN)).toBeNull();
    expect(jobHitHref(Role.STUDENT)).toBe('/student/jobs');
    expect(jobHitHref(Role.OWNER)).toBeNull();
  });

  it('eventHitHref: /community for every role; questionHitHref: the staff surfaces only', () => {
    expect(eventHitHref()).toBe('/community');
    expect(questionHitHref(Role.TEACHER)).toBe('/teacher/exams');
    expect(questionHitHref(Role.QUALITY)).toBe('/quality/exam-moderation');
    expect(questionHitHref(Role.ADMIN)).toBe('/quality/exam-moderation');
    expect(questionHitHref(Role.OWNER)).toBeNull();
    expect(questionHitHref(Role.STUDENT)).toBeNull();
  });
});
