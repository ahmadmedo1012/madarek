import { Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { runSyncGuarded } from '../../scheduler.js';
import { AppError } from '../../lib/errors.js';
import { resolveCallerInstitutionScope } from '../../lib/profile-scoping.js';
import {
  findInstitutionSyncConfig,
  PUBLIC_FACTS_DEFAULT_SLUG,
} from '../../lib/zu-sync/index.js';

/**
 * r179d (phase-5) — university-sync routes, scoped per institution.
 *
 *   GET  /university/facts   — PUBLIC (no auth): ONE institution's
 *                              facts, `?institution=slug`, default the
 *                              showcase (the public landing's data).
 *   GET  /admin/sync         — ADMIN/QUALITY: their institution's facts
 *                              + run history (context required). OWNER:
 *                              platform-wide or `?institution=slug`.
 *   POST /admin/sync/trigger — ADMIN: their institution's sync (an
 *                              institution without a configured source
 *                              → honest 400). OWNER: any institution
 *                              explicitly, or the showcase default.
 *
 * The University of Zawia source is NOT a global source for every
 * university: which institutions have a configured source is decided
 * by the in-code registry in lib/zu-sync (INSTITUTION_SYNC_CONFIGS —
 * zawia-showcase only today). A sync for one institution can never
 * mark another institution's facts stale or overwrite its data (the
 * composite (institutionId, key) upserts and stale-marking in runSync
 * guarantee it; pinned by unit + integration tests).
 */
const router = Router();

interface InstitutionView {
  id: string;
  slug: string;
  name: string;
}

/** The `?institution=` filter when present (string only — the repo's
 * optional-query convention: non-string values read as absent). */
function institutionSlugParam(req: { query: Record<string, unknown> }): string | null {
  const raw = req.query['institution'];
  return typeof raw === 'string' && raw.length > 0 ? raw : null;
}

async function loadInstitutionById(id: string): Promise<InstitutionView | null> {
  return prisma.institution.findUnique({
    where: { id },
    select: { id: true, slug: true, name: true },
  });
}

async function loadInstitutionBySlug(slug: string): Promise<InstitutionView | null> {
  return prisma.institution.findUnique({
    where: { slug },
    select: { id: true, slug: true, name: true },
  });
}

/** A verified-institution row for the CALLER's context, or a context
 * error. resolveCallerInstitutionScope re-verifies the claim against
 * the DB (throws INSTITUTION_CONTEXT_INVALID on forged/stale); this
 * helper adds the row read the routes need for registry matching. */
async function requireCallerInstitution(
  user: { id: string; institutionId: string | null },
): Promise<InstitutionView> {
  const scopeId = await resolveCallerInstitutionScope(user.id, user.institutionId);
  if (!scopeId) {
    throw new AppError(
      'INSTITUTION_CONTEXT_REQUIRED',
      'حدّد المؤسسة أولًا — اختر مؤسستك ثم أعد المحاولة',
      403,
    );
  }
  const institution = await loadInstitutionById(scopeId);
  if (!institution) {
    // resolveCallerInstitutionScope verified an ACTIVE membership a
    // moment ago; the row vanishing here is a race — treat as invalid.
    throw new AppError('INSTITUTION_CONTEXT_INVALID', 'عضوية المؤسسة غير نشطة أو غير صالحة', 403);
  }
  return institution;
}

// ── GET /university/facts — PUBLIC, one institution, never blended ──
// Registered BEFORE the router-level authMiddleware: this is the public
// landing's facts feed (the same class of widening as the public
// /colleges funnel — aggregate institutional data sourced from the
// university's public site, no PII, no user-scoped rows).
router.get('/university/facts', async (req, res, next) => {
  try {
    const slug = institutionSlugParam(req) ?? PUBLIC_FACTS_DEFAULT_SLUG;
    const institution = await loadInstitutionBySlug(slug);
    if (!institution) {
      // Honest unknown-slug answer (also covers a database that has not
      // seeded the default showcase institution yet).
      throw AppError.notFound('لا توجد بيانات لهذه المؤسسة');
    }
    // r179d: exactly ONE institution's facts — never a blend.
    const facts = await prisma.universityFact.findMany({
      where: { institutionId: institution.id },
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    const byCategory: Record<string, Record<string, string>> = {};
    for (const f of facts) {
      if (!byCategory[f.category]) byCategory[f.category] = {};
      byCategory[f.category]![f.key] = f.value;
    }
    res.json({
      data: {
        institution: { slug: institution.slug, name: institution.name },
        categories: byCategory,
      },
    });
  } catch (e) {
    next(e);
  }
});

// ── Authed surface below ───────────────────────────────────────────
// PATH-SCOPED gate (the institutionRoutes pattern): only /admin/*
// requests entering this router authenticate. A router-level gate
// would 401 the anonymous requests of every later-mounted broad
// router (router.use fires for unmatched paths too) — see the mount
// ordering note in app.ts.
router.use('/admin', authMiddleware);

/**
 * GET /admin/sync — view current sync status, last run, and synced facts.
 * Visible to admin (USERS_MANAGE) and to quality (QUALITY_VIEW).
 *
 * r179d (phase-5): the view is INSTITUTION-SCOPED —
 *  - ADMIN/QUALITY callers see THEIR institution's runs + facts. The
 *    caller's institution context is re-verified from the DB
 *    (resolveCallerInstitutionScope); a contextless institutional
 *    caller gets 403 INSTITUTION_CONTEXT_REQUIRED (the client must
 *    POST /auth/select-institution first), and a stale/revoked claim
 *    403 INSTITUTION_CONTEXT_INVALID. Passing ?institution as a
 *    non-OWNER is rejected — an admin must not pivot to another
 *    institution's view.
 *  - OWNER keeps the platform-wide oversight view (all institutions'
 *    runs + facts, with each fact/run carrying its institution), or
 *    narrows it with an explicit ?institution=slug.
 */
router.get('/admin/sync', requireCapability('USERS_MANAGE', 'QUALITY_VIEW'), async (req, res, next) => {
  try {
    const user = req.user!;
    const slugFilter = institutionSlugParam(req);

    // Resolve the view scope: a specific institution, or null =
    // platform-wide (OWNER default only).
    let scopeInstitution: InstitutionView | null;
    let directory: InstitutionView[] | null = null;
    if (user.role === Role.OWNER) {
      if (slugFilter) {
        const institution = await loadInstitutionBySlug(slugFilter);
        if (!institution) throw AppError.notFound('المؤسسة المطلوبة غير موجودة');
        scopeInstitution = institution;
      } else {
        // Platform-wide oversight view: the full directory powers the
        // per-institution summary and fact attribution below.
        scopeInstitution = null;
        directory = await prisma.institution.findMany({
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, slug: true },
        });
      }
    } else {
      if (slugFilter) {
        // Institution pivoting is the OWNER's explicit-oversight power
        // only — an ADMIN/QUALITY passing it must not widen their view.
        throw AppError.forbidden('تصفية مؤسسة بعينها متاحة لمالك المنصة فقط');
      }
      scopeInstitution = await requireCallerInstitution(user);
    }

    const runsWhere = scopeInstitution ? { institutionId: scopeInstitution.id } : {};
    const factsWhere = scopeInstitution ? { institutionId: scopeInstitution.id } : {};

    const [latestRun, runHistory, facts, stale, factCount] = await Promise.all([
      prisma.syncRun.findFirst({
        where: runsWhere,
        orderBy: { startedAt: 'desc' },
        // r179d: every run row carries its institution so a
        // platform-wide OWNER history is never ambiguous.
        include: { institution: { select: { id: true, slug: true, name: true } } },
      }),
      prisma.syncRun.findMany({
        where: runsWhere,
        orderBy: { startedAt: 'desc' },
        take: 10,
        include: { institution: { select: { id: true, slug: true, name: true } } },
      }),
      prisma.universityFact.findMany({
        where: factsWhere,
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      }),
      prisma.universityFact.count({ where: { ...factsWhere, isStale: true } }),
      prisma.universityFact.count({ where: factsWhere }),
    ]);

    // InstitutionId → slug for fact attribution (platform-wide view only).
    const slugById = new Map((directory ?? []).map((i) => [i.id, i.slug]));

    // Group facts by category for the UI. Platform-wide items carry
    // their institution slug; scoped items do not (uniform by filter).
    const byCategory: Record<string, typeof facts> = {};
    for (const f of facts) {
      const c = f.category ?? 'other';
      if (!byCategory[c]) byCategory[c] = [];
      byCategory[c].push(f);
    }

    // OWNER platform-wide only: a per-institution switchboard computed
    // from the loaded rows (no extra queries) — fact/stale counts per
    // institution + whether a configured sync source exists.
    const institutions = directory?.map((i) => {
      let instFacts = 0;
      let instStale = 0;
      for (const f of facts) {
        if (f.institutionId !== i.id) continue;
        instFacts += 1;
        if (f.isStale) instStale += 1;
      }
      return {
        id: i.id,
        name: i.name,
        slug: i.slug,
        factCount: instFacts,
        staleCount: instStale,
        hasSyncSource: findInstitutionSyncConfig(i) !== null,
      };
    });

    res.json({
      data: {
        // null = platform-wide (OWNER default view).
        institution: scopeInstitution,
        // Scoped view only: does the caller's institution have a
        // configured sync source (false → the trigger answers 400)?
        hasSyncSource: scopeInstitution
          ? findInstitutionSyncConfig(scopeInstitution) !== null
          : null,
        institutions,
        latestRun,
        runHistory,
        factCount,
        staleCount: stale,
        categories: Object.entries(byCategory).map(([category, items]) => ({
          category,
          count: items.length,
          items: items.map((f) => ({
            key: f.key,
            value: f.value,
            source: f.source,
            isStale: f.isStale,
            syncedAt: f.syncedAt,
            // Platform-wide view only (scoped views are uniform by filter).
            ...(scopeInstitution
              ? {}
              : { institutionSlug: slugById.get(f.institutionId) ?? null }),
          })),
        })),
      },
    });
  } catch (e) {
    next(e);
  }
});

/**
 * POST /admin/sync/trigger — manually run a sync immediately.
 * Restricted to admin (USERS_MANAGE).
 *
 * r179d (phase-5): the run is INSTITUTION-SCOPED —
 *  - ADMIN (with a verified institution context) triggers THEIR
 *    institution's sync. An institution with no configured source
 *    answers an honest 400 — the Zawia source is not a default for
 *    every university. Contextless admins get 403
 *    INSTITUTION_CONTEXT_REQUIRED.
 *  - OWNER triggers the ?institution=slug institution explicitly, or
 *    the default showcase institution when no param arrives.
 */
router.post('/admin/sync/trigger', requireCapability('USERS_MANAGE'), async (req, res, next) => {
  try {
    const user = req.user!;
    const slugFilter = institutionSlugParam(req);

    // Resolve the TARGET institution (the row itself — id + slug feed
    // the registry lookup).
    let target: InstitutionView;
    if (user.role === Role.OWNER) {
      const institution = slugFilter
        ? await loadInstitutionBySlug(slugFilter)
        : await loadInstitutionBySlug(PUBLIC_FACTS_DEFAULT_SLUG);
      if (!institution) {
        throw AppError.notFound(
          slugFilter ? 'المؤسسة المطلوبة غير موجودة' : 'مؤسسة المزامنة الافتراضية غير موجودة',
        );
      }
      target = institution;
    } else {
      if (slugFilter) {
        // Explicit institution targeting is the OWNER's power only.
        throw AppError.forbidden('تشغيل مزامنة مؤسسة بعينها متاح لمالك المنصة فقط');
      }
      target = await requireCallerInstitution(user);
    }

    // Only institutions with a CONFIGURED source can sync.
    const config = findInstitutionSyncConfig(target);
    if (!config) {
      throw AppError.badRequest(
        'لا يوجد مصدر مزامنة مُعدّ لهذه المؤسسة بعد — يُضبط مصدر البيانات لكل مؤسسة على حدة',
      );
    }

    // Route the manual trigger through the SAME per-institution overlap
    // guard as the scheduler ticks — otherwise an admin clicking "sync
    // now" during a scheduled run of THEIR institution would start a
    // second concurrent sync racing on the same UniversityFact rows.
    // 409 tells the admin a run is already in flight.
    const outcome = await runSyncGuarded('admin-trigger', {
      institutionId: target.id,
      source: config.source,
    });
    if (!outcome.ran) {
      throw AppError.conflict('تعمل عملية مزامنة أخرى الآن لهذه المؤسسة — حاول مجدداً بعد انتهائها');
    }
    res.json({ data: outcome.result });
  } catch (e) {
    next(e);
  }
});

export default router;
