/**
 * r357 L5 — the cross-instance provider-health verdict.
 *
 * The chain's breakers are IN-PROCESS (per serverless instance) — a
 * single /status read cannot know what another instance saw. The DB
 * AiTelemetry table is the cross-instance truth: every chat turn
 * writes its provider + success. This module reads the last
 * HEALTH_WINDOW_MS of REAL-provider rows (provider ≠ null/'local') and
 * answers ONE question: have ALL providers been failing for more than
 * DOWN_THRESHOLD_MS with no success in between?
 *
 * Consumers:
 *  · the tick's fast slot — raises OperationalAlert
 *    AI_ALL_PROVIDERS_DOWN (throttled by the alert writer) when the
 *    verdict is down;
 *  · /status's ai block — exposes `allProvidersDownSince` (ISO or
 *    null) so the tick WORKFLOW can open a GitHub issue (the owner's
 *    channel) without any secret reaching the backend.
 */
import { logger } from '../../logger.js';

/** The lookback window (15 min — three tick cadences of history). */
export const HEALTH_WINDOW_MS = 15 * 60_000;
/** Failures must have persisted this long before "down" is declared. */
export const DOWN_THRESHOLD_MS = 5 * 60_000;

/** The telemetry row slice the verdict needs. */
export interface HealthTelemetryRow {
  provider: string | null;
  success: boolean;
  createdAt: Date;
}

/** The structural Prisma subset (unit-testable without a DB). */
export interface HealthTelemetryStore {
  aiTelemetry: {
    findMany(args: {
      where: { createdAt: { gte: Date }; provider: { not: null } };
      orderBy: { createdAt: 'desc' };
      take: number;
      select: { provider: true; success: true; createdAt: true };
    }): Promise<HealthTelemetryRow[]>;
  };
}

export interface ProviderHealthVerdict {
  allDown: boolean;
  /** The oldest failure inside the failures-only window (null when healthy). */
  downSince: Date | null;
  /** The distinct providers that failed in the window (evidence). */
  providersFailed: string[];
  /** Rows examined (0 = no AI traffic at all — vacuously healthy). */
  rows: number;
}

/**
 * The verdict over the recent telemetry. Pure given the store + now.
 * `local` rows (the terminal composer fallback) are EXCLUDED: they are
 * not provider answers; a turn that fell through to local carries
 * provider='local' + success=true but proves nothing about Gemini/Groq.
 * A window with ZERO real-provider rows is vacuously healthy (a quiet
 * platform is not a down platform).
 */
export async function assessProviderHealth(
  store: HealthTelemetryStore,
  now: Date = new Date(),
): Promise<ProviderHealthVerdict> {
  const rows = await store.aiTelemetry.findMany({
    where: { createdAt: { gte: new Date(now.getTime() - HEALTH_WINDOW_MS) }, provider: { not: null } },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: { provider: true, success: true, createdAt: true },
  });
  const real = rows.filter((r) => r.provider !== 'local');
  if (real.length === 0) {
    return { allDown: false, downSince: null, providersFailed: [], rows: 0 };
  }
  const anySuccess = real.some((r) => r.success);
  if (anySuccess) {
    return { allDown: false, downSince: null, providersFailed: [], rows: real.length };
  }
  // Failures only: the OLDEST failure is the outage's start.
  const oldest = real.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
  const providers = [...new Set(real.map((r) => r.provider as string))];
  const downFor = now.getTime() - oldest.createdAt.getTime();
  return {
    allDown: downFor >= DOWN_THRESHOLD_MS,
    downSince: downFor >= DOWN_THRESHOLD_MS ? oldest.createdAt : null,
    providersFailed: providers,
    rows: real.length,
  };
}

/**
 * The tick's fast-slot guard: assess + raise the throttled operational
 * alert when everything is down. Never throws (best-effort by the
 * tick law).
 */
export async function raiseAllProvidersDownAlertIfDown(
  store: HealthTelemetryStore,
  raiseAlert: (input: { severity: 'critical'; code: string; message: string; metadata?: Record<string, unknown> }) => Promise<unknown>,
  now: Date = new Date(),
): Promise<ProviderHealthVerdict> {
  try {
    const verdict = await assessProviderHealth(store, now);
    if (verdict.allDown) {
      await raiseAlert({
        severity: 'critical',
        code: 'AI_ALL_PROVIDERS_DOWN',
        message: `كل مزوّدي الذكاء الاصطناعي متوقفون منذ ${Math.round((now.getTime() - (verdict.downSince?.getTime() ?? now.getTime())) / 60_000)} دقيقة (${verdict.providersFailed.join('، ')}) — راجع حدود الاستخدام المجانية`,
        metadata: {
          providers: verdict.providersFailed,
          downSince: verdict.downSince?.toISOString() ?? null,
          rows: verdict.rows,
        },
      });
    }
    return verdict;
  } catch (err) {
    logger.warn({ err }, 'AI provider-health assessment failed (non-blocking)');
    return { allDown: false, downSince: null, providersFailed: [], rows: 0 };
  }
}
