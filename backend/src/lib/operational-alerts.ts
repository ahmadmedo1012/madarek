import { Prisma } from '@prisma/client';
import { logger } from '../logger.js';

/**
 * Operational alert writer — the missing feed for /owner/system and
 * /owner/alerts. The OperationalAlert table existed but nothing ever
 * wrote rows, so the OWNER telemetry pages were permanently empty.
 *
 * Design rules:
 *  - BEST-EFFORT: never throw into the caller's error path. A failed
 *    alert write must not turn a 500 into a 500-with-extra-crash.
 *  - THROTTLED: at most one alert per `code` per throttle window, so a
 *    failure storm (e.g. DB down → every request 500s) doesn't insert
 *    thousands of duplicate rows.
 *
 * Consumers:
 *  - http/middleware/errorHandler.ts — every unhandled 5xx.
 *  - Exported here for the university-sync guard (scheduler/sync
 *    workstream): call `raiseOperationalAlert(prisma, { severity:
 *    'warning', code: 'SYNC_<REASON>', message: '...' })` when a sync
 *    run trips a data-quality guard.
 */

export type OperationalSeverity = 'critical' | 'error' | 'warning' | 'info';

export interface OperationalAlertInput {
  severity: OperationalSeverity;
  /** Stable machine code, e.g. 'HTTP_500', 'SYNC_FACULTY_DRIFT'. Also used as the throttle key. */
  code: string;
  /** Human-readable description (Arabic tone preferred for OWNER-facing surfaces). */
  message: string;
  /** Optional structured context stored on the alert row. */
  metadata?: Prisma.InputJsonObject;
}

/** Minimal structural slice of the Prisma client — keeps this unit-testable. */
interface OperationalAlertWriter {
  operationalAlert: {
    create(args: { data: Prisma.OperationalAlertUncheckedCreateInput }): Promise<unknown>;
  };
}

const THROTTLE_WINDOW_MS = 5 * 60 * 1000;
const lastRaisedAt = new Map<string, number>();

/** Test hook — clear the in-process throttle state. */
export function resetOperationalAlertThrottle(): void {
  lastRaisedAt.clear();
}

/**
 * Raise an operational alert. Fire-and-forget: returns a promise that
 * NEVER rejects (all failures are swallowed + logged).
 */
export async function raiseOperationalAlert(
  prisma: OperationalAlertWriter,
  input: OperationalAlertInput,
): Promise<void> {
  const now = Date.now();
  const last = lastRaisedAt.get(input.code);
  if (last !== undefined && now - last < THROTTLE_WINDOW_MS) return;
  lastRaisedAt.set(input.code, now);

  // Derive a category from the code prefix ('HTTP_500' → 'http').
  const category = (input.code.split('_')[0] ?? 'general').toLowerCase();

  const data: Prisma.OperationalAlertUncheckedCreateInput = {
    severity: input.severity,
    category,
    title: input.code,
    message: input.message,
  };
  if (input.metadata) data.metadata = input.metadata;

  try {
    await prisma.operationalAlert.create({ data });
  } catch (err) {
    // Best-effort by contract — a broken alert pipeline must never
    // propagate into the request path that raised the alert.
    logger.warn({ err, code: input.code }, 'Failed to persist operational alert');
  }
}
