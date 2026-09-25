import { Router } from 'express';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { normalizeArabicSearch, matchesNormalizedQuery } from '../../modules/search/normalize.js';

const router = Router();
router.use(authMiddleware);

/**
 * GET /search/global?q=...
 *
 * Cross-cutting search across courses, lectures, research papers, and training tracks.
 * Returns at most 5 hits per category. Designed for autocomplete dropdown — fast,
 * tolerant, and limited in scope.
 *
 * Permission model: respects the user's role.
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
 */
router.get('/search/global', async (req, res, next) => {
  try {
    // Trim + hard cap at 120 chars (q flows into ILIKE patterns).
    const q = (typeof req.query.q === 'string' ? req.query.q : '').trim().slice(0, 120);
    const qN = normalizeArabicSearch(q);
    if (q.length < 2 || qN.length < 2) {
      res.json({ data: { courses: [], lectures: [], papers: [], tracks: [] } });
      return;
    }

    const userId = req.user!.id;
    const role = req.user!.role;

    const ic = (s: string) => ({ contains: s, mode: 'insensitive' as const });

    // Scope: which offerings is this user related to? Mirrors
    // assertOfferingAccess's enrollment convention — only
    // status 'active' enrollments count (lib/permissions.ts).
    const offeringFilter =
      role === 'TEACHER'
        ? { teacherId: userId }
        : role === 'STUDENT'
          ? { enrollments: { some: { studentId: userId, status: 'active' } } }
          : {};

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
        orderBy: { ordinal: 'asc' },
        take: CANDIDATE_TAKE,
      }),

      // Published research papers (anyone authenticated can search the
      // library) — publishedAt desc, like /research/library.
      prisma.researchPaper.findMany({
        where: {
          status: 'PUBLISHED',
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

    // JS re-verification with the canonical foldings (raw OR normalized hit).
    const hits = (haystacks: string[]) => haystacks.some((h) => h.toLowerCase().includes(q.toLowerCase()) || matchesNormalizedQuery(h, qN));

    const courses = courseCandidates.filter((o) => hits([o.course.name, o.course.code])).slice(0, RESULT_TAKE);
    const lectures = lectureCandidates.filter((l) => hits([l.title, l.description ?? ''])).slice(0, RESULT_TAKE);
    const papers = paperCandidates.filter((p) => hits([p.title, p.abstract ?? ''])).slice(0, RESULT_TAKE);
    const tracks = trackCandidates.filter((t) => hits([t.title, t.titleEn ?? '', t.summary])).slice(0, RESULT_TAKE);

    res.json({
      data: {
        courses: courses.map((o) => ({
          id: o.id,
          title: o.course.name,
          subtitle: `${o.course.code} · ${o.term}`,
          iconEmoji: o.course.iconEmoji,
          themeColor: o.course.themeColor,
          href:
            role === 'TEACHER' ? `/teacher/intelligence/${o.id}` :
            role === 'STUDENT' ? `/student/courses/${o.id}` :
            `/admin/courses`,
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
          href: `/document/${p.id}`,
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
