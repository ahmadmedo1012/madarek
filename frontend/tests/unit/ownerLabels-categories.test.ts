/**
 * r151a (R5-A5 P3): pin the operational-alert category vocabulary.
 *
 * The backend derives an alert's category from its code prefix
 * (backend/src/lib/operational-alerts.ts — `'HTTP_500' → 'http'`).
 * Every production writer is enumerated in the backend lib's header;
 * the live set today is:
 *
 *   errorHandler  → APP_*   → 'app'   (5xx AppError paths)
 *   errorHandler  → HTTP_500 → 'http' (unhandled errors)
 *   zu-sync reaper → SYNC_* → 'sync'  (stale-run reap warnings)
 *
 * CATEGORY_LABELS in lib/ownerLabels.ts must cover every category a
 * writer can emit, or the badge falls back to a raw Latin run inside
 * an Arabic RTL sentence — the exact leak class this map exists to
 * prevent (audit 4-A7 P1-1). The seed writes no alerts, so demo data
 * can never surface a missing entry; only this contract test can.
 *
 * If this test fails after adding a writer: either give the new code
 * prefix an Arabic label here, or re-derive the category inside
 * raiseOperationalAlert onto the controlled vocabulary below.
 */
import { describe, expect, it } from 'vitest';

import { CATEGORY_LABELS, SEVERITY_LABELS } from '../../src/lib/ownerLabels';

/** Categories the production writers emit today (code prefixes). */
const WRITER_CATEGORIES = ['app', 'http', 'sync'] as const;

describe('ownerLabels — operational-alert category vocabulary (r151a)', () => {
  it.each(WRITER_CATEGORIES)(
    'covers the production writer category %s (no raw Latin badge leak)',
    (category) => {
      expect(CATEGORY_LABELS[category], `missing Arabic label for "${category}"`).toBeTruthy();
    },
  );

  it('keeps the historical/static categories labelled too', () => {
    // The pre-existing vocabulary — kept because the schema allows
    // manual alert creation (owner.routes.ts category field) and the
    // ops board has always rendered these.
    for (const category of [
      'infrastructure',
      'security',
      'performance',
      'system',
      'storage',
      'database',
      'api',
    ] satisfies Array<keyof typeof CATEGORY_LABELS>) {
      expect(CATEGORY_LABELS[category]).toBeTruthy();
    }
  });

  it('labels every severity the backend enum defines', () => {
    // Mirrors OperationalSeverity in operational-alerts.ts.
    for (const severity of ['critical', 'error', 'warning', 'info'] as const) {
      expect(SEVERITY_LABELS[severity], `missing Arabic label for "${severity}"`).toBeTruthy();
    }
  });
});
