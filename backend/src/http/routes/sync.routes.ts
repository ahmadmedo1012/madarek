import { Router } from 'express';
import { prisma } from '../../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { runSync } from '../../lib/zu-sync/index.js';

const router = Router();
router.use(authMiddleware);

/**
 * GET /admin/sync — view current sync status, last run, and synced facts.
 * Visible to admin (USERS_MANAGE) and to quality (QUALITY_VIEW).
 */
router.get('/admin/sync', requireCapability('USERS_MANAGE', 'QUALITY_VIEW'), async (_req, res, next) => {
  try {
    const [latestRun, runHistory, facts, stale, factCount] = await Promise.all([
      prisma.syncRun.findFirst({
        orderBy: { startedAt: 'desc' },
      }),
      prisma.syncRun.findMany({
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      prisma.universityFact.findMany({
        orderBy: [{ category: 'asc' }, { key: 'asc' }],
      }),
      prisma.universityFact.count({ where: { isStale: true } }),
      prisma.universityFact.count(),
    ]);

    // Group facts by category for the UI
    const byCategory: Record<string, typeof facts> = {};
    for (const f of facts) {
      const c = f.category ?? 'other';
      if (!byCategory[c]) byCategory[c] = [];
      byCategory[c].push(f);
    }

    res.json({
      data: {
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
 */
router.post('/admin/sync/trigger', requireCapability('USERS_MANAGE'), async (_req, res, next) => {
  try {
    const result = await runSync();
    res.json({ data: result });
  } catch (e) {
    next(e);
  }
});

/**
 * GET /university/facts — public-ish endpoint for any authenticated user
 * to read the synced institutional facts (used by Vision page, About page).
 */
router.get('/university/facts', async (_req, res, next) => {
  try {
    const facts = await prisma.universityFact.findMany({
      orderBy: [{ category: 'asc' }, { key: 'asc' }],
    });
    const byCategory: Record<string, Record<string, string>> = {};
    for (const f of facts) {
      if (!byCategory[f.category]) byCategory[f.category] = {};
      byCategory[f.category]![f.key] = f.value;
    }
    res.json({ data: byCategory });
  } catch (e) {
    next(e);
  }
});

export default router;
