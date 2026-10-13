/**
 * r151b (R5-A4): the owner realtime summary table — the one .table
 * consumer that missed BOTH halves of the mobile contract in the
 * r150d retirement onto the canonical table system:
 *
 * 1. No per-td data-labels — at ≤640px the tbl-stack rung rendered
 *    bare values («1,240» with no column name) on every row.
 * 2. No .table-wrap scroller — its 23 sibling tables all ship one;
 *    the wrap also gives the 641-1024px band the r-xl rule border.
 *
 * This test pins the full mobile contract on the summary table
 * (12/12 labelled cells + tbl-stack + wrap), mirroring the
 * QualityPages-rosters pattern that guards the other rosters.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwnerRealtimePage } from '../../src/pages/owner/OwnerRealtimePage';

const FIXTURES: Record<string, unknown> = {};

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve({ data: { data } });
    },
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

const REALTIME = {
  activeSessions: 1240,
  aiRequestsPerMin: 18,
  liveBroadcasts: 3,
  activeExams: 42,
};

beforeEach(() => {
  FIXTURES['/owner/realtime'] = REALTIME;
  FIXTURES['/owner/alerts'] = [];
});

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={client}>
        <OwnerRealtimePage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('OwnerRealtimePage — summary table mobile contract (r151b)', () => {
  it('ships the wrap scroller + tbl-stack + a data-label on all 12 cells', async () => {
    renderPage();
    await screen.findByText('الجلسات المتّصلة');

    const table = document.querySelector('table.table.tbl-stack');
    expect(table).not.toBeNull();
    // The wrap scroller — every sibling table has one; this one missed
    // it in the r150d retirement.
    expect(table!.closest('.table-wrap')).not.toBeNull();

    // 4 metric rows × 3 columns — every td names its column.
    const cells = Array.from(table!.querySelectorAll('td'));
    expect(cells).toHaveLength(12);
    for (const td of cells) {
      expect(td.getAttribute('data-label')).toBeTruthy();
    }
    // The three column vocabularies the thead declares.
    for (const label of ['المؤشّر', 'القيمة', 'الحالة']) {
      expect(cells.filter((td) => td.getAttribute('data-label') === label)).toHaveLength(4);
    }
  });
});
