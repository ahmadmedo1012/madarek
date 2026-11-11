/**
 * master-G1 — the GLOBAL (platform-wide people + record discovery) search
 * engine: PURE planning + permission-scoping + ranking helpers.
 *
 * This module is DB-free by law (mirrors the normalize.ts / permissions.ts
 * convention — decision logic lives in pure functions so the full
 * permission matrix is unit-testable without a database; the route handler
 * in http/routes/search.routes.ts owns every prisma call).
 *
 * Reused, never forked:
 *  · `normalizeArabicSearch` / `stripAlPrefix` / `matchesNormalizedQuery`
 *    (modules/search/normalize.ts — the canonical Arabic normalizer),
 *  · `normalizePhone` (lib/phones.ts — master-E1's phone pair),
 *  · the scoping conventions of lib/profile-scoping.ts (institution
 *    context is REQUIRED for institutional roles, fail-closed) and the
 *    announcement-scope shapes of social.routes.ts
 *    (institutionAnnouncementConditions / buildAnnouncementScopeConditions).
 *
 * Match strategy (the established search pattern, spec 011 read-time half):
 * the handler fetches candidates via prisma `contains` (insensitive) on
 * the RAW name columns — limited per category (see `candidateTake`) —
 * then re-verifies + ranks in JS through `matchesNormalizedQuery`. This
 * keeps the engine DB-agnostic and honest: the trigram GIN indexes from
 * migration master_g1_search_trgm accelerate the contains fetch; the JS
 * half guarantees the canonical Arabic foldings (ال prefix tolerance
 * included) on every emitted row.
 */
import type { Prisma, Role } from '@prisma/client';
import { normalizeArabicSearch, stripAlPrefix } from './normalize.js';
import { normalizePhone } from '../../lib/phones.js';

// ─────────────────────────────────────────────────────────────────
//  Categories
// ─────────────────────────────────────────────────────────────────

/** The seven discovery categories, in canonical response order. */
export const GLOBAL_SEARCH_CATEGORIES = [
  'students',
  'teachers',
  'institutions',
  'faculties',
  'departments',
  'courses',
  'announcements',
] as const;

export type GlobalSearchCategoryKey = (typeof GLOBAL_SEARCH_CATEGORIES)[number];

/**
 * Parse the `categories` query param (comma-separated). Non-string values
 * collapse to the default (every category) — the same collapse convention
 * as `sanitizeSearchQuery`. Unknown / empty tokens are REJECTED (returns
 * null → the route answers 400) so a typo'd category never silently
 * narrows results. Case-insensitive; duplicates deduped to canonical
 * order.
 */
export function parseGlobalSearchCategories(raw: unknown): GlobalSearchCategoryKey[] | null {
  const text = typeof raw === 'string' ? raw : '';
  const trimmed = text.trim();
  if (trimmed === '') return [...GLOBAL_SEARCH_CATEGORIES];
  const wanted = new Set<string>();
  for (const token of trimmed.split(',')) {
    const key = token.trim().toLowerCase();
    if (key === '') return null;
    if (!(GLOBAL_SEARCH_CATEGORIES as readonly string[]).includes(key)) return null;
    wanted.add(key);
  }
  return GLOBAL_SEARCH_CATEGORIES.filter((c) => wanted.has(c));
}

// ─────────────────────────────────────────────────────────────────
//  Query planning
// ─────────────────────────────────────────────────────────────────

/** E1's E.164 lower bound — fewer digits than this is never a phone. */
const MIN_PHONE_QUERY_DIGITS = 8;

/** A query is "digits-heavy" when ≥60% of its non-space chars are digits. */
const DIGITS_DOMINANCE = 0.6;

/** ASCII + Arabic-Indic (٠-٩) + Eastern Arabic-Indic (۰-۹) digits. */
const ANY_DIGIT = /[0-9\u0660-\u0669\u06F0-\u06F9]/g;

export interface GlobalQueryPlan {
  /** The sanitized raw query (as it flowed through sanitizeSearchQuery). */
  raw: string;
  /** Canonical Arabic-normalized form (normalizeArabicSearch). */
  normalized: string;
  /** The normalized form minus a leading ال (prefix-tolerance arm). */
  noAl: string;
  /**
   * DB `contains` variants — the raw q plus its normalized twin (deduped),
   * so a hamza/alif-variant query still hits the raw-text trigram indexes
   * (the exact `variants` construction of the existing /search/global).
   */
  variants: string[];
  /** Digit characters (ASCII + Arabic-Indic) in the raw query. */
  digits: number;
  /**
   * E1-normalized phone key when the query is digits-heavy AND resolves
   * through `normalizePhone` (lib/phones.ts — Libyan-first, E.164-minus-
   * plus); null otherwise.
   */
  phoneDigits: string | null;
  /** True iff phoneDigits resolved — phone matching is admitted. */
  isPhoneQuery: boolean;
}

/**
 * Plan one global-search query: the normalized form, both al-prefix
 * variants, and — when the query is digits-heavy — the E1 phone key.
 * Pure; the route calls this once per request.
 */
export function planGlobalQuery(q: string): GlobalQueryPlan {
  const raw = q;
  const normalized = normalizeArabicSearch(raw);
  const noAl = stripAlPrefix(normalized);
  const variants = normalized !== raw ? [raw, normalized] : [raw];

  const digits = (raw.match(ANY_DIGIT) ?? []).length;
  const significant = raw.replace(/\s/g, '').length;
  const digitsHeavy =
    digits >= MIN_PHONE_QUERY_DIGITS &&
    significant > 0 &&
    digits / significant >= DIGITS_DOMINANCE;
  const phone = digitsHeavy ? normalizePhone(raw) : null;

  return {
    raw,
    normalized,
    noAl,
    variants,
    digits,
    phoneDigits: phone ? phone.normalized : null,
    isPhoneQuery: phone !== null,
  };
}

// ─────────────────────────────────────────────────────────────────
//  Ranking
// ─────────────────────────────────────────────────────────────────

/** rankHit tiers: exact=0, prefix=1, substring=2 (lower sorts first). */
export const RANK_EXACT = 0;
export const RANK_PREFIX = 1;
export const RANK_SUBSTRING = 2;
/** No match at all — the candidate is dropped. */
export const RANK_NONE = Number.POSITIVE_INFINITY;

/**
 * Rank one (already-normalized) haystack against a normalized query:
 * exact=0, prefix=1, substring=2, no-match=Infinity. Applied AFTER the
 * candidate fetch, within the page window, to order the verified hits
 * (exact name matches float above prefix matches above substrings).
 *
 * The ال prefix tolerance is folded in — `الرياضيات` ranks as an exact
 * hit against `رياضيات` — mirroring `matchesNormalizedQuery`'s match-time
 * tolerance so the ranker and the verifier can never disagree on
 * matchability.
 */
export function rankHit(haystackNormalized: string, qNormalized: string): number {
  if (!qNormalized) return RANK_NONE;
  const arms = qNormalized.startsWith('ال') ? [qNormalized, stripAlPrefix(qNormalized)] : [qNormalized];
  let best = RANK_NONE;
  for (const arm of arms) {
    if (!arm) continue;
    if (haystackNormalized === arm) best = Math.min(best, RANK_EXACT);
    else if (haystackNormalized.startsWith(arm)) best = Math.min(best, RANK_PREFIX);
    else if (haystackNormalized.includes(arm)) best = Math.min(best, RANK_SUBSTRING);
  }
  return best;
}

// ─────────────────────────────────────────────────────────────────
//  Permission scoping (§10.4 — THE critical law)
// ─────────────────────────────────────────────────────────────────

/**
 * Announcement-scope facts, as gathered by the handler (DB reads that
 * stay there). Mirrors the /announcements/feed conventions of
 * social.routes.ts:
 *  · STUDENT → their StudentProfile's faculty/department + the offerings
 *    of their ACTIVE enrollments;
 *  · TEACHER → their home department's faculty + the offerings they
 *    teach;
 *  · ADMIN/QUALITY → their institution's faculties/departments/offerings;
 *  · OWNER → none (platform-wide oversight; every announcement visible).
 */
export interface GlobalSearchFacts {
  facultyIds?: readonly string[];
  departmentIds?: readonly string[];
  offeringIds?: readonly string[];
}

/**
 * The per-category where-filters for one caller. `null` = the category is
 * NOT discoverable for this role (STUDENT discovers no people → null
 * students/teachers; the route answers those categories with empty
 * items, never with an error).
 */
export interface GlobalSearchScope {
  /** STUDENT rows (User). null for STUDENT callers. */
  students: Prisma.UserWhereInput | null;
  /** TEACHER rows (User). null for STUDENT callers. */
  teachers: Prisma.UserWhereInput | null;
  institutions: Prisma.InstitutionWhereInput | null;
  faculties: Prisma.FacultyWhereInput | null;
  departments: Prisma.DepartmentWhereInput | null;
  /** CourseOffering rows (the dropdown's hit unit — href needs offeringId). */
  courses: Prisma.CourseOfferingWhereInput | null;
  /**
   * Announcement rows: PLATFORM + the caller's scoped rows (built from
   * `facts`). Expired rows are excluded by the handler via
   * `unexpiredAnnouncementFilter` (the feed convention).
   */
  announcements: Prisma.AnnouncementWhereInput | null;
  /**
   * May this caller match people BY PHONE? ADMIN/QUALITY of one
   * institution + OWNER only — a TEACHER never phone-searches, a STUDENT
   * discovers no people at all (§10.4 / §5).
   */
  phoneSearch: boolean;
  /**
   * May phone fields be RETURNED on student items? ADMIN/OWNER only, and
   * only the NORMALIZED columns (studentPhoneNormalized /
   * guardianPhoneNormalized) — the display pair never leaves the DB for
   * a search response (§10.4 / §5).
   */
  phoneFieldsVisible: boolean;
}

/** Announcement OR-conditions from facts — the institutionAnnouncementConditions shape. */
function announcementConditions(facts: GlobalSearchFacts): Prisma.AnnouncementWhereInput {
  const conditions: Prisma.AnnouncementWhereInput[] = [{ scope: 'PLATFORM' }];
  if (facts.facultyIds && facts.facultyIds.length > 0) {
    conditions.push({ scope: 'FACULTY', scopeId: { in: [...facts.facultyIds] } });
  }
  if (facts.departmentIds && facts.departmentIds.length > 0) {
    conditions.push({ scope: 'DEPARTMENT', scopeId: { in: [...facts.departmentIds] } });
  }
  if (facts.offeringIds && facts.offeringIds.length > 0) {
    conditions.push({ scope: 'OFFERING', scopeId: { in: [...facts.offeringIds] } });
  }
  return { OR: conditions };
}

/** Fail-closed scope: nothing is discoverable. */
function emptyScope(): GlobalSearchScope {
  return {
    students: null,
    teachers: null,
    institutions: null,
    faculties: null,
    departments: null,
    courses: null,
    announcements: null,
    phoneSearch: false,
    phoneFieldsVisible: false,
  };
}

/**
 * The §10.4 permission matrix as where-filters. PURE and DB-free — the
 * handler resolves the caller's VERIFIED institution context first
 * (`resolveCallerInstitutionScope`; 403 INSTITUTION_CONTEXT_REQUIRED for
 * a contextless institutional role — profile-scoping.ts's fail-closed
 * law) and gathers the announcement facts, then hands both here.
 *
 * Matrix:
 *  · STUDENT   → NO people (students/teachers null). Records only:
 *                own institution's faculties/departments, the course
 *                offerings of their ACTIVE enrollments
 *                (offeringVisibilityFilter's convention), and their
 *                visible announcements.
 *  · TEACHER   → ONLY students enrolled (status 'active' — the
 *                platform-wide convention) in the offerings they teach;
 *                colleagues = same-institution TEACHER profiles
 *                (name-only); own taught offerings; own announcements.
 *  · ADMIN     → their institution's full roster (students via active
 *                StudentProfiles in the institution, teachers via active
 *                TeacherProfiles), institution records, institution
 *                courses, institution announcements. Phone search YES,
 *                phone fields YES.
 *  · QUALITY   → the same institution roster NAME-ONLY: phone search
 *                YES (the registrar's «من هذا الرقم؟» lookup is shared)
 *                but phone fields NEVER returned.
 *  · OWNER     → every institution's people + records (platform-wide
 *                oversight; the owner holds no membership by design —
 *                institutionId arrives null). Phone search + fields YES.
 *
 * Cross-institution isolation (the law): every people/record where is
 * institution-scoped — the only unscoped wheres are OWNER's. A null
 * institutionId for a non-OWNER role fails closed (empty scope — the
 * handler 403s long before that, this is the defensive second lock).
 */
export function globalSearchScope(
  role: Role,
  userId: string,
  institutionId: string | null,
  facts: GlobalSearchFacts = {},
): GlobalSearchScope {
  // OWNER — platform-wide oversight, no membership, no context to scope by.
  if (role === 'OWNER') {
    return {
      students: { role: 'STUDENT' },
      teachers: { role: 'TEACHER' },
      institutions: {},
      faculties: {},
      departments: {},
      courses: {},
      announcements: {},
      phoneSearch: true,
      phoneFieldsVisible: true,
    };
  }

  // Institutional roles REQUIRE a verified context — fail closed without one.
  const inst = typeof institutionId === 'string' && institutionId.length > 0 ? institutionId : null;
  if (!inst) return emptyScope();

  // Shared record scopes — institution-pinned for every non-OWNER role.
  const institutions: Prisma.InstitutionWhereInput = { id: inst };
  const faculties: Prisma.FacultyWhereInput = { institutionId: inst };
  const departments: Prisma.DepartmentWhereInput = { faculty: { institutionId: inst } };
  const announcements = announcementConditions(facts);

  if (role === 'STUDENT') {
    return {
      // §10.4: a STUDENT discovers NO people.
      students: null,
      teachers: null,
      institutions,
      faculties,
      departments,
      // offeringVisibilityFilter's STUDENT branch (courses.routes.ts):
      // only ACTIVE enrollments grant visibility.
      courses: { enrollments: { some: { studentId: userId, status: 'active' } } },
      announcements,
      phoneSearch: false,
      phoneFieldsVisible: false,
    };
  }

  if (role === 'TEACHER') {
    return {
      // ONLY students enrolled in the offerings this teacher teaches
      // (taught offerings → enrollments; 'active' status per the
      // platform-wide convention — dropped leftovers never grant).
      students: {
        role: 'STUDENT',
        enrollments: { some: { status: 'active', offering: { teacherId: userId } } },
      },
      // Colleagues: same-institution TEACHER profiles (name-only — no
      // phone arm is ever admitted for a teacher, see phoneSearch).
      teachers: {
        role: 'TEACHER',
        teacherProfiles: { some: { membership: { institutionId: inst, isActive: true } } },
      },
      institutions,
      faculties,
      departments,
      courses: { teacherId: userId },
      announcements,
      phoneSearch: false,
      phoneFieldsVisible: false,
    };
  }

  if (role === 'ADMIN' || role === 'QUALITY') {
    return {
      // The institution roster: users holding an ACTIVE profile in the
      // caller's institution (the resolveStudentProfile /
      // resolveTeacherProfile membership convention).
      students: {
        role: 'STUDENT',
        studentProfiles: { some: { institutionId: inst, membership: { isActive: true } } },
      },
      teachers: {
        role: 'TEACHER',
        teacherProfiles: { some: { membership: { institutionId: inst, isActive: true } } },
      },
      institutions,
      faculties,
      departments,
      // Institution courses — the offering → course → institution chain
      // (assertOfferingInCallerInstitution's ownership chain).
      courses: { course: { institutionId: inst } },
      announcements,
      phoneSearch: true,
      phoneFieldsVisible: role === 'ADMIN',
    };
  }

  // Unknown role — fail closed (unreachable with the current Role enum).
  return emptyScope();
}

/**
 * The phone match-arm for the STUDENTS category: matches
 * studentPhoneNormalized / guardianPhoneNormalized via `contains` on the
 * E1-normalized digits. The arm re-pins the institution inside the
 * relation filter so a phone hit can never cross institutions (OWNER —
 * institutionId null — searches every institution by design).
 *
 * Sibling privacy (documented by design, §5): a shared family phone
 * finds BOTH siblings — that is the registrar's use case («من هذا
 * الرقم؟» → the whole family on one number), not a leak.
 */
export function phoneMatchArm(
  plan: GlobalQueryPlan,
  institutionId: string | null,
): Prisma.UserWhereInput | null {
  if (!plan.isPhoneQuery || !plan.phoneDigits) return null;
  const contains = { contains: plan.phoneDigits };
  const profileWhere: Prisma.StudentProfileWhereInput = {
    OR: [{ studentPhoneNormalized: contains }, { guardianPhoneNormalized: contains }],
  };
  return {
    studentProfiles: {
      some: institutionId ? { institutionId, ...profileWhere } : profileWhere,
    },
  };
}

/**
 * JS re-verification for a phone-fetched candidate (the phone arm of the
 * students predicate — the name haystacks obviously don't contain a
 * phone query, so `searchHit` alone would drop every phone hit).
 */
export function phoneHit(
  profile: { studentPhoneNormalized: string | null; guardianPhoneNormalized: string | null } | undefined,
  plan: GlobalQueryPlan,
): boolean {
  if (!plan.isPhoneQuery || !plan.phoneDigits || !profile) return false;
  return (
    profile.studentPhoneNormalized?.includes(plan.phoneDigits) === true ||
    profile.guardianPhoneNormalized?.includes(plan.phoneDigits) === true
  );
}

// ─────────────────────────────────────────────────────────────────
//  Pagination
// ─────────────────────────────────────────────────────────────────

export const DEFAULT_GLOBAL_SEARCH_PAGE_SIZE = 10;
export const MAX_GLOBAL_SEARCH_PAGE_SIZE = 50;

/**
 * Parse `page` / `pageSize` leniently (an autocomplete surface must not
 * 400 on a stray param): non-numeric / out-of-range values fall back to
 * the defaults; pageSize is hard-capped at 50.
 */
export function parseGlobalSearchPagination(
  pageRaw: unknown,
  pageSizeRaw: unknown,
): { page: number; pageSize: number } {
  const coerce = (v: unknown, fallback: number, min: number, max: number): number => {
    const n = typeof v === 'string' ? Number.parseInt(v, 10) : typeof v === 'number' && Number.isInteger(v) ? v : Number.NaN;
    if (!Number.isFinite(n) || n < min) return fallback;
    return Math.min(n, max);
  };
  return {
    page: coerce(pageRaw, 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: coerce(pageSizeRaw, DEFAULT_GLOBAL_SEARCH_PAGE_SIZE, 1, MAX_GLOBAL_SEARCH_PAGE_SIZE),
  };
}

/** Candidate-window factor: fetch 5× pageSize candidates per category. */
const CANDIDATE_WINDOW_FACTOR = 5;
/** Hard cap — a broad query must never scan unbounded rows per category. */
const MAX_CANDIDATE_WINDOW = 250;

/**
 * The per-category candidate fetch limit: 5× pageSize (the mission's
 * window), grown so the window always covers the requested page (plus
 * one page of headroom for the JS re-verify to trim into), hard-capped.
 */
export function candidateTake(page: number, pageSize: number): number {
  return Math.min(
    Math.max(CANDIDATE_WINDOW_FACTOR * pageSize, (page + 1) * pageSize),
    MAX_CANDIDATE_WINDOW,
  );
}

/**
 * Rank + paginate the verified candidates of one category: order by rank
 * (exact < prefix < substring), tie-break deterministically (normalized
 * title, then id), then slice the requested page. `rankOf` returning
 * Infinity drops the row. `total` is the verified count within the
 * fetched candidate window — the honest number for this engine (the
 * fetch is windowed, so totals beyond the window are not claimed).
 */
export function rankAndPaginate<T>(
  candidates: readonly T[],
  rankOf: (row: T) => number,
  titleOf: (row: T) => string,
  idOf: (row: T) => string,
  page: number,
  pageSize: number,
): { items: T[]; total: number } {
  const ranked = candidates
    .filter((row) => rankOf(row) !== RANK_NONE)
    .map((row) => ({ row, rank: rankOf(row), title: titleOf(row), id: idOf(row) }))
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        (a.title < b.title ? -1 : a.title > b.title ? 1 : 0) ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  const start = (page - 1) * pageSize;
  return { items: ranked.slice(start, start + pageSize).map((r) => r.row), total: ranked.length };
}

// ─────────────────────────────────────────────────────────────────
//  Hit hrefs (the courseHitHref convention — never a dead click)
// ─────────────────────────────────────────────────────────────────

/**
 * STUDENT-row destination per role — real surfaces from
 * frontend/src/lib/routes.ts only (App.tsx route table):
 *  · ADMIN → /admin/students (AdminStudentsPage — the registrar's roster)
 *  · TEACHER → /teacher/students (StudentsListPage — their enrolled students)
 *  · OWNER → /owner/users (OwnerUsersPage)
 *  · QUALITY → null (no quality students surface exists — plain row)
 *  · STUDENT → null (a student discovers no people; unreachable)
 */
export function studentHitHref(role: Role): string | null {
  switch (role) {
    case 'ADMIN': return '/admin/students';
    case 'TEACHER': return '/teacher/students';
    case 'OWNER': return '/owner/users';
    case 'QUALITY': return null;
    case 'STUDENT': return null;
  }
}

/**
 * TEACHER-row destination per role:
 *  · ADMIN → /admin/teachers (AdminTeachersPage)
 *  · QUALITY → /quality/professors (QualityProfessorsPage)
 *  · OWNER → /owner/users (OwnerUsersPage)
 *  · TEACHER → null (colleagues are name-only rows — no teacher-side
 *    colleague directory surface exists)
 *  · STUDENT → null (a student discovers no people; unreachable)
 */
export function teacherHitHref(role: Role): string | null {
  switch (role) {
    case 'ADMIN': return '/admin/teachers';
    case 'QUALITY': return '/quality/professors';
    case 'OWNER': return '/owner/users';
    case 'TEACHER': return null;
    case 'STUDENT': return null;
  }
}

/**
 * INSTITUTION-row destination: /colleges renders the CALLER's
 * institution's faculties (colleges.routes.ts resolveCollegesTarget —
 * the authed context wins), which is exactly the one institution a
 * non-OWNER scope can hit. OWNER gets null — they hold no institution
 * context, so /colleges would show the demo default, not the hit's
 * institution (a plain row beats a wrong destination).
 */
export function institutionHitHref(role: Role): string | null {
  switch (role) {
    case 'STUDENT':
    case 'TEACHER':
    case 'ADMIN':
    case 'QUALITY': return '/colleges';
    case 'OWNER': return null;
  }
}

/**
 * FACULTY-row destination: the public CollegeDetailPage
 * (/colleges/:id — world-readable per audit 4-A14; the id is the
 * faculty's cuid, exactly what the page's /colleges/:id fetch takes).
 */
export function facultyHitHref(facultyId: string): string {
  return `/colleges/${facultyId}`;
}

/**
 * ANNOUNCEMENT-row destination per role — the community surfaces that
 * mount the announcements feed (CommunityPage):
 *  · STUDENT → /community · TEACHER → /teacher/community
 *  · ADMIN → /admin/community · QUALITY → /quality/community
 *  · OWNER → null (the owner console has no community page;
 *    /owner/notifications is the alerts feed, not announcements)
 */
export function announcementHitHref(role: Role): string | null {
  switch (role) {
    case 'STUDENT': return '/community';
    case 'TEACHER': return '/teacher/community';
    case 'ADMIN': return '/admin/community';
    case 'QUALITY': return '/quality/community';
    case 'OWNER': return null;
  }
}
