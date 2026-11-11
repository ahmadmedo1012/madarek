import { Router } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { normalizeArabicSearch, matchesNormalizedQuery } from '../../modules/search/normalize.js';
import { offeringVisibilityFilter } from './courses.routes.js';
import { AppError } from '../../lib/errors.js';
import {
  institutionContextRequiredError,
  resolveCallerInstitutionScope,
  resolveStudentProfile,
  resolveTeacherProfile,
} from '../../lib/profile-scoping.js';
import {
  RANK_NONE,
  RANK_SUBSTRING,
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
  type GlobalSearchCategoryKey,
  type GlobalSearchFacts,
} from '../../modules/search/global.js';
import { unexpiredAnnouncementFilter } from './social.routes.js';

const router = Router();
router.use(authMiddleware);

/**
 * Parse the `q` query param into a usable search string: non-string
 * values (missing param, arrays, objects) collapse to '', then trim and
 * hard-cap at 120 chars — q flows into ILIKE patterns, so the cap bounds
 * the pattern the DB ever sees (audit 15-i TOP-9).
 * Pinned DB-free by tests/modules/visibility-logic.test.ts.
 */
export function sanitizeSearchQuery(raw: unknown): string {
  return (typeof raw === 'string' ? raw : '').trim().slice(0, 120);
}

/**
 * Candidate re-verification predicate: does ANY haystack match the query
 * raw (case-insensitive substring) OR through the canonical Arabic
 * foldings (`matchesNormalizedQuery`, incl. the ال prefix tolerance — that
 * matcher is lib-tested; this pins it at the wire). Callers gate on
 * `q.length >= 2 && qN.length >= 2` first, so `q` is never empty here.
 * (audit 15-i TOP-9; pinned DB-free by visibility-logic.test.ts)
 */
export function searchHit(haystacks: string[], q: string, qN: string): boolean {
  return haystacks.some((h) => h.toLowerCase().includes(q.toLowerCase()) || matchesNormalizedQuery(h, qN));
}

/**
 * r155c: role → course-hit destination in the SPA. TEACHER/STUDENT keep
 * their deep links; the oversight roles land on their own course
 * surfaces — the old catch-all `/admin/courses` requires ADMIN, so
 * QUALITY/OWNER clicks were silently bounced by the route guard (dead
 * click). All five destinations exist in frontend/src/App.tsx:
 * /admin/courses (ADMIN block), /quality/courses (QUALITY/ADMIN block),
 * /owner/education (OWNER block).
 */
export function courseHitHref(role: Role, offeringId: string): string {
  switch (role) {
    case 'TEACHER': return `/teacher/intelligence/${offeringId}`;
    case 'STUDENT': return `/student/courses/${offeringId}`;
    case 'ADMIN': return '/admin/courses';
    case 'QUALITY': return '/quality/courses';
    case 'OWNER': return '/owner/education';
  }
}

/**
 * r156 — lecture-hit destination for the searching role, or null when the
 * role has no lecture surface to open (the hit is then suppressed — the
 * file-less-paper convention from r155c: a dropdown row IS a link, so
 * roles with no destination see no row). The lecture player
 * /student/lectures/:id is STUDENT-only in App.tsx, so the old catch-all
 * sent ADMIN/QUALITY/OWNER clicks into the guard's silent bounce; a
 * teacher's deep link goes to their course intelligence page for the
 * lecture's offering (the pre-r156 behavior, kept verbatim).
 */
export function lectureHitHref(
  role: Role,
  lectureId: string,
  offeringId: string,
): string | null {
  switch (role) {
    case 'TEACHER': return `/teacher/intelligence/${offeringId}`;
    case 'STUDENT': return `/student/lectures/${lectureId}`;
    case 'ADMIN':
    case 'QUALITY':
    case 'OWNER': return null;
  }
}

/**
 * r165e — training-track hit destination for the searching role, or null
 * when the role has no track surface to open (the hit is then suppressed —
 * the lectureHitHref convention from r156, itself the file-less-paper
 * convention from r155c: a dropdown row IS a link, so roles with no
 * destination see no row). The training area /training/:slug sits in the
 * STUDENT-only allow block of App.tsx and no teacher/oversight track
 * surface exists, so the old unconditional href sent
 * TEACHER/ADMIN/QUALITY/OWNER clicks into the guard's silent bounce
 * (AppShell's ProtectedRoute Navigate-replaces them to their dashboard
 * with no feedback).
 */
export function trackHitHref(role: Role, slug: string): string | null {
  switch (role) {
    case 'STUDENT': return `/training/${slug}`;
    case 'TEACHER':
    case 'ADMIN':
    case 'QUALITY':
    case 'OWNER': return null;
  }
}

/**
 * GET /search/global?q=...
 *
 * Cross-cutting search across courses, lectures, research papers, and training tracks.
 * Returns at most 5 hits per category. Designed for autocomplete dropdown — fast,
 * tolerant, and limited in scope.
 *
 * Permission model: respects the user's role, via the shared
 * `offeringVisibilityFilter` (courses.routes.ts — audit 15-i TOP-10):
 *  - STUDENT: only offerings with an ACTIVE enrollment (the platform-wide
 *    convention — dropped/completed leftovers never grant content access)
 *  - TEACHER: only the offerings they teach
 *  - ADMIN/QUALITY/OWNER: everything (oversight)
 *
 * Arabic-aware matching (per specs/011 …/contracts/search.md, read-time half):
 * the incoming q is normalized with the canonical `normalizeArabicSearch`
 * foldings (diacritics/tatweel stripped, alif/hamza variants folded, ة→ه,
 * ى→ي, case-folded), the DB candidates are fetched with raw `contains`
 * (q AND qNormalized), and each candidate is re-verified in JS via
 * `matchesNormalizedQuery` including the `ال` prefix tolerance. The
 * schema-level half of the contract (searchable_normalized columns +
 * pg_trgm fuzzy matching) needs a migration and is owned by another
 * workstream; this route does everything possible without schema changes.
 *
 * Response hrefs (r155c): every hit carries an in-SPA destination the
 * requesting role can actually open. Course hits map role → surface
 * (courseHitHref). Paper hits point at the document viewer with the
 * file's basename + `?paper=` id — the viewer route is
 * /document/:filename and /files/papers/:filename only serves .pdf
 * basenames, so the pre-r155c `/document/${paperId}` (a cuid) was a
 * guaranteed 400. Papers without a fileUrl are not returned at all:
 * every other consumer suppresses the link for those rows, and a
 * dropdown row IS a link (nothing to render unlinked).
 */
router.get('/search/global', async (req, res, next) => {
  try {
    const q = sanitizeSearchQuery(req.query.q);
    const qN = normalizeArabicSearch(q);
    if (q.length < 2 || qN.length < 2) {
      res.json({ data: { courses: [], lectures: [], papers: [], tracks: [] } });
      return;
    }

    const userId = req.user!.id;
    const role = req.user!.role;

    const ic = (s: string) => ({ contains: s, mode: 'insensitive' as const });

    // Scope: which offerings is this user related to? The shared
    // offering-visibility filter (courses.routes.ts) — the same role
    // matrix as assertOfferingAccess; only status 'active' enrollments
    // count (lib/permissions.ts).
    const offeringFilter = offeringVisibilityFilter(role, userId);

    // Query both the raw and the normalized form so hamza/alif-variant
    // queries still hit the DB's raw-text contains index.
    const variants = qN && qN !== q ? [q, qN] : [q];

    // Over-fetch (15) then re-verify + trim to 5 in JS — see header comment.
    const CANDIDATE_TAKE = 15;
    const RESULT_TAKE = 5;

    // The four candidate scans are independent — run them concurrently.
    // This endpoint fires per keystroke client-side; four serial awaits
    // summed four DB round-trips into every keystroke's latency.
    // Every take is paired with an explicit orderBy: Postgres otherwise
    // returns rows in arbitrary order, so the 15-of-N candidate subset
    // (and which 5 survive the JS re-verify below) would flip between
    // keystrokes. Ordering follows each domain's own list convention.
    const [courseCandidates, lectureCandidates, paperCandidates, trackCandidates] = await Promise.all([
      // Course offerings (matched on course name + code) — newest first.
      prisma.courseOffering.findMany({
        where: {
          ...offeringFilter,
          OR: [
            ...variants.map((v) => ({ course: { name: ic(v) } })),
            { course: { code: ic(q) } },
          ],
        },
        include: {
          course: { select: { name: true, code: true, iconEmoji: true, themeColor: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: CANDIDATE_TAKE,
      }),

      // Lectures (within scope) — curriculum order.
      prisma.lecture.findMany({
        where: {
          OR: [
            ...variants.map((v) => ({ title: ic(v) })),
            { description: ic(q) },
          ],
          offering: offeringFilter,
        },
        include: {
          offering: {
            select: {
              id: true,
              course: { select: { name: true, iconEmoji: true } },
            },
          },
        },
        // r152b (A5 P2): deterministic tiebreakers — ordinals are not
        // unique-constrained and legacy swaps could leave duplicates.
        orderBy: [{ ordinal: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: CANDIDATE_TAKE,
      }),

      // Published research papers (anyone authenticated can search the
      // library) — publishedAt desc, like /research/library. Only rows
      // with a fileUrl: the hit's href opens the document viewer, and
      // consumers without a file have no linkable destination (r155c).
      prisma.researchPaper.findMany({
        where: {
          status: 'PUBLISHED',
          fileUrl: { not: null },
          OR: [
            ...variants.map((v) => ({ title: ic(v) })),
            { abstract: ic(q) },
          ],
        },
        include: {
          student: { select: { firstName: true, lastName: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: CANDIDATE_TAKE,
      }),

      // Training tracks — catalog order, like /training.
      prisma.trainingTrack.findMany({
        where: {
          isPublished: true,
          OR: [
            ...variants.map((v) => ({ title: ic(v) })),
            { titleEn: ic(q) },
            { summary: ic(q) },
          ],
        },
        orderBy: { order: 'asc' },
        take: CANDIDATE_TAKE,
      }),
    ]);

    // JS re-verification with the canonical foldings (raw OR normalized
    // hit) — searchHit, extracted above.
    const courses = courseCandidates.filter((o) => searchHit([o.course.name, o.course.code], q, qN)).slice(0, RESULT_TAKE);
    const lectures = lectureCandidates.filter((l) => searchHit([l.title, l.description ?? ''], q, qN)).slice(0, RESULT_TAKE);
    const papers = paperCandidates.filter((p) => searchHit([p.title, p.abstract ?? ''], q, qN)).slice(0, RESULT_TAKE);
    const tracks = trackCandidates.filter((t) => searchHit([t.title, t.titleEn ?? '', t.summary], q, qN)).slice(0, RESULT_TAKE);

    res.json({
      data: {
        courses: courses.map((o) => ({
          id: o.id,
          title: o.course.name,
          subtitle: `${o.course.code} · ${o.term}`,
          iconEmoji: o.course.iconEmoji,
          themeColor: o.course.themeColor,
          href: courseHitHref(role, o.id),
        })),
        lectures: lectures
          // r156: suppress lecture hits for roles with no openable
          // lecture surface (lectureHitHref above) — never emit a row
          // whose click the route guard will silently bounce.
          .map((l) => ({ l, href: lectureHitHref(role, l.id, l.offering.id) }))
          .filter((x): x is { l: (typeof lectures)[number]; href: string } => x.href !== null)
          .map(({ l, href }) => ({
            id: l.id,
            title: l.title,
            subtitle: l.offering.course.name,
            iconEmoji: l.offering.course.iconEmoji,
            href,
          })),
        papers: papers.map((p) => ({
          id: p.id,
          title: p.title,
          subtitle: `بحث منشور · ${p.student.firstName} ${p.student.lastName}`,
          iconEmoji: '📄',
          // r155c: same grammar as every paper consumer (LibraryPage /
          // ResearchReviewPage / ResearchPage): the viewer route is
          // /document/:filename, so the href must carry the fileUrl
          // basename, and `?paper=` is what mounts the annotations
          // panel. fileUrl is non-null by the where filter above.
          href: `/document/${encodeURIComponent(p.fileUrl!.split('/').pop() ?? '')}?paper=${encodeURIComponent(p.id)}`,
        })),
        tracks: tracks
          // r165e: suppress track hits for roles with no openable
          // training surface (trackHitHref above) — never emit a row
          // whose click the route guard will silently bounce.
          .map((t) => ({ t, href: trackHitHref(role, t.slug) }))
          .filter((x): x is { t: (typeof tracks)[number]; href: string } => x.href !== null)
          .map(({ t, href }) => ({
            id: t.id,
            slug: t.slug,
            title: t.title,
            subtitle: t.summary.slice(0, 80),
            iconEmoji: t.iconEmoji,
            themeColor: t.themeColor,
            href,
          })),
      },
    });
  } catch (e) { next(e); }
});

// ══════════════════════════════════════════════════════════════════
//  master-G1 — GET /search/discover (platform-wide people + record
//  discovery, §10)
// ══════════════════════════════════════════════════════════════════
//
// PATH DEVIATION (documented for the lander): the mission names this
// route `GET /search/global`, but that path is already occupied by the
// course-dropdown search above — pinned byte-for-byte by
// tests/modules/search-routes-role-gating.test.ts +
// tests/modules/visibility-logic.test.ts and consumed by the frontend
// GlobalSearch dropdown — and the mission's own law is that the
// dropdown "stays untouched" (never break existing exports/tests). A
// second handler on the same path is unreachable in Express, so the
// discovery engine mounts at /search/discover on the SAME router and
// module, with exactly the specified query contract:
//
//   GET /search/discover?q=&categories=&page=&pageSize=
//
// Response envelope (additive for every future consumer):
//   { data: { query, categories: { students: { items, total }, … }, tookMs } }
//
// Every row: { id, kind, titleAr, subtitleAr?, href } — href follows
// the courseHitHref convention (a real, role-openable surface from
// frontend/src/lib/routes.ts, or null for a plain row; see the
// *HitHref helpers in modules/search/global.ts).
//
// Engine (modules/search/global.ts — pure, DB-free, unit-tested):
//  · planGlobalQuery — canonical Arabic normalization (normalize.ts,
//    reused never forked) + both al-prefix arms + the E1 phone variant
//    (lib/phones.ts normalizePhone) when the query is digits-heavy.
//  · globalSearchScope — the §10.4 permission matrix as where-filters
//    (student→no people; teacher→own-offering students + same-
//    institution colleagues; admin→institution roster incl. phone
//    fields; quality→roster name-only; owner→everything; every
//    non-owner where institution-scoped).
//  · Match strategy (the established pattern): fetch candidates via
//    prisma contains (insensitive) on the RAW name columns — windowed
//    per category (candidateTake: 5× pageSize, covering the requested
//    page, hard-capped) — then re-verify + rank in JS through
//    matchesNormalizedQuery + rankHit. The pg_trgm GIN indexes from
//    migration master_g1_search_trgm accelerate the contains fetch.
//
// Phone search (§5): when the query normalizes to a phone (≥8 digits
// through E1), the STUDENTS category additionally matches
// studentPhoneNormalized/guardianPhoneNormalized via contains on the
// normalized digits — admitted ONLY for ADMIN/QUALITY/OWNER (of the
// SAME institution; OWNER platform-wide). Phone FIELDS are returned
// only for ADMIN/OWNER and only from the normalized columns.
// Sibling privacy is BY DESIGN: a shared family phone finds both
// siblings — the registrar's «من هذا الرقم؟» use case.

/** One discovery hit — the wire item shape of /search/discover. */
interface GlobalSearchItem {
  id: string;
  kind: 'student' | 'teacher' | 'institution' | 'faculty' | 'department' | 'course' | 'announcement';
  titleAr: string;
  subtitleAr: string | null;
  href: string | null;
  /** Students only, ADMIN/OWNER only — the NORMALIZED search keys, never the display pair. */
  studentPhoneNormalized?: string | null;
  guardianPhoneNormalized?: string | null;
}

/** One category's paged answer. */
interface GlobalSearchCategory {
  items: GlobalSearchItem[];
  total: number;
}

// ── Candidate row shapes (the exact `select` projections below) ────
interface StudentProfileChip {
  universityId: string;
  studentPhoneNormalized: string | null;
  guardianPhoneNormalized: string | null;
  faculty: { name: string } | null;
  institution: { name: string } | null;
}
interface StudentRow {
  id: string;
  firstName: string;
  lastName: string;
  studentProfiles: StudentProfileChip[];
}
interface TeacherProfileChip {
  specialty: string;
  department: { name: string } | null;
  membership: { institution: { name: string } };
}
interface TeacherRow {
  id: string;
  firstName: string;
  lastName: string;
  teacherProfiles: TeacherProfileChip[];
}
interface InstitutionRow { id: string; name: string; nameEn: string | null }
interface FacultyRow { id: string; name: string; nameEn: string | null; city: string }
interface DepartmentRow { id: string; name: string; nameEn: string | null; faculty: { name: string } | null }
interface CourseRow { id: string; term: string; course: { name: string; code: string } }
interface AnnouncementRow {
  id: string;
  title: string;
  author: { firstName: string; lastName: string };
}

/**
 * Announcement-scope facts for globalSearchScope — the exact gathering
 * of the /announcements/feed handler (social.routes.ts), so the
 * discovery engine's announcement visibility can never drift from the
 * feed's: institution faculties/departments/offerings for the oversight
 * roles, personal faculty/department/enrollments for STUDENT, home
 * department + taught offerings for TEACHER, nothing for OWNER
 * (platform-wide). institutionId is non-null for every non-OWNER role
 * (the handler enforces the verified context before calling).
 */
async function gatherGlobalAnnouncementFacts(
  role: Role,
  userId: string,
  institutionId: string,
): Promise<GlobalSearchFacts> {
  // OWNER — platform-wide oversight: every announcement is in scope, no
  // facts needed (the /announcements/feed OWNER branch).
  if (role === 'OWNER') return {};
  if (role === 'ADMIN' || role === 'QUALITY') {
    const faculties = await prisma.faculty.findMany({
      where: { institutionId },
      select: { id: true, departments: { select: { id: true } } },
    });
    const offerings = await prisma.courseOffering.findMany({
      where: { course: { institutionId } },
      select: { id: true },
    });
    return {
      facultyIds: faculties.map((f) => f.id),
      departmentIds: faculties.flatMap((f) => f.departments.map((d) => d.id)),
      offeringIds: offerings.map((o) => o.id),
    };
  }
  if (role === 'STUDENT') {
    const profile = await resolveStudentProfile(userId, institutionId);
    // Only ACTIVE enrollments contribute (the platform-wide convention).
    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId: userId,
        status: 'active',
        offering: { course: { institutionId } },
      },
      select: { offeringId: true },
    });
    return {
      facultyIds: profile?.facultyId ? [profile.facultyId] : [],
      departmentIds: profile?.departmentId ? [profile.departmentId] : [],
      offeringIds: enrollments.map((e) => e.offeringId),
    };
  }
  // TEACHER — home department's faculty + the offerings they teach.
  const profile = await resolveTeacherProfile(userId, institutionId);
  const department = profile
    ? await prisma.department.findUnique({
        where: { id: profile.departmentId },
        select: { facultyId: true },
      })
    : null;
  const offerings = await prisma.courseOffering.findMany({
    where: { teacherId: userId, course: { institutionId } },
    select: { id: true },
  });
  return {
    facultyIds: department?.facultyId ? [department.facultyId] : [],
    departmentIds: profile?.departmentId ? [profile.departmentId] : [],
    offeringIds: offerings.map((o) => o.id),
  };
}

router.get('/search/discover', async (req, res, next) => {
  try {
    const startedAt = Date.now();
    const q = sanitizeSearchQuery(req.query.q);
    const qN = normalizeArabicSearch(q);

    const categories = parseGlobalSearchCategories(req.query.categories);
    if (!categories) {
      // A typo'd category must never silently narrow results — 400.
      throw AppError.badRequest('فئات بحث غير معروفة — تحقّق من قيمة categories');
    }
    const { page, pageSize } = parseGlobalSearchPagination(req.query.page, req.query.pageSize);
    const plan = planGlobalQuery(q);

    const emptyCategory = (): GlobalSearchCategory => ({ items: [], total: 0 });
    const emptyEnvelope = () =>
      Object.fromEntries(categories.map((k) => [k, emptyCategory()])) as Record<
        GlobalSearchCategoryKey,
        GlobalSearchCategory
      >;

    // The min-2 gate — the /search/global convention (audit 15-i TOP-9).
    if (q.length < 2 || qN.length < 2) {
      res.json({ data: { query: q, categories: emptyEnvelope(), tookMs: 0 } });
      return;
    }

    const userId = req.user!.id;
    const role = req.user!.role;

    // Verified institution context — REQUIRED for every institutional
    // role (fail-closed, the profile-scoping.ts law: a stale claim 403s
    // INSTITUTION_CONTEXT_INVALID inside resolveCallerInstitutionScope,
    // a missing one 403s INSTITUTION_CONTEXT_REQUIRED). OWNER keeps the
    // platform-wide view (no membership by design).
    const institutionId =
      role === 'OWNER' ? null : await resolveCallerInstitutionScope(userId, req.user!.institutionId);
    if (role !== 'OWNER' && !institutionId) throw institutionContextRequiredError();

    const facts = categories.includes('announcements')
      ? await gatherGlobalAnnouncementFacts(role, userId, institutionId!)
      : {};

    const scope = globalSearchScope(role, userId, institutionId, facts);

    const ic = (s: string) => ({ contains: s, mode: 'insensitive' as const });
    const take = candidateTake(page, pageSize);
    const want = (k: GlobalSearchCategoryKey) => categories.includes(k) && scope[k] !== null;

    // Phone arm — admitted only for the roles the matrix allows, and
    // only for an actual phone query (null otherwise).
    const phoneArm = scope.phoneSearch ? phoneMatchArm(plan, institutionId) : null;

    // Students/teachers profile include: the caller-institution profile
    // (active membership) for institutional roles; the oldest profile
    // for OWNER (platform view, resolveStudentProfile's ordering). The
    // two where-shapes differ — StudentProfile carries a denormalized
    // institutionId, TeacherProfile is reached through the membership.
    const studentProfileWhere = institutionId
      ? { institutionId, membership: { isActive: true } }
      : undefined;
    const teacherProfileWhere = institutionId
      ? { membership: { institutionId, isActive: true } }
      : undefined;
    const studentProfileSelect = {
      universityId: true,
      studentPhoneNormalized: true,
      guardianPhoneNormalized: true,
      faculty: { select: { name: true } },
      institution: { select: { name: true } },
    };
    const teacherProfileSelect = {
      specialty: true,
      department: { select: { name: true } },
      membership: { select: { institution: { select: { name: true } } } },
    };

    // The candidate scans are independent — run them concurrently (the
    // /search/global convention), each with an explicit deterministic
    // orderBy so the windowed take is stable across requests.
    const [
      studentRows,
      teacherRows,
      institutionRows,
      facultyRows,
      departmentRows,
      courseRows,
      announcementRows,
    ] = await Promise.all([
      want('students')
        ? prisma.user.findMany({
            where: {
              AND: [
                scope.students!,
                {
                  OR: [
                    ...plan.variants.map((v) => ({ firstName: ic(v) })),
                    ...plan.variants.map((v) => ({ lastName: ic(v) })),
                    ...(phoneArm ? [phoneArm] : []),
                  ],
                },
              ],
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
            take,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentProfiles: { where: studentProfileWhere, orderBy: { createdAt: 'asc' }, take: 1, select: studentProfileSelect },
            },
          }) as Promise<StudentRow[]>
        : Promise.resolve([] as StudentRow[]),
      want('teachers')
        ? prisma.user.findMany({
            where: {
              AND: [
                scope.teachers!,
                {
                  OR: [
                    ...plan.variants.map((v) => ({ firstName: ic(v) })),
                    ...plan.variants.map((v) => ({ lastName: ic(v) })),
                  ],
                },
              ],
            },
            orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
            take,
            select: {
              id: true,
              firstName: true,
              lastName: true,
              teacherProfiles: { where: teacherProfileWhere, orderBy: { createdAt: 'asc' }, take: 1, select: teacherProfileSelect },
            },
          }) as Promise<TeacherRow[]>
        : Promise.resolve([] as TeacherRow[]),
      want('institutions')
        ? prisma.institution.findMany({
            where: {
              AND: [
                scope.institutions!,
                {
                  OR: [
                    ...plan.variants.map((v) => ({ name: ic(v) })),
                    ...plan.variants.map((v) => ({ nameEn: ic(v) })),
                  ],
                },
              ],
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take,
            select: { id: true, name: true, nameEn: true },
          }) as Promise<InstitutionRow[]>
        : Promise.resolve([] as InstitutionRow[]),
      want('faculties')
        ? prisma.faculty.findMany({
            where: {
              AND: [
                scope.faculties!,
                {
                  OR: [
                    ...plan.variants.map((v) => ({ name: ic(v) })),
                    ...plan.variants.map((v) => ({ nameEn: ic(v) })),
                  ],
                },
              ],
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take,
            select: { id: true, name: true, nameEn: true, city: true },
          }) as Promise<FacultyRow[]>
        : Promise.resolve([] as FacultyRow[]),
      want('departments')
        ? prisma.department.findMany({
            where: {
              AND: [
                scope.departments!,
                {
                  OR: [
                    ...plan.variants.map((v) => ({ name: ic(v) })),
                    ...plan.variants.map((v) => ({ nameEn: ic(v) })),
                  ],
                },
              ],
            },
            orderBy: [{ name: 'asc' }, { id: 'asc' }],
            take,
            select: { id: true, name: true, nameEn: true, faculty: { select: { name: true } } },
          }) as Promise<DepartmentRow[]>
        : Promise.resolve([] as DepartmentRow[]),
      want('courses')
        ? prisma.courseOffering.findMany({
            where: {
              AND: [
                scope.courses!,
                {
                  OR: [
                    ...plan.variants.map((v) => ({ course: { name: ic(v) } })),
                    { course: { code: ic(q) } },
                  ],
                },
              ],
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
            take,
            select: { id: true, term: true, course: { select: { name: true, code: true } } },
          }) as Promise<CourseRow[]>
        : Promise.resolve([] as CourseRow[]),
      want('announcements')
        ? prisma.announcement.findMany({
            where: {
              AND: [
                scope.announcements!,
                { OR: plan.variants.map((v) => ({ title: ic(v) })) },
                unexpiredAnnouncementFilter(new Date()),
              ],
            },
            orderBy: [{ pinned: 'desc' }, { publishedAt: 'desc' }, { id: 'asc' }],
            take,
            select: {
              id: true,
              title: true,
              author: { select: { firstName: true, lastName: true } },
            },
          }) as Promise<AnnouncementRow[]>
        : Promise.resolve([] as AnnouncementRow[]),
    ]);

    // JS re-verification + ranking (matchesNormalizedQuery is the
    // verifier; rankHit orders exact < prefix < substring). A row that
    // only cleared searchHit's RAW arm (exotic case-folds) keeps its
    // page slot at the substring tier. Phone hits rank at the substring
    // tier — an identifier match, below an exact-name match.
    const makeRanker =
      <T>(haystacksOf: (row: T) => string[]): ((row: T) => number) =>
      (row) => {
        const haystacks = haystacksOf(row);
        let best = Math.min(
          ...haystacks.map((h) => rankHit(normalizeArabicSearch(h ?? ''), qN)),
        );
        if (best === RANK_NONE && searchHit(haystacks, q, qN)) best = RANK_SUBSTRING;
        return best;
      };

    const rankStudentNames = makeRanker((u: StudentRow) => [
      u.firstName,
      u.lastName,
      `${u.firstName} ${u.lastName}`,
    ]);
    const rankStudents = (u: StudentRow): number => {
      let best = rankStudentNames(u);
      if (scope.phoneSearch && phoneHit(u.studentProfiles[0], plan)) {
        best = Math.min(best, RANK_SUBSTRING);
      }
      return best;
    };

    const studentPage = want('students')
      ? rankAndPaginate(
          studentRows,
          rankStudents,
          (u: StudentRow) => normalizeArabicSearch(`${u.firstName} ${u.lastName}`),
          (u: StudentRow) => u.id,
          page,
          pageSize,
        )
      : null;
    const teacherPage = want('teachers')
      ? rankAndPaginate(
          teacherRows,
          makeRanker((t: TeacherRow) => [t.firstName, t.lastName, `${t.firstName} ${t.lastName}`]),
          (t: TeacherRow) => normalizeArabicSearch(`${t.firstName} ${t.lastName}`),
          (t: TeacherRow) => t.id,
          page,
          pageSize,
        )
      : null;
    const institutionPage = want('institutions')
      ? rankAndPaginate(
          institutionRows,
          makeRanker((i: InstitutionRow) => [i.name, i.nameEn ?? '']),
          (i: InstitutionRow) => normalizeArabicSearch(i.name),
          (i: InstitutionRow) => i.id,
          page,
          pageSize,
        )
      : null;
    const facultyPage = want('faculties')
      ? rankAndPaginate(
          facultyRows,
          makeRanker((f: FacultyRow) => [f.name, f.nameEn ?? '']),
          (f: FacultyRow) => normalizeArabicSearch(f.name),
          (f: FacultyRow) => f.id,
          page,
          pageSize,
        )
      : null;
    const departmentPage = want('departments')
      ? rankAndPaginate(
          departmentRows,
          makeRanker((d: DepartmentRow) => [d.name, d.nameEn ?? '']),
          (d: DepartmentRow) => normalizeArabicSearch(d.name),
          (d: DepartmentRow) => d.id,
          page,
          pageSize,
        )
      : null;
    const coursePage = want('courses')
      ? rankAndPaginate(
          courseRows,
          makeRanker((o: CourseRow) => [o.course.name, o.course.code]),
          (o: CourseRow) => normalizeArabicSearch(o.course.name),
          (o: CourseRow) => o.id,
          page,
          pageSize,
        )
      : null;
    const announcementPage = want('announcements')
      ? rankAndPaginate(
          announcementRows,
          makeRanker((a: AnnouncementRow) => [a.title]),
          (a: AnnouncementRow) => normalizeArabicSearch(a.title),
          (a: AnnouncementRow) => a.id,
          page,
          pageSize,
        )
      : null;

    // ── Item mapping ──────────────────────────────────────────────
    const studentItems: GlobalSearchItem[] = (studentPage?.items ?? []).map((u) => {
      const p = u.studentProfiles[0];
      const item: GlobalSearchItem = {
        id: u.id,
        kind: 'student',
        titleAr: `${u.firstName} ${u.lastName}`.trim(),
        subtitleAr: p
          ? role === 'OWNER'
            ? [p.institution?.name, p.universityId].filter(Boolean).join(' · ') || null
            : [p.universityId, p.faculty?.name].filter(Boolean).join(' · ') || null
          : null,
        href: studentHitHref(role),
      };
      // §10.4/§5: phone fields ONLY for ADMIN/OWNER, ONLY the normalized
      // columns — the display pair never leaves the DB here.
      if (scope.phoneFieldsVisible) {
        item.studentPhoneNormalized = p?.studentPhoneNormalized ?? null;
        item.guardianPhoneNormalized = p?.guardianPhoneNormalized ?? null;
      }
      return item;
    });

    const teacherItems: GlobalSearchItem[] = (teacherPage?.items ?? []).map((t) => {
      const p = t.teacherProfiles[0];
      return {
        id: t.id,
        kind: 'teacher',
        titleAr: `${t.firstName} ${t.lastName}`.trim(),
        subtitleAr: p
          ? role === 'OWNER'
            ? [p.specialty, p.membership.institution.name].filter(Boolean).join(' · ') || null
            : [p.specialty, p.department?.name].filter(Boolean).join(' · ') || null
          : null,
        href: teacherHitHref(role),
      };
    });

    const institutionItems: GlobalSearchItem[] = (institutionPage?.items ?? []).map((i) => ({
      id: i.id,
      kind: 'institution',
      titleAr: i.name,
      subtitleAr: i.nameEn ?? null,
      href: institutionHitHref(role),
    }));

    const facultyItems: GlobalSearchItem[] = (facultyPage?.items ?? []).map((f) => ({
      id: f.id,
      kind: 'faculty',
      titleAr: f.name,
      subtitleAr: [f.nameEn, f.city].filter(Boolean).join(' · ') || null,
      href: facultyHitHref(f.id),
    }));

    const departmentItems: GlobalSearchItem[] = (departmentPage?.items ?? []).map((d) => ({
      id: d.id,
      kind: 'department',
      titleAr: d.name,
      subtitleAr: d.faculty?.name ?? null,
      // No standalone department surface exists in App.tsx — a plain
      // row (the file-less-paper convention: never a dead click).
      href: null,
    }));

    const courseItems: GlobalSearchItem[] = (coursePage?.items ?? []).map((o) => ({
      id: o.id,
      kind: 'course',
      titleAr: o.course.name,
      subtitleAr: `${o.course.code} · ${o.term}`,
      // The established course-hit matrix (courseHitHref above).
      href: courseHitHref(role, o.id),
    }));

    const announcementItems: GlobalSearchItem[] = (announcementPage?.items ?? []).map((a) => ({
      id: a.id,
      kind: 'announcement',
      titleAr: a.title,
      subtitleAr: `${a.author.firstName} ${a.author.lastName}`,
      href: announcementHitHref(role),
    }));

    const categoryAnswers: Record<GlobalSearchCategoryKey, GlobalSearchCategory> = {
      students: { items: studentItems, total: studentPage?.total ?? 0 },
      teachers: { items: teacherItems, total: teacherPage?.total ?? 0 },
      institutions: { items: institutionItems, total: institutionPage?.total ?? 0 },
      faculties: { items: facultyItems, total: facultyPage?.total ?? 0 },
      departments: { items: departmentItems, total: departmentPage?.total ?? 0 },
      courses: { items: courseItems, total: coursePage?.total ?? 0 },
      announcements: { items: announcementItems, total: announcementPage?.total ?? 0 },
    };

    res.json({
      data: {
        query: q,
        // Only the requested categories ride the envelope (default: all).
        categories: Object.fromEntries(
          categories.map((k) => [k, categoryAnswers[k]]),
        ) as Record<GlobalSearchCategoryKey, GlobalSearchCategory>,
        tookMs: Date.now() - startedAt,
      },
    });
  } catch (e) { next(e); }
});

export default router;
