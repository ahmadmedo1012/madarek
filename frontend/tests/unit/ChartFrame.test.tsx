/**
 * Task 2-c — ChartFrame accessibility wrapper tests.
 *
 * Canvas charts are opaque to screen readers (audit 0-f P1-3: all 15
 * chart canvases had zero accessibility). ChartFrame must render:
 *   - a role="img" container with the required Arabic aria-label
 *   - the chart element inside that container
 *   - an sr-only data table as a SIBLING of the image role (a table
 *     nested inside role="img" would be swallowed by it)
 *   - an sr-only summary paragraph when provided
 *   - a sized, positioned chart box (height prop or CSS-driven root)
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Line } from 'react-chartjs-2';
import { ChartFrame } from '../../src/components/charts';

// jsdom has no canvas — stub the chart component the way page tests do
// (see QualityDashboard.test.tsx). ChartFrame itself is chart-agnostic.
vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart-line" />,
}));

const WEEKLY_TABLE = {
  caption: 'النشاط الأسبوعي',
  columns: ['اليوم', 'جلسات نشطة'],
  rows: [
    ['الأحد', 12],
    ['الاثنين', 20],
  ] as (readonly (string | number)[])[],
};

describe('ChartFrame — image role + chart child', () => {
  it('renders the chart inside a role="img" box carrying the aria-label', () => {
    render(
      <ChartFrame ariaLabel="النشاط الأسبوعي — جلسات نشطة يومياً">
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    const img = screen.getByRole('img', { name: 'النشاط الأسبوعي — جلسات نشطة يومياً' });
    expect(screen.getByTestId('chart-line').closest('[role="img"]')).toBe(img);
  });

  it('exposes the data-chart-frame hook and passes className to the root', () => {
    const { container } = render(
      <ChartFrame ariaLabel="مخطط" className="owner-chart-container">
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    const root = container.querySelector('[data-chart-frame]');
    expect(root).not.toBeNull();
    expect(root?.classList.contains('owner-chart-container')).toBe(true);
  });
});

describe('ChartFrame — responsive height handling', () => {
  it('applies the height prop plus position:relative to the chart box', () => {
    render(
      <ChartFrame ariaLabel="مخطط" height={220}>
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    const box = screen.getByRole('img');
    expect(box.style.height).toBe('220px');
    expect(box.style.position).toBe('relative');
  });

  it('falls back to full root height when no height prop is given (CSS-sized consumers)', () => {
    render(
      <ChartFrame ariaLabel="مخطط">
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    expect(screen.getByRole('img').style.height).toBe('100%');
  });
});

describe('ChartFrame — screen-reader fallback table', () => {
  it('renders caption, headers and data rows inside the visually-hidden block', () => {
    render(
      <ChartFrame ariaLabel="النشاط الأسبوعي" table={WEEKLY_TABLE}>
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    const table = screen.getByRole('table');
    expect(table.querySelector('caption')?.textContent).toBe('النشاط الأسبوعي');
    expect(screen.getByRole('columnheader', { name: 'اليوم' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'جلسات نشطة' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'الأحد' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '12' })).toBeInTheDocument();
    expect(table.closest('.visually-hidden')).not.toBeNull();
  });

  it('keeps the table OUTSIDE the role="img" subtree so screen readers reach it', () => {
    render(
      <ChartFrame ariaLabel="النشاط الأسبوعي" table={WEEKLY_TABLE}>
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    expect(screen.getByRole('table').closest('[role="img"]')).toBeNull();
  });

  it('renders no fallback block when neither summary nor table is passed', () => {
    const { container } = render(
      <ChartFrame ariaLabel="مخطط">
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    expect(screen.queryByRole('table')).toBeNull();
    expect(container.querySelector('[data-chart-summary]')).toBeNull();
    expect(container.querySelector('.visually-hidden')).toBeNull();
  });

  it('renders the summary as a visually-hidden paragraph', () => {
    render(
      <ChartFrame ariaLabel="مخطط" summary="ذروة النشاط منتصف الأسبوع">
        <Line data={{} as never} options={{} as never} />
      </ChartFrame>,
    );

    const summary = screen.getByText('ذروة النشاط منتصف الأسبوع');
    expect(summary.tagName).toBe('P');
    expect(summary.closest('.visually-hidden')).not.toBeNull();
  });
});
