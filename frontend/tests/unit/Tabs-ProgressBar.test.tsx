/**
 * Tabs + ProgressBar primitive unit tests.
 *
 * Coverage:
 * Tabs (internal ARIA wiring + keyboard support — no public API change):
 *   - tablist/tab roles + aria-selected reflect the controlled value
 *   - stable tab ids via useId; NO aria-controls is emitted — every
 *     app consumer renders Tabs as a segmented filter control with no
 *     role="tabpanel", so panel references would dangle (11-e P2-2)
 *   - roving tabindex (selected tab is the tab stop, others −1)
 *   - ArrowLeft/ArrowRight follow the writing direction (RTL: Left advances)
 *     and wrap around
 *   - Home / End jump to first / last
 *   - selection change moves focus with the roving tabindex
 * ProgressBar:
 *   - ariaLabel names the progressbar; a plain-string visible `label`
 *     names it when ariaLabel is absent; neither → unnamed
 *   - aria-valuenow is clamped to 0..100
 * AlertRow (regression for the removed display:none dot hack):
 *   - icon rows render no dot; iconless rows keep the aria-hidden dot
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { Tabs, ProgressBar, AlertRow } from '../../src/components/primitives';

type Val = 'a' | 'b' | 'c';

const ITEMS: Array<{ value: Val; label: string }> = [
  { value: 'a', label: 'الأول' },
  { value: 'b', label: 'الثاني' },
  { value: 'c', label: 'الثالث' },
];

function Harness({ initial }: { initial: Val }) {
  const [value, setValue] = useState<Val>(initial);
  return <Tabs value={value} onChange={setValue} items={ITEMS} />;
}

const tab = (name: string) => screen.getByRole('tab', { name });

describe('Tabs', () => {
  beforeEach(() => {
    // The app document is Arabic RTL (index.html sets dir="rtl").
    document.documentElement.setAttribute('dir', 'rtl');
  });

  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('renders a tablist with tab roles and aria-selected state', () => {
    render(<Harness initial="a" />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(tab('الأول')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الثاني')).toHaveAttribute('aria-selected', 'false');
    expect(tab('الثالث')).toHaveAttribute('aria-selected', 'false');
  });

  it('emits stable tab ids and NO aria-controls (no dangling panel refs)', () => {
    render(<Harness initial="a" />);
    const ids = ITEMS.map((it) => tab(it.label).id);
    // Stable useId-derived ids, unique per tab…
    expect(ids.every((id) => /-tab-/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ITEMS.length);
    // …but no tab references a panel: no consumer renders
    // role="tabpanel" today, so aria-controls would point at nothing
    // (audit 11-e P2-2). The wiring returns with a panel-ed consumer.
    for (const it of ITEMS) {
      expect(tab(it.label).getAttribute('aria-controls')).toBeNull();
    }
  });

  it('uses roving tabindex — only the selected tab is tabbable', () => {
    render(<Harness initial="b" />);
    expect(tab('الثاني')).toHaveAttribute('tabindex', '0');
    expect(tab('الأول')).toHaveAttribute('tabindex', '-1');
    expect(tab('الثالث')).toHaveAttribute('tabindex', '-1');
  });

  it('RTL: ArrowLeft advances selection + focus, with wrap-around', () => {
    render(<Harness initial="a" />);
    fireEvent.keyDown(tab('الأول'), { key: 'ArrowLeft' });
    expect(tab('الثاني')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الثاني')).toHaveFocus();

    // Wrap from the last tab back to the first.
    fireEvent.keyDown(tab('الثالث'), { key: 'ArrowLeft' });
    expect(tab('الأول')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الأول')).toHaveFocus();
  });

  it('RTL: ArrowRight moves backwards (wrap-around)', () => {
    render(<Harness initial="a" />);
    fireEvent.keyDown(tab('الأول'), { key: 'ArrowRight' });
    expect(tab('الثالث')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الثالث')).toHaveFocus();
  });

  it('Home / End jump to the first / last tab', () => {
    render(<Harness initial="b" />);
    fireEvent.keyDown(tab('الثاني'), { key: 'Home' });
    expect(tab('الأول')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الأول')).toHaveFocus();

    fireEvent.keyDown(tab('الأول'), { key: 'End' });
    expect(tab('الثالث')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الثالث')).toHaveFocus();
  });

  it('LTR: ArrowRight advances (direction is read from the DOM)', () => {
    document.documentElement.setAttribute('dir', 'ltr');
    render(<Harness initial="a" />);
    fireEvent.keyDown(tab('الأول'), { key: 'ArrowRight' });
    expect(tab('الثاني')).toHaveAttribute('aria-selected', 'true');
    expect(tab('الثاني')).toHaveFocus();
  });

  it('still selects on click', () => {
    const onChange = vi.fn();
    render(<Tabs value="a" onChange={onChange} items={ITEMS} />);
    fireEvent.click(tab('الثالث'));
    expect(onChange).toHaveBeenCalledWith('c');
  });
});

describe('ProgressBar', () => {
  it('names the progressbar when ariaLabel is provided', () => {
    render(<ProgressBar value={42} ariaLabel="تقدّم الفصل الدراسي" />);
    const bar = screen.getByRole('progressbar', { name: 'تقدّم الفصل الدراسي' });
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('stays unnamed (no aria-label) when neither ariaLabel nor a string label is given', () => {
    render(<ProgressBar value={10} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-label')).toBeNull();
  });

  it('falls back to the visible string label as the accessible name', () => {
    render(<ProgressBar value={30} label="الإنجاز" />);
    expect(screen.getByRole('progressbar', { name: 'الإنجاز' })).toHaveAttribute(
      'aria-valuenow',
      '30',
    );
  });

  it('clamps aria-valuenow into 0..100', () => {
    const { rerender } = render(<ProgressBar value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
    rerender(<ProgressBar value={-7} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });
});

describe('AlertRow dot handling', () => {
  it('renders no dot when an icon is present (old display:none hack removed)', () => {
    const { container } = render(<AlertRow color="red" icon={Bell} title="t" />);
    expect(container.querySelector('.alert-dot')).toBeNull();
  });

  it('renders the dot when no icon is given', () => {
    const { container } = render(<AlertRow color="amber" title="t" />);
    const dot = container.querySelector('.alert-dot');
    expect(dot).not.toBeNull();
    expect(dot).toHaveAttribute('aria-hidden', 'true');
  });
});
