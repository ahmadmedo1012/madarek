/**
 * r299 (workstream F): the owner realtime summary table died — every
 * one of its four numbers repeated the live StatStrip directly above
 * it twice on the same screen (mission: repeated KPI cards), and its
 * only unique contribution (the quiet/active dot column) is the
 * dashboard health-list grammar, not this page's.
 *
 * The r151b mobile contract this file pinned (wrap scroller + tbl-stack
 * + 12/12 data-labels) went with the table it guarded. What still needs
 * pinning on this page:
 *
 * 1. The dedup itself — the summary table never renders again (a
 *    regression would silently reintroduce the duplicate KPI band).
 * 2. The strip's four cells survive as the single owner of the data
 *    (the live-tick label contract 6A10-5 guards in its own file).
 * 3. The pending state occupies the STRIP's shape (the r299 mirror
 *    rule: a KpiSkeleton icon-tile flash before a typographic strip
 *    is a wrong-anatomy flash + CLS at the handoff).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OwnerRealtimePage } from '../../src/pages/owner/OwnerRealtimePage';
import { formatNum } from '../../src/utils/numbers';

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

describe('OwnerRealtimePage — one owner per metric (r299)', () => {
  beforeEach(() => {
    FIXTURES['/owner/realtime'] = REALTIME;
    FIXTURES['/owner/alerts'] = [];
  });

  it('renders NO summary table — the live strip is the single owner of the four metrics', async () => {
    renderPage();
    await screen.findByText('الجلسات النشطة');

    // The r151b table (and its «ملخّص النشاط الحيّ» card) never renders.
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('ملخّص النشاط الحيّ')).toBeNull();

    // The strip's four tick nodes carry the live values once each —
    // each bdi's text is «label: value» (6A10-5's announcement shape).
    const ticks = Array.from(document.querySelectorAll('bdi.owner-value-tick'));
    expect(ticks).toHaveLength(4);
    const texts = ticks.map((t) => t.textContent ?? '');
    for (const value of [REALTIME.activeSessions, REALTIME.aiRequestsPerMin, REALTIME.liveBroadcasts, REALTIME.activeExams]) {
      const rendered = formatNum(value); // the page's own formatter (grouped numerals)
      expect(
        texts.some((t) => t.endsWith(rendered)),
        `no tick carries the value ${rendered}`,
      ).toBe(true);
    }
  });

  it('occupies the STRIP\'s shape while pending — never the retired icon-tile anatomy', async () => {
    // Hold the payload back: the query never settles, so the page
    // renders its pending mirror for the whole assertion.
    let release: (() => void) | undefined;
    FIXTURES['/owner/realtime'] = new Promise((resolve) => { release = () => resolve(REALTIME); });
    renderPage();

    // The strip skeleton occupies the resolved band's own anatomy…
    const skeleton = document.querySelector('.stat-strip[aria-busy="true"]');
    expect(skeleton).not.toBeNull();
    expect(skeleton!.querySelectorAll('.stat-cell')).toHaveLength(4);
    // …and the retired icon-tile band (.metric in .grid-4 — the shared
    // KpiSkeleton's shape) never renders on this page.
    expect(document.querySelector('.grid-4 .metric')).toBeNull();

    release?.();
    await screen.findByText('الجلسات النشطة');
  });
});
