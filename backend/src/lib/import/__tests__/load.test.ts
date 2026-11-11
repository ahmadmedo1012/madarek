/**
 * master-F1 — the 10,000-row synthetic load test (§9.6).
 *
 * The PURE layer (parse → map → validate) must handle a real
 * institutional export's scale in seconds, not minutes — the chunked
 * DB commit is the route layer's own budget. Synthetic data only:
 * no real student information, ever (mission law).
 */
import { describe, expect, it } from 'vitest';
import { parseCsv } from '../../bulk-import.js';
import { buildColumnMap } from '../mapping.js';
import { validateRows } from '../validate.js';

const HEADERS = [
  'الاسم الكامل',
  'رقم القيد',
  'رقم الهاتف',
  'رقم ولي الأمر',
  'الكلية',
  'القسم',
  'السنة الدراسية',
];

function syntheticCsv(n: number): string {
  const lines = [HEADERS.join(',')];
  for (let i = 1; i <= n; i += 1) {
    const reg = `LD-${String(i).padStart(6, '0')}`;
    const phone = `091${String(1000000 + (i % 9000000)).slice(0, 7)}`;
    lines.push(`"طالب رقم ${i}",${reg},${phone},0919998888,"كلية العلوم","قسم الحاسوب",${(i % 8) + 1}`);
  }
  return lines.join('\n');
}

describe('master-F1 load — 10,000 synthetic rows through the pure layer', () => {
  it('completes parse → map → validate in seconds with exact counts', () => {
    const t0 = Date.now();
    const grid = parseCsv(syntheticCsv(10_000));
    expect(grid).toHaveLength(10_001); // header + 10k

    const map = buildColumnMap(HEADERS);
    const result = validateRows(grid.slice(1), map, { entity: 'STUDENT', mode: 'UNIVERSITY' });
    const elapsed = Date.now() - t0;

    expect(result.counts.total).toBe(10_000);
    expect(result.counts.ok).toBe(10_000);
    expect(result.counts.error).toBe(0);
    // Unique student phones → no shared-phone family (the siblings
    // warning case is pinned in validate.test.ts; the guardian phone
    // is intentionally NOT a student-phone duplicate signal).
    expect(result.duplicateReport.sharedPhones).toHaveLength(0);

    // Duration budget: the pure layer must stay in the seconds class.
    // Measured locally (sandbox, 2 CPUs): well under 10s. If this ever
    // regresses past 30s, the mapping hot path needs a revisit.
    expect(elapsed, `pure layer took ${elapsed}ms for 10k rows`).toBeLessThan(30_000);
  });
});
