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
  announcementHitHref,
  candidateTake,
  facultyHitHref,
  globalSearchScope,
  institutionHitHref,
  parseGlobalSearchCategories,
  parseGlobalSearchPagination,
  phoneHit,
  phoneMatchArm,
  planGlobalQuery,
  rankAndPaginate,
  rankHit,
  studentHitHref,
  teacherHitHref,
} from '../global.js';

// ─────────────────────────────────────────────────────────────────
//  planGlobalQuery
// ─────────────────────────────────────────────────────────────────

describe('planGlobalQuery — Arabic fold + al-prefix + variants', () => {
  it('normalizes through the canonical normalizer (diacritics/hamza/ة folds)', () => {
    const plan = planGlobalQuery('الخَوَارِزْمِيَات');
    expect(plan.normalized).toBe('الخوارزميات');
    // The raw string differs from its normalized twin → both ride the
    // DB contains variants (the /search/global variants construction).
    expect(plan.variants).toEqual(['الخَوَارِزْمِيَات', 'الخوارزميات']);
  });

  it('carries the ال-stripped arm (noAl)', () => {
    expect(planGlobalQuery('المبروك').noAl).toBe('مبروك');
    expect(planGlobalQuery('مبروك').noAl).toBe('مبروك'); // no prefix → unchanged
  });

  it('dedupes variants when the raw query is already normalized', () => {
    expect(planGlobalQuery('احمد').variants).toEqual(['احمد']);
    expect(planGlobalQuery('cisco').variants).toEqual(['cisco']);
    expect(planGlobalQuery('Cisco').variants).toEqual(['Cisco', 'cisco']);
  });

  it('keeps the raw query byte-identical (the envelope echoes it)', () => {
    expect(planGlobalQuery('  أحمد ').raw).toBe('  أحمد ');
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

const INST = 'inst_zawia';
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
        facultyIds: ['fac_zawia_1'],
        departmentIds: ['dep_zawia_1'],
        offeringIds: ['off_zawia_1'],
      });
      const blob = JSON.stringify(scope.announcements);
      expect(blob, role).toContain('fac_zawia_1');
      expect(blob, role).toContain('dep_zawia_1');
      expect(blob, role).toContain('off_zawia_1');
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
