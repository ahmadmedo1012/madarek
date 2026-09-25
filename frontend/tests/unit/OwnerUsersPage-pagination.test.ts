/**
 * Task 13-14 — OwnerUsersPage bounded pagination window (audit 11-f P2-14:
 * the pure pageList() helper was called a "perfect unit-test candidate").
 *
 * pageList(page, totalPages) must always include page 1 and the last page,
 * a window of PAGE_NEIGHBORS (=2) pages around the current one, and 'gap'
 * markers where numbers were elided — so a 200-page result renders
 * ≤ 2·PAGE_NEIGHBORS + 4 number buttons, never 200 (audit 0-e P1-25).
 */
import { describe, expect, it } from 'vitest';
import { pageList } from '../../src/pages/owner/OwnerUsersPage';

describe('pageList — bounded pagination window', () => {
  it('renders a single page with no gaps', () => {
    expect(pageList(1, 1)).toEqual([1]);
  });

  it('always keeps the first and last page reachable (start of list)', () => {
    expect(pageList(1, 5)).toEqual([1, 2, 3, 'gap', 5]);
  });

  it('shows every page when the window covers the whole range', () => {
    expect(pageList(3, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageList(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it('windows around the current page in the middle of a long list', () => {
    expect(pageList(10, 30)).toEqual([1, 'gap', 8, 9, 10, 11, 12, 'gap', 30]);
  });

  it('elides only the far end near the start of the list', () => {
    expect(pageList(2, 30)).toEqual([1, 2, 3, 4, 'gap', 30]);
  });

  it('elides only the near end near the end of the list', () => {
    expect(pageList(29, 30)).toEqual([1, 'gap', 27, 28, 29, 30]);
  });

  it('bounds a 200-page result to ≤ 2·PAGE_NEIGHBORS + 4 number buttons', () => {
    const out = pageList(100, 200);
    expect(out).toEqual([1, 'gap', 98, 99, 100, 101, 102, 'gap', 200]);
    const buttons = out.filter((item): item is number => typeof item === 'number');
    expect(buttons.length).toBeLessThanOrEqual(2 * 2 + 4);
    // Never two adjacent gaps and never a gap where a number was elided
    // unnecessarily (the first/last page are always concrete buttons).
    expect(out[0]).toBe(1);
    expect(out[out.length - 1]).toBe(200);
  });
});
