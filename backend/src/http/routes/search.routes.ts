import { Router } from 'express';
import type { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { normalizeArabicSearch, matchesNormalizedQuery } from '../../modules/search/normalize.js';
import { offeringVisibilityFilter } from './courses.routes.js';

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
        lectures: lectures.map((l) => ({
          id: l.id,
          title: l.title,
          subtitle: l.offering.course.name,
          iconEmoji: l.offering.course.iconEmoji,
          href: role === 'TEACHER' ? `/teacher/intelligence/${l.offering.id}` : `/student/lectures/${l.id}`,
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
        tracks: tracks.map((t) => ({
          id: t.id,
          slug: t.slug,
          title: t.title,
          subtitle: t.summary.slice(0, 80),
          iconEmoji: t.iconEmoji,
          themeColor: t.themeColor,
          href: `/training/${t.slug}`,
        })),
      },
    });
  } catch (e) { next(e); }
});

export default router;
